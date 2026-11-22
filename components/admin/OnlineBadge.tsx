import { unstable_rethrow } from "next/navigation";
import { isDbConfigured } from "@/db";
import { getNewCounts } from "@/lib/online-requests";
import { canManageOnlineRequests } from "@/lib/online-requests-shared";
import { requireActiveMembership } from "@/lib/session";

/** Nombre total de nouvelles demandes (0 sans droit, sans base, ou en cas d'erreur). */
async function countNew(): Promise<number> {
  if (!isDbConfigured) return 0;
  try {
    const member = await requireActiveMembership();
    if (!canManageOnlineRequests(member.role)) return 0;
    const c = await getNewCounts(member.organizationId);
    return c.aide + c.benevoles + c.messages;
  } catch (error) {
    // Redirections et signaux internes de Next.js : à laisser passer. Le reste ne doit pas casser le menu.
    unstable_rethrow(error);
    return 0;
  }
}

/** Pastille « nouvelles demandes en ligne » de la barre latérale (invisible si 0). */
export async function OnlineBadge() {
  const n = await countNew();
  if (n === 0) return null;
  return (
    <span
      aria-label={`${n} nouvelle${n > 1 ? "s" : ""} demande${n > 1 ? "s" : ""}`}
      className="ml-auto rounded-full bg-white px-2 py-0.5 text-[11px] font-bold leading-none text-brand"
    >
      {n > 99 ? "99+" : n}
    </span>
  );
}
