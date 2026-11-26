// Notifications push (PWA) avec web-push et des clés VAPID.
//
// Configuration (variables d'environnement) :
//   NEXT_PUBLIC_VAPID_PUBLIC_KEY  clé publique (aussi lue par le navigateur pour s'abonner)
//   VAPID_PRIVATE_KEY             clé privée — secrète, serveur uniquement
//   VAPID_SUBJECT                 contact de l'émetteur, ex. mailto:contact@greniercommunautaire.org
// Générer une paire : node -e "console.log(require('web-push').generateVAPIDKeys())"
//
// Comme pour l'e-mail, un échec d'envoi n'interrompt jamais l'action d'origine. Le contenu reste
// générique (aucun détail sensible de la demande) : il s'affiche sur l'écran verrouillé.

import * as webpush from "web-push";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { memberships, organizations, pushSubscriptions, users } from "@/db/schema";
import { ONLINE_REQUESTS_ROLES } from "@/lib/online-requests-shared";

export const isPushConfigured = Boolean(
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT,
);

let configured = false;
function setup() {
  if (!configured) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT!, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
    configured = true;
  }
}

export type PushPayload = {
  title: string;
  body: string;
  /** Page du site à ouvrir au clic (chemin, jamais une URL externe). */
  url: string;
  /** Regroupe les notifications d'un même sujet : la plus récente remplace la précédente. */
  tag?: string;
};

/** Envoie une notification à tous les appareils des comptes indiqués (par e-mail). */
export async function pushToEmails(emails: string[], payload: PushPayload) {
  const list = [...new Set(emails.map((e) => e.toLowerCase()))];
  if (!isPushConfigured || !list.length) return;
  setup();
  try {
    const db = getDb();
    const subs = await db.select().from(pushSubscriptions).where(inArray(pushSubscriptions.email, list));
    const gone: string[] = [];
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify(payload),
            { TTL: 60 * 60 * 24, urgency: "normal", timeout: 10_000 },
          );
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) gone.push(s.id); // abonnement expiré ou retiré
          else console.error("[push] envoi refusé", status ?? e);
        }
      }),
    );
    if (gone.length) await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.id, gone));
  } catch (e) {
    console.error("[push] envoi impossible", e);
  }
}

/** E-mails des membres de l'organisation qui traitent les demandes en ligne. */
export async function staffEmails(organizationId: string): Promise<string[]> {
  const rows = await getDb()
    .select({ email: users.email })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
    .where(
      and(
        eq(memberships.organizationId, organizationId),
        eq(memberships.isActive, true),
        eq(users.isActive, true),
        eq(organizations.isActive, true),
        inArray(memberships.role, [...ONLINE_REQUESTS_ROLES]),
      ),
    );
  return rows.map((r) => r.email);
}

/** Prévient l'équipe de gestion (nouvelle demande, message d'un demandeur). */
export async function pushToStaff(organizationId: string, payload: PushPayload) {
  if (!isPushConfigured) return;
  try {
    await pushToEmails(await staffEmails(organizationId), payload);
  } catch (e) {
    console.error("[push] équipe", e);
  }
}
