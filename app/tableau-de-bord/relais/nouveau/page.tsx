import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { DemoNotice } from "@/components/admin/DemoNotice";
import { RelaisForm } from "@/components/admin/relais/RelaisForm";
import { BackLink, Restricted, skeleton } from "@/components/admin/ui";
import { isDbConfigured } from "@/db";
import { canManageRelais, listActiveMembers } from "@/lib/relais";
import { requireActiveMembership } from "@/lib/session";

export const metadata: Metadata = { title: "Nouveau relais" };

async function Content() {
  if (!isDbConfigured) return <DemoNotice />;
  const member = await requireActiveMembership();
  if (!canManageRelais(member.role)) return <Restricted text="Seuls un propriétaire ou un administrateur peuvent créer un relais." />;
  return <RelaisForm members={await listActiveMembers(member.organizationId)} />;
}

export default function NewRelaisPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink href="/tableau-de-bord/relais">Relais</BackLink>
      <PageHeader title="Nouveau relais" subtitle="Dépôt ou point relais qui reçoit des dons et organise des distributions." />
      <Suspense fallback={skeleton("h-80")}>
        <Content />
      </Suspense>
    </div>
  );
}
