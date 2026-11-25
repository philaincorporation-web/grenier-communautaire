"use client";

import { useState, useTransition } from "react";
import { CircleCheck, LoaderCircle, TriangleAlert } from "lucide-react";
import { setBeneficiaryActive } from "@/lib/actions/beneficiaries";
import type { BeneficiaryResult } from "@/lib/beneficiaries-shared";

/** Désactiver / réactiver un bénéficiaire (jamais de suppression : l'historique est conservé). */
export function BeneficiaryActiveToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const [confirm, setConfirm] = useState(false);
  const [result, setResult] = useState<BeneficiaryResult | null>(null);
  const [pending, startTransition] = useTransition();

  const run = () =>
    startTransition(async () => {
      setResult(null);
      try {
        const r = await setBeneficiaryActive(id, !isActive);
        setResult(r);
        if (r.ok) setConfirm(false);
      } catch {
        setResult({ ok: false, message: "L'opération n'a pas pu aboutir. Réessayez." });
      }
    });

  const btn = "inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60";

  return (
    <div className="space-y-3">
      {result?.message && (
        <p role={result.ok ? "status" : "alert"} className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm ${result.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
          {result.ok ? <CircleCheck className="mt-0.5 size-4 shrink-0" /> : <TriangleAlert className="mt-0.5 size-4 shrink-0" />}
          {result.message}
        </p>
      )}
      {confirm ? (
        <div className="space-y-3 rounded-lg border border-line bg-surface p-3">
          <p className="text-sm">
            {isActive
              ? "Ce bénéficiaire ne sera plus proposé pour les nouvelles distributions. Son historique est conservé."
              : "Ce bénéficiaire sera de nouveau proposé pour les distributions."}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" disabled={pending} onClick={run} className={`${btn} ${isActive ? "bg-red-600 text-white hover:bg-red-700" : "bg-green-600 text-white hover:bg-green-700"}`}>
              {pending && <LoaderCircle className="size-4 animate-spin" />} Confirmer
            </button>
            <button type="button" disabled={pending} onClick={() => setConfirm(false)} className={`${btn} border border-line bg-white hover:border-brand`}>
              Retour
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirm(true)}
          className={`${btn} border border-line bg-white ${isActive ? "text-red-700 hover:border-red-300" : "text-green-700 hover:border-green-300"}`}
        >
          {isActive ? "Désactiver" : "Réactiver"}
        </button>
      )}
    </div>
  );
}
