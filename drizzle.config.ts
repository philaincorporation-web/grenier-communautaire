import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// Charge .env.local / .env comme le fait Next.js.
loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Migrations sur la connexion directe (non poolée) ; l'application utilise DATABASE_URL (poolée).
  dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "" },
  // Le schéma neon_auth appartient à Neon Auth : drizzle-kit ne doit jamais y toucher.
  schemaFilter: ["public"],
  strict: true,
  verbose: true,
});
