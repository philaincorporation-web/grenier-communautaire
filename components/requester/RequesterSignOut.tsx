"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth/client";

export function RequesterSignOut() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      aria-label="Se déconnecter"
      title="Se déconnecter"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await authClient.signOut();
        router.replace("/");
        router.refresh();
      }}
      className="rounded-full p-2 text-muted hover:bg-surface hover:text-ink disabled:opacity-50"
    >
      <LogOut className="size-5" />
    </button>
  );
}
