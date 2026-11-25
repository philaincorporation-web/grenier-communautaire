"use client";

import Link from "next/link";
import { useId, useMemo, useRef, useState, useTransition } from "react";
import { Globe, LoaderCircle, Plus, Trash, TriangleAlert } from "lucide-react";
import { createAidRequest } from "@/lib/actions/aid-requests";
import type { AidFormOptions, OnlinePrefill } from "@/lib/aid-requests";
import type { BeneficiaryInput } from "@/lib/beneficiaries-shared";

type Line = { key: number; productId: string; quantity: string };
const field = "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
const label = "mb-1.5 block text-sm font-semibold";

export function AidRequestForm({
  options,
  today,
  initialBeneficiaryId,
  online,
}: {
  options: AidFormOptions;
  today: string;
  initialBeneficiaryId?: string;
  online?: OnlinePrefill | null;
}) {
  const [pending, startTransition] = useTransition();
  const ids = useId();
  const [mode, setMode] = useState<"existing" | "new">(online ? (online.match ? "existing" : "new") : "existing");
  const [beneficiaryId, setBeneficiaryId] = useState(
    online?.match?.id ?? (initialBeneficiaryId && options.beneficiaries.some((b) => b.id === initialBeneficiaryId) ? initialBeneficiaryId : ""),
  );
  const [nb, setNb] = useState<BeneficiaryInput>({
    beneficiaryType: online && (online.householdSize ?? 1) > 1 ? "household" : "individual",
    displayName: online?.fullName ?? "",
    phone: online?.phone ?? "",
    email: online?.email ?? "",
    address: online?.address ?? "",
    householdSize: online?.householdSize ? String(online.householdSize) : "",
    notes: "",
  });
  const [requestedOn, setRequestedOn] = useState(online ? online.createdAt.slice(0, 10) : today);
  const [note, setNote] = useState(
    online ? [`Demande reçue en ligne ${online.reference}.`, online.needs.length ? `Besoins exprimés : ${online.needs.join(", ")}.` : "", online.message ? `Message : ${online.message}` : ""].filter(Boolean).join("\n") : "",
  );
  const [lines, setLines] = useState<Line[]>([{ key: 0, productId: "", quantity: "" }]);
  const keyRef = useRef(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  const byCategory = useMemo(() => {
    const g = new Map<string, AidFormOptions["products"]>();
    for (const p of options.products) g.set(p.category, [...(g.get(p.category) ?? []), p]);
    return [...g.entries()];
  }, [options.products]);
  const unitOf = (id: string) => options.products.find((p) => p.id === id)?.unit ?? "";
  const updateLine = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setMessage(null);
    startTransition(async () => {
      const res = await createAidRequest({
        beneficiaryId: mode === "existing" ? beneficiaryId : "",
        newBeneficiary: online && mode === "new" ? nb : null,
        onlineRequestId: online?.id ?? null,
        requestedOn,
        generalNote: note,
        lines: lines.filter((l) => l.productId || l.quantity).map(({ productId, quantity }) => ({ productId, quantity })),
      });
      if (res && !res.ok) {
        setMessage(res.message);
        setErrors(res.errors ?? {});
      }
    });
  }

  const err = (k: string) => (errors[k] ? <p className="mt-1 text-xs font-medium text-red-600">{errors[k]}</p> : null);
  const nbField = (k: keyof BeneficiaryInput, text: string, type = "text") => (
    <div>
      <label htmlFor={`${ids}-nb-${k}`} className={label}>
        {text}
      </label>
      <input id={`${ids}-nb-${k}`} type={type} value={nb[k]} onChange={(e) => setNb((v) => ({ ...v, [k]: e.target.value }))} className={field} />
      {err(`nb.${k}`)}
    </div>
  );

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      {message && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" /> {message}
        </p>
      )}

      {online && (
        <section className="rounded-xl border border-blue-200 bg-blue-50/60 p-5 sm:p-6">
          <h2 className="flex items-center gap-2 font-bold">
            <Globe className="size-4 text-blue-700" /> Demande reçue en ligne · <span className="font-mono">{online.reference}</span>
          </h2>
          <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            <div>
              <dt className="inline text-muted">Nom : </dt>
              <dd className="inline font-medium">{online.fullName}</dd>
            </div>
            <div>
              <dt className="inline text-muted">Téléphone : </dt>
              <dd className="inline font-medium">{online.phone}</dd>
            </div>
            {online.householdSize && (
              <div>
                <dt className="inline text-muted">Foyer : </dt>
                <dd className="inline font-medium">{online.householdSize} personne(s)</dd>
              </div>
            )}
            <div>
              <dt className="inline text-muted">Besoins : </dt>
              <dd className="inline font-medium">{online.needs.join(", ") || "—"}</dd>
            </div>
          </dl>
          {online.message && <p className="mt-3 whitespace-pre-wrap break-words rounded-lg bg-white px-3 py-2 text-sm">{online.message}</p>}
        </section>
      )}

      <section className="rounded-xl border border-line bg-white p-5 sm:p-6">
        <h2 className="font-bold">Bénéficiaire</h2>
        {online && (
          <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Bénéficiaire">
            {(["existing", "new"] as const).map((m) => (
              <label key={m} className="cursor-pointer">
                <input type="radio" name="mode" checked={mode === m} onChange={() => setMode(m)} className="peer sr-only" />
                <span className="block rounded-lg border border-line px-4 py-2 text-sm font-semibold peer-checked:border-brand peer-checked:bg-brand-soft peer-checked:text-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand/30">
                  {m === "existing" ? "Bénéficiaire existant" : "Créer un nouveau bénéficiaire"}
                </span>
              </label>
            ))}
          </div>
        )}
        {online?.match && mode === "existing" && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Un bénéficiaire actif a le même numéro : {online.match.label}. Il a été présélectionné.</p>
        )}
        {mode === "existing" ? (
          <div className="mt-4">
            <label htmlFor={`${ids}-benef`} className={label}>
              Bénéficiaire <span className="text-brand">*</span>
            </label>
            <select id={`${ids}-benef`} value={beneficiaryId} onChange={(e) => setBeneficiaryId(e.target.value)} className={field}>
              <option value="" disabled>
                Choisir…
              </option>
              {options.beneficiaries.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
            {err("beneficiaryId")}
            {!online && (
              <p className="mt-1 text-xs text-muted">
                Absent de la liste ?{" "}
                <Link href="/tableau-de-bord/beneficiaires/nouveau" className="font-semibold text-brand hover:underline">
                  Enregistrer un bénéficiaire
                </Link>
              </p>
            )}
          </div>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <span className={label}>Type</span>
              <div className="flex flex-wrap gap-2">
                {(["household", "individual"] as const).map((t) => (
                  <label key={t} className="cursor-pointer">
                    <input type="radio" name="nbType" checked={nb.beneficiaryType === t} onChange={() => setNb((v) => ({ ...v, beneficiaryType: t }))} className="peer sr-only" />
                    <span className="block rounded-lg border border-line px-3 py-1.5 text-sm font-semibold peer-checked:border-brand peer-checked:bg-brand-soft peer-checked:text-brand">
                      {t === "household" ? "Foyer" : "Personne seule"}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            {nbField("displayName", nb.beneficiaryType === "household" ? "Nom de la famille *" : "Nom et prénom *")}
            {nb.beneficiaryType === "household" ? nbField("householdSize", "Personnes au foyer") : <div />}
            {nbField("phone", "Téléphone", "tel")}
            {nbField("email", "E-mail", "email")}
            <div className="md:col-span-2">{nbField("address", "Adresse ou quartier")}</div>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold">Articles demandés</h2>
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

      <section className="grid gap-4 rounded-xl border border-line bg-white p-5 sm:p-6 md:grid-cols-[12rem_1fr]">
        <div>
          <label htmlFor={`${ids}-date`} className={label}>
            Date de la demande <span className="text-brand">*</span>
          </label>
          <input id={`${ids}-date`} type="date" value={requestedOn} max={today} onChange={(e) => setRequestedOn(e.target.value)} className={field} />
          {err("requestedOn")}
        </div>
        <div>
          <label htmlFor={`${ids}-note`} className={label}>
            Situation et remarques
          </label>
          <textarea id={`${ids}-note`} rows={4} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} className={field} />
          {err("generalNote")}
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link href={online ? "/tableau-de-bord/demandes-en-ligne" : "/tableau-de-bord/demandes"} className="rounded-lg border border-line bg-white px-5 py-2.5 text-center text-sm font-semibold hover:border-brand">
          Annuler
        </Link>
        <button type="submit" disabled={pending} className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
          {pending && <LoaderCircle className="size-4 animate-spin" />}
          {online ? "Convertir en demande d'aide" : "Enregistrer la demande"}
        </button>
      </div>
    </form>
  );
}
