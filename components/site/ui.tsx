import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, ImageIcon } from "lucide-react";

/** Surtitre coloré + titre + chapô : le motif répété dans toutes les sections. */
export function SectionTitle({
  eyebrow,
  title,
  text,
  align = "center",
  light = false,
}: {
  eyebrow: string;
  title: string;
  text?: string;
  align?: "center" | "left";
  light?: boolean;
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p className={`text-xs font-bold uppercase tracking-[0.18em] ${light ? "text-white/80" : "text-brand"}`}>
        {eyebrow}
      </p>
      <h2 className={`mt-2 text-2xl font-extrabold leading-tight sm:text-3xl lg:text-4xl ${light ? "text-white" : "text-ink"}`}>
        {title}
      </h2>
      {text && <p className={`mt-3 text-base ${light ? "text-white/85" : "text-muted"}`}>{text}</p>}
    </div>
  );
}

const buttonStyles = {
  primary: "bg-brand text-white shadow-md hover:bg-brand-dark",
  outline: "border-2 border-brand text-brand hover:bg-brand hover:text-white",
  light: "border-2 border-white text-white hover:bg-white hover:text-ink",
  white: "bg-white text-brand shadow-md hover:bg-brand-soft",
} as const;

export function ButtonLink({
  href,
  children,
  variant = "primary",
  icon: Icon = ArrowRight,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  variant?: keyof typeof buttonStyles;
  icon?: LucideIcon | null;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition ${buttonStyles[variant]} ${className}`}
    >
      {children}
      {Icon && <Icon className="size-4" />}
    </Link>
  );
}

/** Lien texte « En savoir plus → ». */
export function MoreLink({ href, children = "En savoir plus" }: { href: string; children?: React.ReactNode }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-1.5 text-sm font-semibold text-brand">
      {children}
      <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
    </Link>
  );
}

/**
 * Emplacement d'image. Avec `src` : vraie photo optimisée. Sans : visuel de remplacement
 * aux couleurs de la charte, pour que la mise en page reste juste en attendant les photos.
 */
export function ImageSlot({
  src,
  alt,
  icon: Icon = ImageIcon,
  className = "",
  sizes = "(min-width: 1024px) 33vw, 100vw",
  priority = false,
  tone = "brand",
}: {
  src?: string;
  alt: string;
  icon?: LucideIcon;
  className?: string;
  sizes?: string;
  priority?: boolean;
  tone?: "brand" | "ink";
}) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {src ? (
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
      ) : (
        <div
          role="img"
          aria-label={alt}
          className={`absolute inset-0 grid place-items-center ${
            tone === "brand"
              ? "bg-[linear-gradient(135deg,#fbe9f0_0%,#f3c6d7_100%)] text-brand/70"
              : "bg-[linear-gradient(135deg,#3a1f2a_0%,#1d1f2b_100%)] text-white/60"
          }`}
        >
          <div className="absolute -right-8 -top-8 size-32 rounded-full bg-white/20" />
          <div className="absolute -bottom-10 -left-6 size-28 rounded-full bg-white/10" />
          <Icon className="relative size-12" strokeWidth={1.5} />
        </div>
      )}
    </div>
  );
}

const tileTones = {
  soft: "bg-brand-soft text-brand",
  solid: "bg-brand text-white",
  muted: "bg-surface text-muted",
} as const;

/**
 * Pictogramme Lucide dans un carré arrondi teinté : le seul gabarit d'icône « décorative » du site
 * (trait fin et uniforme, taille et teinte tirées de la charte).
 */
export function IconTile({
  icon: Icon,
  size = "md",
  tone = "soft",
  className = "",
}: {
  icon: LucideIcon;
  size?: "md" | "lg";
  tone?: keyof typeof tileTones;
  className?: string;
}) {
  const box = size === "lg" ? "size-14 rounded-2xl" : "size-12 rounded-xl";
  return (
    <span className={`grid shrink-0 place-items-center ${box} ${tileTones[tone]} ${className}`}>
      <Icon className={size === "lg" ? "size-7" : "size-6"} strokeWidth={1.75} aria-hidden="true" />
    </span>
  );
}

/** Adresse e-mail qui, si la place manque, passe à la ligne juste avant le « @ » (jamais au milieu d'un mot). */
export function EmailText({ email }: { email: string }) {
  const [local, domain] = email.split("@");
  return (
    <>
      {local}
      <wbr />@{domain}
    </>
  );
}

export function Container({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-7xl px-4 sm:px-6 ${className}`}>{children}</div>;
}
