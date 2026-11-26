"use server";

// Abonnement de l'appareil courant aux notifications push. Le compte vient de la session
// (e-mail vérifié) ; le navigateur ne fournit que l'abonnement technique, revalidé ici.

import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { pushToEmails } from "@/lib/push";
import { requireRequester } from "@/lib/session";

type Sub = { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };

const isB64Url = (v: unknown, max: number): v is string => typeof v === "string" && v.length > 0 && v.length <= max && /^[A-Za-z0-9_-]+=*$/.test(v);

export async function subscribePush(sub: Sub): Promise<{ ok: boolean; message?: string }> {
  const endpoint = typeof sub?.endpoint === "string" ? sub.endpoint : "";
  let url: URL | null = null;
  try {
    url = new URL(endpoint);
  } catch {}
  // Un service push légitime est toujours en HTTPS.
  if (!url || url.protocol !== "https:" || endpoint.length > 1000 || !isB64Url(sub.keys?.p256dh, 200) || !isB64Url(sub.keys?.auth, 100)) {
    return { ok: false, message: "Abonnement invalide." };
  }
  const me = await requireRequester();
  const userAgent = (await headers()).get("user-agent")?.slice(0, 300) ?? null;
  const values = { authUserId: me.authUserId, email: me.email, endpoint, p256dh: sub.keys!.p256dh as string, auth: sub.keys!.auth as string, userAgent };
  await getDb()
    .insert(pushSubscriptions)
    .values(values)
    .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: values }); // l'appareil change de compte
  return { ok: true };
}

export async function unsubscribePush(endpoint: string): Promise<void> {
  if (typeof endpoint !== "string" || !endpoint) return;
  const me = await requireRequester();
  await getDb()
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.endpoint, endpoint), eq(pushSubscriptions.authUserId, me.authUserId)));
}

/** Notification d'essai envoyée aux appareils du compte connecté. */
export async function sendTestPush(): Promise<void> {
  const me = await requireRequester();
  await pushToEmails([me.email], {
    title: "Notifications activées",
    body: "Vous serez prévenu ici des réponses et des changements de statut.",
    url: "/demarrer",
    tag: "test",
  });
}
