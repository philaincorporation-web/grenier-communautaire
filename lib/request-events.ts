// Historique des demandes du site public : enregistrement des événements (messages, statuts)
// et notification du demandeur. Utilisé par les actions de l'équipe et du demandeur.

import { contactMessages, publicAidRequests, requestEvents, requesterNotifications, volunteerApplications } from "@/db/schema";
import type { Tx } from "@/db";
import { sendRequesterNotification } from "@/lib/email";
import type { SubmissionStatus, WorkflowType } from "@/lib/online-requests-shared";
import { requestHref, requesterStatusLabels } from "@/lib/requester-shared";

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Les trois tables partagent id / organizationId / email / status / processedAt.
export const requestTables = {
  aide: publicAidRequests,
  benevoles: volunteerApplications as unknown as typeof publicAidRequests,
  messages: contactMessages as unknown as typeof publicAidRequests,
} as const;

export const auditEntity: Record<WorkflowType, string> = {
  aide: "public_aid_request",
  benevoles: "volunteer_application",
  messages: "contact_message",
};

type EventInput = {
  organizationId: string;
  type: WorkflowType;
  requestId: string;
  kind: "message" | "status";
  author: "staff" | "requester";
  authorUserId?: string | null;
  authorAuthUserId?: string | null;
  authorName?: string | null;
  body?: string | null;
  status?: SubmissionStatus | null;
};

/** Ajoute un événement à l'historique d'une demande. */
export async function addEvent(tx: Tx, e: EventInput) {
  const [row] = await tx
    .insert(requestEvents)
    .values({
      organizationId: e.organizationId,
      requestType: e.type,
      requestId: e.requestId,
      kind: e.kind,
      author: e.author,
      authorUserId: e.authorUserId ?? null,
      authorAuthUserId: e.authorAuthUserId ?? null,
      authorName: e.authorName ?? null,
      body: e.body ?? null,
      status: e.status ?? null,
    })
    .returning({ id: requestEvents.id });
  return row.id;
}

/** Crée la notification « site » du demandeur pour un événement de l'équipe. */
export async function addNotification(tx: Tx, p: { organizationId: string; email: string; eventId: string; type: WorkflowType; requestId: string }) {
  await tx.insert(requesterNotifications).values({
    organizationId: p.organizationId,
    email: p.email.toLowerCase(),
    eventId: p.eventId,
    requestType: p.type,
    requestId: p.requestId,
  });
}

/** E-mail envoyé APRÈS la transaction (un échec d'envoi n'annule rien). */
export async function emailRequester(
  email: string,
  type: WorkflowType,
  requestId: string,
  what: { kind: "message" } | { kind: "status"; status: SubmissionStatus },
) {
  const path = requestHref(type, requestId);
  if (what.kind === "message") {
    await sendRequesterNotification(email, "Nouvelle réponse à votre demande", "L'équipe du Grenier Communautaire a répondu à votre demande.", path);
  } else {
    await sendRequesterNotification(
      email,
      "Votre demande a évolué",
      `Le statut de votre demande est maintenant : « ${requesterStatusLabels[what.status]} ».`,
      path,
    );
  }
}
