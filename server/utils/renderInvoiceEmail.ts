import fs from "fs";
import handlebars from "handlebars";

export function renderInvoiceEmail({
  company_name,
  company_address,
  company_contact,
  customer_name,
  year,
}: {
  company_name: string;
  company_address: string;
  company_contact: string;
  customer_name: string;
  year: string;
}) {
  const templatePath = __dirname + "/../emailTemplates/invoiceEmail.html";
  const templateSource = fs.readFileSync(templatePath, "utf-8");
  const template = handlebars.compile(templateSource);

  return template({
    company_name,
    company_address,
    company_contact,
    customer_name,
    year,
  });
}
