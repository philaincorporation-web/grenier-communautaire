"use client";

import { useActionState } from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { claimAidRequest, type RequesterResult } from "@/lib/actions/requester";

const input = "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

/** Rattacher une demande d'aide déposée sans e-mail (référence + téléphone). */
export function ClaimForm() {
  const [state, action, pending] = useActionState<RequesterResult | null, FormData>(claimAidRequest, null);
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Référence
          <input name="reference" required placeholder="DA-2026-AB12CD" autoComplete="off" className={`${input} mt-1 font-mono uppercase`} />
        </label>
        <label className="block text-sm font-medium">
          Téléphone indiqué dans la demande
          <input name="phone" required type="tel" autoComplete="tel" className={`${input} mt-1`} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="inline-flex items-center gap-2 rounded-lg border border-brand px-4 py-2 text-sm font-semibold text-brand hover:bg-brand-soft disabled:opacity-60">
          {pending && <LoaderCircle className="size-4 animate-spin" />}
          Ajouter à mon espace
        </button>
        {state && (
          <p role="status" className={`text-sm ${state.ok ? "text-green-700" : "text-red-700"}`}>
            {state.message}{" "}
            {state.href && (
              <Link href={state.href} className="font-semibold underline">
                Voir la demande
              </Link>
            )}
          </p>
        )}
      </div>
    </form>
  );
}
