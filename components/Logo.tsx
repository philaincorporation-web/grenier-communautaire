import Image from "next/image";

type LogoProps = {
  /** « dark » : logo sombre et rose, pour les fonds clairs ; « light » : logo blanc, pour les fonds sombres. */
  variant?: "dark" | "light";
  size?: "sm" | "md" | "lg";
  /** À activer pour le logo visible dès l'arrivée sur la page (en-tête) : chargement immédiat. */
  priority?: boolean;
};

/** Hauteur d'affichage (px). La largeur suit le rapport du fichier. */
const heights = { sm: 44, md: 56, lg: 96 } as const;

// Fichiers : /public/images/logo (extraits de la présentation de l'association).
const files = {
  dark: { src: "/images/logo/logo-sombre.png", width: 358, height: 97 },
  light: { src: "/images/logo/logo-clair.png", width: 1149, height: 288 },
} as const;

/** Logo officiel « Grenier Communautaire — Faire du Bien · Le relais des hommes de bien ». */
export function Logo({ variant = "dark", size = "md", priority = false }: LogoProps) {
  const file = files[variant];
  const h = heights[size];
  return (
    <Image
      src={file.src}
      alt="Grenier Communautaire, Faire du Bien : le relais des hommes de bien"
      width={Math.round((h * file.width) / file.height)}
      height={h}
      priority={priority}
      // Logos : petits fichiers PNG à transparence, servis tels quels. Passés par l'optimiseur, ils
      // sortaient avec un rapport légèrement différent (1 px d'écart) et Next signalait une erreur.
      unoptimized
      className="block"
      style={{ width: "auto", height: h }}
    />
  );
}
