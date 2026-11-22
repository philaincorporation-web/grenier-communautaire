"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth/client";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      aria-label="Se déconnecter"
      title="Se déconnecter"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await authClient.signOut();
        router.replace("/auth/sign-in");
        router.refresh();
      }}
      className="rounded-lg p-2 text-white/60 hover:bg-sidebar-hover hover:text-white disabled:opacity-50"
    >
      <LogOut className="size-4" />
    </button>
  );
}
