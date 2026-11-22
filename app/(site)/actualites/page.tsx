import type { Metadata } from "next";
import { HeroSlider } from "@/components/site/HeroSlider";
import { Container, SectionTitle } from "@/components/site/ui";
import { NewsCard } from "@/components/site/sections";
import { articleHeroSlides, articles } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "Actualités",
  description: "Les nouvelles du Grenier Communautaire : collectes, distributions et vie de l'association.",
};

export default function NewsPage() {
  const sorted = [...articles].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <>
      <HeroSlider slides={articleHeroSlides()} srTitle="Actualités" label="À la une" variant="page" />
      <section className="py-16 sm:py-20">
        <Container>
          <SectionTitle eyebrow="Blog" title="Toutes les actualités" text="Collectes, distributions, nouveaux relais et histoires de solidarité." />
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((a) => (
              <NewsCard key={a.slug} a={a} />
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
