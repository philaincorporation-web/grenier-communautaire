/**
 * Jeu de données de démonstration. Les soldes de stock ne sont jamais saisis : ils découlent
 * des mouvements validés (posted). À exécuter dans une transaction (voir scripts/seed.ts).
 */
import { eq, inArray } from "drizzle-orm";
import type { Db } from "./index";
import * as s from "./schema";

export const ORG_SLUG = "grenier-communautaire";

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
const hoursAgo = (n: number) => new Date(Date.now() - n * 3_600_000);
const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const pad = (n: number) => String(n).padStart(4, "0");

/** Retourne false si l'organisation existait déjà (rien n'est écrit). */
export async function seedDemo(tx: Db): Promise<boolean> {
  const existing = await tx.select({ id: s.organizations.id }).from(s.organizations).where(eq(s.organizations.slug, ORG_SLUG));
  if (existing.length) {
    return false;
  }

  // --- Organisation, utilisateurs, adhésions -----------------------------------------
  const [org] = await tx
    .insert(s.organizations)
    .values({ name: "Grenier Communautaire", slug: ORG_SLUG, email: "contact@example.org" })
    .returning({ id: s.organizations.id });
  const organizationId = org.id;

  const people = [
    { email: "awa.diallo@example.org", fullName: "Awa Diallo", role: "manager" as const, joinedAt: daysAgo(30) },
    { email: "koffi.mensah@example.org", fullName: "Koffi Mensah", role: "member" as const, joinedAt: hoursAgo(4) },
  ];
  await tx
    .insert(s.users)
    .values(people.map(({ email, fullName }) => ({ email, fullName })))
    .onConflictDoNothing({ target: s.users.email });
  const userRows = await tx
    .select({ id: s.users.id, email: s.users.email })
    .from(s.users)
    .where(inArray(s.users.email, people.map((p) => p.email)));
  const userId = (email: string) => userRows.find((u) => u.email === email)!.id;

  const memberRows = await tx
    .insert(s.memberships)
    .values(people.map((p) => ({ organizationId, userId: userId(p.email), role: p.role, joinedAt: p.joinedAt })))
    .returning({ id: s.memberships.id, userId: s.memberships.userId });
  // Auteur des opérations de démonstration : le premier membre de la liste.
  const actor = memberRows.find((m) => m.userId === userId(people[0].email))!.id;

  // --- Dépôts, catégories, produits ---------------------------------------------------
  const [principal, nord] = await tx
    .insert(s.warehouses)
    .values([
      { organizationId, name: "Dépôt principal", code: "DEP-01", managerMembershipId: actor },
      { organizationId, name: "Relais Nord", code: "REL-N" },
      { organizationId, name: "Relais Sud", code: "REL-S" },
    ])
    .returning({ id: s.warehouses.id });

  const categoryNames = ["Alimentation", "Vêtements", "Éducation", "Hygiène", "Literie"];
  const categories = await tx
    .insert(s.productCategories)
    .values(categoryNames.map((name) => ({ organizationId, name })))
    .returning({ id: s.productCategories.id, name: s.productCategories.name });
  const cat = (name: string) => categories.find((c) => c.name === name)!.id;

  const productDefs = [
    { sku: "ALI-RIZ", name: "Riz", unit: "kg", category: "Alimentation", isPerishable: true },
    { sku: "ALI-HUI", name: "Huile", unit: "L", category: "Alimentation", isPerishable: true },
    { sku: "ALI-LAI", name: "Lait en poudre", unit: "boîtes", category: "Alimentation", isPerishable: true },
    { sku: "VET-DIV", name: "Vêtements", unit: "pièces", category: "Vêtements", isPerishable: false },
    { sku: "EDU-KIT", name: "Kits scolaires", unit: "kits", category: "Éducation", isPerishable: false },
    { sku: "EDU-CAH", name: "Cahiers", unit: "pièces", category: "Éducation", isPerishable: false },
    { sku: "HYG-SAV", name: "Savon", unit: "pièces", category: "Hygiène", isPerishable: false },
    { sku: "LIT-COU", name: "Couvertures", unit: "pièces", category: "Literie", isPerishable: false },
  ];
  const productRows = await tx
    .insert(s.products)
    .values(productDefs.map(({ category, ...p }) => ({ ...p, organizationId, categoryId: cat(category) })))
    .returning({ id: s.products.id, sku: s.products.sku });
  const prod = (sku: string) => productRows.find((p) => p.sku === sku)!.id;

  // --- Donateurs, dons et réceptions -------------------------------------------------
  const [donorA, donorB] = await tx
    .insert(s.donors)
    .values([
      { organizationId, donorType: "individual", displayName: "Jean Kouassi" },
      { organizationId, donorType: "organization", displayName: "Supermarché du Centre" },
    ])
    .returning({ id: s.donors.id });

  let movementSeq = 0;
  const nextMovementRef = () => `MV-${pad(++movementSeq)}`;

  const donationDefs = [
    { at: daysAgo(55), donor: donorB.id, items: { "ALI-RIZ": 200, "ALI-HUI": 80 } },
    { at: daysAgo(40), donor: donorA.id, items: { "VET-DIV": 100, "LIT-COU": 84 } },
    { at: daysAgo(25), donor: donorB.id, items: { "EDU-KIT": 200, "EDU-CAH": 350 } },
    { at: daysAgo(12), donor: donorA.id, items: { "ALI-RIZ": 100, "HYG-SAV": 56 } },
    { at: daysAgo(5), donor: donorB.id, items: { "ALI-HUI": 80 } },
    { at: hoursAgo(1), donor: donorA.id, items: { "ALI-RIZ": 80 } },
  ];

  for (const [i, d] of donationDefs.entries()) {
    const [donation] = await tx
      .insert(s.donations)
      .values({
        organizationId,
        donorId: d.donor,
        reference: `DON-${pad(i + 1)}`,
        receivedOn: isoDate(d.at),
        status: "received",
        receivedByMembershipId: actor,
        createdAt: d.at,
      })
      .returning({ id: s.donations.id });
    const lines = Object.entries(d.items).map(([sku, q]) => ({ productId: prod(sku), quantity: String(q) }));
    await tx.insert(s.donationItems).values(lines.map((l) => ({ ...l, organizationId, donationId: donation.id })));

    const [mv] = await tx
      .insert(s.stockMovements)
      .values({
        organizationId,
        movementType: "receipt",
        status: "posted",
        reference: nextMovementRef(),
        destinationWarehouseId: principal.id,
        donationId: donation.id,
        performedByMembershipId: actor,
        occurredAt: d.at,
      })
      .returning({ id: s.stockMovements.id });
    await tx.insert(s.stockMovementItems).values(lines.map((l) => ({ ...l, organizationId, movementId: mv.id })));
  }

  // --- Transfert vers le Relais Nord ---------------------------------------------------
  const [transfer] = await tx
    .insert(s.stockMovements)
    .values({
      organizationId,
      movementType: "transfer",
      status: "posted",
      reference: nextMovementRef(),
      sourceWarehouseId: principal.id,
      destinationWarehouseId: nord.id,
      performedByMembershipId: actor,
      occurredAt: daysAgo(8),
    })
    .returning({ id: s.stockMovements.id });
  await tx.insert(s.stockMovementItems).values(
    Object.entries({ "ALI-RIZ": 50, "VET-DIV": 25, "LIT-COU": 20, "EDU-CAH": 40 }).map(([sku, q]) => ({
      organizationId,
      movementId: transfer.id,
      productId: prod(sku),
      quantity: String(q),
    })),
  );

  // --- Bénéficiaires et demandes d'aide ------------------------------------------------
  const beneficiaryRows = await tx
    .insert(s.beneficiaries)
    .values(
      ["Famille Traoré", "Famille Ndiaye", "Famille Bamba", "Famille Ouattara", "Famille Sow", "Famille Konaté"].map(
        (displayName, i) => ({
          organizationId,
          beneficiaryType: "household",
          reference: `BEN-${pad(i + 1)}`,
          displayName,
          householdSize: 3 + (i % 4),
        }),
      ),
    )
    .returning({ id: s.beneficiaries.id });

  const requestDefs = [
    { status: "approved" as const, requestedOn: daysAgo(3), reviewedAt: hoursAgo(2) },
    { status: "submitted" as const, requestedOn: daysAgo(2), reviewedAt: null },
    { status: "under_review" as const, requestedOn: daysAgo(6), reviewedAt: null },
    { status: "submitted" as const, requestedOn: daysAgo(1), reviewedAt: null },
  ];
  for (const [i, r] of requestDefs.entries()) {
    const [req] = await tx
      .insert(s.aidRequests)
      .values({
        organizationId,
        beneficiaryId: beneficiaryRows[i].id,
        reference: `DEM-${pad(i + 1)}`,
        status: r.status,
        requestedOn: isoDate(r.requestedOn),
        reviewedByMembershipId: r.reviewedAt ? actor : null,
        reviewedAt: r.reviewedAt,
      })
      .returning({ id: s.aidRequests.id });
    await tx.insert(s.aidRequestItems).values({
      organizationId,
      aidRequestId: req.id,
      productId: prod("ALI-RIZ"),
      quantityRequested: "10",
      quantityApproved: r.status === "approved" ? "10" : null,
    });
  }

  // --- Distributions (sorties de stock) ---------------------------------------------
  const basket = { "ALI-RIZ": 10, "ALI-HUI": 5, "HYG-SAV": 2 };
  const distributionDays = [26, 22, 18, 15, 10, 6, 3, 1];
  for (const [i, day] of distributionDays.entries()) {
    const at = i === distributionDays.length - 1 ? hoursAgo(3) : daysAgo(day);
    const [dist] = await tx
      .insert(s.distributions)
      .values({
        organizationId,
        beneficiaryId: beneficiaryRows[i % beneficiaryRows.length].id,
        warehouseId: principal.id,
        reference: `DIS-${pad(i + 1)}`,
        status: "completed",
        distributedOn: isoDate(at),
        distributedByMembershipId: actor,
        createdAt: at,
      })
      .returning({ id: s.distributions.id });
    const lines = Object.entries(basket).map(([sku, q]) => ({ productId: prod(sku), quantity: String(q) }));
    await tx.insert(s.distributionItems).values(lines.map((l) => ({ ...l, organizationId, distributionId: dist.id })));

    const [mv] = await tx
      .insert(s.stockMovements)
      .values({
        organizationId,
        movementType: "issue",
        status: "posted",
        reference: nextMovementRef(),
        sourceWarehouseId: principal.id,
        performedByMembershipId: actor,
        occurredAt: at,
        note: `Distribution DIS-${pad(i + 1)}`,
      })
      .returning({ id: s.stockMovements.id });
    await tx.insert(s.stockMovementItems).values(lines.map((l) => ({ ...l, organizationId, movementId: mv.id })));
  }

  await tx.insert(s.auditLogs).values({
    organizationId,
    actorUserId: userId(people[0].email),
    action: "seed.initialize",
    entityType: "organization",
    entityId: organizationId,
    afterData: { source: "scripts/seed.ts" },
  });

  return true;
}
