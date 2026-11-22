// lucide-react v1 ne fournit plus les logos de marques : pictogrammes SVG simplifiés.

const icons = {
  Facebook: (
    <path d="M14 8h3V4h-3c-2.8 0-5 2.2-5 5v2H7v4h2v9h4v-9h3l1-4h-4V9c0-.6.4-1 1-1Z" fill="currentColor" />
  ),
  Instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
    </>
  ),
  TikTok: (
    <path d="M16.6 3c.3 2.3 1.7 3.9 4 4.1v3.2c-1.5 0-2.9-.4-4-1.2v6.2c0 3.1-2.5 5.4-5.5 5.4S5.700 18.400 5.700 15.300c0-3.300 2.800-5.600 6.100-5.100v3.400c-1.600-.5-2.800.5-2.800 1.800 0 1 .8 1.900 1.900 1.900 1.200 0 2.100-.9 2.100-2.200V3h3.600Z" fill="currentColor" />
  ),
  LinkedIn: (
    <path d="M4 9h4v12H4zM6 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm4 6h3.8v1.7h.1c.5-1 1.8-2 3.8-2 4 0 4.8 2.6 4.8 6V21h-4v-5.5c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9V21h-4z" fill="currentColor" />
  ),
  WhatsApp: (
    <path d="M12 2a10 10 0 0 0-8.600 15.100L2 22l5-1.300A10 10 0 1 0 12 2Zm5.200 14.100c-.2.600-1.300 1.200-1.800 1.200-.5.100-1.100.2-3.300-.7-2.800-1.200-4.600-4-4.700-4.200-.1-.2-1.100-1.500-1.100-2.800s.7-2 1-2.300c.2-.3.500-.3.700-.3h.5c.2 0 .4 0 .6.500.2.600.8 2 .8 2.100.1.100.1.300 0 .5l-.3.400c-.1.200-.3.300-.1.600.2.300.7 1.100 1.500 1.800 1 .9 1.900 1.200 2.200 1.300.3.100.4.100.6-.1.200-.2.700-.8.900-1.100.2-.3.400-.2.600-.1l2 1c.3.100.5.200.5.300.1.200.1.800-.1 1.400Z" fill="currentColor" />
  ),
};

/**
 * Comptes de l'association (la présentation cite Facebook, Instagram, TikTok, LinkedIn et WhatsApp,
 * sous le nom « Grenier Communautaire »). TODO : renseigner l'adresse de chaque compte.
 * Une icône sans adresse n'est pas affichée : pas de bouton mort.
 */
export const socialLinks: { name: keyof typeof icons; href: string }[] = [
  { name: "Facebook", href: "" },
  { name: "Instagram", href: "" },
  { name: "TikTok", href: "" },
  { name: "LinkedIn", href: "" },
  { name: "WhatsApp", href: "" },
];

export function SocialIcons({ className = "" }: { className?: string }) {
  const links = socialLinks.filter((s) => s.href);
  if (links.length === 0) return null;
  return (
    <ul className={`flex gap-2 ${className}`}>
      {links.map((s) => (
        <li key={s.name}>
          <a
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${s.name} : Grenier Communautaire`}
            className="grid size-9 place-items-center rounded-full bg-white/10 text-white transition hover:bg-brand"
          >
            <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
              {icons[s.name]}
            </svg>
          </a>
        </li>
      ))}
    </ul>
  );
}
