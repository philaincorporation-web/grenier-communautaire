// Contenu de la page « Inspiration » : galerie photo et vidéos des actions et descentes de terrain.
//
// Ajouter une photo : déposer le fichier dans /public/images/… puis ajouter une entrée à
// `galleryItems` (avec un `alt` qui décrit la scène). Ajouter une vidéo : déposer le .mp4 dans
// /public/videos/ (ou utiliser un identifiant YouTube) puis ajouter une entrée à `videos`.
// Respecter la dignité des personnes : pas de personnes en détresse, consentement des personnes filmées.

import { associationPhotos } from "@/lib/about-content";

export const galleryCategories = {
  terrain: "Descentes de terrain",
  actions: "Nos actions",
  visuels: "Visuels inspirants",
} as const;
export type GalleryCategory = keyof typeof galleryCategories;

export type GalleryItem = {
  id: string;
  src: string;
  alt: string;
  caption: string;
  category: GalleryCategory;
  /** Année ou date affichée sous la légende. */
  date?: string;
  /** Format d'origine, pour une mosaïque sans recadrage brutal. */
  shape?: "square" | "landscape" | "portrait";
};

export const banner = {
  src: "/images/banniere-relais.jpg",
  alt: "Le Relais des Hommes de Bien : « Donner autrement, partager durablement ». Grenier Communautaire — Faire du Bien.",
  width: 960,
  height: 240,
};

export const galleryItems: GalleryItem[] = [
  {
    id: "journee-2024",
    ...associationPhotos.journee,
    caption: "Journée « Faire du Bien » : nos bénévoles à la rencontre des habitants",
    category: "terrain",
    date: "2024",
    shape: "landscape",
  },
  {
    id: "citation-seconde-vie",
    src: "/images/inspiration/citation-seconde-vie.jpg",
    alt: "Citation : « Le véritable esprit de solidarité, c'est de donner une seconde vie aux objets et une nouvelle espérance aux Hommes. »",
    caption: "Donner une seconde vie aux objets, une nouvelle espérance aux Hommes",
    category: "visuels",
    shape: "square",
  },
  {
    id: "collecte-2025",
    ...associationPhotos.collecte,
    caption: "Collecte : tri des dons par les bénévoles",
    category: "actions",
    date: "2025",
    shape: "landscape",
  },
  {
    id: "journee-couverture",
    ...associationPhotos.couverture,
    caption: "Action de santé en plein air lors de la Journée « Faire du Bien »",
    category: "terrain",
    shape: "landscape",
  },
  {
    id: "citation-richesse",
    src: "/images/inspiration/citation-richesse.jpg",
    alt: "Citation : « Ce que tu considères comme un bien inutile peut devenir une richesse dans la vie d'un autre. »",
    caption: "Un bien inutile pour l'un, une richesse pour un autre",
    category: "visuels",
    shape: "square",
  },
  {
    id: "grenier-2026",
    ...associationPhotos.grenier,
    caption: "Chaque carton déposé au Grenier repart vers une famille",
    category: "actions",
    date: "2026",
    shape: "landscape",
  },
  {
    id: "operation-ruth",
    ...associationPhotos.ruth,
    caption: "Opération Ruth, aux côtés des aînés et des jeunes mères",
    category: "terrain",
    date: "2015",
    shape: "landscape",
  },
  {
    id: "carton",
    ...associationPhotos.carton,
    caption: "Vêtements, chaussures et jouets : des dons prêts à être redistribués",
    category: "actions",
    shape: "landscape",
  },
];

export type VideoItem = {
  id: string;
  title: string;
  description: string;
  category: GalleryCategory;
  date?: string;
  /** Fichier local (ex. "/videos/collecte-2025.mp4") … */
  src?: string;
  /** … ou vidéo YouTube (identifiant après « v= »). */
  youtubeId?: string;
  /** Image affichée avant la lecture. */
  poster?: string;
};

/** Aucune vidéo pour l'instant : la section affiche un message d'attente. */
export const videos: VideoItem[] = [];
