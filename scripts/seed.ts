/**
 * Charge le jeu de démonstration dans la base DATABASE_URL — `npm run db:seed`.
 * Tout est écrit dans une seule transaction ; rien n'est fait si l'organisation existe déjà.
 */
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  // Import après le chargement de l'environnement : db/index.ts lit DATABASE_URL.
  const { withTransaction } = await import("../db");
  const { seedDemo, ORG_SLUG } = await import("../db/seed-demo");

  const created = await withTransaction((tx) => seedDemo(tx));
  console.log(
    created
      ? `Organisation « ${ORG_SLUG} » créée avec les données de démonstration.`
      : `L'organisation « ${ORG_SLUG} » existe déjà — rien à faire.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
