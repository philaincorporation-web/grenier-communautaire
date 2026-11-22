import { Suspense } from "react";
import { DetailFallback } from "@/components/site/DetailFallback";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, HeartHandshake } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { Container, ImageSlot, SectionTitle } from "@/components/site/ui";
import { CtaBand, NewsCard } from "@/components/site/sections";
import { articles, formatDate, getArticle } from "@/lib/site-content";

export function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: PageProps<"/actualites/[slug]">): Promise<Metadata> {
  const article = getArticle((await params).slug);
  return article ? { title: article.title, description: article.excerpt } : {};
}

type Params = PageProps<"/actualites/[slug]">["params"];

/** `params` est lu dans une zone <Suspense> (exigence Next.js : navigation instantanée). */
export default function ArticlePage(props: PageProps<"/actualites/[slug]">) {
  return (
    <Suspense fallback={<DetailFallback />}>
      <ArticleContent params={props.params} />
    </Suspense>
  );
}

async function ArticleContent({ params }: { params: Params }) {
  const article = getArticle((await params).slug);
  if (!article) notFound();
  const others = articles.filter((a) => a.slug !== article.slug).slice(0, 3);

  return (
    <>
      <PageHero title={article.title} eyebrow={article.category} image={article.image} crumbs={[{ href: "/actualites", label: "Actualités" }]} />
      <article className="py-16 sm:py-20">
        <Container className="max-w-3xl">
          <p className="text-sm text-muted">
            Publié le <time dateTime={article.date}>{formatDate(article.date)}</time>
          </p>
          <ImageSlot src={article.image} alt={article.title} icon={HeartHandshake} className="mt-6 aspect-[16/9] rounded-2xl" sizes="(min-width: 768px) 768px, 100vw" priority />
          <p className="mt-8 text-lg font-medium text-ink">{article.excerpt}</p>
          <div className="mt-6 space-y-4 leading-relaxed text-ink/80">
            {article.body.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          <Link href="/actualites" className="mt-10 inline-flex items-center gap-2 text-sm font-semibold text-brand">
            <ArrowLeft className="size-4" /> Toutes les actualités
          </Link>
        </Container>
      </article>
      {others.length > 0 && (
        <section className="bg-surface py-16 sm:py-20">
          <Container>
            <SectionTitle eyebrow="À lire aussi" title="D'autres actualités" />
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((a) => (
                <NewsCard key={a.slug} a={a} />
              ))}
            </div>
          </Container>
        </section>
      )}
      <CtaBand />
    </>
  );
}
