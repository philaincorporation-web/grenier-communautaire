import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ArrowLeft, CircleDot, FilePlus2 } from "lucide-react";
import { RequesterThread } from "@/components/requester/RequesterThread";
import { RequesterStatusBadge, dateFmt, dateTimeFmt } from "@/components/requester/ui";
import { isDbConfigured } from "@/db";
import { isWorkflowType } from "@/lib/online-requests-shared";
import { UUID_RE } from "@/lib/request-events";
import { countUnreadForRequest, getMyRequest } from "@/lib/requester";
import { aidDecisionLabels, requesterStatusLabels, requestTypeLabels, type TimelineEvent } from "@/lib/requester-shared";
import { requireRequester } from "@/lib/session";

export const metadata: Metadata = { title: "Suivi de la demande" };

type Props = PageProps<"/mon-espace/demandes/[type]/[id]">;

function Event({ e }: { e: TimelineEvent }) {
  const when = <time dateTime={e.createdAt}>{dateTimeFmt.format(new Date(e.createdAt))}</time>;

  if (e.kind === "message") {
    const mine = e.author === "requester";
    return (
      <li className={`flex ${mine ? "justify-end" : "justify-start"}`}>
        <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${mine ? "rounded-br-sm bg-brand text-white" : "rounded-bl-sm border border-line bg-white"}`}>
          <p className={`mb-1 text-xs font-semibold ${mine ? "text-white/80" : "text-brand"}`}>
            {mine ? "Vous" : "L'équipe du Grenier Communautaire"}
          </p>
          <p className="whitespace-pre-wrap break-words">{e.body}</p>
          <p className={`mt-1.5 text-[11px] ${mine ? "text-white/70" : "text-muted"}`}>{when}</p>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-center gap-2 text-center text-xs text-muted">
      {e.kind === "created" ? <FilePlus2 className="size-3.5" /> : <CircleDot className="size-3.5" />}
      <span>
        {e.kind === "created" ? "Demande envoyée" : <>Statut : <strong className="text-ink">{requesterStatusLabels[e.status!]}</strong></>} · {when}
      </span>
    </li>
  );
}

async function Detail({ params }: { params: Props["params"] }) {
  await connection();
  const { type, id } = await params;
  if (!isWorkflowType(type) || !UUID_RE.test(id) || !isDbConfigured) notFound();

  const me = await requireRequester();
  const [req, unread] = await Promise.all([getMyRequest(type, id, me.email), countUnreadForRequest(me.email, type, id)]);
  if (!req) notFound();

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-line bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">{requestTypeLabels[req.type]}</p>
            <h1 className="mt-1 text-xl font-extrabold sm:text-2xl">{req.title}</h1>
            <p className="mt-1 text-sm text-muted">
              Envoyée le <time dateTime={req.createdAt}>{dateFmt.format(new Date(req.createdAt))}</time>
              {req.reference && <> · Référence <span className="font-mono font-semibold text-ink">{req.reference}</span></>}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <RequesterStatusBadge status={req.status} />
            {req.decision && (
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                Décision : {aidDecisionLabels[req.decision] ?? req.decision}
              </span>
            )}
          </div>
        </div>
        <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          {req.fields.map((f) => (
            <div key={f.label} className="flex gap-2">
              <dt className="shrink-0 text-muted">{f.label} :</dt>
              <dd className="min-w-0 break-words font-medium">{f.value}</dd>
            </div>
          ))}
        </dl>
        {req.message && <p className="mt-3 whitespace-pre-wrap break-words rounded-lg bg-surface px-3.5 py-3 text-sm text-ink/80">{req.message}</p>}
      </header>

      <section aria-labelledby="suivi" className="space-y-4">
        <h2 id="suivi" className="text-lg font-bold">Suivi et échanges</h2>
        <ol className="space-y-3">
          {req.timeline.map((e) => (
            <Event key={e.id} e={e} />
          ))}
        </ol>
        <div className="rounded-xl border border-line bg-white p-4">
          <RequesterThread type={req.type} id={req.id} hasUnread={unread > 0} />
        </div>
      </section>
    </div>
  );
}

export default function RequestDetailPage({ params }: Props) {
  return (
    <div className="space-y-4">
      <Link href="/mon-espace" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-brand">
        <ArrowLeft className="size-4" /> Mes demandes
      </Link>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white" aria-busy="true" />}>
        <Detail params={params} />
      </Suspense>
    </div>
  );
}
