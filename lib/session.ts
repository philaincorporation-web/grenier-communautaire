import { redirect } from "next/navigation";
import { connection } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { memberships, organizations, users } from "@/db/schema";
import { getAuth } from "@/lib/auth/server";

export type ActiveMembership = {
  organizationId: string;
  organizationName: string;
  membershipId: string;
  role: (typeof memberships.$inferSelect)["role"];
  userId: string;
  userName: string;
  email: string;
  /** Super administrateur de la plateforme (voir requireSuperAdmin). */
  isSuperAdmin: boolean;
};

export class AuthError extends Error {}

/** Session Neon Auth avec e-mail vérifié ; sinon redirection vers la connexion. */
async function requireVerifiedSession() {
  await connection(); // dépend de la requête : jamais prérendu
  const { data: session } = await getAuth().getSession();
  const authUser = session?.user;
  if (!authUser) redirect("/auth/sign-in");
  if (!authUser.emailVerified) {
    redirect(`/auth/sign-in?verify=${encodeURIComponent(authUser.email)}`);
  }
  return authUser;
}

export type SuperAdmin = { userId: string; userName: string; email: string };

/**
 * Super administrateur de la plateforme, ou null. Le statut est lu en base à chaque appel
 * (users.is_super_admin) pour l'utilisateur de la session — jamais depuis le navigateur.
 * Ne redirige pas : à utiliser pour décider d'afficher un écran ou d'autoriser une action.
 */
export async function getSuperAdmin(): Promise<SuperAdmin | null> {
  const authUser = await requireVerifiedSession();
  const [u] = await getDb()
    .select({ userId: users.id, userName: users.fullName, email: users.email })
    .from(users)
    .where(and(eq(users.email, authUser.email.toLowerCase()), eq(users.isActive, true), eq(users.isSuperAdmin, true)))
    .limit(1);
  return u ?? null;
}

/**
 * Résout l'organisation active côté serveur à partir de la session Neon Auth et vérifie
 * une adhésion active. Ne jamais accepter un organization_id venant du navigateur.
 *
 * Le compte Neon Auth est relié à la table `users` par l'e-mail ; ce lien n'est accepté
 * que pour un e-mail vérifié (la vérification à l'inscription est exigée sur la branche).
 */
export async function requireActiveMembership(): Promise<ActiveMembership> {
  const authUser = await requireVerifiedSession();

  const [row] = await getDb()
    .select({
      organizationId: organizations.id,
      organizationName: organizations.name,
      membershipId: memberships.id,
      role: memberships.role,
      userId: users.id,
      userName: users.fullName,
      email: users.email,
      isSuperAdmin: users.isSuperAdmin,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
    .where(
      and(
        eq(users.email, authUser.email.toLowerCase()),
        eq(users.isActive, true),
        eq(memberships.isActive, true),
        eq(organizations.isActive, true),
      ),
    )
    // TODO : sélecteur d'organisation quand un utilisateur appartient à plusieurs organisations.
    .orderBy(memberships.joinedAt)
    .limit(1);

  if (!row) {
    throw new AuthError(
      `Le compte ${authUser.email} n'est rattaché à aucune organisation active. Un administrateur doit vous donner accès (npm run db:grant -- <email>).`,
    );
  }
  return row;
}
