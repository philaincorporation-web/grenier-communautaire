// Verrou des opérations de stock, commun à tous les modules qui écrivent des mouvements
// (dons = entrées, distributions = sorties, annulations = contre-mouvements).

import { sql } from "drizzle-orm";
import type { Tx } from "@/db";

/**
 * Sérialise les opérations de stock d'un même dépôt jusqu'à la fin de la transaction :
 * deux opérations simultanées sur un dépôt s'exécutent l'une après l'autre, ce qui garantit
 * qu'un contrôle de solde reste vrai au moment de l'écriture (stock négatif impossible).
 */
export async function lockWarehouse(tx: Tx, organizationId: string, warehouseId: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`stock:${organizationId}:${warehouseId}`}))`);
}
