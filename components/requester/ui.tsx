import type { SubmissionStatus } from "@/lib/online-requests-shared";
import { requesterStatusLabels, requesterStatusStyles } from "@/lib/requester-shared";

// Les dates sont formatées côté serveur, en UTC comme le reste de l'application.
export const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
export const dateTimeFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

export function RequesterStatusBadge({ status }: { status: SubmissionStatus }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${requesterStatusStyles[status]}`}>
      {requesterStatusLabels[status]}
    </span>
  );
}
