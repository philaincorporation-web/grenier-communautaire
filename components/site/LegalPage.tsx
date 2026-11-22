import { PageHero } from "@/components/site/PageHero";
import { Container } from "@/components/site/ui";

/** Gabarit des pages légales. Les textes sont des trames à faire valider. */
export function LegalPage({ title, sections }: { title: string; sections: { h: string; p: string }[] }) {
  return (
    <>
      <PageHero title={title} />
      <section className="py-16 sm:py-20">
        <Container className="max-w-3xl space-y-8">
          <p className="rounded-xl bg-brand-soft px-4 py-3 text-sm text-brand">
            Trame provisoire : ce texte doit être complété et validé avant la mise en ligne.
          </p>
          {sections.map((s) => (
            <div key={s.h}>
              <h2 className="text-xl font-bold">{s.h}</h2>
              <p className="mt-2 leading-relaxed text-ink/80">{s.p}</p>
            </div>
          ))}
        </Container>
      </section>
    </>
  );
}
