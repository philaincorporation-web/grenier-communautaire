import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { DemoNotice } from "@/components/admin/DemoNotice";
import { DonationForm } from "@/components/admin/donations/DonationForm";
import { BackLink, Restricted, skeleton } from "@/components/admin/ui";
import { isDbConfigured } from "@/db";
import { getDonationFormOptions } from "@/lib/donations";
import { canRegisterDonation } from "@/lib/donations-shared";
import { requireActiveMembership } from "@/lib/session";

export const metadata: Metadata = { title: "Enregistrer un don" };

async function Content() {
  if (!isDbConfigured) return <DemoNotice />;
  const member = await requireActiveMembership();
  if (!canRegisterDonation(member.role)) return <Restricted text="Votre rôle permet de consulter les dons, pas d'en enregistrer." />;
  const options = await getDonationFormOptions(member.organizationId);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Libreville" }).format(new Date());
  return <DonationForm options={options} today={today} />;
}

export default function NewDonationPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <BackLink href="/tableau-de-bord/dons">Dons</BackLink>
      <PageHeader title="Enregistrer un don" subtitle="Réception au dépôt : les articles entrent en stock immédiatement." />
      <Suspense fallback={skeleton("h-[32rem]")}>
        <Content />
      </Suspense>
    </div>
  );
}
