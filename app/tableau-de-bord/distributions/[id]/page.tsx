import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, ArrowRightLeft, CalendarDays, ClipboardList, TriangleAlert, User, Warehouse } from "lucide-react";
import { DemoNotice } from "@/components/admin/DemoNotice";
import { DistributionActions } from "@/components/admin/distributions/DistributionActions";
import { DistributionStatusBadge } from "@/components/admin/distributions/StatusBadge";
import { isDbConfigured } from "@/db";
import { getDistribution } from "@/lib/distributions";
import { canReverseDistribution, canValidateDistribution, formatDay, formatQty, toMilli } from "@/lib/distributions-shared";
import { requireActiveMembership } from "@/lib/session";

export const metadata: Metadata = { title: "Distribution" };

type Params = PageProps<"/tableau-de-bord/distributions/[id]">["params"];

const movementLabels: Record<string, string> = {
  issue: "Sortie de stock",
  adjustment_in: "Remise en stock (annulation)",
  receipt: "Entrée",
  adjustment_out: "Ajustement sortant",
  transfer: "Transfert",
};

const dateTime = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Libreville" });

function Info({ icon: Icon, label, children }: { icon: typeof User; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted" />
      <div className="min-w-0">
        <dt className="text-xs text-muted">{label}</dt>
        <dd className="text-sm font-medium">{children}</dd>
      </div>
    </div>
  );
}

async function Content({ params }: { params: Params }) {
  if (!isDbConfigured) return <DemoNotice />;
  const { id } = await params;
  const member = await requireActiveMembership();
  const d = await getDistribution(member.organizationId, id);
  if (!d) notFound();

  const shortages = d.items.filter((i) => i.available !== null && toMilli(i.quantity) > toMilli(i.available));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-2xl font-extrabold sm:text-3xl">{d.reference}</h1>
            <DistributionStatusBadge status={d.status} />
          </div>
          <p className="mt-1 text-sm text-muted">
            {d.beneficiary.name} · {formatDay(d.distributedOn)} · {d.warehouse}
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
            <h2 className="border-b border-line px-5 py-3 font-bold">
              Articles ({d.items.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[28rem] text-sm">
                <thead className="bg-surface text-left font-semibold">
                  <tr>
                    <th className="px-5 py-2.5">Produit</th>
                    <th className="px-5 py-2.5">Catégorie</th>
                    <th className="px-5 py-2.5 text-right">Quantité</th>
                    {d.status === "draft" && <th className="px-5 py-2.5 text-right">Disponible</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {d.items.map((i) => {
                    const short = i.available !== null && toMilli(i.quantity) > toMilli(i.available);
                    return (
                      <tr key={i.productId}>
                        <td className="px-5 py-3 font-medium">{i.name}</td>
                        <td className="px-5 py-3 text-muted">{i.category}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
                          {formatQty(i.quantity)} {i.unit}
                        </td>
                        {d.status === "draft" && (
                          <td className={`whitespace-nowrap px-5 py-3 text-right tabular-nums ${short ? "font-semibold text-amber-700" : "text-muted"}`}>
                            {short && <TriangleAlert className="mr-1 inline size-3.5" aria-label="Stock insuffisant" />}
                            {formatQty(i.available ?? 0)} {i.unit}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {d.note && (
            <section className="rounded-xl border border-line bg-white p-5 shadow-sm">
              <h2 className="font-bold">Remarques</h2>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm text-ink/80">{d.note}</p>
            </section>
          )}

          {d.movements.length > 0 && (
            <section className="rounded-xl border border-line bg-white p-5 shadow-sm">
              <h2 className="font-bold">Mouvements de stock</h2>
              <ul className="mt-3 space-y-2">
                {d.movements.map((m) => (
                  <li key={m.reference} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <ArrowRightLeft className="size-4 text-muted" />
                    <span className="font-mono font-semibold">{m.reference}</span>
                    <span>{movementLabels[m.type] ?? m.type}</span>
                    <span className="text-muted">{dateTime.format(new Date(m.occurredAt))}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section className="rounded-xl border border-line bg-white p-5 shadow-sm">
            <h2 className="font-bold">Informations</h2>
            <dl className="mt-4 space-y-4">
              <Info icon={User} label="Bénéficiaire">
                {d.beneficiary.name}
                {d.beneficiary.reference && <span className="text-muted"> · {d.beneficiary.reference}</span>}
                {d.beneficiary.householdSize && (
                  <span className="block text-xs font-normal text-muted">
                    Foyer de {d.beneficiary.householdSize} personne{d.beneficiary.householdSize > 1 ? "s" : ""}
                  </span>
                )}
              </Info>
              <Info icon={Warehouse} label="Dépôt">
                {d.warehouse}
              </Info>
              <Info icon={CalendarDays} label="Date de distribution">
                {formatDay(d.distributedOn)}
              </Info>
              {d.aidRequestReference && (
                <Info icon={ClipboardList} label="Demande d'aide">
                  <span className="font-mono">{d.aidRequestReference}</span>
                </Info>
              )}
              {d.distributedBy && (
                <Info icon={User} label="Validée par">
                  {d.distributedBy}
                </Info>
              )}
              {d.recipientAcknowledgement && (
                <Info icon={User} label="Remis à">
                  {d.recipientAcknowledgement}
                </Info>
              )}
            </dl>
          </section>

          <section className="rounded-xl border border-line bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-bold">Actions</h2>
            <DistributionActions
              id={d.id}
              status={d.status}
              warehouse={d.warehouse}
              lines={d.items.length}
              hasShortage={shortages.length > 0}
              canValidate={canValidateDistribution(member.role)}
              canReverse={canReverseDistribution(member.role)}
            />
            {d.status === "cancelled" && <p className="text-sm text-muted">Distribution annulée : aucune action possible.</p>}
          </section>
        </aside>
      </div>
    </div>
  );
}

/** `params` est lu dans une zone <Suspense> (exigence Next.js : navigation instantanée). */
export default function DistributionPage(props: PageProps<"/tableau-de-bord/distributions/[id]">) {
  return (
    <div className="space-y-6">
      <Link href="/tableau-de-bord/distributions" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-brand">
        <ArrowLeft className="size-4" /> Distributions
      </Link>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white" aria-busy="true" />}>
        <Content params={props.params} />
      </Suspense>
    </div>
  );
}
