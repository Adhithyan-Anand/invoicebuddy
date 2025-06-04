import PDFDocument from 'pdfkit';
import { Invoice, Customer, InvoiceLineItem, Quotation, QuotationLineItem, Company } from '@shared/schema';
import path from 'path';
import fs from 'fs';

// Make sure the 'export' keyword is present here
export function generateInvoicePDF(invoice: Invoice & { customer: Customer; lineItems: InvoiceLineItem[]; company?: Company }): PDFKit.PDFDocument {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  // Add border to the page
  doc.rect(30, 30, 535, 755).stroke();

  let currentY = 50; // Starting Y position

  // Company Details Section
  if (invoice.company) {
    const companyLogoX = 50;
    const companyInfoX = 170; // X position for company text
    const initialCompanyY = 50;
    
    // Logo
    if (invoice.company.logoUrl) {
      try {
        const logoPath = path.join(process.cwd(), 'server', 'uploads', path.basename(invoice.company.logoUrl));
        console.log('Attempting to load logo from:', logoPath); // Debug log
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, companyLogoX, initialCompanyY, { width: 100 });
          currentY = Math.max(currentY, initialCompanyY + 100 + 20); // Move currentY past logo
        } else {
          console.error('Logo file not found at:', logoPath); // Debug log
        }
      } catch (error) {
        console.error('Error loading company logo:', error);
      }
    }

    // Company Info
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .text(invoice.company.name, companyInfoX, initialCompanyY);

    let companyDetailsY = initialCompanyY + 25;
    doc.fontSize(10)
       .font('Helvetica')
       .text(invoice.company.address || '', companyInfoX, companyDetailsY);
    companyDetailsY += 15;

    if (invoice.company.phone) {
      doc.text(`Phone: ${invoice.company.phone}`, companyInfoX, companyDetailsY);
      companyDetailsY += 15;
    }
    if (invoice.company.email) {
      doc.text(`Email: ${invoice.company.email}`, companyInfoX, companyDetailsY);
      companyDetailsY += 15;
    }
    if (invoice.company.website) {
      doc.text(`Website: ${invoice.company.website}`, companyInfoX, companyDetailsY);
      companyDetailsY += 15;
    }
    if (invoice.company.taxNumber) {
      doc.text(`Tax ID: ${invoice.company.taxNumber}`, companyInfoX, companyDetailsY);
      companyDetailsY += 15;
    }
    currentY = Math.max(currentY, companyDetailsY + 40); // Increased spacing after company info
  } else {
    currentY = 50; // If no company info, start lower for other details
  }

  // Invoice Details Section
  doc.fontSize(16)
     .font('Helvetica-Bold')
     .text('INVOICE', 50, currentY);
  currentY += 30;

  doc.fontSize(10)
     .font('Helvetica')
     .text(`Invoice Number: ${invoice.invoiceNumber}`, 50, currentY);
  currentY += 15;
  doc.text(`Date: ${new Date(invoice.date).toLocaleDateString()}`, 50, currentY);
  currentY += 15;
  doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, 50, currentY);
  currentY += 30;

  // Customer Details Section
  doc.fontSize(12)
     .font('Helvetica-Bold')
     .text('Bill To:', 50, currentY);
  currentY += 20;

  doc.fontSize(10)
     .font('Helvetica')
     .text(invoice.customer.name, 50, currentY);
  currentY += 15;
  if (invoice.customer.company) {
    doc.text(invoice.customer.company, 50, currentY);
    currentY += 15;
  }
  if (invoice.customer.address) {
    doc.text(invoice.customer.address, 50, currentY);
    currentY += 15;
  }
  if (invoice.customer.phone) {
    doc.text(`Phone: ${invoice.customer.phone}`, 50, currentY);
    currentY += 15;
  }
  if (invoice.customer.email) {
    doc.text(`Email: ${invoice.customer.email}`, 50, currentY);
    currentY += 15;
  }
  currentY += 20;

  // Line Items Table
  const tableTop = currentY;
  const tableLeft = 50;
  const tableWidth = 495;
  const columnWidth = tableWidth / 4;

  // Table Header
  doc.fontSize(10)
     .font('Helvetica-Bold')
     .text('Description', tableLeft, tableTop)
     .text('Quantity', tableLeft + columnWidth, tableTop)
     .text('Rate', tableLeft + columnWidth * 2, tableTop)
     .text('Amount', tableLeft + columnWidth * 3, tableTop);
  currentY += 20;

  // Table Content
  doc.fontSize(10)
     .font('Helvetica');
  invoice.lineItems.forEach(item => {
    doc.text(item.description, tableLeft, currentY)
       .text(item.quantity.toString(), tableLeft + columnWidth, currentY)
       .text(parseFloat(item.rate).toFixed(2), tableLeft + columnWidth * 2, currentY)
       .text(parseFloat(item.amount).toFixed(2), tableLeft + columnWidth * 3, currentY);
    currentY += 20;
  });

  // Totals
  currentY += 10;
  doc.fontSize(10)
     .font('Helvetica-Bold')
     .text('Subtotal:', tableLeft + columnWidth * 2, currentY)
     .text(parseFloat(invoice.subtotal).toFixed(2), tableLeft + columnWidth * 3, currentY);
  currentY += 15;
  doc.text('Tax:', tableLeft + columnWidth * 2, currentY)
     .text(parseFloat(invoice.taxAmount).toFixed(2), tableLeft + columnWidth * 3, currentY);
  currentY += 15;
  doc.text('Total:', tableLeft + columnWidth * 2, currentY)
     .text(parseFloat(invoice.total).toFixed(2), tableLeft + columnWidth * 3, currentY);

  // Notes
  if (invoice.notes) {
    currentY += 30;
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .text('Notes:', 50, currentY);
    currentY += 15;
    doc.font('Helvetica')
       .text(invoice.notes, 50, currentY);
  }

  // Footer
  const footerY = 750;
  doc.fontSize(8)
     .font('Helvetica')
     .text('Thank you for your business!', 50, footerY);

  // Return the document without ending it
  return doc;
}

export function generateQuotationPDF(quotation: Quotation & { customer: Customer; lineItems: QuotationLineItem[]; company?: Company }): PDFKit.PDFDocument {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
  
    // Add border to the page
    doc.rect(30, 30, 535, 755).stroke();
  
    let currentY = 50; // Starting Y position
  
    // Company Details Section
    if (quotation.company) {
      const companyLogoX = 50;
      const companyInfoX = 170; // X position for company text
      const initialCompanyY = 50;
      
      // Logo
      if (quotation.company.logoUrl) {
        try {
          const logoPath = path.join(process.cwd(), 'server', 'uploads', path.basename(quotation.company.logoUrl));
          console.log('Attempting to load logo from:', logoPath); // Debug log
          if (fs.existsSync(logoPath)) {
            doc.image(logoPath, companyLogoX, initialCompanyY, { width: 100 });
            currentY = Math.max(currentY, initialCompanyY + 100 + 20); // Move currentY past logo
          } else {
            console.error('Logo file not found at:', logoPath); // Debug log
          }
        } catch (error) {
          console.error('Error loading company logo:', error);
        }
      }
  
      // Company Info
      doc.fontSize(20)
         .font('Helvetica-Bold')
         .text(quotation.company.name, companyInfoX, initialCompanyY);
  
      let companyDetailsY = initialCompanyY + 25;
      doc.fontSize(10)
         .font('Helvetica')
         .text(quotation.company.address || '', companyInfoX, companyDetailsY);
      companyDetailsY += 15;
  
      if (quotation.company.phone) {
        doc.text(`Phone: ${quotation.company.phone}`, companyInfoX, companyDetailsY);
        companyDetailsY += 15;
      }
      if (quotation.company.email) {
        doc.text(`Email: ${quotation.company.email}`, companyInfoX, companyDetailsY);
        companyDetailsY += 15;
      }
      if (quotation.company.website) {
        doc.text(`Website: ${quotation.company.website}`, companyInfoX, companyDetailsY);
        companyDetailsY += 15;
      }
      if (quotation.company.taxNumber) {
        doc.text(`Tax ID: ${quotation.company.taxNumber}`, companyInfoX, companyDetailsY);
        companyDetailsY += 15;
      }
      currentY = Math.max(currentY, companyDetailsY + 40); // Increased spacing after company info
    } else {
      currentY = 50; // If no company info, start lower for other details
    }
  
    // Quotation Title and Details
    const quotationTitleX = 400; // X position for right-aligned text
    let quotationDetailsCurrentY = 50; // Starting Y for quotation details
  
    doc.fontSize(24)
       .font('Helvetica-Bold')
       .text('QUOTATION', quotationTitleX, quotationDetailsCurrentY, { align: 'right' });
    quotationDetailsCurrentY += 30;
  
    doc.fontSize(10)
       .font('Helvetica')
       .text(`Quotation Number: ${quotation.quotationNumber}`, quotationTitleX, quotationDetailsCurrentY, { align: 'right' });
    quotationDetailsCurrentY += 15;
    doc.text(`Date: ${new Date(quotation.date).toLocaleDateString()}`, quotationTitleX, quotationDetailsCurrentY, { align: 'right' });
    quotationDetailsCurrentY += 15;
    doc.text(`Valid Until: ${new Date(quotation.validUntil).toLocaleDateString()}`, quotationTitleX, quotationDetailsCurrentY, { align: 'right' });
    quotationDetailsCurrentY += 15;
    doc.text(`Status: ${quotation.status.toUpperCase()}`, quotationTitleX, quotationDetailsCurrentY, { align: 'right' });
    quotationDetailsCurrentY += 25;
  
    currentY = Math.max(currentY, quotationDetailsCurrentY + 20); // Ensure currentY is below the quotation details
  
    // Customer Details Section
    currentY += 40; // Increased spacing before customer details
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('Quote To:', 50, currentY);
    currentY += 20;
  
    doc.fontSize(10)
       .font('Helvetica')
       .text(quotation.customer.name, 50, currentY);
    currentY += 15;
  
    if (quotation.customer.company) {
      doc.text(quotation.customer.company, 50, currentY);
      currentY += 15;
    }
    if (quotation.customer.address) {
      doc.text(quotation.customer.address, 50, currentY);
      currentY += 15;
    }
    if (quotation.customer.phone) {
      doc.text(`Phone: ${quotation.customer.phone}`, 50, currentY);
      currentY += 15;
    }
    if (quotation.customer.email) {
      doc.text(`Email: ${quotation.customer.email}`, 50, currentY);
      currentY += 15;
    }
    currentY += 40; // Increased spacing after customer details
  
    // Line Items Table
    const tableTop = currentY;
    const startX = 50;
    const endX = 535;
    const tableWidth = endX - startX;
  
    const descriptionWidth = tableWidth * 0.45; // 45% of table width
    const quantityWidth = tableWidth * 0.15; // 15%
    const rateWidth = tableWidth * 0.20;     // 20%
    const amountWidth = tableWidth * 0.20;    // 20%
  
    // Table Header with background
    doc.fillColor('#f0f0f0')
       .rect(startX, tableTop - 5, tableWidth, 25)
       .fill()
       .fillColor('#000000');
  
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .text('Description', startX + 5, tableTop + 5, { width: descriptionWidth, align: 'left' })
       .text('Qty', startX + descriptionWidth + 5, tableTop + 5, { width: quantityWidth, align: 'center' })
       .text('Rate', startX + descriptionWidth + quantityWidth + 5, tableTop + 5, { width: rateWidth, align: 'right' })
       .text('Amount', startX + descriptionWidth + quantityWidth + rateWidth + 5, tableTop + 5, { width: amountWidth, align: 'right' });
  
    // Table Border below header
    doc.moveTo(startX, tableTop + 20)
       .lineTo(endX, tableTop + 20)
       .stroke();
  
    // Table Content
    let y = tableTop + 30;
    quotation.lineItems.forEach((item, index) => {
      // Check for page break
      if (y + 30 > doc.page.height - 70) { // If content goes too low, add a new page
        doc.addPage();
        doc.rect(30, 30, 535, 755).stroke(); // Redraw border on new page
        y = 50; // Reset Y for new page
        // Redraw header on new page for continuity
        doc.fillColor('#f0f0f0')
           .rect(startX, y - 5, tableWidth, 25)
           .fill()
           .fillColor('#000000');
  
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .text('Description', startX + 5, y + 5, { width: descriptionWidth, align: 'left' })
           .text('Qty', startX + descriptionWidth + 5, y + 5, { width: quantityWidth, align: 'center' })
           .text('Rate', startX + descriptionWidth + quantityWidth + 5, y + 5, { width: rateWidth, align: 'right' })
           .text('Amount', startX + descriptionWidth + quantityWidth + rateWidth + 5, y + 5, { width: amountWidth, align: 'right' });
  
        doc.moveTo(startX, y + 20)
           .lineTo(endX, y + 20)
           .stroke();
        y += 30; // Adjust y to start writing content below the new header
      }
  
      doc.fontSize(10)
         .font('Helvetica')
         .text(item.description, startX + 5, y, { width: descriptionWidth, align: 'left' })
         .text(item.quantity.toString(), startX + descriptionWidth + 5, y, { width: quantityWidth, align: 'center' })
         .text(`$${parseFloat(item.rate.toString()).toFixed(2)}`, startX + descriptionWidth + quantityWidth + 5, y, { width: rateWidth, align: 'right' })
         .text(`$${parseFloat(item.amount.toString()).toFixed(2)}`, startX + descriptionWidth + quantityWidth + rateWidth + 5, y, { width: amountWidth, align: 'right' });
  
      y += 20;
  
      // Add separator line between items
      if (index < quotation.lineItems.length - 1) {
        doc.moveTo(startX, y)
           .lineTo(endX, y)
           .stroke();
        y += 10;
      }
    });
  
    // Totals Section
    let totalsTop = y + 20;
  
    // Check if totals section will fit on current page, if not, add a new page
    if (totalsTop + 80 > doc.page.height - 50) {
      doc.addPage();
      doc.rect(30, 30, 535, 755).stroke();
      totalsTop = 50; // Reset totalsTop for the new page
    }
  
    const totalsLabelX = startX + descriptionWidth + quantityWidth;
    const totalsValueX = totalsLabelX + rateWidth; // Align with the right of the Rate column
  
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .text('Subtotal:', totalsLabelX, totalsTop, { width: rateWidth, align: 'right' })
       .text(`$${parseFloat(quotation.subtotal.toString()).toFixed(2)}`, totalsValueX, totalsTop, { width: amountWidth, align: 'right' });
    totalsTop += 20;
  
    doc.text('Tax:', totalsLabelX, totalsTop, { width: rateWidth, align: 'right' })
       .text(`$${parseFloat(quotation.taxAmount.toString()).toFixed(2)}`, totalsValueX, totalsTop, { width: amountWidth, align: 'right' });
    totalsTop += 20;
  
    doc.text('Total:', totalsLabelX, totalsTop, { width: rateWidth, align: 'right' })
       .text(`$${parseFloat(quotation.total.toString()).toFixed(2)}`, totalsValueX, totalsTop, { width: amountWidth, align: 'right' });
    totalsTop += 40;
  
    // Notes Section
    if (quotation.notes) {
      if (totalsTop + 80 > doc.page.height - 50) { // Check if notes will fit
        doc.addPage();
        doc.rect(30, 30, 535, 755).stroke();
        totalsTop = 50;
      }
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .text('Notes:', startX, totalsTop);
      doc.font('Helvetica')
         .text(quotation.notes, startX, totalsTop + 15, { width: tableWidth });
      totalsTop += 15 + doc.heightOfString(quotation.notes, { width: tableWidth }) + 20;
    }
  
    // Footer
    // Check if footer fits, if not, add a new page
    if (700 > doc.page.height - 50) {
      doc.addPage();
      doc.rect(30, 30, 535, 755).stroke();
    }
    doc.fontSize(8)
       .font('Helvetica')
       .text('Thank you for your business!', 50, 700, { align: 'center', width: 500 });
  
    // DO NOT call doc.end() here — caller should do it after handling the stream
    return doc;
  }
  