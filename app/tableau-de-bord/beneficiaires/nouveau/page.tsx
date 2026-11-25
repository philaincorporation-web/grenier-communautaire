import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, Lock } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { DemoNotice } from "@/components/admin/DemoNotice";
import { BeneficiaryForm } from "@/components/admin/beneficiaries/BeneficiaryForm";
import { isDbConfigured } from "@/db";
import { canManageBeneficiaries } from "@/lib/beneficiaries-shared";
import { requireActiveMembership } from "@/lib/session";

export const metadata: Metadata = { title: "Nouveau bénéficiaire" };

async function Content() {
  if (!isDbConfigured) return <DemoNotice />;
  const member = await requireActiveMembership();
  if (!canManageBeneficiaries(member.role)) {
    return (
      <div className="grid place-items-center rounded-xl border border-dashed border-line bg-white px-6 py-16 text-center">
        <Lock className="size-9 text-brand" />
        <p className="mt-3 font-semibold">Accès réservé à la gestion</p>
        <p className="mt-1 max-w-md text-sm text-muted">Seuls les propriétaires, administrateurs et gestionnaires peuvent enregistrer un bénéficiaire.</p>
      </div>
    );
  }
  return <BeneficiaryForm />;
}

export default function NewBeneficiaryPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/tableau-de-bord/beneficiaires" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-brand">
        <ArrowLeft className="size-4" /> Bénéficiaires
      </Link>
      <PageHeader title="Nouveau bénéficiaire" subtitle="Une référence BEN-… est attribuée automatiquement." />
      <Suspense fallback={<div className="h-[28rem] animate-pulse rounded-xl bg-white" aria-busy="true" />}>
        <Content />
      </Suspense>
    </div>
  );
}
