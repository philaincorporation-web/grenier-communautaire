import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = { title: "Créer un compte" };

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="h-[28rem] w-full max-w-sm animate-pulse rounded-2xl bg-white" />}>
      <AuthForm mode="sign-up" />
    </Suspense>
  );
}
