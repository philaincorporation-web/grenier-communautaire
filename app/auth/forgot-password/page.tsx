import type { Metadata } from "next";
import { Suspense } from "react";
import { PasswordResetForm } from "@/components/auth/PasswordResetForm";

// /auth/forgot-password fait partie des routes publiques par défaut de Neon Auth : accessible sans session.
export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="h-80 w-full max-w-sm animate-pulse rounded-2xl bg-white" />}>
      <PasswordResetForm />
    </Suspense>
  );
}
