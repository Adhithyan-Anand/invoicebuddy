import { getJsreportInstance } from './localJsreport';
import fs from 'fs/promises';
import path from 'path';

const QUOTATION_TEMPLATE_PATH = path.resolve(__dirname, '../invoice-jsreport-template.handlebars'); // Use a different template if needed

export async function renderQuotationPdf(quotationData: any) {
  const jsreport = await getJsreportInstance();
  const templateContent = await fs.readFile(QUOTATION_TEMPLATE_PATH, 'utf8');

  // Ensure logoUrl is absolute if needed
  let company = quotationData.company || {};
  if (company.logoUrl && company.logoUrl.startsWith('/uploads/')) {
    company.logoUrl = `https://bills.adhithyaelectronics.in${company.logoUrl}`;
  }
  // Ensure bank details are present
  const bankDetails = {
    bankName: company.bankName || '',
    bankAccount: company.bankAccount || '',
    bankIfsc: company.bankIfsc || '',
    bankUpi: company.bankUpi || ''
  };

  const { stream } = await jsreport.render({
    template: {
      content: templateContent,
      engine: 'handlebars',
      recipe: 'chrome-pdf'
    },
    data: {
      ...quotationData,
      company: { ...company, ...bankDetails }
    },
    options: { preview: false }
  });

  return stream;
}
