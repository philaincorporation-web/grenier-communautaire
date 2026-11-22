"use server";

// Formulaires publics (bénévolat, demande d'aide, contact, newsletter).
//
// Sécurité :
//  - l'organisation est résolue côté serveur (lib/public-org.ts), jamais depuis le formulaire ;
//  - toutes les valeurs sont revalidées ici (listes autorisées, longueurs) ;
//  - un champ piège invisible écarte les robots (succès simulé, rien n'est écrit) ;
//  - limite de débit par adresse IP : seul un HMAC de l'IP est stocké, jamais l'IP brute.

import { createHash, createHmac, randomInt } from "node:crypto";
import { headers } from "next/headers";
import { and, eq, gte, sql } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { getDb, isDbConfigured, type Db } from "@/db";
import { contactMessages, newsletterSubscribers, publicAidRequests, volunteerApplications } from "@/db/schema";
import { getPublicOrganizationId } from "@/lib/public-org";
import { aidNeeds, contactSubjects, volunteerRoles } from "@/lib/site-content";

export type FormState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Record<string, string>;
  /** Valeurs saisies, renvoyées en cas d'erreur : React vide le formulaire après chaque envoi. */
  values?: Record<string, string | string[]>;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+().\s-]{6,40}$/;

const UNAVAILABLE = "Le service d'enregistrement est momentanément indisponible. Merci de nous contacter directement.";
const TOO_MANY = "Vous avez envoyé plusieurs demandes en peu de temps. Merci de réessayer dans une heure.";

// ---------------------------------------------------------------------------
// Lecture et validation

function field(data: FormData, name: string) {
  const v = data.get(name);
  return typeof v === "string" ? v.trim() : "";
}

type Rule = { label: string; required?: boolean; email?: boolean; phone?: boolean; max?: number; oneOf?: readonly string[] };

function validate(data: FormData, rules: Record<string, Rule>) {
  const errors: Record<string, string> = {};
  for (const [name, r] of Object.entries(rules)) {
    const v = field(data, name);
    if (!v) {
      if (r.required) errors[name] = `${r.label} est requis.`;
    } else if (r.email && !EMAIL_RE.test(v)) errors[name] = "Adresse e-mail invalide.";
    else if (r.phone && !PHONE_RE.test(v)) errors[name] = "Numéro de téléphone invalide.";
    else if (r.oneOf && !r.oneOf.includes(v)) errors[name] = `${r.label} : choix invalide.`;
    else if (r.max && v.length > r.max) errors[name] = `${r.label} : ${r.max} caractères maximum.`;
  }
  return errors;
}

/** Valeurs à ré-afficher après une erreur (jamais le champ piège). */
function echo(data: FormData, names: string[], lists: string[] = []) {
  const values: Record<string, string | string[]> = {};
  for (const n of names) values[n] = field(data, n);
  for (const n of lists) values[n] = data.getAll(n).filter((v): v is string => typeof v === "string");
  return values;
}

const isBot = (data: FormData) => Boolean(field(data, "website"));

// ---------------------------------------------------------------------------
// Limite de débit

async function ipHash(): Promise<string | null> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim();
  if (!ip) return null; // IP inconnue (ex. développement local) : pas de limite
  const key = process.env.NEON_AUTH_COOKIE_SECRET;
  return key ? createHmac("sha256", key).update(ip).digest("hex") : createHash("sha256").update(ip).digest("hex");
}

async function isRateLimited(db: Db, table: PgTable, ipCol: PgColumn, timeCol: PgColumn, hash: string | null, max: number) {
  if (!hash) return false;
  const [row] = await db
    .select({ n: sql`count(*)`.mapWith(Number) })
    .from(table)
    .where(and(eq(ipCol, hash), gte(timeCol, sql`now() - interval '1 hour'`)));
  return row.n >= max;
}

// ---------------------------------------------------------------------------
// Contexte commun : base + organisation

async function context(): Promise<{ db: Db; orgId: string } | null> {
  if (!isDbConfigured) return null;
  const db = getDb();
  const orgId = await getPublicOrganizationId(db);
  return orgId ? { db, orgId } : null;
}

function fail(message: string, extra: Partial<FormState> = {}): FormState {
  return { status: "error", message, ...extra };
}

function invalid(errors: Record<string, string>, values: FormState["values"]): FormState {
  return fail("Merci de corriger les champs indiqués.", { errors, values });
}

// ---------------------------------------------------------------------------
// Bénévolat

export async function submitVolunteer(_: FormState, data: FormData): Promise<FormState> {
  if (isBot(data)) return { status: "success", message: "Merci ! Votre candidature a bien été envoyée." };

  const values = echo(data, ["fullName", "email", "phone", "role", "area", "message"]);
  const errors = validate(data, {
    fullName: { required: true, max: 180, label: "Le nom" },
    email: { required: true, email: true, max: 255, label: "L'e-mail" },
    phone: { phone: true, label: "Le téléphone" },
    role: { required: true, oneOf: volunteerRoles.map((r) => r.id), label: "La mission" },
    area: { max: 180, label: "Le quartier" },
    message: { max: 2000, label: "Le message" },
  });
  if (Object.keys(errors).length) return invalid(errors, values);

  try {
    const ctx = await context();
    if (!ctx) return fail(UNAVAILABLE, { values });
    const hash = await ipHash();
    if (await isRateLimited(ctx.db, volunteerApplications, volunteerApplications.ipHash, volunteerApplications.createdAt, hash, 5)) {
      return fail(TOO_MANY, { values });
    }
    await ctx.db.insert(volunteerApplications).values({
      organizationId: ctx.orgId,
      fullName: field(data, "fullName"),
      email: field(data, "email").toLowerCase(),
      phone: field(data, "phone") || null,
      role: field(data, "role"),
      area: field(data, "area") || null,
      message: field(data, "message") || null,
      ipHash: hash,
    });
    return { status: "success", message: "Merci ! Votre candidature a bien été envoyée. Un responsable de relais vous recontactera." };
  } catch (error) {
    console.error("[public-forms] volunteer", error);
    return fail(UNAVAILABLE, { values });
  }
}

// ---------------------------------------------------------------------------
// Demande d'aide

// Alphabet sans caractères ambigus (0/O, 1/I) : la référence se dicte au téléphone.
const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newReference = () =>
  `DA-${new Date().getFullYear()}-${Array.from({ length: 6 }, () => REF_ALPHABET[randomInt(REF_ALPHABET.length)]).join("")}`;

function isUniqueViolation(error: unknown): boolean {
  const e = error as { code?: string; cause?: { code?: string } };
  return e?.code === "23505" || e?.cause?.code === "23505";
}

export async function submitAidRequest(_: FormState, data: FormData): Promise<FormState> {
  if (isBot(data)) return { status: "success", message: "Merci ! Votre demande a bien été enregistrée." };

  const values = echo(data, ["fullName", "phone", "email", "householdSize", "address", "message", "consent"], ["needs"]);
  const errors = validate(data, {
    fullName: { required: true, max: 180, label: "Le nom" },
    phone: { required: true, phone: true, label: "Le téléphone" },
    email: { email: true, max: 255, label: "L'e-mail" },
    address: { max: 500, label: "L'adresse" },
    message: { max: 2000, label: "Le message" },
  });
  const sizeRaw = field(data, "householdSize");
  const size = sizeRaw ? Number(sizeRaw) : null;
  if (size !== null && (!Number.isInteger(size) || size < 1 || size > 99)) {
    errors.householdSize = "Indiquez un nombre de personnes entre 1 et 99.";
  }
  const needs = data.getAll("needs").filter((v): v is string => typeof v === "string");
  if (needs.length === 0) errors.needs = "Indiquez au moins un besoin.";
  else if (needs.some((n) => !aidNeeds.includes(n))) errors.needs = "Besoin invalide.";
  if (!field(data, "consent")) errors.consent = "Votre accord est nécessaire pour traiter la demande.";
  if (Object.keys(errors).length) return invalid(errors, values);

  try {
    const ctx = await context();
    if (!ctx) return fail(UNAVAILABLE, { values });
    const hash = await ipHash();
    if (await isRateLimited(ctx.db, publicAidRequests, publicAidRequests.ipHash, publicAidRequests.createdAt, hash, 3)) {
      return fail(TOO_MANY, { values });
    }

    // La référence est unique par organisation : on réessaie en cas de collision (très rare).
    for (let attempt = 0; attempt < 4; attempt++) {
      const reference = newReference();
      try {
        await ctx.db.insert(publicAidRequests).values({
          organizationId: ctx.orgId,
          reference,
          fullName: field(data, "fullName"),
          phone: field(data, "phone"),
          email: field(data, "email").toLowerCase() || null,
          address: field(data, "address") || null,
          householdSize: size,
          needs: [...new Set(needs)],
          message: field(data, "message") || null,
          consentAt: new Date(),
          ipHash: hash,
        });
        return {
          status: "success",
          message: `Votre demande a bien été enregistrée. Référence : ${reference}. Conservez-la : elle vous sera demandée pour tout échange. Un membre de l'équipe vous contactera.`,
        };
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
      }
    }
    return fail(UNAVAILABLE, { values });
  } catch (error) {
    console.error("[public-forms] aid request", error);
    return fail(UNAVAILABLE, { values });
  }
}

// ---------------------------------------------------------------------------
// Contact

export async function submitContact(_: FormState, data: FormData): Promise<FormState> {
  if (isBot(data)) return { status: "success", message: "Merci ! Votre message a bien été envoyé." };

  const values = echo(data, ["fullName", "email", "subject", "message"]);
  const errors = validate(data, {
    fullName: { required: true, max: 180, label: "Le nom" },
    email: { required: true, email: true, max: 255, label: "L'e-mail" },
    subject: { required: true, oneOf: contactSubjects.map((s) => s.value), label: "L'objet" },
    message: { required: true, max: 4000, label: "Le message" },
  });
  if (Object.keys(errors).length) return invalid(errors, values);

  try {
    const ctx = await context();
    if (!ctx) return fail(UNAVAILABLE, { values });
    const hash = await ipHash();
    if (await isRateLimited(ctx.db, contactMessages, contactMessages.ipHash, contactMessages.createdAt, hash, 5)) {
      return fail(TOO_MANY, { values });
    }
    await ctx.db.insert(contactMessages).values({
      organizationId: ctx.orgId,
      fullName: field(data, "fullName"),
      email: field(data, "email").toLowerCase(),
      subject: field(data, "subject"),
      message: field(data, "message"),
      ipHash: hash,
    });
    return { status: "success", message: "Merci ! Votre message a bien été envoyé. Nous vous répondons rapidement." };
  } catch (error) {
    console.error("[public-forms] contact", error);
    return fail(UNAVAILABLE, { values });
  }
}

// ---------------------------------------------------------------------------
// Newsletter

export async function subscribeNewsletter(_: FormState, data: FormData): Promise<FormState> {
  const OK: FormState = { status: "success", message: "Merci ! Vous êtes inscrit(e) à la lettre d'information." };
  if (isBot(data)) return OK;

  const values = echo(data, ["email"]);
  const errors = validate(data, { email: { required: true, email: true, max: 255, label: "L'e-mail" } });
  if (Object.keys(errors).length) return invalid(errors, values);

  try {
    const ctx = await context();
    if (!ctx) return fail(UNAVAILABLE, { values });
    const hash = await ipHash();
    if (await isRateLimited(ctx.db, newsletterSubscribers, newsletterSubscribers.ipHash, newsletterSubscribers.subscribedAt, hash, 10)) {
      return fail(TOO_MANY, { values });
    }
    // Même réponse que l'adresse soit nouvelle ou déjà inscrite : on ne révèle pas qui est abonné.
    await ctx.db
      .insert(newsletterSubscribers)
      .values({ organizationId: ctx.orgId, email: field(data, "email").toLowerCase(), ipHash: hash })
      .onConflictDoUpdate({
        target: [newsletterSubscribers.organizationId, newsletterSubscribers.email],
        set: { unsubscribedAt: null },
      });
    return OK;
  } catch (error) {
    console.error("[public-forms] newsletter", error);
    return fail(UNAVAILABLE, { values });
  }
}
