import { LoaderCircle } from "lucide-react";

export type AuthErr = { code?: string; message?: string; status?: number } | null | undefined;

/**
 * Convertit une exception du client Neon Auth en erreur lisible.
 * Le client Neon Auth LÈVE une exception pour toute réponse 4xx (mauvais mot de passe, code
 * invalide, e-mail non vérifié…) au lieu de renvoyer `{ error }`. Le code d'erreur d'origine
 * (ex. « INVALID_OTP ») est dans `e.error.code`. Sans statut HTTP, c'est une erreur réseau : null.
 */
function toAuthErr(e: unknown): AuthErr {
  if (!e || typeof e !== "object") return null;
  const x = e as { status?: unknown; code?: unknown; message?: unknown; error?: { status?: unknown; code?: unknown; message?: unknown } };
  const status = typeof x.error?.status === "number" ? x.error.status : typeof x.status === "number" ? x.status : undefined;
  if (status === undefined) return null;
  const code = typeof x.error?.code === "string" ? x.error.code : typeof x.code === "string" ? x.code : undefined;
  const message = typeof x.error?.message === "string" ? x.error.message : typeof x.message === "string" ? x.message : undefined;
  return { code, message, status };
}

/**
 * Appelle une méthode du client Neon Auth et renvoie toujours `{ data, error }`, que la
 * bibliothèque réponde par une valeur ou par une exception. Les erreurs réseau sont relancées.
 */
export async function authCall<T>(call: Promise<{ data?: T | null; error?: unknown }>): Promise<{ data: T | null; error: AuthErr }> {
  try {
    const r = await call;
    return { data: r.data ?? null, error: (r.error as AuthErr) ?? null };
  } catch (e) {
    const error = toAuthErr(e);
    if (!error) throw e;
    return { data: null, error };
  }
}

/** N'accepte qu'un chemin interne (pas de //hôte ni d'URL absolue). */
export function safeRedirect(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\")
    ? value
    : "/tableau-de-bord";
}

export function errorMessage(error: AuthErr) {
  switch (error?.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return "E-mail ou mot de passe incorrect.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "Un compte existe déjà avec cet e-mail. Connectez-vous.";
    case "PASSWORD_TOO_SHORT":
      return "Le mot de passe est trop court (8 caractères minimum).";
    case "PASSWORD_TOO_LONG":
      return "Le mot de passe est trop long.";
    case "INVALID_OTP":
      return "Code invalide. Vérifiez le code reçu par e-mail.";
    case "OTP_EXPIRED":
      return "Ce code a expiré. Demandez-en un nouveau.";
    case "TOO_MANY_ATTEMPTS":
      return "Trop de tentatives. Demandez un nouveau code.";
    case "INVALID_ORIGIN":
      return "Adresse du site non autorisée par le service de connexion. Ouvrez le site via son adresse officielle (ou http://localhost:3000 en développement).";
    case "EMAIL_NOT_VERIFIED":
      return "Votre e-mail n'est pas encore vérifié.";
    case "USER_NOT_FOUND":
      return "Aucun compte n'existe avec cet e-mail.";
    case "CREDENTIAL_ACCOUNT_NOT_FOUND":
      return "Ce compte n'a pas de mot de passe. Utilisez « Mot de passe oublié ? » pour en définir un.";
    case "BANNED_USER":
      return "Ce compte est suspendu. Contactez l'association.";
    default: {
      if (error?.status === 429) return "Trop de tentatives. Réessayez dans quelques minutes.";
      // 503 : la route /api/auth répond ainsi quand NEON_AUTH_BASE_URL / NEON_AUTH_COOKIE_SECRET
      // manquent sur le serveur (le client Neon Auth le traduit en « feature_not_supported »).
      if (error?.status === 503) return "La connexion n'est pas encore disponible sur ce site (service d'authentification non configuré).";
      // Pas de message anglais brut du serveur : un message français générique, avec la
      // référence technique pour pouvoir diagnostiquer.
      if (error) console.error("Erreur d'authentification", error);
      const ref = [error?.code, error?.status].filter(Boolean).join(" / ");
      return `Une erreur est survenue. Réessayez.${ref ? ` (réf. ${ref})` : ""}`;
    }
  }
}

export const inputClass =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

export function SubmitButton({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
    >
      {busy && <LoaderCircle className="size-4 animate-spin" />}
      {children}
    </button>
  );
}
