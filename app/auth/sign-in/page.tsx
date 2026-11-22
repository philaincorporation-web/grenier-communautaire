import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = { title: "Connexion" };

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="h-96 w-full max-w-sm animate-pulse rounded-2xl bg-white" />}>
      <AuthForm mode="sign-in" />
    </Suspense>
  );
}
