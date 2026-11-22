// Chiffres d'impact affichés sur le site public.
//
// Règle : l'organisation n'est JAMAIS fournie par le navigateur. Le site vitrine représente
// une seule organisation, résolue côté serveur via ORGANIZATION_SLUG. Seuls des agrégats
// (aucune donnée nominative) sont exposés, et le résultat est mis en cache une heure.

import { cacheLife } from "next/cache";
import { and, countDistinct, eq, sql } from "drizzle-orm";
import { getPublicOrganizationId } from "@/lib/public-org";
import { getDb, isDbConfigured } from "@/db";
import { distributions, donations, warehouses } from "@/db/schema";

export type PublicStat = { label: string; value: number; icon: "gift" | "truck" | "family" | "warehouse" };

const demoStats: PublicStat[] = [
  { label: "Dons reçus", value: 1280, icon: "gift" },
  { label: "Distributions réalisées", value: 860, icon: "truck" },
  { label: "Familles accompagnées", value: 340, icon: "family" },
  { label: "Dépôts & relais", value: 3, icon: "warehouse" },
];

export async function getPublicStats(): Promise<{ stats: PublicStat[]; demo: boolean }> {
  "use cache";
  cacheLife("hours");

  if (!isDbConfigured) return { stats: demoStats, demo: true };

  try {
    const db = getDb();
    const orgId = await getPublicOrganizationId(db);
    if (!orgId) return { stats: demoStats, demo: true };

    const [[don], [dist], [wh]] = await Promise.all([
      db
        .select({ n: sql`count(*)`.mapWith(Number) })
        .from(donations)
        .where(and(eq(donations.organizationId, orgId), eq(donations.status, "received"))),
      db
        .select({ n: sql`count(*)`.mapWith(Number), families: countDistinct(distributions.beneficiaryId) })
        .from(distributions)
        .where(and(eq(distributions.organizationId, orgId), eq(distributions.status, "completed"))),
      db
        .select({ n: sql`count(*)`.mapWith(Number) })
        .from(warehouses)
        .where(and(eq(warehouses.organizationId, orgId), eq(warehouses.isActive, true))),
    ]);

    return {
      demo: false,
      stats: [
        { label: "Dons reçus", value: don.n, icon: "gift" },
        { label: "Distributions réalisées", value: dist.n, icon: "truck" },
        { label: "Familles accompagnées", value: dist.families, icon: "family" },
        { label: "Dépôts & relais", value: wh.n, icon: "warehouse" },
      ],
    };
  } catch (error) {
    console.error("[public-stats] lecture impossible, repli sur les données de démonstration", error);
    return { stats: demoStats, demo: true };
  }
}
