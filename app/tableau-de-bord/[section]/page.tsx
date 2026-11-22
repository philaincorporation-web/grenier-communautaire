import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Construction } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { adminSections, type AdminSection } from "@/lib/data";

export function generateStaticParams() {
  return Object.keys(adminSections).map((section) => ({ section }));
}

function getSection(section: string) {
  return section in adminSections ? adminSections[section as AdminSection] : null;
}

export async function generateMetadata({ params }: PageProps<"/tableau-de-bord/[section]">): Promise<Metadata> {
  const { section } = await params;
  return { title: getSection(section)?.title };
}

export default async function SectionPage({ params }: PageProps<"/tableau-de-bord/[section]">) {
  const { section } = await params;
  const s = getSection(section);
  if (!s) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={s.title} subtitle={s.subtitle} />
      <div className="grid place-items-center rounded-xl border border-dashed border-line bg-white px-6 py-20 text-center">
        <Construction className="size-10 text-brand" />
        <p className="mt-4 font-semibold">Module en cours de construction</p>
        <p className="mt-1 max-w-md text-sm text-muted">
          Cet écran sera branché sur le schéma Drizzle (étape 2) une fois la base Neon configurée.
        </p>
      </div>
    </div>
  );
}
