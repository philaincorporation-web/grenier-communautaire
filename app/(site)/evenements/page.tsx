import type { Metadata } from "next";
import { HeroSlider } from "@/components/site/HeroSlider";
import { Container, SectionTitle } from "@/components/site/ui";
import { CtaBand, EventCard } from "@/components/site/sections";
import { eventHeroSlides, events } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "Événements",
  description: "Collectes, distributions, ateliers et rencontres : l'agenda du Grenier Communautaire.",
};

export default function EventsPage() {
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
  return (
    <>
      <HeroSlider slides={eventHeroSlides()} srTitle="Événements" label="Prochains événements" variant="page" />
      <section className="py-16 sm:py-20">
        <Container>
          <SectionTitle eyebrow="Agenda" title="Tous les événements" text="Collectes, distributions, ateliers et rencontres : venez nous retrouver." />
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {sorted.map((e) => (
              <EventCard key={e.slug} e={e} />
            ))}
          </div>
        </Container>
      </section>
      <CtaBand
        title="Envie de participer à une collecte ?"
        primary={{ href: "/benevolat", label: "Devenir bénévole" }}
        secondary={{ href: "/contact", label: "Nous contacter" }}
      />
    </>
  );
}
