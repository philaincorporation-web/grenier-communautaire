import { Suspense } from "react";
import { DetailFallback } from "@/components/site/DetailFallback";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays, Clock, MapPin, Tag } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { ButtonLink, Container, ImageSlot } from "@/components/site/ui";
import { EventList } from "@/components/site/sections";
import { eventCta, events, formatDate, getEvent } from "@/lib/site-content";

export function generateStaticParams() {
  return events.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: PageProps<"/evenements/[slug]">): Promise<Metadata> {
  const event = getEvent((await params).slug);
  return event ? { title: event.title, description: event.summary } : {};
}

type Params = PageProps<"/evenements/[slug]">["params"];

/** `params` est lu dans une zone <Suspense> (exigence Next.js : navigation instantanée). */
export default function EventPage(props: PageProps<"/evenements/[slug]">) {
  return (
    <Suspense fallback={<DetailFallback />}>
      <EventContent params={props.params} />
    </Suspense>
  );
}

async function EventContent({ params }: { params: Params }) {
  const event = getEvent((await params).slug);
  if (!event) notFound();
  const others = events.filter((e) => e.slug !== event.slug).slice(0, 3);
  const cta = eventCta(event.kind);

  const details = [
    { icon: CalendarDays, label: "Date", value: formatDate(event.date) },
    { icon: Clock, label: "Horaires", value: `${event.start} – ${event.end}` },
    { icon: MapPin, label: "Lieu", value: event.place },
    { icon: Tag, label: "Type", value: event.kind },
  ];

  return (
    <>
      <PageHero title={event.title} eyebrow={event.kind} image={event.image} crumbs={[{ href: "/evenements", label: "Événements" }]} />
      <section className="py-16 sm:py-20">
        <Container className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <ImageSlot src={event.image} alt={event.title} icon={CalendarDays} className="aspect-[16/9] rounded-2xl" sizes="(min-width: 1024px) 60vw, 100vw" priority />
            <p className="mt-8 text-lg text-ink/80">{event.summary}</p>
          </div>
          <aside className="space-y-6">
            <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
              <h2 className="font-bold">Informations pratiques</h2>
              <dl className="mt-4 space-y-4">
                {details.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
                      <Icon className="size-5" />
                    </span>
                    <div>
                      <dt className="text-xs text-muted">{label}</dt>
                      <dd className="text-sm font-semibold">{value}</dd>
                    </div>
                  </div>
                ))}
              </dl>
              <ButtonLink href={cta.href} className="mt-6 w-full rounded-lg">
                {cta.label}
              </ButtonLink>
            </div>
            <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
              <h2 className="font-bold">Autres événements</h2>
              <EventList items={others} />
            </div>
          </aside>
        </Container>
      </section>
    </>
  );
}
