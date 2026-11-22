"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Clock, Heart, Pause, Play } from "lucide-react";
import type { HeroSlide } from "@/lib/site-content";

/** Durée d'une diapositive, en secondes (la ligne de progression se remplit pendant ce temps). */
const INTERVAL = 6.5;
/** Rectangle de départ de l'« ouverture » : à peu près l'emplacement de la première carte. */
const OPEN_FROM = "inset(43% 42% 17% 43% round 16px)";
const OPEN_TO = "inset(0% 0% 0% 0% round 0px)";
const EASE = [0.76, 0, 0.24, 1] as const;

const pad = (n: number) => String(n).padStart(2, "0");

const textContainer = {
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.3 } },
  exit: { transition: { staggerChildren: 0.03, staggerDirection: -1 } },
};
const textItem = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" as const } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.2 } },
};

const ctaBase = "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition";

/**
 * Carrousel plein écran « cartes minutées » : la carte suivante s'ouvre pour devenir le fond.
 * Accessibilité : région « carousel », pause manuelle, pause au survol / focus clavier / hors écran /
 * onglet masqué, flèches du clavier, aucun défilement automatique si « réduire les animations ».
 */
export function HeroSlider({
  slides,
  label = "À la une",
  srTitle,
  variant = "home",
}: {
  slides: HeroSlide[];
  label?: string;
  /** Titre de page (h1) lu par les lecteurs d'écran ; les titres des diapositives sont des h2. */
  srTitle: string;
  /** « home » : plein écran ; « page » : bannière plus basse pour une page intérieure (liste dessous). */
  variant?: "home" | "page";
}) {
  const n = slides.length;
  const reduced = useReducedMotion() ?? false;
  // `seq` donne à chaque nouvelle diapositive un z-index plus haut : la nouvelle s'ouvre par-dessus l'ancienne.
  const [{ active, seq }, setState] = useState({ active: 0, seq: 0 });
  const [userPaused, setUserPaused] = useState(false);
  const [hover, setHover] = useState(false);
  const [focusVisible, setFocusVisible] = useState(false);
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);
  const rootRef = useRef<HTMLElement>(null);
  const progress = useMotionValue(0);

  const goTo = useCallback(
    (i: number) => {
      progress.set(0);
      setState((s) => ({ active: ((i % n) + n) % n, seq: s.seq + 1 }));
    },
    [n, progress],
  );
  const next = useCallback(() => {
    progress.set(0);
    setState((s) => ({ active: (s.active + 1) % n, seq: s.seq + 1 }));
  }, [n, progress]);
  const prev = useCallback(() => {
    progress.set(0);
    setState((s) => ({ active: (s.active - 1 + n) % n, seq: s.seq + 1 }));
  }, [n, progress]);

  // Défilement automatique : on reprend là où la progression s'était arrêtée.
  const running = !reduced && !userPaused && !hover && !focusVisible && inView && tabVisible && n > 1;
  useEffect(() => {
    if (!running) return;
    const controls = animate(progress, 1, {
      duration: Math.max(0.05, INTERVAL * (1 - progress.get())),
      ease: "linear",
      onComplete: next,
    });
    return () => controls.stop();
  }, [running, active, progress, next]);

  // Pause hors écran et quand l'onglet est masqué.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    const onVis = () => setTabVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const slide = slides[active];
  const upcoming = Array.from({ length: n - 1 }, (_, k) => (active + 1 + k) % n);
  const preload = [...new Set([(active + 1) % n, (active - 1 + n) % n])].filter((i) => i !== active);

  const round =
    "grid size-11 shrink-0 place-items-center rounded-full border border-white/60 text-white transition hover:bg-white hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

  return (
    <MotionConfig reducedMotion="user">
      <motion.section
        ref={rootRef}
        aria-roledescription="carousel"
        aria-label={label}
        className={`relative isolate h-[calc(100svh-4rem)] min-h-[30rem] overflow-hidden bg-ink text-white lg:h-[calc(100svh-4.5rem)] ${
          variant === "page" ? "max-h-[34rem] sm:max-h-[38rem] lg:max-h-[40rem]" : "max-h-[56rem]"
        }`}
        style={{ touchAction: "pan-y" }}
        onPointerEnter={(e) => e.pointerType === "mouse" && setHover(true)}
        onPointerLeave={() => setHover(false)}
        onFocusCapture={(e) => setFocusVisible((e.target as HTMLElement).matches(":focus-visible"))}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusVisible(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") next();
          else if (e.key === "ArrowLeft") prev();
        }}
        onPanEnd={(_, info) => {
          if (Math.abs(info.offset.x) > 60 && Math.abs(info.offset.x) > Math.abs(info.offset.y)) {
            if (info.offset.x < 0) next();
            else prev();
          }
        }}
      >
        <h1 className="sr-only">{srTitle}</h1>

        {/* Fonds : la nouvelle photo s'ouvre depuis la carte, l'ancienne se laisse recouvrir. */}
        <div className="absolute inset-0 -z-10 bg-ink">
          <AnimatePresence initial={false}>
            <motion.div
              key={slide.id}
              className="absolute inset-0"
              style={{ zIndex: seq }}
              initial={reduced ? { opacity: 0 } : { clipPath: OPEN_FROM }}
              animate={reduced ? { opacity: 1 } : { clipPath: OPEN_TO }}
              exit={reduced ? { opacity: 1, transition: { duration: 0.5 } } : { scale: 1.06, transition: { duration: 0.9, ease: EASE } }}
              transition={{ duration: reduced ? 0.4 : 0.9, ease: EASE }}
            >
              <motion.div
                className="absolute inset-0"
                initial={{ scale: 1 }}
                animate={{ scale: 1.06 }}
                transition={{ duration: INTERVAL + 2, ease: "linear" }}
              >
                <Image
                  src={slide.image.src}
                  alt={slide.image.alt}
                  fill
                  priority={active === 0}
                  sizes="100vw"
                  className={`object-cover ${slide.focus ?? ""}`}
                />
              </motion.div>
              <div className="absolute inset-0 bg-ink/55 md:hidden" />
              <div className="absolute inset-0 hidden bg-[linear-gradient(90deg,rgba(29,31,43,0.9)_0%,rgba(29,31,43,0.55)_45%,rgba(29,31,43,0.1)_100%)] md:block" />
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink/70 to-transparent" />
            </motion.div>
          </AnimatePresence>
          {/* Préchargement des photos voisines pour éviter un fond vide à l'ouverture. Le conteneur a la taille
              du carrousel (et non 1 px) : sinon Next signale un `sizes` incohérent avec la largeur rendue. */}
          <div aria-hidden="true" className="pointer-events-none invisible absolute inset-0">
            {preload.map((i) => (
              <Image key={slides[i].id} src={slides[i].image.src} alt="" fill sizes="100vw" loading="eager" />
            ))}
          </div>
        </div>

        {/* Texte */}
        <div className="absolute inset-0 flex items-end pb-36 md:items-center md:pb-16">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
            <div
              role="group"
              aria-roledescription="slide"
              aria-label={`${active + 1} sur ${n}`}
              aria-live={running ? "off" : "polite"}
              aria-atomic="true"
              className="max-w-xl lg:max-w-md xl:max-w-xl"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={slide.id} variants={textContainer} initial="hidden" animate="show" exit="exit">
                  <motion.p variants={textItem} className="flex items-center gap-3 text-xs font-semibold text-white/90 sm:text-sm">
                    <span aria-hidden="true" className="h-0.5 w-8 shrink-0 rounded-full bg-brand-light" />
                    {slide.eyebrow}
                  </motion.p>
                  <motion.h2
                    variants={textItem}
                    className={`mt-4 text-balance font-extrabold uppercase leading-[0.95] tracking-tight ${
                      variant === "page"
                        ? "text-3xl min-[400px]:text-4xl sm:text-5xl lg:text-4xl xl:text-5xl"
                        : "text-3xl min-[400px]:text-4xl sm:text-6xl xl:text-7xl"
                    }`}
                  >
                    {slide.title}
                  </motion.h2>
                  <motion.p variants={textItem} className="mt-5 max-w-md text-sm text-white/85 sm:text-base">
                    {slide.text}
                  </motion.p>
                  {slide.meta && (
                    <motion.p variants={textItem} className="mt-3 flex items-center gap-2 text-xs font-medium text-white/80 sm:text-sm">
                      <Clock aria-hidden="true" className="size-4 shrink-0" />
                      {slide.meta}
                    </motion.p>
                  )}
                  <motion.div variants={textItem} className="mt-7 flex flex-wrap gap-3">
                    <Link href={slide.primary.href} className={`${ctaBase} bg-brand text-white shadow-md hover:bg-brand-dark`}>
                      {slide.primary.label}
                      {slide.primary.icon === "heart" ? <Heart className="size-4 fill-current" /> : <ArrowRight className="size-4" />}
                    </Link>
                    {slide.secondary && (
                      <Link
                        href={slide.secondary.href}
                        className={`${ctaBase} border-2 border-white/80 text-white hover:bg-white hover:text-ink [@media(max-height:42rem)]:hidden`}
                      >
                        {slide.secondary.label}
                      </Link>
                    )}
                  </motion.div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Cartes des prochaines diapositives (grands écrans) : coupées par le bord de l'écran. */}
        <div className="absolute bottom-28 left-[50%] right-0 hidden lg:block xl:left-[52%]">
          <ul className="flex gap-4">
            <AnimatePresence mode="popLayout" initial={false}>
              {upcoming.map((i) => {
                const s = slides[i];
                return (
                  <motion.li
                    key={s.id}
                    layout
                    initial={{ opacity: 0, x: 60 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.25 } }}
                    transition={{ type: "spring", stiffness: 240, damping: 30 }}
                    className="shrink-0"
                  >
                    <button
                      type="button"
                      onClick={() => goTo(i)}
                      aria-label={`Aller à la diapositive ${i + 1} : ${s.title}`}
                      className="group relative block h-44 w-32 overflow-hidden rounded-2xl text-left ring-1 ring-white/25 transition duration-300 hover:-translate-y-1 hover:ring-2 hover:ring-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white xl:h-52 xl:w-36"
                    >
                      <Image src={s.image.src} alt="" fill sizes="150px" className={`object-cover transition duration-500 group-hover:scale-105 ${s.focus ?? ""}`} />
                      <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-transparent" />
                      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 p-3">
                        <span className="flex items-center gap-1.5 text-[10px] font-medium text-white/80">
                          <span className="h-px w-3 bg-white/70" />
                          {s.card.kicker}
                        </span>
                        <span className="mt-1 line-clamp-3 block text-xs font-bold uppercase leading-tight">{s.card.title}</span>
                      </span>
                    </button>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </div>

        {/* Commandes : flèches, pause, progression minutée, compteur.
            Marge droite réservée au bouton flottant du menu radial. Sur mobile, progression et
            compteur passent sur une rangée au-dessus des boutons (trop étroit pour tout aligner). */}
        <div className="absolute inset-x-0 bottom-0 z-10">
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-3 gap-y-3 pb-6 pl-4 pr-[5.5rem] sm:flex-nowrap sm:gap-x-4 sm:pl-6 sm:pr-24">
            <div className="order-first flex w-full items-center gap-3 sm:order-last sm:w-auto sm:flex-1 sm:gap-4">
              <div aria-hidden="true" className="h-0.5 min-w-8 flex-1 overflow-hidden rounded-full bg-white/30 sm:ml-1">
                <motion.div className="h-full origin-left bg-white" style={{ scaleX: progress }} />
              </div>
              <p aria-hidden="true" className="flex items-baseline gap-1 tabular-nums">
                <span className="text-2xl font-light sm:text-5xl">{pad(active + 1)}</span>
                <span className="text-xs text-white/60 sm:text-sm">/ {pad(n)}</span>
              </p>
            </div>
            <button type="button" onClick={prev} aria-label="Diapositive précédente" className={round}>
              <ArrowLeft className="size-4" />
            </button>
            <button type="button" onClick={next} aria-label="Diapositive suivante" className={round}>
              <ArrowRight className="size-4" />
            </button>
            {!reduced && n > 1 && (
              <button
                type="button"
                onClick={() => setUserPaused((v) => !v)}
                aria-label={userPaused ? "Reprendre le défilement automatique" : "Mettre le défilement automatique en pause"}
                className={round}
              >
                {userPaused ? <Play className="size-4 fill-current" /> : <Pause className="size-4 fill-current" />}
              </button>
            )}
          </div>
        </div>
      </motion.section>
    </MotionConfig>
  );
}
