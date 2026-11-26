import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCardSkeleton } from "@/components/loading/Skeleton";
import { AuthForm } from "@/components/auth/AuthForm";
import { SignedInGate } from "@/components/auth/SignedInGate";

export const metadata: Metadata = { title: "Connexion" };

export default function SignInPage() {
  return (
    <Suspense fallback={<AuthCardSkeleton fields={2} />}>
      <SignedInGate>
        <AuthForm mode="sign-in" />
      </SignedInGate>
    </Suspense>
  );
}
