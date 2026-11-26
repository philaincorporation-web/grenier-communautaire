import { connection } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/db";
import { userAvatars } from "@/db/schema";
import { isAuthConfigured, getAuth } from "@/lib/auth/server";
import { avatarUrl } from "@/lib/avatar-shared";
import { AvatarEditor } from "./AvatarEditor";
import { SignOutButton } from "./SignOutButton";

/** URL de la photo de profil du compte, ou null (pas de photo, ou base indisponible). */
async function findAvatar(authUserId: string) {
  if (!isDbConfigured) return null;
  try {
    const [row] = await getDb()
      .select({ updatedAt: userAvatars.updatedAt })
      .from(userAvatars)
      .where(eq(userAvatars.authUserId, authUserId))
      .limit(1);
    return row ? avatarUrl(authUserId, row.updatedAt) : null;
  } catch (e) {
    // Ex. migration 0003 pas encore appliquée : on garde les initiales plutôt que de casser la page.
    console.error("[user-card] avatar", e);
    return null;
  }
}

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
  let name = "Compte de démonstration";
  let detail = "Démonstration";
  let avatar: string | null = null;
  if (isAuthConfigured) {
    await connection(); // lecture de session : rendu à la requête uniquement
    const { data: session } = await getAuth().getSession();
    if (!session?.user) return null;
    name = session.user.name || session.user.email;
    detail = session.user.email;
    avatar = await findAvatar(session.user.id);
  }

  return (
    <div className="flex items-center gap-3 border-t border-white/10 px-4 py-4">
      {isAuthConfigured ? (
        <AvatarEditor initials={initials(name)} src={avatar} />
      ) : (
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-bold text-brand">
          {initials(name)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{name}</p>
        <p className="truncate text-xs text-white/60">{detail}</p>
      </div>
      {isAuthConfigured && <SignOutButton />}
    </div>
  );
}
