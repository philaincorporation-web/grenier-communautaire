import type { Metadata } from "next";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { DemoNotice } from "@/components/admin/DemoNotice";
import { StockTable } from "@/components/admin/StockTable";
import { loadStocks } from "@/lib/queries";

export const metadata: Metadata = { title: "Gestion des stocks" };

async function StocksContent({ searchParams }: { searchParams: PageProps<"/tableau-de-bord/stocks">["searchParams"] }) {
  const { depot } = await searchParams;
  const { demo, depots, selectedDepotId, items } = await loadStocks(typeof depot === "string" ? depot : undefined);

  return (
    <>
      {demo && <DemoNotice />}
      {selectedDepotId ? (
        <StockTable key={selectedDepotId} items={items} depots={depots} selectedDepotId={selectedDepotId} />
      ) : (
        <p className="rounded-xl border border-dashed border-line bg-white px-6 py-16 text-center text-sm text-muted">
          Aucun dépôt actif. Créez un dépôt dans les paramètres pour suivre vos stocks.
        </p>
      )}
    </>
  );
}

export default function StocksPage({ searchParams }: PageProps<"/tableau-de-bord/stocks">) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion des stocks"
        subtitle="Suivi des stocks par dépôt"
        action={
          <button className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark">
            <Plus className="size-4" /> Nouveau produit
          </button>
        }
      />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white" aria-busy="true" />}>
        <StocksContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
