import { BrandLoader } from "@/components/loading/BrandLoader";

/** Chargement d'une page du site public qui n'est pas encore prête (première visite d'une page dynamique). */
export default function SiteLoading() {
  return <BrandLoader />;
}
