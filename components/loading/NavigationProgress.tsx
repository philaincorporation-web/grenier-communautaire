"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Fine barre rose en haut de l'écran pendant un changement de page : elle démarre au clic sur un
 * lien interne et se termine quand la nouvelle adresse est affichée. Montrer qu'un clic est pris
 * en compte, sans bloquer la page.
 */
function Bar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState<number | null>(null); // null : barre masquée
  const timers = useRef<number[]>([]);
  const current = useRef("");

  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  // Fin de navigation : la nouvelle adresse est rendue.
  useEffect(() => {
    const url = `${pathname}?${searchParams}`;
    if (current.current && current.current !== url) {
      clear();
      setProgress((p) => (p === null ? null : 100));
      timers.current.push(window.setTimeout(() => setProgress(null), 350));
    }
    current.current = url;
  }, [pathname, searchParams]);

  // Début de navigation : clic sur un lien interne vers une autre page.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // Phase de capture : <Link> annule le clic natif (preventDefault) avant qu'il remonte au document.
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || !a.href || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return; // ancre ou même page
      clear();
      setProgress(8);
      // Avance de plus en plus lentement sans jamais atteindre 100 tant que la page n'est pas là.
      let p = 8;
      const step = () => {
        p = p + (90 - p) * 0.12;
        setProgress(p);
        timers.current.push(window.setTimeout(step, 250));
      };
      timers.current.push(window.setTimeout(step, 150));
      // Sécurité : navigation annulée ou très longue.
      timers.current.push(window.setTimeout(() => { clear(); setProgress(null); }, 15_000));
    };
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      clear();
    };
  }, []);

  if (progress === null) return null;
  return (
    <div
      role="progressbar"
      aria-label="Chargement de la page"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-[3px]"
    >
      <div
        className="h-full bg-brand shadow-[0_0_10px_var(--brand),0_0_4px_var(--brand)] transition-[width,opacity] duration-300 ease-out"
        style={{ width: `${progress}%`, opacity: progress >= 100 ? 0 : 1 }}
      />
    </div>
  );
}

export function NavigationProgress() {
  // useSearchParams exige une zone <Suspense> (rendu partiel).
  return (
    <Suspense fallback={null}>
      <Bar />
    </Suspense>
  );
}
