"use server";

// Actions de « Mon espace ». Le demandeur est identifié par la session (e-mail vérifié) ; il
// n'agit que sur les demandes déposées avec cet e-mail. Rien ne vient du navigateur sauf
// le type, l'identifiant de la demande et le texte, tous revalidés ici.

import { revalidatePath } from "next/cache";
import { and, count, eq, gte, isNull, sql } from "drizzle-orm";
import { getDb, withTransaction } from "@/db";
import { publicAidRequests, requestEvents, requesterNotifications } from "@/db/schema";
import { requireRequester } from "@/lib/session";
import { isWorkflowType } from "@/lib/online-requests-shared";
import { addEvent, requestTables, UUID_RE } from "@/lib/request-events";
import { MESSAGE_MAX, REQUESTER_MESSAGES_PER_HOUR, requestHref } from "@/lib/requester-shared";

export type RequesterResult = { ok: boolean; message: string; href?: string };

export async function sendRequesterMessage(type: string, id: string, body: string): Promise<RequesterResult> {
  const text = typeof body === "string" ? body.trim() : "";
  if (!isWorkflowType(type) || !UUID_RE.test(id)) return { ok: false, message: "Demande invalide." };
  if (!text) return { ok: false, message: "Votre message est vide." };
  if (text.length > MESSAGE_MAX) return { ok: false, message: `Votre message est trop long (${MESSAGE_MAX} caractères maximum).` };

  const me = await requireRequester();
  const db = getDb();

  const [recent] = await db
    .select({ n: count() })
    .from(requestEvents)
    .where(and(eq(requestEvents.authorAuthUserId, me.authUserId), gte(requestEvents.createdAt, sql`now() - interval '1 hour'`)));
  if (recent.n >= REQUESTER_MESSAGES_PER_HOUR) {
    return { ok: false, message: "Vous avez envoyé beaucoup de messages en peu de temps. Réessayez dans une heure." };
  }

  const t = requestTables[type];
  try {
    const ok = await withTransaction(async (tx) => {
      const [req] = await tx
        .select({ organizationId: t.organizationId })
        .from(t)
        .where(and(eq(t.id, id), eq(sql`lower(${t.email})`, me.email)))
        .limit(1);
      if (!req) return false;
      await addEvent(tx, {
        organizationId: req.organizationId, type, requestId: id, kind: "message", author: "requester",
        authorAuthUserId: me.authUserId, authorName: me.name, body: text,
      });
      return true;
    });
    if (!ok) return { ok: false, message: "Cette demande est introuvable." };
  } catch (e) {
    console.error("[requester] message", e);
    return { ok: false, message: "Votre message n'a pas pu être envoyé. Réessayez." };
  }
  revalidatePath(requestHref(type, id));
  revalidatePath("/tableau-de-bord/demandes-en-ligne");
  return { ok: true, message: "Message envoyé à l'équipe." };
}

/** Marque comme lues les notifications d'une demande (à l'ouverture de son fil). */
export async function markRequestRead(type: string, id: string): Promise<void> {
  if (!isWorkflowType(type) || !UUID_RE.test(id)) return;
  const me = await requireRequester();
  const updated = await getDb()
    .update(requesterNotifications)
    .set({ readAt: new Date() })
    .where(and(eq(requesterNotifications.email, me.email), eq(requesterNotifications.requestType, type), eq(requesterNotifications.requestId, id), isNull(requesterNotifications.readAt)))
    .returning({ id: requesterNotifications.id });
  if (updated.length) revalidatePath("/mon-espace", "layout");
}

export async function markAllNotificationsRead(): Promise<void> {
  const me = await requireRequester();
  await getDb()
    .update(requesterNotifications)
    .set({ readAt: new Date() })
    .where(and(eq(requesterNotifications.email, me.email), isNull(requesterNotifications.readAt)));
  revalidatePath("/mon-espace", "layout");
}

/** Chiffres seuls, en gardant les 9 derniers (+33 6 12… et 06 12… donnent la même chose). */
const phoneKey = (v: string) => v.replace(/\D/g, "").slice(-9);

/**
 * Rattache au compte une demande d'aide déposée SANS e-mail, sur preuve de la référence et du
 * téléphone indiqués lors du dépôt. Une demande qui a déjà un e-mail n'est jamais rattachable.
 */
export async function claimAidRequest(_: RequesterResult | null, data: FormData): Promise<RequesterResult> {
  const reference = String(data.get("reference") ?? "").trim().toUpperCase();
  const phone = phoneKey(String(data.get("phone") ?? ""));
  if (!/^DA-\d{4}-[A-Z0-9]{6}$/.test(reference) || phone.length < 6) {
    return { ok: false, message: "Vérifiez la référence (ex. DA-2026-AB12CD) et le téléphone." };
  }
  const me = await requireRequester();
  const NOT_FOUND = { ok: false, message: "Aucune demande ne correspond à cette référence et ce téléphone, ou elle est déjà rattachée à un compte." };

  try {
    const claimed = await withTransaction(async (tx) => {
      const [r] = await tx
        .select({ id: publicAidRequests.id, phone: publicAidRequests.phone })
        .from(publicAidRequests)
        .where(and(eq(publicAidRequests.reference, reference), isNull(publicAidRequests.email)))
        .for("update");
      if (!r || phoneKey(r.phone) !== phone) return null;
      await tx.update(publicAidRequests).set({ email: me.email }).where(eq(publicAidRequests.id, r.id));
      return r.id;
    });
    if (!claimed) return NOT_FOUND;
    revalidatePath("/mon-espace", "layout");
    return { ok: true, message: "La demande a été ajoutée à votre espace.", href: requestHref("aide", claimed) };
  } catch (e) {
    console.error("[requester] claim", e);
    return { ok: false, message: "L'opération n'a pas pu aboutir. Réessayez." };
  }
}
