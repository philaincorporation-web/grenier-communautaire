import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { ButtonLink, Container, IconTile, ImageSlot, SectionTitle } from "@/components/site/ui";
import { CtaBand } from "@/components/site/sections";
import {
  associationPhotos,
  components,
  definition,
  domains,
  gestures,
  keyFigures,
  milestones,
  mission,
  paradox,
  phases,
  problemStats,
  roadmap,
  stake,
  values,
  vision,
  waysToJoin,
} from "@/lib/about-content";

export const metadata: Metadata = {
  title: "À propos",
  description:
    "Le Grenier Communautaire : un « grenier » solidaire où les biens dont on n'a plus besoin sont collectés, triés, puis redonnés à ceux qui en ont besoin.",
};

// Couleurs des cartes de la frise, en alternance (comme dans la présentation de l'association).
const milestoneTone = ["bg-ink", "bg-brand-dark", "bg-ink", "bg-brand"];

export default function AboutPage() {
  return (
    <>
      <PageHero title="À propos" eyebrow="Qui sommes-nous" image={associationPhotos.couverture.src} text={definition} />

      {/* 01 · Notre histoire */}
      <section className="py-16 sm:py-20">
        <Container>
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <SectionTitle align="left" eyebrow="Notre histoire" title="L'engagement d'une femme, devenu un mouvement citoyen" />
            <ul className="grid gap-4 sm:grid-cols-2 lg:max-w-xl">
              {phases.map((p) => (
                <li key={p.label} className="border-l-2 border-brand pl-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">{p.label}</p>
                  <p className="mt-1 text-sm text-muted">{p.text}</p>
                </li>
              ))}
            </ul>
          </div>

          <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {milestones.map((m, i) => (
              <li key={m.year} className="flex flex-col overflow-hidden rounded-2xl shadow-sm">
                <ImageSlot src={m.image.src} alt={m.image.alt} className="aspect-[4/3]" sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" />
                <div className={`flex-1 p-5 text-white ${milestoneTone[i]}`}>
                  <p className="text-3xl font-light text-brand-soft">{m.year}</p>
                  <h3 className="mt-1 font-bold">{m.title}</h3>
                  <p className="mt-1.5 text-sm text-white/85">{m.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* 02 · Le problème */}
      <section className="bg-surface py-16 sm:py-20">
        <Container className="grid gap-10 lg:grid-cols-[1fr_1.5fr] lg:items-center lg:gap-14">
          <div>
            <SectionTitle align="left" eyebrow="Le constat" title="Un paradoxe que nous refusons" />
            <p className="mt-5 text-lg font-semibold leading-snug text-ink">{paradox}</p>
            <p className="mt-4 border-l-2 border-brand pl-4 text-muted">
              <strong className="text-brand">L&apos;enjeu :</strong> {stake}
            </p>
          </div>
          <ul className="grid gap-5 sm:grid-cols-3">
            {problemStats.map(({ icon, value, text }) => (
              <li key={value} className="rounded-2xl border border-line bg-white p-6 shadow-sm">
                <IconTile icon={icon} />
                <p className="mt-5 text-3xl font-extrabold text-brand">{value}</p>
                <p className="mt-1.5 text-sm text-muted">{text}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* 03 · Qu'est-ce que le Grenier Communautaire ? */}
      <section className="py-16 sm:py-20">
        <Container className="grid gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <SectionTitle align="left" eyebrow="Notre réponse" title="Qu'est-ce que le Grenier Communautaire ?" text={definition} />
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {components.map(({ icon, title, text, href }) => (
                <li key={title}>
                  <Link
                    href={href}
                    className="group flex h-full flex-col rounded-2xl border border-line bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-brand/40 hover:shadow-md"
                  >
                    <IconTile icon={icon} className="transition group-hover:bg-brand group-hover:text-white" />
                    <h3 className="mt-4 font-bold">{title}</h3>
                    <p className="mt-1 flex-1 text-sm text-muted">{text}</p>
                    <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand">
                      En savoir plus <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-6">
            <ImageSlot src={associationPhotos.carton.src} alt={associationPhotos.carton.alt} className="aspect-[16/10] rounded-2xl shadow-md" sizes="(min-width: 1024px) 50vw, 100vw" />
            <dl className="grid grid-cols-2 gap-5">
              {keyFigures.map((f) => (
                <div key={f.value} className="rounded-2xl bg-brand-soft p-5">
                  <dt className="text-2xl font-extrabold text-brand sm:text-3xl">{f.value}</dt>
                  <dd className="mt-1 text-sm text-ink/80">{f.text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Container>
      </section>

      {/* 04 · Vision, mission, valeurs */}
      <section className="bg-surface py-16 sm:py-20">
        <Container>
          <SectionTitle eyebrow="Ce qui nous guide" title="Vision, mission et valeurs" />
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <article className="rounded-2xl bg-brand p-7 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/75">Notre vision</p>
              <p className="mt-3 text-lg font-semibold leading-snug sm:text-xl">{vision}</p>
            </article>
            <article className="rounded-2xl bg-ink p-7 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-light">Notre mission</p>
              <p className="mt-3 text-lg font-semibold leading-snug sm:text-xl">{mission}</p>
            </article>
          </div>
          <ul className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {values.map(({ icon, title }) => (
              <li key={title} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4">
                <IconTile icon={icon} />
                <span className="font-bold">{title}</span>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* 05 · Notre action */}
      <section className="py-16 sm:py-20">
        <Container>
          <SectionTitle
            eyebrow="Notre action"
            title="Six gestes pour transformer chaque don en ressource utile"
          />
          <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {gestures.map(({ icon, title, text }, i) => (
              <li key={title} className="flex gap-4 rounded-2xl border border-line bg-white p-5 shadow-sm">
                <IconTile icon={icon} />
                <div>
                  <p className="text-xs font-bold text-brand">{String(i + 1).padStart(2, "0")}</p>
                  <h3 className="font-bold">{title}</h3>
                  <p className="mt-1 text-sm text-muted">{text}</p>
                </div>
              </li>
            ))}
          </ol>

          <h3 className="mt-14 text-center text-lg font-bold">Sept domaines d&apos;action</h3>
          <ul className="mt-5 flex flex-wrap justify-center gap-3">
            {domains.map(({ icon: Icon, label }) => (
              <li key={label} className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold shadow-sm">
                <Icon className="size-4 text-brand" strokeWidth={1.75} aria-hidden="true" /> {label}
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* Du Gabon à l'Afrique */}
      <section className="bg-ink py-16 text-white sm:py-20">
        <Container>
          <SectionTitle light eyebrow="Notre trajectoire" title="Du Gabon à l'Afrique" text="Un premier Grenier aujourd'hui, une toile de solidarité demain." />
          <ol className="mt-12 grid gap-8 md:grid-cols-4 md:gap-5">
            {roadmap.map((r, i) => (
              <li key={r.when} className="relative border-l-2 border-brand pl-5 md:border-l-0 md:border-t-2 md:pl-0 md:pt-6">
                <span
                  aria-hidden="true"
                  className={`absolute -left-[7px] top-1 size-3 rounded-full md:-top-[7px] md:left-0 ${i === roadmap.length - 1 ? "bg-white" : "bg-brand"}`}
                />
                <p className="text-2xl font-light text-brand-light">{r.when}</p>
                <p className="mt-1 text-sm text-white/85">{r.text}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* Rejoignez le mouvement */}
      <section className="py-16 sm:py-20">
        <Container>
          <SectionTitle eyebrow="Rejoignez le mouvement" title="Quatre façons d'agir avec nous" />
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {waysToJoin.map(({ icon, title, text, href, cta }) => (
              <li key={title} className="flex flex-col rounded-2xl border border-line bg-white p-6 shadow-sm">
                <IconTile icon={icon} />
                <h3 className="mt-4 text-lg font-bold">{title}</h3>
                <p className="mt-1 flex-1 text-sm text-muted">{text}</p>
                <div className="mt-5">
                  <ButtonLink href={href} variant="outline">
                    {cta}
                  </ButtonLink>
                </div>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <CtaBand
        title="Construisons ensemble le premier Grenier Communautaire"
        text="Un geste aujourd'hui, un avenir meilleur pour tous."
        primary={{ href: "/faire-un-don", label: "Faire un don" }}
        secondary={{ href: "/benevolat", label: "Devenir bénévole" }}
      />
    </>
  );
}
