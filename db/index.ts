import { neon, Pool } from "@neondatabase/serverless";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import { drizzle as drizzleWs } from "drizzle-orm/neon-serverless";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { schema } from "./schema";

/** Type commun aux clients Drizzle PostgreSQL (HTTP, WebSocket, transaction, tests). */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

/** Vrai quand une base est configurée ; sinon l'interface utilise les données de démonstration. */
export const isDbConfigured = Boolean(process.env.DATABASE_URL);

function databaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL n'est pas défini (voir .env.example).");
  return url;
}

function createHttpDb() {
  return drizzleHttp({ client: neon(databaseUrl()), schema });
}

let httpDb: ReturnType<typeof createHttpDb> | undefined;

/**
 * Client HTTP Neon : adapté aux lectures et aux écritures en une seule instruction.
 * Il ne gère PAS les transactions interactives — utiliser `withTransaction` pour cela.
 */
export function getDb() {
  return (httpDb ??= createHttpDb());
}

function createWsDb(pool: Pool) {
  return drizzleWs({ client: pool, schema });
}

export type Tx = Parameters<Parameters<ReturnType<typeof createWsDb>["transaction"]>[0]>[0];

/**
 * Transaction interactive (driver WebSocket Neon). Un pool est ouvert puis fermé à chaque appel :
 * en environnement serverless, un pool ne doit pas survivre à la requête.
 * À utiliser pour toute validation de stock (verrouillage des soldes, mouvement et audit atomiques).
 */
export async function withTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const pool = new Pool({ connectionString: databaseUrl() });
  try {
    return await createWsDb(pool).transaction(fn);
  } finally {
    await pool.end();
  }
}
