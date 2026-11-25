"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown, Heart, LogIn, Menu, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { mainNav } from "@/lib/site-content";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  // Le menu mobile est mémorisé avec l'URL où il a été ouvert : il se referme donc de lui-même
  // à chaque navigation, sans effet.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const [openSub, setOpenSub] = useState<string | null>(null);
  const open = openedAt === pathname;
  const setOpen = (fn: (v: boolean) => boolean) => setOpenedAt(fn(open) ? pathname : null);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:h-18">
        <Link href="/" aria-label="Accueil Grenier Communautaire" className="shrink-0">
          <Logo size="sm" priority />
        </Link>

        {/* Navigation bureau */}
        <nav aria-label="Navigation principale" className="ml-auto hidden items-center gap-0.5 text-sm font-semibold xl:flex">
          {mainNav.map((item) => {
            const active = isActive(pathname, item.href);
            const base = `relative flex items-center gap-1 px-3 py-2 transition hover:text-brand ${active ? "text-brand" : "text-ink"}`;
            const underline = active && (
              <span className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-brand lg:-bottom-[17px]" />
            );
            if (!item.children) {
              return (
                <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={base}>
                  {item.label}
                  {underline}
                </Link>
              );
            }
            return (
              <div key={item.href} className="group relative">
                <Link href={item.href} aria-current={active ? "page" : undefined} className={base}>
                  {item.label} <ChevronDown className="size-4 transition group-hover:rotate-180" />
                  {underline}
                </Link>
                <div className="invisible absolute left-0 top-full z-10 w-64 pt-3 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                  <div className="rounded-xl border border-line bg-white p-2 shadow-lg">
                    {item.children.map((c) => (
                      <Link
                        key={c.href}
                        href={c.href}
                        className={`block rounded-lg px-3 py-2 hover:bg-brand-soft hover:text-brand ${
                          pathname === c.href ? "bg-brand-soft text-brand" : ""
                        }`}
                      >
                        {c.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 xl:ml-4">
          <Link
            href="/auth/sign-in"
            aria-label="Espace membre"
            title="Espace membre"
            className="hidden rounded-full p-2 text-muted transition hover:bg-surface hover:text-brand sm:inline-flex"
          >
            <LogIn className="size-5" />
          </Link>
          <Link
            href="/faire-un-don"
            aria-label="Faire un don"
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark sm:px-5 sm:py-2.5"
          >
            <span className="hidden min-[400px]:inline">Faire un don</span> <Heart className="size-4 fill-current" />
          </Link>
          <button
            className="rounded-lg p-2 xl:hidden"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
            aria-controls="menu-mobile"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>

      {/* Navigation mobile / tablette */}
      {open && (
        <nav id="menu-mobile" aria-label="Navigation mobile" className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-line bg-white px-4 py-3 text-sm font-semibold xl:hidden">
          {mainNav.map((item) => {
            const active = isActive(pathname, item.href);
            const cls = `flex flex-1 items-center rounded-lg px-3 py-2.5 ${active ? "bg-brand-soft text-brand" : "hover:bg-surface"}`;
            if (!item.children) {
              return (
                <Link key={item.href} href={item.href} className={cls}>
                  {item.label}
                </Link>
              );
            }
            const expanded = openSub === item.href;
            return (
              <div key={item.href}>
                <div className="flex items-center">
                  <Link href={item.href} className={cls}>
                    {item.label}
                  </Link>
                  <button
                    className="rounded-lg p-2.5 hover:bg-surface"
                    aria-label={`Sous-menu ${item.label}`}
                    aria-expanded={expanded}
                    onClick={() => setOpenSub(expanded ? null : item.href)}
                  >
                    <ChevronDown className={`size-4 transition ${expanded ? "rotate-180" : ""}`} />
                  </button>
                </div>
                {expanded && (
                  <div className="mb-1 ml-3 border-l-2 border-brand-soft pl-2">
                    {item.children.map((c) => (
                      <Link key={c.href} href={c.href} className="block rounded-lg px-3 py-2 font-medium text-muted hover:text-brand">
                        {c.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <Link href="/auth/sign-in" className="mt-2 flex items-center gap-2 rounded-lg border-t border-line px-3 py-3 text-muted">
            <LogIn className="size-4" /> Espace membre
          </Link>
        </nav>
      )}
    </header>
  );
}
