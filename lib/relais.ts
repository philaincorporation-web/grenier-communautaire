// Module Relais (dépôts et points relais = table `warehouses`) : lectures et règles partagées.

import { and, asc, count, eq, gte, sql } from "drizzle-orm";
import { getDb, type Db } from "@/db";
import { distributions, memberships, stockMovements, users, warehouses } from "@/db/schema";
import { stockBalances, UUID_RE } from "@/lib/distributions";
export { canManageRelais, validateRelais, type RelaisInput, type RelaisResult } from "@/lib/relais-shared";

export type RelaisCard = {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  isActive: boolean;
  manager: string | null;
  managerMembershipId: string | null;
  productsInStock: number;
  distributions30: number;
  receipts30: number;
};

export async function listRelais(organizationId: string, db: Db = getDb()): Promise<RelaisCard[]> {
  const since = sql`now() - interval '30 days'`;
  const [rows, stock, dists, receipts] = await Promise.all([
    db
      .select({
        id: warehouses.id,
        name: warehouses.name,
        code: warehouses.code,
        address: warehouses.address,
        isActive: warehouses.isActive,
        managerMembershipId: warehouses.managerMembershipId,
        manager: users.fullName,
      })
      .from(warehouses)
      .leftJoin(memberships, and(eq(memberships.id, warehouses.managerMembershipId), eq(memberships.organizationId, warehouses.organizationId)))
      .leftJoin(users, eq(users.id, memberships.userId))
      .where(eq(warehouses.organizationId, organizationId))
      .orderBy(sql`${warehouses.isActive} desc`, asc(warehouses.name)),
    stockBalances(db, organizationId),
    db
      .select({ id: distributions.warehouseId, n: count() })
      .from(distributions)
      .where(and(eq(distributions.organizationId, organizationId), eq(distributions.status, "completed"), gte(distributions.distributedOn, sql`(current_date - 30)`)))
      .groupBy(distributions.warehouseId),
    db
      .select({ id: stockMovements.destinationWarehouseId, n: count() })
      .from(stockMovements)
      .where(and(eq(stockMovements.organizationId, organizationId), eq(stockMovements.movementType, "receipt"), eq(stockMovements.status, "posted"), gte(stockMovements.occurredAt, since)))
      .groupBy(stockMovements.destinationWarehouseId),
  ]);
  return rows.map((r) => ({
    ...r,
    productsInStock: Object.values(stock[r.id] ?? {}).filter((q) => q > 0).length,
    distributions30: dists.find((d) => d.id === r.id)?.n ?? 0,
    receipts30: receipts.find((d) => d.id === r.id)?.n ?? 0,
  }));
}

export async function getRelais(organizationId: string, id: string, db: Db = getDb()) {
  if (!UUID_RE.test(id)) return null;
  const [w] = await db
    .select()
    .from(warehouses)
    .where(and(eq(warehouses.id, id), eq(warehouses.organizationId, organizationId)))
    .limit(1);
  return w ?? null;
}

/** Membres actifs pouvant être responsables d'un relais. */
export async function listActiveMembers(organizationId: string, db: Db = getDb()) {
  return db
    .select({ id: memberships.id, name: users.fullName, role: memberships.role })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(and(eq(memberships.organizationId, organizationId), eq(memberships.isActive, true), eq(users.isActive, true)))
    .orderBy(asc(users.fullName));
}
