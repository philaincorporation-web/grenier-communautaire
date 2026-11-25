// Constantes, types et règles du module Dons (fichier partagé serveur / client).

export type DonationStatus = "draft" | "received" | "cancelled";
export type DonorType = "individual" | "organization";

export const donationStatusLabels: Record<DonationStatus, string> = { draft: "Brouillon", received: "Reçu", cancelled: "Annulé" };
export const donationStatusStyles: Record<DonationStatus, string> = {
  draft: "bg-amber-100 text-amber-700",
  received: "bg-green-100 text-green-700",
  cancelled: "bg-surface text-muted",
};
export const donorTypeLabels: Record<DonorType, string> = { individual: "Particulier", organization: "Organisation / entreprise" };

export const donationViews = {
  recus: { label: "Reçus", status: "received" as DonationStatus | null },
  annules: { label: "Annulés", status: "cancelled" as DonationStatus | null },
  tous: { label: "Tous", status: null as DonationStatus | null },
} as const;
export type DonationView = keyof typeof donationViews;
export const isDonationView = (v: unknown): v is DonationView => typeof v === "string" && v in donationViews;

// Droits par rôle — règle PROVISOIRE (à confirmer) :
//  - consulter les dons : tout membre ; coordonnées des donateurs : owner, admin, manager ;
//  - enregistrer la réception d'un don : owner, admin, manager, member (accueil au dépôt) ;
//  - annuler un don reçu (contre-mouvement) : owner, admin, manager.
export const canRegisterDonation = (role: string) => ["owner", "admin", "manager", "member"].includes(role);
export const canCancelDonation = (role: string) => ["owner", "admin", "manager"].includes(role);
export const canSeeDonorContact = (role: string) => ["owner", "admin", "manager"].includes(role);

export type DonationInput = {
  donorId: string;
  /** Nouveau donateur, créé dans la même opération (sinon `donorId`). */
  newDonor: { donorType: string; displayName: string; phone: string; email: string } | null;
  warehouseId: string;
  receivedOn: string;
  notes: string;
  lines: { productId: string; quantity: string }[];
};

export type DonationResult = { ok: true; message?: string } | { ok: false; message: string; errors?: Record<string, string> };
