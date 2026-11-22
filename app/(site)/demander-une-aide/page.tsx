import type { Metadata } from "next";
import { Lock, Phone } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { Container, IconTile, SectionTitle } from "@/components/site/ui";
import { Steps } from "@/components/site/sections";
import { AidRequestForm } from "@/components/site/forms/AidRequestForm";
import { aidSteps, contactInfo, images } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "Demander une aide",
  description: "Déposez une demande d'aide : l'équipe l'étudie et vous recontacte rapidement.",
};

export default function AidRequestPage() {
  return (
    <>
      <PageHero
        title="Demander une aide"
        eyebrow="Vous n'êtes pas seul"
        image={images.distribution.src}
        text="Alimentation, vêtements, fournitures scolaires, hygiène ou literie : faites-nous part de vos besoins, en toute confidentialité."
      />

      {/* Étapes calquées sur le cycle de vie d'une demande (aid_request_status) */}
      <section className="py-16 sm:py-20">
        <Container>
          <SectionTitle eyebrow="Comment ça marche" title="Le traitement de votre demande" />
          <div className="mt-10">
            <Steps steps={aidSteps} />
          </div>
        </Container>
      </section>

      <section className="bg-surface py-16 sm:py-20">
        <Container className="grid gap-10 lg:grid-cols-[1fr_1.6fr]">
          <aside className="space-y-6">
            <SectionTitle align="left" eyebrow="Formulaire" title="Déposer une demande" text="Les champs marqués d'un * sont obligatoires." />
            <div className="rounded-2xl border border-line bg-white p-6">
              <IconTile icon={Lock} />
              <h3 className="mt-4 font-bold">Vos informations sont protégées</h3>
              <p className="mt-1 text-sm text-muted">
                Elles sont uniquement accessibles à l&apos;équipe habilitée et servent seulement à étudier votre demande.
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-white p-6">
              <IconTile icon={Phone} />
              <h3 className="mt-4 font-bold">Vous préférez en parler ?</h3>
              <p className="mt-1 text-sm text-muted">
                Appelez-nous au{" "}
                <a href={`tel:${contactInfo.phone.replace(/\s/g, "")}`} className="font-semibold text-brand">
                  {contactInfo.phone}
                </a>{" "}
                ou venez au dépôt ({contactInfo.hours}).
              </p>
            </div>
          </aside>
          <div className="rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">
            <AidRequestForm />
          </div>
        </Container>
      </section>
    </>
  );
}
