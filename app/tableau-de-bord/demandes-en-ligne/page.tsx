import type { Metadata } from "next";
import { Suspense } from "react";
import { Inbox, Lock } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { DemoNotice } from "@/components/admin/DemoNotice";
import {
  Pagination,
  RequestCard,
  StatusFilter,
  SubscriberList,
  Tabs,
} from "@/components/admin/OnlineRequests";
import { isDbConfigured } from "@/db";
import { getNewCounts, listOnlineRequests, listSubscribers, PAGE_SIZE } from "@/lib/online-requests";
import {
  canManageOnlineRequests,
  isStatus,
  isWorkflowType,
  requestTabs,
  type RequestType,
} from "@/lib/online-requests-shared";
import { requireActiveMembership } from "@/lib/session";

export const metadata: Metadata = { title: "Demandes en ligne" };

type Props = PageProps<"/tableau-de-bord/demandes-en-ligne">;

function Message({ icon: Icon, title, text }: { icon: typeof Inbox; title: string; text: string }) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-line bg-white px-6 py-16 text-center">
      <Icon className="size-9 text-brand" />
      <p className="mt-3 font-semibold">{title}</p>
      <p className="mt-1 max-w-md text-sm text-muted">{text}</p>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: Props["searchParams"] }) {
  // Les paramètres d'URL ne sont jamais retenus tels quels : type, statut et page sont revalidés.
  const sp = await searchParams;
  const rawType = typeof sp.type === "string" ? sp.type : "";
  const type: RequestType = requestTabs.some((t) => t.id === rawType) ? (rawType as RequestType) : "aide";
  const statut = isStatus(sp.statut) ? sp.statut : undefined;
  const page = Math.max(1, Math.min(1000, Number.parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1));

  if (!isDbConfigured) {
    return (
      <>
        <DemoNotice />
        <Message icon={Inbox} title="Aucune demande en mode démonstration" text="Les demandes reçues depuis le site apparaîtront ici dès que la base de données est connectée." />
      </>
    );
  }

  const member = await requireActiveMembership();
  if (!canManageOnlineRequests(member.role)) {
    return (
      <Message
        icon={Lock}
        title="Accès réservé à la gestion"
        text="Ces demandes contiennent des données personnelles. Seuls les propriétaires, administrateurs et gestionnaires peuvent les consulter."
      />
    );
  }

  const counts = await getNewCounts(member.organizationId);

  let body: React.ReactNode;
  if (type === "newsletter") {
    const { rows, total, active } = await listSubscribers(member.organizationId, page);
    body = (
      <>
        {rows.length ? (
          <SubscriberList rows={rows} total={total} active={active} />
        ) : (
          <Message icon={Inbox} title="Aucun abonné pour le moment" text="Les inscriptions à la lettre d'information du site apparaîtront ici." />
        )}
        <Pagination type={type} page={page} total={total} pageSize={PAGE_SIZE} />
      </>
    );
  } else if (isWorkflowType(type)) {
    const { rows, total } = await listOnlineRequests(member.organizationId, type, statut, page);
    body = (
      <>
        <StatusFilter type={type} current={statut} />
        {rows.length ? (
          <div className="space-y-3">
            {rows.map((r) => (
              <RequestCard key={r.id} row={r} canAct />
            ))}
          </div>
        ) : (
          <Message
            icon={Inbox}
            title={statut ? "Aucune demande avec ce statut" : "Aucune demande pour le moment"}
            text="Les envois faits depuis les formulaires du site apparaîtront ici."
          />
        )}
        <Pagination type={type} statut={statut} page={page} total={total} pageSize={PAGE_SIZE} />
      </>
    );
  }

  return (
    <>
      <Tabs current={type} counts={counts} />
      <div className="space-y-5">{body}</div>
    </>
  );
}

export default function OnlineRequestsPage({ searchParams }: Props) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Demandes en ligne"
        subtitle="Demandes d'aide, candidatures de bénévoles, messages et abonnés reçus depuis le site"
      />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white" aria-busy="true" />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
