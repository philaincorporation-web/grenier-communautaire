// Lectures du module Rapports (filtrées par organization_id, résolu côté serveur).
// Seuls des volumes sont calculés : aucune valeur monétaire (estimated_unit_value) n'est lue.

import { and, asc, between, count, countDistinct, eq, ne, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { aidRequests, beneficiaries, distributionItems, distributions, donationItems, donations, donors, productCategories, products, warehouses } from "@/db/schema";
import { stockBalances } from "@/lib/distributions";
import { donorTypeLabels } from "@/lib/donations-shared";
import { bucketsBetween, bucketStart, periodRange, periods, type ExportType, type Period } from "@/lib/reports-shared";

export * from "@/lib/reports-shared";

/** Date du jour à Libreville (AAAA-MM-JJ). */
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Libreville" }).format(new Date());

export type ProductFlow = { id: string; name: string; unit: string; category: string | null; received: number; distributed: number };

export async function getReport(organizationId: string, period: Period) {
  const db = getDb();
  const range = periodRange(period, today());
  const bucket = periods[period].bucket;
  const org = organizationId;
  const distIn = and(eq(distributions.organizationId, org), eq(distributions.status, "completed"), between(distributions.distributedOn, range.from, range.to));
  const donIn = and(eq(donations.organizationId, org), eq(donations.status, "received"), between(donations.receivedOn, range.from, range.to));

  const [[dist], [don], [aid], served, distDays, donDays, distributed, received, productRows, depots, balances] = await Promise.all([
    db.select({ n: count(), beneficiaries: countDistinct(distributions.beneficiaryId) }).from(distributions).where(distIn),
    db.select({ n: count(), donors: countDistinct(donations.donorId) }).from(donations).where(donIn),
    db
      .select({ n: count(), approved: sql<number>`count(*) filter (where ${aidRequests.status} in ('approved','fulfilled'))`.mapWith(Number) })
      .from(aidRequests)
      .where(and(eq(aidRequests.organizationId, org), ne(aidRequests.status, "cancelled"), between(aidRequests.requestedOn, range.from, range.to))),
    // Personnes aidées : taille des foyers des bénéficiaires servis (1 si non renseignée).
    db
      .select({ people: sql<number>`coalesce(sum(coalesce(${beneficiaries.householdSize}, 1)), 0)`.mapWith(Number) })
      .from(beneficiaries)
      .where(and(eq(beneficiaries.organizationId, org), sql`${beneficiaries.id} in (select ${distributions.beneficiaryId} from ${distributions} where ${distIn})`)),
    db.select({ day: distributions.distributedOn, n: count() }).from(distributions).where(distIn).groupBy(distributions.distributedOn),
    db.select({ day: donations.receivedOn, n: count() }).from(donations).where(donIn).groupBy(donations.receivedOn),
    db
      .select({ productId: distributionItems.productId, q: sql<number>`sum(${distributionItems.quantity})`.mapWith(Number) })
      .from(distributionItems)
      .innerJoin(distributions, and(eq(distributions.id, distributionItems.distributionId), eq(distributions.organizationId, distributionItems.organizationId)))
      .where(distIn)
      .groupBy(distributionItems.productId),
    db
      .select({ productId: donationItems.productId, q: sql<number>`sum(${donationItems.quantity})`.mapWith(Number) })
      .from(donationItems)
      .innerJoin(donations, and(eq(donations.id, donationItems.donationId), eq(donations.organizationId, donationItems.organizationId)))
      .where(donIn)
      .groupBy(donationItems.productId),
    db
      .select({ id: products.id, name: products.name, unit: products.unit, category: productCategories.name })
      .from(products)
      .leftJoin(productCategories, and(eq(productCategories.id, products.categoryId), eq(productCategories.organizationId, products.organizationId)))
      .where(eq(products.organizationId, org)),
    db.select({ id: warehouses.id, name: warehouses.name, isActive: warehouses.isActive }).from(warehouses).where(eq(warehouses.organizationId, org)).orderBy(asc(warehouses.name)),
    stockBalances(db, org),
  ]);

  // Activité par créneau (semaine ou mois), créneaux vides compris.
  const keys = bucketsBetween(range.from, range.to, bucket);
  const series = new Map(keys.map((k) => [k, { start: k, distributions: 0, donations: 0 }]));
  for (const r of distDays) series.get(bucketStart(r.day, bucket))!.distributions += r.n;
  for (const r of donDays) series.get(bucketStart(r.day, bucket))!.donations += r.n;

  const byId = new Map(productRows.map((p) => [p.id, p]));
  const flows = new Map<string, ProductFlow>();
  const flow = (id: string) => {
    const p = byId.get(id);
    if (!flows.has(id)) flows.set(id, { id, name: p?.name ?? "Produit", unit: p?.unit ?? "", category: p?.category ?? null, received: 0, distributed: 0 });
    return flows.get(id)!;
  };
  for (const r of received) flow(r.productId).received = r.q;
  for (const r of distributed) flow(r.productId).distributed = r.q;

  const stock = depots
    .map((w) => {
      const items = Object.entries(balances[w.id] ?? {})
        .filter(([, q]) => q > 0)
        .map(([pid, q]) => ({ id: pid, name: byId.get(pid)?.name ?? "Produit", unit: byId.get(pid)?.unit ?? "", quantity: q }))
        .sort((a, b) => b.quantity - a.quantity);
      return { ...w, items };
    })
    .filter((w) => w.isActive || w.items.length);

  return {
    range,
    bucket,
    kpis: {
      distributions: dist.n,
      beneficiaries: dist.beneficiaries,
      people: served[0]?.people ?? 0,
      donations: don.n,
      donors: don.donors,
      aidRequests: aid.n,
      aidApproved: aid.approved,
    },
    series: [...series.values()],
    flows: [...flows.values()].sort((a, b) => b.distributed - a.distributed || b.received - a.received || a.name.localeCompare(b.name, "fr")),
    stock,
  };
}

export type Report = Awaited<ReturnType<typeof getReport>>;

/** Lignes du fichier CSV : une ligne par article. Bénéficiaires et donateurs sans nom ni contact. */
export async function exportRows(organizationId: string, period: Period, type: ExportType): Promise<string[][]> {
  const db = getDb();
  const range = periodRange(period, today());
  if (type === "distributions") {
    const rows = await db
      .select({ ref: distributions.reference, day: distributions.distributedOn, depot: warehouses.name, ben: beneficiaries.reference, product: products.name, unit: products.unit, q: distributionItems.quantity })
      .from(distributionItems)
      .innerJoin(distributions, and(eq(distributions.id, distributionItems.distributionId), eq(distributions.organizationId, distributionItems.organizationId)))
      .innerJoin(products, and(eq(products.id, distributionItems.productId), eq(products.organizationId, distributionItems.organizationId)))
      .innerJoin(warehouses, and(eq(warehouses.id, distributions.warehouseId), eq(warehouses.organizationId, distributions.organizationId)))
      .innerJoin(beneficiaries, and(eq(beneficiaries.id, distributions.beneficiaryId), eq(beneficiaries.organizationId, distributions.organizationId)))
      .where(and(eq(distributions.organizationId, organizationId), eq(distributions.status, "completed"), between(distributions.distributedOn, range.from, range.to)))
      .orderBy(asc(distributions.distributedOn), asc(distributions.reference), asc(products.name));
    return [["Référence", "Date", "Relais", "Bénéficiaire (référence)", "Produit", "Quantité", "Unité"], ...rows.map((r) => [r.ref, r.day, r.depot, r.ben ?? "", r.product, Number(r.q).toLocaleString("fr-FR"), r.unit])];
  }
  const rows = await db
    .select({ ref: donations.reference, day: donations.receivedOn, donorType: donors.donorType, product: products.name, unit: products.unit, q: donationItems.quantity })
    .from(donationItems)
    .innerJoin(donations, and(eq(donations.id, donationItems.donationId), eq(donations.organizationId, donationItems.organizationId)))
    .innerJoin(products, and(eq(products.id, donationItems.productId), eq(products.organizationId, donationItems.organizationId)))
    .innerJoin(donors, and(eq(donors.id, donations.donorId), eq(donors.organizationId, donations.organizationId)))
    .where(and(eq(donations.organizationId, organizationId), eq(donations.status, "received"), between(donations.receivedOn, range.from, range.to)))
    .orderBy(asc(donations.receivedOn), asc(donations.reference), asc(products.name));
  return [["Référence", "Date", "Type de donateur", "Produit", "Quantité", "Unité"], ...rows.map((r) => [r.ref ?? "", r.day, donorTypeLabels[r.donorType as keyof typeof donorTypeLabels] ?? r.donorType, r.product, Number(r.q).toLocaleString("fr-FR"), r.unit])];
}
