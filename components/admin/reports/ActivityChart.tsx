// Histogramme d'activité (une série par graphique : pas de légende, le titre nomme la série).
// Rendu serveur en HTML/CSS : info-bulle au survol et au focus clavier, tableau de données associé.

import { bucketLabel } from "@/lib/reports-shared";

const nf = new Intl.NumberFormat("fr-FR");
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** Maximum « rond » de l'axe et ses graduations (pas de 1, 2 ou 5 × 10^n). */
function niceTicks(max: number): number[] {
  if (max <= 0) return [0, 1];
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const s = Math.max(1, step);
  const top = Math.ceil(max / s) * s;
  const ticks: number[] = [];
  for (let v = 0; v <= top; v += s) ticks.push(v);
  return ticks;
}

export function ActivityChart({
  title,
  unit,
  points,
  bucket,
}: {
  title: string;
  /** Nom de la mesure au singulier / pluriel, pour l'info-bulle. */
  unit: [string, string];
  points: { start: string; value: number }[];
  bucket: "week" | "month";
}) {
  const max = Math.max(0, ...points.map((p) => p.value));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  const peak = points.findIndex((p) => p.value === max && max > 0);
  // Sur petit écran, un libellé sur `smStep` (au plus ~5), affiché en entier.
  const smStep = Math.max(1, Math.ceil(points.length / 5));
  const total = points.reduce((a, p) => a + p.value, 0);

  return (
    <figure className="min-w-0 rounded-xl border border-line bg-white p-5 shadow-sm">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-bold">{title}</span>
        <span className="text-sm text-muted">
          {nf.format(total)} {total > 1 ? unit[1] : unit[0]} · par {bucket === "month" ? "mois" : "semaine"}
        </span>
      </figcaption>

      <div className="mt-8 flex gap-2" aria-hidden="true">
        {/* Axe vertical */}
        <div className="relative h-48 w-8 shrink-0 text-right text-[11px] tabular-nums text-muted">
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ bottom: `${(t / top) * 100}%` }}>
              {nf.format(t)}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative h-48">
            {ticks.map((t) => (
              <div key={t} className="absolute inset-x-0 h-px bg-line" style={{ bottom: `${(t / top) * 100}%` }} />
            ))}
            <div className="absolute inset-0 flex">
              {points.map((p, i) => (
                <div key={p.start} tabIndex={0} className="group relative flex h-full min-w-0 flex-1 items-end justify-center outline-none focus-visible:bg-brand-soft/60 hover:bg-surface/70">
                  {p.value > 0 && (
                    <div className="relative w-[60%] max-w-6 rounded-t-[4px] bg-brand transition-opacity group-hover:opacity-85" style={{ height: `${(p.value / top) * 100}%` }}>
                      {i === peak && <span className="absolute inset-x-0 -top-5 text-center text-[11px] font-semibold tabular-nums text-ink">{nf.format(p.value)}</span>}
                    </div>
                  )}
                  <div className={`pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-xs text-white shadow-lg group-hover:block group-focus-visible:block ${i < points.length / 2 ? "left-0" : "right-0"}`}>
                    <span className="block font-semibold">{cap(bucketLabel(p.start, bucket, true))}</span>
                    <span className="tabular-nums">
                      {nf.format(p.value)} {p.value > 1 ? unit[1] : unit[0]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-1.5 flex text-[10px] text-muted sm:text-[11px]">
            {points.map((p, i) => (
              <span key={p.start} className={`flex min-w-0 flex-1 justify-center whitespace-nowrap ${i % smStep ? "max-sm:invisible" : ""}`}>
                {bucketLabel(p.start, bucket)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer font-semibold text-brand">Voir les données</summary>
        <table className="mt-2 w-full">
          <caption className="sr-only">{title}</caption>
          <thead className="text-left text-muted">
            <tr>
              <th className="py-1 font-medium">{bucket === "month" ? "Mois" : "Semaine"}</th>
              <th className="py-1 text-right font-medium">Nombre</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {points.map((p) => (
              <tr key={p.start}>
                <td className="py-1">{cap(bucketLabel(p.start, bucket, true))}</td>
                <td className="py-1 text-right tabular-nums">{nf.format(p.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
