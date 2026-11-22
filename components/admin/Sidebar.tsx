"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Boxes,
  Gift,
  HandHelping,
  House,
  Inbox,
  Menu,
  Network,
  Settings,
  Truck,
  Users,
  X,
} from "lucide-react";
import { Logo } from "@/components/Logo";

const nav = [
  { href: "/tableau-de-bord", label: "Vue d'ensemble", icon: House },
  { href: "/tableau-de-bord/dons", label: "Dons", icon: Gift },
  { href: "/tableau-de-bord/stocks", label: "Stocks", icon: Boxes },
  { href: "/tableau-de-bord/beneficiaires", label: "Bénéficiaires", icon: Users },
  { href: "/tableau-de-bord/demandes", label: "Demandes d'aide", icon: HandHelping },
  { href: "/tableau-de-bord/demandes-en-ligne", label: "Demandes en ligne", icon: Inbox },
  { href: "/tableau-de-bord/distributions", label: "Distributions", icon: Truck },
  { href: "/tableau-de-bord/relais", label: "Relais", icon: Network },
  { href: "/tableau-de-bord/rapports", label: "Rapports", icon: BarChart3 },
  { href: "/tableau-de-bord/parametres", label: "Paramètres", icon: Settings },
];

function NavLinks({ onNavigate, badges }: { onNavigate?: () => void; badges?: Record<string, React.ReactNode> }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-1">
      {nav.map(({ href, label, icon: Icon }) => {
        const active = href === "/tableau-de-bord" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                active ? "bg-brand font-semibold text-white" : "text-white/80 hover:bg-sidebar-hover hover:text-white"
              }`}
            >
              <Icon className="size-[18px]" />
              {label}
              {badges?.[href]}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * `userCard` : composant serveur (session) rendu en bas de la barre latérale.
 * `badges` : pastilles serveur (ex. nombre de nouvelles demandes), indexées par lien du menu.
 */
export function Sidebar({ userCard, badges }: { userCard: React.ReactNode; badges?: Record<string, React.ReactNode> }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Barre mobile */}
      <div className="sticky top-0 z-30 flex items-center justify-between bg-sidebar px-4 py-3 lg:hidden">
        <Link href="/">
          <Logo size="sm" variant="light" priority />
        </Link>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={open}
          className="rounded-lg p-2 text-white"
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>
      {open && (
        <nav className="bg-sidebar px-3 pb-4 lg:hidden">
          <NavLinks onNavigate={() => setOpen(false)} badges={badges} />
          <div className="mt-3">{userCard}</div>
        </nav>
      )}

      {/* Barre latérale desktop */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar lg:flex">
        <Link href="/" className="px-5 py-6">
          <Logo size="sm" variant="light" priority />
        </Link>
        <nav className="flex-1 overflow-y-auto px-3">
          <NavLinks badges={badges} />
        </nav>
        {userCard}
      </aside>
    </>
  );
}
