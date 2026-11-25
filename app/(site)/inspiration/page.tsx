import type { Metadata } from "next";
import { Camera, Clapperboard, Mail } from "lucide-react";
import { InspirationGallery } from "@/components/site/InspirationGallery";
import { CtaBand } from "@/components/site/sections";
import { ButtonLink, Container, IconTile, SectionTitle } from "@/components/site/ui";
import { galleryCategories, galleryItems, videos, type VideoItem } from "@/lib/inspiration-content";

export const metadata: Metadata = {
  title: "Inspiration",
  description: "Galerie photo et vidéos du Grenier Communautaire : nos actions, nos collectes et nos descentes de terrain.",
};

function VideoCard({ v }: { v: VideoItem }) {
  return (
    <figure className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <div className="relative aspect-video bg-ink">
        {v.youtubeId ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${v.youtubeId}`}
            title={v.title}
            loading="lazy"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 size-full"
          />
        ) : (
          <video src={v.src} poster={v.poster} controls preload="metadata" playsInline className="absolute inset-0 size-full object-cover">
            Votre navigateur ne peut pas lire cette vidéo.
          </video>
        )}
      </div>
      <figcaption className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand">
          {galleryCategories[v.category]}
          {v.date && <span className="text-muted"> · {v.date}</span>}
        </p>
        <p className="mt-1 font-bold text-ink">{v.title}</p>
        <p className="mt-1 text-sm text-muted">{v.description}</p>
      </figcaption>
    </figure>
  );
}

export default function InspirationPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-[linear-gradient(110deg,#1d1f2b_0%,#3a1f2a_55%,#b0124f_100%)] py-16 text-white sm:py-20">
        <div className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full bg-white/5" />
        <Container className="relative">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/80">Inspiration</p>
          <h1 className="mt-2 max-w-3xl text-3xl font-extrabold leading-tight sm:text-5xl">La solidarité en images</h1>
          <p className="mt-4 max-w-2xl text-white/85 sm:text-lg">
            Collectes, distributions, journées « Faire du Bien » et descentes de terrain : découvrez nos bénévoles en action et ce qui nous fait avancer.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href="#galerie" variant="white" icon={Camera}>
              Galerie photo
            </ButtonLink>
            <ButtonLink href="#videos" variant="light" icon={Clapperboard}>
              Vidéos
            </ButtonLink>
          </div>
        </Container>
      </section>

      <section id="galerie" className="scroll-mt-24 py-16 sm:py-20">
        <Container>
          <SectionTitle eyebrow="Galerie photo" title="Nos actions sur le terrain" text="Cliquez sur une photo pour l'agrandir." />
          <div className="mt-8">
            <InspirationGallery items={galleryItems} />
          </div>
        </Container>
      </section>

      <section id="videos" className="scroll-mt-24 bg-surface py-16 sm:py-20">
        <Container>
          <SectionTitle eyebrow="Vidéos" title="Au cœur de nos descentes de terrain" text="Des reportages courts pour vivre nos actions de l'intérieur." />
          {videos.length > 0 ? (
            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {videos.map((v) => (
                <VideoCard key={v.id} v={v} />
              ))}
            </div>
          ) : (
            <div className="mx-auto mt-10 flex max-w-2xl flex-col items-center rounded-2xl border border-dashed border-line bg-white px-6 py-12 text-center">
              <IconTile icon={Clapperboard} size="lg" />
              <p className="mt-4 text-lg font-bold text-ink">Nos premières vidéos arrivent bientôt</p>
              <p className="mt-2 text-sm text-muted">Vous avez filmé ou photographié une de nos actions ? Partagez-la avec nous, elle pourra rejoindre cette page.</p>
              <ButtonLink href="/contact" variant="outline" icon={Mail} className="mt-6">
                Nous écrire
              </ButtonLink>
            </div>
          )}
        </Container>
      </section>

      <CtaBand title="Envie de faire partie de la prochaine photo ?" primary={{ href: "/benevolat", label: "Devenir bénévole" }} secondary={{ href: "/faire-un-don", label: "Faire un don" }} />
    </>
  );
}
