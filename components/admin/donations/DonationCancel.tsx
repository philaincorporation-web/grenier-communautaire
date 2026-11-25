"use client";

import { useState, useTransition } from "react";
import { CircleCheck, LoaderCircle, TriangleAlert } from "lucide-react";
import { cancelDonation } from "@/lib/actions/donations";
import type { DonationResult } from "@/lib/donations-shared";

const btn = "inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60";

/** Annulation d'un don reçu : les articles sont retirés du stock (contre-mouvement). */
export function DonationCancel({ id, warehouse }: { id: string; warehouse: string | null }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<DonationResult | null>(null);
  const [pending, startTransition] = useTransition();
  const run = () =>
    startTransition(async () => {
      setResult(null);
      try {
        const r = await cancelDonation(id, reason);
        setResult(r);
        if (r.ok) setOpen(false);
      } catch {
        setResult({ ok: false, message: "L'opération n'a pas pu aboutir. Réessayez." });
      }
    });
  return (
    <div className="space-y-3">
      {result?.message && (
        <p role={result.ok ? "status" : "alert"} className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm ${result.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
          {result.ok ? <CircleCheck className="mt-0.5 size-4 shrink-0" /> : <TriangleAlert className="mt-0.5 size-4 shrink-0" />}
          {result.message}
        </p>
      )}
      {open ? (
        <div className="space-y-3 rounded-lg border border-red-200 bg-red-50/50 p-3">
          <p className="text-sm">Les articles de ce don seront retirés du stock{warehouse ? ` « ${warehouse} »` : ""}.</p>
          <label className="block text-sm font-semibold">
            Motif <span className="text-brand">*</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" disabled={pending || !reason.trim()} onClick={run} className={`${btn} bg-red-600 text-white hover:bg-red-700`}>
              {pending && <LoaderCircle className="size-4 animate-spin" />} Confirmer l&apos;annulation
            </button>
            <button type="button" disabled={pending} onClick={() => setOpen(false)} className={`${btn} border border-line bg-white hover:border-brand`}>
              Retour
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className={`${btn} border border-line bg-white text-red-700 hover:border-red-300`}>
          Annuler ce don
        </button>
      )}
    </div>
  );
}
