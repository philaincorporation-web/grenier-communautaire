// Contenu éditorial du site public (phase 1 : statique).
// Les chiffres d'impact viennent de lib/public-stats.ts (base de données, avec repli démo).
// Événements et actualités pourront passer en base ou en MDX plus tard sans toucher aux pages.
//
// Images : déposez les photos dans /public/images/… et renseignez `image` ; tant qu'il est
// absent, un visuel de remplacement aux couleurs de la charte est affiché.

/** Photos du site (fichiers dans /public/images). `alt` décrit la scène pour l'accessibilité. */
export const images = {
  sourires: { src: "/images/sourires-coeur.png", alt: "Bénévoles du Relais formant des cœurs avec leurs mains" },
  equipe: { src: "/images/equipe-echange.png", alt: "Bénévoles du Relais des Hommes de Bien en pleine discussion" },
  mains: { src: "/images/mains-unies.jpg", alt: "Mains de personnes réunies au centre d'un cercle de solidarité" },
  colis: { src: "/images/benevoles-colis.png", alt: "Bénévoles préparant des colis alimentaires" },
  panier: { src: "/images/panier-solidaire.png", alt: "Colis solidaire de produits essentiels du Grenier Communautaire" },
  remise: { src: "/images/remise-colis.png", alt: "Remise d'un colis alimentaire entre deux personnes" },
  distribution: { src: "/images/distribution-familles.png", alt: "Bénévoles distribuant des vivres à une famille" },
} as const;

export type NavLink = { href: string; label: string };

export const mainNav: (NavLink & { children?: NavLink[] })[] = [
  { href: "/", label: "Accueil" },
  { href: "/a-propos", label: "À propos" },
  {
    href: "/nos-actions",
    label: "Nos actions",
    children: [
      { href: "/nos-actions/le-grenier", label: "Le Grenier" },
      { href: "/nos-actions/grenier-shop", label: "Grenier Shop" },
      { href: "/nos-actions/plateforme", label: "Plateforme numérique" },
      { href: "/nos-actions/relais", label: "Relais des Hommes de Bien" },
    ],
  },
  { href: "/evenements", label: "Événements" },
  { href: "/benevolat", label: "Bénévolat" },
  { href: "/actualites", label: "Actualités" },
  { href: "/contact", label: "Contact" },
];

/** Routes du site vitrine, accessibles sans connexion (utilisé par proxy.ts). */
export const publicRoutes = [
  "/",
  "/a-propos",
  "/nos-actions",
  "/faire-un-don",
  "/demander-une-aide",
  "/benevolat",
  "/evenements",
  "/actualites",
  "/contact",
  "/faq",
  "/mentions-legales",
  "/confidentialite",
];

/**
 * Actions rapides du menu radial flottant (components/site/SiteRadialMenu.tsx).
 * Le premier élément est le plus important : il s'affiche en haut de l'éventail, en couleur pleine.
 * `label` est court (affiché sous l'icône) ; `title` est le libellé complet (lecteurs d'écran).
 */
export const quickActions = [
  { id: "don", href: "/faire-un-don", label: "Donner", title: "Faire un don", primary: true },
  { id: "aide", href: "/demander-une-aide", label: "Aide", title: "Demander une aide", primary: false },
  { id: "benevole", href: "/benevolat", label: "Bénévolat", title: "Devenir bénévole", primary: false },
  { id: "contact", href: "/contact", label: "Contact", title: "Nous contacter", primary: false },
] as const;

// ---------------------------------------------------------------------------
// Carrousel d'accueil (components/site/HeroSlider.tsx)

export type HeroSlide = {
  id: string;
  image: { src: string; alt: string };
  /** Cadrage de la photo (classe object-position), pour garder les visages hors du texte. */
  focus?: string;
  eyebrow: string;
  title: string;
  text: string;
  primary: { href: string; label: string; icon?: "heart" };
  secondary?: { href: string; label: string };
  /** Ligne d'information sous le texte (ex. lieu et horaires). */
  meta?: string;
  /** Carte d'aperçu de la diapositive suivante. */
  card: { kicker: string; title: string };
};

export const heroSlides: HeroSlide[] = [
  {
    id: "mission",
    image: images.sourires,
    focus: "object-[68%_center]",
    eyebrow: "La solidarité au cœur de nos communautés",
    title: "Faire du bien, chaque jour",
    text: "Collecter, trier et redistribuer des biens utiles pour construire une société plus solidaire.",
    primary: { href: "/faire-un-don", label: "Faire un don", icon: "heart" },
    secondary: { href: "/demander-une-aide", label: "Demander une aide" },
    card: { kicker: "Notre mission", title: "Faire du bien" },
  },
  {
    id: "grenier",
    image: images.colis,
    focus: "object-[62%_center]",
    eyebrow: "Nos actions",
    title: "Le Grenier",
    text: "Chaque don est réceptionné, trié par catégorie puis stocké avant d'être redistribué aux familles.",
    primary: { href: "/nos-actions/le-grenier", label: "Découvrir" },
    secondary: { href: "/faire-un-don", label: "Déposer un don" },
    card: { kicker: "Collecte & tri", title: "Le Grenier" },
  },
  {
    id: "aide",
    image: images.distribution,
    focus: "object-[72%_center]",
    eyebrow: "Vous n'êtes pas seul",
    title: "Une aide près de chez vous",
    text: "Déposez votre demande : l'équipe l'étudie et vous recontacte rapidement, en toute confidentialité.",
    primary: { href: "/demander-une-aide", label: "Demander une aide" },
    secondary: { href: "/nos-actions/plateforme", label: "Comment ça marche" },
    card: { kicker: "Accompagnement", title: "Demander une aide" },
  },
  {
    id: "relais",
    image: images.equipe,
    focus: "object-[center_30%]",
    eyebrow: "Relais des Hommes de Bien",
    title: "Des bénévoles engagés",
    text: "Quelques heures par mois suffisent pour changer le quotidien d'une famille de votre quartier.",
    primary: { href: "/benevolat", label: "Devenir bénévole" },
    secondary: { href: "/nos-actions/relais", label: "Nos relais" },
    card: { kicker: "Bénévolat", title: "Nos relais" },
  },
  {
    id: "agenda",
    image: images.mains,
    focus: "object-[center_45%]",
    eyebrow: "Agenda",
    title: "Rejoignez nos collectes",
    text: "Collectes, distributions et ateliers : venez nous retrouver et agir avec nous près de chez vous.",
    primary: { href: "/evenements", label: "Voir les événements" },
    secondary: { href: "/contact", label: "Nous contacter" },
    card: { kicker: "Événements", title: "Collectes & distributions" },
  },
];

export const contactInfo = {
  // E-mail fourni par l'association (celui de la présentation PDF n'est volontairement pas utilisé).
  email: "greniercommunautaire984@gmail.com",
  // Numéro tel qu'indiqué dans la présentation. TODO : confirmer le format international (+241 …).
  phone: "077 73 54 21",
  // TODO : adresse précise et horaires réels du premier Grenier (pilote prévu en 2027, Grand Libreville).
  address: "Grand Libreville, Gabon",
  hours: "Lun – Sam · 8 h 00 – 17 h 00",
};

// ---------------------------------------------------------------------------
// Nos actions (les 4 piliers)

export type ActionIcon = "house" | "shop" | "laptop" | "users";

export type Action = {
  slug: string;
  title: string;
  short: string;
  description: string;
  icon: ActionIcon;
  image?: string;
  highlights: string[];
  steps: { title: string; text: string }[];
  cta: NavLink;
};

export const actions: Action[] = [
  {
    slug: "le-grenier",
    title: "Le Grenier",
    short: "Un espace de collecte, de tri et de stockage des dons.",
    description:
      "Le Grenier est un espace physique où les biens dont on n'a plus besoin sont collectés, contrôlés selon leur état, triés puis stockés, avant d'être redonnés à celles et ceux qui en ont besoin.",
    icon: "house",
    image: images.colis.src,
    highlights: [
      "Réception et enregistrement de chaque don",
      "Tri par catégorie : alimentation, vêtements, éducation, hygiène, literie",
      "Stockage tracé dans plusieurs dépôts et relais",
      "Aucun stock négatif : chaque sortie est contrôlée",
    ],
    steps: [
      { title: "Collecte", text: "Vous déposez vos dons dans un dépôt ou lors d'une collecte." },
      { title: "Réception", text: "Le don est enregistré et chaque article est quantifié." },
      { title: "Tri & stockage", text: "Les biens sont classés par catégorie et rangés au dépôt." },
      { title: "Redistribution", text: "Ils rejoignent les distributions aux familles accompagnées." },
    ],
    cta: { href: "/faire-un-don", label: "Déposer un don" },
  },
  {
    slug: "grenier-shop",
    title: "Grenier Shop",
    short: "Une boutique à prix solidaires, dont les revenus financent la gratuité.",
    description:
      "Le Grenier Shop propose des biens remis en état à prix solidaires. 100 % des revenus du Shop sont réinvestis dans l'action sociale : ils financent la gratuité pour les plus vulnérables.",
    icon: "shop",
    image: images.panier.src,
    highlights: [
      "Vêtements, livres, petit équipement à prix doux",
      "Des articles triés et contrôlés par nos bénévoles",
      "Une seconde vie pour les objets, moins de déchets",
      "Chaque achat soutient les actions solidaires",
    ],
    steps: [
      { title: "Don d'objets", text: "Les objets en bon état sont orientés vers la boutique." },
      { title: "Remise en état", text: "Nos bénévoles les vérifient et les préparent." },
      { title: "Vente solidaire", text: "Ils sont proposés à prix doux à tous." },
      { title: "Réinvestissement", text: "Les recettes financent les distributions." },
    ],
    cta: { href: "/contact", label: "Nous rendre visite" },
  },
  {
    slug: "plateforme",
    title: "Plateforme numérique",
    short: "Une application pour donner, demander une aide et suivre l'impact.",
    description:
      "Une application web et mobile qui relie donateurs, bénéficiaires, entreprises et bénévoles : faire un don en quelques clics, demander une aide ou un accompagnement, trouver le Grenier le plus proche et suivre l'impact de chaque don.",
    icon: "laptop",
    image: images.remise.src,
    highlights: [
      "Suivi des dons et des stocks par dépôt",
      "Instruction des demandes d'aide par l'équipe",
      "Distributions tracées de bout en bout",
      "Indicateurs d'impact partagés avec nos partenaires",
    ],
    steps: [
      { title: "Demande", text: "Une famille dépose une demande d'aide." },
      { title: "Instruction", text: "L'équipe étudie la demande et la valide." },
      { title: "Préparation", text: "Les articles sont réservés dans le dépôt le plus proche." },
      { title: "Distribution", text: "La famille reçoit son colis ; tout est tracé." },
    ],
    cta: { href: "/demander-une-aide", label: "Demander une aide" },
  },
  {
    slug: "relais",
    title: "Relais des Hommes de Bien",
    short: "Des bénévoles « hommes de bien » qui repèrent les besoins et accompagnent.",
    description:
      "Les Relais des Hommes de Bien sont des bénévoles qui repèrent les besoins au plus près des quartiers et accompagnent les familles. Ils sont les ambassadeurs du mouvement sur le terrain.",
    icon: "users",
    image: images.equipe.src,
    highlights: [
      "Des relais de proximité dans plusieurs quartiers",
      "Des missions ponctuelles ou régulières",
      "Formation et accompagnement des bénévoles",
      "Une communauté soudée autour de valeurs communes",
    ],
    steps: [
      { title: "Inscription", text: "Vous proposez votre aide via le formulaire bénévole." },
      { title: "Rencontre", text: "Un responsable de relais vous présente les missions." },
      { title: "Mission", text: "Collecte, tri, distribution ou accompagnement." },
      { title: "Impact", text: "Vous voyez concrètement le résultat de votre engagement." },
    ],
    cta: { href: "/benevolat", label: "Devenir bénévole" },
  },
];

export function getAction(slug: string) {
  return actions.find((a) => a.slug === slug);
}

// ---------------------------------------------------------------------------
// Dons en nature — catégories alignées sur product_categories (voir lib/data.ts).

export const donationCategories = [
  { id: "alimentation", label: "Alimentation", examples: "Riz, huile, conserves, lait en poudre (non périmés)" },
  { id: "vetements", label: "Vêtements", examples: "Vêtements propres et en bon état, chaussures" },
  { id: "education", label: "Éducation", examples: "Cahiers, stylos, sacs, manuels scolaires" },
  { id: "hygiene", label: "Hygiène", examples: "Savon, dentifrice, protections, produits bébé" },
  { id: "literie", label: "Literie", examples: "Couvertures, draps, nattes, moustiquaires" },
] as const;

export const donationRefused = [
  "Produits alimentaires périmés ou entamés",
  "Vêtements abîmés, sales ou troués",
  "Médicaments",
  "Objets dangereux ou électriques défectueux",
];

// ---------------------------------------------------------------------------
// Demande d'aide — étapes calquées sur l'enum aid_request_status.

export const aidSteps = [
  { status: "submitted", title: "Demande déposée", text: "Vous remplissez le formulaire ou venez au dépôt le plus proche." },
  { status: "under_review", title: "Étude du dossier", text: "Un membre de l'équipe vous contacte et étudie votre situation." },
  { status: "approved", title: "Validation", text: "La demande est approuvée et les articles sont réservés." },
  { status: "fulfilled", title: "Distribution", text: "Vous recevez votre colis lors d'une distribution." },
] as const;

export const aidNeeds = ["Alimentation", "Vêtements", "Fournitures scolaires", "Hygiène", "Literie", "Autre"];

// ---------------------------------------------------------------------------
// Bénévolat

export const volunteerRoles = [
  { id: "collecte", label: "Collecte", text: "Récupérer les dons chez les particuliers et partenaires." },
  { id: "tri", label: "Tri & stockage", text: "Contrôler, trier et ranger les dons au dépôt." },
  { id: "distribution", label: "Distribution", text: "Préparer les colis et accueillir les familles." },
  { id: "boutique", label: "Grenier Shop", text: "Tenir la boutique solidaire et conseiller les clients." },
  { id: "numerique", label: "Numérique", text: "Saisie, communication, photos, réseaux sociaux." },
];

export const contactSubjects = [
  { value: "don", label: "Faire un don" },
  { value: "benevolat", label: "Bénévolat" },
  { value: "aide", label: "Demande d'aide" },
  { value: "partenariat", label: "Partenariat" },
  { value: "autre", label: "Autre" },
];

// ---------------------------------------------------------------------------
// Témoignages

export type Testimonial = { quote: string; name: string; role: string };

export const testimonials: Testimonial[] = [
  {
    quote:
      "Quand j'ai perdu mon emploi, le Grenier nous a aidés à tenir. Aujourd'hui je suis bénévole à mon tour pour rendre ce que j'ai reçu.",
    name: "Aminata K.",
    role: "Bénéficiaire devenue bénévole",
  },
  {
    quote:
      "Je sais exactement où vont mes dons. Le suivi est sérieux et l'équipe est toujours disponible pour répondre.",
    name: "Jean-Marc D.",
    role: "Donateur",
  },
  {
    quote:
      "Rejoindre un relais, c'est retrouver du sens et une vraie équipe. Chaque distribution est un moment fort.",
    name: "Fatou S.",
    role: "Bénévole, Relais Nord",
  },
];

// ---------------------------------------------------------------------------
// Événements

export type EventItem = {
  slug: string;
  title: string;
  date: string; // ISO AAAA-MM-JJ
  start: string;
  end: string;
  place: string;
  kind: "Collecte" | "Distribution" | "Atelier" | "Rencontre";
  summary: string;
  image?: string;
};

// TODO : remplacer par le calendrier réel.
export const events: EventItem[] = [
  {
    slug: "grande-collecte-rentree",
    image: images.mains.src,
    title: "Grande collecte de rentrée scolaire",
    date: "2026-12-05",
    start: "09:00",
    end: "16:00",
    place: "Dépôt principal",
    kind: "Collecte",
    summary: "Fournitures, sacs et manuels pour équiper les enfants des familles accompagnées.",
  },
  {
    slug: "distribution-fin-annee",
    image: images.distribution.src,
    title: "Distribution solidaire de fin d'année",
    date: "2026-12-19",
    start: "08:30",
    end: "13:00",
    place: "Relais Nord",
    kind: "Distribution",
    summary: "Colis alimentaires et couvertures pour les familles dont la demande a été validée.",
  },
  {
    slug: "accueil-nouveaux-benevoles",
    image: images.equipe.src,
    title: "Matinée d'accueil des nouveaux bénévoles",
    date: "2027-01-10",
    start: "09:30",
    end: "12:00",
    place: "Relais Sud",
    kind: "Rencontre",
    summary: "Découvrir l'association, les missions et rencontrer les responsables de relais.",
  },
  {
    slug: "atelier-tri-vetements",
    image: images.colis.src,
    title: "Atelier tri & valorisation des vêtements",
    date: "2027-01-24",
    start: "14:00",
    end: "17:00",
    place: "Grenier Shop",
    kind: "Atelier",
    summary: "Apprendre à trier, réparer et préparer les vêtements pour la boutique solidaire.",
  },
];

export function getEvent(slug: string) {
  return events.find((e) => e.slug === slug);
}

/** Action proposée selon le type d'événement (page de détail et carrousel). */
export function eventCta(kind: EventItem["kind"]): { href: string; label: string } {
  if (kind === "Collecte") return { href: "/faire-un-don", label: "Préparer mon don" };
  if (kind === "Distribution") return { href: "/demander-une-aide", label: "Demander une aide" };
  return { href: "/benevolat#candidature", label: "Je participe" };
}

/** Cadrage de chaque photo pour le carrousel (garde les visages hors de la colonne de texte). */
const imageFocus: Record<string, string> = {
  [images.sourires.src]: "object-[68%_center]",
  [images.colis.src]: "object-[62%_center]",
  [images.distribution.src]: "object-[72%_center]",
  [images.equipe.src]: "object-[center_30%]",
  [images.mains.src]: "object-[center_45%]",
};

/** Photo + cadrage d'un contenu (événement, article) pour le carrousel. */
function slidePhoto(src: string | undefined, fallbackAlt: string) {
  const photo = Object.values(images).find((i) => i.src === src);
  return {
    image: { src: src ?? images.mains.src, alt: photo?.alt ?? fallbackAlt },
    focus: src ? imageFocus[src] : undefined,
  };
}

/** Diapositives du carrousel de la page Événements : un événement par diapositive, par date. */
export function eventHeroSlides(): HeroSlide[] {
  return [...events]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => {
      return {
        id: e.slug,
        ...slidePhoto(e.image, e.title),
        eyebrow: `${e.kind} · ${formatDate(e.date)}`,
        title: e.title,
        text: e.summary,
        meta: `${e.place} · ${e.start} – ${e.end}`,
        primary: { href: `/evenements/${e.slug}`, label: "Voir l'événement" },
        secondary: eventCta(e.kind),
        card: { kicker: `${dayOf(e.date)} ${monthOf(e.date)}`, title: e.title },
      };
    });
}

// ---------------------------------------------------------------------------
// Actualités

export type Article = {
  slug: string;
  title: string;
  date: string;
  category: string;
  excerpt: string;
  body: string[];
  image?: string;
};

export const articles: Article[] = [
  {
    slug: "bilan-collecte-automne",
    image: images.colis.src,
    title: "Collecte d'automne : merci pour votre mobilisation",
    date: "2026-11-08",
    category: "Collecte",
    excerpt: "Plus de 2 tonnes de dons en nature ont été réceptionnées et triées par nos relais.",
    body: [
      "La collecte d'automne a mobilisé donateurs, commerçants et bénévoles pendant trois semaines.",
      "Chaque don a été réceptionné, enregistré puis trié par catégorie dans nos dépôts avant de rejoindre les prochaines distributions.",
      "Merci à toutes celles et ceux qui ont rendu cette collecte possible.",
    ],
  },
  {
    slug: "comment-aider-son-quartier",
    image: images.mains.src,
    title: "5 façons simples d'aider votre quartier",
    date: "2026-10-21",
    category: "Conseils",
    excerpt: "Donner, partager, signaler un besoin : chacun peut agir à son échelle.",
    body: [
      "Faire un don en nature dans un dépôt, rejoindre un relais quelques heures par mois, parler de l'association autour de vous…",
      "Chaque geste compte et renforce la chaîne de solidarité locale.",
    ],
  },
  {
    slug: "ouverture-relais-sud",
    image: images.equipe.src,
    title: "Un nouveau relais ouvre ses portes au Sud",
    date: "2026-09-30",
    category: "Vie de l'association",
    excerpt: "Le Relais Sud rapproche la collecte et les distributions des familles du quartier.",
    body: [
      "Ce nouveau relais dispose d'un espace de stockage et d'un point d'accueil pour les familles.",
      "Il est animé par une équipe de bénévoles du quartier.",
    ],
  },
];

export function getArticle(slug: string) {
  return articles.find((a) => a.slug === slug);
}

/** Action proposée en regard d'un article, selon sa catégorie. */
export function articleCta(category: string): { href: string; label: string } {
  if (category === "Collecte") return { href: "/faire-un-don", label: "Faire un don" };
  if (category === "Conseils") return { href: "/benevolat", label: "Devenir bénévole" };
  if (category === "Vie de l'association") return { href: "/nos-actions/relais", label: "Découvrir les relais" };
  return { href: "/nos-actions", label: "Nos actions" };
}

/** Diapositives du carrousel de la page Actualités : un article par diapositive, du plus récent au plus ancien. */
export function articleHeroSlides(): HeroSlide[] {
  return [...articles]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((a) => ({
      id: a.slug,
      ...slidePhoto(a.image, a.title),
      eyebrow: `${a.category} · ${formatDate(a.date)}`,
      title: a.title,
      text: a.excerpt,
      primary: { href: `/actualites/${a.slug}`, label: "Lire l'article" },
      secondary: articleCta(a.category),
      card: { kicker: a.category, title: a.title },
    }));
}

// ---------------------------------------------------------------------------
// FAQ

export const faq = [
  {
    q: "Quels dons acceptez-vous ?",
    a: "Les dons en nature en bon état : alimentation non périmée, vêtements propres, fournitures scolaires, produits d'hygiène et literie.",
  },
  {
    q: "Acceptez-vous les dons financiers ?",
    a: "Les dons financiers en ligne ne sont pas encore ouverts. Contactez-nous pour soutenir l'association autrement.",
  },
  {
    q: "Qui peut demander une aide ?",
    a: "Toute personne ou famille en difficulté. Chaque demande est étudiée par l'équipe avant validation.",
  },
  {
    q: "Comment devenir bénévole ?",
    a: "Remplissez le formulaire de la page Bénévolat : un responsable de relais vous recontactera.",
  },
  {
    q: "Comment mes données sont-elles protégées ?",
    a: "Les informations des bénéficiaires sont réservées à l'équipe habilitée et ne sont jamais partagées. Voir la politique de confidentialité.",
  },
];

// ---------------------------------------------------------------------------
// Utilitaires d'affichage

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const dayFmt = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", timeZone: "UTC" });
const monthFmt = new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: "UTC" });

export const formatDate = (iso: string) => dateFmt.format(new Date(iso));
export const dayOf = (iso: string) => dayFmt.format(new Date(iso));
export const monthOf = (iso: string) => monthFmt.format(new Date(iso)).replace(".", "");
