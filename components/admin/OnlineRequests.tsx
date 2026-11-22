import Link from "next/link";
import { ChevronLeft, ChevronRight, Mail, MapPin, Phone } from "lucide-react";
import { StatusActions } from "@/components/admin/StatusActions";
import {
  requestTabs,
  statusLabels,
  statusStyles,
  statuses,
  type OnlineRow,
  type RequestType,
  type SubmissionStatus,
  type SubscriberRow,
} from "@/lib/online-requests-shared";

const BASE = "/tableau-de-bord/demandes-en-ligne";
const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function demandesHref(p: { type: RequestType; statut?: SubmissionStatus; page?: number }) {
  const q = new URLSearchParams({ type: p.type });
  if (p.statut) q.set("statut", p.statut);
  if (p.page && p.page > 1) q.set("page", String(p.page));
  return `${BASE}?${q}`;
}

export function StatusBadge({ status }: { status: SubmissionStatus }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyles[status]}`}>
      {statusLabels[status]}
    </span>
  );
}

/** Onglets par type de demande, avec le nombre de nouvelles demandes. */
export function Tabs({ current, counts }: { current: RequestType; counts: Partial<Record<RequestType, number>> }) {
  return (
    <nav aria-label="Type de demande" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1 border-b border-line">
        {requestTabs.map((t) => {
          const active = t.id === current;
          const n = counts[t.id] ?? 0;
          return (
            <li key={t.id}>
              <Link
                href={demandesHref({ type: t.id })}
                aria-current={active ? "page" : undefined}
                className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                  active ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink"
                }`}
              >
                {t.label}
                {n > 0 && (
                  <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold leading-none text-white">{n}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function StatusFilter({ type, current }: { type: RequestType; current?: SubmissionStatus }) {
  const chip = (active: boolean) =>
    `rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
      active ? "border-brand bg-brand text-white" : "border-line bg-white text-ink hover:border-brand"
    }`;
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Filtrer par statut">
      <li>
        <Link href={demandesHref({ type })} className={chip(!current)} aria-current={!current ? "true" : undefined}>
          Toutes
        </Link>
      </li>
      {statuses.map((s) => (
        <li key={s}>
          <Link href={demandesHref({ type, statut: s })} className={chip(current === s)} aria-current={current === s ? "true" : undefined}>
            {statusLabels[s]}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function RequestCard({ row, canAct }: { row: OnlineRow; canAct: boolean }) {
  return (
    <article className={`rounded-xl border bg-white p-4 shadow-sm sm:p-5 ${row.status === "new" ? "border-brand/40" : "border-line"}`}>
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold">{row.title}</h3>
          <p className="mt-0.5 text-xs text-muted">
            <time dateTime={row.createdAt}>{dateFmt.format(new Date(row.createdAt))}</time>
            {row.reference && (
              <>
                {" · "}
                <span className="font-mono font-semibold text-ink">{row.reference}</span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {row.converted && (
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">Convertie en demande</span>
          )}
          <StatusBadge status={row.status} />
        </div>
      </header>

      <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {row.phone && (
          <div className="flex items-center gap-2">
            <Phone className="size-4 shrink-0 text-muted" />
            <dt className="sr-only">Téléphone</dt>
            <dd>
              <a href={`tel:${row.phone.replace(/\s/g, "")}`} className="font-medium text-brand hover:underline">
                {row.phone}
              </a>
            </dd>
          </div>
        )}
        {row.email && (
          <div className="flex min-w-0 items-center gap-2">
            <Mail className="size-4 shrink-0 text-muted" />
            <dt className="sr-only">E-mail</dt>
            <dd className="min-w-0 truncate">
              <a href={`mailto:${row.email}`} className="font-medium text-brand hover:underline">
                {row.email}
              </a>
            </dd>
          </div>
        )}
        {row.fields.map((f) => (
          <div key={f.label} className="flex items-start gap-2">
            {f.label === "Adresse" ? <MapPin className="mt-0.5 size-4 shrink-0 text-muted" /> : <span className="size-4 shrink-0" />}
            <dt className="shrink-0 text-muted">{f.label} :</dt>
            <dd className="min-w-0 break-words font-medium">{f.value}</dd>
          </div>
        ))}
      </dl>

      {row.message && (
        <p className="mt-3 whitespace-pre-wrap break-words rounded-lg bg-surface px-3.5 py-3 text-sm text-ink/80">{row.message}</p>
      )}

      {canAct && (
        <footer className="mt-4 border-t border-line pt-3">
          <StatusActions type={row.type} id={row.id} status={row.status} />
        </footer>
      )}
    </article>
  );
}

export function SubscriberList({ rows, total, active }: { rows: SubscriberRow[]; total: number; active: number }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        <strong className="text-ink">{active}</strong> abonné{active > 1 ? "s" : ""} actif{active > 1 ? "s" : ""} sur {total} inscription
        {total > 1 ? "s" : ""}.
      </p>
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
        {rows.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
            <a href={`mailto:${s.email}`} className="min-w-0 truncate font-medium hover:text-brand">
              {s.email}
            </a>
            <span className="flex items-center gap-3 text-xs text-muted">
              <time dateTime={s.subscribedAt}>{dateFmt.format(new Date(s.subscribedAt))}</time>
              <span className={`rounded-full px-2.5 py-0.5 font-semibold ${s.active ? "bg-green-100 text-green-700" : "bg-surface text-muted"}`}>
                {s.active ? "Actif" : "Désinscrit"}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Pagination({
  type,
  statut,
  page,
  total,
  pageSize,
}: {
  type: RequestType;
  statut?: SubmissionStatus;
  page: number;
  total: number;
  pageSize: number;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const btn = "inline-flex items-center gap-1 rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium transition hover:border-brand";
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3">
      {page > 1 ? (
        <Link href={demandesHref({ type, statut, page: page - 1 })} className={btn}>
          <ChevronLeft className="size-4" /> Précédent
        </Link>
      ) : (
        <span />
      )}
      <span className="text-sm text-muted">
        Page {page} sur {pages}
      </span>
      {page < pages ? (
        <Link href={demandesHref({ type, statut, page: page + 1 })} className={btn}>
          Suivant <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
