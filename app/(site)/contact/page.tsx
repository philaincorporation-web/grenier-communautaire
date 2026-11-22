import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { Container, EmailText, SectionTitle } from "@/components/site/ui";
import { ContactForm } from "@/components/site/forms/ContactForm";
import { contactInfo, images } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "Contact",
  description: "Une question, un don volumineux, un partenariat ? Écrivez-nous ou passez au dépôt.",
};

export default function ContactPage() {
  const cards = [
    { icon: MapPin, title: "Adresse", value: contactInfo.address },
    { icon: Phone, title: "Téléphone", value: contactInfo.phone, href: `tel:${contactInfo.phone.replace(/\s/g, "")}` },
    { icon: Mail, title: "E-mail", value: contactInfo.email, href: `mailto:${contactInfo.email}` },
    { icon: Clock, title: "Horaires", value: contactInfo.hours },
  ];
  return (
    <>
      <PageHero title="Contact" eyebrow="Parlons-en" image={images.equipe.src} text="Une question, un don volumineux, un partenariat ? Nous vous répondons rapidement." />
      <section className="py-16 sm:py-20">
        <Container>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map(({ icon: Icon, title, value, href }) => (
              <li key={title} className="rounded-2xl border border-line bg-white p-6 shadow-sm">
                <span className="grid size-12 place-items-center rounded-xl bg-brand text-white">
                  <Icon className="size-6" />
                </span>
                <h2 className="mt-4 font-bold">{title}</h2>
                {href ? (
                  <a href={href} className="mt-1 block text-sm text-muted hover:text-brand">
                    {value.includes("@") ? <EmailText email={value} /> : value}
                  </a>
                ) : (
                  <p className="mt-1 text-sm text-muted">{value}</p>
                )}
              </li>
            ))}
          </ul>
        </Container>
      </section>
      <section className="bg-surface py-16 sm:py-20">
        <Container className="grid gap-10 lg:grid-cols-[1fr_1.5fr]">
          <div>
            <SectionTitle align="left" eyebrow="Écrivez-nous" title="Envoyez-nous un message" />
            <p className="mt-4 text-muted">
              Vous avez besoin d&apos;aide ? Utilisez plutôt le{" "}
              <Link href="/demander-une-aide" className="font-semibold text-brand underline">
                formulaire de demande d&apos;aide
              </Link>
              , il sera traité plus vite. Consultez aussi nos{" "}
              <Link href="/faq" className="font-semibold text-brand underline">
                questions fréquentes
              </Link>
              .
            </p>
            {/* TODO : intégrer une carte (iframe OpenStreetMap / Google Maps) du dépôt principal. */}
            <div className="mt-8 grid aspect-[4/3] place-items-center rounded-2xl border border-dashed border-line bg-white text-sm text-muted">
              <span className="flex items-center gap-2">
                <MapPin className="size-5 text-brand" /> Carte du dépôt (à intégrer)
              </span>
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">
            <ContactForm />
          </div>
        </Container>
      </section>
    </>
  );
}
