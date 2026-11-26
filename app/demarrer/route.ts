import { NextResponse } from "next/server";
import { isDbConfigured } from "@/db";
import { getAuth, isAuthConfigured } from "@/lib/auth/server";
import { hasActiveMembership } from "@/lib/session";

/**
 * Page de démarrage de l'application installée : membres de l'équipe → tableau de bord,
 * demandeurs → Mon espace, visiteur non connecté → connexion (le proxy s'en charge).
 */
export async function GET(request: Request) {
  const to = (path: string) => NextResponse.redirect(new URL(path, request.url));
  if (!isAuthConfigured) return to("/");
  const { data: session } = await getAuth().getSession();
  const user = session?.user;
  if (!user) return to("/auth/sign-in?redirectTo=/demarrer");
  if (isDbConfigured && user.emailVerified && (await hasActiveMembership(user.email))) return to("/tableau-de-bord");
  return to("/mon-espace");
}
