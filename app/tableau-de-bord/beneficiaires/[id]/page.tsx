import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Lock, Mail, MapPin, Pencil, Phone, Truck } from "lucide-react";
import { DemoNotice } from "@/components/admin/DemoNotice";
import { BeneficiaryActiveToggle } from "@/components/admin/beneficiaries/BeneficiaryActiveToggle";
import { DistributionStatusBadge } from "@/components/admin/distributions/StatusBadge";
import { isDbConfigured } from "@/db";
import { getBeneficiary } from "@/lib/beneficiaries";
import { beneficiaryTypeLabels, canManageBeneficiaries, canSeeBeneficiaryContact, formatDate } from "@/lib/beneficiaries-shared";
import { canPrepareDistribution } from "@/lib/distributions-shared";
import { requireActiveMembership } from "@/lib/session";

export const metadata: Metadata = { title: "Bénéficiaire" };

type Params = PageProps<"/tableau-de-bord/beneficiaires/[id]">["params"];

const aidStatus: Record<string, { label: string; cls: string }> = {
  submitted: { label: "Déposée", cls: "bg-brand-soft text-brand" },
  under_review: { label: "En étude", cls: "bg-amber-100 text-amber-700" },
  approved: { label: "Approuvée", cls: "bg-blue-100 text-blue-700" },
  rejected: { label: "Refusée", cls: "bg-red-100 text-red-700" },
  fulfilled: { label: "Satisfaite", cls: "bg-green-100 text-green-700" },
  cancelled: { label: "Annulée", cls: "bg-surface text-muted" },
};

async function Content({ params }: { params: Params }) {
  if (!isDbConfigured) return <DemoNotice />;
  const { id } = await params;
  const member = await requireActiveMembership();
  const b = await getBeneficiary(member.organizationId, id, canSeeBeneficiaryContact(member.role));
  if (!b) notFound();
  const manage = canManageBeneficiaries(member.role);
  const completed = b.distributions.filter((d) => d.status === "completed").length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold sm:text-3xl">{b.name}</h1>
            {!b.isActive && <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold text-muted">Inactif</span>}
          </div>
          <p className="mt-1 text-sm text-muted">
            <span className="font-mono">{b.reference ?? "Sans référence"}</span> · {beneficiaryTypeLabels[b.type]}
            {b.householdSize ? ` · ${b.householdSize} personne${b.householdSize > 1 ? "s" : ""}` : ""} · suivi depuis le {formatDate(b.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {b.isActive && canPrepareDistribution(member.role) && (
            <Link
              href={`/tableau-de-bord/distributions/nouvelle?beneficiaire=${b.id}`}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark"
            >
              <Truck className="size-4" /> Nouvelle distribution
            </Link>
          )}
          {manage && (
            <Link
              href={`/tableau-de-bord/beneficiaires/${b.id}/modifier`}
              className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold hover:border-brand"
            >
              <Pencil className="size-4" /> Modifier
            </Link>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
            <h2 className="border-b border-line px-5 py-3 font-bold">
              Distributions ({b.distributions.length}) · {completed} effectuée{completed > 1 ? "s" : ""}
            </h2>
            {b.distributions.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted">Aucune distribution pour le moment.</p>
            ) : (
              <ul className="divide-y divide-line">
                {b.distributions.map((d) => (
                  <li key={d.id}>
                    <Link href={`/tableau-de-bord/distributions/${d.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm hover:bg-surface/60">
                      <span className="font-mono font-semibold text-brand">{d.reference}</span>
                      <span>{formatDate(d.distributedOn)}</span>
                      <span className="text-muted">
                        {d.lines} article{d.lines > 1 ? "s" : ""}
                      </span>
                      <span className="ml-auto">
                        <DistributionStatusBadge status={d.status} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
            <h2 className="border-b border-line px-5 py-3 font-bold">Demandes d&apos;aide ({b.aidRequests.length})</h2>
            {b.aidRequests.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted">Aucune demande d&apos;aide enregistrée.</p>
            ) : (
              <ul className="divide-y divide-line">
                {b.aidRequests.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
                    <span className="font-mono font-semibold">{r.reference}</span>
                    <span>{formatDate(r.requestedOn)}</span>
                    <span className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-semibold ${aidStatus[r.status]?.cls ?? "bg-surface text-muted"}`}>
                      {aidStatus[r.status]?.label ?? r.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-xl border border-line bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-bold">
              <Lock className="size-4 text-brand" /> Coordonnées
            </h2>
            {b.contact ? (
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex gap-3">
                  <Phone className="mt-0.5 size-4 shrink-0 text-muted" />
                  <dt className="sr-only">Téléphone</dt>
                  <dd>{b.contact.phone ? <a href={`tel:${b.contact.phone.replace(/\s/g, "")}`} className="font-medium text-brand hover:underline">{b.contact.phone}</a> : <span className="text-muted">Non renseigné</span>}</dd>
                </div>
                <div className="flex gap-3">
                  <Mail className="mt-0.5 size-4 shrink-0 text-muted" />
                  <dt className="sr-only">E-mail</dt>
                  <dd className="min-w-0 break-words">{b.contact.email ? <a href={`mailto:${b.contact.email}`} className="font-medium text-brand hover:underline">{b.contact.email}</a> : <span className="text-muted">Non renseigné</span>}</dd>
                </div>
                <div className="flex gap-3">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-muted" />
                  <dt className="sr-only">Adresse</dt>
                  <dd>{b.contact.address ?? <span className="text-muted">Non renseignée</span>}</dd>
                </div>
                {b.contact.notes && (
                  <div className="border-t border-line pt-3">
                    <dt className="text-xs text-muted">Notes de suivi</dt>
                    <dd className="mt-1 whitespace-pre-wrap break-words">{b.contact.notes}</dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="mt-3 text-sm text-muted">Réservé à la gestion (propriétaires, administrateurs, gestionnaires).</p>
            )}
          </section>

          {manage && (
            <section className="rounded-xl border border-line bg-white p-5 shadow-sm">
              <h2 className="mb-3 font-bold">Statut</h2>
              <BeneficiaryActiveToggle id={b.id} isActive={b.isActive} />
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

/** `params` est lu dans une zone <Suspense> (exigence Next.js : navigation instantanée). */
export default function BeneficiaryPage(props: PageProps<"/tableau-de-bord/beneficiaires/[id]">) {
  return (
    <div className="space-y-6">
      <Link href="/tableau-de-bord/beneficiaires" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-brand">
        <ArrowLeft className="size-4" /> Bénéficiaires
      </Link>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white" aria-busy="true" />}>
        <Content params={props.params} />
      </Suspense>
    </div>
  );
}
