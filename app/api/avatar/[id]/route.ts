import { eq } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/db";
import { userAvatars } from "@/db/schema";
import { getAuth, isAuthConfigured } from "@/lib/auth/server";

/** Photo de profil d'un compte. Réservée aux utilisateurs connectés. */
export async function GET(_req: Request, ctx: RouteContext<"/api/avatar/[id]">) {
  if (!isAuthConfigured || !isDbConfigured) return new Response(null, { status: 404 });
  const { data: session } = await getAuth().getSession();
  if (!session?.user) return new Response(null, { status: 401 });

  const { id } = await ctx.params;
  const [row] = await getDb()
    .select({ mimeType: userAvatars.mimeType, data: userAvatars.data })
    .from(userAvatars)
    .where(eq(userAvatars.authUserId, id))
    .limit(1);
  if (!row) return new Response(null, { status: 404 });

  return new Response(Buffer.from(row.data, "base64"), {
    headers: {
      "Content-Type": row.mimeType,
      // L'URL contient la version (?v=) : le navigateur peut la garder longtemps, en privé.
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
