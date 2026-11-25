"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { Heart, X } from "lucide-react";

export type RadialItem = {
  id: string;
  href: string;
  /** Libellé court, affiché sous l'icône. */
  label: string;
  /** Libellé complet, lu par les lecteurs d'écran. */
  title: string;
  icon: React.ReactNode;
  /** Action principale : cercle en couleur pleine. */
  primary?: boolean;
};

type Props = {
  items: RadialItem[];
  /** Nom accessible du menu et du bouton. */
  label?: string;
  /** Distance (px) entre le centre du bouton et le centre des options. */
  radius?: number;
  /**
   * Arc sur lequel les options sont réparties, en degrés « écran » : 0° = droite, 90° = bas,
   * 180° = gauche, 270° = haut. Par défaut : du haut (270°) vers la gauche (180°), pour un bouton
   * ancré en bas à droite. Premier élément = début de l'arc.
   */
  startAngle?: number;
  endAngle?: number;
  /** Masque l'option qui pointe vers la page courante. */
  hideCurrent?: boolean;
};

const toRad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Position (px) de l'option `i` sur `n`, relative au centre du bouton, et direction unitaire
 * (dx, dy) du centre vers l'option : elle sert à placer le libellé vers l'extérieur de l'arc.
 */
function polar(i: number, n: number, start: number, end: number, radius: number) {
  const angle = toRad(n === 1 ? (start + end) / 2 : start + (i * (end - start)) / (n - 1));
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  return {
    x: Math.round(radius * dx * 100) / 100,
    y: Math.round(radius * dy * 100) / 100,
    dx: Math.round(dx * 1000) / 1000,
    dy: Math.round(dy * 1000) / 1000,
  };
}

/** Écart (px) entre le bord du cercle et son libellé. */
const LABEL_GAP = 6;
/** Rayon d'une option (size-12 = 48 px). */
const ITEM_R = 24;

type Custom = { i: number; n: number; x: number; y: number };

// Ouverture : ressort, option par option depuis la première. Fermeture : retour rapide, en sens inverse.
const itemVariants = {
  closed: ({ i, n }: Custom) => ({
    opacity: 0,
    scale: 0.4,
    x: 0,
    y: 0,
    transition: { duration: 0.14, ease: "easeIn" as const, delay: (n - 1 - i) * 0.025 },
  }),
  open: ({ i, x, y }: Custom) => ({
    opacity: 1,
    scale: 1,
    x,
    y,
    transition: { type: "spring" as const, stiffness: 420, damping: 24, mass: 0.8, delay: i * 0.045 },
  }),
};

export function RadialMenu({
  items,
  label = "Actions rapides",
  radius = 140,
  startAngle = 270,
  endAngle = 180,
  hideCurrent = true,
}: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Une fois le menu ouvert, le halo d'attention ne revient plus (la personne a compris).
  const [discovered, setDiscovered] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const visible = hideCurrent ? items.filter((it) => it.href !== pathname) : items;
  const n = visible.length;

  // Échap ferme et rend le focus au bouton.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // À l'ouverture au clavier, le focus passe à la première option.
  useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
  }, [open]);

  function onListKeyDown(e: React.KeyboardEvent) {
    const links = Array.from(listRef.current?.querySelectorAll<HTMLAnchorElement>("a") ?? []);
    const current = links.indexOf(document.activeElement as HTMLAnchorElement);
    if (current === -1) return;
    const step = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    links[(current + step + links.length) % links.length]?.focus();
  }

  if (n === 0) return null;

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {open && (
          <motion.div
            key="scrim"
            aria-hidden="true"
            className="fixed inset-0 z-[45] bg-ink/40 backdrop-blur-[2px] print:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      <nav
        ref={rootRef}
        aria-label={label}
        className="fixed bottom-[calc(1.5rem+var(--bottom-bar,0px))] right-4 z-50 mb-[env(safe-area-inset-bottom)] size-14 transition-[bottom] duration-300 ease-out sm:right-6 print:hidden"
        // `--bottom-bar` : hauteur d'une barre fixe en bas d'écran (ex. EventsMobile), le bouton se place au-dessus.
        // Le focus quitte le menu (Tab, clic ailleurs) : on le referme.
        onBlur={(e) => {
          if (open && !rootRef.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
        }}
      >
        <motion.button
          ref={toggleRef}
          type="button"
          aria-expanded={open}
          aria-controls={listId}
          aria-label={open ? `Fermer : ${label.toLowerCase()}` : `Ouvrir : ${label.toLowerCase()}`}
          onClick={() => {
            setOpen((v) => !v);
            setDiscovered(true);
          }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="radial-toggle group/radial absolute inset-0 grid place-items-center rounded-full bg-brand text-white shadow-lg ring-4 ring-white/70 transition-[background-color,box-shadow] hover:bg-brand-dark hover:shadow-xl hover:ring-brand/30 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
        >
          {/* Halo périodique : attire l'œil sur mobile, où il n'y a pas de survol. */}
          {!open && !discovered && (
            <span aria-hidden="true" className="radial-ring pointer-events-none absolute inset-0 rounded-full bg-brand" />
          )}
          {/* Bulle au survol / focus clavier (appareils avec souris uniquement). */}
          {!open && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-full top-1/2 mr-3 -translate-y-1/2 translate-x-2 whitespace-nowrap rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition duration-200 group-hover/radial:translate-x-0 group-hover/radial:opacity-100 group-focus-visible/radial:translate-x-0 group-focus-visible/radial:opacity-100"
            >
              Agir avec nous
            </span>
          )}
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={open ? "close" : "open"}
              className="grid place-items-center"
              initial={{ rotate: open ? -90 : 90, opacity: 0, scale: 0.6 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: open ? 90 : -90, opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.16 }}
            >
              {open ? <X className="size-6" /> : <Heart className="radial-heart size-6 fill-current" />}
            </motion.span>
          </AnimatePresence>
        </motion.button>

        <ul id={listId} ref={listRef} onKeyDown={onListKeyDown} className="m-0 list-none p-0">
          <AnimatePresence>
            {open &&
              visible.map((it, i) => {
                const { dx, dy, ...pos } = polar(i, n, startAngle, endAngle, radius);
                const custom: Custom = { i, n, ...pos };
                // Libellé posé juste à l'extérieur du cercle, dans la direction radiale :
                // il s'éloigne du centre et ne peut donc recouvrir aucune autre option.
                const labelStyle = {
                  left: "50%",
                  top: "50%",
                  transform: `translate(calc(${dx * (ITEM_R + LABEL_GAP)}px + ${-50 + 50 * dx}%), calc(${dy * (ITEM_R + LABEL_GAP)}px + ${-50 + 50 * dy}%))`,
                };
                return (
                  <motion.li
                    key={it.id}
                    custom={custom}
                    variants={itemVariants}
                    initial="closed"
                    animate="open"
                    exit="closed"
                    className="absolute bottom-1 right-1 size-12"
                  >
                    <Link
                      href={it.href}
                      aria-label={it.title}
                      onClick={() => setOpen(false)}
                      className={`grid size-12 place-items-center rounded-full shadow-md ring-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                        it.primary
                          ? "bg-brand text-white ring-brand hover:bg-brand-dark"
                          : "bg-white text-brand ring-line hover:bg-brand hover:text-white"
                      }`}
                    >
                      {it.icon}
                    </Link>
                    <span
                      aria-hidden="true"
                      style={labelStyle}
                      className="pointer-events-none absolute whitespace-nowrap rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-ink shadow"
                    >
                      {it.label}
                    </span>
                  </motion.li>
                );
              })}
          </AnimatePresence>
        </ul>
      </nav>
    </MotionConfig>
  );
}
