import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { HandHelping, Plus } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { DemoNotice } from "@/components/admin/DemoNotice";
import { Badge, EmptyState, FilterChips, Pagination, PrimaryLink, SearchBox, skeleton } from "@/components/admin/ui";
import { isDbConfigured } from "@/db";
import { pageParam } from "@/lib/admin/refs";
import { listAidRequests, PAGE_SIZE } from "@/lib/aid-requests";
import { aidStatusLabels, aidStatusStyles, aidViews, canCreateAidRequest, isAidView, type AidView } from "@/lib/aid-requests-shared";
import { formatDay } from "@/lib/distributions-shared";
import { requireActiveMembership } from "@/lib/session";

export const metadata: Metadata = { title: "Demandes d'aide" };

const BASE = "/tableau-de-bord/demandes";
type Props = PageProps<"/tableau-de-bord/demandes">;

const href = (p: { vue?: AidView; q?: string; page?: number }) => {
  const s = new URLSearchParams();
  if (p.vue && p.vue !== "a-traiter") s.set("vue", p.vue);
  if (p.q) s.set("q", p.q);
  if (p.page && p.page > 1) s.set("page", String(p.page));
  const str = s.toString();
  return str ? `${BASE}?${str}` : BASE;
};

async function Content({ searchParams }: { searchParams: Props["searchParams"] }) {
  const sp = await searchParams;
  const view: AidView = isAidView(sp.vue) ? sp.vue : "a-traiter";
  const q = (typeof sp.q === "string" ? sp.q : "").trim().slice(0, 100);
  const page = pageParam(sp.page);
  if (!isDbConfigured) return <DemoNotice />;
  const member = await requireActiveMembership();
  const { rows, total, counts } = await listAidRequests(member.organizationId, { view, q, page });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchBox action={BASE} q={q} placeholder="Référence ou bénéficiaire" keep={{ vue: view !== "a-traiter" ? view : undefined }} />
        {canCreateAidRequest(member.role) && (
          <PrimaryLink href={`${BASE}/nouvelle`} icon={Plus}>
            Nouvelle demande
          </PrimaryLink>
        )}
      </div>
      <FilterChips
        label="Filtrer par état"
        items={(Object.keys(aidViews) as AidView[]).map((v) => ({ href: href({ vue: v, q }), label: `${aidViews[v].label} (${counts[v]})`, active: v === view }))}
      />
      {rows.length === 0 ? (
        <EmptyState icon={HandHelping} title={q ? `Aucun résultat pour « ${q} »` : "Aucune demande dans cette liste"} text="Les demandes reçues en ligne se convertissent depuis « Demandes en ligne »." />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-line bg-white shadow-sm md:block">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left font-semibold">
                <tr>
                  <th className="px-4 py-3">Référence</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Bénéficiaire</th>
                  <th className="px-4 py-3 text-right">Articles</th>
                  <th className="px-4 py-3">État</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-surface/60">
                    <td className="px-4 py-3">
                      <Link href={`${BASE}/${r.id}`} className="font-mono font-semibold text-brand hover:underline">
                        {r.reference}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{formatDay(r.requestedOn)}</td>
                    <td className="px-4 py-3">
                      {r.beneficiary}
                      {r.beneficiaryReference && <span className="text-muted"> · {r.beneficiaryReference}</span>}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.lines}</td>
                    <td className="px-4 py-3">
                      <Badge className={aidStatusStyles[r.status]}>{aidStatusLabels[r.status]}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="space-y-3 md:hidden">
            {rows.map((r) => (
              <li key={r.id}>
                <Link href={`${BASE}/${r.id}`} className="block rounded-xl border border-line bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono font-semibold text-brand">{r.reference}</span>
                    <Badge className={aidStatusStyles[r.status]}>{aidStatusLabels[r.status]}</Badge>
                  </div>
                  <p className="mt-2 font-semibold">{r.beneficiary}</p>
                  <p className="mt-0.5 text-sm text-muted">
                    {formatDay(r.requestedOn)} · {r.lines} article{r.lines > 1 ? "s" : ""}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination page={page} pages={Math.max(1, Math.ceil(total / PAGE_SIZE))} hrefFor={(p) => href({ vue: view, q, page: p })} />
        </>
      )}
    </div>
  );
}

export default function AidRequestsPage({ searchParams }: Props) {
  return (
    <div className="space-y-6">
      <PageHeader title="Demandes d'aide" subtitle="Instruction et approbation des demandes" />
      <Suspense fallback={skeleton()}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
