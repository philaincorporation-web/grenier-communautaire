// Constantes, types et règles d'accès du module Bénéficiaires.
// Aucun accès base de données ici : fichier importé aussi par des composants client.

export type BeneficiaryType = "individual" | "household" | "organization";

export const beneficiaryTypes: BeneficiaryType[] = ["household", "individual", "organization"];

export const beneficiaryTypeLabels: Record<BeneficiaryType, string> = {
  individual: "Personne seule",
  household: "Foyer",
  organization: "Organisation",
};

export function isBeneficiaryType(v: unknown): v is BeneficiaryType {
  return v === "individual" || v === "household" || v === "organization";
}

// ---------------------------------------------------------------------------
// Droits par rôle — règle PROVISOIRE (les droits exacts et les champs sensibles restent à
// confirmer, voir notes techniques). Les données des bénéficiaires sont personnelles :
//  - consulter la liste, le nom, le type, la taille du foyer et l'historique : tout membre actif
//    (les bénévoles en ont besoin pour préparer une distribution) ;
//  - voir les coordonnées (téléphone, e-mail, adresse) et les notes : owner, admin, manager ;
//  - créer, modifier, désactiver ou réactiver : owner, admin, manager.

export const canSeeBeneficiaryContact = (role: string) => ["owner", "admin", "manager"].includes(role);
export const canManageBeneficiaries = (role: string) => ["owner", "admin", "manager"].includes(role);

// ---------------------------------------------------------------------------
// Saisie

export type BeneficiaryInput = {
  beneficiaryType: string;
  displayName: string;
  phone: string;
  email: string;
  address: string;
  householdSize: string;
  notes: string;
};

export type BeneficiaryResult =
  | { ok: true; message?: string }
  | {
      ok: false;
      message: string;
      errors?: Record<string, string>;
      /** Un bénéficiaire actif a déjà ce numéro : la création demande une confirmation. */
      duplicate?: { id: string; reference: string | null; name: string };
    };

export const PHONE_RE = /^[0-9+().\s-]{6,40}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validation partagée (navigateur pour le confort, serveur pour la sécurité). */
export function validateBeneficiary(input: BeneficiaryInput): Record<string, string> {
  const e: Record<string, string> = {};
  if (!isBeneficiaryType(input.beneficiaryType)) e.beneficiaryType = "Choisissez un type.";
  const name = input.displayName.trim();
  if (name.length < 2) e.displayName = "Indiquez un nom (2 caractères minimum).";
  else if (name.length > 180) e.displayName = "180 caractères maximum.";
  const phone = input.phone.trim();
  if (phone && !PHONE_RE.test(phone)) e.phone = "Numéro de téléphone invalide.";
  const email = input.email.trim();
  if (email && (!EMAIL_RE.test(email) || email.length > 255)) e.email = "Adresse e-mail invalide.";
  if (input.address.trim().length > 500) e.address = "500 caractères maximum.";
  const size = input.householdSize.trim();
  if (size && (!/^\d{1,2}$/.test(size) || Number(size) < 1)) e.householdSize = "Indiquez un nombre de personnes entre 1 et 99.";
  if (input.notes.trim().length > 2000) e.notes = "2 000 caractères maximum.";
  return e;
}

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
/** `AAAA-MM-JJ` ou date ISO → « 3 nov. 2026 ». */
export const formatDate = (iso: string) => dateFmt.format(new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso));
