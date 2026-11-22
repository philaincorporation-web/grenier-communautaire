import { NextResponse } from "next/server";
import { getAuth, isAuthConfigured } from "@/lib/auth/server";
import { publicRoutes } from "@/lib/site-content";

// Le site vitrine (accueil, à propos, actions, dons, événements…) est public ; chaque entrée
// couvre aussi ses sous-pages (/nos-actions → /nos-actions/le-grenier). Tout le reste, dont
// /tableau-de-bord, exige une session. /api/auth et /auth/* sont publics par défaut côté Neon Auth.
// Sans Neon Auth configuré (mode démonstration), rien n'est bloqué.
export default isAuthConfigured
  ? getAuth().middleware({ loginUrl: "/auth/sign-in", publicRoutes })
  : () => NextResponse.next();

export const config = {
  // Fichiers publics servis sans session : ressources Next, icônes d'onglet (app/icon.png, app/apple-icon.png), images.
  matcher: ["/((?!_next/static|_next/image|icon.png|apple-icon.png|favicon.ico|images/).*)"],
};
