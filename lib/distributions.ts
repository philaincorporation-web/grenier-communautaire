// Lectures du module Distributions. Chaque requête est filtrée par organization_id, résolu
// côté serveur par requireActiveMembership() — jamais à partir d'une valeur du navigateur.

import { and, asc, count, desc, eq, inArray, or, sql } from "drizzle-orm";
import { getDb, type Db, type Tx } from "@/db";
import {
  aidRequestItems,
  aidRequests,
  beneficiaries,
  distributionItems,
  distributions,
  memberships,
  productCategories,
  products,
  stockMovementItems,
  stockMovements,
  users,
  warehouses,
} from "@/db/schema";
import type { DistributionStatus, FormOptions } from "@/lib/distributions-shared";

export const PAGE_SIZE = 20;
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Queryable = Db | Tx;

// ---------------------------------------------------------------------------
// Stock disponible

/**
 * Solde par (dépôt, produit), calculé sur le journal des mouvements VALIDÉS (posted) :
 * + quand le dépôt est la destination, − quand il est la source. Même règle que l'écran Stocks.
 */
export async function stockBalances(
  db: Queryable,
  organizationId: string,
  filter: { warehouseId?: string; productIds?: string[] } = {},
): Promise<Record<string, Record<string, number>>> {
  const rows = await db
    .select({
      warehouseId: warehouses.id,
      productId: stockMovementItems.productId,
      quantity: sql`sum(case when ${stockMovements.destinationWarehouseId} = ${warehouses.id}
        then ${stockMovementItems.quantity} else -${stockMovementItems.quantity} end)`.mapWith(Number),
    })
    .from(stockMovementItems)
    .innerJoin(
      stockMovements,
      and(
        eq(stockMovements.id, stockMovementItems.movementId),
        eq(stockMovements.organizationId, stockMovementItems.organizationId),
        eq(stockMovements.status, "posted"),
      ),
    )
    .innerJoin(
      warehouses,
      and(
        eq(warehouses.organizationId, stockMovements.organizationId),
        or(eq(warehouses.id, stockMovements.destinationWarehouseId), eq(warehouses.id, stockMovements.sourceWarehouseId)),
      ),
    )
    .where(
      and(
        eq(stockMovementItems.organizationId, organizationId),
        filter.warehouseId ? eq(warehouses.id, filter.warehouseId) : undefined,
        filter.productIds?.length ? inArray(stockMovementItems.productId, filter.productIds) : undefined,
      ),
    )
    .groupBy(warehouses.id, stockMovementItems.productId);

  const out: Record<string, Record<string, number>> = {};
  for (const r of rows) (out[r.warehouseId] ??= {})[r.productId] = r.quantity;
  return out;
}

// ---------------------------------------------------------------------------
// Liste

export type DistributionRow = {
  id: string;
  reference: string;
  status: DistributionStatus;
  distributedOn: string;
  beneficiary: string;
  warehouse: string;
  lines: number;
};

export async function listDistributions(
  organizationId: string,
  status: DistributionStatus | undefined,
  page: number,
  db: Db = getDb(),
): Promise<{ rows: DistributionRow[]; total: number; counts: Record<DistributionStatus, number> }> {
  const where = and(eq(distributions.organizationId, organizationId), status ? eq(distributions.status, status) : undefined);
  const lineCount = db
    .select({ distributionId: distributionItems.distributionId, n: count().as("n") })
    .from(distributionItems)
    .where(eq(distributionItems.organizationId, organizationId))
    .groupBy(distributionItems.distributionId)
    .as("line_count");

  const [rows, [total], byStatus] = await Promise.all([
    db
      .select({
        id: distributions.id,
        reference: distributions.reference,
        status: distributions.status,
        distributedOn: distributions.distributedOn,
        beneficiary: beneficiaries.displayName,
        warehouse: warehouses.name,
        lines: sql`coalesce(${lineCount.n}, 0)`.mapWith(Number),
      })
      .from(distributions)
      .innerJoin(beneficiaries, and(eq(beneficiaries.id, distributions.beneficiaryId), eq(beneficiaries.organizationId, distributions.organizationId)))
      .innerJoin(warehouses, and(eq(warehouses.id, distributions.warehouseId), eq(warehouses.organizationId, distributions.organizationId)))
      .leftJoin(lineCount, eq(lineCount.distributionId, distributions.id))
      .where(where)
      .orderBy(desc(distributions.distributedOn), desc(distributions.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ n: count() }).from(distributions).where(where),
    db
      .select({ status: distributions.status, n: count() })
      .from(distributions)
      .where(eq(distributions.organizationId, organizationId))
      .groupBy(distributions.status),
  ]);

  const counts: Record<DistributionStatus, number> = { draft: 0, completed: 0, cancelled: 0 };
  for (const s of byStatus) counts[s.status] = s.n;
  return { rows, total: total.n, counts };
}

// ---------------------------------------------------------------------------
// Fiche détaillée

export type DistributionDetail = {
  id: string;
  reference: string;
  status: DistributionStatus;
  distributedOn: string;
  note: string | null;
  recipientAcknowledgement: string | null;
  warehouseId: string;
  warehouse: string;
  beneficiary: { name: string; reference: string | null; phone: string | null; householdSize: number | null };
  aidRequestReference: string | null;
  distributedBy: string | null;
  items: { productId: string; name: string; unit: string; category: string; quantity: number; available: number | null }[];
  movements: { reference: string; type: string; occurredAt: string }[];
};

export async function getDistribution(organizationId: string, id: string, db: Db = getDb()): Promise<DistributionDetail | null> {
  if (!UUID_RE.test(id)) return null;
  const [d] = await db
    .select({
      id: distributions.id,
      reference: distributions.reference,
      status: distributions.status,
      distributedOn: distributions.distributedOn,
      note: distributions.note,
      recipientAcknowledgement: distributions.recipientAcknowledgement,
      warehouseId: distributions.warehouseId,
      warehouse: warehouses.name,
      beneficiaryName: beneficiaries.displayName,
      beneficiaryReference: beneficiaries.reference,
      beneficiaryPhone: beneficiaries.phone,
      householdSize: beneficiaries.householdSize,
      aidRequestReference: aidRequests.reference,
      distributedBy: users.fullName,
    })
    .from(distributions)
    .innerJoin(beneficiaries, and(eq(beneficiaries.id, distributions.beneficiaryId), eq(beneficiaries.organizationId, distributions.organizationId)))
    .innerJoin(warehouses, and(eq(warehouses.id, distributions.warehouseId), eq(warehouses.organizationId, distributions.organizationId)))
    .leftJoin(aidRequests, and(eq(aidRequests.id, distributions.aidRequestId), eq(aidRequests.organizationId, distributions.organizationId)))
    .leftJoin(memberships, and(eq(memberships.id, distributions.distributedByMembershipId), eq(memberships.organizationId, distributions.organizationId)))
    .leftJoin(users, eq(users.id, memberships.userId))
    .where(and(eq(distributions.id, id), eq(distributions.organizationId, organizationId)))
    .limit(1);
  if (!d) return null;

  const [items, movements] = await Promise.all([
    db
      .select({
        productId: distributionItems.productId,
        name: products.name,
        unit: products.unit,
        category: productCategories.name,
        quantity: sql`${distributionItems.quantity}`.mapWith(Number),
      })
      .from(distributionItems)
      .innerJoin(products, and(eq(products.id, distributionItems.productId), eq(products.organizationId, distributionItems.organizationId)))
      .leftJoin(productCategories, and(eq(productCategories.id, products.categoryId), eq(productCategories.organizationId, products.organizationId)))
      .where(and(eq(distributionItems.distributionId, d.id), eq(distributionItems.organizationId, organizationId)))
      .orderBy(asc(products.name)),
    // Mouvements liés : référence identique (sortie), « ANN-… » (annulation), ou note des données de démonstration.
    db
      .select({ reference: stockMovements.reference, type: stockMovements.movementType, occurredAt: stockMovements.occurredAt })
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.organizationId, organizationId),
          or(
            inArray(stockMovements.reference, [d.reference, `ANN-${d.reference}`]),
            eq(stockMovements.note, `Distribution ${d.reference}`),
          ),
        ),
      )
      .orderBy(asc(stockMovements.occurredAt)),
  ]);

  // Le stock disponible n'a de sens qu'avant la sortie (brouillon).
  const stock =
    d.status === "draft" && items.length
      ? (await stockBalances(db, organizationId, { warehouseId: d.warehouseId, productIds: items.map((i) => i.productId) }))[d.warehouseId] ?? {}
      : null;

  return {
    id: d.id,
    reference: d.reference,
    status: d.status,
    distributedOn: d.distributedOn,
    note: d.note,
    recipientAcknowledgement: d.recipientAcknowledgement,
    warehouseId: d.warehouseId,
    warehouse: d.warehouse,
    beneficiary: { name: d.beneficiaryName, reference: d.beneficiaryReference, phone: d.beneficiaryPhone, householdSize: d.householdSize },
    aidRequestReference: d.aidRequestReference,
    distributedBy: d.distributedBy,
    items: items.map((i) => ({ ...i, category: i.category ?? "Sans catégorie", available: stock ? (stock[i.productId] ?? 0) : null })),
    movements: movements.map((m) => ({ reference: m.reference, type: m.type, occurredAt: m.occurredAt.toISOString() })),
  };
}

// ---------------------------------------------------------------------------
// Options du formulaire « Nouvelle distribution »

export async function getFormOptions(organizationId: string, db: Db = getDb()): Promise<FormOptions> {
  const [benefs, whs, prods, stock, requests] = await Promise.all([
    db
      .select({ id: beneficiaries.id, name: beneficiaries.displayName, reference: beneficiaries.reference })
      .from(beneficiaries)
      .where(and(eq(beneficiaries.organizationId, organizationId), eq(beneficiaries.isActive, true)))
      .orderBy(asc(beneficiaries.displayName)),
    db
      .select({ id: warehouses.id, name: warehouses.name })
      .from(warehouses)
      .where(and(eq(warehouses.organizationId, organizationId), eq(warehouses.isActive, true)))
      .orderBy(asc(warehouses.name)),
    db
      .select({ id: products.id, name: products.name, unit: products.unit, category: productCategories.name })
      .from(products)
      .leftJoin(productCategories, and(eq(productCategories.id, products.categoryId), eq(productCategories.organizationId, products.organizationId)))
      .where(and(eq(products.organizationId, organizationId), eq(products.isActive, true)))
      .orderBy(asc(productCategories.name), asc(products.name)),
    stockBalances(db, organizationId),
    db
      .select({
        id: aidRequests.id,
        reference: aidRequests.reference,
        beneficiaryId: aidRequests.beneficiaryId,
        beneficiaryName: beneficiaries.displayName,
      })
      .from(aidRequests)
      .innerJoin(beneficiaries, and(eq(beneficiaries.id, aidRequests.beneficiaryId), eq(beneficiaries.organizationId, aidRequests.organizationId)))
      .where(and(eq(aidRequests.organizationId, organizationId), eq(aidRequests.status, "approved")))
      .orderBy(desc(aidRequests.requestedOn)),
  ]);

  const reqItems = requests.length
    ? await db
        .select({
          aidRequestId: aidRequestItems.aidRequestId,
          productId: aidRequestItems.productId,
          quantity: sql`coalesce(${aidRequestItems.quantityApproved}, ${aidRequestItems.quantityRequested})`.mapWith(Number),
        })
        .from(aidRequestItems)
        .where(and(eq(aidRequestItems.organizationId, organizationId), inArray(aidRequestItems.aidRequestId, requests.map((r) => r.id))))
    : [];

  return {
    beneficiaries: benefs.map((b) => ({ id: b.id, label: b.reference ? `${b.name} (${b.reference})` : b.name })),
    warehouses: whs,
    products: prods.map((p) => ({ ...p, category: p.category ?? "Sans catégorie" })),
    stock,
    aidRequests: requests.map((r) => ({
      id: r.id,
      reference: r.reference,
      beneficiaryId: r.beneficiaryId,
      beneficiaryLabel: r.beneficiaryName,
      items: reqItems.filter((i) => i.aidRequestId === r.id && i.quantity > 0).map((i) => ({ productId: i.productId, quantity: i.quantity })),
    })),
  };
}
