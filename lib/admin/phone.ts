// Comparaison de numéros de téléphone pour détecter les doublons.
// On compare les 8 derniers chiffres (longueur d'un numéro gabonais) : « +241 06 99 88 77 »,
// « 06 99 88 77 » et « 06-99-88-77 » désignent alors le même numéro.

import { sql, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

export const PHONE_KEY_LENGTH = 8;

/** Clé de comparaison côté JavaScript (chaîne vide si trop courte pour être fiable). */
export function phoneKey(phone: string | null | undefined): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.length >= 6 ? digits.slice(-PHONE_KEY_LENGTH) : "";
}

/** Même clé, calculée par PostgreSQL sur une colonne. */
export const phoneKeySql = (column: PgColumn): SQL<string> =>
  sql`right(regexp_replace(coalesce(${column}, ''), '[^0-9]', '', 'g'), ${PHONE_KEY_LENGTH})`;
