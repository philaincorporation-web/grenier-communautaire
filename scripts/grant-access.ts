/**
 * Donne accès à l'espace membre : `npm run db:grant -- <email> [role] [nom complet]`
 * Crée (ou réactive) l'utilisateur et son adhésion à l'organisation de démonstration.
 * La personne crée ensuite son compte sur /auth/sign-up avec le même e-mail et le vérifie.
 */
import { loadEnvConfig } from "@next/env";
import { and, eq } from "drizzle-orm";

loadEnvConfig(process.cwd());

const ROLES = ["owner", "admin", "manager", "member", "viewer"] as const;
type Role = (typeof ROLES)[number];

async function main() {
  const [rawEmail, rawRole = "admin", ...nameParts] = process.argv.slice(2);
  const email = rawEmail?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Usage : npm run db:grant -- <email> [owner|admin|manager|member|viewer] [nom complet]");
  }
  if (!ROLES.includes(rawRole as Role)) throw new Error(`Rôle inconnu : ${rawRole}`);
  const role = rawRole as Role;
  const fullName = nameParts.join(" ").trim() || email.split("@")[0];

  const { withTransaction } = await import("../db");
  const s = await import("../db/schema");
  const { ORG_SLUG } = await import("../db/seed-demo");
  const slug = process.env.ORGANIZATION_SLUG || ORG_SLUG;

  const result = await withTransaction(async (tx) => {
    const [org] = await tx.select().from(s.organizations).where(eq(s.organizations.slug, slug));
    if (!org) throw new Error(`Organisation « ${slug} » introuvable. Lancez d'abord npm run db:seed.`);

    await tx.insert(s.users).values({ email, fullName }).onConflictDoNothing({ target: s.users.email });
    const [user] = await tx.select().from(s.users).where(eq(s.users.email, email));
    if (!user.isActive) await tx.update(s.users).set({ isActive: true, updatedAt: new Date() }).where(eq(s.users.id, user.id));

    const [existing] = await tx
      .select()
      .from(s.memberships)
      .where(and(eq(s.memberships.organizationId, org.id), eq(s.memberships.userId, user.id)));
    if (existing) {
      await tx.update(s.memberships).set({ role, isActive: true }).where(eq(s.memberships.id, existing.id));
    } else {
      await tx.insert(s.memberships).values({ organizationId: org.id, userId: user.id, role });
    }

    await tx.insert(s.auditLogs).values({
      organizationId: org.id,
      action: "membership.grant",
      entityType: "user",
      entityId: user.id,
      afterData: { role, source: "scripts/grant-access.ts" },
    });
    return org.name;
  });

  console.log(`Accès ${role} accordé à ${email} dans « ${result} ».`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
