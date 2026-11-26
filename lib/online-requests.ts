// Lectures de la section « Demandes en ligne ».
// Chaque requête est filtrée par organization_id, résolu côté serveur par
// requireActiveMembership() — jamais à partir d'une valeur fournie par le navigateur.

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb, type Db } from "@/db";
import { contactMessages, newsletterSubscribers, publicAidRequests, requestEvents, volunteerApplications } from "@/db/schema";
import { contactSubjects, volunteerRoles } from "@/lib/site-content";
import type { OnlineRow, SubmissionStatus, SubscriberRow, ThreadEvent, WorkflowType } from "@/lib/online-requests-shared";

/** Demandes dont le dernier message vient du demandeur (réponse attendue), par type. */
async function getAwaitingCounts(organizationId: string, db: Db): Promise<Record<WorkflowType, number>> {
  // Dernier message de chaque demande, puis on garde ceux écrits par le demandeur.
  const last = db
    .selectDistinctOn([requestEvents.requestType, requestEvents.requestId], { type: requestEvents.requestType, author: requestEvents.author })
    .from(requestEvents)
    .where(and(eq(requestEvents.organizationId, organizationId), eq(requestEvents.kind, "message")))
    .orderBy(requestEvents.requestType, requestEvents.requestId, desc(requestEvents.createdAt))
    .as("last");
  const rows = await db.select({ type: last.type, n: count }).from(last).where(eq(last.author, "requester")).groupBy(last.type);
  const out: Record<WorkflowType, number> = { aide: 0, benevoles: 0, messages: 0 };
  for (const r of rows) if (r.type in out) out[r.type as WorkflowType] = r.n;
  return out;
}

/** Ajoute à chaque ligne son historique et l'indicateur « réponse attendue ». */
async function withThreads(type: WorkflowType, rows: Omit<OnlineRow, "thread" | "awaitingReply">[], db: Db): Promise<OnlineRow[]> {
  if (!rows.length) return [];
  const events = await db
    .select({
      id: requestEvents.id, requestId: requestEvents.requestId, kind: requestEvents.kind, author: requestEvents.author,
      authorName: requestEvents.authorName, body: requestEvents.body, status: requestEvents.status, createdAt: requestEvents.createdAt,
    })
    .from(requestEvents)
    .where(and(eq(requestEvents.requestType, type), inArray(requestEvents.requestId, rows.map((r) => r.id))))
    .orderBy(asc(requestEvents.createdAt));
  const byRequest = new Map<string, ThreadEvent[]>();
  for (const e of events) {
    const list = byRequest.get(e.requestId) ?? [];
    list.push({
      id: e.id, kind: e.kind as ThreadEvent["kind"], author: e.author as ThreadEvent["author"],
      authorName: e.authorName ?? undefined, body: e.body ?? undefined, status: e.status ?? undefined, createdAt: iso(e.createdAt),
    });
    byRequest.set(e.requestId, list);
  }
  return rows.map((r) => {
    const thread = byRequest.get(r.id) ?? [];
    const lastMessage = thread.findLast((e) => e.kind === "message");
    return { ...r, thread, awaitingReply: lastMessage?.author === "requester" };
  });
}

export const PAGE_SIZE = 15;

const iso = (d: Date) => d.toISOString();
const count = sql`count(*)`.mapWith(Number);

export type NewCounts = { aide: number; benevoles: number; messages: number };

/** Demandes à traiter par type (pastilles) : nouvelles + en attente d'une réponse de l'équipe. */
export async function getNewCounts(organizationId: string, db: Db = getDb()): Promise<NewCounts> {
  const [[aide], [benevoles], [messages], awaiting] = await Promise.all([
    db.select({ n: count }).from(publicAidRequests).where(and(eq(publicAidRequests.organizationId, organizationId), eq(publicAidRequests.status, "new"))),
    db.select({ n: count }).from(volunteerApplications).where(and(eq(volunteerApplications.organizationId, organizationId), eq(volunteerApplications.status, "new"))),
    db.select({ n: count }).from(contactMessages).where(and(eq(contactMessages.organizationId, organizationId), eq(contactMessages.status, "new"))),
    getAwaitingCounts(organizationId, db),
  ]);
  return { aide: aide.n + awaiting.aide, benevoles: benevoles.n + awaiting.benevoles, messages: messages.n + awaiting.messages };
}

export type Page<T> = { rows: T[]; total: number };

const roleLabel = (id: string) => volunteerRoles.find((r) => r.id === id)?.label ?? id;
const subjectLabel = (v: string) => contactSubjects.find((s) => s.value === v)?.label ?? v;
const clean = (v: string | null | undefined) => (v && v.trim() ? v : undefined);

export async function listOnlineRequests(
  organizationId: string,
  type: WorkflowType,
  status: SubmissionStatus | undefined,
  page: number,
  db: Db = getDb(),
): Promise<Page<OnlineRow>> {
  const offset = (page - 1) * PAGE_SIZE;

  if (type === "aide") {
    const t = publicAidRequests;
    const where = and(eq(t.organizationId, organizationId), status ? eq(t.status, status) : undefined);
    const [rows, [total]] = await Promise.all([
      db.select().from(t).where(where).orderBy(desc(t.createdAt)).limit(PAGE_SIZE).offset(offset),
      db.select({ n: count }).from(t).where(where),
    ]);
    return {
      total: total.n,
      rows: await withThreads(type, rows.map((r) => ({
        id: r.id,
        type,
        createdAt: iso(r.createdAt),
        status: r.status,
        title: r.fullName,
        reference: r.reference,
        email: clean(r.email),
        phone: r.phone,
        converted: r.aidRequestId !== null,
        fields: [
          { label: "Besoins", value: r.needs.join(", ") || "—" },
          ...(r.householdSize ? [{ label: "Foyer", value: `${r.householdSize} personne${r.householdSize > 1 ? "s" : ""}` }] : []),
          ...(clean(r.address) ? [{ label: "Adresse", value: r.address! }] : []),
        ],
        message: clean(r.message),
      })), db),
    };
  }

  if (type === "benevoles") {
    const t = volunteerApplications;
    const where = and(eq(t.organizationId, organizationId), status ? eq(t.status, status) : undefined);
    const [rows, [total]] = await Promise.all([
      db.select().from(t).where(where).orderBy(desc(t.createdAt)).limit(PAGE_SIZE).offset(offset),
      db.select({ n: count }).from(t).where(where),
    ]);
    return {
      total: total.n,
      rows: await withThreads(type, rows.map((r) => ({
        id: r.id,
        type,
        createdAt: iso(r.createdAt),
        status: r.status,
        title: r.fullName,
        email: r.email,
        phone: clean(r.phone),
        fields: [
          { label: "Mission", value: roleLabel(r.role) },
          ...(clean(r.area) ? [{ label: "Quartier", value: r.area! }] : []),
        ],
        message: clean(r.message),
      })), db),
    };
  }

  const t = contactMessages;
  const where = and(eq(t.organizationId, organizationId), status ? eq(t.status, status) : undefined);
  const [rows, [total]] = await Promise.all([
    db.select().from(t).where(where).orderBy(desc(t.createdAt)).limit(PAGE_SIZE).offset(offset),
    db.select({ n: count }).from(t).where(where),
  ]);
  return {
    total: total.n,
    rows: await withThreads(type, rows.map((r) => ({
      id: r.id,
      type,
      createdAt: iso(r.createdAt),
      status: r.status,
      title: r.fullName,
      email: r.email,
      fields: [{ label: "Objet", value: subjectLabel(r.subject) }],
      message: r.message,
    })), db),
  };
}

export async function listSubscribers(
  organizationId: string,
  page: number,
  db: Db = getDb(),
): Promise<Page<SubscriberRow> & { active: number }> {
  const t = newsletterSubscribers;
  const where = eq(t.organizationId, organizationId);
  const [rows, [total], [active]] = await Promise.all([
    db.select().from(t).where(where).orderBy(desc(t.subscribedAt)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ n: count }).from(t).where(where),
    db.select({ n: count }).from(t).where(and(where, sql`${t.unsubscribedAt} is null`)),
  ]);
  return {
    total: total.n,
    active: active.n,
    rows: rows.map((r) => ({ id: r.id, email: r.email, subscribedAt: iso(r.subscribedAt), active: r.unsubscribedAt === null })),
  };
}
