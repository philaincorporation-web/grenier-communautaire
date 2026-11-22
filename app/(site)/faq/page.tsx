import type { Metadata } from "next";
import { ChevronDown } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { Container } from "@/components/site/ui";
import { CtaBand } from "@/components/site/sections";
import { faq } from "@/lib/site-content";

export const metadata: Metadata = { title: "Questions fréquentes" };

export default function FaqPage() {
  return (
    <>
      <PageHero title="Questions fréquentes" eyebrow="FAQ" text="Les réponses aux questions que l'on nous pose le plus souvent." />
      <section className="py-16 sm:py-20">
        <Container className="max-w-3xl space-y-3">
          {faq.map((item) => (
            <details key={item.q} className="group rounded-2xl border border-line bg-white p-5 shadow-sm open:border-brand/40">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronDown className="size-5 shrink-0 text-brand transition group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm text-muted">{item.a}</p>
            </details>
          ))}
        </Container>
      </section>
      <CtaBand title="Vous n'avez pas trouvé votre réponse ?" primary={{ href: "/contact", label: "Nous contacter" }} secondary={{ href: "/a-propos", label: "Qui sommes-nous" }} />
    </>
  );
}
