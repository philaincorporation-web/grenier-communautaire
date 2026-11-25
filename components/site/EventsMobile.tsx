"use client";

// Agenda des événements sur petit écran, dans l'esprit de la carte « Pricing » de motion.dev/plus :
// boîte sombre découpée en cellules par des filets, grand chiffre, sélecteur −/+ (ici pour
// parcourir les événements), bouton plein dont le libellé « roule » au survol/appui, et liste
// « + » des infos pratiques. Le changement d'événement anime la date et le texte.

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { CalendarDays, ChevronRight, Minus, Plus } from "lucide-react";
import type { EventItem } from "@/lib/site-content";

const weekday = new Intl.DateTimeFormat("fr-FR", { weekday: "short", timeZone: "UTC" });
const dayNum = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", timeZone: "UTC" });
const monthShort = new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: "UTC" });
const monthYear = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);
const pad = (n: number) => String(n).padStart(2, "0");

const spring = { type: "spring", visualDuration: 0.35, bounce: 0.15 } as const;

/** Minuit (UTC) du jour courant ; `null` au rendu serveur, pour éviter un écart à l'hydratation. */
const noSubscribe = () => () => {};
const todayUtc = () => {
  const now = new Date();
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
};
function useDaysUntil(iso: string) {
  const today = useSyncExternalStore(noSubscribe, todayUtc, () => null);
  return today === null ? null : Math.round((utc(iso).getTime() - today) / 86_400_000);
}

function countdown(days: number | null) {
  if (days === null) return " ";
  if (days < 0) return "Événement passé.";
  if (days === 0) return "C'est aujourd'hui !";
  if (days === 1) return "C'est demain !";
  return `Dans ${days} jours : réservez la date.`;
}

/** Bouton plein dont le libellé glisse vers le haut, remplacé par sa copie (survol, focus, appui). */
function RollButton({ href, children, compact = false }: { href: string; children: string; compact?: boolean }) {
  const content = (
    <>
      <span>{children}</span>
      <ChevronRight className="size-4" aria-hidden="true" />
    </>
  );
  return (
    <Link
      href={href}
      className={`group relative flex overflow-hidden font-mono font-semibold uppercase tracking-wider text-white outline-none transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 ${
        compact
          ? "h-11 w-40 shrink-0 bg-ink text-[12px] hover:bg-black focus-visible:ring-white focus-visible:ring-offset-brand active:bg-black"
          : "h-12 w-full bg-brand text-[13px] hover:bg-brand-dark focus-visible:ring-brand-light focus-visible:ring-offset-ink active:bg-brand-dark"
      }`}
    >
      <span className="absolute inset-0 flex items-center justify-between gap-2 px-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-full group-focus-visible:-translate-y-full group-active:-translate-y-full motion-reduce:transition-none">
        {content}
      </span>
      <span aria-hidden="true" className="absolute inset-0 flex translate-y-full items-center justify-between gap-2 px-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-0 group-focus-visible:translate-y-0 group-active:translate-y-0 motion-reduce:transition-none">
        {content}
      </span>
    </Link>
  );
}

function StepButton({ onClick, disabled, label, children }: { onClick: () => void; disabled: boolean; label: string; children: React.ReactNode }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      whileTap={{ backgroundColor: "#f6f6f8", color: "#1d1f2b" }}
      transition={{ duration: 0.12 }}
      className="grid size-12 place-items-center text-white outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-light disabled:opacity-30"
    >
      {children}
    </motion.button>
  );
}

/**
 * Barre fixe en bas d'écran (petit écran) : rappelle le prochain événement quand la carte de
 * l'agenda n'est plus visible. Elle publie sa hauteur dans `--bottom-bar` pour que le bouton
 * flottant et le bas de page se décalent au-dessus d'elle.
 */
function StickyEventBar({ items, cardRef }: { items: EventItem[]; cardRef: React.RefObject<HTMLDivElement | null> }) {
  const today = useSyncExternalStore(noSubscribe, todayUtc, () => null);
  const next = today === null ? undefined : items.find((i) => utc(i.date).getTime() >= today);
  const [cardVisible, setCardVisible] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [small, setSmall] = useState(false);

  useEffect(() => {
    const card = cardRef.current;
    const io = card ? new IntersectionObserver(([entry]) => setCardVisible(entry.isIntersecting)) : null;
    if (card) io!.observe(card);
    const mq = window.matchMedia("(max-width: 767px)");
    const onScroll = () => setScrolled(window.scrollY > 480);
    const onMq = () => setSmall(mq.matches);
    onScroll();
    onMq();
    window.addEventListener("scroll", onScroll, { passive: true });
    mq.addEventListener("change", onMq);
    return () => {
      io?.disconnect();
      window.removeEventListener("scroll", onScroll);
      mq.removeEventListener("change", onMq);
    };
  }, [cardRef]);

  const show = Boolean(next) && small && scrolled && !cardVisible;

  useEffect(() => {
    const root = document.documentElement.style;
    if (show) root.setProperty("--bottom-bar", "4rem");
    else root.removeProperty("--bottom-bar");
    return () => {
      root.removeProperty("--bottom-bar");
    };
  }, [show]);

  return (
    <AnimatePresence>
      {show && next && (
        <motion.aside
          key="bar"
          aria-label="Prochain événement"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          className="fixed inset-x-0 bottom-0 z-40 bg-brand pb-[env(safe-area-inset-bottom)] text-white shadow-[0_-8px_24px_rgba(29,31,43,0.25)] md:hidden print:hidden"
        >
          <div className="mx-auto flex h-16 max-w-md items-center gap-3 px-4">
            <button
              type="button"
              onClick={() => cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
              className="flex min-w-0 flex-1 items-center gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label={`Voir l'agenda : ${next.title}`}
            >
              <span className="grid size-9 shrink-0 place-items-center border border-white/60">
                <CalendarDays className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block font-mono text-[11px] uppercase tracking-wider text-white/80">
                  Prochain · {dayNum.format(utc(next.date))} {monthShort.format(utc(next.date)).replace(".", "")}
                </span>
                <span className="block truncate text-[13px] font-semibold">{next.title}</span>
              </span>
            </button>
            <RollButton href={`/evenements/${next.slug}`} compact>
              Je participe
            </RollButton>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

export function EventsMobile({ items }: { items: EventItem[] }) {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const cardRef = useRef<HTMLDivElement>(null);
  const e = items[index];
  const days = useDaysUntil(e?.date ?? "1970-01-01");
  if (!e) return null;

  const go = (step: number) => {
    const next = index + step;
    if (next < 0 || next >= items.length) return;
    setDir(step);
    setIndex(next);
  };
  const d = utc(e.date);
  const slide = {
    initial: { y: dir * 24, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: dir * -24, opacity: 0, transition: { duration: 0.12, ease: "easeIn" as const } },
  };

  return (
    <MotionConfig reducedMotion="user" transition={spring}>
      {/* Glissement horizontal du doigt : événement suivant / précédent. `pan-y` garde le défilement vertical de la page. */}
      <motion.div
        ref={cardRef}
        onPanEnd={(_, info) => {
          const { x, y } = info.offset;
          if (Math.abs(x) > 50 && Math.abs(x) > Math.abs(y) * 1.5) go(x < 0 ? 1 : -1);
        }}
        style={{ touchAction: "pan-y" }}
        className="overflow-hidden rounded-2xl border border-white/10 bg-ink text-white shadow-xl select-none"
      >
        {/* Cellule principale */}
        <div className="border-b border-white/10 p-6">
          <div className="flex items-center justify-between">
            <span className="flex h-8 border border-brand-light/60">
              <span className="grid w-8 place-items-center bg-brand-light text-ink">
                <CalendarDays className="size-4" aria-hidden="true" />
              </span>
              <span className="grid place-items-center px-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-brand-light">{e.kind}</span>
            </span>
            <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-white/50">
              <span aria-hidden="true">‹</span>
              {pad(index + 1)} / {pad(items.length)}
              <span aria-hidden="true">›</span>
              <span className="sr-only">Glissez vers la gauche ou la droite pour changer d&apos;événement.</span>
            </span>
          </div>

          <div aria-live="polite" className="relative mt-6 overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div key={e.slug} {...slide}>
                <p className="flex items-baseline gap-2.5">
                  <span className="text-5xl font-extrabold tabular-nums leading-none tracking-tight">{dayNum.format(d)}</span>
                  <span className="text-2xl font-bold text-white/50">{monthShort.format(d).replace(".", "")}</span>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-white/50">{weekday.format(d).replace(".", "")}</span>
                </p>
                <p className="mt-3 min-h-5 text-sm font-medium text-brand-light">{countdown(days)}</p>
                <h3 className="mt-5 text-lg font-bold leading-snug">{e.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-white/65">{e.summary}</p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-6 flex items-center justify-between gap-4">
            <span className="font-mono text-[11px] uppercase tracking-wider text-white/60">Événement</span>
            <div className="flex border border-white/15 [&>*+*]:border-l [&>*+*]:border-white/15">
              <StepButton onClick={() => go(-1)} disabled={index === 0} label="Événement précédent">
                <Minus className="size-4" />
              </StepButton>
              <span className="grid w-14 place-items-center overflow-hidden font-mono text-base tabular-nums" aria-hidden="true">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span key={index} {...slide}>
                    {index + 1}
                  </motion.span>
                </AnimatePresence>
              </span>
              <StepButton onClick={() => go(1)} disabled={index === items.length - 1} label="Événement suivant">
                <Plus className="size-4" />
              </StepButton>
            </div>
          </div>

          <div className="mt-6">
            <RollButton href={`/evenements/${e.slug}`}>Je participe</RollButton>
          </div>
        </div>

        {/* Cellule « infos pratiques » */}
        <div className="p-6">
          <p className="font-mono text-[11px] uppercase tracking-wider text-white/60">Infos pratiques</p>
          <div className="relative mt-4 overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.ul key={e.slug} {...slide} className="space-y-3 text-[15px] font-medium">
              {[
                e.place,
                `De ${e.start.replace(":", " h ")} à ${e.end.replace(":", " h ")}`,
                `${e.kind} · ${monthYear.format(d)}`,
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <span className="font-mono text-brand-light" aria-hidden="true">
                    +
                  </span>
                  {t}
                </li>
              ))}
            </motion.ul>
          </AnimatePresence>
          </div>
        </div>
      </motion.div>
      <StickyEventBar items={items} cardRef={cardRef} />
    </MotionConfig>
  );
}
