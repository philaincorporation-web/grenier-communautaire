// Constantes, types et règles d'accès du module Distributions.
// Aucun accès base de données ici : fichier importé aussi par des composants client.

export type DistributionStatus = "draft" | "completed" | "cancelled";

export const distributionStatuses: DistributionStatus[] = ["draft", "completed", "cancelled"];

export const distributionStatusLabels: Record<DistributionStatus, string> = {
  draft: "Brouillon",
  completed: "Effectuée",
  cancelled: "Annulée",
};

export const distributionStatusStyles: Record<DistributionStatus, string> = {
  draft: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-surface text-muted",
};

export function isDistributionStatus(v: unknown): v is DistributionStatus {
  return typeof v === "string" && (distributionStatuses as string[]).includes(v);
}

// ---------------------------------------------------------------------------
// Droits par rôle — règle PROVISOIRE (les droits exacts restent à confirmer, voir notes techniques).
//  - consulter : tout membre actif ;
//  - préparer un brouillon : owner, admin, manager, member ;
//  - valider (sortie de stock) ou annuler un brouillon : owner, admin, manager ;
//  - annuler une distribution déjà effectuée (remise en stock) : owner, admin.

export const canPrepareDistribution = (role: string) => ["owner", "admin", "manager", "member"].includes(role);
export const canValidateDistribution = (role: string) => ["owner", "admin", "manager"].includes(role);
export const canReverseDistribution = (role: string) => ["owner", "admin"].includes(role);

// ---------------------------------------------------------------------------
// Quantités : numeric(14,3) en base. On compare en millièmes entiers pour éviter les erreurs
// d'arrondi des nombres à virgule.

export const toMilli = (q: number | string) => Math.round(Number(q) * 1000);

const qtyFmt = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 });
export const formatQty = (q: number | string) => qtyFmt.format(Number(q));

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
/** `AAAA-MM-JJ` (colonne date) → « 3 nov. 2026 ». */
export const formatDay = (iso: string) => dateFmt.format(new Date(`${iso}T00:00:00Z`));

// ---------------------------------------------------------------------------
// Données échangées avec les écrans

export type FormOptions = {
  beneficiaries: { id: string; label: string }[];
  warehouses: { id: string; name: string }[];
  products: { id: string; name: string; unit: string; category: string }[];
  /** Stock disponible : stock[warehouseId][productId] = quantité. */
  stock: Record<string, Record<string, number>>;
  /** Demandes d'aide approuvées, avec leurs articles (pour pré-remplir). */
  aidRequests: {
    id: string;
    reference: string;
    beneficiaryId: string;
    beneficiaryLabel: string;
    items: { productId: string; quantity: number }[];
  }[];
};

export type DistributionInput = {
  beneficiaryId: string;
  warehouseId: string;
  aidRequestId: string | null;
  distributedOn: string;
  note: string;
  lines: { productId: string; quantity: string }[];
};

export type ActionResult = { ok: true; message?: string } | { ok: false; message: string; errors?: Record<string, string> };
