import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";
import { SignedInGate } from "@/components/auth/SignedInGate";

export const metadata: Metadata = { title: "Connexion" };

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="h-96 w-full max-w-sm animate-pulse rounded-2xl bg-white" />}>
      <SignedInGate>
        <AuthForm mode="sign-in" />
      </SignedInGate>
    </Suspense>
  );
}
