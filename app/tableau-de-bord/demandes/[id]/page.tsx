import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CalendarDays, User } from "lucide-react";
import { DemoNotice } from "@/components/admin/DemoNotice";
import { AidReviewActions } from "@/components/admin/aid-requests/AidReviewActions";
import { DistributionStatusBadge } from "@/components/admin/distributions/StatusBadge";
import { BackLink, Badge, Card, skeleton } from "@/components/admin/ui";
import { isDbConfigured } from "@/db";
import { getAidRequest } from "@/lib/aid-requests";
import { aidStatusLabels, aidStatusStyles, canReviewAidRequest } from "@/lib/aid-requests-shared";
import { canPrepareDistribution, formatDay, formatQty } from "@/lib/distributions-shared";
import { requireActiveMembership } from "@/lib/session";

export const metadata: Metadata = { title: "Demande d'aide" };
type Params = PageProps<"/tableau-de-bord/demandes/[id]">["params"];

async function Content({ params }: { params: Params }) {
  if (!isDbConfigured) return <DemoNotice />;
  const { id } = await params;
  const member = await requireActiveMembership();
  const r = await getAidRequest(member.organizationId, id);
  if (!r) notFound();
  const decided = r.status !== "submitted" && r.status !== "under_review";

  return (
    <div className="space-y-6">
      <header>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-2xl font-extrabold sm:text-3xl">{r.reference}</h1>
          <Badge className={aidStatusStyles[r.status]}>{aidStatusLabels[r.status]}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted">
          <Link href={`/tableau-de-bord/beneficiaires/${r.beneficiary.id}`} className="font-semibold text-brand hover:underline">
            {r.beneficiary.name}
          </Link>{" "}
          · demande du {formatDay(r.requestedOn)}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Card title={`Articles (${r.items.length})`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[28rem] text-sm">
                <thead className="bg-surface text-left font-semibold">
                  <tr>
                    <th className="px-5 py-2.5">Produit</th>
                    <th className="px-5 py-2.5 text-right">Demandé</th>
                    <th className="px-5 py-2.5 text-right">Accordé</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {r.items.map((i) => (
                    <tr key={i.productId}>
                      <td className="px-5 py-3">
                        <span className="font-medium">{i.name}</span> <span className="text-xs text-muted">· {i.category}</span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
                        {formatQty(i.requested)} {i.unit}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">{i.approved === null ? <span className="text-muted">—</span> : `${formatQty(i.approved)} ${i.unit}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {r.generalNote && (
            <Card title="Situation et remarques">
              <p className="whitespace-pre-wrap break-words px-5 py-4 text-sm text-ink/80">{r.generalNote}</p>
            </Card>
          )}
          {r.decisionNote && (
            <Card title="Décision">
              <p className="whitespace-pre-wrap break-words px-5 py-4 text-sm text-ink/80">{r.decisionNote}</p>
            </Card>
          )}
          {r.distributions.length > 0 && (
            <Card title="Distributions liées">
              <ul className="divide-y divide-line">
                {r.distributions.map((d) => (
                  <li key={d.id}>
                    <Link href={`/tableau-de-bord/distributions/${d.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm hover:bg-surface/60">
                      <span className="font-mono font-semibold text-brand">{d.reference}</span>
                      <span>{formatDay(d.distributedOn)}</span>
                      <span className="ml-auto">
                        <DistributionStatusBadge status={d.status} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <aside className="space-y-6">
          <Card title="Informations">
            <dl className="space-y-3 px-5 py-4 text-sm">
              <div className="flex gap-3">
                <User className="mt-0.5 size-4 shrink-0 text-muted" />
                <div>
                  <dt className="text-xs text-muted">Bénéficiaire</dt>
                  <dd className="font-medium">
                    {r.beneficiary.name}
                    {r.beneficiary.reference && <span className="text-muted"> · {r.beneficiary.reference}</span>}
                    {r.beneficiary.householdSize && <span className="block text-xs font-normal text-muted">Foyer de {r.beneficiary.householdSize} personnes</span>}
                  </dd>
                </div>
              </div>
              <div className="flex gap-3">
                <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted" />
                <div>
                  <dt className="text-xs text-muted">Date de la demande</dt>
                  <dd className="font-medium">{formatDay(r.requestedOn)}</dd>
                </div>
              </div>
              {decided && r.reviewedBy && (
                <div className="flex gap-3">
                  <User className="mt-0.5 size-4 shrink-0 text-muted" />
                  <div>
                    <dt className="text-xs text-muted">Décision</dt>
                    <dd className="font-medium">
                      {r.reviewedBy}
                      {r.reviewedAt && <span className="block text-xs font-normal text-muted">le {formatDay(r.reviewedAt.slice(0, 10))}</span>}
                    </dd>
                  </div>
                </div>
              )}
            </dl>
          </Card>
          <Card title="Actions">
            <div className="px-5 py-4">
              <AidReviewActions
                id={r.id}
                status={r.status}
                items={r.items.map((i) => ({ productId: i.productId, name: i.name, unit: i.unit, requested: i.requested }))}
                canReview={canReviewAidRequest(member.role)}
                canPrepare={canPrepareDistribution(member.role)}
              />
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}

/** `params` est lu dans une zone <Suspense> (exigence Next.js : navigation instantanée). */
export default function AidRequestPage(props: PageProps<"/tableau-de-bord/demandes/[id]">) {
  return (
    <div className="space-y-6">
      <BackLink href="/tableau-de-bord/demandes">Demandes d&apos;aide</BackLink>
      <Suspense fallback={skeleton()}>
        <Content params={props.params} />
      </Suspense>
    </div>
  );
}
