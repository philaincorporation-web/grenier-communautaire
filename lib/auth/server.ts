import { createNeonAuth } from "@neon/auth/next/server";

/** Neon Auth (Managed Better Auth) est configuré quand `neon deploy` a écrit ses variables. */
export const isAuthConfigured = Boolean(process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_COOKIE_SECRET);

function createAuth() {
  return createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL!,
    cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
  });
}

let instance: ReturnType<typeof createAuth> | undefined;

/** Instance serveur Neon Auth, créée à la première utilisation (l'app démarre sans configuration). */
export function getAuth() {
  if (!isAuthConfigured) {
    throw new Error("Neon Auth n'est pas configuré : NEON_AUTH_BASE_URL et NEON_AUTH_COOKIE_SECRET sont requis.");
  }
  return (instance ??= createAuth());
}
