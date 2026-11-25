"use client";

import Link from "next/link";
import { useId, useMemo, useRef, useState, useTransition } from "react";
import { LoaderCircle, Plus, Trash, TriangleAlert } from "lucide-react";
import { createDistribution } from "@/lib/actions/distributions";
import { formatQty, toMilli, type FormOptions } from "@/lib/distributions-shared";

type Line = { key: number; productId: string; quantity: string };

const field =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-surface";
const label = "mb-1.5 block text-sm font-semibold";


/** Formulaire « Nouvelle distribution » : enregistre un BROUILLON (le stock ne bouge qu'à la validation). */
export function DistributionForm({ options, today }: { options: FormOptions; today: string }) {
  const [pending, startTransition] = useTransition();
  const [aidRequestId, setAidRequestId] = useState("");
  const [beneficiaryId, setBeneficiaryId] = useState("");
  const [warehouseId, setWarehouseId] = useState(options.warehouses[0]?.id ?? "");
  const [distributedOn, setDistributedOn] = useState(today);
  const [note, setNote] = useState("");
  // Clés de lignes stables : 0 pour la première (identique serveur / navigateur), puis compteur local.
  const [lines, setLines] = useState<Line[]>([{ key: 0, productId: "", quantity: "" }]);
  const keyRef = useRef(1);
  const newLine = (productId = "", quantity = ""): Line => ({ key: keyRef.current++, productId, quantity });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const ids = useId();

  const productById = useMemo(() => new Map(options.products.map((p) => [p.id, p])), [options.products]);
  const byCategory = useMemo(() => {
    const groups = new Map<string, FormOptions["products"]>();
    for (const p of options.products) groups.set(p.category, [...(groups.get(p.category) ?? []), p]);
    return [...groups.entries()];
  }, [options.products]);

  const available = (productId: string) => options.stock[warehouseId]?.[productId] ?? 0;
  const isShort = (l: Line) => l.productId !== "" && l.quantity !== "" && toMilli(l.quantity.replace(",", ".")) > toMilli(available(l.productId));
  const shortages = lines.filter(isShort);
  const linkedRequest = options.aidRequests.find((r) => r.id === aidRequestId);

  function chooseRequest(id: string) {
    setAidRequestId(id);
    const req = options.aidRequests.find((r) => r.id === id);
    if (!req) return;
    setBeneficiaryId(req.beneficiaryId);
    if (req.items.length) setLines(req.items.map((i) => newLine(i.productId, String(i.quantity))));
  }

  const updateLine = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setMessage(null);
    startTransition(async () => {
      // En cas de succès, l'action redirige vers la fiche de la distribution.
      const res = await createDistribution({
        aidRequestId: aidRequestId || null,
        beneficiaryId,
        warehouseId,
        distributedOn,
        note,
        lines: lines.filter((l) => l.productId || l.quantity).map(({ productId, quantity }) => ({ productId, quantity })),
      });
      if (res && !res.ok) {
        setMessage(res.message);
        setErrors(res.errors ?? {});
      }
    });
  }

  if (options.beneficiaries.length === 0 || options.warehouses.length === 0 || options.products.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line bg-white px-6 py-10 text-center text-sm text-muted">
        Il faut au moins un bénéficiaire actif, un dépôt actif et un produit pour préparer une distribution.
      </p>
    );
  }

  const err = (k: string) =>
    errors[k] ? (
      <p id={`${ids}-${k}`} className="mt-1 text-xs font-medium text-red-600">
        {errors[k]}
      </p>
    ) : null;

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      {message && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" /> {message}
        </p>
      )}

      {/* Bénéficiaire */}
      <section className="rounded-xl border border-line bg-white p-5 sm:p-6">
        <h2 className="font-bold">Bénéficiaire</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor={`${ids}-req`} className={label}>
              Demande d&apos;aide approuvée <span className="font-normal text-muted">(facultatif)</span>
            </label>
            <select id={`${ids}-req`} value={aidRequestId} onChange={(e) => (e.target.value ? chooseRequest(e.target.value) : setAidRequestId(""))} className={field} aria-describedby={errors.aidRequestId ? `${ids}-aidRequestId` : undefined}>
              <option value="">Aucune — distribution directe</option>
              {options.aidRequests.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.reference} · {r.beneficiaryLabel}
                </option>
              ))}
            </select>
            {err("aidRequestId")}
            {options.aidRequests.length === 0 && <p className="mt-1 text-xs text-muted">Aucune demande approuvée en attente de distribution.</p>}
          </div>
          <div>
            <label htmlFor={`${ids}-benef`} className={label}>
              Bénéficiaire <span className="text-brand">*</span>
            </label>
            <select
              id={`${ids}-benef`}
              value={beneficiaryId}
              onChange={(e) => setBeneficiaryId(e.target.value)}
              disabled={Boolean(linkedRequest)}
              className={field}
              aria-describedby={errors.beneficiaryId ? `${ids}-beneficiaryId` : undefined}
            >
              <option value="" disabled>
                Choisir…
              </option>
              {options.beneficiaries.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
            {linkedRequest && <p className="mt-1 text-xs text-muted">Fixé par la demande {linkedRequest.reference}.</p>}
            {err("beneficiaryId")}
          </div>
        </div>
      </section>

      {/* Dépôt et date */}
      <section className="rounded-xl border border-line bg-white p-5 sm:p-6">
        <h2 className="font-bold">Dépôt et date</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor={`${ids}-wh`} className={label}>
              Dépôt de sortie <span className="text-brand">*</span>
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
              Date de distribution <span className="text-brand">*</span>
            </label>
            <input id={`${ids}-date`} type="date" value={distributedOn} max={today} onChange={(e) => setDistributedOn(e.target.value)} className={field} />
            {err("distributedOn")}
          </div>
        </div>
      </section>

      {/* Articles */}
      <section className="rounded-xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold">Articles</h2>
          <button
            type="button"
            onClick={() => setLines((ls) => [...ls, newLine()])}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm font-semibold hover:border-brand hover:text-brand"
          >
            <Plus className="size-4" /> Ajouter un article
          </button>
        </div>
        <ul className="mt-4 space-y-3">
          {lines.map((l, i) => {
            const p = productById.get(l.productId);
            const short = isShort(l);
            const usedElsewhere = new Set(lines.filter((o) => o.key !== l.key).map((o) => o.productId));
            return (
              <li key={l.key} className="grid gap-3 rounded-lg bg-surface p-3 sm:grid-cols-[1fr_9rem_auto] sm:items-start">
                <div>
                  <label htmlFor={`${ids}-p${l.key}`} className="sr-only">
                    Produit {i + 1}
                  </label>
                  <select id={`${ids}-p${l.key}`} value={l.productId} onChange={(e) => updateLine(l.key, { productId: e.target.value })} className={field}>
                    <option value="" disabled>
                      Produit…
                    </option>
                    {byCategory.map(([cat, prods]) => (
                      <optgroup key={cat} label={cat}>
                        {prods.map((o) => (
                          <option key={o.id} value={o.id} disabled={usedElsewhere.has(o.id)}>
                            {o.name} ({o.unit})
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  {p && (
                    <p className={`mt-1 text-xs ${short ? "font-semibold text-amber-700" : "text-muted"}`}>
                      Disponible dans ce dépôt : {formatQty(available(p.id))} {p.unit}
                      {short && " — quantité supérieure au stock"}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor={`${ids}-q${l.key}`} className="sr-only">
                    Quantité {i + 1}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id={`${ids}-q${l.key}`}
                      inputMode="decimal"
                      placeholder="Quantité"
                      value={l.quantity}
                      onChange={(e) => updateLine(l.key, { quantity: e.target.value })}
                      className={`${field} ${short ? "border-amber-400" : ""}`}
                    />
                    <span className="w-10 shrink-0 text-xs text-muted">{p?.unit ?? ""}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((o) => o.key !== l.key) : [newLine()]))}
                  aria-label={`Retirer l'article ${i + 1}`}
                  className="grid size-10 place-items-center justify-self-end rounded-lg text-muted hover:bg-white hover:text-red-600"
                >
                  <Trash className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
        {err("lines")}
        {shortages.length > 0 && (
          <p className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            Certaines quantités dépassent le stock de ce dépôt. Le brouillon peut être enregistré, mais il ne pourra être validé
            qu&apos;une fois le stock suffisant.
          </p>
        )}
      </section>

      {/* Remarque */}
      <section className="rounded-xl border border-line bg-white p-5 sm:p-6">
        <label htmlFor={`${ids}-note`} className={label}>
          Remarque <span className="font-normal text-muted">(facultatif)</span>
        </label>
        <textarea id={`${ids}-note`} rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} className={field} />
        {err("note")}
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link href="/tableau-de-bord/distributions" className="rounded-lg border border-line bg-white px-5 py-2.5 text-center text-sm font-semibold hover:border-brand">
          Annuler
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {pending && <LoaderCircle className="size-4 animate-spin" />}
          Enregistrer le brouillon
        </button>
      </div>
      <p className="text-right text-xs text-muted">Le stock ne change qu&apos;au moment de la validation de la distribution.</p>
    </form>
  );
}
