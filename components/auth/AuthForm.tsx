"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { authClient } from "@/lib/auth/client";

type Mode = "sign-in" | "sign-up";
type AuthErr = { code?: string; message?: string; status?: number } | null | undefined;

/** N'accepte qu'un chemin interne (pas de //hôte ni d'URL absolue). */
function safeRedirect(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\")
    ? value
    : "/tableau-de-bord";
}

function errorMessage(error: AuthErr) {
  switch (error?.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return "E-mail ou mot de passe incorrect.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "Un compte existe déjà avec cet e-mail. Connectez-vous.";
    case "PASSWORD_TOO_SHORT":
      return "Le mot de passe est trop court (8 caractères minimum).";
    case "INVALID_OTP":
      return "Code invalide. Vérifiez le code reçu par e-mail.";
    case "OTP_EXPIRED":
      return "Ce code a expiré. Demandez-en un nouveau.";
    case "TOO_MANY_ATTEMPTS":
      return "Trop de tentatives. Demandez un nouveau code.";
    default:
      return error?.message || "Une erreur est survenue. Réessayez.";
  }
}

const input =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = safeRedirect(params.get("redirectTo"));
  const pendingVerification = params.get("verify");

  const [step, setStep] = useState<"credentials" | "code">(pendingVerification ? "code" : "credentials");
  const [email, setEmail] = useState(pendingVerification ?? "");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(
    pendingVerification ? "Votre e-mail n'est pas encore vérifié. Saisissez le code reçu ou demandez-en un nouveau." : null,
  );
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

  const done = () => {
    router.replace(redirectTo);
    router.refresh();
  };

  async function sendCode() {
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email, type: "email-verification" });
    if (error) return setError(errorMessage(error));
    setInfo(`Un code de vérification a été envoyé à ${email}.`);
  }

  function onCredentials(form: FormData) {
    const values = {
      email: String(form.get("email")).trim().toLowerCase(),
      password: String(form.get("password")),
      name: String(form.get("name") ?? "").trim(),
    };
    setEmail(values.email);
    run(async () => {
      if (mode === "sign-up") {
        const { error } = await authClient.signUp.email(values);
        if (error) return setError(errorMessage(error));
        setStep("code");
        setInfo(`Un code de vérification a été envoyé à ${values.email}.`);
        return;
      }
      const { error } = await authClient.signIn.email({ email: values.email, password: values.password });
      if (error?.code === "EMAIL_NOT_VERIFIED" || error?.status === 403) {
        setStep("code");
        const sent = await authClient.emailOtp.sendVerificationOtp({ email: values.email, type: "email-verification" });
        setInfo(
          sent.error
            ? "Votre e-mail n'est pas vérifié. Demandez un code ci-dessous."
            : `Votre e-mail n'est pas encore vérifié : un code a été envoyé à ${values.email}.`,
        );
        return;
      }
      if (error) return setError(errorMessage(error));
      done();
    });
  }

  function onCode(form: FormData) {
    const otp = String(form.get("otp")).trim();
    run(async () => {
      const { error } = await authClient.emailOtp.verifyEmail({ email, otp });
      if (error) return setError(errorMessage(error));
      // La branche connecte automatiquement après vérification ; sinon on renvoie vers la connexion.
      const { data } = await authClient.getSession();
      if (data?.user) return done();
      setStep("credentials");
      setInfo("E-mail vérifié. Vous pouvez vous connecter.");
      if (mode === "sign-up") router.push(`/auth/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`);
    });
  }

  const title = step === "code" ? "Vérifiez votre e-mail" : mode === "sign-in" ? "Connexion" : "Créer un compte";

  return (
    <div className="w-full max-w-sm rounded-2xl border border-line bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-extrabold">{title}</h1>
      <p className="mt-1 text-sm text-muted">Espace membre du Grenier Communautaire</p>

      {info && <p className="mt-5 rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand-dark">{info}</p>}
      {error && (
        <p role="alert" className="mt-5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {step === "credentials" ? (
        <form action={onCredentials} className="mt-6 space-y-4">
          {mode === "sign-up" && (
            <label className="block text-sm font-medium">
              Nom complet
              <input name="name" required autoComplete="name" className={`${input} mt-1`} />
            </label>
          )}
          <label className="block text-sm font-medium">
            E-mail
            <input name="email" type="email" required autoComplete="email" defaultValue={email} className={`${input} mt-1`} />
          </label>
          <label className="block text-sm font-medium">
            Mot de passe
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              className={`${input} mt-1`}
            />
          </label>
          <SubmitButton busy={busy}>{mode === "sign-in" ? "Se connecter" : "Créer mon compte"}</SubmitButton>
        </form>
      ) : (
        <form action={onCode} className="mt-6 space-y-4">
          <label className="block text-sm font-medium">
            Code reçu par e-mail
            <input
              name="otp"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{4,8}"
              className={`${input} mt-1 tracking-[0.4em]`}
            />
          </label>
          <SubmitButton busy={busy}>Vérifier</SubmitButton>
          <button type="button" disabled={busy} onClick={() => run(sendCode)} className="w-full text-sm font-semibold text-brand hover:underline disabled:opacity-50">
            Renvoyer un code
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted">
        {mode === "sign-in" ? (
          <>
            Pas encore de compte ?{" "}
            <Link href={`/auth/sign-up?redirectTo=${encodeURIComponent(redirectTo)}`} className="font-semibold text-brand hover:underline">
              Créer un compte
            </Link>
          </>
        ) : (
          <>
            Déjà inscrit ?{" "}
            <Link href={`/auth/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`} className="font-semibold text-brand hover:underline">
              Se connecter
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

function SubmitButton({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
    >
      {busy && <LoaderCircle className="size-4 animate-spin" />}
      {children}
    </button>
  );
}
