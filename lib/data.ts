// Types partagés + données de démonstration, utilisées quand DATABASE_URL n'est pas défini.
// Les données réelles viennent de lib/queries.ts.

export type Kpi = {
  label: string;
  value: number;
  /** Variation en % par rapport aux 30 jours précédents ; null si non calculable. */
  trend: number | null;
  icon: "gift" | "box" | "users" | "truck";
};

export type ActivityKind = "don" | "approval" | "distribution" | "member";
export type Activity = { label: string; when: string; kind: ActivityKind };
export type ImpactPoint = { label: string; value: number };
export type Depot = { id: string; name: string };

export const kpis: Kpi[] = [
  { label: "Dons reçus", value: 128, trend: 12, icon: "gift" },
  { label: "Produits en stock", value: 1540, trend: 8, icon: "box" },
  { label: "Demandes en attente", value: 24, trend: 5, icon: "users" },
  { label: "Distributions", value: 86, trend: 10, icon: "truck" },
];

export const recentActivity: Activity[] = [
  { label: "Nouveau don reçu", when: "Il y a 1 h", kind: "don" },
  { label: "Demande d'aide approuvée", when: "Il y a 2 h", kind: "approval" },
  { label: "Distribution effectuée", when: "Il y a 3 h", kind: "distribution" },
  { label: "Nouveau membre inscrit", when: "Il y a 4 h", kind: "member" },
];

export const impactSeries: ImpactPoint[] = [
  { label: "S1", value: 72 },
  { label: "S2", value: 88 },
  { label: "S3", value: 104 },
  { label: "S4", value: 140 },
];

export type StockStatus = "Disponible" | "Stock faible" | "Rupture";

export type StockItem = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  status: StockStatus;
};

export const depots: Depot[] = [
  { id: "demo-principal", name: "Dépôt principal" },
  { id: "demo-nord", name: "Relais Nord" },
  { id: "demo-sud", name: "Relais Sud" },
];

/** Seuil « stock faible » — règle métier provisoire à confirmer. */
export const LOW_STOCK_THRESHOLD = 100;

export function stockStatus(quantity: number): StockStatus {
  if (quantity <= 0) return "Rupture";
  return quantity < LOW_STOCK_THRESHOLD ? "Stock faible" : "Disponible";
}

export const stockItems: StockItem[] = [
  { id: "1", name: "Riz", category: "Alimentation", quantity: 250, unit: "kg", status: "Disponible" },
  { id: "2", name: "Huile", category: "Alimentation", quantity: 120, unit: "L", status: "Disponible" },
  { id: "3", name: "Vêtements", category: "Vêtements", quantity: 75, unit: "pièces", status: "Stock faible" },
  { id: "4", name: "Kits scolaires", category: "Éducation", quantity: 200, unit: "kits", status: "Disponible" },
  { id: "5", name: "Savon", category: "Hygiène", quantity: 40, unit: "pièces", status: "Stock faible" },
  { id: "6", name: "Lait en poudre", category: "Alimentation", quantity: 0, unit: "boîtes", status: "Rupture" },
  { id: "7", name: "Couvertures", category: "Literie", quantity: 64, unit: "pièces", status: "Stock faible" },
  { id: "8", name: "Cahiers", category: "Éducation", quantity: 310, unit: "pièces", status: "Disponible" },
];

export const adminSections = {
  dons: { title: "Dons", subtitle: "Suivi des dons reçus et de leur réception" },
  beneficiaires: { title: "Bénéficiaires", subtitle: "Personnes et familles accompagnées" },
  demandes: { title: "Demandes d'aide", subtitle: "Instruction et approbation des demandes" },
  relais: { title: "Relais", subtitle: "Relais des Hommes de Bien et bénévoles" },
  rapports: { title: "Rapports", subtitle: "Indicateurs et impact communautaire" },
  parametres: { title: "Paramètres", subtitle: "Organisation, dépôts, rôles et membres" },
} as const;

export type AdminSection = keyof typeof adminSections;
