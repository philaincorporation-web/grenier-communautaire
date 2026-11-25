// Numérotation des références métier (DON-0001, DEM-0001, BEN-0001…), commune aux modules.

import { eq, sql, type SQL } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import type { Tx } from "@/db";

/**
 * Prochaine référence `PREFIX-0001` d'une organisation. À appeler DANS une transaction :
 * un verrou consultatif empêche deux créations simultanées d'obtenir le même numéro.
 */
export async function nextReference(
  tx: Tx,
  opts: { organizationId: string; prefix: string; table: PgTable; referenceColumn: PgColumn; organizationColumn: PgColumn },
): Promise<string> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`ref:${opts.prefix}:${opts.organizationId}`}))`);
  const pattern = `^${opts.prefix}-([0-9]+)$`;
  const expr: SQL<number> = sql`coalesce(max((substring(${opts.referenceColumn} from ${pattern}))::int), 0) + 1`.mapWith(Number);
  const [{ next }] = await tx.select({ next: expr }).from(opts.table).where(eq(opts.organizationColumn, opts.organizationId));
  return `${opts.prefix}-${String(next).padStart(4, "0")}`;
}

/** Échappe %, _ et \ pour une recherche ILIKE littérale. */
export const likePattern = (q: string) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

/** Page demandée dans l'URL, bornée (1 à 1000). */
export const pageParam = (v: unknown) => Math.max(1, Math.min(1000, Number.parseInt(typeof v === "string" ? v : "1", 10) || 1));
