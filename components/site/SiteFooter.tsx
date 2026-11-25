import Link from "next/link";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "@/components/Logo";
import { SocialIcons } from "@/components/site/SocialIcons";
import { NewsletterBand } from "@/components/site/sections/NewsletterBand";
import { EmailText } from "@/components/site/ui";
import { actions, contactInfo } from "@/lib/site-content";

const columns = [
  {
    title: "Liens rapides",
    links: [
      { href: "/a-propos", label: "À propos" },
      { href: "/nos-actions", label: "Nos actions" },
      { href: "/evenements", label: "Événements" },
      { href: "/actualites", label: "Actualités" },
      { href: "/inspiration", label: "Inspiration" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "S'impliquer",
    links: [
      { href: "/faire-un-don", label: "Faire un don" },
      { href: "/benevolat", label: "Devenir bénévole" },
      { href: "/demander-une-aide", label: "Demander une aide" },
      ...actions.slice(0, 2).map((a) => ({ href: `/nos-actions/${a.slug}`, label: a.title })),
    ],
  },
  {
    title: "Informations",
    links: [
      { href: "/faq", label: "Questions fréquentes" },
      { href: "/confidentialite", label: "Confidentialité" },
      { href: "/mentions-legales", label: "Mentions légales" },
      { href: "/auth/sign-in", label: "Espace membre" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer>
      <NewsletterBand />
      <div className="bg-ink text-white/75">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1.3fr]">
          <div>
            <Logo size="sm" variant="light" />
            <p className="mt-3 font-script text-2xl text-brand-soft">Faire du bien, chaque jour</p>
            <p className="mt-3 max-w-xs text-sm">
              Collecter, trier et redistribuer des biens utiles pour construire une société plus solidaire.
            </p>
            <SocialIcons className="mt-5" />
          </div>

          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">{col.title}</h2>
              <ul className="mt-4 space-y-2.5 text-sm">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="transition hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">Nous contacter</h2>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-brand-soft" /> {contactInfo.address}
              </li>
              <li className="flex gap-3">
                <Phone className="mt-0.5 size-4 shrink-0 text-brand-soft" />
                <a href={`tel:${contactInfo.phone.replace(/\s/g, "")}`} className="hover:text-white">
                  {contactInfo.phone}
                </a>
              </li>
              <li className="flex gap-3">
                <Mail className="mt-0.5 size-4 shrink-0 text-brand-soft" />
                <a href={`mailto:${contactInfo.email}`} className="min-w-0 hover:text-white">
                  <EmailText email={contactInfo.email} />
                </a>
              </li>
              <li className="flex gap-3">
                <Clock className="mt-0.5 size-4 shrink-0 text-brand-soft" /> {contactInfo.hours}
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <p className="mx-auto max-w-7xl px-4 py-5 text-center text-xs sm:px-6">
            © 2026 Grenier Communautaire-Tous droits réservés. Conçu, développé et maintenu par DIGIeWOMEN SCHOOL.
          </p>
        </div>
      </div>
    </footer>
  );
}
