import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Eye } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { DemoNotice } from "@/components/admin/DemoNotice";
import { CategoriesManager, OrganizationForm, ProductsManager, TeamManager } from "@/components/admin/settings/SettingsForms";
import { skeleton } from "@/components/admin/ui";
import { isDbConfigured } from "@/db";
import { assignableRoles, canManageSettings, getOrganization, isSettingsTab, listCategories, listProducts, listTeam, settingsTabs, type SettingsTab } from "@/lib/settings";
import { requireActiveMembership } from "@/lib/session";

export const metadata: Metadata = { title: "Paramètres" };
const BASE = "/tableau-de-bord/parametres";
type Props = PageProps<"/tableau-de-bord/parametres">;

async function Content({ searchParams }: { searchParams: Props["searchParams"] }) {
  const sp = await searchParams;
  const tab: SettingsTab = isSettingsTab(sp.onglet) ? sp.onglet : "organisation";
  if (!isDbConfigured) return <DemoNotice />;
  const member = await requireActiveMembership();
  const org = member.organizationId;
  const readOnly = !canManageSettings(member.role);

  let body: React.ReactNode;
  if (tab === "organisation") {
    const o = await getOrganization(org);
    body = <OrganizationForm readOnly={readOnly} initial={{ name: o?.name ?? "", email: o?.email ?? "", phone: o?.phone ?? "", address: o?.address ?? "" }} />;
  } else if (tab === "categories") {
    body = <CategoriesManager readOnly={readOnly} categories={await listCategories(org)} />;
  } else if (tab === "produits") {
    const [products, categories] = await Promise.all([listProducts(org), listCategories(org)]);
    body = <ProductsManager readOnly={readOnly} products={products} categories={categories.map((c) => ({ id: c.id, name: c.name }))} />;
  } else {
    body = <TeamManager readOnly={readOnly} team={await listTeam(org)} selfId={member.membershipId} actorRole={member.role} roles={assignableRoles(member.role)} />;
  }

  return (
    <div className="space-y-5">
      <nav aria-label="Rubriques" className="flex gap-1 overflow-x-auto border-b border-line">
        {(Object.keys(settingsTabs) as SettingsTab[]).map((t) => (
          <Link
            key={t}
            href={t === "organisation" ? BASE : `${BASE}?onglet=${t}`}
            aria-current={t === tab ? "page" : undefined}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold ${t === tab ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink"}`}
          >
            {settingsTabs[t]}
          </Link>
        ))}
      </nav>
      {readOnly && (
        <p className="flex items-center gap-2 rounded-lg bg-surface px-4 py-3 text-sm text-muted">
          <Eye className="size-4 shrink-0" /> Consultation seule : les modifications sont réservées aux propriétaires et administrateurs.
        </p>
      )}
      {body}
    </div>
  );
}

export default function SettingsPage({ searchParams }: Props) {
  return (
    <div className="space-y-6">
      <PageHeader title="Paramètres" subtitle="Organisation, catalogue de produits et équipe" />
      <Suspense fallback={skeleton()}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
