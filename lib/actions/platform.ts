"use server";

// Actions du module Plateforme : réservées au super administrateur (users.is_super_admin, relu
// en base à chaque appel). Tout est journalisé dans l'organisation concernée. Aucune suppression
// physique : organisations et membres se désactivent.
//
// Garde-fous : une organisation active garde toujours au moins un propriétaire actif, et le
// super administrateur ne modifie pas ses propres accès (pour ne pas s'enfermer dehors).

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { withTransaction, type Tx } from "@/db";
import { auditLogs, memberships, organizations, users } from "@/db/schema";
import { UUID_RE } from "@/lib/distributions";
import { validateNewOrganization, type NewOrganizationInput } from "@/lib/platform-shared";
import { getSuperAdmin } from "@/lib/session";
import { isRole, validateMember, type MemberInput, type Role, type SettingsResult } from "@/lib/settings-shared";

const BASE = "/tableau-de-bord/plateforme";
const DENIED = { ok: false, message: "Action réservée au super administrateur." } as const;
const FAILED = { ok: false, message: "L'opération n'a pas pu aboutir. Réessayez." } as const;
const INVALID = { ok: false, message: "Merci de corriger les champs indiqués." } as const;

const isUnique = (e: unknown, constraint?: string) => {
  const x = e as { code?: string; constraint?: string; cause?: { code?: string; constraint?: string } };
  const code = x?.code ?? x?.cause?.code;
  const name = x?.constraint ?? x?.cause?.constraint;
  return code === "23505" && (!constraint || name === constraint);
};

function revalidate(orgId?: string) {
  revalidatePath(BASE);
  if (orgId) revalidatePath(`${BASE}/${orgId}`);
  revalidatePath("/tableau-de-bord/parametres");
}

/** Crée l'utilisateur s'il n'existe pas (par e-mail) et renvoie son id. */
async function ensureUser(tx: Tx, email: string, fullName: string) {
  await tx.insert(users).values({ email, fullName }).onConflictDoNothing({ target: users.email });
  const [u] = await tx.select({ id: users.id }).from(users).where(eq(users.email, email));
  return u.id;
}

async function activeOwnersOtherThan(tx: Tx, orgId: string, membershipId: string) {
  const rows = await tx
    .select({ id: memberships.id })
    .from(memberships)
    .where(and(eq(memberships.organizationId, orgId), eq(memberships.role, "owner"), eq(memberships.isActive, true), ne(memberships.id, membershipId)));
  return rows.length;
}

// --- Organisations --------------------------------------------------------------------------

export async function createOrganization(input: NewOrganizationInput): Promise<SettingsResult & { id?: string }> {
  const admin = await getSuperAdmin();
  if (!admin) return DENIED;
  const errors = validateNewOrganization(input);
  if (Object.keys(errors).length) return { ...INVALID, errors };
  const ownerEmail = input.ownerEmail.trim().toLowerCase();
  try {
    const id = await withTransaction(async (tx) => {
      const [org] = await tx
        .insert(organizations)
        .values({
          name: input.name.trim(),
          slug: input.slug.trim(),
          email: input.email.trim().toLowerCase() || null,
          phone: input.phone.trim() || null,
          address: input.address.trim() || null,
        })
        .returning({ id: organizations.id });
      const userId = await ensureUser(tx, ownerEmail, input.ownerName.trim());
      const [ms] = await tx.insert(memberships).values({ organizationId: org.id, userId, role: "owner" }).returning({ id: memberships.id });
      await tx.insert(auditLogs).values([
        { organizationId: org.id, actorUserId: admin.userId, action: "organization.created", entityType: "organization", entityId: org.id, afterData: { name: input.name.trim(), slug: input.slug.trim() } },
        { organizationId: org.id, actorUserId: admin.userId, action: "membership.created", entityType: "membership", entityId: ms.id, afterData: { role: "owner" } },
      ]);
      return org.id;
    });
    revalidate(id);
    return { ok: true, id, message: `Organisation créée. ${ownerEmail} en est propriétaire : la personne doit créer son compte avec cette adresse puis la vérifier.` };
  } catch (e) {
    if (isUnique(e)) return { ...INVALID, errors: { slug: "Cet identifiant est déjà utilisé." } };
    console.error("[platform] create organization", e);
    return FAILED;
  }
}

export async function setOrganizationActive(orgId: string, active: boolean): Promise<SettingsResult> {
  if (!UUID_RE.test(orgId)) return { ok: false, message: "Organisation invalide." };
  const admin = await getSuperAdmin();
  if (!admin) return DENIED;
  try {
    const r = await withTransaction(async (tx): Promise<SettingsResult> => {
      const [org] = await tx.select({ isActive: organizations.isActive }).from(organizations).where(eq(organizations.id, orgId)).for("update");
      if (!org) return { ok: false, message: "Organisation introuvable." };
      if (org.isActive === active) return { ok: true };
      await tx.update(organizations).set({ isActive: active, updatedAt: new Date() }).where(eq(organizations.id, orgId));
      await tx.insert(auditLogs).values({ organizationId: orgId, actorUserId: admin.userId, action: active ? "organization.reactivated" : "organization.deactivated", entityType: "organization", entityId: orgId, beforeData: { isActive: !active }, afterData: { isActive: active } });
      return { ok: true, message: active ? "Organisation réactivée." : "Organisation désactivée : ses membres ne peuvent plus ouvrir son tableau de bord." };
    });
    if (r.ok) revalidate(orgId);
    return r;
  } catch (e) {
    console.error("[platform] org active", e);
    return FAILED;
  }
}

// --- Membres d'une organisation ---------------------------------------------------------------

export async function addOrganizationMember(orgId: string, input: MemberInput): Promise<SettingsResult> {
  if (!UUID_RE.test(orgId)) return { ok: false, message: "Organisation invalide." };
  const admin = await getSuperAdmin();
  if (!admin) return DENIED;
  const errors = validateMember(input);
  if (Object.keys(errors).length) return { ...INVALID, errors };
  const email = input.email.trim().toLowerCase();
  try {
    const r = await withTransaction(async (tx): Promise<SettingsResult> => {
      const [org] = await tx.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, orgId));
      if (!org) return { ok: false, message: "Organisation introuvable." };
      const userId = await ensureUser(tx, email, input.fullName.trim());
      const [existing] = await tx.select({ isActive: memberships.isActive }).from(memberships).where(and(eq(memberships.organizationId, orgId), eq(memberships.userId, userId)));
      if (existing) {
        return { ok: false, message: existing.isActive ? "Cette personne fait déjà partie de l'organisation." : "Cette personne a été désactivée : réactivez-la dans la liste.", errors: { email: "Déjà membre." } };
      }
      const [ms] = await tx.insert(memberships).values({ organizationId: orgId, userId, role: input.role }).returning({ id: memberships.id });
      await tx.insert(auditLogs).values({ organizationId: orgId, actorUserId: admin.userId, action: "membership.created", entityType: "membership", entityId: ms.id, afterData: { role: input.role } });
      return { ok: true, message: `Accès accordé. La personne doit créer son compte avec l'adresse ${email} puis la vérifier.` };
    });
    if (r.ok) revalidate(orgId);
    return r;
  } catch (e) {
    console.error("[platform] add member", e);
    return FAILED;
  }
}

async function guardMember(tx: Tx, adminUserId: string, orgId: string, id: string) {
  const [target] = await tx
    .select({ id: memberships.id, role: memberships.role, isActive: memberships.isActive, userId: memberships.userId })
    .from(memberships)
    .where(and(eq(memberships.id, id), eq(memberships.organizationId, orgId)))
    .for("update");
  if (!target) return { error: "Membre introuvable." } as const;
  if (target.userId === adminUserId) return { error: "Vous ne pouvez pas modifier vos propres accès." } as const;
  return { target } as const;
}

export async function updateOrganizationMemberRole(orgId: string, id: string, role: Role): Promise<SettingsResult> {
  if (!UUID_RE.test(orgId) || !UUID_RE.test(id) || !isRole(role)) return { ok: false, message: "Demande invalide." };
  const admin = await getSuperAdmin();
  if (!admin) return DENIED;
  try {
    const r = await withTransaction(async (tx): Promise<SettingsResult> => {
      const g = await guardMember(tx, admin.userId, orgId, id);
      if ("error" in g) return { ok: false, message: g.error as string };
      if (g.target.role === role) return { ok: true };
      if (g.target.role === "owner" && g.target.isActive && (await activeOwnersOtherThan(tx, orgId, id)) === 0) {
        return { ok: false, message: "C'est le dernier propriétaire : nommez d'abord un autre propriétaire." };
      }
      await tx.update(memberships).set({ role }).where(and(eq(memberships.id, id), eq(memberships.organizationId, orgId)));
      await tx.insert(auditLogs).values({ organizationId: orgId, actorUserId: admin.userId, action: "membership.role_changed", entityType: "membership", entityId: id, beforeData: { role: g.target.role }, afterData: { role } });
      return { ok: true, message: "Rôle mis à jour." };
    });
    if (r.ok) revalidate(orgId);
    return r;
  } catch (e) {
    console.error("[platform] role", e);
    return FAILED;
  }
}

export async function setOrganizationMemberActive(orgId: string, id: string, active: boolean): Promise<SettingsResult> {
  if (!UUID_RE.test(orgId) || !UUID_RE.test(id)) return { ok: false, message: "Demande invalide." };
  const admin = await getSuperAdmin();
  if (!admin) return DENIED;
  try {
    const r = await withTransaction(async (tx): Promise<SettingsResult> => {
      const g = await guardMember(tx, admin.userId, orgId, id);
      if ("error" in g) return { ok: false, message: g.error as string };
      if (g.target.isActive === active) return { ok: true };
      if (!active && g.target.role === "owner" && (await activeOwnersOtherThan(tx, orgId, id)) === 0) {
        return { ok: false, message: "C'est le dernier propriétaire actif : nommez d'abord un autre propriétaire." };
      }
      await tx.update(memberships).set({ isActive: active }).where(and(eq(memberships.id, id), eq(memberships.organizationId, orgId)));
      await tx.insert(auditLogs).values({ organizationId: orgId, actorUserId: admin.userId, action: active ? "membership.reactivated" : "membership.deactivated", entityType: "membership", entityId: id, beforeData: { isActive: !active }, afterData: { isActive: active } });
      return { ok: true, message: active ? "Accès réactivé." : "Accès désactivé." };
    });
    if (r.ok) revalidate(orgId);
    return r;
  } catch (e) {
    console.error("[platform] member active", e);
    return FAILED;
  }
}
