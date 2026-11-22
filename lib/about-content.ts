// Contenu de la page « À propos », tiré de la présentation de l'association
// (Presentation_GrenierSITEWZ.pdf).
//
// Confidentialité : tout ce qui relève de la partie financière du document (modèle économique,
// prévisions, bilan, trésorerie, montants d'investissement, chiffre d'affaires visé) est
// volontairement ABSENT de ce site public. Ne rien y ajouter de ce type sans accord explicite.

import {
  Backpack,
  Baby,
  Eye,
  Gift,
  HandHeart,
  Handshake,
  HeartHandshake,
  Leaf,
  Recycle,
  Scale,
  ShoppingBag,
  Smartphone,
  Sofa,
  Sprout,
  Shirt,
  Store,
  Trash,
  Users,
  Utensils,
  Warehouse,
  Wheat,
  Wrench,
  ListChecks,
  Truck,
  PiggyBank,
  type LucideIcon,
} from "lucide-react";

const photo = (file: string, alt: string) => ({ src: `/images/association/${file}`, alt });

/** Photos réelles de l'association (fichiers dans /public/images/association). */
export const associationPhotos = {
  couverture: photo(
    "journee-faire-du-bien-couverture.jpg",
    "Journée « Faire du Bien » : bénévoles et habitants réunis lors d'une action de santé en plein air",
  ),
  ruth: photo("operation-ruth-2015.jpg", "Deux femmes souriantes lors de l'Opération Ruth, en 2015"),
  journee: photo(
    "journee-faire-du-bien-2024.jpg",
    "Journée « Faire du Bien » 2024 : bénévoles en gilets orange et jaune auprès des habitants, sous des tentes",
  ),
  collecte: photo(
    "collecte-2025.jpg",
    "Collecte : bénévoles en gilets jaunes triant des dons dans des sacs verts et des cartons",
  ),
  grenier: photo("grenier-2026.jpg", "Des mains déposent un carton de dons contenant un ourson en peluche"),
  carton: photo(
    "carton-grenier.jpg",
    "Carton de dons « Grenier Communautaire » rempli de vêtements, de chaussures et d'un ourson en peluche",
  ),
};

// ---------------------------------------------------------------------------
// 01 · Notre histoire

export const milestones = [
  {
    year: "2015",
    title: "Opération Ruth",
    text: "Aux côtés des aînés précaires et des jeunes filles mères.",
    image: associationPhotos.ruth,
  },
  {
    year: "2024",
    title: "Journée « Faire du Bien »",
    text: "Citoyens, associations, entreprises et institutions se mobilisent.",
    image: associationPhotos.journee,
  },
  {
    year: "2025",
    title: "Penser l'après",
    text: "Pourquoi limiter la solidarité à une seule journée ?",
    image: associationPhotos.collecte,
  },
  {
    year: "2026",
    title: "Grenier Communautaire",
    text: "La solidarité devient permanente : 365 jours par an.",
    image: associationPhotos.grenier,
    highlight: true,
  },
];

export const phases = [
  { label: "Phase 1 · 2015 – 2026", text: "11 ans pour installer la vision : prouver le besoin, convaincre, fédérer." },
  { label: "Phase 2 · dès 2026", text: "Le Grenier Communautaire : la solidarité devient permanente." },
];

// ---------------------------------------------------------------------------
// 02 · Le problème

// TODO : sourcer ces chiffres avant mise en ligne. Le document cite la Banque mondiale (Gabon 2025)
// pour la pauvreté ; les deux autres chiffres n'ont pas de source indiquée, et le document précise
// lui-même « chiffres à vérifier et mettre à jour avant diffusion ».
export const problemStats: { icon: LucideIcon; value: string; text: string }[] = [
  { icon: Users, value: "34,6 %", text: "des Gabonais vivent sous le seuil de pauvreté" },
  { icon: Trash, value: "600 à 800 t", text: "de déchets collectés chaque jour dans le Grand Libreville" },
  { icon: Utensils, value: "90 kg", text: "de nourriture gaspillée par personne et par an au Gabon" },
];

export const paradox =
  "Des familles manquent de l'essentiel pendant que des biens encore utiles sont jetés.";
export const stake =
  "Agir en amont, en redistribuant les ressources disponibles, pour rompre le cercle de la pauvreté.";

// ---------------------------------------------------------------------------
// 03 · Qu'est-ce que le Grenier Communautaire ?

export const definition =
  "Un « grenier » solidaire : un lieu où les biens dont on n'a plus besoin sont collectés, triés, puis redonnés à ceux qui en ont besoin.";

export const components: { icon: LucideIcon; title: string; text: string; href: string }[] = [
  { icon: Warehouse, title: "Le Grenier", text: "Un espace physique de collecte, de tri et de stockage des dons.", href: "/nos-actions/le-grenier" },
  { icon: Store, title: "Le Grenier Shop", text: "Une boutique à prix solidaires, dont les revenus financent la gratuité.", href: "/nos-actions/grenier-shop" },
  { icon: Smartphone, title: "La plateforme", text: "Une application pour donner, demander une aide et suivre l'impact.", href: "/nos-actions/plateforme" },
  { icon: Handshake, title: "Les Relais", text: "Des bénévoles « hommes de bien » qui repèrent les besoins et accompagnent.", href: "/nos-actions/relais" },
];

export const keyFigures = [
  { value: "365 jours", text: "de solidarité par an" },
  { value: "Gratuit", text: "ou à prix solidaire, selon les besoins" },
];

// ---------------------------------------------------------------------------
// 04 · Vision, mission, valeurs

export const vision = "Des communautés plus solidaires, plus résilientes et plus durables, où personne n'est laissé de côté.";
export const mission =
  "Relier les ressources disponibles aux besoins réels : collecter, trier et redistribuer les biens utiles, gratuitement ou à prix solidaire.";

export const values: { icon: LucideIcon; title: string }[] = [
  { icon: HandHeart, title: "Solidarité" },
  { icon: Eye, title: "Transparence" },
  { icon: Scale, title: "Responsabilité" },
  { icon: Leaf, title: "Durabilité" },
];

// ---------------------------------------------------------------------------
// 05 · Notre action

export const gestures: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Gift, title: "Collecter", text: "Auprès des particuliers, entreprises et institutions." },
  { icon: ListChecks, title: "Trier", text: "Contrôler chaque bien et l'orienter selon son état." },
  { icon: Wrench, title: "Réemployer", text: "Remettre en état pour offrir une seconde vie." },
  { icon: Truck, title: "Redistribuer", text: "Gratuitement aux plus vulnérables ou à prix solidaire." },
  { icon: Recycle, title: "Valoriser", text: "Recycler ce qui ne peut plus être réutilisé." },
  { icon: PiggyBank, title: "Réinvestir", text: "100 % des revenus du Shop vont à l'action sociale." },
];

export const domains: { icon: LucideIcon; label: string }[] = [
  { icon: Wheat, label: "Alimentation" },
  { icon: Shirt, label: "Vêtements et chaussures" },
  { icon: Sofa, label: "Mobilier et équipements" },
  { icon: Backpack, label: "Éducation" },
  { icon: Baby, label: "Petite enfance" },
  { icon: Sprout, label: "Insertion et autonomie" },
  { icon: Leaf, label: "Environnement" },
];

// ---------------------------------------------------------------------------
// Du Gabon à l'Afrique (calendrier, sans aucun chiffre financier)

export const roadmap = [
  { when: "2027", text: "Grand Libreville : le Grenier pilote" },
  { when: "2028 – 2029", text: "3 territoires au Gabon" },
  { when: "2030 – 2031", text: "Réseau national : 9 provinces" },
  { when: "Dès 2032", text: "Premiers pays d'Afrique centrale" },
];

// ---------------------------------------------------------------------------
// Rejoignez le mouvement

export const waysToJoin: { icon: LucideIcon; title: string; text: string; href: string; cta: string }[] = [
  { icon: Gift, title: "Donner", text: "Des biens, du matériel ou des ressources.", href: "/faire-un-don", cta: "Faire un don" },
  { icon: Handshake, title: "S'associer", text: "Comme entreprise partenaire ou via la RSE.", href: "/contact", cta: "Devenir partenaire" },
  { icon: HeartHandshake, title: "S'engager", text: "Comme bénévole, Relais des Hommes de Bien.", href: "/benevolat", cta: "Devenir bénévole" },
  { icon: ShoppingBag, title: "Financer", text: "Le lancement et le développement du pilote.", href: "/contact", cta: "Nous contacter" },
];
