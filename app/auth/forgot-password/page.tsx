import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCardSkeleton } from "@/components/loading/Skeleton";
import { PasswordResetForm } from "@/components/auth/PasswordResetForm";

// /auth/forgot-password fait partie des routes publiques par défaut de Neon Auth : accessible sans session.
export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<AuthCardSkeleton fields={1} />}>
      <PasswordResetForm />
    </Suspense>
  );
}
