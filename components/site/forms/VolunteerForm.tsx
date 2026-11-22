"use client";

import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { submitVolunteer } from "@/lib/actions/public-forms";
import { volunteerRoles } from "@/lib/site-content";
import { Field, FormMessage, Honeypot, SubmitButton, initialFormState, saved } from "./fields";

/** `compact` : version courte (bloc de l'accueil, sur fond coloré). */
export function VolunteerForm({ compact = false }: { compact?: boolean }) {
  const [state, action, pending] = useActionState(submitVolunteer, initialFormState);
  const e = state.errors ?? {};
  const roles = volunteerRoles.map((r) => ({ value: r.id, label: r.label }));

  return (
    <form action={action} noValidate className="relative space-y-4">
      <Honeypot />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nom complet" name="fullName" required hideLabel={compact} placeholder="Nom complet" autoComplete="name" defaultValue={saved(state, "fullName")} error={e.fullName} />
        <Field label="E-mail" name="email" type="email" required hideLabel={compact} placeholder="Adresse e-mail" autoComplete="email" defaultValue={saved(state, "email")} error={e.email} />
        <Field label="Téléphone" name="phone" type="tel" hideLabel={compact} placeholder="Téléphone" autoComplete="tel" defaultValue={saved(state, "phone")} error={e.phone} />
        <Field label="Mission souhaitée" name="role" as="select" required hideLabel={compact} placeholder="Mission souhaitée" options={roles} defaultValue={saved(state, "role")} error={e.role} />
        {!compact && (
          <>
            <Field label="Quartier / ville" name="area" placeholder="Où souhaitez-vous agir ?" defaultValue={saved(state, "area")} error={e.area} className="sm:col-span-2" />
            <Field label="Disponibilités et motivation" name="message" as="textarea" placeholder="Quelques mots sur vous…" defaultValue={saved(state, "message")} error={e.message} className="sm:col-span-2" />
          </>
        )}
      </div>
      <SubmitButton pending={pending} variant={compact ? "white" : "primary"}>
        Envoyer ma candidature <ArrowRight className="size-4" />
      </SubmitButton>
      <FormMessage state={state} light={compact} />
    </form>
  );
}
