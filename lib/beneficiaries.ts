// Lectures du module Bénéficiaires. Chaque requête est filtrée par organization_id, résolu
// côté serveur par requireActiveMembership(). Les coordonnées et notes ne sont lues que si le
// rôle de la personne connectée y donne droit (`withContact`).

import { and, asc, count, desc, eq, ilike, max, or, sql } from "drizzle-orm";
import { getDb, type Db } from "@/db";
import { aidRequests, beneficiaries, distributionItems, distributions } from "@/db/schema";
import type { BeneficiaryType } from "@/lib/beneficiaries-shared";
import type { DistributionStatus } from "@/lib/distributions-shared";
import { UUID_RE } from "@/lib/distributions";

export const PAGE_SIZE = 20;
export type ActiveFilter = "actifs" | "inactifs" | "tous";

/** Échappe %, _ et \ pour une recherche ILIKE littérale. */
const likePattern = (q: string) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

export type BeneficiaryRow = {
  id: string;
  reference: string | null;
  name: string;
  type: BeneficiaryType;
  householdSize: number | null;
  phone: string | null;
  isActive: boolean;
  distributions: number;
  lastDistribution: string | null;
};

export async function listBeneficiaries(
  organizationId: string,
  opts: { q: string; active: ActiveFilter; page: number; withContact: boolean },
  db: Db = getDb(),
): Promise<{ rows: BeneficiaryRow[]; total: number; counts: { actifs: number; inactifs: number } }> {
  const q = opts.q.trim().slice(0, 100);
  const search = q
    ? or(
        ilike(beneficiaries.displayName, likePattern(q)),
        ilike(beneficiaries.reference, likePattern(q)),
        // Chercher par téléphone révélerait à qui appartient un numéro : réservé à qui peut le voir.
        opts.withContact ? ilike(beneficiaries.phone, likePattern(q)) : undefined,
      )
    : undefined;
  const where = and(
    eq(beneficiaries.organizationId, organizationId),
    opts.active === "tous" ? undefined : eq(beneficiaries.isActive, opts.active === "actifs"),
    search,
  );

  // Distributions effectuées par bénéficiaire (nombre et date de la dernière).
  const done = db
    .select({
      beneficiaryId: distributions.beneficiaryId,
      n: count().as("n"),
      last: max(distributions.distributedOn).as("last"),
    })
    .from(distributions)
    .where(and(eq(distributions.organizationId, organizationId), eq(distributions.status, "completed")))
    .groupBy(distributions.beneficiaryId)
    .as("done");

  const [rows, [total], byActive] = await Promise.all([
    db
      .select({
        id: beneficiaries.id,
        reference: beneficiaries.reference,
        name: beneficiaries.displayName,
        type: beneficiaries.beneficiaryType,
        householdSize: beneficiaries.householdSize,
        phone: beneficiaries.phone,
        isActive: beneficiaries.isActive,
        distributions: sql`coalesce(${done.n}, 0)`.mapWith(Number),
        lastDistribution: done.last,
      })
      .from(beneficiaries)
      .leftJoin(done, eq(done.beneficiaryId, beneficiaries.id))
      .where(where)
      .orderBy(desc(beneficiaries.isActive), asc(beneficiaries.displayName))
      .limit(PAGE_SIZE)
      .offset((opts.page - 1) * PAGE_SIZE),
    db.select({ n: count() }).from(beneficiaries).where(where),
    db
      .select({ isActive: beneficiaries.isActive, n: count() })
      .from(beneficiaries)
      .where(and(eq(beneficiaries.organizationId, organizationId), search))
      .groupBy(beneficiaries.isActive),
  ]);

  return {
    total: total.n,
    counts: { actifs: byActive.find((b) => b.isActive)?.n ?? 0, inactifs: byActive.find((b) => !b.isActive)?.n ?? 0 },
    rows: rows.map((r) => ({
      ...r,
      type: r.type as BeneficiaryType,
      phone: opts.withContact ? r.phone : null,
      lastDistribution: r.lastDistribution ?? null,
    })),
  };
}

// ---------------------------------------------------------------------------
// Fiche

export type BeneficiaryDetail = {
  id: string;
  reference: string | null;
  name: string;
  type: BeneficiaryType;
  householdSize: number | null;
  isActive: boolean;
  createdAt: string;
  /** null quand le rôle ne permet pas de voir les coordonnées. */
  contact: { phone: string | null; email: string | null; address: string | null; notes: string | null } | null;
  aidRequests: { id: string; reference: string; requestedOn: string; status: string }[];
  distributions: { id: string; reference: string; distributedOn: string; status: DistributionStatus; lines: number }[];
};

export async function getBeneficiary(
  organizationId: string,
  id: string,
  withContact: boolean,
  db: Db = getDb(),
): Promise<BeneficiaryDetail | null> {
  if (!UUID_RE.test(id)) return null;
  const [b] = await db
    .select()
    .from(beneficiaries)
    .where(and(eq(beneficiaries.id, id), eq(beneficiaries.organizationId, organizationId)))
    .limit(1);
  if (!b) return null;

  const lineCount = db
    .select({ distributionId: distributionItems.distributionId, n: count().as("n") })
    .from(distributionItems)
    .where(eq(distributionItems.organizationId, organizationId))
    .groupBy(distributionItems.distributionId)
    .as("line_count");

  const [reqs, dists] = await Promise.all([
    db
      .select({ id: aidRequests.id, reference: aidRequests.reference, requestedOn: aidRequests.requestedOn, status: aidRequests.status })
      .from(aidRequests)
      .where(and(eq(aidRequests.organizationId, organizationId), eq(aidRequests.beneficiaryId, id)))
      .orderBy(desc(aidRequests.requestedOn))
      .limit(50),
    db
      .select({
        id: distributions.id,
        reference: distributions.reference,
        distributedOn: distributions.distributedOn,
        status: distributions.status,
        lines: sql`coalesce(${lineCount.n}, 0)`.mapWith(Number),
      })
      .from(distributions)
      .leftJoin(lineCount, eq(lineCount.distributionId, distributions.id))
      .where(and(eq(distributions.organizationId, organizationId), eq(distributions.beneficiaryId, id)))
      .orderBy(desc(distributions.distributedOn), desc(distributions.createdAt))
      .limit(50),
  ]);

  return {
    id: b.id,
    reference: b.reference,
    name: b.displayName,
    type: b.beneficiaryType as BeneficiaryType,
    householdSize: b.householdSize,
    isActive: b.isActive,
    createdAt: b.createdAt.toISOString(),
    contact: withContact ? { phone: b.phone, email: b.email, address: b.address, notes: b.notes } : null,
    aidRequests: reqs,
    distributions: dists,
  };
}
