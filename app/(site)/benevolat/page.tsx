import type { Metadata } from "next";
import { Boxes, HeartHandshake, Laptop, Store, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { Container, SectionTitle } from "@/components/site/ui";
import { EventList, Steps, TestimonialCard } from "@/components/site/sections";
import { VolunteerForm } from "@/components/site/forms/VolunteerForm";
import { events, getAction, images, testimonials, volunteerRoles } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "Bénévolat",
  description: "Rejoignez les Relais des Hommes de Bien : collecte, tri, distribution, boutique ou numérique.",
};

const roleIcons: Record<string, LucideIcon> = {
  collecte: Truck,
  tri: Boxes,
  distribution: HeartHandshake,
  boutique: Store,
  numerique: Laptop,
};

export default function VolunteerPage() {
  const steps = getAction("relais")?.steps ?? [];
  const volunteerQuote = testimonials.find((t) => t.role.toLowerCase().includes("bénévole")) ?? testimonials[0];

  return (
    <>
      <PageHero
        title="Bénévolat"
        eyebrow="Relais des Hommes de Bien"
        image={images.equipe.src}
        text="Quelques heures par mois suffisent pour changer le quotidien d'une famille. Rejoignez une équipe près de chez vous."
      />

      <section className="py-16 sm:py-20">
        <Container>
          <SectionTitle eyebrow="Les missions" title="Trouvez la mission qui vous ressemble" />
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {volunteerRoles.map((r) => {
              const Icon = roleIcons[r.id] ?? HeartHandshake;
              return (
                <li key={r.id} className="rounded-2xl border border-line bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
                  <span className="grid size-12 place-items-center rounded-xl bg-brand-soft text-brand">
                    <Icon className="size-6" />
                  </span>
                  <h3 className="mt-4 font-bold">{r.label}</h3>
                  <p className="mt-1 text-sm text-muted">{r.text}</p>
                </li>
              );
            })}
          </ul>
        </Container>
      </section>

      <section className="bg-surface py-16 sm:py-20">
        <Container>
          <SectionTitle eyebrow="Comment rejoindre" title="Devenir bénévole en 4 étapes" />
          <div className="mt-10">
            <Steps steps={steps} />
          </div>
        </Container>
      </section>

      <section id="candidature" className="scroll-mt-20 py-16 sm:py-20">
        <Container className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
          <div className="rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">
            <SectionTitle align="left" eyebrow="Candidature" title="Je propose mon aide" />
            <div className="mt-6">
              <VolunteerForm />
            </div>
          </div>
          <aside className="space-y-6">
            <TestimonialCard t={volunteerQuote} />
            <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
              <h3 className="font-bold">Prochain rendez-vous</h3>
              <EventList items={events.filter((e) => e.kind === "Rencontre").slice(0, 1).concat(events.filter((e) => e.kind !== "Rencontre").slice(0, 1))} />
            </div>
          </aside>
        </Container>
      </section>
    </>
  );
}
