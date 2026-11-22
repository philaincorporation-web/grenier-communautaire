import type { Metadata } from "next";
import { Suspense } from "react";
import { Sidebar } from "@/components/admin/Sidebar";
import { OnlineBadge } from "@/components/admin/OnlineBadge";
import { UserCard } from "@/components/admin/UserCard";

export const metadata: Metadata = { title: "Tableau de bord" };

export default function AdminLayout({ children }: LayoutProps<"/tableau-de-bord">) {
  return (
    <div className="flex min-h-screen flex-col bg-surface lg:flex-row">
      <Sidebar
        badges={{
          "/tableau-de-bord/demandes-en-ligne": (
            <Suspense fallback={null}>
              <OnlineBadge />
            </Suspense>
          ),
        }}
        userCard={
          <Suspense fallback={<div className="h-[69px] border-t border-white/10" />}>
            <UserCard />
          </Suspense>
        }
      />
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
