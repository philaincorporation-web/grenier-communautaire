"use server";

// Actions du module Bénéficiaires.
//  - organisation et droits résolus côté serveur ;
//  - pas de suppression : un bénéficiaire se désactive (son historique reste intact) ;
//  - audit sans données personnelles : on journalise QUELS champs ont changé, pas leurs valeurs.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { withTransaction } from "@/db";
import { auditLogs, beneficiaries } from "@/db/schema";
import { canManageBeneficiaries, validateBeneficiary, type BeneficiaryInput, type BeneficiaryResult } from "@/lib/beneficiaries-shared";
import { UUID_RE } from "@/lib/distributions";
import { requireActiveMembership } from "@/lib/session";
import { nextReference } from "@/lib/admin/refs";
import { phoneKey, phoneKeySql } from "@/lib/admin/phone";

const BASE = "/tableau-de-bord/beneficiaires";

/** Valeurs prêtes pour la base (chaînes vides → null). */
function clean(input: BeneficiaryInput) {
  const opt = (v: string) => (v.trim() ? v.trim() : null);
  return {
    beneficiaryType: input.beneficiaryType,
    displayName: input.displayName.trim(),
    phone: opt(input.phone),
    email: opt(input.email)?.toLowerCase() ?? null,
    address: opt(input.address),
    householdSize: input.householdSize.trim() ? Number(input.householdSize.trim()) : null,
    notes: opt(input.notes),
  };
}


function revalidateAll(id?: string) {
  revalidatePath(BASE);
  if (id) revalidatePath(`${BASE}/${id}`);
  revalidatePath("/tableau-de-bord/distributions/nouvelle");
}

// ---------------------------------------------------------------------------

export async function createBeneficiary(input: BeneficiaryInput, confirmDuplicate = false): Promise<BeneficiaryResult> {
  const member = await requireActiveMembership();
  if (!canManageBeneficiaries(member.role)) return { ok: false, message: "Vous n'avez pas les droits pour enregistrer un bénéficiaire." };
  const errors = validateBeneficiary(input);
  if (Object.keys(errors).length) return { ok: false, message: "Merci de corriger les champs indiqués.", errors };
  const v = clean(input);

  let id: string;
  try {
    const result = await withTransaction(async (tx): Promise<{ id: string } | { duplicate: { id: string; reference: string | null; name: string } }> => {
      const org = member.organizationId;
      // Doublon probable : un bénéficiaire actif avec le même numéro (chiffres seuls comparés).
      if (!confirmDuplicate && phoneKey(v.phone)) {
        const [dup] = await tx
          .select({ id: beneficiaries.id, reference: beneficiaries.reference, name: beneficiaries.displayName })
          .from(beneficiaries)
          .where(
            and(
              eq(beneficiaries.organizationId, org),
              eq(beneficiaries.isActive, true),
              eq(phoneKeySql(beneficiaries.phone), phoneKey(v.phone)),
            ),
          )
          .limit(1);
        if (dup) return { duplicate: dup };
      }

      // Référence BEN-0001, BEN-0002… (numérotation commune, verrouillée)
      const reference = await nextReference(tx, { organizationId: org, prefix: "BEN", table: beneficiaries, referenceColumn: beneficiaries.reference, organizationColumn: beneficiaries.organizationId });

      const [created] = await tx.insert(beneficiaries).values({ organizationId: org, reference, ...v }).returning({ id: beneficiaries.id });
      await tx.insert(auditLogs).values({
        organizationId: org,
        actorUserId: member.userId,
        action: "beneficiary.created",
        entityType: "beneficiary",
        entityId: created.id,
        afterData: { reference, type: v.beneficiaryType },
      });
      return { id: created.id };
    });
    if ("duplicate" in result) {
      return {
        ok: false,
        message: `Un bénéficiaire actif a déjà ce numéro de téléphone : ${result.duplicate.name}${result.duplicate.reference ? ` (${result.duplicate.reference})` : ""}.`,
        duplicate: result.duplicate,
      };
    }
    id = result.id;
  } catch (error) {
    console.error("[beneficiaries] create", error);
    return { ok: false, message: "Le bénéficiaire n'a pas pu être enregistré. Réessayez." };
  }
  revalidateAll(id);
  redirect(`${BASE}/${id}`);
}

// ---------------------------------------------------------------------------

export async function updateBeneficiary(id: string, input: BeneficiaryInput): Promise<BeneficiaryResult> {
  if (!UUID_RE.test(id)) return { ok: false, message: "Bénéficiaire invalide." };
  const member = await requireActiveMembership();
  if (!canManageBeneficiaries(member.role)) return { ok: false, message: "Vous n'avez pas les droits pour modifier un bénéficiaire." };
  const errors = validateBeneficiary(input);
  if (Object.keys(errors).length) return { ok: false, message: "Merci de corriger les champs indiqués.", errors };
  const v = clean(input);

  try {
    const found = await withTransaction(async (tx) => {
      const org = member.organizationId;
      const [before] = await tx
        .select()
        .from(beneficiaries)
        .where(and(eq(beneficiaries.id, id), eq(beneficiaries.organizationId, org)))
        .for("update");
      if (!before) return false;
      const changed = (Object.keys(v) as (keyof typeof v)[]).filter((k) => (before[k] ?? null) !== (v[k] ?? null));
      if (changed.length === 0) return true;
      await tx.update(beneficiaries).set(v).where(and(eq(beneficiaries.id, id), eq(beneficiaries.organizationId, org)));
      await tx.insert(auditLogs).values({
        organizationId: org,
        actorUserId: member.userId,
        action: "beneficiary.updated",
        entityType: "beneficiary",
        entityId: id,
        afterData: { fields: changed },
      });
      return true;
    });
    if (!found) return { ok: false, message: "Bénéficiaire introuvable." };
  } catch (error) {
    console.error("[beneficiaries] update", error);
    return { ok: false, message: "Les modifications n'ont pas pu être enregistrées. Réessayez." };
  }
  revalidateAll(id);
  redirect(`${BASE}/${id}`);
}

// ---------------------------------------------------------------------------

export async function setBeneficiaryActive(id: string, active: boolean): Promise<BeneficiaryResult> {
  if (!UUID_RE.test(id)) return { ok: false, message: "Bénéficiaire invalide." };
  const member = await requireActiveMembership();
  if (!canManageBeneficiaries(member.role)) return { ok: false, message: "Vous n'avez pas les droits pour cette action." };
  try {
    const result = await withTransaction(async (tx): Promise<BeneficiaryResult> => {
      const org = member.organizationId;
      const [b] = await tx
        .select({ isActive: beneficiaries.isActive })
        .from(beneficiaries)
        .where(and(eq(beneficiaries.id, id), eq(beneficiaries.organizationId, org)))
        .for("update");
      if (!b) return { ok: false, message: "Bénéficiaire introuvable." };
      if (b.isActive === active) return { ok: true }; // déjà dans cet état
      await tx.update(beneficiaries).set({ isActive: active }).where(and(eq(beneficiaries.id, id), eq(beneficiaries.organizationId, org)));
      await tx.insert(auditLogs).values({
        organizationId: org,
        actorUserId: member.userId,
        action: active ? "beneficiary.reactivated" : "beneficiary.deactivated",
        entityType: "beneficiary",
        entityId: id,
        beforeData: { isActive: !active },
        afterData: { isActive: active },
      });
      return { ok: true, message: active ? "Bénéficiaire réactivé." : "Bénéficiaire désactivé : il n'est plus proposé pour les nouvelles distributions." };
    });
    if (result.ok) revalidateAll(id);
    return result;
  } catch (error) {
    console.error("[beneficiaries] set active", error);
    return { ok: false, message: "L'opération n'a pas pu aboutir. Réessayez." };
  }
}
