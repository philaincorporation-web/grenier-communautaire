"use client";

import { useState, useTransition } from "react";
import { LoaderCircle } from "lucide-react";
import { updateOnlineRequestStatus } from "@/lib/actions/online-requests";
import {
  statusActions,
  statuses,
  type SubmissionStatus,
  type WorkflowType,
} from "@/lib/online-requests-shared";

/** Boutons pour faire passer une demande dans un autre statut. */
export function StatusActions({ type, id, status }: { type: WorkflowType; id: string; status: SubmissionStatus }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<SubmissionStatus | null>(null);

  function change(next: SubmissionStatus) {
    setError(null);
    setTarget(next);
    startTransition(async () => {
      try {
        const res = await updateOnlineRequestStatus(type, id, next);
        if (!res.ok) setError(res.message);
      } catch {
        setError("Le changement n'a pas pu être enregistré. Réessayez.");
      }
    });
  }

  // Un statut déjà atteint n'est pas proposé ; « Rouvrir » n'a de sens que depuis traitée/archivée.
  const choices = statuses.filter((s) => s !== status && !(s === "new" && status === "in_progress"));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {choices.map((s) => (
          <button
            key={s}
            type="button"
            disabled={pending}
            onClick={() => change(s)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${
              s === "processed"
                ? "border-green-600 bg-green-600 text-white hover:bg-green-700"
                : "border-line bg-white text-ink hover:border-brand hover:text-brand"
            }`}
          >
            {pending && target === s && <LoaderCircle className="size-3.5 animate-spin" />}
            {statusActions[s]}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
