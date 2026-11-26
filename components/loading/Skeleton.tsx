/**
 * Squelettes de chargement qui imitent la page à venir (titres, lignes, cartes), avec un reflet
 * qui glisse. Composants serveur, sans JavaScript.
 */

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`skeleton-shimmer relative overflow-hidden rounded-md bg-ink/[0.07] after:absolute after:inset-0 after:-translate-x-full after:animate-[skeleton-shimmer_1.4s_ease-in-out_infinite] after:bg-gradient-to-r after:from-transparent after:via-white/60 after:to-transparent ${className}`}
    />
  );
}

/** Zone en cours de chargement, annoncée aux lecteurs d'écran. */
export function SkeletonRegion({ children, label = "Chargement…", className = "" }: { children: React.ReactNode; label?: string; className?: string }) {
  return (
    <div aria-busy="true" aria-live="polite" className={className}>
      {children}
      <span className="sr-only">{label}</span>
    </div>
  );
}

/** Liste de demandes (Mon espace). */
export function RequestListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <SkeletonRegion label="Chargement de vos demandes…">
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
        {Array.from({ length: rows }, (_, i) => (
          <li key={i} className="flex items-center gap-3 px-4 py-4 sm:px-5">
            <Skeleton className="size-10 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className={`h-4 ${i % 2 ? "w-1/2" : "w-2/3"}`} />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-5 w-24 rounded-full" />
          </li>
        ))}
      </ul>
    </SkeletonRegion>
  );
}

/** Détail d'une demande avec son fil d'échanges (Mon espace). */
export function RequestDetailSkeleton() {
  return (
    <SkeletonRegion label="Chargement de la demande…" className="space-y-6">
      <div className="rounded-xl border border-line bg-white p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2.5">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-3.5 w-1/3" />
          </div>
          <Skeleton className="h-5 w-28 rounded-full" />
        </div>
        <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <Skeleton className="mt-4 h-16 w-full rounded-lg" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mx-auto h-3 w-48" />
        <div className="flex justify-start"><Skeleton className="h-20 w-3/4 rounded-2xl" /></div>
        <div className="flex justify-end"><Skeleton className="h-14 w-1/2 rounded-2xl" /></div>
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    </SkeletonRegion>
  );
}

/** Liste de notifications (Mon espace). */
export function NotificationListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <SkeletonRegion label="Chargement des notifications…">
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
        {Array.from({ length: rows }, (_, i) => (
          <li key={i} className="flex items-start gap-3 px-4 py-3.5">
            <Skeleton className="size-5 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className={`h-4 ${i % 2 ? "w-2/5" : "w-3/5"}`} />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </li>
        ))}
      </ul>
    </SkeletonRegion>
  );
}

/** Carte du formulaire d'authentification (connexion, inscription, mot de passe oublié). */
export function AuthCardSkeleton({ fields = 2 }: { fields?: number }) {
  return (
    <SkeletonRegion className="w-full max-w-sm rounded-2xl border border-line bg-white p-8 shadow-sm">
      <Skeleton className="h-7 w-36" />
      <Skeleton className="mt-2.5 h-4 w-56" />
      <div className="mt-7 space-y-5">
        {Array.from({ length: fields }, (_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
      <Skeleton className="mx-auto mt-6 h-3.5 w-48" />
    </SkeletonRegion>
  );
}
