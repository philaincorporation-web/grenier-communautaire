// Lectures métier. Chaque requête est filtrée par organization_id, résolu côté serveur
// par requireActiveMembership() — jamais à partir d'une valeur fournie par le navigateur.

import { and, asc, desc, eq, inArray, isNotNull, or, sql } from "drizzle-orm";
import { getDb, isDbConfigured, type Db } from "@/db";
import {
  aidRequests,
  donations,
  distributions,
  memberships,
  productCategories,
  products,
  stockMovementItems,
  stockMovements,
  warehouses,
} from "@/db/schema";
import { requireActiveMembership } from "@/lib/session";
import * as demo from "@/lib/data";
import type { Activity, Depot, ImpactPoint, Kpi, StockItem } from "@/lib/data";

// ---------------------------------------------------------------------------
// Utilitaires

function trendPct(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

function relativeTime(date: Date, now: number) {
  const minutes = Math.max(0, Math.round((now - date.getTime()) / 60_000));
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  return `Il y a ${Math.round(hours / 24)} j`;
}

const num = (v: unknown) => Number(v ?? 0);

// ---------------------------------------------------------------------------
// Stocks

export async function getWarehouses(organizationId: string, db: Db = getDb()): Promise<Depot[]> {
  return db
    .select({ id: warehouses.id, name: warehouses.name })
    .from(warehouses)
    .where(and(eq(warehouses.organizationId, organizationId), eq(warehouses.isActive, true)))
    .orderBy(asc(warehouses.name));
}

/**
 * Solde par produit pour un dépôt, calculé à partir du journal des mouvements validés (posted).
 * Entrée = dépôt destination, sortie = dépôt source ; un transfert compte donc des deux côtés.
 */
export async function getStockForWarehouse(
  organizationId: string,
  warehouseId: string,
  db: Db = getDb(),
): Promise<StockItem[]> {
  const balance = sql<number>`coalesce(sum(case
      when ${stockMovements.destinationWarehouseId} = ${warehouseId} then ${stockMovementItems.quantity}
      when ${stockMovements.sourceWarehouseId} = ${warehouseId} then -${stockMovementItems.quantity}
      else 0 end), 0)`.mapWith(Number);

  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      unit: products.unit,
      category: productCategories.name,
      quantity: balance,
    })
    .from(products)
    .leftJoin(
      productCategories,
      and(eq(productCategories.id, products.categoryId), eq(productCategories.organizationId, organizationId)),
    )
    .leftJoin(
      stockMovementItems,
      and(eq(stockMovementItems.productId, products.id), eq(stockMovementItems.organizationId, organizationId)),
    )
    .leftJoin(
      stockMovements,
      and(
        eq(stockMovements.id, stockMovementItems.movementId),
        eq(stockMovements.organizationId, organizationId),
        eq(stockMovements.status, "posted"),
        or(eq(stockMovements.destinationWarehouseId, warehouseId), eq(stockMovements.sourceWarehouseId, warehouseId)),
      ),
    )
    .where(and(eq(products.organizationId, organizationId), eq(products.isActive, true)))
    .groupBy(products.id, productCategories.name)
    .orderBy(asc(products.name));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    unit: r.unit,
    category: r.category ?? "Sans catégorie",
    quantity: r.quantity,
    status: demo.stockStatus(r.quantity),
  }));
}

// ---------------------------------------------------------------------------
// Tableau de bord

export async function getKpis(organizationId: string, db: Db = getDb()): Promise<Kpi[]> {
  const cur = (col: unknown) => sql`${col} >= current_date - 30`;
  const prev = (col: unknown) => sql`${col} >= current_date - 60 and ${col} < current_date - 30`;

  const [[don], [dist], [req], [stock]] = await Promise.all([
    db
      .select({
        cur: sql`count(*) filter (where ${cur(donations.receivedOn)})`.mapWith(Number),
        prev: sql`count(*) filter (where ${prev(donations.receivedOn)})`.mapWith(Number),
      })
      .from(donations)
      .where(and(eq(donations.organizationId, organizationId), eq(donations.status, "received"))),
    db
      .select({
        cur: sql`count(*) filter (where ${cur(distributions.distributedOn)})`.mapWith(Number),
        prev: sql`count(*) filter (where ${prev(distributions.distributedOn)})`.mapWith(Number),
      })
      .from(distributions)
      .where(and(eq(distributions.organizationId, organizationId), eq(distributions.status, "completed"))),
    db
      .select({
        pending: sql`count(*)`.mapWith(Number),
        cur: sql`count(*) filter (where ${cur(aidRequests.requestedOn)})`.mapWith(Number),
        prev: sql`count(*) filter (where ${prev(aidRequests.requestedOn)})`.mapWith(Number),
      })
      .from(aidRequests)
      .where(
        and(
          eq(aidRequests.organizationId, organizationId),
          inArray(aidRequests.status, ["submitted", "under_review"]),
        ),
      ),
    // Les transferts s'annulent au niveau de l'organisation : seuls entrées/sorties comptent.
    db
      .select({
        total: sql`coalesce(sum(case
          when ${stockMovements.movementType} in ('receipt', 'adjustment_in') then ${stockMovementItems.quantity}
          when ${stockMovements.movementType} in ('issue', 'adjustment_out') then -${stockMovementItems.quantity}
          else 0 end), 0)`.mapWith(Number),
      })
      .from(stockMovementItems)
      .innerJoin(
        stockMovements,
        and(
          eq(stockMovements.id, stockMovementItems.movementId),
          eq(stockMovements.organizationId, stockMovementItems.organizationId),
        ),
      )
      .where(and(eq(stockMovementItems.organizationId, organizationId), eq(stockMovements.status, "posted"))),
  ]);

  return [
    { label: "Dons reçus", value: don.cur, trend: trendPct(don.cur, don.prev), icon: "gift" },
    { label: "Produits en stock", value: stock.total, trend: null, icon: "box" },
    { label: "Demandes en attente", value: req.pending, trend: trendPct(req.cur, req.prev), icon: "users" },
    { label: "Distributions", value: dist.cur, trend: trendPct(dist.cur, dist.prev), icon: "truck" },
  ];
}

export async function getRecentActivity(organizationId: string, db: Db = getDb()): Promise<Activity[]> {
  const limit = 4;

  const [dons, approvals, dists, members] = await Promise.all([
    db
      .select({ at: donations.createdAt })
      .from(donations)
      .where(and(eq(donations.organizationId, organizationId), eq(donations.status, "received")))
      .orderBy(desc(donations.createdAt))
      .limit(limit),
    db
      .select({ at: aidRequests.reviewedAt })
      .from(aidRequests)
      .where(
        and(
          eq(aidRequests.organizationId, organizationId),
          eq(aidRequests.status, "approved"),
          isNotNull(aidRequests.reviewedAt),
        ),
      )
      .orderBy(desc(aidRequests.reviewedAt))
      .limit(limit),
    db
      .select({ at: distributions.createdAt })
      .from(distributions)
      .where(and(eq(distributions.organizationId, organizationId), eq(distributions.status, "completed")))
      .orderBy(desc(distributions.createdAt))
      .limit(limit),
    db
      .select({ at: memberships.joinedAt })
      .from(memberships)
      .where(eq(memberships.organizationId, organizationId))
      .orderBy(desc(memberships.joinedAt))
      .limit(limit),
  ]);

  const tag = (rows: { at: Date | null }[], kind: Activity["kind"], label: string) =>
    rows.flatMap((r) => (r.at ? [{ at: r.at, kind, label }] : []));

  const now = Date.now();
  return [
    ...tag(dons, "don", "Nouveau don reçu"),
    ...tag(approvals, "approval", "Demande d'aide approuvée"),
    ...tag(dists, "distribution", "Distribution effectuée"),
    ...tag(members, "member", "Nouveau membre inscrit"),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, limit)
    .map(({ at, kind, label }) => ({ kind, label, when: relativeTime(at, now) }));
}

/** Bénéficiaires distincts servis par semaine glissante, sur 4 semaines (S4 = la plus récente). */
export async function getImpact(organizationId: string, db: Db = getDb()): Promise<ImpactPoint[]> {
  const bucket = sql<number>`(current_date - ${distributions.distributedOn}) / 7`.mapWith(Number);
  const rows = await db
    .select({ bucket, value: sql`count(distinct ${distributions.beneficiaryId})`.mapWith(Number) })
    .from(distributions)
    .where(
      and(
        eq(distributions.organizationId, organizationId),
        eq(distributions.status, "completed"),
        sql`${distributions.distributedOn} > current_date - 28`,
      ),
    )
    .groupBy(bucket);

  return [3, 2, 1, 0].map((b, i) => ({
    label: `S${i + 1}`,
    value: num(rows.find((r) => r.bucket === b)?.value),
  }));
}

// ---------------------------------------------------------------------------
// Chargeurs de page (bascule démo / base réelle)

export type DashboardData = {
  demo: boolean;
  kpis: Kpi[];
  activity: Activity[];
  impact: ImpactPoint[];
};

export async function loadDashboard(): Promise<DashboardData> {
  if (!isDbConfigured) {
    return { demo: true, kpis: demo.kpis, activity: demo.recentActivity, impact: demo.impactSeries };
  }
  const { organizationId } = await requireActiveMembership();
  const [kpis, activity, impact] = await Promise.all([
    getKpis(organizationId),
    getRecentActivity(organizationId),
    getImpact(organizationId),
  ]);
  return { demo: false, kpis, activity, impact };
}

export type StocksData = {
  demo: boolean;
  depots: Depot[];
  selectedDepotId: string | null;
  items: StockItem[];
};

/** `requestedDepotId` vient de l'URL : il n'est retenu que s'il appartient à l'organisation active. */
export async function loadStocks(requestedDepotId?: string): Promise<StocksData> {
  if (!isDbConfigured) {
    const selected = demo.depots.find((d) => d.id === requestedDepotId) ?? demo.depots[0];
    return { demo: true, depots: demo.depots, selectedDepotId: selected.id, items: demo.stockItems };
  }
  const { organizationId } = await requireActiveMembership();
  const depots = await getWarehouses(organizationId);
  const selected = depots.find((d) => d.id === requestedDepotId) ?? depots[0];
  const items = selected ? await getStockForWarehouse(organizationId, selected.id) : [];
  return { demo: false, depots, selectedDepotId: selected?.id ?? null, items };
}
