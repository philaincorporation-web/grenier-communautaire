// Constantes et types de « Mon espace » (suivi des demandes par le demandeur).
// Aucun accès base de données ici : importé aussi par des composants client.

import type { SubmissionStatus, WorkflowType } from "@/lib/online-requests-shared";

export const MESSAGE_MAX = 4000;

/** Messages qu'un demandeur peut envoyer par heure (tous fils confondus). */
export const REQUESTER_MESSAGES_PER_HOUR = 20;

export const requestTypeLabels: Record<WorkflowType, string> = {
  aide: "Demande d'aide",
  benevoles: "Candidature bénévole",
  messages: "Message",
};

/** Libellés du statut vus par le demandeur (formulés de son point de vue). */
export const requesterStatusLabels: Record<SubmissionStatus, string> = {
  new: "Reçue",
  in_progress: "En cours de traitement",
  processed: "Traitée",
  archived: "Clôturée",
};

export const requesterStatusStyles: Record<SubmissionStatus, string> = {
  new: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  processed: "bg-green-100 text-green-700",
  archived: "bg-surface text-muted",
};

/** Décision sur une demande d'aide instruite (table aid_requests), vue par le demandeur. */
export const aidDecisionLabels: Record<string, string> = {
  submitted: "En cours d'examen",
  under_review: "En cours d'examen",
  approved: "Accordée",
  rejected: "Non retenue",
  fulfilled: "Aide remise",
  cancelled: "Annulée",
};

/** Nouvelles demandes que le demandeur peut déposer : il précise le type en choisissant le formulaire. */
export const newRequestLinks: { type: WorkflowType; label: string; href: string; description: string }[] = [
  { type: "aide", label: "Demander une aide", href: "/demander-une-aide", description: "Aide alimentaire ou matérielle pour votre foyer." },
  { type: "benevoles", label: "Devenir bénévole", href: "/benevolat", description: "Proposer votre temps et vos compétences." },
  { type: "messages", label: "Nous écrire", href: "/contact", description: "Une question, une suggestion, un partenariat." },
];

export const requestHref = (type: WorkflowType, id: string) => `/mon-espace/demandes/${type}/${id}`;

export type MyRequestRow = {
  type: WorkflowType;
  id: string;
  title: string;
  reference?: string;
  status: SubmissionStatus;
  createdAt: string; // ISO
  lastActivityAt: string; // ISO
  unread: number;
};

export type TimelineEvent = {
  id: string;
  kind: "created" | "message" | "status";
  author: "staff" | "requester";
  body?: string;
  status?: SubmissionStatus;
  createdAt: string; // ISO
};

export type NotificationRow = {
  id: string;
  type: WorkflowType;
  requestId: string;
  requestTitle: string;
  kind: "message" | "status";
  status?: SubmissionStatus;
  createdAt: string; // ISO
  read: boolean;
};
