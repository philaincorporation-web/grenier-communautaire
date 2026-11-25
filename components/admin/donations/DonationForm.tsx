"use client";

import Link from "next/link";
import { useId, useMemo, useRef, useState, useTransition } from "react";
import { LoaderCircle, Plus, Trash, TriangleAlert } from "lucide-react";
import { registerDonation } from "@/lib/actions/donations";
import type { DonationFormOptions } from "@/lib/donations";
import { donorTypeLabels, type DonorType } from "@/lib/donations-shared";

type Line = { key: number; productId: string; quantity: string };
const field = "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
const label = "mb-1.5 block text-sm font-semibold";

/** Réception d'un don : les articles entrent en stock dès l'enregistrement. */
export function DonationForm({ options, today }: { options: DonationFormOptions; today: string }) {
  const [pending, startTransition] = useTransition();
  const ids = useId();
  const [mode, setMode] = useState<"existing" | "new">(options.donors.length ? "existing" : "new");
  const [donorId, setDonorId] = useState("");
  const [nd, setNd] = useState({ donorType: "individual" as DonorType, displayName: "", phone: "", email: "" });
  const [warehouseId, setWarehouseId] = useState(options.warehouses[0]?.id ?? "");
  const [receivedOn, setReceivedOn] = useState(today);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([{ key: 0, productId: "", quantity: "" }]);
  const keyRef = useRef(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  const byCategory = useMemo(() => {
    const g = new Map<string, DonationFormOptions["products"]>();
    for (const p of options.products) g.set(p.category, [...(g.get(p.category) ?? []), p]);
    return [...g.entries()];
  }, [options.products]);
  const unitOf = (id: string) => options.products.find((p) => p.id === id)?.unit ?? "";
  const updateLine = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const err = (k: string) => (errors[k] ? <p className="mt-1 text-xs font-medium text-red-600">{errors[k]}</p> : null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setMessage(null);
    startTransition(async () => {
      const res = await registerDonation({
        donorId: mode === "existing" ? donorId : "",
        newDonor: mode === "new" ? nd : null,
        warehouseId,
        receivedOn,
        notes,
        lines: lines.filter((l) => l.productId || l.quantity).map(({ productId, quantity }) => ({ productId, quantity })),
      });
      if (res && !res.ok) {
        setMessage(res.message);
        setErrors(res.errors ?? {});
      }
    });
  }

  if (!options.warehouses.length || !options.products.length) {
    return <p className="rounded-xl border border-dashed border-line bg-white px-6 py-10 text-center text-sm text-muted">Il faut au moins un dépôt actif et un produit pour enregistrer un don (voir Relais et Paramètres).</p>;
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      {message && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" /> {message}
        </p>
      )}

      <section className="rounded-xl border border-line bg-white p-5 sm:p-6">
        <h2 className="font-bold">Donateur</h2>
        <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Donateur">
          {(["existing", "new"] as const).map((m) => (
            <label key={m} className="cursor-pointer">
              <input type="radio" name="donorMode" checked={mode === m} onChange={() => setMode(m)} disabled={m === "existing" && !options.donors.length} className="peer sr-only" />
              <span className="block rounded-lg border border-line px-4 py-2 text-sm font-semibold peer-checked:border-brand peer-checked:bg-brand-soft peer-checked:text-brand peer-disabled:opacity-50 peer-focus-visible:ring-2 peer-focus-visible:ring-brand/30">
                {m === "existing" ? "Donateur connu" : "Nouveau donateur"}
              </span>
            </label>
          ))}
        </div>
        {mode === "existing" ? (
          <div className="mt-4">
            <label htmlFor={`${ids}-donor`} className={label}>
              Donateur <span className="text-brand">*</span>
            </label>
            <select id={`${ids}-donor`} value={donorId} onChange={(e) => setDonorId(e.target.value)} className={field}>
              <option value="" disabled>
                Choisir…
              </option>
              {options.donors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
            {err("donorId")}
          </div>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2 flex flex-wrap gap-2">
              {(Object.keys(donorTypeLabels) as DonorType[]).map((t) => (
                <label key={t} className="cursor-pointer">
                  <input type="radio" name="ndType" checked={nd.donorType === t} onChange={() => setNd((v) => ({ ...v, donorType: t }))} className="peer sr-only" />
                  <span className="block rounded-lg border border-line px-3 py-1.5 text-sm font-semibold peer-checked:border-brand peer-checked:bg-brand-soft peer-checked:text-brand">{donorTypeLabels[t]}</span>
                </label>
              ))}
            </div>
            <div className="md:col-span-2">
              <label htmlFor={`${ids}-ndname`} className={label}>
                {nd.donorType === "organization" ? "Nom de l'organisation" : "Nom et prénom"} <span className="text-brand">*</span>
              </label>
              <input id={`${ids}-ndname`} value={nd.displayName} onChange={(e) => setNd((v) => ({ ...v, displayName: e.target.value }))} maxLength={180} className={field} />
              {err("nd.displayName")}
            </div>
            <div>
              <label htmlFor={`${ids}-ndphone`} className={label}>
                Téléphone
              </label>
              <input id={`${ids}-ndphone`} type="tel" value={nd.phone} onChange={(e) => setNd((v) => ({ ...v, phone: e.target.value }))} className={field} />
              {err("nd.phone")}
            </div>
            <div>
              <label htmlFor={`${ids}-ndemail`} className={label}>
                E-mail
              </label>
              <input id={`${ids}-ndemail`} type="email" value={nd.email} onChange={(e) => setNd((v) => ({ ...v, email: e.target.value }))} className={field} />
              {err("nd.email")}
            </div>
          </div>
        )}
      </section>

      <section className="grid gap-4 rounded-xl border border-line bg-white p-5 sm:p-6 md:grid-cols-2">
        <div>
          <label htmlFor={`${ids}-wh`} className={label}>
            Dépôt de réception <span className="text-brand">*</span>
          </label>
          <select id={`${ids}-wh`} value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className={field}>
            {options.warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          {err("warehouseId")}
        </div>
        <div>
          <label htmlFor={`${ids}-date`} className={label}>
            Date de réception <span className="text-brand">*</span>
          </label>
          <input id={`${ids}-date`} type="date" value={receivedOn} max={today} onChange={(e) => setReceivedOn(e.target.value)} className={field} />
          {err("receivedOn")}
        </div>
      </section>

      <section className="rounded-xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold">Articles reçus</h2>
          <button type="button" onClick={() => setLines((ls) => [...ls, { key: keyRef.current++, productId: "", quantity: "" }])} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm font-semibold hover:border-brand hover:text-brand">
            <Plus className="size-4" /> Ajouter un article
          </button>
        </div>
        <ul className="mt-4 space-y-3">
          {lines.map((l, i) => {
            const used = new Set(lines.filter((o) => o.key !== l.key).map((o) => o.productId));
            return (
              <li key={l.key} className="grid gap-3 rounded-lg bg-surface p-3 sm:grid-cols-[1fr_9rem_auto] sm:items-center">
                <label className="sr-only" htmlFor={`${ids}-p${l.key}`}>
                  Produit {i + 1}
                </label>
                <select id={`${ids}-p${l.key}`} value={l.productId} onChange={(e) => updateLine(l.key, { productId: e.target.value })} className={field}>
                  <option value="" disabled>
                    Produit…
                  </option>
                  {byCategory.map(([cat, prods]) => (
                    <optgroup key={cat} label={cat}>
                      {prods.map((p) => (
                        <option key={p.id} value={p.id} disabled={used.has(p.id)}>
                          {p.name} ({p.unit})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <label className="sr-only" htmlFor={`${ids}-q${l.key}`}>
                    Quantité {i + 1}
                  </label>
                  <input id={`${ids}-q${l.key}`} inputMode="decimal" placeholder="Quantité" value={l.quantity} onChange={(e) => updateLine(l.key, { quantity: e.target.value })} className={field} />
                  <span className="w-10 shrink-0 text-xs text-muted">{unitOf(l.productId)}</span>
                </div>
                <button type="button" aria-label={`Retirer l'article ${i + 1}`} onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((o) => o.key !== l.key) : [{ key: keyRef.current++, productId: "", quantity: "" }]))} className="grid size-10 place-items-center justify-self-end rounded-lg text-muted hover:bg-white hover:text-red-600">
                  <Trash className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
        {err("lines")}
      </section>

      <section className="rounded-xl border border-line bg-white p-5 sm:p-6">
        <label htmlFor={`${ids}-notes`} className={label}>
          Remarques <span className="font-normal text-muted">(état, péremption, provenance…)</span>
        </label>
        <textarea id={`${ids}-notes`} rows={3} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} className={field} />
        {err("notes")}
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link href="/tableau-de-bord/dons" className="rounded-lg border border-line bg-white px-5 py-2.5 text-center text-sm font-semibold hover:border-brand">
          Annuler
        </Link>
        <button type="submit" disabled={pending} className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
          {pending && <LoaderCircle className="size-4 animate-spin" />} Enregistrer la réception
        </button>
      </div>
      <p className="text-right text-xs text-muted">Les articles entrent en stock dans le dépôt choisi dès l&apos;enregistrement.</p>
    </form>
  );
}
