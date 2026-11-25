"use server";

// Actions du module Dons.
//  - réception d'un don : donateur (existant ou nouveau), don « reçu », articles et mouvement
//    d'ENTRÉE en stock (receipt) dans le dépôt choisi, le tout dans UNE transaction auditée ;
//  - annulation : contre-mouvement de sortie (adjustment_out), refusée si le stock du dépôt ne
//    contient plus les quantités (une partie du don a déjà été distribuée) — stock négatif interdit.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { withTransaction } from "@/db";
import { auditLogs, donationItems, donations, donors, products, stockMovementItems, stockMovements, warehouses } from "@/db/schema";
import { nextReference } from "@/lib/admin/refs";
import { lockWarehouse } from "@/lib/admin/stock";
import { stockBalances, UUID_RE } from "@/lib/distributions";
import { formatQty, toMilli } from "@/lib/distributions-shared";
import { canCancelDonation, canRegisterDonation, type DonationInput, type DonationResult } from "@/lib/donations-shared";
import { EMAIL_RE, PHONE_RE } from "@/lib/beneficiaries-shared";
import { requireActiveMembership } from "@/lib/session";

const BASE = "/tableau-de-bord/dons";
const QTY_RE = /^\d{1,9}(\.\d{1,3})?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function revalidateAll(id?: string) {
  revalidatePath(BASE);
  if (id) revalidatePath(`${BASE}/${id}`);
  revalidatePath("/tableau-de-bord/stocks");
  revalidatePath("/tableau-de-bord");
}

export async function registerDonation(input: DonationInput): Promise<DonationResult> {
  const member = await requireActiveMembership();
  if (!canRegisterDonation(member.role)) return { ok: false, message: "Vous n'avez pas les droits pour enregistrer un don." };

  const errors: Record<string, string> = {};
  const nd = input.newDonor;
  if (nd) {
    if (nd.donorType !== "individual" && nd.donorType !== "organization") errors["nd.donorType"] = "Choisissez un type.";
    if (nd.displayName.trim().length < 2 || nd.displayName.trim().length > 180) errors["nd.displayName"] = "Indiquez un nom (2 à 180 caractères).";
    if (nd.phone.trim() && !PHONE_RE.test(nd.phone.trim())) errors["nd.phone"] = "Numéro de téléphone invalide.";
    if (nd.email.trim() && (!EMAIL_RE.test(nd.email.trim()) || nd.email.trim().length > 255)) errors["nd.email"] = "Adresse e-mail invalide.";
  } else if (!UUID_RE.test(input.donorId ?? "")) errors.donorId = "Choisissez un donateur.";
  if (!UUID_RE.test(input.warehouseId ?? "")) errors.warehouseId = "Choisissez un dépôt.";
  const day = new Date(`${input.receivedOn}T00:00:00Z`);
  if (!DATE_RE.test(input.receivedOn ?? "") || Number.isNaN(day.getTime())) errors.receivedOn = "Date invalide.";
  else if (day.getTime() > Date.now() + 36 * 3_600_000) errors.receivedOn = "La date ne peut pas être dans le futur.";
  const notes = (input.notes ?? "").trim();
  if (notes.length > 2000) errors.notes = "2 000 caractères maximum.";
  const merged = new Map<string, number>();
  const lines = Array.isArray(input.lines) ? input.lines : [];
  if (lines.length === 0) errors.lines = "Ajoutez au moins un article reçu.";
  if (lines.length > 100) errors.lines = "100 articles maximum.";
  for (const l of lines) {
    const q = String(l.quantity ?? "").trim().replace(",", ".");
    if (!UUID_RE.test(l.productId ?? "")) errors.lines = "Choisissez un produit pour chaque ligne.";
    else if (!QTY_RE.test(q) || toMilli(q) <= 0) errors.lines = "Chaque quantité doit être un nombre positif (3 décimales maximum).";
    else merged.set(l.productId, (merged.get(l.productId) ?? 0) + toMilli(q));
  }
  if (Object.keys(errors).length) return { ok: false, message: "Merci de corriger les champs indiqués.", errors };

  let id: string;
  try {
    const result = await withTransaction(async (tx): Promise<{ id: string } | { error: string }> => {
      const org = member.organizationId;
      let donorId = input.donorId;
      if (nd) {
        const opt = (v: string) => (v.trim() ? v.trim() : null);
        const [created] = await tx
          .insert(donors)
          .values({ organizationId: org, donorType: nd.donorType, displayName: nd.displayName.trim(), phone: opt(nd.phone), email: opt(nd.email)?.toLowerCase() ?? null })
          .returning({ id: donors.id });
        donorId = created.id;
      } else {
        const [d] = await tx.select({ id: donors.id }).from(donors).where(and(eq(donors.id, donorId), eq(donors.organizationId, org)));
        if (!d) return { error: "Donateur introuvable." };
      }
      const [wh] = await tx.select({ id: warehouses.id }).from(warehouses).where(and(eq(warehouses.id, input.warehouseId), eq(warehouses.organizationId, org), eq(warehouses.isActive, true)));
      if (!wh) return { error: "Dépôt introuvable ou inactif." };
      const productIds = [...merged.keys()];
      const found = await tx.select({ id: products.id }).from(products).where(and(eq(products.organizationId, org), eq(products.isActive, true), inArray(products.id, productIds)));
      if (found.length !== productIds.length) return { error: "Un des produits est introuvable ou inactif." };

      const reference = await nextReference(tx, { organizationId: org, prefix: "DON", table: donations, referenceColumn: donations.reference, organizationColumn: donations.organizationId });
      const [don] = await tx
        .insert(donations)
        .values({ organizationId: org, donorId, reference, status: "received", receivedOn: input.receivedOn, notes: notes || null, receivedByMembershipId: member.membershipId })
        .returning({ id: donations.id });
      const items = productIds.map((productId) => ({ organizationId: org, productId, quantity: (merged.get(productId)! / 1000).toFixed(3) }));
      await tx.insert(donationItems).values(items.map((i) => ({ ...i, donationId: don.id })));

      await lockWarehouse(tx, org, input.warehouseId);
      const [mv] = await tx
        .insert(stockMovements)
        .values({ organizationId: org, movementType: "receipt", status: "posted", reference, destinationWarehouseId: input.warehouseId, donationId: don.id, performedByMembershipId: member.membershipId, note: `Don ${reference}` })
        .returning({ id: stockMovements.id });
      await tx.insert(stockMovementItems).values(items.map((i) => ({ ...i, movementId: mv.id })));
      await tx.insert(auditLogs).values({
        organizationId: org,
        actorUserId: member.userId,
        action: "donation.received",
        entityType: "donation",
        entityId: don.id,
        afterData: { reference, lines: productIds.length, stockMovementId: mv.id, newDonor: Boolean(nd) },
      });
      return { id: don.id };
    });
    if ("error" in result) return { ok: false, message: result.error };
    id = result.id;
  } catch (error) {
    console.error("[donations] register", error);
    return { ok: false, message: "Le don n'a pas pu être enregistré. Réessayez." };
  }
  revalidateAll(id);
  redirect(`${BASE}/${id}`);
}

export async function cancelDonation(id: string, reason: string): Promise<DonationResult> {
  if (!UUID_RE.test(id)) return { ok: false, message: "Don invalide." };
  const member = await requireActiveMembership();
  if (!canCancelDonation(member.role)) return { ok: false, message: "Vous n'avez pas les droits pour annuler un don." };
  const why = (reason ?? "").trim();
  if (!why) return { ok: false, message: "Indiquez le motif de l'annulation." };
  if (why.length > 500) return { ok: false, message: "Motif : 500 caractères maximum." };

  try {
    const result = await withTransaction(async (tx): Promise<DonationResult> => {
      const org = member.organizationId;
      const [d] = await tx
        .select({ status: donations.status, reference: donations.reference, notes: donations.notes })
        .from(donations)
        .where(and(eq(donations.id, id), eq(donations.organizationId, org)))
        .for("update");
      if (!d) return { ok: false, message: "Don introuvable." };
      if (d.status === "cancelled") return { ok: true, message: "Ce don était déjà annulé." };
      const [rc] = await tx
        .select({ warehouseId: stockMovements.destinationWarehouseId })
        .from(stockMovements)
        .where(and(eq(stockMovements.organizationId, org), eq(stockMovements.donationId, id), eq(stockMovements.movementType, "receipt"), eq(stockMovements.status, "posted")))
        .limit(1);
      const items = await tx
        .select({ productId: donationItems.productId, quantity: donationItems.quantity, name: products.name, unit: products.unit })
        .from(donationItems)
        .innerJoin(products, and(eq(products.id, donationItems.productId), eq(products.organizationId, donationItems.organizationId)))
        .where(and(eq(donationItems.donationId, id), eq(donationItems.organizationId, org)));

      let movementId: string | null = null;
      if (rc?.warehouseId && items.length) {
        await lockWarehouse(tx, org, rc.warehouseId);
        const stock = (await stockBalances(tx, org, { warehouseId: rc.warehouseId, productIds: items.map((i) => i.productId) }))[rc.warehouseId] ?? {};
        const short = items.filter((i) => toMilli(i.quantity) > toMilli(stock[i.productId] ?? 0));
        if (short.length) {
          return {
            ok: false,
            message: `Annulation impossible : une partie de ce don a déjà été distribuée (${short
              .map((i) => `${i.name} : ${formatQty(stock[i.productId] ?? 0)} ${i.unit} en stock pour ${formatQty(i.quantity)} reçus`)
              .join(" ; ")}).`,
          };
        }
        const [mv] = await tx
          .insert(stockMovements)
          .values({ organizationId: org, movementType: "adjustment_out", status: "posted", reference: `ANN-${d.reference ?? id.slice(0, 8)}`, sourceWarehouseId: rc.warehouseId, donationId: id, performedByMembershipId: member.membershipId, note: `Annulation du don ${d.reference ?? ""} : ${why}` })
          .returning({ id: stockMovements.id });
        await tx.insert(stockMovementItems).values(items.map((i) => ({ organizationId: org, movementId: mv.id, productId: i.productId, quantity: i.quantity })));
        movementId = mv.id;
      }
      const notes = [d.notes, `Annulé : ${why}`].filter(Boolean).join("\n");
      await tx.update(donations).set({ status: "cancelled", notes }).where(and(eq(donations.id, id), eq(donations.organizationId, org)));
      await tx.insert(auditLogs).values({
        organizationId: org,
        actorUserId: member.userId,
        action: "donation.cancelled",
        entityType: "donation",
        entityId: id,
        beforeData: { status: d.status },
        afterData: { status: "cancelled", reason: why, stockMovementId: movementId },
      });
      return { ok: true, message: "Don annulé : les articles ont été retirés du stock." };
    });
    if (result.ok) revalidateAll(id);
    return result;
  } catch (error) {
    console.error("[donations] cancel", error);
    return { ok: false, message: "L'annulation n'a pas pu être enregistrée. Réessayez." };
  }
}
