"use server";

// Actions du module Paramètres. Réservées aux propriétaires et administrateurs ; tout est
// journalisé. Aucune suppression physique : produits et membres se désactivent.

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { withTransaction, type Tx } from "@/db";
import { auditLogs, memberships, organizations, productCategories, products, users } from "@/db/schema";
import { stockBalances, UUID_RE } from "@/lib/distributions";
import { requireActiveMembership } from "@/lib/session";
import {
  assignableRoles,
  canManageSettings,
  isRole,
  validateCategory,
  validateMember,
  validateOrganization,
  validateProduct,
  type CategoryInput,
  type MemberInput,
  type OrganizationInput,
  type ProductInput,
  type Role,
  type SettingsResult,
} from "@/lib/settings-shared";

const BASE = "/tableau-de-bord/parametres";
const DENIED = { ok: false, message: "Seuls un propriétaire ou un administrateur peuvent modifier les paramètres." } as const;
const FAILED = { ok: false, message: "L'opération n'a pas pu aboutir. Réessayez." } as const;
const INVALID = { ok: false, message: "Merci de corriger les champs indiqués." } as const;

const isUnique = (e: unknown) => {
  const x = e as { code?: string; cause?: { code?: string } };
  return x?.code === "23505" || x?.cause?.code === "23505";
};

async function manager() {
  const m = await requireActiveMembership();
  return canManageSettings(m.role) ? m : null;
}

function revalidateCatalog() {
  revalidatePath(BASE);
  revalidatePath("/tableau-de-bord/stocks");
  revalidatePath("/tableau-de-bord/dons/nouveau");
  revalidatePath("/tableau-de-bord/distributions/nouvelle");
  revalidatePath("/tableau-de-bord/demandes/nouvelle");
}

// --- Organisation ---------------------------------------------------------------------------

export async function updateOrganization(input: OrganizationInput): Promise<SettingsResult> {
  const m = await manager();
  if (!m) return DENIED;
  const errors = validateOrganization(input);
  if (Object.keys(errors).length) return { ...INVALID, errors };
  const values = { name: input.name.trim(), email: input.email.trim().toLowerCase() || null, phone: input.phone.trim() || null, address: input.address.trim() || null };
  try {
    await withTransaction(async (tx) => {
      await tx.update(organizations).set({ ...values, updatedAt: new Date() }).where(eq(organizations.id, m.organizationId));
      await tx.insert(auditLogs).values({ organizationId: m.organizationId, actorUserId: m.userId, action: "organization.updated", entityType: "organization", entityId: m.organizationId, afterData: { fields: Object.keys(values) } });
    });
  } catch (e) {
    console.error("[settings] organization", e);
    return FAILED;
  }
  revalidatePath("/tableau-de-bord", "layout");
  return { ok: true, message: "Informations de l'organisation enregistrées." };
}

// --- Catégories -----------------------------------------------------------------------------

export async function saveCategory(id: string | null, input: CategoryInput): Promise<SettingsResult> {
  if (id && !UUID_RE.test(id)) return { ok: false, message: "Catégorie invalide." };
  const m = await manager();
  if (!m) return DENIED;
  const errors = validateCategory(input);
  if (Object.keys(errors).length) return { ...INVALID, errors };
  const values = { name: input.name.trim(), description: input.description.trim() || null };
  const org = m.organizationId;
  try {
    const r = await withTransaction(async (tx): Promise<SettingsResult> => {
      let entityId = id;
      if (id) {
        const updated = await tx.update(productCategories).set(values).where(and(eq(productCategories.id, id), eq(productCategories.organizationId, org))).returning({ id: productCategories.id });
        if (!updated.length) return { ok: false, message: "Catégorie introuvable." };
      } else {
        const [c] = await tx.insert(productCategories).values({ organizationId: org, ...values }).returning({ id: productCategories.id });
        entityId = c.id;
      }
      await tx.insert(auditLogs).values({ organizationId: org, actorUserId: m.userId, action: id ? "category.updated" : "category.created", entityType: "product_category", entityId, afterData: { name: values.name } });
      return { ok: true, message: id ? "Catégorie modifiée." : "Catégorie créée." };
    });
    if (r.ok) revalidateCatalog();
    return r;
  } catch (e) {
    if (isUnique(e)) return { ok: false, message: "Une catégorie porte déjà ce nom.", errors: { name: "Nom déjà utilisé." } };
    console.error("[settings] category", e);
    return FAILED;
  }
}

// --- Produits -------------------------------------------------------------------------------

export async function saveProduct(id: string | null, input: ProductInput): Promise<SettingsResult> {
  if (id && !UUID_RE.test(id)) return { ok: false, message: "Produit invalide." };
  const m = await manager();
  if (!m) return DENIED;
  const errors = validateProduct(input);
  if (Object.keys(errors).length) return { ...INVALID, errors };
  if (input.categoryId && !UUID_RE.test(input.categoryId)) return { ...INVALID, errors: { categoryId: "Catégorie invalide." } };
  const values = {
    name: input.name.trim(),
    sku: input.sku.trim() ? input.sku.trim().toUpperCase() : null,
    unit: input.unit.trim(),
    categoryId: input.categoryId || null,
    isPerishable: Boolean(input.isPerishable),
  };
  const org = m.organizationId;
  try {
    const r = await withTransaction(async (tx): Promise<SettingsResult> => {
      if (values.categoryId) {
        const [c] = await tx.select({ id: productCategories.id }).from(productCategories).where(and(eq(productCategories.id, values.categoryId), eq(productCategories.organizationId, org)));
        if (!c) return { ...INVALID, errors: { categoryId: "Catégorie introuvable." } };
      }
      let entityId = id;
      if (id) {
        const updated = await tx.update(products).set({ ...values, updatedAt: new Date() }).where(and(eq(products.id, id), eq(products.organizationId, org))).returning({ id: products.id });
        if (!updated.length) return { ok: false, message: "Produit introuvable." };
      } else {
        const [p] = await tx.insert(products).values({ organizationId: org, ...values }).returning({ id: products.id });
        entityId = p.id;
      }
      await tx.insert(auditLogs).values({ organizationId: org, actorUserId: m.userId, action: id ? "product.updated" : "product.created", entityType: "product", entityId, afterData: { name: values.name, sku: values.sku, unit: values.unit } });
      return { ok: true, message: id ? "Produit modifié." : "Produit ajouté au catalogue." };
    });
    if (r.ok) revalidateCatalog();
    return r;
  } catch (e) {
    if (isUnique(e)) return { ok: false, message: "Ce code article est déjà utilisé.", errors: { sku: "Code déjà utilisé." } };
    console.error("[settings] product", e);
    return FAILED;
  }
}

/** Un produit encore en stock reste actif : sinon il disparaîtrait des distributions. */
export async function setProductActive(id: string, active: boolean): Promise<SettingsResult> {
  if (!UUID_RE.test(id)) return { ok: false, message: "Produit invalide." };
  const m = await manager();
  if (!m) return DENIED;
  const org = m.organizationId;
  try {
    const r = await withTransaction(async (tx): Promise<SettingsResult> => {
      const [p] = await tx.select({ isActive: products.isActive }).from(products).where(and(eq(products.id, id), eq(products.organizationId, org))).for("update");
      if (!p) return { ok: false, message: "Produit introuvable." };
      if (p.isActive === active) return { ok: true };
      if (!active) {
        const balances = await stockBalances(tx, org, { productIds: [id] });
        const inStock = Object.values(balances).some((b) => (b[id] ?? 0) > 0);
        if (inStock) return { ok: false, message: "Ce produit est encore en stock : distribuez-le avant de le retirer du catalogue." };
      }
      await tx.update(products).set({ isActive: active, updatedAt: new Date() }).where(and(eq(products.id, id), eq(products.organizationId, org)));
      await tx.insert(auditLogs).values({ organizationId: org, actorUserId: m.userId, action: active ? "product.reactivated" : "product.deactivated", entityType: "product", entityId: id, beforeData: { isActive: !active }, afterData: { isActive: active } });
      return { ok: true, message: active ? "Produit réactivé." : "Produit retiré du catalogue." };
    });
    if (r.ok) revalidateCatalog();
    return r;
  } catch (e) {
    console.error("[settings] product active", e);
    return FAILED;
  }
}

// --- Équipe ---------------------------------------------------------------------------------

/**
 * Ajoute une personne à l'équipe (crée la fiche `users` si besoin). Elle crée ensuite son
 * compte sur /auth/sign-up avec la même adresse e-mail et la vérifie.
 */
export async function addMember(input: MemberInput): Promise<SettingsResult> {
  const m = await manager();
  if (!m) return DENIED;
  const errors = validateMember(input);
  if (Object.keys(errors).length) return { ...INVALID, errors };
  if (!assignableRoles(m.role).includes(input.role)) return { ...INVALID, errors: { role: "Vous ne pouvez pas attribuer ce rôle." } };
  const email = input.email.trim().toLowerCase();
  const org = m.organizationId;
  try {
    const r = await withTransaction(async (tx): Promise<SettingsResult> => {
      await tx.insert(users).values({ email, fullName: input.fullName.trim() }).onConflictDoNothing({ target: users.email });
      const [u] = await tx.select({ id: users.id }).from(users).where(eq(users.email, email));
      const [existing] = await tx.select({ isActive: memberships.isActive }).from(memberships).where(and(eq(memberships.organizationId, org), eq(memberships.userId, u.id)));
      if (existing) {
        return { ok: false, message: existing.isActive ? "Cette personne fait déjà partie de l'équipe." : "Cette personne a été désactivée : réactivez-la dans la liste.", errors: { email: "Déjà membre." } };
      }
      const [ms] = await tx.insert(memberships).values({ organizationId: org, userId: u.id, role: input.role }).returning({ id: memberships.id });
      await tx.insert(auditLogs).values({ organizationId: org, actorUserId: m.userId, action: "membership.created", entityType: "membership", entityId: ms.id, afterData: { role: input.role } });
      return { ok: true, message: `Accès accordé. La personne doit créer son compte avec l'adresse ${email} puis la vérifier.` };
    });
    if (r.ok) revalidatePath(BASE);
    return r;
  } catch (e) {
    console.error("[settings] add member", e);
    return FAILED;
  }
}

/**
 * Contrôles communs aux changements sur un membre existant. L'acteur ne peut pas se modifier
 * lui-même et reste un propriétaire/administrateur actif : l'organisation garde donc toujours
 * au moins un administrateur.
 */
async function guardMember(
  tx: Tx,
  actor: { organizationId: string; membershipId: string; role: Role },
  id: string,
) {
  const [target] = await tx.select({ id: memberships.id, role: memberships.role, isActive: memberships.isActive }).from(memberships).where(and(eq(memberships.id, id), eq(memberships.organizationId, actor.organizationId))).for("update");
  if (!target) return { error: "Membre introuvable." } as const;
  if (target.id === actor.membershipId) return { error: "Vous ne pouvez pas modifier votre propre accès." } as const;
  if (target.role === "owner" && actor.role !== "owner") return { error: "Seul un propriétaire peut modifier l'accès d'un propriétaire." } as const;
  return { target } as const;
}

export async function updateMemberRole(id: string, role: Role): Promise<SettingsResult> {
  if (!UUID_RE.test(id) || !isRole(role)) return { ok: false, message: "Demande invalide." };
  const m = await manager();
  if (!m) return DENIED;
  if (!assignableRoles(m.role).includes(role)) return { ok: false, message: "Vous ne pouvez pas attribuer ce rôle." };
  try {
    const r = await withTransaction(async (tx): Promise<SettingsResult> => {
      const g = await guardMember(tx, m, id);
      if ("error" in g) return { ok: false, message: g.error as string };
      if (g.target.role === role) return { ok: true };
      await tx.update(memberships).set({ role }).where(and(eq(memberships.id, id), eq(memberships.organizationId, m.organizationId)));
      await tx.insert(auditLogs).values({ organizationId: m.organizationId, actorUserId: m.userId, action: "membership.role_changed", entityType: "membership", entityId: id, beforeData: { role: g.target.role }, afterData: { role } });
      return { ok: true, message: "Rôle mis à jour." };
    });
    if (r.ok) revalidatePath(BASE);
    return r;
  } catch (e) {
    console.error("[settings] role", e);
    return FAILED;
  }
}

export async function setMemberActive(id: string, active: boolean): Promise<SettingsResult> {
  if (!UUID_RE.test(id)) return { ok: false, message: "Membre invalide." };
  const m = await manager();
  if (!m) return DENIED;
  try {
    const r = await withTransaction(async (tx): Promise<SettingsResult> => {
      const g = await guardMember(tx, m, id);
      if ("error" in g) return { ok: false, message: g.error as string };
      if (g.target.isActive === active) return { ok: true };
      await tx.update(memberships).set({ isActive: active }).where(and(eq(memberships.id, id), eq(memberships.organizationId, m.organizationId)));
      await tx.insert(auditLogs).values({ organizationId: m.organizationId, actorUserId: m.userId, action: active ? "membership.reactivated" : "membership.deactivated", entityType: "membership", entityId: id, beforeData: { isActive: !active }, afterData: { isActive: active } });
      return { ok: true, message: active ? "Accès réactivé." : "Accès désactivé : la personne ne peut plus ouvrir le tableau de bord." };
    });
    if (r.ok) revalidatePath(BASE);
    return r;
  } catch (e) {
    console.error("[settings] member active", e);
    return FAILED;
  }
}
