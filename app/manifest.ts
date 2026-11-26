import type { MetadataRoute } from "next";

/** Manifeste de l'application installable (PWA). Servi à /manifest.webmanifest. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Grenier Communautaire — Faire du bien",
    short_name: "Grenier",
    description: "Suivez vos demandes, échangez avec l'équipe et recevez les réponses du Grenier Communautaire.",
    lang: "fr",
    dir: "ltr",
    // L'application s'ouvre sur l'espace adapté au compte (voir app/demarrer/route.ts).
    start_url: "/demarrer?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#b0124f",
    categories: ["social", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Mes demandes", url: "/mon-espace", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Notifications", url: "/mon-espace/notifications", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
