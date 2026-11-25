"use server";

// Actions du module Relais (dépôts). Pas de suppression : un relais se désactive, et seulement
// quand son stock est vide (sinon des articles deviendraient invisibles dans l'inventaire).

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { withTransaction } from "@/db";
import { auditLogs, memberships, warehouses } from "@/db/schema";
import { lockWarehouse } from "@/lib/admin/stock";
import { stockBalances, UUID_RE } from "@/lib/distributions";
import { canManageRelais, validateRelais, type RelaisInput, type RelaisResult } from "@/lib/relais-shared";
import { requireActiveMembership } from "@/lib/session";

const BASE = "/tableau-de-bord/relais";
const isUnique = (e: unknown) => {
  const x = e as { code?: string; cause?: { code?: string } };
  return x?.code === "23505" || x?.cause?.code === "23505";
};

function revalidateAll() {
  revalidatePath(BASE);
  revalidatePath("/tableau-de-bord/stocks");
  revalidatePath("/tableau-de-bord/distributions/nouvelle");
  revalidatePath("/tableau-de-bord/dons/nouveau");
}

/** Création (`id` absent) ou modification d'un relais. */
export async function saveRelais(id: string | null, input: RelaisInput): Promise<RelaisResult> {
  if (id && !UUID_RE.test(id)) return { ok: false, message: "Relais invalide." };
  const member = await requireActiveMembership();
  if (!canManageRelais(member.role)) return { ok: false, message: "Seuls un propriétaire ou un administrateur peuvent gérer les relais." };
  const errors = validateRelais(input);
  if (Object.keys(errors).length) return { ok: false, message: "Merci de corriger les champs indiqués.", errors };
  const values = {
    name: input.name.trim(),
    code: input.code.trim() ? input.code.trim().toUpperCase() : null,
    address: input.address.trim() || null,
    managerMembershipId: input.managerMembershipId || null,
  };
  try {
    const result = await withTransaction(async (tx): Promise<RelaisResult & { id?: string }> => {
      const org = member.organizationId;
      if (values.managerMembershipId) {
        const [m] = await tx.select({ id: memberships.id }).from(memberships).where(and(eq(memberships.id, values.managerMembershipId), eq(memberships.organizationId, org), eq(memberships.isActive, true)));
        if (!m) return { ok: false, message: "Responsable introuvable ou inactif.", errors: { managerMembershipId: "Choisissez un membre actif." } };
      }
      if (id) {
        const [w] = await tx.select({ id: warehouses.id }).from(warehouses).where(and(eq(warehouses.id, id), eq(warehouses.organizationId, org))).for("update");
        if (!w) return { ok: false, message: "Relais introuvable." };
        await tx.update(warehouses).set(values).where(and(eq(warehouses.id, id), eq(warehouses.organizationId, org)));
        await tx.insert(auditLogs).values({ organizationId: org, actorUserId: member.userId, action: "warehouse.updated", entityType: "warehouse", entityId: id, afterData: { name: values.name, code: values.code } });
        return { ok: true, id };
      }
      const [w] = await tx.insert(warehouses).values({ organizationId: org, ...values }).returning({ id: warehouses.id });
      await tx.insert(auditLogs).values({ organizationId: org, actorUserId: member.userId, action: "warehouse.created", entityType: "warehouse", entityId: w.id, afterData: { name: values.name, code: values.code } });
      return { ok: true, id: w.id };
    });
    if (!result.ok) return result;
  } catch (error) {
    if (isUnique(error)) return { ok: false, message: "Ce code est déjà utilisé par un autre relais.", errors: { code: "Code déjà utilisé." } };
    console.error("[relais] save", error);
    return { ok: false, message: "Le relais n'a pas pu être enregistré. Réessayez." };
  }
  revalidateAll();
  redirect(BASE);
}

export async function setRelaisActive(id: string, active: boolean): Promise<RelaisResult> {
  if (!UUID_RE.test(id)) return { ok: false, message: "Relais invalide." };
  const member = await requireActiveMembership();
  if (!canManageRelais(member.role)) return { ok: false, message: "Seuls un propriétaire ou un administrateur peuvent gérer les relais." };
  try {
    const result = await withTransaction(async (tx): Promise<RelaisResult> => {
      const org = member.organizationId;
      const [w] = await tx.select({ isActive: warehouses.isActive }).from(warehouses).where(and(eq(warehouses.id, id), eq(warehouses.organizationId, org))).for("update");
      if (!w) return { ok: false, message: "Relais introuvable." };
      if (w.isActive === active) return { ok: true };
      if (!active) {
        await lockWarehouse(tx, org, id);
        const stock = (await stockBalances(tx, org, { warehouseId: id }))[id] ?? {};
        const left = Object.values(stock).filter((q) => q > 0).length;
        if (left) return { ok: false, message: `Ce relais contient encore ${left} produit${left > 1 ? "s" : ""} en stock : distribuez-les ou transférez-les avant de le désactiver.` };
      }
      await tx.update(warehouses).set({ isActive: active }).where(and(eq(warehouses.id, id), eq(warehouses.organizationId, org)));
      await tx.insert(auditLogs).values({ organizationId: org, actorUserId: member.userId, action: active ? "warehouse.reactivated" : "warehouse.deactivated", entityType: "warehouse", entityId: id, beforeData: { isActive: !active }, afterData: { isActive: active } });
      return { ok: true, message: active ? "Relais réactivé." : "Relais désactivé : il n'est plus proposé pour les dons et distributions." };
    });
    if (result.ok) revalidateAll();
    return result;
  } catch (error) {
    console.error("[relais] active", error);
    return { ok: false, message: "L'opération n'a pas pu aboutir. Réessayez." };
  }
}
