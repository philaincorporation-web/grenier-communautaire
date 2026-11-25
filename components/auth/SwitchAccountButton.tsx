"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth/client";

/** Ferme la session en cours puis réaffiche le formulaire de connexion. */
export function SwitchAccountButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await authClient.signOut();
        } finally {
          router.refresh();
          setBusy(false);
        }
      }}
      className="mt-3 w-full rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:bg-surface disabled:opacity-50"
    >
      {busy ? "Déconnexion…" : "Se déconnecter / changer de compte"}
    </button>
  );
}
