import { Suspense } from "react";
import { DetailFallback } from "@/components/site/DetailFallback";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CircleCheck } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { ButtonLink, Container, ImageSlot, SectionTitle } from "@/components/site/ui";
import { ActionCard, actionIcons, CtaBand, Steps } from "@/components/site/sections";
import { actions, getAction } from "@/lib/site-content";

export function generateStaticParams() {
  return actions.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: PageProps<"/nos-actions/[slug]">): Promise<Metadata> {
  const action = getAction((await params).slug);
  return action ? { title: action.title, description: action.short } : {};
}

type Params = PageProps<"/nos-actions/[slug]">["params"];

/** `params` est lu dans une zone <Suspense> (exigence Next.js : navigation instantanée). */
export default function ActionPage(props: PageProps<"/nos-actions/[slug]">) {
  return (
    <Suspense fallback={<DetailFallback />}>
      <ActionContent params={props.params} />
    </Suspense>
  );
}

async function ActionContent({ params }: { params: Params }) {
  const action = getAction((await params).slug);
  if (!action) notFound();
  const Icon = actionIcons[action.icon];
  const others = actions.filter((a) => a.slug !== action.slug);

  return (
    <>
      <PageHero
        title={action.title}
        eyebrow="Nos actions"
        image={action.image}
        text={action.short}
        crumbs={[{ href: "/nos-actions", label: "Nos actions" }]}
      />

      <section className="py-16 sm:py-20">
        <Container className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
          <ImageSlot src={action.image} alt={action.title} icon={Icon} className="aspect-[4/3] rounded-2xl shadow-md" sizes="(min-width: 1024px) 50vw, 100vw" priority />
          <div>
            <SectionTitle align="left" eyebrow="En bref" title={`Qu'est-ce que ${action.title} ?`} />
            <p className="mt-4 text-muted">{action.description}</p>
            <ul className="mt-6 space-y-3">
              {action.highlights.map((h) => (
                <li key={h} className="flex items-start gap-3 text-sm font-medium">
                  <CircleCheck className="mt-0.5 size-5 shrink-0 fill-brand text-white" /> {h}
                </li>
              ))}
            </ul>
            <ButtonLink href={action.cta.href} className="mt-8 rounded-lg">
              {action.cta.label}
            </ButtonLink>
          </div>
        </Container>
      </section>

      <section className="bg-surface py-16 sm:py-20">
        <Container>
          <SectionTitle eyebrow="Comment ça marche" title="Étape par étape" />
          <div className="mt-10">
            <Steps steps={action.steps} />
          </div>
        </Container>
      </section>

      <section className="py-16 sm:py-20">
        <Container>
          <SectionTitle eyebrow="Découvrir aussi" title="Nos autres actions" />
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((a) => (
              <ActionCard key={a.slug} action={a} />
            ))}
          </div>
        </Container>
      </section>

      <CtaBand />
    </>
  );
}
