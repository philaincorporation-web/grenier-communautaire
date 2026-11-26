/**
 * Écran de chargement aux couleurs du Grenier : la maison au cœur de l'icône, dont le cœur bat
 * doucement et dont le contour se dessine. Sans JavaScript (composant serveur, animations CSS).
 * Respecte « réduire les animations » (voir app/globals.css).
 */
export function BrandLoader({
  label = "Chargement…",
  fullScreen = false,
  className = "",
}: {
  label?: string;
  /** Occupe tout l'écran (ouverture de l'application). */
  fullScreen?: boolean;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`grid place-items-center ${fullScreen ? "fixed inset-0 z-50 bg-white" : "min-h-[50vh] py-16"} ${className}`}
    >
      <div className="flex flex-col items-center gap-5">
        <div className="relative grid size-24 place-items-center rounded-[28%] bg-brand shadow-lg shadow-brand/30">
          <span className="brand-loader-halo absolute inset-0 rounded-[28%] bg-brand" aria-hidden />
          <svg viewBox="0 0 100 100" className="relative size-16 text-white" aria-hidden>
            {/* Contour de la maison, ouvert au centre en bas comme sur le logo */}
            <path
              className="brand-loader-house"
              pathLength={1}
              d="M42 80 H22 V44 L50 20 L78 44 V80 H58"
              fill="none"
              stroke="currentColor"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              className="brand-loader-heart"
              d="M50 66 C44 61 37 56 37 49.5 C37 45.5 40 42.5 43.8 42.5 C46.4 42.5 48.6 44 50 46.2 C51.4 44 53.6 42.5 56.2 42.5 C60 42.5 63 45.5 63 49.5 C63 56 56 61 50 66 Z"
              fill="currentColor"
            />
          </svg>
        </div>
        <div className="text-center">
          <p className="font-semibold text-ink">{label}</p>
          <p className="mt-1 text-sm text-muted">Grenier Communautaire</p>
        </div>
      </div>
    </div>
  );
}
