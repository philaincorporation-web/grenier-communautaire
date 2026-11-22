// Lectures de la section « Demandes en ligne ».
// Chaque requête est filtrée par organization_id, résolu côté serveur par
// requireActiveMembership() — jamais à partir d'une valeur fournie par le navigateur.

import { and, desc, eq, sql } from "drizzle-orm";
import { getDb, type Db } from "@/db";
import { contactMessages, newsletterSubscribers, publicAidRequests, volunteerApplications } from "@/db/schema";
import { contactSubjects, volunteerRoles } from "@/lib/site-content";
import type { OnlineRow, SubmissionStatus, SubscriberRow, WorkflowType } from "@/lib/online-requests-shared";

export const PAGE_SIZE = 15;

const iso = (d: Date) => d.toISOString();
const count = sql`count(*)`.mapWith(Number);

export type NewCounts = { aide: number; benevoles: number; messages: number };

/** Nombre de demandes « nouvelles » par type (pastilles de l'interface). */
export async function getNewCounts(organizationId: string, db: Db = getDb()): Promise<NewCounts> {
  const [[aide], [benevoles], [messages]] = await Promise.all([
    db.select({ n: count }).from(publicAidRequests).where(and(eq(publicAidRequests.organizationId, organizationId), eq(publicAidRequests.status, "new"))),
    db.select({ n: count }).from(volunteerApplications).where(and(eq(volunteerApplications.organizationId, organizationId), eq(volunteerApplications.status, "new"))),
    db.select({ n: count }).from(contactMessages).where(and(eq(contactMessages.organizationId, organizationId), eq(contactMessages.status, "new"))),
  ]);
  return { aide: aide.n, benevoles: benevoles.n, messages: messages.n };
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
      rows: rows.map((r) => ({
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
      })),
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
      rows: rows.map((r) => ({
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
      })),
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
    rows: rows.map((r) => ({
      id: r.id,
      type,
      createdAt: iso(r.createdAt),
      status: r.status,
      title: r.fullName,
      email: r.email,
      fields: [{ label: "Objet", value: subjectLabel(r.subject) }],
      message: r.message,
    })),
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
