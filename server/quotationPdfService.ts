import axios from 'axios';

const jsreportUrl = process.env.JSREPORT_URL || 'https://jsreport.adhithyablogs.in/api/report';
const jsreportUser = process.env.JSREPORT_USER || 'admin';
const jsreportPassword = process.env.JSREPORT_PASSWORD || '';
const QUOTATION_TEMPLATE_SHORTID = process.env.JSREPORT_QUOTATION_TEMPLATE_SHORTID || '1y6GWFJ';

export async function renderQuotationPdf(quotationData: any) {
  let company = quotationData.company || {};
  if (company.logoUrl && company.logoUrl.startsWith('/uploads/')) {
    company.logoUrl = `https://bills.adhithyaelectronics.in${company.logoUrl}`;
  }
  const bankDetails = {
    bankName: company.bankName || '',
    bankAccount: company.bankAccount || '',
    bankIfsc: company.bankIfsc || '',
    bankUpi: company.bankUpi || ''
  };

  const response = await axios.post(
    jsreportUrl,
    {
      template: { shortid: QUOTATION_TEMPLATE_SHORTID },
      data: {
        ...quotationData,
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
