"use client";

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { CircleCheck, LoaderCircle, TriangleAlert } from "lucide-react";
import { saveRelais, setRelaisActive } from "@/lib/actions/relais";
import { validateRelais, type RelaisInput, type RelaisResult } from "@/lib/relais-shared";

const field = "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
const label = "mb-1.5 block text-sm font-semibold";

export function RelaisForm({
  id,
  initial,
  members,
}: {
  id?: string;
  initial?: RelaisInput;
  members: { id: string; name: string; role: string }[];
}) {
  const [v, setV] = useState<RelaisInput>(initial ?? { name: "", code: "", address: "", managerMembershipId: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ids = useId();
  const set = (k: keyof RelaisInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV((x) => ({ ...x, [k]: e.target.value }));
  const err = (k: string) => (errors[k] ? <p className="mt-1 text-xs font-medium text-red-600">{errors[k]}</p> : null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const local = validateRelais(v);
    setErrors(local);
    setMessage(null);
    if (Object.keys(local).length) return;
    startTransition(async () => {
      const r = await saveRelais(id ?? null, v);
      if (r && !r.ok) {
        setMessage(r.message);
        setErrors(r.errors ?? {});
      }
    });
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5 rounded-xl border border-line bg-white p-5 sm:p-6">
      {message && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" /> {message}
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-[1fr_10rem]">
        <div>
          <label htmlFor={`${ids}-name`} className={label}>
            Nom du relais <span className="text-brand">*</span>
          </label>
          <input id={`${ids}-name`} value={v.name} onChange={set("name")} maxLength={160} className={field} />
          {err("name")}
        </div>
        <div>
          <label htmlFor={`${ids}-code`} className={label}>
            Code
          </label>
          <input id={`${ids}-code`} value={v.code} onChange={set("code")} maxLength={60} placeholder="REL-EST" className={`${field} uppercase`} />
          {err("code")}
        </div>
        <div className="md:col-span-2">
          <label htmlFor={`${ids}-address`} className={label}>
            Adresse ou quartier
          </label>
          <input id={`${ids}-address`} value={v.address} onChange={set("address")} maxLength={500} className={field} />
          {err("address")}
        </div>
        <div className="md:col-span-2">
          <label htmlFor={`${ids}-manager`} className={label}>
            Responsable
          </label>
          <select id={`${ids}-manager`} value={v.managerMembershipId} onChange={set("managerMembershipId")} className={field}>
            <option value="">Aucun</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          {err("managerMembershipId")}
        </div>
      </div>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link href="/tableau-de-bord/relais" className="rounded-lg border border-line bg-white px-5 py-2.5 text-center text-sm font-semibold hover:border-brand">
          Annuler
        </Link>
        <button type="submit" disabled={pending} className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
          {pending && <LoaderCircle className="size-4 animate-spin" />} {id ? "Enregistrer" : "Créer le relais"}
        </button>
      </div>
    </form>
  );
}

export function RelaisActiveToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const [result, setResult] = useState<RelaisResult | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();
  const run = () =>
    startTransition(async () => {
      try {
        const r = await setRelaisActive(id, !isActive);
        setResult(r);
        if (r.ok) setConfirm(false);
      } catch {
        setResult({ ok: false, message: "L'opération n'a pas pu aboutir. Réessayez." });
      }
    });
  return (
    <div className="space-y-3 rounded-xl border border-line bg-white p-5">
      <h2 className="font-bold">Statut</h2>
      {result?.message && (
        <p role={result.ok ? "status" : "alert"} className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm ${result.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
          {result.ok ? <CircleCheck className="mt-0.5 size-4 shrink-0" /> : <TriangleAlert className="mt-0.5 size-4 shrink-0" />}
          {result.message}
        </p>
      )}
      <p className="text-sm text-muted">{isActive ? "Ce relais est actif : il est proposé pour les dons et les distributions." : "Ce relais est désactivé."}</p>
      {confirm ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={pending} onClick={run} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${isActive ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}>
            {pending && <LoaderCircle className="size-4 animate-spin" />} Confirmer
          </button>
          <button type="button" onClick={() => setConfirm(false)} className="rounded-lg border border-line px-4 py-2 text-sm font-semibold hover:border-brand">
            Retour
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirm(true)} className={`rounded-lg border border-line px-4 py-2 text-sm font-semibold ${isActive ? "text-red-700 hover:border-red-300" : "text-green-700 hover:border-green-300"}`}>
          {isActive ? "Désactiver le relais" : "Réactiver le relais"}
        </button>
      )}
    </div>
  );
}
