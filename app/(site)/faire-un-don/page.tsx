import type { Metadata } from "next";
import { Clock, HandCoins, MapPin, Truck, X } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { ButtonLink, Container, IconTile, SectionTitle } from "@/components/site/ui";
import { categoryIcon } from "@/lib/category-icons";
import { CtaBand, Steps } from "@/components/site/sections";
import { contactInfo, donationCategories, donationRefused, getAction, images } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "Faire un don",
  description: "Donnez des biens utiles : alimentation, vêtements, fournitures scolaires, hygiène et literie.",
};

export default function DonatePage() {
  const steps = getAction("le-grenier")?.steps ?? [];
  return (
    <>
      <PageHero
        title="Faire un don"
        eyebrow="Donner, c'est agir"
        image={images.remise.src}
        text="Vos dons en nature sont réceptionnés, triés et redistribués aux familles accompagnées. Rien ne se perd."
      />

      {/* Catégories acceptées — alignées sur product_categories */}
      <section className="py-16 sm:py-20">
        <Container>
          <SectionTitle eyebrow="Ce que nous collectons" title="Que pouvez-vous donner ?" text="Merci de donner des articles propres, en bon état et non périmés." />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {donationCategories.map((c) => (
              <article id={c.id} key={c.id} className="group flex scroll-mt-28 flex-col items-center rounded-2xl border border-line bg-white p-6 text-center shadow-sm transition target:border-brand target:ring-2 target:ring-brand/30 hover:-translate-y-1 hover:shadow-md">
                <IconTile icon={categoryIcon(c.id)} size="lg" className="transition group-hover:bg-brand group-hover:text-white" />
                <h3 className="mt-4 font-bold text-ink">{c.label}</h3>
                <p className="mt-2 text-sm text-muted">{c.examples}</p>
              </article>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-red-100 bg-red-50/60 p-6">
            <h3 className="font-bold text-ink">Nous ne pouvons pas accepter</h3>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {donationRefused.map((r) => (
                <li key={r} className="flex items-start gap-2 text-sm text-ink/80">
                  <X className="mt-0.5 size-4 shrink-0 text-red-500" /> {r}
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      {/* Parcours d'un don */}
      <section className="bg-surface py-16 sm:py-20">
        <Container>
          <SectionTitle eyebrow="Le parcours de votre don" title="Du dépôt à la famille" />
          <div className="mt-10">
            <Steps steps={steps} />
          </div>
        </Container>
      </section>

      {/* Où et comment donner */}
      <section className="py-16 sm:py-20">
        <Container className="grid gap-6 lg:grid-cols-3">
          <article className="rounded-2xl border border-line p-7">
            <IconTile icon={MapPin} />
            <h3 className="mt-5 text-lg font-bold">Déposer au dépôt</h3>
            <p className="mt-2 text-sm text-muted">{contactInfo.address}</p>
            <p className="mt-2 flex items-center gap-2 text-sm text-muted">
              <Clock className="size-4" /> {contactInfo.hours}
            </p>
          </article>
          <article className="rounded-2xl border border-line p-7">
            <IconTile icon={Truck} />
            <h3 className="mt-5 text-lg font-bold">Collecte à domicile</h3>
            <p className="mt-2 text-sm text-muted">
              Pour les dons volumineux ou les entreprises, nos bénévoles peuvent venir récupérer vos dons.
            </p>
            <ButtonLink href="/contact" variant="outline" className="mt-5">
              Organiser une collecte
            </ButtonLink>
          </article>
          <article className="rounded-2xl border border-dashed border-line bg-surface p-7">
            <IconTile icon={HandCoins} tone="muted" />
            <h3 className="mt-5 text-lg font-bold">Don financier</h3>
            <p className="mt-2 text-sm text-muted">
              Les dons financiers en ligne ne sont pas encore disponibles. Contactez-nous pour soutenir l&apos;association
              autrement.
            </p>
            <span className="mt-5 inline-block rounded-full bg-white px-3 py-1 text-xs font-semibold text-muted">
              Bientôt disponible
            </span>
          </article>
        </Container>
      </section>

      <CtaBand title="Vous préférez donner de votre temps ?" primary={{ href: "/benevolat", label: "Devenir bénévole" }} secondary={{ href: "/evenements", label: "Voir les collectes" }} />
    </>
  );
}
