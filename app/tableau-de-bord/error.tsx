"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";

export default function AdminError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // En production, le message des erreurs serveur est masqué par Next.js.
  const message = process.env.NODE_ENV !== "production" && error instanceof Error ? error.message : null;

  return (
    <div className="grid place-items-center rounded-xl border border-line bg-white px-6 py-20 text-center">
      <TriangleAlert className="size-10 text-brand" />
      <h2 className="mt-4 text-lg font-bold">Impossible de charger les données</h2>
      <p className="mt-1 max-w-md text-sm text-muted">
        {message ?? "Vérifiez votre session et la connexion à la base de données."}
      </p>
      <button
        onClick={() => retry()}
        className="mt-6 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
      >
        Réessayer
      </button>
    </div>
  );
}
