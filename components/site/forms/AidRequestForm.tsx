"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Send } from "lucide-react";
import { submitAidRequest } from "@/lib/actions/public-forms";
import { aidNeeds } from "@/lib/site-content";
import { Field, FormMessage, Honeypot, SubmitButton, initialFormState, saved, savedList } from "./fields";

export function AidRequestForm() {
  const [state, action, pending] = useActionState(submitAidRequest, initialFormState);
  const e = state.errors ?? {};

  return (
    <form action={action} noValidate className="relative space-y-5">
      <Honeypot />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom et prénom" name="fullName" required autoComplete="name" defaultValue={saved(state, "fullName")} error={e.fullName} />
        <Field label="Téléphone" name="phone" type="tel" required autoComplete="tel" defaultValue={saved(state, "phone")} error={e.phone} />
        <Field label="E-mail" name="email" type="email" autoComplete="email" defaultValue={saved(state, "email")} error={e.email} />
        <Field label="Personnes dans le foyer" name="householdSize" type="number" min={1} inputMode="numeric" max={99} defaultValue={saved(state, "householdSize")} error={e.householdSize} />
        <Field label="Adresse ou quartier" name="address" autoComplete="street-address" className="sm:col-span-2" defaultValue={saved(state, "address")} error={e.address} />
      </div>

      <fieldset aria-describedby={e.needs ? "needs-err" : undefined}>
        <legend className="mb-2 text-sm font-semibold text-ink">
          Besoins <span className="text-brand">*</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {aidNeeds.map((n) => (
            <label key={n} className="cursor-pointer">
              <input type="checkbox" name="needs" value={n} defaultChecked={savedList(state, "needs").includes(n)} className="peer sr-only" />
              <span className="inline-block rounded-full border border-line px-4 py-2 text-sm font-medium transition peer-checked:border-brand peer-checked:bg-brand peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-brand/30 hover:border-brand">
                {n}
              </span>
            </label>
          ))}
        </div>
        {e.needs && (
          <p id="needs-err" className="mt-1 text-xs font-medium text-red-600">
            {e.needs}
          </p>
        )}
      </fieldset>

      <Field label="Décrivez votre situation (facultatif)" name="message" as="textarea" defaultValue={saved(state, "message")} error={e.message} />

      <label className="flex items-start gap-3 text-sm text-muted">
        <input type="checkbox" name="consent" value="1" defaultChecked={Boolean(saved(state, "consent"))} className="mt-0.5 size-4 accent-brand" />
        <span>
          J&apos;accepte que mes informations soient utilisées par l&apos;équipe pour étudier ma demande.{" "}
          <Link href="/confidentialite" className="font-semibold text-brand underline">
            En savoir plus
          </Link>
          {e.consent && <span className="block text-xs font-medium text-red-600">{e.consent}</span>}
        </span>
      </label>

      <SubmitButton pending={pending}>
        Envoyer ma demande <Send className="size-4" />
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
