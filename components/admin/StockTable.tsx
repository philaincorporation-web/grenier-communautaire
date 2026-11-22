"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { categoryIcon } from "@/lib/category-icons";
import type { Depot, StockItem, StockStatus } from "@/lib/data";

const PAGE_SIZE = 4;

const statusCls: Record<StockStatus, string> = {
  Disponible: "bg-green-100 text-green-700",
  "Stock faible": "bg-amber-100 text-amber-700",
  Rupture: "bg-red-100 text-red-700",
};

const qty = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 });

const selectCls =
  "rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

export function StockTable({
  items,
  depots,
  selectedDepotId,
}: {
  items: StockItem[];
  depots: Depot[];
  selectedDepotId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const categories = useMemo(() => [...new Set(items.map((i) => i.category))].sort(), [items]);

  const filtered = items.filter(
    (i) =>
      i.name.toLowerCase().includes(query.trim().toLowerCase()) &&
      (!category || i.category === category) &&
      (!status || i.status === status),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <select
          aria-label="Dépôt"
          className={selectCls}
          value={selectedDepotId}
          onChange={(e) => {
            const depot = e.target.value;
            startTransition(() => router.push(`${pathname}?depot=${encodeURIComponent(depot)}`));
          }}
        >
          {depots.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <label className="relative min-w-52 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            placeholder="Rechercher un produit…"
            value={query}
            onChange={(e) => reset(setQuery)(e.target.value)}
            className={`${selectCls} w-full pl-9 font-normal`}
          />
        </label>
        <select aria-label="Catégorie" className={selectCls} value={category} onChange={(e) => reset(setCategory)(e.target.value)}>
          <option value="">Toutes catégories</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select aria-label="État" className={selectCls} value={status} onChange={(e) => reset(setStatus)(e.target.value)}>
          <option value="">Tous états</option>
          {Object.keys(statusCls).map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className={`overflow-x-auto rounded-xl border border-line bg-white shadow-sm transition-opacity ${pending ? "opacity-50" : ""}`}>
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-surface text-left font-semibold">
            <tr>
              <th className="px-4 py-3">Produit</th>
              <th className="px-4 py-3">Catégorie</th>
              <th className="px-4 py-3 text-right">Quantité</th>
              <th className="px-4 py-3">Unité</th>
              <th className="px-4 py-3">État</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((i) => {
              const Icon = categoryIcon(i.category);
              return (
                <tr key={i.id} className="hover:bg-surface/60">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-3">
                      <span className="grid size-8 place-items-center rounded-lg bg-brand-soft text-brand" aria-hidden="true">
                        <Icon className="size-4" strokeWidth={1.75} />
                      </span>
                      {i.name}
                    </span>
                  </td>
                  <td className="px-4 py-3">{i.category}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{qty.format(i.quantity)}</td>
                  <td className="px-4 py-3">{i.unit}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusCls[i.status]}`}>{i.status}</span>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted">
                  Aucun produit ne correspond aux filtres.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <nav className="flex items-center justify-end gap-1" aria-label="Pagination">
        <button
          className="rounded-md p-1.5 hover:bg-white disabled:opacity-30"
          disabled={current === 1}
          onClick={() => setPage(current - 1)}
          aria-label="Page précédente"
        >
          <ChevronLeft className="size-4" />
        </button>
        {Array.from({ length: pages }, (_, n) => n + 1).map((n) => (
          <button
            key={n}
            onClick={() => setPage(n)}
            aria-current={n === current ? "page" : undefined}
            className={`size-8 rounded-md text-sm font-semibold ${n === current ? "bg-brand text-white" : "hover:bg-white"}`}
          >
            {n}
          </button>
        ))}
        <button
          className="rounded-md p-1.5 hover:bg-white disabled:opacity-30"
          disabled={current === pages}
          onClick={() => setPage(current + 1)}
          aria-label="Page suivante"
        >
          <ChevronRight className="size-4" />
        </button>
      </nav>
    </div>
  );
}
