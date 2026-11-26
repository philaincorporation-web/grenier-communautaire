import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight, UserRound } from "lucide-react";
import { getAuth, isAuthConfigured } from "@/lib/auth/server";
import { SwitchAccountButton } from "./SwitchAccountButton";

/**
 * Page de connexion / inscription : si une session est déjà ouverte, on ne renvoie pas
 * automatiquement vers le tableau de bord ; on affiche le compte connecté et on laisse choisir
 * entre entrer dans l'espace membre et changer de compte. Sinon, on affiche le formulaire.
 */
export async function SignedInGate({ children }: { children: React.ReactNode }) {
  if (!isAuthConfigured) return children;
  await connection(); // lecture de session : rendu à la requête uniquement
  const { data: session } = await getAuth().getSession();
  const user = session?.user;
  if (!user?.emailVerified) return children;

  return (
    <div className="w-full max-w-sm rounded-2xl border border-line bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-extrabold">Espace membre</h1>
      <p className="mt-1 text-sm text-muted">Vous êtes déjà connecté.</p>

      <div className="mt-6 flex items-center gap-3 rounded-xl bg-surface p-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
          <UserRound className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold">{user.name || user.email}</p>
          <p className="truncate text-sm text-muted">{user.email}</p>
        </div>
      </div>

      <Link
        href="/demarrer"
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
      >
        Accéder à l&apos;espace membre <ArrowRight className="size-4" />
      </Link>
      <SwitchAccountButton />
    </div>
  );
}
