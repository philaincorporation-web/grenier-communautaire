import { Suspense } from "react";
import { CircleCheck, House } from "lucide-react";
import { HeroSlider } from "@/components/site/HeroSlider";
import { ButtonLink, Container, ImageSlot, SectionTitle } from "@/components/site/ui";
import {
  ActionsGrid,
  CtaBand,
  EventList,
  NewsCard,
  StatsFallback,
  StatsGrid,
  TestimonialsSection,
} from "@/components/site/sections";
import { DonateVolunteerSplit } from "@/components/site/sections/DonateVolunteerSplit";
import { actions, articles, events, heroSlides, images, testimonials } from "@/lib/site-content";

const missionPoints = [
  "Collecte et tri des dons en nature",
  "Distributions aux familles accompagnées",
  "Un réseau de relais bénévoles de proximité",
];

export default function HomePage() {
  return (
    <>
      {/* 1. Hero : carrousel de cartes minutées */}
      <HeroSlider slides={heroSlides} srTitle="Grenier Communautaire : la solidarité au cœur de nos communautés" />

      {/* 2. Mission + chiffres */}
      <section className="py-16 sm:py-20">
        <Container className="grid items-center gap-10 md:grid-cols-2 xl:grid-cols-[1fr_1.1fr_1fr]">
          <ImageSlot src={images.distribution.src} alt={images.distribution.alt} icon={House} className="aspect-[4/3] rounded-2xl shadow-md" sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw" />
          <div>
            <SectionTitle
              align="left"
              eyebrow="Notre mission"
              title="Chaque famille mérite un coup de main"
              text="Relier les ressources disponibles aux besoins réels : collecter, trier et redistribuer les biens utiles, gratuitement ou à prix solidaire."
            />
            <ul className="mt-6 space-y-3">
              {missionPoints.map((p) => (
                <li key={p} className="flex items-start gap-3 text-sm font-medium">
                  <CircleCheck className="mt-0.5 size-5 shrink-0 fill-brand text-white" /> {p}
                </li>
              ))}
            </ul>
            <div className="mt-7">
              <ButtonLink href="/a-propos" variant="outline">
                Qui sommes-nous
              </ButtonLink>
            </div>
          </div>
          <div className="md:col-span-2 md:mx-auto md:w-full md:max-w-xl xl:col-span-1 xl:max-w-none">
            <Suspense fallback={<StatsFallback />}>
              <StatsGrid />
            </Suspense>
          </div>
        </Container>
      </section>

      {/* 3. Don / Bénévole */}
      <DonateVolunteerSplit />

      {/* 4. Nos actions */}
      <section className="py-16 sm:py-20">
        <Container>
          <SectionTitle eyebrow="Nos actions" title="Des actions qui changent le quotidien" />
          <div className="mt-10">
            <ActionsGrid items={actions} />
          </div>
        </Container>
      </section>

      {/* 5. Témoignages */}
      <TestimonialsSection items={testimonials} />

      {/* 6. Événements + Actualités */}
      <section className="py-16 sm:py-20">
        <Container className="grid gap-12 lg:grid-cols-[1fr_2fr] lg:gap-10">
          <div className="lg:border-r lg:border-line lg:pr-10">
            <SectionTitle align="left" eyebrow="Agenda" title="Rejoignez nos événements" />
            <div className="mt-4">
              <EventList items={events.slice(0, 3)} />
            </div>
            <ButtonLink href="/evenements" className="mt-4 rounded-lg">
              Tous les événements
            </ButtonLink>
          </div>
          <div>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionTitle align="left" eyebrow="Actualités" title="Les dernières nouvelles" />
              <ButtonLink href="/actualites" variant="outline" className="hidden sm:inline-flex">
                Toutes les actualités
              </ButtonLink>
            </div>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {articles.slice(0, 3).map((a, i) => (
                <div key={a.slug} className={i === 2 ? "sm:hidden xl:block" : ""}>
                  <NewsCard a={a} />
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <CtaBand />
    </>
  );
}
