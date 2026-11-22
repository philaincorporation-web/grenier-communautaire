/**
 * Squelette affiché pendant le chargement d'une page de détail (action, événement, article).
 * Les pages de détail lisent `params` dans une zone <Suspense> : exigence de Next.js (navigation
 * instantanée, voir docs « instant-shell-url-data »).
 */
export function DetailFallback() {
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="bg-[linear-gradient(110deg,#1d1f2b_0%,#3a1f2a_55%,#7a2a45_100%)] px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-7xl animate-pulse space-y-4">
          <div className="h-3 w-40 rounded-full bg-white/20" />
          <div className="h-9 w-full max-w-xl rounded-lg bg-white/25" />
          <div className="h-4 w-full max-w-md rounded-full bg-white/15" />
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid animate-pulse gap-8 lg:grid-cols-2">
          <div className="aspect-[4/3] rounded-2xl bg-surface" />
          <div className="space-y-3">
            <div className="h-6 w-2/3 rounded-lg bg-surface" />
            <div className="h-4 w-full rounded-full bg-surface" />
            <div className="h-4 w-11/12 rounded-full bg-surface" />
            <div className="h-4 w-4/5 rounded-full bg-surface" />
          </div>
        </div>
      </div>
      <span className="sr-only">Chargement…</span>
    </div>
  );
}
