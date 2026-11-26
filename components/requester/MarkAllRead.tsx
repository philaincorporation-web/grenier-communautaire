"use client";

import { useTransition } from "react";
import { CheckCheck, LoaderCircle } from "lucide-react";
import { markAllNotificationsRead } from "@/lib/actions/requester";

export function MarkAllRead() {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => markAllNotificationsRead())}
      className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold hover:border-brand hover:text-brand disabled:opacity-60"
    >
      {pending ? <LoaderCircle className="size-4 animate-spin" /> : <CheckCheck className="size-4" />}
      Tout marquer comme lu
    </button>
  );
}
