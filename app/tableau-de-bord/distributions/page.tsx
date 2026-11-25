import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft, ChevronRight, Plus, Truck } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { DemoNotice } from "@/components/admin/DemoNotice";
import { DistributionStatusBadge } from "@/components/admin/distributions/StatusBadge";
import { isDbConfigured } from "@/db";
import { listDistributions, PAGE_SIZE } from "@/lib/distributions";
import {
  canPrepareDistribution,
  distributionStatuses,
  formatDay,
  isDistributionStatus,
  type DistributionStatus,
} from "@/lib/distributions-shared";
import { requireActiveMembership } from "@/lib/session";

export const metadata: Metadata = { title: "Distributions" };

const BASE = "/tableau-de-bord/distributions";
type Props = PageProps<"/tableau-de-bord/distributions">;

const href = (statut?: DistributionStatus, page?: number) => {
  const q = new URLSearchParams();
  if (statut) q.set("statut", statut);
  if (page && page > 1) q.set("page", String(page));
  const s = q.toString();
  return s ? `${BASE}?${s}` : BASE;
};

const plural: Record<DistributionStatus, string> = { draft: "Brouillons", completed: "Effectuées", cancelled: "Annulées" };

async function Content({ searchParams }: { searchParams: Props["searchParams"] }) {
  // Paramètres d'URL revalidés : statut connu, page bornée.
  const sp = await searchParams;
  const statut = isDistributionStatus(sp.statut) ? sp.statut : undefined;
  const page = Math.max(1, Math.min(1000, Number.parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1));

  if (!isDbConfigured) return <DemoNotice />;

  const member = await requireActiveMembership();
  const { rows, total, counts } = await listDistributions(member.organizationId, statut, page);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const all = counts.draft + counts.completed + counts.cancelled;
  const chip = (active: boolean) =>
    `inline-block rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${active ? "border-brand bg-brand text-white" : "border-line bg-white hover:border-brand"}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap gap-2" aria-label="Filtrer par statut">
          <li>
            <Link href={href()} className={chip(!statut)} aria-current={!statut ? "true" : undefined}>
              Toutes ({all})
            </Link>
          </li>
          {distributionStatuses.map((s) => (
            <li key={s}>
              <Link href={href(s)} className={chip(statut === s)} aria-current={statut === s ? "true" : undefined}>
                {plural[s]} ({counts[s]})
              </Link>
            </li>
          ))}
        </ul>
        {canPrepareDistribution(member.role) && (
          <Link
            href={`${BASE}/nouvelle`}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark"
          >
            <Plus className="size-4" /> Nouvelle distribution
          </Link>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="grid place-items-center rounded-xl border border-dashed border-line bg-white px-6 py-16 text-center">
          <Truck className="size-9 text-brand" />
          <p className="mt-3 font-semibold">{statut ? "Aucune distribution avec ce statut" : "Aucune distribution pour le moment"}</p>
          <p className="mt-1 max-w-md text-sm text-muted">Préparez une distribution : elle sortira du stock au moment de sa validation.</p>
        </div>
      ) : (
        <>
          {/* Tableau (écrans moyens et grands) */}
          <div className="hidden overflow-hidden rounded-xl border border-line bg-white shadow-sm md:block">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left font-semibold">
                <tr>
                  <th className="px-4 py-3">Référence</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Bénéficiaire</th>
                  <th className="px-4 py-3">Dépôt</th>
                  <th className="px-4 py-3 text-right">Articles</th>
                  <th className="px-4 py-3">Statut</th>
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
                    <td className="whitespace-nowrap px-4 py-3">{formatDay(r.distributedOn)}</td>
                    <td className="px-4 py-3">{r.beneficiary}</td>
                    <td className="px-4 py-3">{r.warehouse}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.lines}</td>
                    <td className="px-4 py-3">
                      <DistributionStatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cartes (mobile) */}
          <ul className="space-y-3 md:hidden">
            {rows.map((r) => (
              <li key={r.id}>
                <Link href={`${BASE}/${r.id}`} className="block rounded-xl border border-line bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono font-semibold text-brand">{r.reference}</span>
                    <DistributionStatusBadge status={r.status} />
                  </div>
                  <p className="mt-2 font-semibold">{r.beneficiary}</p>
                  <p className="mt-0.5 text-sm text-muted">
                    {formatDay(r.distributedOn)} · {r.warehouse} · {r.lines} article{r.lines > 1 ? "s" : ""}
                  </p>
                </Link>
              </li>
            ))}
          </ul>

          {pages > 1 && (
            <nav aria-label="Pagination" className="flex items-center justify-between gap-3">
              {page > 1 ? (
                <Link href={href(statut, page - 1)} className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium hover:border-brand">
                  <ChevronLeft className="size-4" /> Précédent
                </Link>
              ) : (
                <span />
              )}
              <span className="text-sm text-muted">
                Page {page} sur {pages}
              </span>
              {page < pages ? (
                <Link href={href(statut, page + 1)} className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium hover:border-brand">
                  Suivant <ChevronRight className="size-4" />
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}

export default function DistributionsPage({ searchParams }: Props) {
  return (
    <div className="space-y-6">
      <PageHeader title="Distributions" subtitle="Préparation et suivi des distributions" />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white" aria-busy="true" />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
