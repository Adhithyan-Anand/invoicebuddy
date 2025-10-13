import {
  users,
  companies,
  customers,
  invoices,
  quotations,
  invoiceLineItems,
  quotationLineItems,
  type User,
  type InsertUser,
  type Company,
  type InsertCompany,
  type Customer,
  type InsertCustomer,
  type Invoice,
  type InsertInvoice,
  type Quotation,
  type InsertQuotation,
  type InvoiceLineItem,
  type InsertInvoiceLineItem,
  type QuotationLineItem,
  type InsertQuotationLineItem,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, sum } from "drizzle-orm";
import dotenv from 'dotenv';

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Company operations
  getCompanyByUserId(userId: number): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(userId: number, company: Partial<InsertCompany>): Promise<Company>;

  // Customer operations
  getCustomersByUserId(userId: number): Promise<Customer[]>;
  getCustomerById(id: number, userId: number): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, userId: number, customer: Partial<InsertCustomer>): Promise<Customer>;
  deleteCustomer(id: number, userId: number): Promise<void>;

  // Invoice operations
  getInvoicesByUserId(userId: number): Promise<Invoice[]>;
  getInvoiceById(id: number, userId: number): Promise<Invoice | undefined>;
  getInvoiceWithDetails(id: number, userId: number): Promise<(Invoice & { customer: Customer; lineItems: InvoiceLineItem[]; company?: Company }) | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, userId: number, invoice: Partial<InsertInvoice>): Promise<Invoice>;
  deleteInvoice(id: number, userId: number): Promise<void>;
  getNextInvoiceNumber(userId: number): Promise<string>;
  getInvoiceByToken(token: string): Promise<Invoice | undefined>;
  getInvoiceWithDetailsByToken(token: string): Promise<(Invoice & { customer: Customer; company?: Company; user?: User }) | undefined>;

  // Invoice line items
  createInvoiceLineItems(lineItems: InsertInvoiceLineItem[]): Promise<InvoiceLineItem[]>;
  updateInvoiceLineItems(invoiceId: number, lineItems: InsertInvoiceLineItem[]): Promise<InvoiceLineItem[]>;
  getInvoiceLineItems(invoiceId: number): Promise<InvoiceLineItem[]>;

  // Quotation operations
  getQuotationsByUserId(userId: number): Promise<Quotation[]>;
  getQuotationById(id: number, userId: number): Promise<Quotation | undefined>;
  getQuotationWithDetails(id: number, userId: number): Promise<(Quotation & { customer: Customer; lineItems: QuotationLineItem[]; company?: Company }) | undefined>;
  createQuotation(quotation: InsertQuotation): Promise<Quotation>;
  updateQuotation(id: number, userId: number, quotation: Partial<InsertQuotation>): Promise<Quotation>;
  deleteQuotation(id: number, userId: number): Promise<void>;
  getNextQuotationNumber(userId: number): Promise<string>;

  // Quotation line items
  createQuotationLineItems(lineItems: InsertQuotationLineItem[]): Promise<QuotationLineItem[]>;
  updateQuotationLineItems(quotationId: number, lineItems: InsertQuotationLineItem[]): Promise<QuotationLineItem[]>;
  getQuotationLineItems(quotationId: number): Promise<QuotationLineItem[]>;

  // Dashboard statistics
  getDashboardStats(userId: number): Promise<{
    totalRevenue: number;
    totalInvoices: number;
    activeCustomers: number;
    pendingAmount: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  // Company operations
  async getCompanyByUserId(userId: number): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.userId, userId));
    return company;
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const [createdCompany] = await db
      .insert(companies)
      .values(company)
      .returning();
    return createdCompany;
  }

  async updateCompany(userId: number, company: Partial<InsertCompany>): Promise<Company> {
    const [updatedCompany] = await db
      .update(companies)
      .set({ ...company, updatedAt: new Date() })
      .where(eq(companies.userId, userId))
      .returning();
    return updatedCompany;
  }

  // Customer operations
  async getCustomersByUserId(userId: number): Promise<Customer[]> {
    return await db.select().from(customers).where(eq(customers.userId, userId)).orderBy(desc(customers.createdAt));
  }

  async getCustomerById(id: number, userId: number): Promise<Customer | undefined> {
    const [customer] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.id, id), eq(customers.userId, userId)));
    return customer;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [createdCustomer] = await db
      .insert(customers)
      .values(customer)
      .returning();
    return createdCustomer;
  }

  async updateCustomer(id: number, userId: number, customer: Partial<InsertCustomer>): Promise<Customer> {
    const [updatedCustomer] = await db
      .update(customers)
      .set({ ...customer, updatedAt: new Date() })
      .where(and(eq(customers.id, id), eq(customers.userId, userId)))
      .returning();
    return updatedCustomer;
  }

  async deleteCustomer(id: number, userId: number): Promise<void> {
    await db
      .delete(customers)
      .where(and(eq(customers.id, id), eq(customers.userId, userId)));
  }

  // Invoice operations
  async getInvoicesByUserId(userId: number): Promise<Invoice[]> {
    const result = await db
      .select({
        invoice: invoices,
        customer: customers,
      })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(eq(invoices.userId, userId))
      .orderBy(desc(invoices.createdAt));

    return result.map(row => ({
      ...row.invoice,
      customer: row.customer,
    }));
  }

  async getInvoiceById(id: number, userId: number): Promise<Invoice | undefined> {
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.userId, userId)));
    return invoice;
  }

  async getInvoiceWithDetails(id: number, userId: number): Promise<(Invoice & { customer: Customer; lineItems: InvoiceLineItem[]; company?: Company }) | undefined> {
    const [invoice] = await db
      .select()
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .leftJoin(companies, eq(invoices.userId, companies.userId))
      .where(and(eq(invoices.id, id), eq(invoices.userId, userId)));

    if (!invoice.invoices || !invoice.customers) return undefined;

    const lineItems = await this.getInvoiceLineItems(id);
    const company = invoice.companies ? {
      id: invoice.companies.id,
      userId: invoice.companies.userId,
      name: invoice.companies.name,
      email: invoice.companies.email,
      phone: invoice.companies.phone,
      address: invoice.companies.address,
      logoUrl: invoice.companies.logoUrl,
      website: invoice.companies.website,
      taxNumber: invoice.companies.taxNumber,
      bankName: 'bankName' in invoice.companies ? invoice.companies.bankName ?? null : null,
      bankAccount: 'bankAccount' in invoice.companies ? invoice.companies.bankAccount ?? null : null,
      bankIfsc: 'bankIfsc' in invoice.companies ? invoice.companies.bankIfsc ?? null : null,
      bankUpi: 'bankUpi' in invoice.companies ? invoice.companies.bankUpi ?? null : null,
      createdAt: invoice.companies.createdAt,
      updatedAt: invoice.companies.updatedAt,
    } : undefined;

    return {
      ...invoice.invoices,
      customer: invoice.customers,
      company,
      lineItems,
    };
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [createdInvoice] = await db
      .insert(invoices)
      .values(invoice)
      .returning();
    return createdInvoice;
  }

  async updateInvoice(id: number, userId: number, invoice: Partial<InsertInvoice>): Promise<Invoice> {
    const [updatedInvoice] = await db
      .update(invoices)
      .set({ ...invoice, updatedAt: new Date() })
      .where(and(eq(invoices.id, id), eq(invoices.userId, userId)))
      .returning();
    return updatedInvoice;
  }

  async deleteInvoice(id: number, userId: number): Promise<void> {
    await db
      .delete(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.userId, userId)));
  }

  async getNextInvoiceNumber(userId: number): Promise<string> {
    const [lastInvoice] = await db
      .select({ invoiceNumber: invoices.invoiceNumber })
      .from(invoices)
      .where(eq(invoices.userId, userId))
      .orderBy(desc(invoices.createdAt))
      .limit(1);

    if (!lastInvoice) return "INV-001";

    const lastNumber = parseInt(lastInvoice.invoiceNumber.split("-")[1] || "0");
    return `INV-${String(lastNumber + 1).padStart(3, "0")}`;
  }

  async getInvoiceByToken(token: string): Promise<Invoice | undefined> {
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.paymentToken, token));
    return invoice;
  }

  async getInvoiceWithDetailsByToken(token: string): Promise<(Invoice & { customer: Customer; company?: Company; user?: User }) | undefined> {
    const [invoice] = await db
      .select()
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .leftJoin(companies, eq(invoices.userId, companies.userId))
      .leftJoin(users, eq(invoices.userId, users.id))
      .where(eq(invoices.paymentToken, token));

    if (!invoice?.invoices || !invoice?.customers) return undefined;

    const company = invoice.companies ? {
      id: invoice.companies.id,
      userId: invoice.companies.userId,
      name: invoice.companies.name,
      email: invoice.companies.email,
      phone: invoice.companies.phone,
      address: invoice.companies.address,
      logoUrl: invoice.companies.logoUrl,
      website: invoice.companies.website,
      taxNumber: invoice.companies.taxNumber,
      createdAt: invoice.companies.createdAt,
      updatedAt: invoice.companies.updatedAt,
    } : undefined;

    const user = invoice.users ? {
      id: invoice.users.id,
      email: invoice.users.email,
      firstName: invoice.users.firstName,
      lastName: invoice.users.lastName,
      profileImageUrl: invoice.users.profileImageUrl,
      createdAt: invoice.users.createdAt,
      updatedAt: invoice.users.updatedAt,
    } : undefined;

    return {
      ...invoice.invoices,
      customer: invoice.customers,
      company,
      user,
    };
  }

  // Invoice line items
  async createInvoiceLineItems(lineItems: InsertInvoiceLineItem[]): Promise<InvoiceLineItem[]> {
    return await db
      .insert(invoiceLineItems)
      .values(lineItems)
      .returning();
  }

  async updateInvoiceLineItems(invoiceId: number, lineItems: InsertInvoiceLineItem[]): Promise<InvoiceLineItem[]> {
    // Delete existing line items
    await db.delete(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, invoiceId));

    // Insert new line items
    if (lineItems.length > 0) {
      return await db
        .insert(invoiceLineItems)
        .values(lineItems)
        .returning();
    }
    return [];
  }

  async getInvoiceLineItems(invoiceId: number): Promise<InvoiceLineItem[]> {
    return await db
      .select()
      .from(invoiceLineItems)
      .where(eq(invoiceLineItems.invoiceId, invoiceId));
  }

  // Quotation operations
  async getQuotationsByUserId(userId: number): Promise<Quotation[]> {
    return await db.select().from(quotations).where(eq(quotations.userId, userId)).orderBy(desc(quotations.createdAt));
  }

  async getQuotationById(id: number, userId: number): Promise<Quotation | undefined> {
    const [quotation] = await db
      .select()
      .from(quotations)
      .where(and(eq(quotations.id, id), eq(quotations.userId, userId)));
    return quotation;
  }

  async getQuotationWithDetails(id: number, userId: number): Promise<(Quotation & { customer: Customer; lineItems: QuotationLineItem[]; company?: Company }) | undefined> {
    const [quotation] = await db
      .select()
      .from(quotations)
      .leftJoin(customers, eq(quotations.customerId, customers.id))
      .leftJoin(companies, eq(quotations.userId, companies.userId))
      .where(and(eq(quotations.id, id), eq(quotations.userId, userId)));

    if (!quotation.quotations || !quotation.customers) return undefined;

    const lineItems = await this.getQuotationLineItems(id);
    const company = quotation.companies ? {
      id: quotation.companies.id,
      userId: quotation.companies.userId,
      name: quotation.companies.name,
      email: quotation.companies.email,
      phone: quotation.companies.phone,
      address: quotation.companies.address,
      logoUrl: quotation.companies.logoUrl,
      website: quotation.companies.website,
      taxNumber: quotation.companies.taxNumber,
      createdAt: quotation.companies.createdAt,
      updatedAt: quotation.companies.updatedAt,
    } : undefined;

    return {
      ...quotation.quotations,
      customer: quotation.customers,
      company,
      lineItems,
    };
  }

  async createQuotation(quotation: InsertQuotation): Promise<Quotation> {
    const [createdQuotation] = await db
      .insert(quotations)
      .values(quotation)
      .returning();
    return createdQuotation;
  }

  async updateQuotation(id: number, userId: number, quotation: Partial<InsertQuotation>): Promise<Quotation> {
    const [updatedQuotation] = await db
      .update(quotations)
      .set({ ...quotation, updatedAt: new Date() })
      .where(and(eq(quotations.id, id), eq(quotations.userId, userId)))
      .returning();
    return updatedQuotation;
  }

  async deleteQuotation(id: number, userId: number): Promise<void> {
    await db
      .delete(quotations)
      .where(and(eq(quotations.id, id), eq(quotations.userId, userId)));
  }

  async getNextQuotationNumber(userId: number): Promise<string> {
    const [lastQuotation] = await db
      .select({ quotationNumber: quotations.quotationNumber })
      .from(quotations)
      .where(eq(quotations.userId, userId))
      .orderBy(desc(quotations.createdAt))
      .limit(1);

    if (!lastQuotation) return "QUO-001";

    const lastNumber = parseInt(lastQuotation.quotationNumber.split("-")[1] || "0");
    return `QUO-${String(lastNumber + 1).padStart(3, "0")}`;
  }

  // Quotation line items
  async createQuotationLineItems(lineItems: InsertQuotationLineItem[]): Promise<QuotationLineItem[]> {
    return await db
      .insert(quotationLineItems)
      .values(lineItems)
      .returning();
  }

  async updateQuotationLineItems(quotationId: number, lineItems: InsertQuotationLineItem[]): Promise<QuotationLineItem[]> {
    // Delete existing line items
    await db.delete(quotationLineItems).where(eq(quotationLineItems.quotationId, quotationId));

    // Insert new line items
    if (lineItems.length > 0) {
      return await db
        .insert(quotationLineItems)
        .values(lineItems)
        .returning();
    }
    return [];
  }

  async getQuotationLineItems(quotationId: number): Promise<QuotationLineItem[]> {
    return await db
      .select()
      .from(quotationLineItems)
      .where(eq(quotationLineItems.quotationId, quotationId));
  }

  // Dashboard statistics
  async getDashboardStats(userId: number): Promise<{
    totalRevenue: number;
    totalInvoices: number;
    activeCustomers: number;
    pendingAmount: number;
  }> {
    try {
      // Debug query to see all paid invoices with explicit column names
      const debugQuery = await db.execute(sql`
        SELECT 
          "id",
          "invoice_number",
          "status",
          CAST("total" AS DECIMAL(10,2)) as total
        FROM "invoices" 
        WHERE "user_id" = ${userId} AND LOWER("status") = 'paid'
      `);
      console.log('Debug - All paid invoices:', JSON.stringify(debugQuery.rows, null, 2));
      console.log("User ID:", userId);
      console.log("Resolved User ID:", userId);

      
      


      // Calculate total revenue with explicit column names
      const revenueResult = await db.execute(sql`
        SELECT COALESCE(SUM(CAST("total" AS DECIMAL(10,2))), 0) as total
        FROM "invoices" 
        WHERE "user_id" = ${userId} AND LOWER("status") = 'paid'
      `);
      console.log('Debug - Revenue result:', JSON.stringify(revenueResult.rows, null, 2));

      const [invoiceCountResult] = await db
        .select({ count: sql`count(*)`.as('count') })
        .from(invoices)
        .where(eq(invoices.userId, userId));

      const [customerCountResult] = await db
        .select({ count: sql`count(*)`.as('count') })
        .from(customers)
        .where(eq(customers.userId, userId));

      const pendingResult = await db.execute(sql`
        SELECT COALESCE(SUM(CAST("total" AS DECIMAL(10,2))), 0) as total
        FROM "invoices" 
        WHERE "user_id" = ${userId} AND LOWER("status") = 'sent'
      `);

      const stats = {
        totalRevenue: Number(revenueResult.rows[0]?.total || 0),
        totalInvoices: Number(invoiceCountResult?.count || 0),
        activeCustomers: Number(customerCountResult?.count || 0),
        pendingAmount: Number(pendingResult.rows[0]?.total || 0),
      };

      console.log('Debug - Final stats:', JSON.stringify(stats, null, 2));
      return stats;
    } catch (error) {
      console.error('Error in getDashboardStats:', error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();
