import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Boxes, Inbox, MapPin, Network, Pencil, Plus, Truck, User } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { DemoNotice } from "@/components/admin/DemoNotice";
import { Badge, EmptyState, PrimaryLink, skeleton } from "@/components/admin/ui";
import { isDbConfigured } from "@/db";
import { getNewCounts } from "@/lib/online-requests";
import { canManageOnlineRequests } from "@/lib/online-requests-shared";
import { canManageRelais, listRelais } from "@/lib/relais";
import { requireActiveMembership } from "@/lib/session";

export const metadata: Metadata = { title: "Relais" };

async function Content() {
  if (!isDbConfigured) return <DemoNotice />;
  const member = await requireActiveMembership();
  const manage = canManageRelais(member.role);
  const [relais, newCounts] = await Promise.all([
    listRelais(member.organizationId),
    canManageOnlineRequests(member.role) ? getNewCounts(member.organizationId) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {newCounts && newCounts.benevoles > 0 ? (
          <Link href="/tableau-de-bord/demandes-en-ligne?type=benevoles" className="inline-flex items-center gap-2 rounded-lg bg-brand-soft px-3 py-2 text-sm font-semibold text-brand hover:underline">
            <Inbox className="size-4" /> {newCounts.benevoles} nouvelle{newCounts.benevoles > 1 ? "s" : ""} candidature{newCounts.benevoles > 1 ? "s" : ""} de bénévole
          </Link>
        ) : (
          <span />
        )}
        {manage && (
          <PrimaryLink href="/tableau-de-bord/relais/nouveau" icon={Plus}>
            Nouveau relais
          </PrimaryLink>
        )}
      </div>
      {relais.length === 0 ? (
        <EmptyState icon={Network} title="Aucun relais" text="Créez un premier dépôt ou point relais pour recevoir des dons et organiser des distributions." />
      ) : (
        <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {relais.map((r) => (
            <li key={r.id} className={`flex flex-col rounded-xl border bg-white p-5 shadow-sm ${r.isActive ? "border-line" : "border-dashed border-line opacity-75"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-bold">{r.name}</h2>
                  {r.code && <p className="font-mono text-xs text-muted">{r.code}</p>}
                </div>
                {!r.isActive && <Badge className="bg-surface text-muted">Inactif</Badge>}
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-muted" />
                  <dd>{r.address ?? <span className="text-muted">Adresse non renseignée</span>}</dd>
                </div>
                <div className="flex gap-2">
                  <User className="mt-0.5 size-4 shrink-0 text-muted" />
                  <dd>{r.manager ?? <span className="text-muted">Aucun responsable</span>}</dd>
                </div>
              </dl>
              <dl className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-surface p-3 text-center">
                <div>
                  <dd className="text-xl font-extrabold text-brand">{r.productsInStock}</dd>
                  <dt className="text-[11px] text-muted">produits en stock</dt>
                </div>
                <div>
                  <dd className="text-xl font-extrabold text-brand">{r.receipts30}</dd>
                  <dt className="text-[11px] text-muted">dons (30 j)</dt>
                </div>
                <div>
                  <dd className="text-xl font-extrabold text-brand">{r.distributions30}</dd>
                  <dt className="text-[11px] text-muted">distributions (30 j)</dt>
                </div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2 pt-1">
                <Link href={`/tableau-de-bord/stocks?depot=${r.id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-semibold hover:border-brand">
                  <Boxes className="size-4" /> Stock
                </Link>
                <Link href={`/tableau-de-bord/distributions`} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-semibold hover:border-brand">
                  <Truck className="size-4" /> Distributions
                </Link>
                {manage && (
                  <Link href={`/tableau-de-bord/relais/${r.id}/modifier`} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-semibold hover:border-brand">
                    <Pencil className="size-4" /> Modifier
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function RelaisPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Relais" subtitle="Dépôts et points relais des Hommes de Bien" />
      <Suspense fallback={skeleton()}>
        <Content />
      </Suspense>
    </div>
  );
}
