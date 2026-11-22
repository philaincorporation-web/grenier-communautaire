// Icône Lucide de chaque catégorie de produits : une seule source pour le site public
// (page « Faire un don ») et le tableau de bord (stocks). Pas d'emojis : leur rendu varie selon
// l'appareil et détonne avec le reste de l'interface.

import { Backpack, Bed, Package, Shirt, SoapDispenserDroplet, Wheat, type LucideIcon } from "lucide-react";

const icons: Record<string, LucideIcon> = {
  alimentation: Wheat,
  vetements: Shirt,
  education: Backpack,
  hygiene: SoapDispenserDroplet,
  literie: Bed,
};

/** « Éducation » → « education » : tolère les accents et la casse du nom saisi en base. */
const key = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

export function categoryIcon(category: string | null | undefined): LucideIcon {
  return (category && icons[key(category)]) || Package;
}
