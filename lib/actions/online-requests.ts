"use server";

// Changement de statut d'une demande en ligne (aide, bénévolat, message).
//
// Règles : session + adhésion active obligatoires, rôle de gestion requis, filtrage par
// organization_id résolu côté serveur. Le changement est atomique (verrou de ligne), idempotent
// (rejouer le même statut ne fait rien) et tracé dans audit_logs.

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { withTransaction } from "@/db";
import { auditLogs, contactMessages, publicAidRequests, volunteerApplications } from "@/db/schema";
import { requireActiveMembership } from "@/lib/session";
import { canManageOnlineRequests, isStatus, isWorkflowType } from "@/lib/online-requests-shared";

export type StatusResult = { ok: true } | { ok: false; message: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Les trois tables ont les mêmes colonnes id / organizationId / status / processedAt.
const tables = {
  aide: { table: publicAidRequests, entity: "public_aid_request" },
  benevoles: { table: volunteerApplications as unknown as typeof publicAidRequests, entity: "volunteer_application" },
  messages: { table: contactMessages as unknown as typeof publicAidRequests, entity: "contact_message" },
} as const;

export async function updateOnlineRequestStatus(type: string, id: string, status: string): Promise<StatusResult> {
  if (!isWorkflowType(type) || !isStatus(status) || !UUID_RE.test(id)) {
    return { ok: false, message: "Demande invalide." };
  }

  const member = await requireActiveMembership();
  if (!canManageOnlineRequests(member.role)) {
    return { ok: false, message: "Vous n'avez pas les droits pour traiter ces demandes." };
  }

  const { table: t, entity } = tables[type];
  const done = status === "processed" || status === "archived";

  const found = await withTransaction(async (tx) => {
    const [current] = await tx
      .select({ status: t.status })
      .from(t)
      .where(and(eq(t.id, id), eq(t.organizationId, member.organizationId)))
      .for("update");
    if (!current) return false;
    if (current.status === status) return true; // déjà dans cet état : rien à faire

    await tx
      .update(t)
      .set({ status, processedAt: done ? new Date() : null })
      .where(and(eq(t.id, id), eq(t.organizationId, member.organizationId)));
    await tx.insert(auditLogs).values({
      organizationId: member.organizationId,
      actorUserId: member.userId,
      action: "online_request.status_changed",
      entityType: entity,
      entityId: id,
      beforeData: { status: current.status },
      afterData: { status },
    });
    return true;
  });

  if (!found) return { ok: false, message: "Cette demande est introuvable." };
  revalidatePath("/tableau-de-bord/demandes-en-ligne");
  return { ok: true };
}
