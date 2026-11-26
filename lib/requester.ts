// Lectures de « Mon espace ». Toutes les requêtes sont filtrées par l'e-mail VÉRIFIÉ du compte
// connecté (lib/session.ts → requireRequester) : un demandeur ne voit que les demandes déposées
// avec son adresse. Jamais d'identifiant de compte ou d'e-mail venant du navigateur.

import { and, asc, count, desc, eq, inArray, isNull, max, sql } from "drizzle-orm";
import { getDb, type Db } from "@/db";
import {
  aidRequests,
  contactMessages,
  publicAidRequests,
  requestEvents,
  requesterNotifications,
  volunteerApplications,
} from "@/db/schema";
import { contactSubjects, volunteerRoles } from "@/lib/site-content";
import type { SubmissionStatus, WorkflowType } from "@/lib/online-requests-shared";
import type { MyRequestRow, NotificationRow, TimelineEvent } from "@/lib/requester-shared";

const iso = (d: Date) => d.toISOString();
const roleLabel = (id: string) => volunteerRoles.find((r) => r.id === id)?.label ?? id;
const subjectLabel = (v: string) => contactSubjects.find((s) => s.value === v)?.label ?? v;
const key = (type: string, id: string) => `${type}:${id}`;

/** Toutes les demandes du demandeur, la plus récemment active en premier. */
export async function listMyRequests(email: string, db: Db = getDb()): Promise<MyRequestRow[]> {
  const [aid, vol, msg] = await Promise.all([
    db
      .select({ id: publicAidRequests.id, reference: publicAidRequests.reference, needs: publicAidRequests.needs, status: publicAidRequests.status, createdAt: publicAidRequests.createdAt })
      .from(publicAidRequests)
      .where(eq(sql`lower(${publicAidRequests.email})`, email)),
    db
      .select({ id: volunteerApplications.id, role: volunteerApplications.role, status: volunteerApplications.status, createdAt: volunteerApplications.createdAt })
      .from(volunteerApplications)
      .where(eq(sql`lower(${volunteerApplications.email})`, email)),
    db
      .select({ id: contactMessages.id, subject: contactMessages.subject, status: contactMessages.status, createdAt: contactMessages.createdAt })
      .from(contactMessages)
      .where(eq(sql`lower(${contactMessages.email})`, email)),
  ]);

  const rows: MyRequestRow[] = [
    ...aid.map((r) => ({ type: "aide" as const, id: r.id, title: r.needs.length ? `Aide : ${r.needs.join(", ")}` : "Demande d'aide", reference: r.reference, status: r.status, createdAt: iso(r.createdAt), lastActivityAt: iso(r.createdAt), unread: 0 })),
    ...vol.map((r) => ({ type: "benevoles" as const, id: r.id, title: `Bénévolat : ${roleLabel(r.role)}`, status: r.status, createdAt: iso(r.createdAt), lastActivityAt: iso(r.createdAt), unread: 0 })),
    ...msg.map((r) => ({ type: "messages" as const, id: r.id, title: `Message : ${subjectLabel(r.subject)}`, status: r.status, createdAt: iso(r.createdAt), lastActivityAt: iso(r.createdAt), unread: 0 })),
  ];
  if (!rows.length) return rows;

  const ids = rows.map((r) => r.id);
  const [activity, unread] = await Promise.all([
    db
      .select({ type: requestEvents.requestType, id: requestEvents.requestId, at: max(requestEvents.createdAt) })
      .from(requestEvents)
      .where(inArray(requestEvents.requestId, ids))
      .groupBy(requestEvents.requestType, requestEvents.requestId),
    db
      .select({ type: requesterNotifications.requestType, id: requesterNotifications.requestId, n: count() })
      .from(requesterNotifications)
      .where(and(eq(requesterNotifications.email, email), isNull(requesterNotifications.readAt), inArray(requesterNotifications.requestId, ids)))
      .groupBy(requesterNotifications.requestType, requesterNotifications.requestId),
  ]);
  const last = new Map(activity.map((a) => [key(a.type, a.id), a.at]));
  const counts = new Map(unread.map((u) => [key(u.type, u.id), u.n]));
  for (const r of rows) {
    const at = last.get(key(r.type, r.id));
    if (at && iso(at) > r.lastActivityAt) r.lastActivityAt = iso(at);
    r.unread = counts.get(key(r.type, r.id)) ?? 0;
  }
  return rows.sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
}

export type MyRequestDetail = {
  type: WorkflowType;
  id: string;
  organizationId: string;
  title: string;
  reference?: string;
  status: SubmissionStatus;
  createdAt: string;
  fields: { label: string; value: string }[];
  message?: string;
  /** Décision de l'équipe sur une demande d'aide instruite (aid_requests.status). */
  decision?: string;
  timeline: TimelineEvent[];
};

/** Une demande du demandeur, avec tout son historique ; null si elle n'est pas à lui. */
export async function getMyRequest(type: WorkflowType, id: string, email: string, db: Db = getDb()): Promise<MyRequestDetail | null> {
  let detail: Omit<MyRequestDetail, "timeline"> | null = null;

  if (type === "aide") {
    const [r] = await db
      .select({ row: publicAidRequests, decision: aidRequests.status })
      .from(publicAidRequests)
      .leftJoin(aidRequests, and(eq(aidRequests.id, publicAidRequests.aidRequestId), eq(aidRequests.organizationId, publicAidRequests.organizationId)))
      .where(and(eq(publicAidRequests.id, id), eq(sql`lower(${publicAidRequests.email})`, email)))
      .limit(1);
    if (r) {
      const x = r.row;
      detail = {
        type, id, organizationId: x.organizationId, title: "Demande d'aide", reference: x.reference, status: x.status, createdAt: iso(x.createdAt),
        fields: [
          { label: "Besoins", value: x.needs.join(", ") || "—" },
          ...(x.householdSize ? [{ label: "Foyer", value: `${x.householdSize} personne${x.householdSize > 1 ? "s" : ""}` }] : []),
          { label: "Téléphone", value: x.phone },
        ],
        message: x.message ?? undefined,
        decision: r.decision ?? undefined,
      };
    }
  } else if (type === "benevoles") {
    const [x] = await db.select().from(volunteerApplications).where(and(eq(volunteerApplications.id, id), eq(sql`lower(${volunteerApplications.email})`, email))).limit(1);
    if (x) {
      detail = {
        type, id, organizationId: x.organizationId, title: "Candidature bénévole", status: x.status, createdAt: iso(x.createdAt),
        fields: [{ label: "Mission", value: roleLabel(x.role) }, ...(x.area ? [{ label: "Quartier", value: x.area }] : [])],
        message: x.message ?? undefined,
      };
    }
  } else {
    const [x] = await db.select().from(contactMessages).where(and(eq(contactMessages.id, id), eq(sql`lower(${contactMessages.email})`, email))).limit(1);
    if (x) {
      detail = { type, id, organizationId: x.organizationId, title: "Message", status: x.status, createdAt: iso(x.createdAt), fields: [{ label: "Objet", value: subjectLabel(x.subject) }], message: x.message };
    }
  }
  if (!detail) return null;

  const events = await db
    .select({ id: requestEvents.id, kind: requestEvents.kind, author: requestEvents.author, body: requestEvents.body, status: requestEvents.status, createdAt: requestEvents.createdAt })
    .from(requestEvents)
    .where(and(eq(requestEvents.requestType, type), eq(requestEvents.requestId, id)))
    .orderBy(asc(requestEvents.createdAt));

  return {
    ...detail,
    timeline: [
      { id: "created", kind: "created", author: "requester", createdAt: detail.createdAt },
      ...events.map((e) => ({
        id: e.id,
        kind: e.kind as "message" | "status",
        author: e.author as "staff" | "requester",
        body: e.body ?? undefined,
        status: e.status ?? undefined,
        createdAt: iso(e.createdAt),
      })),
    ],
  };
}

export async function countUnreadNotifications(email: string, db: Db = getDb()): Promise<number> {
  const [r] = await db.select({ n: count() }).from(requesterNotifications).where(and(eq(requesterNotifications.email, email), isNull(requesterNotifications.readAt)));
  return r.n;
}

export async function countUnreadForRequest(email: string, type: WorkflowType, id: string, db: Db = getDb()): Promise<number> {
  const [r] = await db
    .select({ n: count() })
    .from(requesterNotifications)
    .where(and(eq(requesterNotifications.email, email), eq(requesterNotifications.requestType, type), eq(requesterNotifications.requestId, id), isNull(requesterNotifications.readAt)));
  return r.n;
}

/** Dernières notifications du demandeur (lues et non lues). */
export async function listNotifications(email: string, limit = 15, db: Db = getDb()): Promise<NotificationRow[]> {
  const rows = await db
    .select({
      id: requesterNotifications.id,
      type: requesterNotifications.requestType,
      requestId: requesterNotifications.requestId,
      readAt: requesterNotifications.readAt,
      createdAt: requesterNotifications.createdAt,
      kind: requestEvents.kind,
      status: requestEvents.status,
    })
    .from(requesterNotifications)
    .innerJoin(requestEvents, eq(requestEvents.id, requesterNotifications.eventId))
    .where(eq(requesterNotifications.email, email))
    .orderBy(desc(requesterNotifications.createdAt))
    .limit(limit);
  const titles: Record<string, string> = { aide: "Demande d'aide", benevoles: "Candidature bénévole", messages: "Message" };
  return rows.map((r) => ({
    id: r.id,
    type: r.type as WorkflowType,
    requestId: r.requestId,
    requestTitle: titles[r.type] ?? "Demande",
    kind: r.kind as "message" | "status",
    status: r.status ?? undefined,
    createdAt: iso(r.createdAt),
    read: r.readAt !== null,
  }));
}
