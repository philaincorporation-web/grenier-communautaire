// Sections réutilisables du site public. Chaque page est un assemblage de ces blocs.

import Image from "next/image";
import Link from "next/link";
import { banner } from "@/lib/inspiration-content";
import {
  CalendarDays,
  Clock,
  Gift,
  House,
  Laptop,
  MapPin,
  Quote,
  ShoppingCart,
  Truck,
  Users,
  Warehouse,
  HeartHandshake,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getPublicStats } from "@/lib/public-stats";
import type { PublicStat } from "@/lib/public-stats";
import {
  dayOf,
  formatDate,
  monthOf,
  type Action,
  type ActionIcon,
  type Article,
  type EventItem,
  type Testimonial,
} from "@/lib/site-content";
import { ButtonLink, Container, ImageSlot, MoreLink, SectionTitle } from "@/components/site/ui";

export const actionIcons: Record<ActionIcon, LucideIcon> = {
  house: House,
  shop: ShoppingCart,
  laptop: Laptop,
  users: Users,
};

// ---------------------------------------------------------------------------
// Chiffres d'impact

const statIcons: Record<PublicStat["icon"], LucideIcon> = {
  gift: Gift,
  truck: Truck,
  family: HeartHandshake,
  warehouse: Warehouse,
};

const fmt = new Intl.NumberFormat("fr-FR");

/** Grille 2×2 (comme le modèle) ou bandeau 4 colonnes. Données réelles, mises en cache. */
export async function StatsGrid({ variant = "grid" }: { variant?: "grid" | "band" }) {
  const { stats, demo } = await getPublicStats();
  return (
    <div>
      <dl
        className={
          variant === "grid"
            ? "grid grid-cols-2 overflow-hidden rounded-2xl border border-line bg-surface"
            : "grid grid-cols-2 gap-4 lg:grid-cols-4"
        }
      >
        {stats.map(({ label, value, icon }, i) => {
          const Icon = statIcons[icon];
          return (
            <div
              key={label}
              className={
                variant === "grid"
                  ? `flex flex-col items-center px-3 py-6 text-center sm:py-8 ${i % 2 === 0 ? "border-r border-line" : ""} ${i < 2 ? "border-b border-line" : ""}`
                  : "flex flex-col items-center rounded-2xl border border-line bg-white px-3 py-6 text-center shadow-sm"
              }
            >
              <Icon className="size-7 text-ink" />
              <dd className="mt-2 text-2xl font-extrabold text-brand sm:text-3xl">{fmt.format(value)}
                {value >= 100 && "+"}
              </dd>
              <dt className="mt-1 text-xs font-medium text-muted sm:text-sm">{label}</dt>
            </div>
          );
        })}
      </dl>
      {demo && <p className="mt-2 text-center text-[11px] text-muted">Chiffres indicatifs (démonstration).</p>}
    </div>
  );
}

export function StatsFallback({ variant = "grid" }: { variant?: "grid" | "band" }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-2xl bg-surface ${variant === "grid" ? "h-64" : "h-32"}`}
    />
  );
}

// ---------------------------------------------------------------------------
// Actions (piliers)

export function ActionCard({ action }: { action: Action }) {
  const Icon = actionIcons[action.icon];
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="relative">
        <ImageSlot src={action.image} alt={action.title} icon={Icon} className="aspect-[16/10]" sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" />
        <span className="absolute -bottom-5 left-5 grid size-11 place-items-center rounded-xl bg-brand text-white shadow-md">
          <Icon className="size-5" />
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5 pt-8">
        <h3 className="text-base font-bold text-ink">{action.title}</h3>
        <p className="mt-2 flex-1 text-sm text-muted">{action.short}</p>
        <div className="mt-4">
          <MoreLink href={`/nos-actions/${action.slug}`} />
        </div>
      </div>
    </article>
  );
}

export function ActionsGrid({ items }: { items: Action[] }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((a) => (
        <ActionCard key={a.slug} action={a} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Étapes numérotées (processus métier)

export function Steps({ steps }: { steps: readonly { title: string; text: string }[] }) {
  return (
    <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map((s, i) => (
        <li key={s.title} className="relative rounded-2xl border border-line bg-white p-6 shadow-sm">
          <span className="grid size-10 place-items-center rounded-full bg-brand text-sm font-extrabold text-white">
            {i + 1}
          </span>
          <h3 className="mt-4 font-bold text-ink">{s.title}</h3>
          <p className="mt-1.5 text-sm text-muted">{s.text}</p>
          {i < steps.length - 1 && (
            <span aria-hidden="true" className="absolute right-[-18px] top-11 hidden h-0.5 w-6 bg-brand/30 lg:block" />
          )}
        </li>
      ))}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// Témoignages

export function TestimonialCard({ t }: { t: Testimonial }) {
  const initials = t.name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2);
  return (
    <figure className="flex h-full flex-col rounded-2xl border border-line bg-white p-6 shadow-sm">
      <Quote className="size-8 fill-brand text-brand" />
      <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-ink/80">« {t.quote} »</blockquote>
      <figcaption className="mt-5 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-full bg-brand-soft text-sm font-bold text-brand">
          {initials}
        </span>
        <span>
          <span className="block text-sm font-bold text-ink">{t.name}</span>
          <span className="block text-xs text-muted">{t.role}</span>
        </span>
      </figcaption>
    </figure>
  );
}

export function TestimonialsSection({ items }: { items: Testimonial[] }) {
  return (
    <section className="bg-surface py-16 sm:py-20">
      <Container>
        <SectionTitle eyebrow="Ils témoignent" title="Des histoires de solidarité" />
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {items.map((t) => (
            <TestimonialCard key={t.name} t={t} />
          ))}
        </div>
      </Container>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Événements

function DateBadge({ iso }: { iso: string }) {
  return (
    <span className="flex size-14 shrink-0 flex-col items-center justify-center rounded-xl border border-brand/20 bg-brand-soft text-brand">
      <span className="text-lg font-extrabold leading-none">{dayOf(iso)}</span>
      <span className="text-[11px] font-bold uppercase">{monthOf(iso)}</span>
    </span>
  );
}

/** Liste compacte (accueil). */
export function EventList({ items }: { items: EventItem[] }) {
  return (
    <ul className="divide-y divide-line">
      {items.map((e) => (
        <li key={e.slug}>
          <Link href={`/evenements/${e.slug}`} className="group flex gap-4 py-4">
            <DateBadge iso={e.date} />
            <span className="min-w-0">
              <span className="block font-bold text-ink group-hover:text-brand">{e.title}</span>
              <span className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" /> {e.place}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5" /> {e.start} – {e.end}
                </span>
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Carte détaillée (page Événements). */
export function EventCard({ e }: { e: EventItem }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-sm transition hover:shadow-lg sm:flex-row">
      <ImageSlot src={e.image} alt={e.title} icon={CalendarDays} className="aspect-[16/9] sm:aspect-auto sm:w-56 sm:shrink-0" sizes="(min-width: 640px) 224px, 100vw" />
      <div className="flex flex-1 gap-4 p-5">
        <DateBadge iso={e.date} />
        <div className="min-w-0">
          <span className="inline-block rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-brand">
            {e.kind}
          </span>
          <h3 className="mt-2 text-lg font-bold text-ink">
            <Link href={`/evenements/${e.slug}`} className="hover:text-brand">
              {e.title}
            </Link>
          </h3>
          <p className="mt-1 text-sm text-muted">{e.summary}</p>
          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" /> {e.place}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" /> {e.start} – {e.end}
            </span>
          </p>
        </div>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Actualités

export function NewsCard({ a }: { a: Article }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <ImageSlot src={a.image} alt={a.title} icon={HeartHandshake} className="aspect-[16/10]" sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" />
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs text-muted">
          <time dateTime={a.date}>{formatDate(a.date)}</time> · <span className="font-semibold text-brand">{a.category}</span>
        </p>
        <h3 className="mt-2 flex-1 font-bold leading-snug text-ink">
          <Link href={`/actualites/${a.slug}`} className="hover:text-brand">
            {a.title}
          </Link>
        </h3>
        <div className="mt-4">
          <MoreLink href={`/actualites/${a.slug}`}>Lire la suite</MoreLink>
        </div>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Bandeau d'appel à l'action

export function CtaBand({
  title = "Ensemble, faisons grandir la solidarité",
  text,
  primary = { href: "/faire-un-don", label: "Faire un don" },
  secondary = { href: "/benevolat", label: "Devenir bénévole" },
}: {
  title?: string;
  text?: string;
  primary?: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  return (
    <section className="py-16">
      <Container>
        <div className="relative overflow-hidden rounded-3xl bg-[linear-gradient(110deg,#1d1f2b_0%,#3a1f2a_55%,#b0124f_100%)] px-6 py-8 text-white sm:px-14 sm:py-12">
          <div className="pointer-events-none absolute -right-16 -top-16 size-72 rounded-full bg-white/5" />
          <div className="pointer-events-none absolute -bottom-24 right-40 size-56 rounded-full bg-white/5" />
          {/* Bannière « Le Relais des Hommes de Bien » (visuel fourni par l'association). */}
          <Image
            src={banner.src}
            alt={banner.alt}
            width={banner.width}
            height={banner.height}
            sizes="(min-width: 1280px) 1104px, calc(100vw - 80px)"
            className="relative mb-8 h-auto w-full rounded-2xl shadow-lg ring-1 ring-white/10 sm:mb-10"
          />
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="max-w-lg text-2xl font-extrabold leading-tight sm:text-4xl">{title}</h2>
              {text && <p className="mt-3 max-w-lg text-white/85">{text}</p>}
              <span className="mt-4 block h-1 w-36 rounded-full bg-brand" />
            </div>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href={primary.href} variant="white">
                {primary.label}
              </ButtonLink>
              <ButtonLink href={secondary.href} variant="light">
                {secondary.label}
              </ButtonLink>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
