// Règles partagées (serveur / client) du module Relais. Aucun accès base de données ici.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Droits — règle PROVISOIRE : consulter = tout membre ; créer / modifier / désactiver = owner, admin. */
export const canManageRelais = (role: string) => ["owner", "admin"].includes(role);

export type RelaisInput = { name: string; code: string; address: string; managerMembershipId: string };
export type RelaisResult = { ok: true; message?: string } | { ok: false; message: string; errors?: Record<string, string> };

export function validateRelais(i: RelaisInput): Record<string, string> {
  const e: Record<string, string> = {};
  if (i.name.trim().length < 2 || i.name.trim().length > 160) e.name = "Indiquez un nom (2 à 160 caractères).";
  if (i.code.trim() && !/^[A-Za-z0-9_-]{1,60}$/.test(i.code.trim())) e.code = "Code : lettres, chiffres, tirets (60 maximum).";
  if (i.address.trim().length > 500) e.address = "500 caractères maximum.";
  if (i.managerMembershipId && !UUID_RE.test(i.managerMembershipId)) e.managerMembershipId = "Responsable invalide.";
  return e;
}

