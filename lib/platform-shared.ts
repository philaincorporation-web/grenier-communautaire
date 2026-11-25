// Règles du module Plateforme (super administrateur), utilisables côté client et côté serveur.

import { validateMember, validateOrganization, type FieldErrors, type MemberInput, type OrganizationInput } from "@/lib/settings-shared";

export type NewOrganizationInput = OrganizationInput & {
  slug: string;
  /** Premier propriétaire de l'organisation : obligatoire, une organisation n'est jamais sans propriétaire. */
  ownerEmail: string;
  ownerName: string;
};

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** « Grenier de Libreville » → « grenier-de-libreville ». */
export function slugify(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

export function validateNewOrganization(v: NewOrganizationInput): FieldErrors {
  const e: FieldErrors = validateOrganization(v);
  const slug = v.slug.trim();
  if (!slug) e.slug = "L'identifiant est obligatoire.";
  else if (slug.length < 3 || slug.length > 100) e.slug = "Entre 3 et 100 caractères.";
  else if (!SLUG_RE.test(slug)) e.slug = "Lettres minuscules, chiffres et tirets uniquement.";
  const owner: MemberInput = { email: v.ownerEmail, fullName: v.ownerName, role: "owner" };
  const o = validateMember(owner);
  if (o.email) e.ownerEmail = o.email;
  if (o.fullName) e.ownerName = o.fullName;
  return e;
}
