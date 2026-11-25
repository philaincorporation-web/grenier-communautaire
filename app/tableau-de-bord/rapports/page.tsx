import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ClipboardList, Download, Gift, HandHeart, Users } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { DemoNotice } from "@/components/admin/DemoNotice";
import { ActivityChart } from "@/components/admin/reports/ActivityChart";
import { Card, FilterChips, skeleton } from "@/components/admin/ui";
import { isDbConfigured } from "@/db";
import { formatDay, formatQty } from "@/lib/distributions-shared";
import { canExportReports, DEFAULT_PERIOD, exportTypes, getReport, isPeriod, periods, type ExportType, type Period } from "@/lib/reports";
import { requireActiveMembership } from "@/lib/session";

export const metadata: Metadata = { title: "Rapports" };
const BASE = "/tableau-de-bord/rapports";
type Props = PageProps<"/tableau-de-bord/rapports">;
const nf = new Intl.NumberFormat("fr-FR");
const hrefFor = (p: Period) => (p === DEFAULT_PERIOD ? BASE : `${BASE}?periode=${p}`);

function Kpi({ icon: Icon, label, value, detail }: { icon: typeof Gift; label: string; value: number; detail?: string }) {
  return (
    <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
      <p className="flex items-center gap-2 text-sm font-semibold text-muted">
        <Icon className="size-4 text-brand" /> {label}
      </p>
      <p className="mt-2 text-3xl font-extrabold tabular-nums">{nf.format(value)}</p>
      {detail && <p className="mt-1 text-xs text-muted">{detail}</p>}
    </div>
  );
}

async function Content({ searchParams }: { searchParams: Props["searchParams"] }) {
  const sp = await searchParams;
  const period: Period = isPeriod(sp.periode) ? sp.periode : DEFAULT_PERIOD;
  if (!isDbConfigured) return <DemoNotice />;
  const member = await requireActiveMembership();
  const r = await getReport(member.organizationId, period);
  const k = r.kpis;
  const canExport = canExportReports(member.role);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterChips label="Période" items={(Object.keys(periods) as Period[]).map((p) => ({ href: hrefFor(p), label: periods[p].label, active: p === period }))} />
        {canExport && (
          <div className="flex flex-wrap gap-2">
            {(Object.keys(exportTypes) as ExportType[]).map((t) => (
              <a key={t} href={`${BASE}/export?type=${t}&periode=${period}`} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold hover:border-brand" download>
                <Download className="size-4" /> {exportTypes[t]} (CSV)
              </a>
            ))}
          </div>
        )}
      </div>
      <p className="text-sm text-muted">
        Du {formatDay(r.range.from)} au {formatDay(r.range.to)}. Seules les opérations validées sont comptées (dons reçus, distributions remises).
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={HandHeart} label="Distributions remises" value={k.distributions} />
        <Kpi icon={Users} label="Bénéficiaires servis" value={k.beneficiaries} detail={`${nf.format(k.people)} personne${k.people > 1 ? "s" : ""} dans leurs foyers`} />
        <Kpi icon={Gift} label="Dons reçus" value={k.donations} detail={`${nf.format(k.donors)} donateur${k.donors > 1 ? "s" : ""}`} />
        <Kpi icon={ClipboardList} label="Demandes d'aide" value={k.aidRequests} detail={`${nf.format(k.aidApproved)} approuvée${k.aidApproved > 1 ? "s" : ""}`} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ActivityChart title="Distributions remises" unit={["distribution", "distributions"]} bucket={r.bucket} points={r.series.map((s) => ({ start: s.start, value: s.distributions }))} />
        <ActivityChart title="Dons reçus" unit={["don", "dons"]} bucket={r.bucket} points={r.series.map((s) => ({ start: s.start, value: s.donations }))} />
      </div>

      <Card title="Mouvements par produit">
        {r.flows.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted">Aucun mouvement sur la période.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left font-semibold">
                <tr>
                  <th className="px-5 py-2.5">Produit</th>
                  <th className="px-5 py-2.5 text-right">Reçu</th>
                  <th className="px-5 py-2.5 text-right">Distribué</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {r.flows.map((f) => (
                  <tr key={f.id}>
                    <td className="px-5 py-2.5">
                      <span className="font-medium">{f.name}</span>
                      {f.category && <span className="block text-xs text-muted">{f.category}</span>}
                    </td>
                    <td className="whitespace-nowrap px-5 py-2.5 text-right tabular-nums">{f.received ? `${formatQty(f.received)} ${f.unit}` : "—"}</td>
                    <td className="whitespace-nowrap px-5 py-2.5 text-right font-semibold tabular-nums">{f.distributed ? `${formatQty(f.distributed)} ${f.unit}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Stock actuel par relais</h2>
        {r.stock.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-white px-4 py-8 text-center text-sm text-muted">Aucun relais actif.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {r.stock.map((w) => (
              <Card key={w.id} title={w.name} action={<Link href={`/tableau-de-bord/stocks?depot=${w.id}`} className="text-sm font-semibold text-brand hover:underline">Détail</Link>}>
                {w.items.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-muted">Stock vide.</p>
                ) : (
                  <ul className="divide-y divide-line text-sm">
                    {w.items.slice(0, 6).map((i) => (
                      <li key={i.id} className="flex justify-between gap-3 px-5 py-2">
                        <span className="truncate">{i.name}</span>
                        <span className="whitespace-nowrap tabular-nums">
                          {formatQty(i.quantity)} {i.unit}
                        </span>
                      </li>
                    ))}
                    {w.items.length > 6 && <li className="px-5 py-2 text-xs text-muted">+ {w.items.length - 6} autre{w.items.length - 6 > 1 ? "s" : ""} produit{w.items.length - 6 > 1 ? "s" : ""}</li>}
                  </ul>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function ReportsPage({ searchParams }: Props) {
  return (
    <div className="space-y-6">
      <PageHeader title="Rapports" subtitle="Indicateurs d'activité et impact communautaire" />
      <Suspense fallback={skeleton("h-96")}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
