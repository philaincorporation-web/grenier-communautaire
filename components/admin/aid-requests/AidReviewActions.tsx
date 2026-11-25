"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CircleCheck, LoaderCircle, Truck, TriangleAlert } from "lucide-react";
import { approveAidRequest, cancelAidRequest, rejectAidRequest, startAidReview } from "@/lib/actions/aid-requests";
import { canCancelAid, canDecide, canStartReview, type AidResult, type AidStatus } from "@/lib/aid-requests-shared";
import { formatQty } from "@/lib/distributions-shared";

const btn = "inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60";
const input = "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

type Item = { productId: string; name: string; unit: string; requested: number };
type Mode = "idle" | "approve" | "reject" | "cancel";

/** Instruction d'une demande d'aide. Les droits et transitions sont revérifiés côté serveur. */
export function AidReviewActions({ id, status, items, canReview, canPrepare }: { id: string; status: AidStatus; items: Item[]; canReview: boolean; canPrepare: boolean }) {
  const [mode, setMode] = useState<Mode>("idle");
  const [note, setNote] = useState("");
  const [qty, setQty] = useState<Record<string, string>>(() => Object.fromEntries(items.map((i) => [i.productId, String(i.requested)])));
  const [result, setResult] = useState<AidResult | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<AidResult>) =>
    startTransition(async () => {
      setResult(null);
      try {
        const r = await fn();
        setResult(r);
        if (r.ok) {
          setMode("idle");
          setNote("");
        }
      } catch {
        setResult({ ok: false, message: "L'opération n'a pas pu aboutir. Réessayez." });
      }
    });

  const feedback = result?.message && (
    <p role={result.ok ? "status" : "alert"} className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm ${result.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
      {result.ok ? <CircleCheck className="mt-0.5 size-4 shrink-0" /> : <TriangleAlert className="mt-0.5 size-4 shrink-0" />}
      {result.message}
    </p>
  );
  const back = (
    <button type="button" disabled={pending} onClick={() => setMode("idle")} className={`${btn} border border-line bg-white hover:border-brand`}>
      Retour
    </button>
  );

  if (status === "approved" && canPrepare && mode === "idle") {
    return (
      <div className="space-y-3">
        {feedback}
        <Link href={`/tableau-de-bord/distributions/nouvelle?demande=${id}`} className={`${btn} bg-brand text-white hover:bg-brand-dark`}>
          <Truck className="size-4" /> Préparer la distribution
        </Link>
        {canReview && canCancelAid(status) && (
          <button type="button" onClick={() => setMode("cancel")} className={`${btn} border border-line bg-white text-red-700 hover:border-red-300`}>
            Annuler la demande
          </button>
        )}
      </div>
    );
  }
  if (!canReview) return feedback || <p className="text-sm text-muted">L&apos;instruction de la demande est réservée à la gestion.</p>;

  if (mode === "approve") {
    return (
      <div className="space-y-3">
        {feedback}
        <p className="text-sm font-semibold">Quantités accordées</p>
        <ul className="space-y-2">
          {items.map((i) => (
            <li key={i.productId} className="grid grid-cols-[1fr_6.5rem] items-center gap-2 text-sm">
              <label htmlFor={`qa-${i.productId}`}>
                {i.name} <span className="text-xs text-muted">(demandé : {formatQty(i.requested)} {i.unit})</span>
              </label>
              <input id={`qa-${i.productId}`} inputMode="decimal" value={qty[i.productId] ?? ""} onChange={(e) => setQty((q) => ({ ...q, [i.productId]: e.target.value }))} className={input} />
            </li>
          ))}
        </ul>
        <label className="block text-sm font-semibold">
          Commentaire <span className="font-normal text-muted">(facultatif)</span>
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} className={`${input} mt-1`} />
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" disabled={pending} onClick={() => run(() => approveAidRequest(id, qty, note))} className={`${btn} bg-green-600 text-white hover:bg-green-700`}>
            {pending && <LoaderCircle className="size-4 animate-spin" />} Approuver
          </button>
          {back}
        </div>
      </div>
    );
  }
  if (mode === "reject" || mode === "cancel") {
    const reject = mode === "reject";
    return (
      <div className="space-y-3">
        {feedback}
        <label className="block text-sm font-semibold">
          Motif {reject ? <span className="text-brand">*</span> : <span className="font-normal text-muted">(facultatif)</span>}
          <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={reject ? 2000 : 500} className={`${input} mt-1`} />
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            disabled={pending || (reject && !note.trim())}
            onClick={() => run(() => (reject ? rejectAidRequest(id, note) : cancelAidRequest(id, note)))}
            className={`${btn} bg-red-600 text-white hover:bg-red-700`}
          >
            {pending && <LoaderCircle className="size-4 animate-spin" />} {reject ? "Refuser la demande" : "Annuler la demande"}
          </button>
          {back}
        </div>
      </div>
    );
  }

  const any = canStartReview(status) || canDecide(status) || canCancelAid(status);
  return (
    <div className="space-y-3">
      {feedback}
      {canStartReview(status) && (
        <button type="button" disabled={pending} onClick={() => run(() => startAidReview(id))} className={`${btn} border border-line bg-white hover:border-brand`}>
          {pending && <LoaderCircle className="size-4 animate-spin" />} Prendre en charge
        </button>
      )}
      {canDecide(status) && (
        <>
          <button type="button" onClick={() => setMode("approve")} className={`${btn} bg-brand text-white hover:bg-brand-dark`}>
            Approuver…
          </button>
          <button type="button" onClick={() => setMode("reject")} className={`${btn} border border-line bg-white text-red-700 hover:border-red-300`}>
            Refuser…
          </button>
        </>
      )}
      {canCancelAid(status) && (
        <button type="button" onClick={() => setMode("cancel")} className="w-full text-sm font-semibold text-muted hover:text-red-700">
          Annuler la demande
        </button>
      )}
      {!any && !feedback && <p className="text-sm text-muted">Aucune action possible pour une demande {status === "fulfilled" ? "satisfaite" : status === "rejected" ? "refusée" : "annulée"}.</p>}
    </div>
  );
}
