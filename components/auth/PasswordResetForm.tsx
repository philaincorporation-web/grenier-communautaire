"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import { authCall, errorMessage, inputClass, safeRedirect, SubmitButton } from "./shared";

/**
 * Réinitialisation du mot de passe par code envoyé par e-mail (Neon Auth, « email OTP ») :
 *  1. la personne saisit son e-mail → un code lui est envoyé (type « forget-password ») ;
 *  2. elle saisit le code et son nouveau mot de passe → Neon Auth le remplace.
 *
 * Confidentialité : la réponse est la même que l'adresse ait un compte ou non, pour ne pas
 * révéler qui est inscrit.
 */
export function PasswordResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = safeRedirect(params.get("redirectTo"));

  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch {
      setError("Impossible de joindre le service d'authentification.");
    } finally {
      setBusy(false);
    }
  }

  /** Envoie le code. Une adresse inconnue reçoit la même réponse qu'une adresse inscrite. */
  async function sendCode(to: string) {
    const { error } = await authCall(authClient.emailOtp.sendVerificationOtp({ email: to, type: "forget-password" }));
    if (error && error.code !== "USER_NOT_FOUND") return setError(errorMessage(error));
    setStep("reset");
    setInfo(`Si un compte existe pour ${to}, un code vient d'y être envoyé. Il est valable quelques minutes.`);
  }

  function onEmail(form: FormData) {
    const value = String(form.get("email")).trim().toLowerCase();
    setEmail(value);
    run(() => sendCode(value));
  }

  function onReset(form: FormData) {
    const otp = String(form.get("otp")).trim();
    const password = String(form.get("password"));
    const confirm = String(form.get("confirm"));
    if (password.length < 8) return setError("Le mot de passe doit contenir au moins 8 caractères.");
    if (password !== confirm) return setError("Les deux mots de passe ne sont pas identiques.");
    run(async () => {
      const { error } = await authCall(authClient.emailOtp.resetPassword({ email, otp, password }));
      if (error) {
        // Un compte inexistant est présenté comme un code invalide (rien n'est révélé).
        return setError(errorMessage(error.code === "USER_NOT_FOUND" ? { code: "INVALID_OTP" } : error));
      }
      router.replace(`/auth/sign-in?reset=1&redirectTo=${encodeURIComponent(redirectTo)}`);
    });
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-line bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-extrabold">{step === "email" ? "Mot de passe oublié" : "Nouveau mot de passe"}</h1>
      <p className="mt-1 text-sm text-muted">Espace membre du Grenier Communautaire</p>

      {info && (
        <p role="status" className="mt-5 rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand-dark">
          {info}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {step === "email" ? (
        <form action={onEmail} className="mt-6 space-y-4">
          <p className="text-sm text-muted">
            Saisissez l&apos;e-mail de votre compte : nous vous enverrons un code pour choisir un nouveau mot de passe.
          </p>
          <label className="block text-sm font-medium">
            E-mail
            <input name="email" type="email" required autoComplete="email" defaultValue={email} className={`${inputClass} mt-1`} />
          </label>
          <SubmitButton busy={busy}>Recevoir un code</SubmitButton>
        </form>
      ) : (
        <form action={onReset} className="mt-6 space-y-4">
          <label className="block text-sm font-medium">
            Code reçu par e-mail
            <input
              name="otp"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{4,8}"
              className={`${inputClass} mt-1 tracking-[0.4em]`}
            />
          </label>
          <label className="block text-sm font-medium">
            Nouveau mot de passe
            <input name="password" type="password" required minLength={8} autoComplete="new-password" className={`${inputClass} mt-1`} />
            <span className="mt-1 block text-xs font-normal text-muted">8 caractères minimum.</span>
          </label>
          <label className="block text-sm font-medium">
            Confirmer le mot de passe
            <input name="confirm" type="password" required minLength={8} autoComplete="new-password" className={`${inputClass} mt-1`} />
          </label>
          <SubmitButton busy={busy}>Changer le mot de passe</SubmitButton>
          <div className="flex justify-between gap-3 text-sm">
            <button type="button" disabled={busy} onClick={() => run(() => sendCode(email))} className="font-semibold text-brand hover:underline disabled:opacity-50">
              Renvoyer un code
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setStep("email");
                setInfo(null);
                setError(null);
              }}
              className="text-muted hover:text-ink hover:underline disabled:opacity-50"
            >
              Changer d&apos;e-mail
            </button>
          </div>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted">
        <Link href={`/auth/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`} className="font-semibold text-brand hover:underline">
          Retour à la connexion
        </Link>
      </p>
    </div>
  );
}
