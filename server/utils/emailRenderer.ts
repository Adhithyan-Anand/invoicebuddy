import handlebars from "handlebars";

export type BaseContext = {
  // Common
  frontendUrl?: string;
  company?: {
    id?: number;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    logoUrl?: string | null;
    website?: string | null;
    taxNumber?: string | null;
  } | null;
  customer?: {
    id?: number;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    company?: string | null;
  } | null;
};

export type InvoiceEmailContext = BaseContext & {
  invoice: {
    id: number;
    invoiceNumber: string;
    date: string | Date;
    dueDate: string | Date;
    subtotal: number | string;
    taxAmount: number | string;
    total: number | string;
    notes?: string | null;
    paymentToken?: string | null;
  };
  payUrl?: string;
};

export type QuotationEmailContext = BaseContext & {
  quotation: {
    id: number;
    quotationNumber: string;
    date: string | Date;
    validUntil: string | Date;
    subtotal: number | string;
    taxAmount: number | string;
    total: number | string;
    notes?: string | null;
  };
};

export type PaymentConfirmationContext = BaseContext & {
  invoice: {
    id: number;
    invoiceNumber: string;
    total: number | string;
  };
  paymentId: string;
  date?: string | Date;
};

function registerDefaultHelpers() {
  // Register once, harmless if re-registered
  handlebars.registerHelper("formatCurrency", function (value: any, currency = "INR") {
    const num = typeof value === "string" ? parseFloat(value) : Number(value);
    if (Number.isNaN(num)) return String(value ?? "");
    if (currency === "INR") {
      return `₹${num.toFixed(2)}`;
    }
    return num.toFixed(2);
  });

  handlebars.registerHelper("formatDate", function (value: any, locale = undefined as any) {
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return String(value ?? "");
      return d.toLocaleDateString(locale);
    } catch {
      return String(value ?? "");
    }
  });

  handlebars.registerHelper("uppercase", function (value: any) {
    return String(value ?? "").toUpperCase();
  });

  handlebars.registerHelper("lowercase", function (value: any) {
    return String(value ?? "").toLowerCase();
  });

  handlebars.registerHelper("fallback", function (value: any, fallbackValue: any) {
    return value ?? fallbackValue;
  });
}

export function renderWithHandlebars<TContext extends object>(templateSource: string, context: TContext) {
  registerDefaultHelpers();
  const template = handlebars.compile(templateSource, { noEscape: false });
  return template(context);
}

/**
 * Default subject/html builders used as fallback when no custom template is set.
 * These mirror the current inline templates in routes.ts to avoid behavior changes.
 */
export function buildDefaultInvoiceEmailSubject(ctx: InvoiceEmailContext) {
  const companyName = ctx.company?.name || "Your Company";
  return `Invoice ${ctx.invoice.invoiceNumber} from ${companyName}`;
}

export function buildDefaultInvoiceEmailHtml(ctx: InvoiceEmailContext) {
  const companyName = ctx.company?.name || "Your Company";
  const customerName = ctx.customer?.name || "";
  const invoiceDate = new Date(ctx.invoice.date).toLocaleDateString();
  const dueDate = new Date(ctx.invoice.dueDate).toLocaleDateString();
  const total = Number(ctx.invoice.total);
  const notes = ctx.invoice.notes;
  const payUrl =
    ctx.payUrl ||
    `${ctx.frontendUrl || "http://127.0.0.1:5000"}/pay/${ctx.invoice.paymentToken ?? ""}`;

  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice ${ctx.invoice.invoiceNumber}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          text-align: center;
          padding: 20px 0;
          background: #f8f9fa;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        .company-name {
          font-size: 24px;
          font-weight: bold;
          color: #2563eb;
          margin: 0;
        }
        .invoice-title {
          font-size: 20px;
          color: #4b5563;
          margin: 10px 0;
        }
        .details {
          background: #ffffff;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 30px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .details-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .label {
          font-weight: 600;
          color: #4b5563;
        }
        .value {
          color: #1f2937;
        }
        .amount {
          font-size: 18px;
          font-weight: bold;
          color: #2563eb;
        }
        .footer {
          text-align: center;
          padding: 20px;
          color: #6b7280;
          font-size: 14px;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background-color: #2563eb;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          margin: 20px 0;
        }
        .note {
          background: #f3f4f6;
          padding: 15px;
          border-radius: 6px;
          margin: 20px 0;
          font-size: 14px;
          color: #4b5563;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="company-name">${companyName}</h1>
          <p class="invoice-title">Invoice #${ctx.invoice.invoiceNumber}</p>
        </div>
        
        <div class="details">
          <div class="details-row">
            <span class="label">Invoice Date:</span>
            <span class="value">${invoiceDate}</span>
          </div>
          <div class="details-row">
            <span class="label">Due Date:</span>
            <span class="value">${dueDate}</span>
          </div>
          <div class="details-row">
            <span class="label">Customer:</span>
            <span class="value">${customerName}</span>
          </div>
          <div class="details-row">
            <span class="label">Total Amount:</span>
            <span class="amount">₹${total.toFixed(2)}</span>
          </div>
        </div>

        ${notes ? `
        <div class="note">
          <strong>Notes:</strong><br>
          ${notes}
        </div>
        ` : ''}

        <div style="text-align: center;">
          <p>Please find your invoice attached to this email.</p>
          <a href="${payUrl}" class="button" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
            Pay Now
          </a>
          <p>Thank you for your business!</p>
        </div>

        <div class="footer">
          <p>This is an automated message, please do not reply directly to this email.</p>
          ${ctx.company?.email ? `<p>For any queries, please contact: ${ctx.company.email}</p>` : ''}
        </div>
      </div>
    </body>
  </html>
  `;
}

export function buildDefaultPaymentConfirmationSubject(ctx: PaymentConfirmationContext) {
  return `Payment Confirmation - Invoice ${ctx.invoice.invoiceNumber}`;
}

export function buildDefaultPaymentConfirmationHtml(ctx: PaymentConfirmationContext) {
  const dateStr = (ctx.date ? new Date(ctx.date) : new Date()).toLocaleDateString();
  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Confirmation</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          text-align: center;
          padding: 20px 0;
          background: #f8f9fa;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        .success-icon {
          color: #10b981;
          font-size: 48px;
          margin-bottom: 20px;
        }
        .details {
          background: #ffffff;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 30px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .details-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .label {
          font-weight: 600;
          color: #4b5563;
        }
        .value {
          color: #1f2937;
        }
        .footer {
          text-align: center;
          padding: 20px;
          color: #6b7280;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="success-icon">✓</div>
          <h1 style="color: #10b981; margin: 0;">Payment Successful</h1>
          <p>Thank you for your payment!</p>
        </div>
        
        <div class="details">
          <div class="details-row">
            <span class="label">Invoice Number:</span>
            <span class="value">${ctx.invoice.invoiceNumber}</span>
          </div>
          <div class="details-row">
            <span class="label">Amount Paid:</span>
            <span class="value">₹${Number(ctx.invoice.total).toFixed(2)}</span>
          </div>
          <div class="details-row">
            <span class="label">Payment ID:</span>
            <span class="value">${ctx.paymentId}</span>
          </div>
          <div class="details-row">
            <span class="label">Date:</span>
            <span class="value">${dateStr}</span>
          </div>
        </div>

        <div class="footer">
          <p>This is an automated message, please do not reply directly to this email.</p>
          ${ctx.company?.email ? `<p>For any queries, please contact: ${ctx.company.email}</p>` : ''}
        </div>
      </div>
    </body>
  </html>
  `;
}

/**
 * Convenience to compile a user-defined template with handlebars.
 * Callers should provide a context object: e.g. { invoice, company, customer, payUrl, frontendUrl }
 */
export function compileUserTemplate<T extends object>(templateHtml: string, context: T) {
  return renderWithHandlebars(templateHtml, context);
}
