import { db } from "../db";
import {
  emailTemplates,
  documentTemplates,
  companies,
  customers,
  type EmailTemplate,
  type InsertEmailTemplate,
  type DocumentTemplate,
  type InsertDocumentTemplate,
} from "@shared/schema";
import { and, desc, eq } from "drizzle-orm";

export type TemplateScopeType = "user" | "company" | "customer";
export type EmailTemplateType = "invoice_email" | "quotation_email" | "payment_confirmation_email";
export type DocumentTemplateType = "invoice" | "quotation";

function isMissingRelationError(err: any): boolean {
  // Postgres undefined_table error code and common message check
  return err?.code === '42P01' || /relation .* does not exist/i.test(err?.message || '');
}

/**
 * EMAIL TEMPLATES
 */
export async function listEmailTemplates(
  userId: number,
  filters?: {
    templateType?: EmailTemplateType;
    scopeType?: TemplateScopeType;
    scopeId?: number | null;
  },
): Promise<EmailTemplate[]> {
  const where = [
    eq(emailTemplates.userId, userId),
    ...(filters?.templateType ? [eq(emailTemplates.templateType, filters.templateType)] : []),
    ...(filters?.scopeType ? [eq(emailTemplates.scopeType, filters.scopeType)] : []),
    ...(typeof filters?.scopeId === "number" ? [eq(emailTemplates.scopeId, filters.scopeId)] : []),
  ];
  return await db
    .select()
    .from(emailTemplates)
    .where((and as any)(...where))
    .orderBy(desc(emailTemplates.updatedAt));
}

export async function getEmailTemplateById(userId: number, id: number): Promise<EmailTemplate | undefined> {
  const [row] = await db
    .select()
    .from(emailTemplates)
    .where(and(eq(emailTemplates.userId, userId), eq(emailTemplates.id, id)));
  return row;
}

export async function createEmailTemplate(
  userId: number,
  data: Omit<InsertEmailTemplate, "userId">,
): Promise<EmailTemplate> {
  const [row] = await db
    .insert(emailTemplates)
    .values({ ...data, userId })
    .returning();
  return row;
}

export async function updateEmailTemplate(
  userId: number,
  id: number,
  data: Partial<InsertEmailTemplate>,
): Promise<EmailTemplate> {
  const [row] = await db
    .update(emailTemplates)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(emailTemplates.userId, userId), eq(emailTemplates.id, id)))
    .returning();
  return row;
}

export async function deleteEmailTemplate(userId: number, id: number): Promise<void> {
  await db.delete(emailTemplates).where(and(eq(emailTemplates.userId, userId), eq(emailTemplates.id, id)));
}

/**
 * Resolve email template for a given user with fallback:
 * 1) customer scope
 * 2) company scope
 * 3) user scope
 */
export async function resolveEmailTemplate(
  userId: number,
  templateType: EmailTemplateType,
  opts?: { customerId?: number | null; companyId?: number | null },
): Promise<EmailTemplate | undefined> {
  try {
    // 1) customer
    if (opts?.customerId) {
      const [row] = await db
        .select()
        .from(emailTemplates)
        .where(
          and(
            eq(emailTemplates.userId, userId),
            eq(emailTemplates.templateType, templateType),
            eq(emailTemplates.scopeType, "customer"),
            eq(emailTemplates.scopeId, opts.customerId),
          ),
        )
        .orderBy(desc(emailTemplates.updatedAt))
        .limit(1);
      if (row) return row;
    }

    // Ensure companyId when not provided
    let companyId = opts?.companyId ?? null;
    if (companyId == null) {
      const [c] = await db.select().from(companies).where(eq(companies.userId, userId)).limit(1);
      if (c) companyId = c.id;
    }

    // 2) company
    if (companyId != null) {
      const [row] = await db
        .select()
        .from(emailTemplates)
        .where(
          and(
            eq(emailTemplates.userId, userId),
            eq(emailTemplates.templateType, templateType),
            eq(emailTemplates.scopeType, "company"),
            eq(emailTemplates.scopeId, companyId),
          ),
        )
        .orderBy(desc(emailTemplates.updatedAt))
        .limit(1);
      if (row) return row;
    }

    // 3) user
    const [row] = await db
      .select()
      .from(emailTemplates)
      .where(
        and(
          eq(emailTemplates.userId, userId),
          eq(emailTemplates.templateType, templateType),
          eq(emailTemplates.scopeType, "user"),
        ),
      )
      .orderBy(desc(emailTemplates.updatedAt))
      .limit(1);
    return row;
  } catch (err) {
    if (isMissingRelationError(err)) {
      // Table not migrated yet — gracefully fallback to default behavior
      return undefined;
    }
    throw err;
  }
}

/**
 * DOCUMENT TEMPLATES
 */
export async function listDocumentTemplates(
  userId: number,
  filters?: {
    docType?: DocumentTemplateType;
    scopeType?: TemplateScopeType;
    scopeId?: number | null;
  },
): Promise<DocumentTemplate[]> {
  const where = [
    eq(documentTemplates.userId, userId),
    ...(filters?.docType ? [eq(documentTemplates.docType, filters.docType)] : []),
    ...(filters?.scopeType ? [eq(documentTemplates.scopeType, filters.scopeType)] : []),
    ...(typeof filters?.scopeId === "number" ? [eq(documentTemplates.scopeId, filters.scopeId)] : []),
  ];
  return await db
    .select()
    .from(documentTemplates)
    .where((and as any)(...where))
    .orderBy(desc(documentTemplates.updatedAt));
}

export async function getDocumentTemplateById(userId: number, id: number): Promise<DocumentTemplate | undefined> {
  const [row] = await db
    .select()
    .from(documentTemplates)
    .where(and(eq(documentTemplates.userId, userId), eq(documentTemplates.id, id)));
  return row;
}

export async function createDocumentTemplate(
  userId: number,
  data: Omit<InsertDocumentTemplate, "userId">,
): Promise<DocumentTemplate> {
  const [row] = await db
    .insert(documentTemplates)
    .values({ ...data, userId })
    .returning();
  return row;
}

export async function updateDocumentTemplate(
  userId: number,
  id: number,
  data: Partial<InsertDocumentTemplate>,
): Promise<DocumentTemplate> {
  const [row] = await db
    .update(documentTemplates)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(documentTemplates.userId, userId), eq(documentTemplates.id, id)))
    .returning();
  return row;
}

export async function deleteDocumentTemplate(userId: number, id: number): Promise<void> {
  await db
    .delete(documentTemplates)
    .where(and(eq(documentTemplates.userId, userId), eq(documentTemplates.id, id)));
}

/**
 * Resolve document template for a given user with fallback:
 * 1) customer scope
 * 2) company scope
 * 3) user scope
 */
export async function resolveDocumentTemplate(
  userId: number,
  docType: DocumentTemplateType,
  opts?: { customerId?: number | null; companyId?: number | null },
): Promise<DocumentTemplate | undefined> {
  try {
    // 1) customer
    if (opts?.customerId) {
      const [row] = await db
        .select()
        .from(documentTemplates)
        .where(
          and(
            eq(documentTemplates.userId, userId),
            eq(documentTemplates.docType, docType),
            eq(documentTemplates.scopeType, "customer"),
            eq(documentTemplates.scopeId, opts.customerId),
          ),
        )
        .orderBy(desc(documentTemplates.updatedAt))
        .limit(1);
      if (row) return row;
    }

    // Ensure companyId when not provided
    let companyId = opts?.companyId ?? null;
    if (companyId == null) {
      const [c] = await db.select().from(companies).where(eq(companies.userId, userId)).limit(1);
      if (c) companyId = c.id;
    }

    // 2) company
    if (companyId != null) {
      const [row] = await db
        .select()
        .from(documentTemplates)
        .where(
          and(
            eq(documentTemplates.userId, userId),
            eq(documentTemplates.docType, docType),
            eq(documentTemplates.scopeType, "company"),
            eq(documentTemplates.scopeId, companyId),
          ),
        )
        .orderBy(desc(documentTemplates.updatedAt))
        .limit(1);
      if (row) return row;
    }

    // 3) user
    const [row] = await db
      .select()
      .from(documentTemplates)
      .where(
        and(
          eq(documentTemplates.userId, userId),
          eq(documentTemplates.docType, docType),
          eq(documentTemplates.scopeType, "user"),
        ),
      )
      .orderBy(desc(documentTemplates.updatedAt))
      .limit(1);
    return row;
  } catch (err) {
    if (isMissingRelationError(err)) {
      // Table not migrated yet — gracefully fallback to default behavior
      return undefined;
    }
    throw err;
  }
}
