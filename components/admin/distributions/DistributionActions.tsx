"use client";

import { useState, useTransition } from "react";
import { CircleCheck, LoaderCircle, TriangleAlert } from "lucide-react";
import { cancelDistribution, validateDistribution } from "@/lib/actions/distributions";
import type { ActionResult, DistributionStatus } from "@/lib/distributions-shared";

const btn = "inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60";
const input =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

type Mode = "idle" | "confirm-validate" | "confirm-cancel";

/** Actions de la fiche distribution. Les droits sont revérifiés côté serveur. */
export function DistributionActions({
  id,
  status,
  warehouse,
  lines,
  hasShortage,
  canValidate,
  canReverse,
}: {
  id: string;
  status: DistributionStatus;
  warehouse: string;
  lines: number;
  hasShortage: boolean;
  canValidate: boolean;
  canReverse: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<Mode>("idle");
  const [ack, setAck] = useState("");
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<ActionResult | null>(null);

  const run = (fn: () => Promise<ActionResult>) =>
    startTransition(async () => {
      setResult(null);
      try {
        const r = await fn();
        setResult(r);
        if (r.ok) setMode("idle");
      } catch {
        setResult({ ok: false, message: "L'opération n'a pas pu aboutir. Réessayez." });
      }
    });

  const feedback = result && (
    <p
      role={result.ok ? "status" : "alert"}
      className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm ${result.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}
    >
      {result.ok ? <CircleCheck className="mt-0.5 size-4 shrink-0" /> : <TriangleAlert className="mt-0.5 size-4 shrink-0" />}
      {result.message}
    </p>
  );

  // ----- Brouillon
  if (status === "draft") {
    if (!canValidate) {
      return <p className="text-sm text-muted">Un gestionnaire doit valider cette distribution pour sortir les articles du stock.</p>;
    }
    return (
      <div className="space-y-3">
        {feedback}
        {mode === "confirm-validate" ? (
          <div className="space-y-3 rounded-lg border border-brand/30 bg-brand-soft p-3">
            <p className="text-sm font-semibold text-ink">
              Confirmer la sortie de {lines} article{lines > 1 ? "s" : ""} du stock « {warehouse} » ?
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <button type="button" disabled={pending} onClick={() => run(() => validateDistribution(id, ack))} className={`${btn} bg-green-600 text-white hover:bg-green-700`}>
                {pending && <LoaderCircle className="size-4 animate-spin" />} Confirmer
              </button>
              <button type="button" disabled={pending} onClick={() => setMode("idle")} className={`${btn} border border-line bg-white hover:border-brand`}>
                Retour
              </button>
            </div>
          </div>
        ) : mode === "confirm-cancel" ? (
          <div className="space-y-3 rounded-lg border border-line bg-surface p-3">
            <label className="block text-sm font-semibold">
              Motif <span className="font-normal text-muted">(facultatif)</span>
              <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} className={`${input} mt-1`} />
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <button type="button" disabled={pending} onClick={() => run(() => cancelDistribution(id, reason))} className={`${btn} bg-red-600 text-white hover:bg-red-700`}>
                {pending && <LoaderCircle className="size-4 animate-spin" />} Annuler le brouillon
              </button>
              <button type="button" disabled={pending} onClick={() => setMode("idle")} className={`${btn} border border-line bg-white hover:border-brand`}>
                Retour
              </button>
            </div>
          </div>
        ) : (
          <>
            <label className="block text-sm font-semibold">
              Remis à <span className="font-normal text-muted">(facultatif)</span>
              <input
                value={ack}
                onChange={(e) => setAck(e.target.value)}
                maxLength={300}
                placeholder="Nom de la personne qui reçoit"
                className={`${input} mt-1`}
              />
            </label>
            {hasShortage && (
              <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" /> Stock insuffisant pour au moins un article : validation impossible pour le moment.
              </p>
            )}
            <button type="button" disabled={pending || hasShortage} onClick={() => setMode("confirm-validate")} className={`${btn} bg-brand text-white hover:bg-brand-dark`}>
              Valider la distribution
            </button>
            <button type="button" disabled={pending} onClick={() => setMode("confirm-cancel")} className={`${btn} border border-line bg-white text-red-700 hover:border-red-300`}>
              Annuler le brouillon
            </button>
          </>
        )}
      </div>
    );
  }

  // ----- Effectuée : annulation avec remise en stock
  if (status === "completed" && canReverse) {
    return (
      <div className="space-y-3">
        {feedback}
        {mode === "confirm-cancel" ? (
          <div className="space-y-3 rounded-lg border border-red-200 bg-red-50/50 p-3">
            <p className="text-sm text-ink">
              Les {lines} article{lines > 1 ? "s" : ""} seront remis dans le stock « {warehouse} » par un mouvement d&apos;annulation.
            </p>
            <label className="block text-sm font-semibold">
              Motif <span className="text-brand">*</span>
              <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} required className={`${input} mt-1`} />
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={pending || !reason.trim()}
                onClick={() => run(() => cancelDistribution(id, reason))}
                className={`${btn} bg-red-600 text-white hover:bg-red-700`}
              >
                {pending && <LoaderCircle className="size-4 animate-spin" />} Confirmer l&apos;annulation
              </button>
              <button type="button" disabled={pending} onClick={() => setMode("idle")} className={`${btn} border border-line bg-white hover:border-brand`}>
                Retour
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setMode("confirm-cancel")} className={`${btn} border border-line bg-white text-red-700 hover:border-red-300`}>
            Annuler la distribution
          </button>
        )}
      </div>
    );
  }

  return feedback || null;
}
