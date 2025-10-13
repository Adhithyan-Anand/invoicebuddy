import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  decimal,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email").unique().notNull(),
  password: varchar("password").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  google_id: varchar("google_id"), // allow null, unique constraint can be added in migration
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Company profiles
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  logoUrl: varchar("logo_url"),
  website: varchar("website"),
  taxNumber: varchar("tax_number"),
  bankName: varchar("bank_name", { length: 255 }),
  bankAccount: varchar("bank_account", { length: 255 }),
  bankIfsc: varchar("bank_ifsc", { length: 50 }),
  bankUpi: varchar("bank_upi", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Customers
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  company: varchar("company", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Invoices
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  customerId: integer("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  invoiceNumber: varchar("invoice_number", { length: 100 }).notNull(),
  date: timestamp("date").notNull(),
  dueDate: timestamp("due_date").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("draft"), // draft, sent, paid, overdue
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull().default("0"),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull().default("0"),
  paymentTerms: varchar("payment_terms", { length: 50 }),
  notes: text("notes"),
  paymentToken: varchar("payment_token", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Quotations
export const quotations = pgTable("quotations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  customerId: integer("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  quotationNumber: varchar("quotation_number", { length: 100 }).notNull(),
  date: timestamp("date").notNull(),
  validUntil: timestamp("valid_until").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("draft"), // draft, sent, accepted, rejected, expired
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull().default("0"),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Invoice line items
export const invoiceLineItems = pgTable("invoice_line_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  rate: decimal("rate", { precision: 10, scale: 2 }).notNull(),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
});

// Quotation line items
export const quotationLineItems = pgTable("quotation_line_items", {
  id: serial("id").primaryKey(),
  quotationId: integer("quotation_id").notNull().references(() => quotations.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  rate: decimal("rate", { precision: 10, scale: 2 }).notNull(),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  company: one(companies),
  customers: many(customers),
  invoices: many(invoices),
  quotations: many(quotations),
}));

export const companiesRelations = relations(companies, ({ one }) => ({
  user: one(users, {
    fields: [companies.userId],
    references: [users.id],
  }),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  user: one(users, {
    fields: [customers.userId],
    references: [users.id],
  }),
  invoices: many(invoices),
  quotations: many(quotations),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  user: one(users, {
    fields: [invoices.userId],
    references: [users.id],
  }),
  customer: one(customers, {
    fields: [invoices.customerId],
    references: [customers.id],
  }),
  lineItems: many(invoiceLineItems),
}));

export const quotationsRelations = relations(quotations, ({ one, many }) => ({
  user: one(users, {
    fields: [quotations.userId],
    references: [users.id],
  }),
  customer: one(customers, {
    fields: [quotations.customerId],
    references: [customers.id],
  }),
  lineItems: many(quotationLineItems),
}));

export const invoiceLineItemsRelations = relations(invoiceLineItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceLineItems.invoiceId],
    references: [invoices.id],
  }),
}));

export const quotationLineItemsRelations = relations(quotationLineItems, ({ one }) => ({
  quotation: one(quotations, {
    fields: [quotationLineItems.quotationId],
    references: [quotations.id],
  }),
}));

/** Email Templates for customizable emails (invoice, quotation, payment confirmation)
 * scopeType: 'user' | 'company' | 'customer'
 * templateType: 'invoice_email' | 'quotation_email' | 'payment_confirmation_email'
 */
export const emailTemplates = pgTable(
  "email_templates",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    scopeType: varchar("scope_type", { length: 20 }).notNull(),
    scopeId: integer("scope_id"), // null when scopeType = 'user'
    templateType: varchar("template_type", { length: 50 }).notNull(),
    subject: varchar("subject", { length: 255 }).notNull(),
    html: text("html").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [index("IDX_email_templates_user").on(table.userId, table.templateType)],
);

/** Document appearance templates (PDF look/feel) for invoice/quotation
 * scopeType: 'user' | 'company' | 'customer'
 * docType: 'invoice' | 'quotation'
 * settings: JSON object e.g. { primaryColor?: string, footerText?: string }
 */
export const documentTemplates = pgTable(
  "document_templates",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    scopeType: varchar("scope_type", { length: 20 }).notNull(),
    scopeId: integer("scope_id"), // null when scopeType = 'user'
    docType: varchar("doc_type", { length: 20 }).notNull(),
    settings: jsonb("settings").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [index("IDX_document_templates_user").on(table.userId, table.docType)],
);

// Types
export type InsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

export type Quotation = typeof quotations.$inferSelect;
export type InsertQuotation = typeof quotations.$inferInsert;

export type InvoiceLineItem = typeof invoiceLineItems.$inferSelect;
export type InsertInvoiceLineItem = typeof invoiceLineItems.$inferInsert;

export type QuotationLineItem = typeof quotationLineItems.$inferSelect;
export type InsertQuotationLineItem = typeof quotationLineItems.$inferInsert;

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = typeof emailTemplates.$inferInsert;

export type DocumentTemplate = typeof documentTemplates.$inferSelect;
export type InsertDocumentTemplate = typeof documentTemplates.$inferInsert;

// Schemas for validation
export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuotationSchema = createInsertSchema(quotations).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInvoiceLineItemSchema = createInsertSchema(invoiceLineItems).omit({
  id: true,
});

export const insertQuotationLineItemSchema = createInsertSchema(quotationLineItems).omit({
  id: true,
});

export interface IStorage {
  // ... existing methods ...
  getInvoiceByToken(token: string): Promise<Invoice | undefined>;
  // ... existing code ...
}
