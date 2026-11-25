// Lectures du module Paramètres (filtrées par organization_id, résolu côté serveur).

import { and, asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { memberships, organizations, productCategories, products, users } from "@/db/schema";

export * from "@/lib/settings-shared";

export async function getOrganization(organizationId: string) {
  const [o] = await getDb()
    .select({ name: organizations.name, email: organizations.email, phone: organizations.phone, address: organizations.address })
    .from(organizations)
    .where(eq(organizations.id, organizationId));
  return o ?? null;
}

export async function listCategories(organizationId: string) {
  return getDb()
    .select({
      id: productCategories.id,
      name: productCategories.name,
      description: productCategories.description,
      products: sql<number>`(select count(*)::int from ${products} p where p.category_id = ${productCategories.id} and p.organization_id = ${productCategories.organizationId})`,
    })
    .from(productCategories)
    .where(eq(productCategories.organizationId, organizationId))
    .orderBy(asc(productCategories.name));
}

export async function listProducts(organizationId: string) {
  return getDb()
    .select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      unit: products.unit,
      categoryId: products.categoryId,
      category: productCategories.name,
      isPerishable: products.isPerishable,
      isActive: products.isActive,
    })
    .from(products)
    .leftJoin(productCategories, and(eq(productCategories.id, products.categoryId), eq(productCategories.organizationId, products.organizationId)))
    .where(eq(products.organizationId, organizationId))
    .orderBy(sql`${products.isActive} desc`, asc(products.name));
}

export type ProductRow = Awaited<ReturnType<typeof listProducts>>[number];

export async function listTeam(organizationId: string) {
  return getDb()
    .select({ id: memberships.id, userId: users.id, name: users.fullName, email: users.email, role: memberships.role, isActive: memberships.isActive, joinedAt: memberships.joinedAt })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(eq(memberships.organizationId, organizationId))
    .orderBy(sql`${memberships.isActive} desc`, asc(users.fullName));
}

export type TeamRow = Awaited<ReturnType<typeof listTeam>>[number];
