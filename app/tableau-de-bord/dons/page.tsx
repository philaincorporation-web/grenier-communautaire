import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Gift, Plus, Users } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { DemoNotice } from "@/components/admin/DemoNotice";
import { Badge, EmptyState, FilterChips, Pagination, PrimaryLink, SearchBox, skeleton } from "@/components/admin/ui";
import { isDbConfigured } from "@/db";
import { pageParam } from "@/lib/admin/refs";
import { formatDay } from "@/lib/distributions-shared";
import { listDonations, listDonors, PAGE_SIZE } from "@/lib/donations";
import { canRegisterDonation, canSeeDonorContact, donationStatusLabels, donationStatusStyles, donationViews, donorTypeLabels, isDonationView, type DonationView } from "@/lib/donations-shared";
import { requireActiveMembership } from "@/lib/session";

export const metadata: Metadata = { title: "Dons" };
const BASE = "/tableau-de-bord/dons";
type Props = PageProps<"/tableau-de-bord/dons">;

const href = (p: { onglet?: string; vue?: DonationView; q?: string; page?: number }) => {
  const s = new URLSearchParams();
  if (p.onglet === "donateurs") s.set("onglet", "donateurs");
  if (p.vue && p.vue !== "recus") s.set("vue", p.vue);
  if (p.q) s.set("q", p.q);
  if (p.page && p.page > 1) s.set("page", String(p.page));
  const str = s.toString();
  return str ? `${BASE}?${str}` : BASE;
};

async function Content({ searchParams }: { searchParams: Props["searchParams"] }) {
  const sp = await searchParams;
  const donorsTab = sp.onglet === "donateurs";
  const view: DonationView = isDonationView(sp.vue) ? sp.vue : "recus";
  const q = (typeof sp.q === "string" ? sp.q : "").trim().slice(0, 100);
  const page = pageParam(sp.page);
  if (!isDbConfigured) return <DemoNotice />;
  const member = await requireActiveMembership();

  const tabs = (
    <nav aria-label="Vue" className="flex gap-1 border-b border-line">
      {[
        { id: "dons", label: "Dons", href: href({}) },
        { id: "donateurs", label: "Donateurs", href: href({ onglet: "donateurs" }) },
      ].map((t) => {
        const active = (t.id === "donateurs") === donorsTab;
        return (
          <Link key={t.id} href={t.href} aria-current={active ? "page" : undefined} className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold ${active ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink"}`}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
  const toolbar = (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <SearchBox action={BASE} q={q} placeholder={donorsTab ? "Nom du donateur" : "Référence ou donateur"} keep={{ onglet: donorsTab ? "donateurs" : undefined, vue: !donorsTab && view !== "recus" ? view : undefined }} />
      {canRegisterDonation(member.role) && (
        <PrimaryLink href={`${BASE}/nouveau`} icon={Plus}>
          Enregistrer un don
        </PrimaryLink>
      )}
    </div>
  );

  if (donorsTab) {
    const withContact = canSeeDonorContact(member.role);
    const { rows, total } = await listDonors(member.organizationId, { q, page, withContact });
    return (
      <div className="space-y-5">
        {tabs}
        {toolbar}
        {rows.length === 0 ? (
          <EmptyState icon={Users} title={q ? `Aucun donateur pour « ${q} »` : "Aucun donateur"} text="Un donateur est créé lors de l'enregistrement de son premier don." />
        ) : (
          <>
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white shadow-sm">
              {rows.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-semibold">{d.name}</p>
                    <p className="text-xs text-muted">
                      {donorTypeLabels[d.type]}
                      {withContact && (d.phone || d.email) ? ` · ${[d.phone, d.email].filter(Boolean).join(" · ")}` : ""}
                    </p>
                  </div>
                  <p className="text-sm">
                    <span className="font-semibold tabular-nums">{d.donations}</span> don{d.donations > 1 ? "s" : ""}
                    {d.lastDonation && <span className="text-muted"> · dernier le {formatDay(d.lastDonation)}</span>}
                  </p>
                </li>
              ))}
            </ul>
            <Pagination page={page} pages={Math.max(1, Math.ceil(total / PAGE_SIZE))} hrefFor={(p) => href({ onglet: "donateurs", q, page: p })} />
          </>
        )}
      </div>
    );
  }

  const { rows, total, counts } = await listDonations(member.organizationId, { view, q, page });
  return (
    <div className="space-y-5">
      {tabs}
      {toolbar}
      <FilterChips label="Filtrer par état" items={(Object.keys(donationViews) as DonationView[]).map((v) => ({ href: href({ vue: v, q }), label: `${donationViews[v].label} (${counts[v]})`, active: v === view }))} />
      {rows.length === 0 ? (
        <EmptyState icon={Gift} title={q ? `Aucun don pour « ${q} »` : "Aucun don dans cette liste"} text="Enregistrez la réception d'un don : les articles entrent aussitôt en stock." />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-line bg-white shadow-sm md:block">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left font-semibold">
                <tr>
                  <th className="px-4 py-3">Référence</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Donateur</th>
                  <th className="px-4 py-3">Dépôt</th>
                  <th className="px-4 py-3 text-right">Articles</th>
                  <th className="px-4 py-3">État</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-surface/60">
                    <td className="px-4 py-3">
                      <Link href={`${BASE}/${r.id}`} className="font-mono font-semibold text-brand hover:underline">
                        {r.reference ?? "—"}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{formatDay(r.receivedOn)}</td>
                    <td className="px-4 py-3">{r.donor}</td>
                    <td className="px-4 py-3">{r.warehouse ?? "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.lines}</td>
                    <td className="px-4 py-3">
                      <Badge className={donationStatusStyles[r.status]}>{donationStatusLabels[r.status]}</Badge>
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
                    <Badge className={donationStatusStyles[r.status]}>{donationStatusLabels[r.status]}</Badge>
                  </div>
                  <p className="mt-2 font-semibold">{r.donor}</p>
                  <p className="mt-0.5 text-sm text-muted">
                    {formatDay(r.receivedOn)} · {r.warehouse ?? "—"} · {r.lines} article{r.lines > 1 ? "s" : ""}
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

export default function DonationsPage({ searchParams }: Props) {
  return (
    <div className="space-y-6">
      <PageHeader title="Dons" subtitle="Réception des dons et entrée en stock" />
      <Suspense fallback={skeleton()}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
