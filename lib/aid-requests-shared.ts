// Constantes, types et règles du module Demandes d'aide (fichier partagé serveur / client).

import type { BeneficiaryInput } from "@/lib/beneficiaries-shared";

export type AidStatus = "submitted" | "under_review" | "approved" | "rejected" | "fulfilled" | "cancelled";

export const aidStatusLabels: Record<AidStatus, string> = {
  submitted: "Déposée",
  under_review: "En étude",
  approved: "Approuvée",
  rejected: "Refusée",
  fulfilled: "Satisfaite",
  cancelled: "Annulée",
};

export const aidStatusStyles: Record<AidStatus, string> = {
  submitted: "bg-brand-soft text-brand",
  under_review: "bg-amber-100 text-amber-700",
  approved: "bg-blue-100 text-blue-700",
  rejected: "bg-red-100 text-red-700",
  fulfilled: "bg-green-100 text-green-700",
  cancelled: "bg-surface text-muted",
};

/** Filtres de la liste (dans l'URL : ?vue=…). */
export const aidViews = {
  "a-traiter": { label: "À traiter", statuses: ["submitted", "under_review"] as AidStatus[] },
  approuvees: { label: "Approuvées", statuses: ["approved"] as AidStatus[] },
  satisfaites: { label: "Satisfaites", statuses: ["fulfilled"] as AidStatus[] },
  refusees: { label: "Refusées / annulées", statuses: ["rejected", "cancelled"] as AidStatus[] },
  toutes: { label: "Toutes", statuses: [] as AidStatus[] },
} as const;
export type AidView = keyof typeof aidViews;
export const isAidView = (v: unknown): v is AidView => typeof v === "string" && v in aidViews;

/**
 * Cycle de vie : déposée → en étude → approuvée (quantités accordées) ou refusée (motif) ;
 * approuvée → satisfaite quand la distribution liée est validée ; annulable avant d'être satisfaite.
 */
export const canStartReview = (s: AidStatus) => s === "submitted";
export const canDecide = (s: AidStatus) => s === "submitted" || s === "under_review";
export const canCancelAid = (s: AidStatus) => s === "submitted" || s === "under_review" || s === "approved";

// Droits par rôle — règle PROVISOIRE (à confirmer) :
//  - consulter : tout membre ;
//  - enregistrer une demande : owner, admin, manager, member (les Relais repèrent les besoins) ;
//  - instruire, approuver, refuser, annuler, convertir une demande reçue en ligne : owner, admin, manager.
export const canCreateAidRequest = (role: string) => ["owner", "admin", "manager", "member"].includes(role);
export const canReviewAidRequest = (role: string) => ["owner", "admin", "manager"].includes(role);

export type AidInput = {
  beneficiaryId: string;
  requestedOn: string;
  generalNote: string;
  lines: { productId: string; quantity: string }[];
  /** Conversion d'une demande reçue en ligne. */
  onlineRequestId?: string | null;
  /** Conversion : créer un nouveau bénéficiaire avec ces données (sinon `beneficiaryId`). */
  newBeneficiary?: BeneficiaryInput | null;
};

export type AidResult = { ok: true; message?: string } | { ok: false; message: string; errors?: Record<string, string> };
