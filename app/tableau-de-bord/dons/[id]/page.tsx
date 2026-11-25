import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowRightLeft, CalendarDays, Mail, Phone, User, Warehouse } from "lucide-react";
import { DemoNotice } from "@/components/admin/DemoNotice";
import { DonationCancel } from "@/components/admin/donations/DonationCancel";
import { BackLink, Badge, Card, skeleton } from "@/components/admin/ui";
import { isDbConfigured } from "@/db";
import { formatDay, formatQty } from "@/lib/distributions-shared";
import { getDonation } from "@/lib/donations";
import { canCancelDonation, canSeeDonorContact, donationStatusLabels, donationStatusStyles, donorTypeLabels } from "@/lib/donations-shared";
import { requireActiveMembership } from "@/lib/session";

export const metadata: Metadata = { title: "Don" };
type Params = PageProps<"/tableau-de-bord/dons/[id]">["params"];
const mvLabels: Record<string, string> = { receipt: "Entrée en stock", adjustment_out: "Retrait (annulation)" };
const dt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Libreville" });

async function Content({ params }: { params: Params }) {
  if (!isDbConfigured) return <DemoNotice />;
  const { id } = await params;
  const member = await requireActiveMembership();
  const d = await getDonation(member.organizationId, id, canSeeDonorContact(member.role));
  if (!d) notFound();

  return (
    <div className="space-y-6">
      <header>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-2xl font-extrabold sm:text-3xl">{d.reference ?? "Don"}</h1>
          <Badge className={donationStatusStyles[d.status]}>{donationStatusLabels[d.status]}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted">
          {d.donor.name} · reçu le {formatDay(d.receivedOn)}
          {d.warehouse ? ` · ${d.warehouse.name}` : ""}
        </p>
      </header>
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Card title={`Articles reçus (${d.items.length})`}>
            <ul className="divide-y divide-line">
              {d.items.map((i) => (
                <li key={i.productId} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                  <span>
                    <span className="font-medium">{i.name}</span> <span className="text-xs text-muted">· {i.category}</span>
                  </span>
                  <span className="whitespace-nowrap tabular-nums">
                    {formatQty(i.quantity)} {i.unit}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
          {d.notes && (
            <Card title="Remarques">
              <p className="whitespace-pre-wrap break-words px-5 py-4 text-sm text-ink/80">{d.notes}</p>
            </Card>
          )}
          {d.movements.length > 0 && (
            <Card title="Mouvements de stock">
              <ul className="space-y-2 px-5 py-4">
                {d.movements.map((m) => (
                  <li key={m.reference} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <ArrowRightLeft className="size-4 text-muted" />
                    <span className="font-mono font-semibold">{m.reference}</span>
                    <span>{mvLabels[m.type] ?? m.type}</span>
                    <span className="text-muted">{dt.format(new Date(m.occurredAt))}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
        <aside className="space-y-6">
          <Card title="Donateur">
            <dl className="space-y-3 px-5 py-4 text-sm">
              <div className="flex gap-3">
                <User className="mt-0.5 size-4 shrink-0 text-muted" />
                <div>
                  <dt className="sr-only">Nom</dt>
                  <dd className="font-medium">
                    {d.donor.name}
                    <span className="block text-xs font-normal text-muted">{donorTypeLabels[d.donor.type]}</span>
                  </dd>
                </div>
              </div>
              {d.donor.phone && (
                <div className="flex gap-3">
                  <Phone className="mt-0.5 size-4 shrink-0 text-muted" />
                  <dd>{d.donor.phone}</dd>
                </div>
              )}
              {d.donor.email && (
                <div className="flex gap-3">
                  <Mail className="mt-0.5 size-4 shrink-0 text-muted" />
                  <dd className="break-words">{d.donor.email}</dd>
                </div>
              )}
              <div className="flex gap-3">
                <Warehouse className="mt-0.5 size-4 shrink-0 text-muted" />
                <div>
                  <dt className="text-xs text-muted">Dépôt</dt>
                  <dd className="font-medium">{d.warehouse?.name ?? "—"}</dd>
                </div>
              </div>
              <div className="flex gap-3">
                <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted" />
                <div>
                  <dt className="text-xs text-muted">Reçu le</dt>
                  <dd className="font-medium">
                    {formatDay(d.receivedOn)}
                    {d.receivedBy && <span className="block text-xs font-normal text-muted">par {d.receivedBy}</span>}
                  </dd>
                </div>
              </div>
            </dl>
          </Card>
          {d.status === "received" && canCancelDonation(member.role) && (
            <Card title="Actions">
              <div className="px-5 py-4">
                <DonationCancel id={d.id} warehouse={d.warehouse?.name ?? null} />
              </div>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

/** `params` est lu dans une zone <Suspense> (exigence Next.js : navigation instantanée). */
export default function DonationPage(props: PageProps<"/tableau-de-bord/dons/[id]">) {
  return (
    <div className="space-y-6">
      <BackLink href="/tableau-de-bord/dons">Dons</BackLink>
      <Suspense fallback={skeleton()}>
        <Content params={props.params} />
      </Suspense>
    </div>
  );
}
