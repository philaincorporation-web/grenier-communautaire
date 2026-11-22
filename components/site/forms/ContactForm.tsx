"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";
import { submitContact } from "@/lib/actions/public-forms";
import { contactSubjects } from "@/lib/site-content";
import { Field, FormMessage, Honeypot, SubmitButton, initialFormState, saved } from "./fields";

export function ContactForm() {
  const [state, action, pending] = useActionState(submitContact, initialFormState);
  const e = state.errors ?? {};
  return (
    <form action={action} noValidate className="relative space-y-4">
      <Honeypot />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom complet" name="fullName" required autoComplete="name" defaultValue={saved(state, "fullName")} error={e.fullName} />
        <Field label="E-mail" name="email" type="email" required autoComplete="email" defaultValue={saved(state, "email")} error={e.email} />
        <Field label="Objet" name="subject" as="select" required options={contactSubjects} defaultValue={saved(state, "subject")} className="sm:col-span-2" error={e.subject} />
        <Field label="Message" name="message" as="textarea" required defaultValue={saved(state, "message")} className="sm:col-span-2" error={e.message} />
      </div>
      <SubmitButton pending={pending}>
        Envoyer le message <Send className="size-4" />
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
