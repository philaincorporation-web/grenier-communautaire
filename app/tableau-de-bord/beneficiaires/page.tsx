import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft, ChevronRight, Plus, Search, Users } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { DemoNotice } from "@/components/admin/DemoNotice";
import { isDbConfigured } from "@/db";
import { listBeneficiaries, PAGE_SIZE, type ActiveFilter } from "@/lib/beneficiaries";
import { beneficiaryTypeLabels, canManageBeneficiaries, canSeeBeneficiaryContact, formatDate } from "@/lib/beneficiaries-shared";
import { requireActiveMembership } from "@/lib/session";

export const metadata: Metadata = { title: "Bénéficiaires" };

const BASE = "/tableau-de-bord/beneficiaires";
type Props = PageProps<"/tableau-de-bord/beneficiaires">;

const filters: { id: ActiveFilter; label: string }[] = [
  { id: "actifs", label: "Actifs" },
  { id: "inactifs", label: "Inactifs" },
  { id: "tous", label: "Tous" },
];

const href = (p: { q?: string; etat?: ActiveFilter; page?: number }) => {
  const s = new URLSearchParams();
  if (p.q) s.set("q", p.q);
  if (p.etat && p.etat !== "actifs") s.set("etat", p.etat);
  if (p.page && p.page > 1) s.set("page", String(p.page));
  const str = s.toString();
  return str ? `${BASE}?${str}` : BASE;
};

async function Content({ searchParams }: { searchParams: Props["searchParams"] }) {
  // Paramètres d'URL revalidés : recherche bornée, filtre connu, page bornée.
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim().slice(0, 100);
  const etat: ActiveFilter = sp.etat === "inactifs" || sp.etat === "tous" ? sp.etat : "actifs";
  const page = Math.max(1, Math.min(1000, Number.parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1));

  if (!isDbConfigured) return <DemoNotice />;
  const member = await requireActiveMembership();
  const withContact = canSeeBeneficiaryContact(member.role);
  const { rows, total, counts } = await listBeneficiaries(member.organizationId, { q, active: etat, page, withContact });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const countOf = (f: ActiveFilter) => (f === "actifs" ? counts.actifs : f === "inactifs" ? counts.inactifs : counts.actifs + counts.inactifs);
  const chip = (active: boolean) =>
    `inline-block rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${active ? "border-brand bg-brand text-white" : "border-line bg-white hover:border-brand"}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <form action={BASE} role="search" className="flex w-full max-w-md gap-2">
          {etat !== "actifs" && <input type="hidden" name="etat" value={etat} />}
          <label htmlFor="q" className="sr-only">
            Rechercher un bénéficiaire
          </label>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              id="q"
              name="q"
              defaultValue={q}
              placeholder={withContact ? "Nom, référence ou téléphone" : "Nom ou référence"}
              className="w-full rounded-lg border border-line bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <button type="submit" className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold hover:border-brand">
            Rechercher
          </button>
        </form>
        {canManageBeneficiaries(member.role) && (
          <Link href={`${BASE}/nouveau`} className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark">
            <Plus className="size-4" /> Nouveau bénéficiaire
          </Link>
        )}
      </div>

      <ul className="flex flex-wrap gap-2" aria-label="Filtrer par état">
        {filters.map((f) => (
          <li key={f.id}>
            <Link href={href({ q, etat: f.id })} className={chip(etat === f.id)} aria-current={etat === f.id ? "true" : undefined}>
              {f.label} ({countOf(f.id)})
            </Link>
          </li>
        ))}
      </ul>

      {rows.length === 0 ? (
        <div className="grid place-items-center rounded-xl border border-dashed border-line bg-white px-6 py-16 text-center">
          <Users className="size-9 text-brand" />
          <p className="mt-3 font-semibold">{q ? `Aucun résultat pour « ${q} »` : "Aucun bénéficiaire dans cette liste"}</p>
          {q && (
            <Link href={href({ etat })} className="mt-2 text-sm font-semibold text-brand hover:underline">
              Effacer la recherche
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-line bg-white shadow-sm md:block">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left font-semibold">
                <tr>
                  <th className="px-4 py-3">Référence</th>
                  <th className="px-4 py-3">Nom</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Foyer</th>
                  {withContact && <th className="px-4 py-3">Téléphone</th>}
                  <th className="px-4 py-3">Distributions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.id} className={`hover:bg-surface/60 ${r.isActive ? "" : "text-muted"}`}>
                    <td className="px-4 py-3 font-mono text-xs">{r.reference ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Link href={`${BASE}/${r.id}`} className="font-semibold text-brand hover:underline">
                        {r.name}
                      </Link>
                      {!r.isActive && <span className="ml-2 rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-muted">Inactif</span>}
                    </td>
                    <td className="px-4 py-3">{beneficiaryTypeLabels[r.type]}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.householdSize ?? "—"}</td>
                    {withContact && <td className="whitespace-nowrap px-4 py-3">{r.phone ?? "—"}</td>}
                    <td className="px-4 py-3">
                      {r.distributions > 0 ? (
                        <>
                          <span className="font-semibold tabular-nums">{r.distributions}</span>
                          <span className="text-muted"> · dernière le {formatDate(r.lastDistribution!)}</span>
                        </>
                      ) : (
                        <span className="text-muted">Aucune</span>
                      )}
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
                    <span className="font-semibold text-brand">{r.name}</span>
                    <span className="font-mono text-xs text-muted">{r.reference}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {beneficiaryTypeLabels[r.type]}
                    {r.householdSize ? ` · ${r.householdSize} pers.` : ""} · {r.distributions} distribution{r.distributions > 1 ? "s" : ""}
                    {!r.isActive && " · Inactif"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>

          {pages > 1 && (
            <nav aria-label="Pagination" className="flex items-center justify-between gap-3">
              {page > 1 ? (
                <Link href={href({ q, etat, page: page - 1 })} className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium hover:border-brand">
                  <ChevronLeft className="size-4" /> Précédent
                </Link>
              ) : (
                <span />
              )}
              <span className="text-sm text-muted">
                Page {page} sur {pages}
              </span>
              {page < pages ? (
                <Link href={href({ q, etat, page: page + 1 })} className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium hover:border-brand">
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

export default function BeneficiariesPage({ searchParams }: Props) {
  return (
    <div className="space-y-6">
      <PageHeader title="Bénéficiaires" subtitle="Personnes et familles accompagnées" />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white" aria-busy="true" />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
