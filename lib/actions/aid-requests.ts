"use server";

// Actions du module Demandes d'aide : création (dont conversion d'une demande reçue en ligne),
// instruction (prise en charge, approbation avec quantités accordées, refus motivé) et annulation.
// Organisation et droits résolus côté serveur ; chaque changement est transactionnel et audité.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, isNull, ne } from "drizzle-orm";
import { withTransaction } from "@/db";
import { aidRequestItems, aidRequests, auditLogs, beneficiaries, distributions, products, publicAidRequests } from "@/db/schema";
import { nextReference } from "@/lib/admin/refs";
import {
  canCancelAid,
  canCreateAidRequest,
  canDecide,
  canReviewAidRequest,
  canStartReview,
  type AidInput,
  type AidResult,
} from "@/lib/aid-requests-shared";
import { validateBeneficiary } from "@/lib/beneficiaries-shared";
import { UUID_RE } from "@/lib/distributions";
import { toMilli } from "@/lib/distributions-shared";
import { requireActiveMembership } from "@/lib/session";

const BASE = "/tableau-de-bord/demandes";
const QTY_RE = /^\d{1,9}(\.\d{1,3})?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function revalidateAll(id?: string) {
  revalidatePath(BASE);
  if (id) revalidatePath(`${BASE}/${id}`);
  revalidatePath("/tableau-de-bord/demandes-en-ligne");
  revalidatePath("/tableau-de-bord/distributions/nouvelle");
  revalidatePath("/tableau-de-bord/beneficiaires");
}

// ---------------------------------------------------------------------------
// Création

export async function createAidRequest(input: AidInput): Promise<AidResult> {
  const member = await requireActiveMembership();
  const converting = Boolean(input.onlineRequestId);
  if (!canCreateAidRequest(member.role) || (converting && !canReviewAidRequest(member.role))) {
    return { ok: false, message: "Vous n'avez pas les droits pour enregistrer cette demande." };
  }

  const errors: Record<string, string> = {};
  if (converting && !UUID_RE.test(input.onlineRequestId ?? "")) errors.form = "Demande en ligne invalide.";
  if (input.newBeneficiary) {
    if (!converting) errors.beneficiaryId = "Choisissez un bénéficiaire.";
    for (const [k, v] of Object.entries(validateBeneficiary(input.newBeneficiary))) errors[`nb.${k}`] = v;
  } else if (!UUID_RE.test(input.beneficiaryId ?? "")) errors.beneficiaryId = "Choisissez un bénéficiaire.";
  const day = new Date(`${input.requestedOn}T00:00:00Z`);
  if (!DATE_RE.test(input.requestedOn ?? "") || Number.isNaN(day.getTime())) errors.requestedOn = "Date invalide.";
  else if (day.getTime() > Date.now() + 36 * 3_600_000) errors.requestedOn = "La date ne peut pas être dans le futur.";
  const note = (input.generalNote ?? "").trim();
  if (note.length > 2000) errors.generalNote = "2 000 caractères maximum.";
  const merged = new Map<string, number>();
  const lines = Array.isArray(input.lines) ? input.lines : [];
  if (lines.length === 0) errors.lines = "Ajoutez au moins un article demandé.";
  if (lines.length > 50) errors.lines = "50 articles maximum.";
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

      // Conversion : la demande en ligne doit exister et ne pas être déjà convertie (verrouillée).
      if (converting) {
        const [p] = await tx
          .select({ id: publicAidRequests.id })
          .from(publicAidRequests)
          .where(and(eq(publicAidRequests.id, input.onlineRequestId!), eq(publicAidRequests.organizationId, org), isNull(publicAidRequests.aidRequestId)))
          .for("update");
        if (!p) return { error: "Cette demande en ligne est introuvable ou a déjà été convertie." };
      }

      // Bénéficiaire : nouveau (conversion) ou existant et actif.
      let beneficiaryId = input.beneficiaryId;
      if (input.newBeneficiary) {
        const nb = input.newBeneficiary;
        const reference = await nextReference(tx, { organizationId: org, prefix: "BEN", table: beneficiaries, referenceColumn: beneficiaries.reference, organizationColumn: beneficiaries.organizationId });
        const opt = (v: string) => (v.trim() ? v.trim() : null);
        const [b] = await tx
          .insert(beneficiaries)
          .values({
            organizationId: org,
            reference,
            beneficiaryType: nb.beneficiaryType,
            displayName: nb.displayName.trim(),
            phone: opt(nb.phone),
            email: opt(nb.email)?.toLowerCase() ?? null,
            address: opt(nb.address),
            householdSize: nb.beneficiaryType === "household" && nb.householdSize.trim() ? Number(nb.householdSize) : null,
            notes: opt(nb.notes),
          })
          .returning({ id: beneficiaries.id });
        beneficiaryId = b.id;
        await tx.insert(auditLogs).values({
          organizationId: org,
          actorUserId: member.userId,
          action: "beneficiary.created",
          entityType: "beneficiary",
          entityId: b.id,
          afterData: { reference, type: nb.beneficiaryType, source: "online_request" },
        });
      } else {
        const [b] = await tx
          .select({ id: beneficiaries.id })
          .from(beneficiaries)
          .where(and(eq(beneficiaries.id, beneficiaryId), eq(beneficiaries.organizationId, org), eq(beneficiaries.isActive, true)));
        if (!b) return { error: "Bénéficiaire introuvable ou inactif." };
      }

      const productIds = [...merged.keys()];
      const found = await tx
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.organizationId, org), eq(products.isActive, true), inArray(products.id, productIds)));
      if (found.length !== productIds.length) return { error: "Un des produits est introuvable ou inactif." };

      const reference = await nextReference(tx, { organizationId: org, prefix: "DEM", table: aidRequests, referenceColumn: aidRequests.reference, organizationColumn: aidRequests.organizationId });
      const [created] = await tx
        .insert(aidRequests)
        .values({ organizationId: org, beneficiaryId, reference, status: "submitted", requestedOn: input.requestedOn, generalNote: note || null })
        .returning({ id: aidRequests.id });
      await tx.insert(aidRequestItems).values(
        productIds.map((productId) => ({ organizationId: org, aidRequestId: created.id, productId, quantityRequested: (merged.get(productId)! / 1000).toFixed(3) })),
      );

      if (converting) {
        await tx
          .update(publicAidRequests)
          .set({ aidRequestId: created.id, status: "processed", processedAt: new Date() })
          .where(and(eq(publicAidRequests.id, input.onlineRequestId!), eq(publicAidRequests.organizationId, org)));
        await tx.insert(auditLogs).values({
          organizationId: org,
          actorUserId: member.userId,
          action: "online_request.converted",
          entityType: "public_aid_request",
          entityId: input.onlineRequestId!,
          afterData: { aidRequestId: created.id, reference, newBeneficiary: Boolean(input.newBeneficiary) },
        });
      }
      await tx.insert(auditLogs).values({
        organizationId: org,
        actorUserId: member.userId,
        action: "aid_request.created",
        entityType: "aid_request",
        entityId: created.id,
        afterData: { reference, status: "submitted", lines: productIds.length },
      });
      return { id: created.id };
    });
    if ("error" in result) return { ok: false, message: result.error };
    id = result.id;
  } catch (error) {
    console.error("[aid-requests] create", error);
    return { ok: false, message: "La demande n'a pas pu être enregistrée. Réessayez." };
  }
  revalidateAll(id);
  redirect(`${BASE}/${id}`);
}

// ---------------------------------------------------------------------------
// Instruction

type Locked = { status: string; reference: string; decisionNote: string | null };

/** Charge et verrouille la demande, vérifie les droits ; `fn` applique le changement. */
async function withRequest(
  id: string,
  fn: (ctx: { tx: Parameters<Parameters<typeof withTransaction>[0]>[0]; req: Locked; org: string; membershipId: string; userId: string }) => Promise<AidResult>,
): Promise<AidResult> {
  if (!UUID_RE.test(id)) return { ok: false, message: "Demande invalide." };
  const member = await requireActiveMembership();
  if (!canReviewAidRequest(member.role)) return { ok: false, message: "Vous n'avez pas les droits pour instruire une demande." };
  try {
    const result = await withTransaction(async (tx) => {
      const [req] = await tx
        .select({ status: aidRequests.status, reference: aidRequests.reference, decisionNote: aidRequests.decisionNote })
        .from(aidRequests)
        .where(and(eq(aidRequests.id, id), eq(aidRequests.organizationId, member.organizationId)))
        .for("update");
      if (!req) return { ok: false, message: "Demande introuvable." } as AidResult;
      return fn({ tx, req, org: member.organizationId, membershipId: member.membershipId, userId: member.userId });
    });
    if (result.ok) revalidateAll(id);
    return result;
  } catch (error) {
    console.error("[aid-requests] review", error);
    return { ok: false, message: "L'opération n'a pas pu aboutir. Réessayez." };
  }
}

const audit = (tx: Parameters<Parameters<typeof withTransaction>[0]>[0], org: string, userId: string, id: string, action: string, before: string, after: Record<string, unknown>) =>
  tx.insert(auditLogs).values({ organizationId: org, actorUserId: userId, action, entityType: "aid_request", entityId: id, beforeData: { status: before }, afterData: after });

export async function startAidReview(id: string): Promise<AidResult> {
  return withRequest(id, async ({ tx, req, org, membershipId, userId }) => {
    if (req.status === "under_review") return { ok: true };
    if (!canStartReview(req.status as never)) return { ok: false, message: "Cette demande ne peut plus être prise en charge." };
    await tx.update(aidRequests).set({ status: "under_review", reviewedByMembershipId: membershipId, updatedAt: new Date() }).where(and(eq(aidRequests.id, id), eq(aidRequests.organizationId, org)));
    await audit(tx, org, userId, id, "aid_request.review_started", req.status, { status: "under_review" });
    return { ok: true, message: "Demande prise en charge." };
  });
}

export async function approveAidRequest(id: string, approved: Record<string, string>, note: string): Promise<AidResult> {
  const decision = (note ?? "").trim();
  if (decision.length > 2000) return { ok: false, message: "Commentaire : 2 000 caractères maximum." };
  return withRequest(id, async ({ tx, req, org, membershipId, userId }) => {
    if (req.status === "approved") return { ok: true, message: "Cette demande était déjà approuvée." };
    if (!canDecide(req.status as never)) return { ok: false, message: "Cette demande ne peut plus être approuvée." };
    const items = await tx
      .select({ productId: aidRequestItems.productId })
      .from(aidRequestItems)
      .where(and(eq(aidRequestItems.aidRequestId, id), eq(aidRequestItems.organizationId, org)));
    let total = 0;
    for (const i of items) {
      const q = String(approved?.[i.productId] ?? "").trim().replace(",", ".");
      if (!QTY_RE.test(q)) return { ok: false, message: "Chaque quantité accordée doit être un nombre positif ou zéro (3 décimales maximum)." };
      total += toMilli(q);
    }
    if (total === 0) return { ok: false, message: "Accordez au moins un article, ou refusez la demande." };
    for (const i of items) {
      const q = String(approved[i.productId]).trim().replace(",", ".");
      await tx
        .update(aidRequestItems)
        .set({ quantityApproved: (toMilli(q) / 1000).toFixed(3) })
        .where(and(eq(aidRequestItems.aidRequestId, id), eq(aidRequestItems.organizationId, org), eq(aidRequestItems.productId, i.productId)));
    }
    await tx
      .update(aidRequests)
      .set({ status: "approved", reviewedByMembershipId: membershipId, reviewedAt: new Date(), decisionNote: decision || null, updatedAt: new Date() })
      .where(and(eq(aidRequests.id, id), eq(aidRequests.organizationId, org)));
    await audit(tx, org, userId, id, "aid_request.approved", req.status, { status: "approved", lines: items.length });
    return { ok: true, message: "Demande approuvée : elle peut maintenant être distribuée." };
  });
}

export async function rejectAidRequest(id: string, note: string): Promise<AidResult> {
  const decision = (note ?? "").trim();
  if (!decision) return { ok: false, message: "Indiquez le motif du refus." };
  if (decision.length > 2000) return { ok: false, message: "Motif : 2 000 caractères maximum." };
  return withRequest(id, async ({ tx, req, org, membershipId, userId }) => {
    if (req.status === "rejected") return { ok: true };
    if (!canDecide(req.status as never)) return { ok: false, message: "Cette demande ne peut plus être refusée." };
    await tx
      .update(aidRequests)
      .set({ status: "rejected", reviewedByMembershipId: membershipId, reviewedAt: new Date(), decisionNote: decision, updatedAt: new Date() })
      .where(and(eq(aidRequests.id, id), eq(aidRequests.organizationId, org)));
    await audit(tx, org, userId, id, "aid_request.rejected", req.status, { status: "rejected" });
    return { ok: true, message: "Demande refusée." };
  });
}

export async function cancelAidRequest(id: string, note: string): Promise<AidResult> {
  const why = (note ?? "").trim();
  if (why.length > 500) return { ok: false, message: "Motif : 500 caractères maximum." };
  return withRequest(id, async ({ tx, req, org, userId }) => {
    if (req.status === "cancelled") return { ok: true };
    if (!canCancelAid(req.status as never)) return { ok: false, message: "Une demande satisfaite ou refusée ne peut pas être annulée." };
    const [open] = await tx
      .select({ reference: distributions.reference })
      .from(distributions)
      .where(and(eq(distributions.organizationId, org), eq(distributions.aidRequestId, id), ne(distributions.status, "cancelled")))
      .limit(1);
    if (open) return { ok: false, message: `Annulez d'abord la distribution ${open.reference} liée à cette demande.` };
    const decisionNote = [req.decisionNote, `Annulée${why ? ` : ${why}` : ""}`].filter(Boolean).join("\n");
    await tx.update(aidRequests).set({ status: "cancelled", decisionNote, updatedAt: new Date() }).where(and(eq(aidRequests.id, id), eq(aidRequests.organizationId, org)));
    await audit(tx, org, userId, id, "aid_request.cancelled", req.status, { status: "cancelled", reason: why || null });
    return { ok: true, message: "Demande annulée." };
  });
}
