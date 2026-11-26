"use server";

// Traitement des demandes en ligne (aide, bénévolat, message) par l'équipe : changement de
// statut et réponse au demandeur.
//
// Règles : session + adhésion active obligatoires, rôle de gestion requis, filtrage par
// organization_id résolu côté serveur. Chaque opération est atomique (verrou de ligne), tracée
// dans audit_logs et dans l'historique de la demande (request_events) ; le demandeur est notifié
// dans son espace et par e-mail (après la transaction).

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { withTransaction } from "@/db";
import { auditLogs } from "@/db/schema";
import { requireActiveMembership } from "@/lib/session";
import { canManageOnlineRequests, isStatus, isWorkflowType, type SubmissionStatus } from "@/lib/online-requests-shared";
import { addEvent, addNotification, auditEntity, notifyRequester, requestTables, UUID_RE } from "@/lib/request-events";
import { MESSAGE_MAX } from "@/lib/requester-shared";

export type StatusResult = { ok: true } | { ok: false; message: string };

const DENIED = { ok: false, message: "Vous n'avez pas les droits pour traiter ces demandes." } as const;

function revalidate() {
  revalidatePath("/tableau-de-bord/demandes-en-ligne");
  revalidatePath("/mon-espace", "layout");
}

export async function updateOnlineRequestStatus(type: string, id: string, status: string): Promise<StatusResult> {
  if (!isWorkflowType(type) || !isStatus(status) || !UUID_RE.test(id)) {
    return { ok: false, message: "Demande invalide." };
  }

  const member = await requireActiveMembership();
  if (!canManageOnlineRequests(member.role)) return DENIED;

  const t = requestTables[type];
  const done = status === "processed" || status === "archived";

  const result = await withTransaction(async (tx) => {
    const [current] = await tx
      .select({ status: t.status, email: t.email })
      .from(t)
      .where(and(eq(t.id, id), eq(t.organizationId, member.organizationId)))
      .for("update");
    if (!current) return null;
    if (current.status === status) return { email: null }; // déjà dans cet état : rien à faire

    await tx
      .update(t)
      .set({ status, processedAt: done ? new Date() : null })
      .where(and(eq(t.id, id), eq(t.organizationId, member.organizationId)));
    await tx.insert(auditLogs).values({
      organizationId: member.organizationId,
      actorUserId: member.userId,
      action: "online_request.status_changed",
      entityType: auditEntity[type],
      entityId: id,
      beforeData: { status: current.status },
      afterData: { status },
    });
    const eventId = await addEvent(tx, {
      organizationId: member.organizationId, type, requestId: id, kind: "status", author: "staff",
      authorUserId: member.userId, authorName: member.userName, status,
    });
    if (current.email) await addNotification(tx, { organizationId: member.organizationId, email: current.email, eventId, type, requestId: id });
    return { email: current.email };
  });

  if (!result) return { ok: false, message: "Cette demande est introuvable." };
  if (result.email) await notifyRequester(result.email, type, id, { kind: "status", status: status as SubmissionStatus });
  revalidate();
  return { ok: true };
}

/**
 * Réponse de l'équipe au demandeur. Répondre à une nouvelle demande la passe « En cours ».
 * Sans e-mail sur la demande (demande d'aide déposée avec un téléphone seulement), la réponse
 * reste visible dans l'historique et le demandeur la verra s'il rattache la demande à son compte.
 */
export async function replyToOnlineRequest(type: string, id: string, body: string): Promise<StatusResult> {
  const text = typeof body === "string" ? body.trim() : "";
  if (!isWorkflowType(type) || !UUID_RE.test(id)) return { ok: false, message: "Demande invalide." };
  if (!text) return { ok: false, message: "Le message est vide." };
  if (text.length > MESSAGE_MAX) return { ok: false, message: `Le message est trop long (${MESSAGE_MAX} caractères maximum).` };

  const member = await requireActiveMembership();
  if (!canManageOnlineRequests(member.role)) return DENIED;
  const t = requestTables[type];

  const result = await withTransaction(async (tx) => {
    const [current] = await tx
      .select({ status: t.status, email: t.email })
      .from(t)
      .where(and(eq(t.id, id), eq(t.organizationId, member.organizationId)))
      .for("update");
    if (!current) return null;

    const author = { organizationId: member.organizationId, type, requestId: id, author: "staff" as const, authorUserId: member.userId, authorName: member.userName };
    if (current.status === "new") {
      await tx.update(t).set({ status: "in_progress", processedAt: null }).where(and(eq(t.id, id), eq(t.organizationId, member.organizationId)));
      await addEvent(tx, { ...author, kind: "status", status: "in_progress" });
    }
    const eventId = await addEvent(tx, { ...author, kind: "message", body: text });
    await tx.insert(auditLogs).values({
      organizationId: member.organizationId,
      actorUserId: member.userId,
      action: "online_request.replied",
      entityType: auditEntity[type],
      entityId: id,
      afterData: { eventId, length: text.length },
    });
    if (current.email) await addNotification(tx, { organizationId: member.organizationId, email: current.email, eventId, type, requestId: id });
    return { email: current.email };
  });

  if (!result) return { ok: false, message: "Cette demande est introuvable." };
  if (result.email) await notifyRequester(result.email, type, id, { kind: "message" });
  revalidate();
  return { ok: true };
}
