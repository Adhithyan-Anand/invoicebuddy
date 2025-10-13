import PDFDocument from 'pdfkit';
import { Invoice, Customer, InvoiceLineItem, Quotation, QuotationLineItem, Company } from '@shared/schema';
import path from 'path';
import fs from 'fs';

// --- DESIGN SYSTEM CONFIG ---
const DESIGN_CONFIG = {
  colors: {
    border: '#000',
    text: '#111',
    lightBg: '#fff'
  },
  fonts: {
    small: 9,
    normal: 11,
    medium: 13,
    large: 16,
    xlarge: 22
  },
  spacing: {
    xs: 8,
    sm: 12,
    md: 20,
    lg: 32,
    xl: 48
  },
  layout: {
    margin: 36, // 0.5 inch
    boarder: 24, // extra border inside margin
    contentWidth: 523, // 595 - 2*margin - 2*boarder
    logoMaxWidth: 90
  }
};

function drawCell(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, opts: { fill?: string, border?: boolean } = {}) {
  if (opts.fill) {
    doc.rect(x, y, w, h).fillColor(opts.fill).fill();
  }
  if (opts.border !== false) {
    doc.rect(x, y, w, h).lineWidth(1.5).strokeColor(DESIGN_CONFIG.colors.border).stroke();
  }
}

function drawText(doc: PDFKit.PDFDocument, text: string, x: number, y: number, w: number, h: number, opts: { align?: 'left'|'center'|'right', fontSize?: number, bold?: boolean } = {}) {
  doc.fontSize(opts.fontSize ?? DESIGN_CONFIG.fonts.normal);
  doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica');
  doc.fillColor(DESIGN_CONFIG.colors.text);
  doc.text(text, x + 8, y + 4, { width: w - 16, align: opts.align ?? 'left' });
}

export function generateInvoicePDF(
  invoice: Invoice & { customer: Customer; lineItems: InvoiceLineItem[]; company?: Company },
  appearance?: { footerText?: string }
): PDFKit.PDFDocument {
  const doc = new PDFDocument({ margin: DESIGN_CONFIG.layout.margin, size: 'A4' });

  // --- Big Boarder ---
  const boarder = DESIGN_CONFIG.layout.boarder;
  const margin = DESIGN_CONFIG.layout.margin;
  const pageW = 595, pageH = 842;
  const contentW = pageW - 2 * (margin + boarder);
  const contentX = margin + boarder;
  const contentY = margin + boarder;
  const contentH = pageH - 2 * (margin + boarder);

  doc.save();
  doc.rect(margin, margin, pageW - 2 * margin, pageH - 2 * margin)
    .lineWidth(boarder)
    .strokeColor(DESIGN_CONFIG.colors.border)
    .stroke();
  doc.restore();

  let y = contentY;

  // --- Header Table (Logo | Company | Invoice Meta) ---
  const headerH = 80;
  // Logo cell
  drawCell(doc, contentX, y, 100, headerH);
  if (invoice.company?.logoUrl) {
    try {
      const logoPath = path.join(process.cwd(), 'server', 'uploads', path.basename(invoice.company.logoUrl));
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, contentX + 10, y + 10, { width: 80, fit: [80, 60] });
      }
    } catch {}
  }
  // Company info cell
  drawCell(doc, contentX + 100, y, 250, headerH);
  drawText(doc, invoice.company?.name || '', contentX + 100, y, 250, 24, { bold: true, fontSize: DESIGN_CONFIG.fonts.large });
  let companyInfoY = y + 28;
  [
    invoice.company?.address,
    invoice.company?.phone ? `Phone: ${invoice.company.phone}` : null,
    invoice.company?.email && invoice.company.email.includes('@') ? `Email: ${invoice.company.email}` : null,
    invoice.company?.website ? `Website: ${invoice.company.website}` : null,
    invoice.company?.taxNumber ? `Tax ID: ${invoice.company.taxNumber}` : null
  ].filter(Boolean).forEach(line => {
    drawText(doc, line as string, contentX + 100, companyInfoY, 250, 16, { fontSize: DESIGN_CONFIG.fonts.small });
    companyInfoY += 16;
  });
  // Invoice meta cell
  drawCell(doc, contentX + 350, y, contentW - 350, headerH);
  let metaY = y + 8;
  drawText(doc, 'INVOICE', contentX + 350, metaY, contentW - 350, 20, { align: 'right', bold: true, fontSize: DESIGN_CONFIG.fonts.xlarge });
  metaY += 24;
  drawText(doc, `Invoice #: ${invoice.invoiceNumber}`, contentX + 350, metaY, contentW - 350, 16, { align: 'right', fontSize: DESIGN_CONFIG.fonts.small });
  metaY += 16;
  drawText(doc, `Date: ${new Date(invoice.date).toLocaleDateString('en-GB')}`, contentX + 350, metaY, contentW - 350, 16, { align: 'right', fontSize: DESIGN_CONFIG.fonts.small });
  metaY += 16;
  drawText(doc, `Due: ${new Date(invoice.dueDate).toLocaleDateString('en-GB')}`, contentX + 350, metaY, contentW - 350, 16, { align: 'right', fontSize: DESIGN_CONFIG.fonts.small });

  y += headerH;

  // --- Customer & Payment Table ---
  const custPayH = 80;
  // Customer cell
  drawCell(doc, contentX, y, contentW / 2, custPayH);
  drawText(doc, 'Bill To:', contentX, y, contentW / 2, 16, { bold: true, fontSize: DESIGN_CONFIG.fonts.medium });
  let custY = y + 20;
  [
    invoice.customer?.name,
    invoice.customer?.company,
    invoice.customer?.address,
    invoice.customer?.phone ? `Phone: ${invoice.customer.phone}` : null,
    invoice.customer?.email && invoice.customer.email.includes('@') ? `Email: ${invoice.customer.email}` : null
  ].filter(Boolean).forEach(line => {
    drawText(doc, line as string, contentX, custY, contentW / 2, 14, { fontSize: DESIGN_CONFIG.fonts.small });
    custY += 14;
  });
  // Payment cell
  drawCell(doc, contentX + contentW / 2, y, contentW / 2, custPayH);
  drawText(doc, 'Payment Details:', contentX + contentW / 2, y, contentW / 2, 16, { bold: true, fontSize: DESIGN_CONFIG.fonts.medium });
  let payY = y + 20;
  [
    'Bank: Punjab National Bank',
    'A/C No: 1234567890',
    'IFSC: HDFC0001234',
    'UPI: adhithya@hdfcbank',
    'Payment Terms: Net 15 days',
    'Support: support@adhithyaelectronics.in'
  ].forEach(line => {
    drawText(doc, line, contentX + contentW / 2, payY, contentW / 2, 14, { fontSize: DESIGN_CONFIG.fonts.small });
    payY += 14;
  });

  y += custPayH + 8;

  // --- Line Items Table ---
  const tableColWidths = [180, 50, 50, 80, 85];
  const tableHeaders = ['Description', 'Unit', 'Qty', 'Rate', 'Amount'];
  const tableStartX = contentX;
  const tableStartY = y;
  let tableY = tableStartY;
  // Header row
  let colX = tableStartX;
  for (let i = 0; i < tableHeaders.length; i++) {
    drawCell(doc, colX, tableY, tableColWidths[i], 22, { fill: '#fff' });
    drawText(doc, tableHeaders[i], colX, tableY, tableColWidths[i], 22, { bold: true, fontSize: DESIGN_CONFIG.fonts.small, align: i === 0 ? 'left' : 'right' });
    colX += tableColWidths[i];
  }
  tableY += 22;
  // Line items
  invoice.lineItems.forEach(item => {
    let colX = tableStartX;
    const row = [
      (item.description && item.description !== 'sdfds') ? item.description : 'Product/Service',
      'pcs',
      item.quantity.toString(),
      parseFloat(item.rate).toFixed(2),
      parseFloat(item.amount).toFixed(2)
    ];
    for (let i = 0; i < row.length; i++) {
      drawCell(doc, colX, tableY, tableColWidths[i], 20);
      drawText(doc, row[i], colX, tableY, tableColWidths[i], 20, { fontSize: DESIGN_CONFIG.fonts.small, align: i === 0 ? 'left' : 'right' });
      colX += tableColWidths[i];
    }
    tableY += 20;
  });
  // Totals rows
  const taxRate = invoice.lineItems?.[0]?.taxRate ? ` (${parseFloat(invoice.lineItems[0].taxRate).toFixed(2)}%)` : '';
  const totals = [
    ['Subtotal', '', '', '', '₹ ' + parseFloat(invoice.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })],
    ['Tax' + taxRate, '', '', '', '₹ ' + parseFloat(invoice.taxAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })],
    ['Total', '', '', '', '₹ ' + parseFloat(invoice.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })]
  ];
  totals.forEach((row, idx) => {
    let colX = tableStartX;
    for (let i = 0; i < row.length; i++) {
      drawCell(doc, colX, tableY, tableColWidths[i], 20, { fill: idx === 2 ? '#f4f7fa' : undefined });
      drawText(doc, row[i] ?? '', colX, tableY, tableColWidths[i], 20, { fontSize: DESIGN_CONFIG.fonts.small, bold: i === 0 || idx === 2, align: i === 0 ? 'left' : 'right' });
      colX += tableColWidths[i];
    }
    tableY += 20;
  });

  y = tableY + 8;

  // --- Notes/Terms Table ---
  const notesH = 48;
  drawCell(doc, contentX, y, contentW, notesH);
  drawText(
    (invoice.notes ? invoice.notes + '\n' : '') +
    'Refunds are subject to company policy. For support, contact support@adhithyaelectronics.in. Thank you for your business!',
    contentX, y, contentW, notesH, { fontSize: DESIGN_CONFIG.fonts.small }
  );
  y += notesH + 8;

  // --- Footer Table ---
  const footerH = 28;
  drawCell(doc, contentX, 800 - footerH, contentW, footerH, { fill: '#fff', border: false });
  drawText(
    'Adhithya Electronics | PH: +91 98472 44307 | www.adhithyaelectronics.in | support@adhithyaelectronics.in',
    contentX, 800 - footerH, contentW, footerH, { fontSize: DESIGN_CONFIG.fonts.small, align: 'center' }
  );

  return doc;
}
