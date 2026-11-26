import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ChevronRight, HandHeart, Inbox, Mail, Users } from "lucide-react";
import { RequestListSkeleton } from "@/components/loading/Skeleton";
import { ClaimForm } from "@/components/requester/ClaimForm";
import { RequesterStatusBadge, dateFmt } from "@/components/requester/ui";
import { isDbConfigured } from "@/db";
import { listMyRequests } from "@/lib/requester";
import { newRequestLinks, requestHref, requestTypeLabels } from "@/lib/requester-shared";
import { requireRequester } from "@/lib/session";
import type { WorkflowType } from "@/lib/online-requests-shared";

export const metadata: Metadata = { title: "Mes demandes" };

const icons: Record<WorkflowType, typeof Inbox> = { aide: HandHeart, benevoles: Users, messages: Mail };

async function RequestList() {
  await connection();
  const me = await requireRequester();
  const rows = isDbConfigured ? await listMyRequests(me.email) : [];

  if (!rows.length) {
    return (
      <div className="grid place-items-center rounded-xl border border-dashed border-line bg-white px-6 py-12 text-center">
        <Inbox className="size-9 text-brand" />
        <p className="mt-3 font-semibold">Aucune demande pour le moment</p>
        <p className="mt-1 max-w-md text-sm text-muted">
          Les demandes envoyées depuis le site avec l&apos;adresse <strong className="text-ink">{me.email}</strong> apparaîtront ici,
          même celles envoyées avant la création de votre compte.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
      {rows.map((r) => {
        const Icon = icons[r.type];
        return (
          <li key={`${r.type}:${r.id}`}>
            <Link href={requestHref(r.type, r.id)} className="flex items-center gap-3 px-4 py-4 transition hover:bg-surface sm:px-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
                <Icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className={`truncate ${r.unread ? "font-bold" : "font-semibold"}`}>{r.title}</span>
                  {r.unread > 0 && (
                    <span className="shrink-0 rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold leading-none text-white">
                      {r.unread} nouveau{r.unread > 1 ? "x" : ""}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  {requestTypeLabels[r.type]}
                  {r.reference && <> · <span className="font-mono">{r.reference}</span></>} · envoyée le{" "}
                  <time dateTime={r.createdAt}>{dateFmt.format(new Date(r.createdAt))}</time>
                </span>
              </span>
              <RequesterStatusBadge status={r.status} />
              <ChevronRight className="size-4 shrink-0 text-muted" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function MyRequestsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold sm:text-3xl">Mes demandes</h1>
        <p className="mt-1 text-sm text-muted">Suivez vos demandes, consultez les réponses de l&apos;équipe et échangez avec elle.</p>
      </div>

      <section aria-labelledby="historique" className="space-y-3">
        <h2 id="historique" className="text-lg font-bold">Historique</h2>
        <Suspense fallback={<RequestListSkeleton />}>
          <RequestList />
        </Suspense>
      </section>

      <section aria-labelledby="nouvelle" className="space-y-3">
        <h2 id="nouvelle" className="text-lg font-bold">Faire une nouvelle demande</h2>
        <p className="text-sm text-muted">Choisissez le type de demande : le formulaire correspondant s&apos;ouvre. Utilisez la même adresse e-mail que votre compte pour la retrouver ici.</p>
        <ul className="grid gap-3 sm:grid-cols-3">
          {newRequestLinks.map((l) => {
            const Icon = icons[l.type];
            return (
              <li key={l.type}>
                <Link href={l.href} className="flex h-full flex-col rounded-xl border border-line bg-white p-4 transition hover:border-brand hover:shadow-sm">
                  <Icon className="size-6 text-brand" />
                  <span className="mt-2 font-semibold">{l.label}</span>
                  <span className="mt-1 text-sm text-muted">{l.description}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="rattacher" className="space-y-3 rounded-xl border border-line bg-white p-4 sm:p-5">
        <div>
          <h2 id="rattacher" className="text-lg font-bold">Vous ne trouvez pas une demande d&apos;aide ?</h2>
          <p className="mt-1 text-sm text-muted">
            Si vous l&apos;avez envoyée sans adresse e-mail, ajoutez-la avec la référence reçue lors de l&apos;envoi et votre numéro de téléphone.
          </p>
        </div>
        <ClaimForm />
      </section>
    </div>
  );
}
