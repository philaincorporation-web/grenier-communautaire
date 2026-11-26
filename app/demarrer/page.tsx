import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { BrandLoader } from "@/components/loading/BrandLoader";
import { isDbConfigured } from "@/db";
import { getAuth, isAuthConfigured } from "@/lib/auth/server";
import { hasActiveMembership } from "@/lib/session";

export const metadata: Metadata = { title: "Ouverture", robots: { index: false } };

/**
 * Oriente selon le compte : membres de l'équipe → tableau de bord, demandeurs → Mon espace,
 * visiteur non connecté → connexion. Le logo animé s'affiche pendant la vérification.
 */
async function Destination(): Promise<never> {
  if (!isAuthConfigured) redirect("/");
  await connection();
  const { data: session } = await getAuth().getSession();
  const user = session?.user;
  if (!user) redirect("/auth/sign-in?redirectTo=/demarrer");
  if (isDbConfigured && user.emailVerified && (await hasActiveMembership(user.email))) redirect("/tableau-de-bord");
  redirect("/mon-espace");
}

/** Page de démarrage de l'application installée (start_url du manifeste) et d'après connexion. */
export default function StartPage() {
  return (
    <Suspense fallback={<BrandLoader fullScreen label="Ouverture de votre espace…" />}>
      <Destination />
    </Suspense>
  );
}
