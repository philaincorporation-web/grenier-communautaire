import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { DemoNotice } from "@/components/admin/DemoNotice";
import { RelaisActiveToggle, RelaisForm } from "@/components/admin/relais/RelaisForm";
import { BackLink, Restricted, skeleton } from "@/components/admin/ui";
import { isDbConfigured } from "@/db";
import { canManageRelais, getRelais, listActiveMembers } from "@/lib/relais";
import { requireActiveMembership } from "@/lib/session";

export const metadata: Metadata = { title: "Modifier un relais" };
type Params = PageProps<"/tableau-de-bord/relais/[id]/modifier">["params"];

async function Content({ params }: { params: Params }) {
  if (!isDbConfigured) return <DemoNotice />;
  const { id } = await params;
  const member = await requireActiveMembership();
  if (!canManageRelais(member.role)) return <Restricted text="Seuls un propriétaire ou un administrateur peuvent modifier un relais." />;
  const [w, members] = await Promise.all([getRelais(member.organizationId, id), listActiveMembers(member.organizationId)]);
  if (!w) notFound();
  return (
    <div className="space-y-6">
      <PageHeader title={`Modifier : ${w.name}`} subtitle={w.code ? `Code ${w.code}` : "Sans code"} />
      <RelaisForm id={w.id} members={members} initial={{ name: w.name, code: w.code ?? "", address: w.address ?? "", managerMembershipId: w.managerMembershipId ?? "" }} />
      <RelaisActiveToggle id={w.id} isActive={w.isActive} />
    </div>
  );
}

/** `params` est lu dans une zone <Suspense> (exigence Next.js : navigation instantanée). */
export default function EditRelaisPage(props: PageProps<"/tableau-de-bord/relais/[id]/modifier">) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink href="/tableau-de-bord/relais">Relais</BackLink>
      <Suspense fallback={skeleton("h-80")}>
        <Content params={props.params} />
      </Suspense>
    </div>
  );
}
