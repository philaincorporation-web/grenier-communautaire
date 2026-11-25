// Lectures du module Dons (filtrées par organization_id, résolu côté serveur).
// Le dépôt d'un don n'est pas une colonne du don : c'est la destination de son mouvement
// d'entrée en stock (stock_movements.donation_id).

import { and, asc, count, desc, eq, ilike, max, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb, type Db } from "@/db";
import { donationItems, donations, donors, memberships, productCategories, products, stockMovements, users, warehouses } from "@/db/schema";
import { likePattern } from "@/lib/admin/refs";
import { UUID_RE } from "@/lib/distributions";
import { donationViews, type DonationStatus, type DonationView, type DonorType } from "@/lib/donations-shared";

export const PAGE_SIZE = 20;

/** Mouvement d'entrée (réception) de chaque don → dépôt. */
const receipt = alias(stockMovements, "receipt");

export type DonationRow = { id: string; reference: string | null; receivedOn: string; status: DonationStatus; donor: string; warehouse: string | null; lines: number };

export async function listDonations(
  organizationId: string,
  opts: { view: DonationView; q: string; page: number },
  db: Db = getDb(),
): Promise<{ rows: DonationRow[]; total: number; counts: Record<DonationView, number> }> {
  const q = opts.q.trim().slice(0, 100);
  const search = q ? or(ilike(donations.reference, likePattern(q)), ilike(donors.displayName, likePattern(q))) : undefined;
  const status = donationViews[opts.view].status;
  const where = and(eq(donations.organizationId, organizationId), status ? eq(donations.status, status) : undefined, search);
  const donorJoin = and(eq(donors.id, donations.donorId), eq(donors.organizationId, donations.organizationId));
  const lc = db
    .select({ id: donationItems.donationId, n: count().as("n") })
    .from(donationItems)
    .where(eq(donationItems.organizationId, organizationId))
    .groupBy(donationItems.donationId)
    .as("lc");

  const [rows, [total], byStatus] = await Promise.all([
    db
      .select({
        id: donations.id,
        reference: donations.reference,
        receivedOn: donations.receivedOn,
        status: donations.status,
        donor: donors.displayName,
        warehouse: warehouses.name,
        lines: sql`coalesce(${lc.n}, 0)`.mapWith(Number),
      })
      .from(donations)
      .innerJoin(donors, donorJoin)
      .leftJoin(receipt, and(eq(receipt.donationId, donations.id), eq(receipt.organizationId, donations.organizationId), eq(receipt.movementType, "receipt")))
      .leftJoin(warehouses, and(eq(warehouses.id, receipt.destinationWarehouseId), eq(warehouses.organizationId, donations.organizationId)))
      .leftJoin(lc, eq(lc.id, donations.id))
      .where(where)
      .orderBy(desc(donations.receivedOn), desc(donations.createdAt))
      .limit(PAGE_SIZE)
      .offset((opts.page - 1) * PAGE_SIZE),
    db.select({ n: count() }).from(donations).innerJoin(donors, donorJoin).where(where),
    db
      .select({ status: donations.status, n: count() })
      .from(donations)
      .innerJoin(donors, donorJoin)
      .where(and(eq(donations.organizationId, organizationId), search))
      .groupBy(donations.status),
  ]);
  const counts = {} as Record<DonationView, number>;
  for (const [v, def] of Object.entries(donationViews) as [DonationView, (typeof donationViews)[DonationView]][]) {
    counts[v] = byStatus.filter((s) => def.status === null || s.status === def.status).reduce((a, s) => a + s.n, 0);
  }
  return { rows, total: total.n, counts };
}

export type DonationDetail = {
  id: string;
  reference: string | null;
  receivedOn: string;
  status: DonationStatus;
  notes: string | null;
  receivedBy: string | null;
  warehouse: { id: string; name: string } | null;
  donor: { id: string; name: string; type: DonorType; phone: string | null; email: string | null } ;
  items: { productId: string; name: string; unit: string; category: string; quantity: number }[];
  movements: { reference: string; type: string; occurredAt: string }[];
};

export async function getDonation(organizationId: string, id: string, withContact: boolean, db: Db = getDb()): Promise<DonationDetail | null> {
  if (!UUID_RE.test(id)) return null;
  const [d] = await db
    .select({
      id: donations.id,
      reference: donations.reference,
      receivedOn: donations.receivedOn,
      status: donations.status,
      notes: donations.notes,
      receivedBy: users.fullName,
      donorId: donors.id,
      donorName: donors.displayName,
      donorType: donors.donorType,
      donorPhone: donors.phone,
      donorEmail: donors.email,
      warehouseId: warehouses.id,
      warehouseName: warehouses.name,
    })
    .from(donations)
    .innerJoin(donors, and(eq(donors.id, donations.donorId), eq(donors.organizationId, donations.organizationId)))
    .leftJoin(receipt, and(eq(receipt.donationId, donations.id), eq(receipt.organizationId, donations.organizationId), eq(receipt.movementType, "receipt")))
    .leftJoin(warehouses, and(eq(warehouses.id, receipt.destinationWarehouseId), eq(warehouses.organizationId, donations.organizationId)))
    .leftJoin(memberships, and(eq(memberships.id, donations.receivedByMembershipId), eq(memberships.organizationId, donations.organizationId)))
    .leftJoin(users, eq(users.id, memberships.userId))
    .where(and(eq(donations.id, id), eq(donations.organizationId, organizationId)))
    .limit(1);
  if (!d) return null;

  const [items, movements] = await Promise.all([
    db
      .select({ productId: donationItems.productId, name: products.name, unit: products.unit, category: productCategories.name, quantity: sql`${donationItems.quantity}`.mapWith(Number) })
      .from(donationItems)
      .innerJoin(products, and(eq(products.id, donationItems.productId), eq(products.organizationId, donationItems.organizationId)))
      .leftJoin(productCategories, and(eq(productCategories.id, products.categoryId), eq(productCategories.organizationId, products.organizationId)))
      .where(and(eq(donationItems.donationId, id), eq(donationItems.organizationId, organizationId)))
      .orderBy(asc(products.name)),
    db
      .select({ reference: stockMovements.reference, type: stockMovements.movementType, occurredAt: stockMovements.occurredAt })
      .from(stockMovements)
      .where(and(eq(stockMovements.organizationId, organizationId), eq(stockMovements.donationId, id)))
      .orderBy(asc(stockMovements.occurredAt)),
  ]);

  return {
    id: d.id,
    reference: d.reference,
    receivedOn: d.receivedOn,
    status: d.status,
    notes: d.notes,
    receivedBy: d.receivedBy,
    warehouse: d.warehouseId ? { id: d.warehouseId, name: d.warehouseName! } : null,
    donor: { id: d.donorId, name: d.donorName, type: d.donorType as DonorType, phone: withContact ? d.donorPhone : null, email: withContact ? d.donorEmail : null },
    items: items.map((i) => ({ ...i, category: i.category ?? "Sans catégorie" })),
    movements: movements.map((m) => ({ ...m, occurredAt: m.occurredAt.toISOString() })),
  };
}

export type DonationFormOptions = {
  donors: { id: string; label: string }[];
  warehouses: { id: string; name: string }[];
  products: { id: string; name: string; unit: string; category: string }[];
};

export async function getDonationFormOptions(organizationId: string, db: Db = getDb()): Promise<DonationFormOptions> {
  const [ds, whs, prods] = await Promise.all([
    db.select({ id: donors.id, name: donors.displayName, type: donors.donorType }).from(donors).where(eq(donors.organizationId, organizationId)).orderBy(asc(donors.displayName)),
    db.select({ id: warehouses.id, name: warehouses.name }).from(warehouses).where(and(eq(warehouses.organizationId, organizationId), eq(warehouses.isActive, true))).orderBy(asc(warehouses.name)),
    db
      .select({ id: products.id, name: products.name, unit: products.unit, category: productCategories.name })
      .from(products)
      .leftJoin(productCategories, and(eq(productCategories.id, products.categoryId), eq(productCategories.organizationId, products.organizationId)))
      .where(and(eq(products.organizationId, organizationId), eq(products.isActive, true)))
      .orderBy(asc(productCategories.name), asc(products.name)),
  ]);
  return {
    donors: ds.map((d) => ({ id: d.id, label: `${d.name}${d.type === "organization" ? " (organisation)" : ""}` })),
    warehouses: whs,
    products: prods.map((p) => ({ ...p, category: p.category ?? "Sans catégorie" })),
  };
}

export type DonorRow = { id: string; name: string; type: DonorType; phone: string | null; email: string | null; donations: number; lastDonation: string | null };

export async function listDonors(organizationId: string, opts: { q: string; page: number; withContact: boolean }, db: Db = getDb()) {
  const q = opts.q.trim().slice(0, 100);
  const where = and(eq(donors.organizationId, organizationId), q ? ilike(donors.displayName, likePattern(q)) : undefined);
  const agg = db
    .select({ donorId: donations.donorId, n: count().as("n"), last: max(donations.receivedOn).as("last") })
    .from(donations)
    .where(and(eq(donations.organizationId, organizationId), eq(donations.status, "received")))
    .groupBy(donations.donorId)
    .as("agg");
  const [rows, [total]] = await Promise.all([
    db
      .select({ id: donors.id, name: donors.displayName, type: donors.donorType, phone: donors.phone, email: donors.email, donations: sql`coalesce(${agg.n}, 0)`.mapWith(Number), lastDonation: agg.last })
      .from(donors)
      .leftJoin(agg, eq(agg.donorId, donors.id))
      .where(where)
      .orderBy(asc(donors.displayName))
      .limit(PAGE_SIZE)
      .offset((opts.page - 1) * PAGE_SIZE),
    db.select({ n: count() }).from(donors).where(where),
  ]);
  return {
    total: total.n,
    rows: rows.map((r): DonorRow => ({
      ...r,
      type: r.type as DonorType,
      phone: opts.withContact ? r.phone : null,
      email: opts.withContact ? r.email : null,
      lastDonation: r.lastDonation ?? null,
    })),
  };
}
