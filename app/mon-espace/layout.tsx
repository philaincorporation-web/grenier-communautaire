import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/Logo";
import { NavigationProgress } from "@/components/loading/NavigationProgress";
import { RequesterHeaderUser } from "@/components/requester/RequesterHeader";

export const metadata: Metadata = { title: { default: "Mon espace", template: "%s · Mon espace" }, robots: { index: false } };

export default function RequesterLayout({ children }: LayoutProps<"/mon-espace">) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <NavigationProgress />
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-2.5">
          <Link href="/" aria-label="Retour au site">
            <Logo size="sm" />
          </Link>
          <nav className="ml-2 hidden sm:block">
            <Link href="/mon-espace" className="rounded-lg px-3 py-2 text-sm font-semibold text-ink hover:bg-surface">
              Mes demandes
            </Link>
          </nav>
          <div className="ml-auto">
            <Suspense fallback={<div className="h-9 w-24" />}>
              <RequesterHeaderUser />
            </Suspense>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:py-10">{children}</main>
    </div>
  );
}
