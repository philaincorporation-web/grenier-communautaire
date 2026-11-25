// Éléments d'interface communs aux modules du tableau de bord.

import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, Lock, Search, type LucideIcon } from "lucide-react";

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-brand">
      <ArrowLeft className="size-4" /> {children}
    </Link>
  );
}

export function EmptyState({ icon: Icon, title, text, children }: { icon: LucideIcon; title: string; text?: string; children?: React.ReactNode }) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-line bg-white px-6 py-16 text-center">
      <Icon className="size-9 text-brand" />
      <p className="mt-3 font-semibold">{title}</p>
      {text && <p className="mt-1 max-w-md text-sm text-muted">{text}</p>}
      {children}
    </div>
  );
}

export function Restricted({ text = "Votre rôle ne permet pas d'accéder à cet écran." }: { text?: string }) {
  return <EmptyState icon={Lock} title="Accès réservé" text={text} />;
}

export function Card({ title, children, className = "", action }: { title?: React.ReactNode; children: React.ReactNode; className?: string; action?: React.ReactNode }) {
  return (
    <section className={`rounded-xl border border-line bg-white shadow-sm ${className}`}>
      {title && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
          <h2 className="font-bold">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function PrimaryLink({ href, icon: Icon, children }: { href: string; icon?: LucideIcon; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark">
      {Icon && <Icon className="size-4" />} {children}
    </Link>
  );
}

export function SecondaryLink({ href, icon: Icon, children }: { href: string; icon?: LucideIcon; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold hover:border-brand">
      {Icon && <Icon className="size-4" />} {children}
    </Link>
  );
}

/** Pastilles de filtre (liens). */
export function FilterChips({ items, label }: { items: { href: string; label: string; active: boolean }[]; label: string }) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label={label}>
      {items.map((i) => (
        <li key={i.href + i.label}>
          <Link
            href={i.href}
            aria-current={i.active ? "true" : undefined}
            className={`inline-block rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${i.active ? "border-brand bg-brand text-white" : "border-line bg-white hover:border-brand"}`}
          >
            {i.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Recherche en GET (fonctionne sans JavaScript). `keep` : paramètres à conserver. */
export function SearchBox({ action, q, placeholder, keep = {} }: { action: string; q: string; placeholder: string; keep?: Record<string, string | undefined> }) {
  return (
    <form action={action} role="search" className="flex w-full max-w-md gap-2">
      {Object.entries(keep).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <label htmlFor="q" className="sr-only">
        Rechercher
      </label>
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          id="q"
          name="q"
          defaultValue={q}
          placeholder={placeholder}
          className="w-full rounded-lg border border-line bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </div>
      <button type="submit" className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold hover:border-brand">
        Rechercher
      </button>
    </form>
  );
}

export function Pagination({ page, pages, hrefFor }: { page: number; pages: number; hrefFor: (p: number) => string }) {
  if (pages <= 1) return null;
  const btn = "inline-flex items-center gap-1 rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium hover:border-brand";
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={btn}>
          <ChevronLeft className="size-4" /> Précédent
        </Link>
      ) : (
        <span />
      )}
      <span className="text-sm text-muted">
        Page {page} sur {pages}
      </span>
      {page < pages ? (
        <Link href={hrefFor(page + 1)} className={btn}>
          Suivant <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

export function Badge({ children, className }: { children: React.ReactNode; className: string }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>{children}</span>;
}

export const skeleton = (h = "h-96") => <div className={`${h} animate-pulse rounded-xl bg-white`} aria-busy="true" />;
