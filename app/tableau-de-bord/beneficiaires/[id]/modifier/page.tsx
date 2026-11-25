import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Lock } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { DemoNotice } from "@/components/admin/DemoNotice";
import { BeneficiaryForm } from "@/components/admin/beneficiaries/BeneficiaryForm";
import { isDbConfigured } from "@/db";
import { getBeneficiary } from "@/lib/beneficiaries";
import { canManageBeneficiaries } from "@/lib/beneficiaries-shared";
import { requireActiveMembership } from "@/lib/session";

export const metadata: Metadata = { title: "Modifier un bénéficiaire" };

type Params = PageProps<"/tableau-de-bord/beneficiaires/[id]/modifier">["params"];

async function Content({ params }: { params: Params }) {
  if (!isDbConfigured) return <DemoNotice />;
  const { id } = await params;
  const member = await requireActiveMembership();
  if (!canManageBeneficiaries(member.role)) {
    return (
      <div className="grid place-items-center rounded-xl border border-dashed border-line bg-white px-6 py-16 text-center">
        <Lock className="size-9 text-brand" />
        <p className="mt-3 font-semibold">Accès réservé à la gestion</p>
      </div>
    );
  }
  const b = await getBeneficiary(member.organizationId, id, true);
  if (!b || !b.contact) notFound();
  return (
    <>
      <PageHeader title={`Modifier : ${b.name}`} subtitle={b.reference ? `Référence ${b.reference}` : "Sans référence"} />
      <BeneficiaryForm
        id={b.id}
        initial={{
          beneficiaryType: b.type,
          displayName: b.name,
          phone: b.contact.phone ?? "",
          email: b.contact.email ?? "",
          address: b.contact.address ?? "",
          householdSize: b.householdSize ? String(b.householdSize) : "",
          notes: b.contact.notes ?? "",
        }}
      />
    </>
  );
}

/** `params` est lu dans une zone <Suspense> (exigence Next.js : navigation instantanée). */
export default function EditBeneficiaryPage(props: PageProps<"/tableau-de-bord/beneficiaires/[id]/modifier">) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/tableau-de-bord/beneficiaires" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-brand">
        <ArrowLeft className="size-4" /> Bénéficiaires
      </Link>
      <Suspense fallback={<div className="h-[28rem] animate-pulse rounded-xl bg-white" aria-busy="true" />}>
        <Content params={props.params} />
      </Suspense>
    </div>
  );
}
