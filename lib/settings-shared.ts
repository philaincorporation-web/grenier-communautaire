// Règles du module Paramètres, utilisables côté client et côté serveur.

export type Role = "owner" | "admin" | "manager" | "member" | "viewer";

export const roleLabels: Record<Role, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  manager: "Gestionnaire",
  member: "Membre",
  viewer: "Lecture seule",
};

export const roleDescriptions: Record<Role, string> = {
  owner: "Tous les droits, y compris la gestion des propriétaires.",
  admin: "Paramètres, équipe, relais et toutes les opérations.",
  manager: "Valide les demandes, distributions et annulations.",
  member: "Saisit les dons, demandes et distributions.",
  viewer: "Consulte sans rien modifier.",
};

export const ROLES = Object.keys(roleLabels) as Role[];
export const isRole = (v: unknown): v is Role => typeof v === "string" && (ROLES as string[]).includes(v);

export const settingsTabs = {
  organisation: "Organisation",
  produits: "Produits",
  categories: "Catégories",
  equipe: "Équipe",
} as const;
export type SettingsTab = keyof typeof settingsTabs;
export const isSettingsTab = (v: unknown): v is SettingsTab => typeof v === "string" && v in settingsTabs;

/** Modification des paramètres (organisation, catalogue, équipe). Les autres rôles consultent. */
export const canManageSettings = (role: Role) => role === "owner" || role === "admin";

/** Rôles qu'un acteur peut attribuer : seul un propriétaire gère le rôle propriétaire. */
export const assignableRoles = (actor: Role): Role[] => (actor === "owner" ? ROLES : actor === "admin" ? ROLES.filter((r) => r !== "owner") : []);

export const UNIT_SUGGESTIONS = ["kg", "sac", "carton", "litre", "boîte", "paquet", "unité", "pièce"];

export type FieldErrors = Record<string, string>;
export type SettingsResult = { ok: true; message?: string } | { ok: false; message: string; errors?: FieldErrors };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+0-9 ().-]{6,40}$/;

export type OrganizationInput = { name: string; email: string; phone: string; address: string };
export function validateOrganization(v: OrganizationInput): FieldErrors {
  const e: FieldErrors = {};
  if (!v.name.trim()) e.name = "Le nom est obligatoire.";
  else if (v.name.trim().length > 180) e.name = "180 caractères au maximum.";
  if (v.email.trim() && (!EMAIL_RE.test(v.email.trim()) || v.email.trim().length > 255)) e.email = "Adresse e-mail invalide.";
  if (v.phone.trim() && !PHONE_RE.test(v.phone.trim())) e.phone = "Numéro invalide.";
  if (v.address.length > 1000) e.address = "1000 caractères au maximum.";
  return e;
}

export type ProductInput = { name: string; sku: string; unit: string; categoryId: string; isPerishable: boolean };
export function validateProduct(v: ProductInput): FieldErrors {
  const e: FieldErrors = {};
  if (!v.name.trim()) e.name = "Le nom est obligatoire.";
  else if (v.name.trim().length > 180) e.name = "180 caractères au maximum.";
  if (v.sku.trim().length > 80) e.sku = "80 caractères au maximum.";
  if (!v.unit.trim()) e.unit = "L'unité est obligatoire.";
  else if (v.unit.trim().length > 40) e.unit = "40 caractères au maximum.";
  return e;
}

export type CategoryInput = { name: string; description: string };
export function validateCategory(v: CategoryInput): FieldErrors {
  const e: FieldErrors = {};
  if (!v.name.trim()) e.name = "Le nom est obligatoire.";
  else if (v.name.trim().length > 120) e.name = "120 caractères au maximum.";
  if (v.description.length > 500) e.description = "500 caractères au maximum.";
  return e;
}

export type MemberInput = { email: string; fullName: string; role: Role };
export function validateMember(v: MemberInput): FieldErrors {
  const e: FieldErrors = {};
  const email = v.email.trim();
  if (!email || !EMAIL_RE.test(email) || email.length > 255) e.email = "Adresse e-mail invalide.";
  if (!v.fullName.trim()) e.fullName = "Le nom est obligatoire.";
  else if (v.fullName.trim().length > 180) e.fullName = "180 caractères au maximum.";
  if (!isRole(v.role)) e.role = "Rôle invalide.";
  return e;
}
