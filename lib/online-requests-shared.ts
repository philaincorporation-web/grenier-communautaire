// Constantes et types partagés (serveur ET client) de la section « Demandes en ligne ».
// Aucun accès base de données ici : ce fichier est importé par des composants client.

export type RequestType = "aide" | "benevoles" | "messages" | "newsletter";
/** Types qui ont un cycle de traitement (la newsletter est une simple liste). */
export type WorkflowType = Exclude<RequestType, "newsletter">;
export type SubmissionStatus = "new" | "in_progress" | "processed" | "archived";

export const requestTabs: { id: RequestType; label: string }[] = [
  { id: "aide", label: "Demandes d'aide" },
  { id: "benevoles", label: "Bénévoles" },
  { id: "messages", label: "Messages" },
  { id: "newsletter", label: "Newsletter" },
];

export const statuses: SubmissionStatus[] = ["new", "in_progress", "processed", "archived"];

export const statusLabels: Record<SubmissionStatus, string> = {
  new: "Nouvelle",
  in_progress: "En cours",
  processed: "Traitée",
  archived: "Archivée",
};

export const statusStyles: Record<SubmissionStatus, string> = {
  new: "bg-brand-soft text-brand",
  in_progress: "bg-amber-100 text-amber-700",
  processed: "bg-green-100 text-green-700",
  archived: "bg-surface text-muted",
};

/** Libellé de l'action qui fait passer une demande dans ce statut. */
export const statusActions: Record<SubmissionStatus, string> = {
  new: "Rouvrir",
  in_progress: "Prendre en charge",
  processed: "Marquer comme traitée",
  archived: "Archiver",
};

export function isWorkflowType(v: unknown): v is WorkflowType {
  return v === "aide" || v === "benevoles" || v === "messages";
}

export function isStatus(v: unknown): v is SubmissionStatus {
  return typeof v === "string" && (statuses as string[]).includes(v);
}

/**
 * Qui peut lire et traiter les demandes en ligne. Ces données sont personnelles (familles en
 * difficulté) : on les réserve à la gestion. Règle PROVISOIRE — les droits exacts par rôle
 * restent à confirmer (voir les notes techniques).
 */
export const ONLINE_REQUESTS_ROLES = ["owner", "admin", "manager"] as const;

export function canManageOnlineRequests(role: string): boolean {
  return (ONLINE_REQUESTS_ROLES as readonly string[]).includes(role);
}

// Données affichées

export type OnlineRow = {
  id: string;
  type: WorkflowType;
  createdAt: string; // ISO
  status: SubmissionStatus;
  title: string;
  reference?: string;
  email?: string;
  phone?: string;
  fields: { label: string; value: string }[];
  message?: string;
  /** Demande d'aide déjà convertie en aid_request. */
  converted?: boolean;
};

export type SubscriberRow = { id: string; email: string; subscribedAt: string; active: boolean };
