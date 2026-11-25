import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, Lock } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { DemoNotice } from "@/components/admin/DemoNotice";
import { DistributionForm } from "@/components/admin/distributions/DistributionForm";
import { isDbConfigured } from "@/db";
import { getFormOptions } from "@/lib/distributions";
import { canPrepareDistribution } from "@/lib/distributions-shared";
import { requireActiveMembership } from "@/lib/session";

export const metadata: Metadata = { title: "Nouvelle distribution" };

/** Fuseau de l'association (Gabon) : la date proposée par défaut est celle du jour sur place. */
const TIME_ZONE = "Africa/Libreville";

async function Content() {
  if (!isDbConfigured) return <DemoNotice />;
  const member = await requireActiveMembership();
  if (!canPrepareDistribution(member.role)) {
    return (
      <div className="grid place-items-center rounded-xl border border-dashed border-line bg-white px-6 py-16 text-center">
        <Lock className="size-9 text-brand" />
        <p className="mt-3 font-semibold">Accès en lecture seule</p>
        <p className="mt-1 max-w-md text-sm text-muted">Votre rôle permet de consulter les distributions, pas d&apos;en préparer.</p>
      </div>
    );
  }
  const options = await getFormOptions(member.organizationId);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date());
  return <DistributionForm options={options} today={today} />;
}

export default function NewDistributionPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/tableau-de-bord/distributions" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-brand">
        <ArrowLeft className="size-4" /> Distributions
      </Link>
      <PageHeader title="Nouvelle distribution" subtitle="Préparez un brouillon : le stock ne bouge qu'à la validation." />
      <Suspense fallback={<div className="h-[32rem] animate-pulse rounded-xl bg-white" aria-busy="true" />}>
        <Content />
      </Suspense>
    </div>
  );
}
