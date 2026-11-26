import Link from "next/link";
import { connection } from "next/server";
import { Bell } from "lucide-react";
import { isDbConfigured } from "@/db";
import { countUnreadNotifications } from "@/lib/requester";
import { hasActiveMembership, requireRequester } from "@/lib/session";
import { RequesterSignOut } from "./RequesterSignOut";

/** Partie dynamique de l'en-tête : cloche (non lues), lien vers le tableau de bord, compte. */
export async function RequesterHeaderUser() {
  await connection();
  const me = await requireRequester();
  const [unread, member] = isDbConfigured
    ? await Promise.all([countUnreadNotifications(me.email), hasActiveMembership(me.email)])
    : [0, false];

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {member && (
        <Link href="/tableau-de-bord" className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-muted hover:bg-surface hover:text-ink sm:inline-block">
          Tableau de bord
        </Link>
      )}
      <Link
        href="/mon-espace/notifications"
        aria-label={unread ? `Notifications : ${unread} non lue${unread > 1 ? "s" : ""}` : "Notifications"}
        title="Notifications"
        className="relative rounded-full p-2 text-muted hover:bg-surface hover:text-brand"
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-brand px-1 text-[11px] font-bold leading-5 text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </Link>
      <span className="hidden max-w-48 truncate text-sm font-medium md:inline" title={me.email}>
        {me.name}
      </span>
      <RequesterSignOut />
    </div>
  );
}
