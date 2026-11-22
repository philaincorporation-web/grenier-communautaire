import type { Metadata } from "next";
import { PageHero } from "@/components/site/PageHero";
import { Container, SectionTitle } from "@/components/site/ui";
import { ActionsGrid, CtaBand, Steps } from "@/components/site/sections";
import { actions, images } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "Nos actions",
  description: "Le Grenier, le Grenier Shop, la plateforme numérique et les Relais des Hommes de Bien.",
};

const chain = [
  { title: "Je donne", text: "Dons en nature déposés dans un dépôt ou lors d'une collecte." },
  { title: "Nous trions", text: "Réception, contrôle et classement par catégorie." },
  { title: "Nous stockons", text: "Rangement tracé dans nos dépôts et relais." },
  { title: "Nous redistribuons", text: "Distribution aux familles dont la demande est validée." },
];

export default function ActionsPage() {
  return (
    <>
      <PageHero
        title="Nos actions"
        eyebrow="Ce que nous faisons"
        image={images.colis.src}
        text="Quatre piliers complémentaires pour que chaque don utile trouve la famille qui en a besoin."
      />
      <section className="py-16 sm:py-20">
        <Container>
          <ActionsGrid items={actions} />
        </Container>
      </section>
      <section className="bg-surface py-16 sm:py-20">
        <Container>
          <SectionTitle
            eyebrow="La chaîne de solidarité"
            title="Du don à la famille, chaque étape compte"
            text="Chaque mouvement est enregistré : nous savons d'où vient chaque don et où il va."
          />
          <div className="mt-10">
            <Steps steps={chain} />
          </div>
        </Container>
      </section>
      <CtaBand />
    </>
  );
}
