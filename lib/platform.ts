// Lectures du module Plateforme. Réservées au super administrateur : chaque page appelle
// getSuperAdmin() avant d'utiliser ces fonctions.

import { and, asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { memberships, organizations, users } from "@/db/schema";

export * from "@/lib/platform-shared";

export async function listOrganizations() {
  return getDb()
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      email: organizations.email,
      isActive: organizations.isActive,
      createdAt: organizations.createdAt,
      members: sql<number>`(select count(*)::int from ${memberships} m where m.organization_id = ${organizations.id} and m.is_active)`,
      owners: sql<number>`(select count(*)::int from ${memberships} m where m.organization_id = ${organizations.id} and m.is_active and m.role = 'owner')`,
    })
    .from(organizations)
    .orderBy(sql`${organizations.isActive} desc`, asc(organizations.name));
}

export type OrganizationRow = Awaited<ReturnType<typeof listOrganizations>>[number];

export async function getOrganizationDetail(organizationId: string) {
  const [org] = await getDb()
    .select({ id: organizations.id, name: organizations.name, slug: organizations.slug, isActive: organizations.isActive })
    .from(organizations)
    .where(eq(organizations.id, organizationId));
  if (!org) return null;
  const team = await getDb()
    .select({
      id: memberships.id,
      userId: users.id,
      name: users.fullName,
      email: users.email,
      role: memberships.role,
      isActive: memberships.isActive,
      joinedAt: memberships.joinedAt,
      isSuperAdmin: users.isSuperAdmin,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(and(eq(memberships.organizationId, organizationId)))
    .orderBy(sql`${memberships.isActive} desc`, asc(users.fullName));
  return { org, team };
}

export type PlatformMemberRow = NonNullable<Awaited<ReturnType<typeof getOrganizationDetail>>>["team"][number];
