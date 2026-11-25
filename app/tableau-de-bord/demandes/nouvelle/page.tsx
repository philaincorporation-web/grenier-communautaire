import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { DemoNotice } from "@/components/admin/DemoNotice";
import { AidRequestForm } from "@/components/admin/aid-requests/AidRequestForm";
import { BackLink, EmptyState, Restricted, skeleton } from "@/components/admin/ui";
import { isDbConfigured } from "@/db";
import { getAidFormOptions, getOnlinePrefill } from "@/lib/aid-requests";
import { canCreateAidRequest, canReviewAidRequest } from "@/lib/aid-requests-shared";
import { requireActiveMembership } from "@/lib/session";
import { Globe } from "lucide-react";

export const metadata: Metadata = { title: "Nouvelle demande d'aide" };
type Props = PageProps<"/tableau-de-bord/demandes/nouvelle">;

async function Content({ searchParams }: { searchParams: Props["searchParams"] }) {
  const sp = await searchParams;
  const onlineId = typeof sp["en-ligne"] === "string" ? sp["en-ligne"] : undefined;
  const beneficiaryId = typeof sp.beneficiaire === "string" ? sp.beneficiaire : undefined;
  if (!isDbConfigured) return <DemoNotice />;
  const member = await requireActiveMembership();
  if (!canCreateAidRequest(member.role) || (onlineId && !canReviewAidRequest(member.role))) return <Restricted />;

  const [options, online] = await Promise.all([
    getAidFormOptions(member.organizationId),
    onlineId ? getOnlinePrefill(member.organizationId, onlineId) : Promise.resolve(null),
  ]);
  if (onlineId && !online) {
    return <EmptyState icon={Globe} title="Demande en ligne introuvable" text="Elle a peut-être déjà été convertie ou archivée." />;
  }
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Libreville" }).format(new Date());
  return <AidRequestForm options={options} today={today} initialBeneficiaryId={beneficiaryId} online={online} />;
}

export default function NewAidRequestPage({ searchParams }: Props) {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <BackLink href="/tableau-de-bord/demandes">Demandes d&apos;aide</BackLink>
      <PageHeader title="Nouvelle demande d'aide" subtitle="Elle sera instruite puis approuvée avant toute distribution." />
      <Suspense fallback={skeleton("h-[32rem]")}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
