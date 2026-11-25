"use client";

// Galerie filtrable avec visionneuse plein écran (<dialog> natif : Échap ferme, focus piégé).
// Flèches gauche/droite pour naviguer ; balayage tactile sur mobile.

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { galleryCategories, type GalleryCategory, type GalleryItem } from "@/lib/inspiration-content";

type Filter = GalleryCategory | "tout";

const shapeClass = { square: "aspect-square", landscape: "aspect-[4/3]", portrait: "aspect-[3/4]" } as const;

export function InspirationGallery({ items }: { items: GalleryItem[] }) {
  const [filter, setFilter] = useState<Filter>("tout");
  const [open, setOpen] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const touchX = useRef<number | null>(null);
  const shown = filter === "tout" ? items : items.filter((i) => i.category === filter);
  const counts = Object.fromEntries((Object.keys(galleryCategories) as GalleryCategory[]).map((c) => [c, items.filter((i) => i.category === c).length]));
  const current = open === null ? null : shown[open];

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open !== null && !d.open) d.showModal();
    if (open === null && d.open) d.close();
  }, [open]);

  const go = (step: number) => setOpen((i) => (i === null ? i : (i + step + shown.length) % shown.length));

  const filters: { id: Filter; label: string; n: number }[] = [
    { id: "tout", label: "Tout", n: items.length },
    ...(Object.keys(galleryCategories) as GalleryCategory[]).filter((c) => counts[c] > 0).map((c) => ({ id: c, label: galleryCategories[c], n: counts[c] })),
  ];

  return (
    <div>
      <div role="group" aria-label="Filtrer la galerie" className="flex flex-wrap justify-center gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${filter === f.id ? "border-brand bg-brand text-white" : "border-line bg-white text-ink hover:border-brand hover:text-brand"}`}
          >
            {f.label} <span className={filter === f.id ? "text-white/80" : "text-muted"}>({f.n})</span>
          </button>
        ))}
      </div>

      <ul className="mt-10 columns-1 gap-5 sm:columns-2 lg:columns-3">
        {shown.map((item, i) => (
          <li key={item.id} className="mb-5 break-inside-avoid">
            <figure className="group overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
              <button type="button" onClick={() => setOpen(i)} className={`relative block w-full overflow-hidden ${shapeClass[item.shape ?? "landscape"]}`} aria-label={`Agrandir : ${item.caption}`}>
                <Image src={item.src} alt={item.alt} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition duration-500 group-hover:scale-105" />
                <span className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-white/90 text-ink opacity-0 shadow transition group-hover:opacity-100 group-focus-within:opacity-100">
                  <Expand className="size-4" aria-hidden="true" />
                </span>
              </button>
              <figcaption className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-brand">
                  {galleryCategories[item.category]}
                  {item.date && <span className="text-muted"> · {item.date}</span>}
                </p>
                <p className="mt-1 text-sm font-medium leading-snug text-ink">{item.caption}</p>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        aria-label={current ? current.caption : "Visionneuse"}
        onClose={() => setOpen(null)}
        onClick={(e) => e.target === e.currentTarget && setOpen(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(1);
          if (e.key === "ArrowLeft") go(-1);
        }}
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
          touchX.current = null;
        }}
        className="m-auto max-h-none max-w-none bg-transparent p-0 backdrop:bg-ink/95 backdrop:backdrop-blur-sm"
      >
        {current && (
          <div className="flex h-dvh w-screen flex-col items-center justify-center gap-4 p-4 sm:p-8">
            <div className="relative h-[75dvh] w-full max-w-5xl">
              <Image key={current.id} src={current.src} alt={current.alt} fill sizes="100vw" className="object-contain" />
            </div>
            <p className="max-w-3xl text-center text-sm text-white sm:text-base">
              {current.caption}
              <span className="ml-2 text-white/60">
                {open! + 1} / {shown.length}
              </span>
            </p>
            <button type="button" onClick={() => setOpen(null)} className="absolute right-4 top-4 grid size-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Fermer">
              <X className="size-6" />
            </button>
            {shown.length > 1 && (
              <>
                <button type="button" onClick={() => go(-1)} className="absolute left-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:left-6" aria-label="Photo précédente">
                  <ChevronLeft className="size-6" />
                </button>
                <button type="button" onClick={() => go(1)} className="absolute right-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:right-6" aria-label="Photo suivante">
                  <ChevronRight className="size-6" />
                </button>
              </>
            )}
          </div>
        )}
      </dialog>
    </div>
  );
}
