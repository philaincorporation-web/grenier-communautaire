import {
  pgTable, pgEnum, uuid, varchar, text, boolean, integer, numeric, date,
  timestamp, jsonb, inet, unique, index, check, foreignKey
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Grenier Communautaire — schéma Drizzle de référence.
 * Dépendances : drizzle-orm (PostgreSQL).
 * Les UUID sont générés par PostgreSQL (gen_random_uuid()).
 * organizationId est propagé dans les FK composites pour isoler les tenants.
 */

export const memberRole = pgEnum("member_role", ["owner", "admin", "manager", "member", "viewer"]);
export const donationStatus = pgEnum("donation_status", ["draft", "received", "cancelled"]);
export const stockMovementType = pgEnum("stock_movement_type", ["receipt", "issue", "transfer", "adjustment_in", "adjustment_out"]);
export const stockMovementStatus = pgEnum("stock_movement_status", ["draft", "posted", "cancelled"]);
export const aidRequestStatus = pgEnum("aid_request_status", ["submitted", "under_review", "approved", "rejected", "fulfilled", "cancelled"]);
export const distributionStatus = pgEnum("distribution_status", ["draft", "completed", "cancelled"]);
/** Cycle de vie d'une soumission du site public (formulaires bénévolat, contact, demande d'aide en ligne). */
export const submissionStatus = pgEnum("submission_status", ["new", "in_progress", "processed", "archived"]);

const id = () => uuid("id").defaultRandom().primaryKey();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const organizations = pgTable("organizations", {
  id: id(),
  name: varchar("name", { length: 180 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 40 }),
  address: text("address"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const users = pgTable("users", {
  id: id(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  fullName: varchar("full_name", { length: 180 }).notNull(),
  phone: varchar("phone", { length: 40 }),
  isActive: boolean("is_active").notNull().default(true),
  /** Super administrateur de la plateforme : crée les organisations et gère leurs membres.
   *  Indépendant des rôles d'organisation ; attribué uniquement par script (npm run db:super-admin). */
  isSuperAdmin: boolean("is_super_admin").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const memberships = pgTable("memberships", {
  id: id(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: memberRole("role").notNull().default("member"),
  isActive: boolean("is_active").notNull().default(true),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [
  unique("memberships_org_user_uk").on(t.organizationId, t.userId),
  unique("memberships_id_org_uk").on(t.id, t.organizationId),
  index("memberships_user_idx").on(t.userId),
]);

export const donors = pgTable("donors", {
  id: id(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  donorType: varchar("donor_type", { length: 20 }).notNull(),
  displayName: varchar("display_name", { length: 180 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 40 }),
  address: text("address"),
  notes: text("notes"),
  createdAt: createdAt(),
}, t => [
  unique("donors_id_org_uk").on(t.id, t.organizationId),
  check("donors_type_ck", sql`${t.donorType} in ('individual', 'organization')`),
  index("donors_org_name_idx").on(t.organizationId, t.displayName),
]);

export const productCategories = pgTable("product_categories", {
  id: id(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  createdAt: createdAt(),
}, t => [
  unique("product_categories_id_org_uk").on(t.id, t.organizationId),
  unique("product_categories_org_name_uk").on(t.organizationId, t.name),
]);

export const products = pgTable("products", {
  id: id(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id"),
  sku: varchar("sku", { length: 80 }),
  name: varchar("name", { length: 180 }).notNull(),
  description: text("description"),
  unit: varchar("unit", { length: 40 }).notNull(),
  isPerishable: boolean("is_perishable").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, t => [
  unique("products_id_org_uk").on(t.id, t.organizationId),
  unique("products_org_sku_uk").on(t.organizationId, t.sku),
  foreignKey({ name: "products_category_org_fk", columns: [t.categoryId, t.organizationId], foreignColumns: [productCategories.id, productCategories.organizationId] }).onDelete("restrict"),
  index("products_org_name_idx").on(t.organizationId, t.name),
]);

export const warehouses = pgTable("warehouses", {
  id: id(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 160 }).notNull(),
  code: varchar("code", { length: 60 }),
  address: text("address"),
  managerMembershipId: uuid("manager_membership_id"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
}, t => [
  unique("warehouses_id_org_uk").on(t.id, t.organizationId),
  unique("warehouses_org_code_uk").on(t.organizationId, t.code),
  // RESTRICT volontaire : éviter SET NULL sur une FK composite qui toucherait aussi organization_id.
  foreignKey({ name: "warehouses_manager_org_fk", columns: [t.managerMembershipId, t.organizationId], foreignColumns: [memberships.id, memberships.organizationId] }).onDelete("restrict"),
  index("warehouses_org_idx").on(t.organizationId),
]);

export const donations = pgTable("donors_donations", {
  id: id(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  donorId: uuid("donor_id").notNull(),
  reference: varchar("reference", { length: 80 }),
  receivedOn: date("received_on").notNull().defaultNow(),
  status: donationStatus("status").notNull().default("draft"),
  notes: text("notes"),
  receivedByMembershipId: uuid("received_by_membership_id"),
  createdAt: createdAt(),
}, t => [
  unique("donations_id_org_uk").on(t.id, t.organizationId),
  unique("donations_org_reference_uk").on(t.organizationId, t.reference),
  foreignKey({ name: "donations_donor_org_fk", columns: [t.donorId, t.organizationId], foreignColumns: [donors.id, donors.organizationId] }).onDelete("restrict"),
  foreignKey({ name: "donations_receiver_org_fk", columns: [t.receivedByMembershipId, t.organizationId], foreignColumns: [memberships.id, memberships.organizationId] }).onDelete("restrict"),
  index("donations_org_date_idx").on(t.organizationId, t.receivedOn),
]);

export const donationItems = pgTable("donation_items", {
  id: id(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  donationId: uuid("donation_id").notNull(),
  productId: uuid("product_id").notNull(),
  quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull(),
  estimatedUnitValue: numeric("estimated_unit_value", { precision: 14, scale: 2 }),
  notes: text("notes"),
}, t => [
  foreignKey({ name: "donation_items_donation_org_fk", columns: [t.donationId, t.organizationId], foreignColumns: [donations.id, donations.organizationId] }).onDelete("cascade"),
  foreignKey({ name: "donation_items_product_org_fk", columns: [t.productId, t.organizationId], foreignColumns: [products.id, products.organizationId] }).onDelete("restrict"),
  check("donation_items_quantity_ck", sql`${t.quantity} > 0`),
  check("donation_items_value_ck", sql`${t.estimatedUnitValue} is null or ${t.estimatedUnitValue} >= 0`),
  index("donation_items_donation_idx").on(t.donationId),
]);

export const beneficiaries = pgTable("beneficiaries", {
  id: id(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  beneficiaryType: varchar("beneficiary_type", { length: 20 }).notNull(),
  reference: varchar("reference", { length: 80 }),
  displayName: varchar("display_name", { length: 180 }).notNull(),
  phone: varchar("phone", { length: 40 }),
  email: varchar("email", { length: 255 }),
  address: text("address"),
  householdSize: integer("household_size"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
}, t => [
  unique("beneficiaries_id_org_uk").on(t.id, t.organizationId),
  unique("beneficiaries_org_reference_uk").on(t.organizationId, t.reference),
  check("beneficiaries_type_ck", sql`${t.beneficiaryType} in ('individual', 'household', 'organization')`),
  check("beneficiaries_household_size_ck", sql`${t.householdSize} is null or ${t.householdSize} > 0`),
  index("beneficiaries_org_name_idx").on(t.organizationId, t.displayName),
]);

export const aidRequests = pgTable("aid_requests", {
  id: id(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  beneficiaryId: uuid("beneficiary_id").notNull(),
  reference: varchar("reference", { length: 80 }).notNull(),
  status: aidRequestStatus("status").notNull().default("submitted"),
  requestedOn: date("requested_on").notNull().defaultNow(),
  reviewedByMembershipId: uuid("reviewed_by_membership_id"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  decisionNote: text("decision_note"),
  generalNote: text("general_note"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, t => [
  unique("aid_requests_id_org_uk").on(t.id, t.organizationId),
  unique("aid_requests_org_reference_uk").on(t.organizationId, t.reference),
  foreignKey({ name: "aid_requests_beneficiary_org_fk", columns: [t.beneficiaryId, t.organizationId], foreignColumns: [beneficiaries.id, beneficiaries.organizationId] }).onDelete("restrict"),
  foreignKey({ name: "aid_requests_reviewer_org_fk", columns: [t.reviewedByMembershipId, t.organizationId], foreignColumns: [memberships.id, memberships.organizationId] }).onDelete("restrict"),
  index("aid_requests_org_status_idx").on(t.organizationId, t.status, t.requestedOn),
]);

export const aidRequestItems = pgTable("aid_request_items", {
  id: id(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  aidRequestId: uuid("aid_request_id").notNull(),
  productId: uuid("product_id").notNull(),
  quantityRequested: numeric("quantity_requested", { precision: 14, scale: 3 }).notNull(),
  quantityApproved: numeric("quantity_approved", { precision: 14, scale: 3 }),
  notes: text("notes"),
}, t => [
  foreignKey({ name: "aid_request_items_request_org_fk", columns: [t.aidRequestId, t.organizationId], foreignColumns: [aidRequests.id, aidRequests.organizationId] }).onDelete("cascade"),
  foreignKey({ name: "aid_request_items_product_org_fk", columns: [t.productId, t.organizationId], foreignColumns: [products.id, products.organizationId] }).onDelete("restrict"),
  check("aid_request_items_requested_ck", sql`${t.quantityRequested} > 0`),
  check("aid_request_items_approved_ck", sql`${t.quantityApproved} is null or ${t.quantityApproved} >= 0`),
  index("aid_request_items_request_idx").on(t.aidRequestId),
]);

export const stockMovements = pgTable("stock_movements", {
  id: id(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  movementType: stockMovementType("movement_type").notNull(),
  status: stockMovementStatus("status").notNull().default("draft"),
  reference: varchar("reference", { length: 80 }).notNull(),
  sourceWarehouseId: uuid("source_warehouse_id"),
  destinationWarehouseId: uuid("destination_warehouse_id"),
  donationId: uuid("donation_id"),
  performedByMembershipId: uuid("performed_by_membership_id"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  note: text("note"),
  createdAt: createdAt(),
}, t => [
  unique("stock_movements_id_org_uk").on(t.id, t.organizationId),
  unique("stock_movements_org_reference_uk").on(t.organizationId, t.reference),
  foreignKey({ name: "stock_movements_source_org_fk", columns: [t.sourceWarehouseId, t.organizationId], foreignColumns: [warehouses.id, warehouses.organizationId] }).onDelete("restrict"),
  foreignKey({ name: "stock_movements_destination_org_fk", columns: [t.destinationWarehouseId, t.organizationId], foreignColumns: [warehouses.id, warehouses.organizationId] }).onDelete("restrict"),
  foreignKey({ name: "stock_movements_donation_org_fk", columns: [t.donationId, t.organizationId], foreignColumns: [donations.id, donations.organizationId] }).onDelete("restrict"),
  foreignKey({ name: "stock_movements_actor_org_fk", columns: [t.performedByMembershipId, t.organizationId], foreignColumns: [memberships.id, memberships.organizationId] }).onDelete("restrict"),
  check("stock_movements_distinct_warehouses_ck", sql`${t.sourceWarehouseId} is distinct from ${t.destinationWarehouseId}`),
  check("stock_movements_warehouse_rules_ck", sql`(
    (${t.movementType} in ('receipt','adjustment_in') and ${t.destinationWarehouseId} is not null and ${t.sourceWarehouseId} is null)
    or (${t.movementType} in ('issue','adjustment_out') and ${t.sourceWarehouseId} is not null and ${t.destinationWarehouseId} is null)
    or (${t.movementType} = 'transfer' and ${t.sourceWarehouseId} is not null and ${t.destinationWarehouseId} is not null)
  )`),
  index("stock_movements_org_date_idx").on(t.organizationId, t.occurredAt),
]);

export const stockMovementItems = pgTable("stock_movement_items", {
  id: id(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  movementId: uuid("movement_id").notNull(),
  productId: uuid("product_id").notNull(),
  quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull(),
  unitValue: numeric("unit_value", { precision: 14, scale: 2 }),
  lotNumber: varchar("lot_number", { length: 100 }),
  expiresOn: date("expires_on"),
  notes: text("notes"),
}, t => [
  foreignKey({ name: "stock_movement_items_movement_org_fk", columns: [t.movementId, t.organizationId], foreignColumns: [stockMovements.id, stockMovements.organizationId] }).onDelete("cascade"),
  foreignKey({ name: "stock_movement_items_product_org_fk", columns: [t.productId, t.organizationId], foreignColumns: [products.id, products.organizationId] }).onDelete("restrict"),
  check("stock_movement_items_quantity_ck", sql`${t.quantity} > 0`),
  check("stock_movement_items_value_ck", sql`${t.unitValue} is null or ${t.unitValue} >= 0`),
  index("stock_movement_items_product_idx").on(t.organizationId, t.productId),
]);

export const distributions = pgTable("distributions", {
  id: id(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  beneficiaryId: uuid("beneficiary_id").notNull(),
  aidRequestId: uuid("aid_request_id"),
  warehouseId: uuid("warehouse_id").notNull(),
  reference: varchar("reference", { length: 80 }).notNull(),
  status: distributionStatus("status").notNull().default("draft"),
  distributedOn: date("distributed_on").notNull().defaultNow(),
  distributedByMembershipId: uuid("distributed_by_membership_id"),
  recipientAcknowledgement: text("recipient_acknowledgement"),
  note: text("note"),
  createdAt: createdAt(),
}, t => [
  unique("distributions_id_org_uk").on(t.id, t.organizationId),
  unique("distributions_org_reference_uk").on(t.organizationId, t.reference),
  foreignKey({ name: "distributions_beneficiary_org_fk", columns: [t.beneficiaryId, t.organizationId], foreignColumns: [beneficiaries.id, beneficiaries.organizationId] }).onDelete("restrict"),
  foreignKey({ name: "distributions_request_org_fk", columns: [t.aidRequestId, t.organizationId], foreignColumns: [aidRequests.id, aidRequests.organizationId] }).onDelete("restrict"),
  foreignKey({ name: "distributions_warehouse_org_fk", columns: [t.warehouseId, t.organizationId], foreignColumns: [warehouses.id, warehouses.organizationId] }).onDelete("restrict"),
  foreignKey({ name: "distributions_actor_org_fk", columns: [t.distributedByMembershipId, t.organizationId], foreignColumns: [memberships.id, memberships.organizationId] }).onDelete("restrict"),
  index("distributions_org_date_idx").on(t.organizationId, t.distributedOn),
]);

export const distributionItems = pgTable("distribution_items", {
  id: id(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  distributionId: uuid("distribution_id").notNull(),
  productId: uuid("product_id").notNull(),
  quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull(),
  notes: text("notes"),
}, t => [
  foreignKey({ name: "distribution_items_distribution_org_fk", columns: [t.distributionId, t.organizationId], foreignColumns: [distributions.id, distributions.organizationId] }).onDelete("cascade"),
  foreignKey({ name: "distribution_items_product_org_fk", columns: [t.productId, t.organizationId], foreignColumns: [products.id, products.organizationId] }).onDelete("restrict"),
  check("distribution_items_quantity_ck", sql`${t.quantity} > 0`),
  index("distribution_items_distribution_idx").on(t.distributionId),
]);

export const auditLogs = pgTable("audit_logs", {
  id: id(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 100 }).notNull(),
  entityId: uuid("entity_id"),
  beforeData: jsonb("before_data"),
  afterData: jsonb("after_data"),
  ipAddress: inet("ip_address"),
  createdAt: createdAt(),
}, t => [index("audit_logs_org_date_idx").on(t.organizationId, t.createdAt)]);

// ---------------------------------------------------------------------------
// Soumissions du site public. Elles arrivent sans session : l'organisation est résolue côté
// serveur (ORGANIZATION_SLUG), jamais fournie par le navigateur. `ip_hash` (HMAC, jamais l'IP
// brute) ne sert qu'à limiter le débit. Aucune de ces tables n'est lue par le site public.

export const volunteerApplications = pgTable("volunteer_applications", {
  id: id(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  fullName: varchar("full_name", { length: 180 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 40 }),
  role: varchar("role", { length: 40 }).notNull(),
  area: varchar("area", { length: 180 }),
  message: text("message"),
  status: submissionStatus("status").notNull().default("new"),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  ipHash: varchar("ip_hash", { length: 64 }),
  createdAt: createdAt(),
}, t => [
  index("volunteer_applications_org_status_idx").on(t.organizationId, t.status, t.createdAt),
  index("volunteer_applications_ip_idx").on(t.ipHash, t.createdAt),
]);

export const contactMessages = pgTable("contact_messages", {
  id: id(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  fullName: varchar("full_name", { length: 180 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 40 }).notNull(),
  message: text("message").notNull(),
  status: submissionStatus("status").notNull().default("new"),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  ipHash: varchar("ip_hash", { length: 64 }),
  createdAt: createdAt(),
}, t => [
  index("contact_messages_org_status_idx").on(t.organizationId, t.status, t.createdAt),
  index("contact_messages_ip_idx").on(t.ipHash, t.createdAt),
]);

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: id(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull(), // toujours en minuscules
  subscribedAt: timestamp("subscribed_at", { withTimezone: true }).notNull().defaultNow(),
  unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
  ipHash: varchar("ip_hash", { length: 64 }),
}, t => [
  unique("newsletter_subscribers_org_email_uk").on(t.organizationId, t.email),
  index("newsletter_subscribers_ip_idx").on(t.ipHash, t.subscribedAt),
]);

/**
 * Demande d'aide déposée en ligne par une personne qui n'est pas encore bénéficiaire.
 * L'équipe l'instruit puis la convertit en `aid_requests` (avec création du bénéficiaire) ;
 * `aid_request_id` garde le lien. Les champs sont sensibles : lecture réservée aux membres.
 */
export const publicAidRequests = pgTable("public_aid_requests", {
  id: id(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  reference: varchar("reference", { length: 80 }).notNull(),
  fullName: varchar("full_name", { length: 180 }).notNull(),
  phone: varchar("phone", { length: 40 }).notNull(),
  email: varchar("email", { length: 255 }),
  address: text("address"),
  householdSize: integer("household_size"),
  needs: text("needs").array().notNull().default(sql`'{}'::text[]`),
  message: text("message"),
  consentAt: timestamp("consent_at", { withTimezone: true }).notNull(),
  status: submissionStatus("status").notNull().default("new"),
  aidRequestId: uuid("aid_request_id"),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  ipHash: varchar("ip_hash", { length: 64 }),
  createdAt: createdAt(),
}, t => [
  unique("public_aid_requests_org_reference_uk").on(t.organizationId, t.reference),
  foreignKey({ name: "public_aid_requests_aid_request_org_fk", columns: [t.aidRequestId, t.organizationId], foreignColumns: [aidRequests.id, aidRequests.organizationId] }).onDelete("restrict"),
  check("public_aid_requests_household_ck", sql`${t.householdSize} is null or ${t.householdSize} > 0`),
  index("public_aid_requests_org_status_idx").on(t.organizationId, t.status, t.createdAt),
  index("public_aid_requests_ip_idx").on(t.ipHash, t.createdAt),
]);

export const schema = {
  organizations, users, memberships, donors, productCategories, products, warehouses,
  donations, donationItems, beneficiaries, aidRequests, aidRequestItems,
  stockMovements, stockMovementItems, distributions, distributionItems, auditLogs,
  volunteerApplications, contactMessages, newsletterSubscribers, publicAidRequests,
};
