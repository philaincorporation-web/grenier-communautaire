// Lectures du module Demandes d'aide (filtrées par organization_id, résolu côté serveur).

import { and, asc, count, desc, eq, ilike, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { getDb, type Db } from "@/db";
import {
  aidRequestItems,
  aidRequests,
  beneficiaries,
  distributions,
  memberships,
  productCategories,
  products,
  publicAidRequests,
  users,
} from "@/db/schema";
import { likePattern } from "@/lib/admin/refs";
import { phoneKey, phoneKeySql } from "@/lib/admin/phone";
import { aidViews, type AidStatus, type AidView } from "@/lib/aid-requests-shared";
import type { DistributionStatus } from "@/lib/distributions-shared";
import { UUID_RE } from "@/lib/distributions";

export const PAGE_SIZE = 20;

export type AidRow = {
  id: string;
  reference: string;
  status: AidStatus;
  requestedOn: string;
  beneficiary: string;
  beneficiaryReference: string | null;
  lines: number;
};

export async function listAidRequests(
  organizationId: string,
  opts: { view: AidView; q: string; page: number },
  db: Db = getDb(),
): Promise<{ rows: AidRow[]; total: number; counts: Record<AidView, number> }> {
  const q = opts.q.trim().slice(0, 100);
  const search = q
    ? or(ilike(aidRequests.reference, likePattern(q)), ilike(beneficiaries.displayName, likePattern(q)), ilike(beneficiaries.reference, likePattern(q)))
    : undefined;
  const statuses = aidViews[opts.view].statuses;
  const where = and(eq(aidRequests.organizationId, organizationId), statuses.length ? inArray(aidRequests.status, statuses) : undefined, search);
  const join = and(eq(beneficiaries.id, aidRequests.beneficiaryId), eq(beneficiaries.organizationId, aidRequests.organizationId));
  const lineCount = db
    .select({ id: aidRequestItems.aidRequestId, n: count().as("n") })
    .from(aidRequestItems)
    .where(eq(aidRequestItems.organizationId, organizationId))
    .groupBy(aidRequestItems.aidRequestId)
    .as("lc");

  const [rows, [total], byStatus] = await Promise.all([
    db
      .select({
        id: aidRequests.id,
        reference: aidRequests.reference,
        status: aidRequests.status,
        requestedOn: aidRequests.requestedOn,
        beneficiary: beneficiaries.displayName,
        beneficiaryReference: beneficiaries.reference,
        lines: sql`coalesce(${lineCount.n}, 0)`.mapWith(Number),
      })
      .from(aidRequests)
      .innerJoin(beneficiaries, join)
      .leftJoin(lineCount, eq(lineCount.id, aidRequests.id))
      .where(where)
      // Les demandes à traiter les plus anciennes d'abord ; sinon les plus récentes.
      .orderBy(opts.view === "a-traiter" ? asc(aidRequests.requestedOn) : desc(aidRequests.requestedOn), desc(aidRequests.createdAt))
      .limit(PAGE_SIZE)
      .offset((opts.page - 1) * PAGE_SIZE),
    db.select({ n: count() }).from(aidRequests).innerJoin(beneficiaries, join).where(where),
    db
      .select({ status: aidRequests.status, n: count() })
      .from(aidRequests)
      .innerJoin(beneficiaries, join)
      .where(and(eq(aidRequests.organizationId, organizationId), search))
      .groupBy(aidRequests.status),
  ]);

  const counts = {} as Record<AidView, number>;
  for (const [view, def] of Object.entries(aidViews) as [AidView, (typeof aidViews)[AidView]][]) {
    counts[view] = byStatus.filter((s) => def.statuses.length === 0 || def.statuses.includes(s.status)).reduce((a, s) => a + s.n, 0);
  }
  return { rows, total: total.n, counts };
}

export type AidDetail = {
  id: string;
  reference: string;
  status: AidStatus;
  requestedOn: string;
  generalNote: string | null;
  decisionNote: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  beneficiary: { id: string; name: string; reference: string | null; householdSize: number | null };
  items: { productId: string; name: string; unit: string; category: string; requested: number; approved: number | null }[];
  distributions: { id: string; reference: string; status: DistributionStatus; distributedOn: string }[];
};

export async function getAidRequest(organizationId: string, id: string, db: Db = getDb()): Promise<AidDetail | null> {
  if (!UUID_RE.test(id)) return null;
  const [r] = await db
    .select({
      id: aidRequests.id,
      reference: aidRequests.reference,
      status: aidRequests.status,
      requestedOn: aidRequests.requestedOn,
      generalNote: aidRequests.generalNote,
      decisionNote: aidRequests.decisionNote,
      reviewedAt: aidRequests.reviewedAt,
      reviewedBy: users.fullName,
      beneficiaryId: beneficiaries.id,
      beneficiaryName: beneficiaries.displayName,
      beneficiaryReference: beneficiaries.reference,
      householdSize: beneficiaries.householdSize,
    })
    .from(aidRequests)
    .innerJoin(beneficiaries, and(eq(beneficiaries.id, aidRequests.beneficiaryId), eq(beneficiaries.organizationId, aidRequests.organizationId)))
    .leftJoin(memberships, and(eq(memberships.id, aidRequests.reviewedByMembershipId), eq(memberships.organizationId, aidRequests.organizationId)))
    .leftJoin(users, eq(users.id, memberships.userId))
    .where(and(eq(aidRequests.id, id), eq(aidRequests.organizationId, organizationId)))
    .limit(1);
  if (!r) return null;

  const [items, dists] = await Promise.all([
    db
      .select({
        productId: aidRequestItems.productId,
        name: products.name,
        unit: products.unit,
        category: productCategories.name,
        requested: sql`${aidRequestItems.quantityRequested}`.mapWith(Number),
        approved: sql`${aidRequestItems.quantityApproved}`.mapWith((v) => (v === null ? null : Number(v))),
      })
      .from(aidRequestItems)
      .innerJoin(products, and(eq(products.id, aidRequestItems.productId), eq(products.organizationId, aidRequestItems.organizationId)))
      .leftJoin(productCategories, and(eq(productCategories.id, products.categoryId), eq(productCategories.organizationId, products.organizationId)))
      .where(and(eq(aidRequestItems.aidRequestId, id), eq(aidRequestItems.organizationId, organizationId)))
      .orderBy(asc(products.name)),
    db
      .select({ id: distributions.id, reference: distributions.reference, status: distributions.status, distributedOn: distributions.distributedOn })
      .from(distributions)
      .where(and(eq(distributions.organizationId, organizationId), eq(distributions.aidRequestId, id)))
      .orderBy(desc(distributions.createdAt)),
  ]);

  return {
    id: r.id,
    reference: r.reference,
    status: r.status,
    requestedOn: r.requestedOn,
    generalNote: r.generalNote,
    decisionNote: r.decisionNote,
    reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
    reviewedBy: r.reviewedBy,
    beneficiary: { id: r.beneficiaryId, name: r.beneficiaryName, reference: r.beneficiaryReference, householdSize: r.householdSize },
    items: items.map((i) => ({ ...i, category: i.category ?? "Sans catégorie", approved: i.approved as number | null })),
    distributions: dists,
  };
}

export type AidFormOptions = {
  beneficiaries: { id: string; label: string }[];
  products: { id: string; name: string; unit: string; category: string }[];
};

export async function getAidFormOptions(organizationId: string, db: Db = getDb()): Promise<AidFormOptions> {
  const [benefs, prods] = await Promise.all([
    db
      .select({ id: beneficiaries.id, name: beneficiaries.displayName, reference: beneficiaries.reference })
      .from(beneficiaries)
      .where(and(eq(beneficiaries.organizationId, organizationId), eq(beneficiaries.isActive, true)))
      .orderBy(asc(beneficiaries.displayName)),
    db
      .select({ id: products.id, name: products.name, unit: products.unit, category: productCategories.name })
      .from(products)
      .leftJoin(productCategories, and(eq(productCategories.id, products.categoryId), eq(productCategories.organizationId, products.organizationId)))
      .where(and(eq(products.organizationId, organizationId), eq(products.isActive, true)))
      .orderBy(asc(productCategories.name), asc(products.name)),
  ]);
  return {
    beneficiaries: benefs.map((b) => ({ id: b.id, label: b.reference ? `${b.name} (${b.reference})` : b.name })),
    products: prods.map((p) => ({ ...p, category: p.category ?? "Sans catégorie" })),
  };
}

export type OnlinePrefill = {
  id: string;
  reference: string;
  fullName: string;
  phone: string;
  email: string | null;
  address: string | null;
  householdSize: number | null;
  needs: string[];
  message: string | null;
  createdAt: string;
  /** Bénéficiaire actif ayant le même téléphone (doublon probable). */
  match: { id: string; label: string } | null;
};

/** Demande reçue en ligne, pas encore convertie, pour pré-remplir le formulaire. */
export async function getOnlinePrefill(organizationId: string, id: string, db: Db = getDb()): Promise<OnlinePrefill | null> {
  if (!UUID_RE.test(id)) return null;
  const [p] = await db
    .select()
    .from(publicAidRequests)
    .where(and(eq(publicAidRequests.id, id), eq(publicAidRequests.organizationId, organizationId), isNull(publicAidRequests.aidRequestId), ne(publicAidRequests.status, "archived")))
    .limit(1);
  if (!p) return null;
  const key = phoneKey(p.phone);
  const [m] =
    key
      ? await db
          .select({ id: beneficiaries.id, name: beneficiaries.displayName, reference: beneficiaries.reference })
          .from(beneficiaries)
          .where(
            and(
              eq(beneficiaries.organizationId, organizationId),
              eq(beneficiaries.isActive, true),
              eq(phoneKeySql(beneficiaries.phone), key),
            ),
          )
          .limit(1)
      : [];
  return {
    id: p.id,
    reference: p.reference,
    fullName: p.fullName,
    phone: p.phone,
    email: p.email,
    address: p.address,
    householdSize: p.householdSize,
    needs: p.needs,
    message: p.message,
    createdAt: p.createdAt.toISOString(),
    match: m ? { id: m.id, label: m.reference ? `${m.name} (${m.reference})` : m.name } : null,
  };
}
