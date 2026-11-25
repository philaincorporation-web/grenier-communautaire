"use client";

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { LoaderCircle, Lock, TriangleAlert } from "lucide-react";
import { createBeneficiary, updateBeneficiary } from "@/lib/actions/beneficiaries";
import {
  beneficiaryTypeLabels,
  beneficiaryTypes,
  validateBeneficiary,
  type BeneficiaryInput,
  type BeneficiaryResult,
  type BeneficiaryType,
} from "@/lib/beneficiaries-shared";

const field =
  "w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
const label = "mb-1.5 block text-sm font-semibold";

const nameLabel: Record<BeneficiaryType, string> = {
  household: "Nom de la famille",
  individual: "Nom et prénom",
  organization: "Nom de l'organisation",
};

const empty: BeneficiaryInput = { beneficiaryType: "household", displayName: "", phone: "", email: "", address: "", householdSize: "", notes: "" };

/** Création (sans `id`) ou modification (avec `id` et `initial`) d'un bénéficiaire. */
export function BeneficiaryForm({ id, initial }: { id?: string; initial?: BeneficiaryInput }) {
  const [values, setValues] = useState<BeneficiaryInput>(initial ?? empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<BeneficiaryResult | null>(null);
  const [pending, startTransition] = useTransition();
  const ids = useId();
  const type = (beneficiaryTypes as string[]).includes(values.beneficiaryType) ? (values.beneficiaryType as BeneficiaryType) : "household";
  const set = (k: keyof BeneficiaryInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  function send(confirmDuplicate = false) {
    // La taille du foyer n'a de sens que pour un foyer.
    const input = { ...values, householdSize: type === "household" ? values.householdSize : "" };
    const local = validateBeneficiary(input);
    setErrors(local);
    setResult(null);
    if (Object.keys(local).length) return;
    startTransition(async () => {
      // En cas de succès, l'action redirige vers la fiche du bénéficiaire.
      const r = id ? await updateBeneficiary(id, input) : await createBeneficiary(input, confirmDuplicate);
      if (r && !r.ok) {
        setResult(r);
        setErrors(r.errors ?? {});
      }
    });
  }

  const err = (k: string) =>
    errors[k] ? (
      <p id={`${ids}-${k}-err`} className="mt-1 text-xs font-medium text-red-600">
        {errors[k]}
      </p>
    ) : null;
  const aria = (k: string) => ({ "aria-invalid": Boolean(errors[k]) || undefined, "aria-describedby": errors[k] ? `${ids}-${k}-err` : undefined });
  const border = (k: string) => (errors[k] ? "border-red-400" : "border-line");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
      noValidate
      className="space-y-6"
    >
      {result && !result.ok && (
        <div role="alert" className="space-y-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="flex items-start gap-2">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" /> {result.message}
          </p>
          {result.duplicate && (
            <div className="flex flex-wrap gap-2 pl-6">
              <Link href={`/tableau-de-bord/beneficiaires/${result.duplicate.id}`} className="rounded-lg border border-red-200 bg-white px-3 py-1.5 font-semibold hover:border-red-400">
                Voir la fiche existante
              </Link>
              <button type="button" disabled={pending} onClick={() => send(true)} className="rounded-lg bg-red-600 px-3 py-1.5 font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                Créer quand même
              </button>
            </div>
          )}
        </div>
      )}

      <section className="rounded-xl border border-line bg-white p-5 sm:p-6">
        <fieldset>
          <legend className="font-bold">Type</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {beneficiaryTypes.map((t) => (
              <label key={t} className="cursor-pointer">
                <input
                  type="radio"
                  name="beneficiaryType"
                  value={t}
                  checked={type === t}
                  onChange={() => setValues((v) => ({ ...v, beneficiaryType: t }))}
                  className="peer sr-only"
                />
                <span className="block rounded-lg border border-line px-4 py-2.5 text-center text-sm font-semibold transition peer-checked:border-brand peer-checked:bg-brand-soft peer-checked:text-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand/30 hover:border-brand">
                  {beneficiaryTypeLabels[t]}
                </span>
              </label>
            ))}
          </div>
          {err("beneficiaryType")}
        </fieldset>

        <div className="mt-5 grid gap-4 md:grid-cols-[1fr_12rem]">
          <div className={type === "household" ? "" : "md:col-span-2"}>
            <label htmlFor={`${ids}-name`} className={label}>
              {nameLabel[type]} <span className="text-brand">*</span>
            </label>
            <input id={`${ids}-name`} value={values.displayName} onChange={set("displayName")} maxLength={180} autoComplete="off" className={`${field} ${border("displayName")}`} {...aria("displayName")} />
            {err("displayName")}
          </div>
          {type === "household" && (
            <div>
              <label htmlFor={`${ids}-size`} className={label}>
                Personnes au foyer
              </label>
              <input id={`${ids}-size`} value={values.householdSize} onChange={set("householdSize")} inputMode="numeric" maxLength={2} className={`${field} ${border("householdSize")}`} {...aria("householdSize")} />
              {err("householdSize")}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-line bg-white p-5 sm:p-6">
        <h2 className="flex items-center gap-2 font-bold">
          <Lock className="size-4 text-brand" /> Coordonnées et notes
        </h2>
        <p className="mt-1 text-sm text-muted">Informations confidentielles : visibles uniquement par la gestion (propriétaires, administrateurs, gestionnaires).</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor={`${ids}-phone`} className={label}>
              Téléphone
            </label>
            <input id={`${ids}-phone`} type="tel" value={values.phone} onChange={set("phone")} maxLength={40} autoComplete="off" className={`${field} ${border("phone")}`} {...aria("phone")} />
            {err("phone")}
          </div>
          <div>
            <label htmlFor={`${ids}-email`} className={label}>
              E-mail
            </label>
            <input id={`${ids}-email`} type="email" value={values.email} onChange={set("email")} maxLength={255} autoComplete="off" className={`${field} ${border("email")}`} {...aria("email")} />
            {err("email")}
          </div>
          <div className="md:col-span-2">
            <label htmlFor={`${ids}-address`} className={label}>
              Adresse ou quartier
            </label>
            <input id={`${ids}-address`} value={values.address} onChange={set("address")} maxLength={500} autoComplete="off" className={`${field} ${border("address")}`} {...aria("address")} />
            {err("address")}
          </div>
          <div className="md:col-span-2">
            <label htmlFor={`${ids}-notes`} className={label}>
              Notes de suivi
            </label>
            <textarea id={`${ids}-notes`} rows={4} value={values.notes} onChange={set("notes")} maxLength={2000} className={`${field} ${border("notes")}`} {...aria("notes")} />
            {err("notes")}
          </div>
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          href={id ? `/tableau-de-bord/beneficiaires/${id}` : "/tableau-de-bord/beneficiaires"}
          className="rounded-lg border border-line bg-white px-5 py-2.5 text-center text-sm font-semibold hover:border-brand"
        >
          Annuler
        </Link>
        <button type="submit" disabled={pending} className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
          {pending && <LoaderCircle className="size-4 animate-spin" />}
          {id ? "Enregistrer les modifications" : "Enregistrer le bénéficiaire"}
        </button>
      </div>
    </form>
  );
}
