"use server";

// Actions du module Distributions.
//
// Règles appliquées (notes techniques du projet) :
//  - organisation et droits résolus côté serveur (requireActiveMembership), jamais depuis le navigateur ;
//  - une sortie de stock vérifie les soldes, puis écrit le mouvement, la distribution et l'audit dans
//    UNE transaction ; les validations d'un même dépôt sont sérialisées (verrou consultatif) ;
//  - stock négatif interdit ;
//  - idempotence : revalider une distribution déjà effectuée ne refait rien ;
//  - pas de suppression : une distribution effectuée s'annule par un contre-mouvement audité.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, sql } from "drizzle-orm";
import { withTransaction, type Tx } from "@/db";
import {
  aidRequests,
  auditLogs,
  beneficiaries,
  distributionItems,
  distributions,
  products,
  stockMovementItems,
  stockMovements,
  warehouses,
} from "@/db/schema";
import { stockBalances, UUID_RE } from "@/lib/distributions";
import {
  canPrepareDistribution,
  canReverseDistribution,
  canValidateDistribution,
  formatQty,
  toMilli,
  type ActionResult,
  type DistributionInput,
} from "@/lib/distributions-shared";
import { requireActiveMembership } from "@/lib/session";

const BASE = "/tableau-de-bord/distributions";
const QTY_RE = /^\d{1,9}(\.\d{1,3})?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Sérialise les opérations de stock d'un même dépôt jusqu'à la fin de la transaction. */
async function lockWarehouse(tx: Tx, organizationId: string, warehouseId: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`stock:${organizationId}:${warehouseId}`}))`);
}

function revalidateAll(id?: string) {
  revalidatePath(BASE);
  if (id) revalidatePath(`${BASE}/${id}`);
  revalidatePath("/tableau-de-bord/stocks");
  revalidatePath("/tableau-de-bord");
}

// ---------------------------------------------------------------------------
// Création d'un brouillon

export async function createDistribution(input: DistributionInput): Promise<ActionResult> {
  const member = await requireActiveMembership();
  if (!canPrepareDistribution(member.role)) return { ok: false, message: "Vous n'avez pas les droits pour préparer une distribution." };

  // --- Validation des champs
  const errors: Record<string, string> = {};
  if (!UUID_RE.test(input.beneficiaryId ?? "")) errors.beneficiaryId = "Choisissez un bénéficiaire.";
  if (!UUID_RE.test(input.warehouseId ?? "")) errors.warehouseId = "Choisissez un dépôt.";
  if (input.aidRequestId && !UUID_RE.test(input.aidRequestId)) errors.aidRequestId = "Demande d'aide invalide.";
  const day = new Date(`${input.distributedOn}T00:00:00Z`);
  if (!DATE_RE.test(input.distributedOn ?? "") || Number.isNaN(day.getTime())) errors.distributedOn = "Date invalide.";
  else if (day.getTime() > Date.now() + 36 * 3_600_000) errors.distributedOn = "La date ne peut pas être dans le futur.";
  const note = (input.note ?? "").trim();
  if (note.length > 1000) errors.note = "1 000 caractères maximum.";

  // Lignes : quantités positives (3 décimales max) ; un même produit saisi deux fois est additionné.
  const merged = new Map<string, number>();
  const lines = Array.isArray(input.lines) ? input.lines : [];
  if (lines.length === 0) errors.lines = "Ajoutez au moins un article.";
  if (lines.length > 50) errors.lines = "50 articles maximum par distribution.";
  for (const l of lines) {
    const q = String(l.quantity ?? "").trim().replace(",", ".");
    if (!UUID_RE.test(l.productId ?? "")) errors.lines = "Choisissez un produit pour chaque ligne.";
    else if (!QTY_RE.test(q) || toMilli(q) <= 0) errors.lines = "Chaque quantité doit être un nombre positif (3 décimales maximum).";
    else merged.set(l.productId, (merged.get(l.productId) ?? 0) + toMilli(q));
  }
  if (Object.keys(errors).length) return { ok: false, message: "Merci de corriger les champs indiqués.", errors };

  // --- Écriture
  let id: string;
  try {
    const result = await withTransaction(async (tx): Promise<{ id: string } | { error: Record<string, string> }> => {
      const org = member.organizationId;
      const [benef] = await tx
        .select({ id: beneficiaries.id })
        .from(beneficiaries)
        .where(and(eq(beneficiaries.id, input.beneficiaryId), eq(beneficiaries.organizationId, org), eq(beneficiaries.isActive, true)));
      if (!benef) return { error: { beneficiaryId: "Bénéficiaire introuvable ou inactif." } };
      const [wh] = await tx
        .select({ id: warehouses.id })
        .from(warehouses)
        .where(and(eq(warehouses.id, input.warehouseId), eq(warehouses.organizationId, org), eq(warehouses.isActive, true)));
      if (!wh) return { error: { warehouseId: "Dépôt introuvable ou inactif." } };
      const productIds = [...merged.keys()];
      const found = await tx
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.organizationId, org), eq(products.isActive, true), inArray(products.id, productIds)));
      if (found.length !== productIds.length) return { error: { lines: "Un des produits est introuvable ou inactif." } };
      if (input.aidRequestId) {
        const [req] = await tx
          .select({ beneficiaryId: aidRequests.beneficiaryId, status: aidRequests.status })
          .from(aidRequests)
          .where(and(eq(aidRequests.id, input.aidRequestId), eq(aidRequests.organizationId, org)));
        if (!req || req.status !== "approved") return { error: { aidRequestId: "Cette demande d'aide n'est pas (ou plus) approuvée." } };
        if (req.beneficiaryId !== input.beneficiaryId) return { error: { aidRequestId: "Cette demande concerne un autre bénéficiaire." } };
      }

      // Référence DIS-0001, DIS-0002… (verrou : deux créations simultanées n'obtiennent pas le même numéro)
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`distribution-ref:${org}`}))`);
      const [{ next }] = await tx
        .select({ next: sql`coalesce(max((substring(${distributions.reference} from '^DIS-([0-9]+)$'))::int), 0) + 1`.mapWith(Number) })
        .from(distributions)
        .where(eq(distributions.organizationId, org));
      const reference = `DIS-${String(next).padStart(4, "0")}`;

      const [created] = await tx
        .insert(distributions)
        .values({
          organizationId: org,
          beneficiaryId: input.beneficiaryId,
          warehouseId: input.warehouseId,
          aidRequestId: input.aidRequestId || null,
          reference,
          status: "draft",
          distributedOn: input.distributedOn,
          note: note || null,
        })
        .returning({ id: distributions.id });
      await tx.insert(distributionItems).values(
        productIds.map((productId) => ({
          organizationId: org,
          distributionId: created.id,
          productId,
          quantity: (merged.get(productId)! / 1000).toFixed(3),
        })),
      );
      await tx.insert(auditLogs).values({
        organizationId: org,
        actorUserId: member.userId,
        action: "distribution.created",
        entityType: "distribution",
        entityId: created.id,
        afterData: { reference, status: "draft", lines: productIds.length },
      });
      return { id: created.id };
    });
    if ("error" in result) return { ok: false, message: "Merci de corriger les champs indiqués.", errors: result.error };
    id = result.id;
  } catch (error) {
    console.error("[distributions] create", error);
    return { ok: false, message: "La distribution n'a pas pu être enregistrée. Réessayez." };
  }

  revalidateAll(id);
  redirect(`${BASE}/${id}`);
}

// ---------------------------------------------------------------------------
// Validation : sortie de stock

export async function validateDistribution(id: string, recipientAcknowledgement: string): Promise<ActionResult> {
  if (!UUID_RE.test(id)) return { ok: false, message: "Distribution invalide." };
  const member = await requireActiveMembership();
  if (!canValidateDistribution(member.role)) return { ok: false, message: "Vous n'avez pas les droits pour valider une distribution." };
  const ack = (recipientAcknowledgement ?? "").trim();
  if (ack.length > 300) return { ok: false, message: "Le nom de la personne qui reçoit : 300 caractères maximum." };

  try {
    const result = await withTransaction(async (tx): Promise<ActionResult> => {
      const org = member.organizationId;
      const [d] = await tx
        .select({ status: distributions.status, reference: distributions.reference, warehouseId: distributions.warehouseId, aidRequestId: distributions.aidRequestId })
        .from(distributions)
        .where(and(eq(distributions.id, id), eq(distributions.organizationId, org)))
        .for("update");
      if (!d) return { ok: false, message: "Distribution introuvable." };
      if (d.status === "completed") return { ok: true, message: "Cette distribution était déjà validée." };
      if (d.status !== "draft") return { ok: false, message: "Une distribution annulée ne peut pas être validée." };

      const items = await tx
        .select({ productId: distributionItems.productId, quantity: distributionItems.quantity, name: products.name, unit: products.unit })
        .from(distributionItems)
        .innerJoin(products, and(eq(products.id, distributionItems.productId), eq(products.organizationId, distributionItems.organizationId)))
        .where(and(eq(distributionItems.distributionId, id), eq(distributionItems.organizationId, org)));
      if (items.length === 0) return { ok: false, message: "Cette distribution ne contient aucun article." };

      // Contrôle du stock, dépôt verrouillé jusqu'à la fin de la transaction.
      await lockWarehouse(tx, org, d.warehouseId);
      const stock = (await stockBalances(tx, org, { warehouseId: d.warehouseId, productIds: items.map((i) => i.productId) }))[d.warehouseId] ?? {};
      const short = items.filter((i) => toMilli(i.quantity) > toMilli(stock[i.productId] ?? 0));
      if (short.length) {
        return {
          ok: false,
          message: `Stock insuffisant : ${short
            .map((i) => `${i.name} (demandé ${formatQty(i.quantity)} ${i.unit}, disponible ${formatQty(stock[i.productId] ?? 0)} ${i.unit})`)
            .join(" ; ")}.`,
        };
      }

      const [mv] = await tx
        .insert(stockMovements)
        .values({
          organizationId: org,
          movementType: "issue",
          status: "posted",
          reference: d.reference,
          sourceWarehouseId: d.warehouseId,
          performedByMembershipId: member.membershipId,
          note: `Distribution ${d.reference}`,
        })
        .returning({ id: stockMovements.id });
      await tx
        .insert(stockMovementItems)
        .values(items.map((i) => ({ organizationId: org, movementId: mv.id, productId: i.productId, quantity: i.quantity })));
      await tx
        .update(distributions)
        .set({ status: "completed", distributedByMembershipId: member.membershipId, recipientAcknowledgement: ack || null })
        .where(and(eq(distributions.id, id), eq(distributions.organizationId, org)));
      if (d.aidRequestId) {
        await tx
          .update(aidRequests)
          .set({ status: "fulfilled", updatedAt: new Date() })
          .where(and(eq(aidRequests.id, d.aidRequestId), eq(aidRequests.organizationId, org), eq(aidRequests.status, "approved")));
      }
      await tx.insert(auditLogs).values({
        organizationId: org,
        actorUserId: member.userId,
        action: "distribution.completed",
        entityType: "distribution",
        entityId: id,
        beforeData: { status: "draft" },
        afterData: { status: "completed", stockMovementId: mv.id, lines: items.length },
      });
      return { ok: true, message: "Distribution validée : les articles sont sortis du stock." };
    });
    if (result.ok) revalidateAll(id);
    return result;
  } catch (error) {
    console.error("[distributions] validate", error);
    return { ok: false, message: "La validation n'a pas pu être enregistrée. Réessayez." };
  }
}

// ---------------------------------------------------------------------------
// Annulation (brouillon : simple ; effectuée : contre-mouvement de remise en stock)

export async function cancelDistribution(id: string, reason: string): Promise<ActionResult> {
  if (!UUID_RE.test(id)) return { ok: false, message: "Distribution invalide." };
  const member = await requireActiveMembership();
  const why = (reason ?? "").trim();
  if (why.length > 500) return { ok: false, message: "Motif : 500 caractères maximum." };

  try {
    const result = await withTransaction(async (tx): Promise<ActionResult> => {
      const org = member.organizationId;
      const [d] = await tx
        .select({ status: distributions.status, reference: distributions.reference, warehouseId: distributions.warehouseId, aidRequestId: distributions.aidRequestId, note: distributions.note })
        .from(distributions)
        .where(and(eq(distributions.id, id), eq(distributions.organizationId, org)))
        .for("update");
      if (!d) return { ok: false, message: "Distribution introuvable." };
      if (d.status === "cancelled") return { ok: true, message: "Cette distribution était déjà annulée." };

      const note = [d.note, `Annulée${why ? ` : ${why}` : ""}`].filter(Boolean).join("\n");

      if (d.status === "draft") {
        if (!canValidateDistribution(member.role)) return { ok: false, message: "Vous n'avez pas les droits pour annuler une distribution." };
        await tx.update(distributions).set({ status: "cancelled", note }).where(and(eq(distributions.id, id), eq(distributions.organizationId, org)));
        await tx.insert(auditLogs).values({
          organizationId: org,
          actorUserId: member.userId,
          action: "distribution.cancelled",
          entityType: "distribution",
          entityId: id,
          beforeData: { status: "draft" },
          afterData: { status: "cancelled", reason: why || null },
        });
        return { ok: true, message: "Brouillon annulé." };
      }

      // Distribution effectuée : remise en stock par un mouvement d'ajustement entrant.
      if (!canReverseDistribution(member.role)) {
        return { ok: false, message: "Seuls un propriétaire ou un administrateur peuvent annuler une distribution effectuée." };
      }
      if (!why) return { ok: false, message: "Indiquez le motif de l'annulation." };
      const items = await tx
        .select({ productId: distributionItems.productId, quantity: distributionItems.quantity })
        .from(distributionItems)
        .where(and(eq(distributionItems.distributionId, id), eq(distributionItems.organizationId, org)));
      await lockWarehouse(tx, org, d.warehouseId);
      const [mv] = await tx
        .insert(stockMovements)
        .values({
          organizationId: org,
          movementType: "adjustment_in",
          status: "posted",
          reference: `ANN-${d.reference}`,
          destinationWarehouseId: d.warehouseId,
          performedByMembershipId: member.membershipId,
          note: `Annulation de la distribution ${d.reference} : ${why}`,
        })
        .returning({ id: stockMovements.id });
      if (items.length) {
        await tx
          .insert(stockMovementItems)
          .values(items.map((i) => ({ organizationId: org, movementId: mv.id, productId: i.productId, quantity: i.quantity })));
      }
      await tx.update(distributions).set({ status: "cancelled", note }).where(and(eq(distributions.id, id), eq(distributions.organizationId, org)));
      if (d.aidRequestId) {
        await tx
          .update(aidRequests)
          .set({ status: "approved", updatedAt: new Date() })
          .where(and(eq(aidRequests.id, d.aidRequestId), eq(aidRequests.organizationId, org), eq(aidRequests.status, "fulfilled")));
      }
      await tx.insert(auditLogs).values({
        organizationId: org,
        actorUserId: member.userId,
        action: "distribution.reversed",
        entityType: "distribution",
        entityId: id,
        beforeData: { status: "completed" },
        afterData: { status: "cancelled", reason: why, stockMovementId: mv.id },
      });
      return { ok: true, message: "Distribution annulée : les articles ont été remis en stock." };
    });
    if (result.ok) revalidateAll(id);
    return result;
  } catch (error) {
    console.error("[distributions] cancel", error);
    return { ok: false, message: "L'annulation n'a pas pu être enregistrée. Réessayez." };
  }
}
