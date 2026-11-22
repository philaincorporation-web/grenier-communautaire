import { connection } from "next/server";
import { isAuthConfigured, getAuth } from "@/lib/auth/server";
import { SignOutButton } from "./SignOutButton";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/** Utilisateur connecté (session Neon Auth). Sans Neon Auth : carte de démonstration. */
export async function UserCard() {
  let name = "Marie Dupont";
  let detail = "Démonstration";
  if (isAuthConfigured) {
    await connection(); // lecture de session : rendu à la requête uniquement
    const { data: session } = await getAuth().getSession();
    if (!session?.user) return null;
    name = session.user.name || session.user.email;
    detail = session.user.email;
  }

  return (
    <div className="flex items-center gap-3 border-t border-white/10 px-4 py-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-bold text-brand">
        {initials(name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{name}</p>
        <p className="truncate text-xs text-white/60">{detail}</p>
      </div>
      {isAuthConfigured && <SignOutButton />}
    </div>
  );
}
