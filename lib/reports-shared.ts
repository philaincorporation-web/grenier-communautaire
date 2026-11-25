// Règles du module Rapports. Aucune donnée financière : uniquement des volumes d'activité.

import type { Role } from "@/lib/settings-shared";

export const periods = {
  "30j": { label: "30 derniers jours", bucket: "week" },
  "90j": { label: "90 derniers jours", bucket: "week" },
  "12m": { label: "12 derniers mois", bucket: "month" },
  annee: { label: "Année en cours", bucket: "month" },
} as const;
export type Period = keyof typeof periods;
export const DEFAULT_PERIOD: Period = "12m";
export const isPeriod = (v: unknown): v is Period => typeof v === "string" && v in periods;

export const exportTypes = { distributions: "Distributions", dons: "Dons reçus" } as const;
export type ExportType = keyof typeof exportTypes;
export const isExportType = (v: unknown): v is ExportType => typeof v === "string" && v in exportTypes;

/** Les exports contiennent le détail des opérations : réservés aux rôles de gestion. */
export const canExportReports = (role: Role) => role === "owner" || role === "admin" || role === "manager";

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Bornes de la période (dates ISO, incluses) à partir de la date du jour `today` (AAAA-MM-JJ). */
export function periodRange(period: Period, today: string): { from: string; to: string } {
  const t = new Date(`${today}T00:00:00Z`);
  const d = new Date(t);
  if (period === "30j") d.setUTCDate(d.getUTCDate() - 29);
  else if (period === "90j") d.setUTCDate(d.getUTCDate() - 89);
  else if (period === "12m") d.setUTCFullYear(d.getUTCFullYear(), d.getUTCMonth() - 11, 1);
  else d.setUTCMonth(0, 1);
  return { from: iso(d), to: today };
}

/** Début du créneau (lundi de la semaine ou 1er du mois) contenant `day`. */
export function bucketStart(day: string, bucket: "week" | "month"): string {
  const d = new Date(`${day}T00:00:00Z`);
  if (bucket === "month") d.setUTCDate(1);
  else d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return iso(d);
}

/** Tous les créneaux de la période, dans l'ordre, pour ne pas sauter les périodes vides. */
export function bucketsBetween(from: string, to: string, bucket: "week" | "month"): string[] {
  const out: string[] = [];
  const d = new Date(`${bucketStart(from, bucket)}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (d <= end) {
    out.push(iso(d));
    if (bucket === "month") d.setUTCMonth(d.getUTCMonth() + 1);
    else d.setUTCDate(d.getUTCDate() + 7);
  }
  return out;
}

const monthFmt = new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: "UTC" });
const monthYearFmt = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
const dayFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });

export function bucketLabel(start: string, bucket: "week" | "month", long = false): string {
  const d = new Date(`${start}T00:00:00Z`);
  if (bucket === "month") return long ? monthYearFmt.format(d) : monthFmt.format(d).replace(".", "");
  return long ? `Semaine du ${dayFmt.format(d)}` : dayFmt.format(d).replace(".", "");
}
