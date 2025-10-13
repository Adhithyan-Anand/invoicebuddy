import axios from 'axios';


// Hardcoded credentials for jsreport cloud (use env vars in production)
const jsreportUrl = process.env.JSREPORT_URL || '';
const jsreportUser = process.env.JSREPORT_USER || '';
const jsreportPassword = process.env.JSREPORT_PASSWORD || '';
const INVOICE_TEMPLATE_SHORTID = process.env.JSREPORT_INVOICE_TEMPLATE_SHORTID || '1y6GWFJ';

export async function renderInvoicePdf(invoiceData: any) {
  // Ensure logoUrl is absolute if needed (for jsreport cloud)
  let company = invoiceData.company || {};
  if (company.logoUrl && company.logoUrl.startsWith('/uploads/')) {
    // Replace with your public URL or tunnel URL
    company.logoUrl = `https://bills.adhithyaelectronics.in${company.logoUrl}`;
  }
  // Ensure bank details are present
  const bankDetails = {
    bankName: company.bankName || '',
    bankAccount: company.bankAccount || '',
    bankIfsc: company.bankIfsc || '',
    bankUpi: company.bankUpi || ''
  };

  const response = await axios.post(
    jsreportUrl,
    {
      template: { shortid: INVOICE_TEMPLATE_SHORTID },
      data: {
        ...invoiceData,
        company: { ...company, ...bankDetails }
      }
    },
    {
      responseType: 'stream',
      auth: {
        username: jsreportUser,
        password: jsreportPassword
      }
    }
  );
  return response.data; // This is a readable stream
}
