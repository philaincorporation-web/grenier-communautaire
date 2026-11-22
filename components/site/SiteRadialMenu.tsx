"use client";

import { HandHeart, HandHelping, Heart, Mail } from "lucide-react";
import type { ReactNode } from "react";
import { RadialMenu, type RadialItem } from "@/components/site/RadialMenu";
import { quickActions } from "@/lib/site-content";

const icons: Record<(typeof quickActions)[number]["id"], ReactNode> = {
  don: <Heart className="size-5 fill-current" />,
  aide: <HandHelping className="size-5" />,
  benevole: <HandHeart className="size-5" />,
  contact: <Mail className="size-5" />,
};

const items: RadialItem[] = quickActions.map((a) => ({
  id: a.id,
  href: a.href,
  label: a.label,
  title: a.title,
  primary: a.primary,
  icon: icons[a.id],
}));

/** Menu radial flottant du site public : accès rapide aux 4 actions principales. */
export function SiteRadialMenu() {
  return <RadialMenu items={items} label="Actions rapides" />;
}
