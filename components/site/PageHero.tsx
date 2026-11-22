import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

/** Bannière des pages internes : titre, chapô et fil d'Ariane. */
export function PageHero({
  title,
  text,
  crumbs = [],
  eyebrow,
  image,
}: {
  title: string;
  text?: string;
  eyebrow?: string;
  crumbs?: { href: string; label: string }[];
  /** Photo de fond (décorative : le titre porte le sens). Un voile sombre garde le texte lisible. */
  image?: string;
}) {
  const trail = [{ href: "/", label: "Accueil" }, ...crumbs];
  return (
    <section className="relative isolate overflow-hidden bg-[linear-gradient(110deg,#1d1f2b_0%,#3a1f2a_55%,#7a2a45_100%)] text-white">
      {image ? (
        <>
          <Image src={image} alt="" fill priority sizes="100vw" className="-z-20 object-cover" />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(29,31,43,0.92)_0%,rgba(58,31,42,0.78)_55%,rgba(58,31,42,0.45)_100%)]" />
        </>
      ) : (
        <>
          <div className="pointer-events-none absolute -right-20 -top-24 size-80 rounded-full bg-white/5" />
          <div className="pointer-events-none absolute -bottom-32 right-1/3 size-64 rounded-full bg-brand/20" />
        </>
      )}
      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
        <nav aria-label="Fil d'Ariane">
          <ol className="flex flex-wrap items-center gap-1 text-xs font-medium text-white/70 sm:text-sm">
            {trail.map((c) => (
              <li key={c.href} className="flex items-center gap-1">
                <Link href={c.href} className="hover:text-white">
                  {c.label}
                </Link>
                <ChevronRight className="size-3.5" />
              </li>
            ))}
            <li aria-current="page" className="text-white">
              {title}
            </li>
          </ol>
        </nav>
        {eyebrow && <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-brand-soft">{eyebrow}</p>}
        <h1 className={`${eyebrow ? "mt-2" : "mt-6"} max-w-3xl text-3xl font-extrabold leading-tight sm:text-5xl`}>{title}</h1>
        {text && <p className="mt-4 max-w-2xl text-base text-white/85 sm:text-lg">{text}</p>}
        <span className="mt-6 block h-1 w-24 rounded-full bg-brand" />
      </div>
    </section>
  );
}
