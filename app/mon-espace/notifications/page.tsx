import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Bell, CircleDot, MessageSquareText } from "lucide-react";
import { NotificationListSkeleton } from "@/components/loading/Skeleton";
import { AppSettings } from "@/components/pwa/AppSettings";
import { MarkAllRead } from "@/components/requester/MarkAllRead";
import { dateTimeFmt } from "@/components/requester/ui";
import { isDbConfigured } from "@/db";
import { listNotifications } from "@/lib/requester";
import { requestHref, requesterStatusLabels } from "@/lib/requester-shared";
import { requireRequester } from "@/lib/session";

export const metadata: Metadata = { title: "Notifications" };

async function NotificationList() {
  await connection();
  const me = await requireRequester();
  const rows = isDbConfigured ? await listNotifications(me.email, 50) : [];

  if (!rows.length) {
    return (
      <div className="grid place-items-center rounded-xl border border-dashed border-line bg-white px-6 py-12 text-center">
        <Bell className="size-9 text-brand" />
        <p className="mt-3 font-semibold">Aucune notification</p>
        <p className="mt-1 max-w-md text-sm text-muted">Vous serez prévenu ici et par e-mail quand l&apos;équipe répondra à une demande ou changera son statut.</p>
      </div>
    );
  }

  return (
    <>
      {rows.some((r) => !r.read) && (
        <div className="flex justify-end">
          <MarkAllRead />
        </div>
      )}
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
        {rows.map((n) => (
          <li key={n.id}>
            <Link href={requestHref(n.type, n.requestId)} className={`flex items-start gap-3 px-4 py-3.5 transition hover:bg-surface ${n.read ? "" : "bg-brand-soft/40"}`}>
              {n.kind === "message" ? <MessageSquareText className="mt-0.5 size-5 shrink-0 text-brand" /> : <CircleDot className="mt-0.5 size-5 shrink-0 text-brand" />}
              <span className="min-w-0 flex-1 text-sm">
                <span className={n.read ? "" : "font-semibold"}>
                  {n.kind === "message" ? "Nouvelle réponse de l'équipe" : `Statut mis à jour : ${requesterStatusLabels[n.status!]}`}
                </span>
                <span className="block text-xs text-muted">
                  {n.requestTitle} · <time dateTime={n.createdAt}>{dateTimeFmt.format(new Date(n.createdAt))}</time>
                </span>
              </span>
              {!n.read && <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-brand" aria-label="Non lue" />}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function NotificationsPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold sm:text-3xl">Notifications</h1>
      <AppSettings />
      <Suspense fallback={<NotificationListSkeleton />}>
        <NotificationList />
      </Suspense>
    </div>
  );
}
