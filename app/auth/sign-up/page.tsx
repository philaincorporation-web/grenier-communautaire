import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCardSkeleton } from "@/components/loading/Skeleton";
import { AuthForm } from "@/components/auth/AuthForm";
import { SignedInGate } from "@/components/auth/SignedInGate";

export const metadata: Metadata = { title: "Créer un compte" };

export default function SignUpPage() {
  return (
    <Suspense fallback={<AuthCardSkeleton fields={3} />}>
      <SignedInGate>
        <AuthForm mode="sign-up" />
      </SignedInGate>
    </Suspense>
  );
}
