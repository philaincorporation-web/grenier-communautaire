// Le site vitrine représente UNE organisation, résolue côté serveur via ORGANIZATION_SLUG.
// Aucune route publique n'accepte un organization_id venant du navigateur.

import { and, eq } from "drizzle-orm";
import { getDb, type Db } from "@/db";
import { organizations } from "@/db/schema";

export const PUBLIC_ORG_SLUG = process.env.ORGANIZATION_SLUG || "grenier-communautaire";

export async function getPublicOrganizationId(db: Db = getDb()): Promise<string | null> {
  const [org] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(and(eq(organizations.slug, PUBLIC_ORG_SLUG), eq(organizations.isActive, true)))
    .limit(1);
  return org?.id ?? null;
}
