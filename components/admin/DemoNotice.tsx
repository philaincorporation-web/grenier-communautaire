import { Info } from "lucide-react";

export function DemoNotice() {
  return (
    <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <Info className="mt-0.5 size-4 shrink-0" />
      <span>
        Données de démonstration — définissez <code className="font-mono">DATABASE_URL</code> dans{" "}
        <code className="font-mono">.env.local</code> pour afficher les données réelles.
      </span>
    </p>
  );
}
