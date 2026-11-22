"use client";

import { useActionState } from "react";
import { subscribeNewsletter } from "@/lib/actions/public-forms";
import { FormMessage, Honeypot, initialFormState, saved } from "./fields";

export function NewsletterForm() {
  const [state, action, pending] = useActionState(subscribeNewsletter, initialFormState);
  return (
    <form action={action} noValidate className="relative w-full max-w-md space-y-2">
      <Honeypot />
      <div className="flex overflow-hidden rounded-lg bg-white shadow-md">
        <label htmlFor="newsletter-email" className="sr-only">
          Adresse e-mail
        </label>
        <input
          id="newsletter-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={saved(state, "email")}
          placeholder="Votre adresse e-mail"
          className="min-w-0 flex-1 px-4 py-3 text-sm text-ink outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 bg-ink px-4 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-60 sm:px-6"
        >
          S&apos;abonner
        </button>
      </div>
      <FormMessage state={state.errors?.email ? { status: "error", message: state.errors.email } : state} light />
    </form>
  );
}
