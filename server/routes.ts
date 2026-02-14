import express, { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import cookieParser from "cookie-parser";
import { storage as dbStorage } from "./storage";
import { authenticate, hashPassword, verifyPassword, generateToken } from "./auth";
import { z } from "zod";
import dotenv from 'dotenv';
import { generateInvoicePDF } from './pdfGenerator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Resend } from 'resend';
import { User } from '@shared/schema';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import {
  resolveEmailTemplate,
  resolveDocumentTemplate,
  listEmailTemplates,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  listDocumentTemplates,
  createDocumentTemplate,
  updateDocumentTemplate,
  deleteDocumentTemplate,
} from './templates/repository';
import {
  buildDefaultInvoiceEmailHtml,
  buildDefaultInvoiceEmailSubject,
  buildDefaultPaymentConfirmationHtml,
  buildDefaultPaymentConfirmationSubject,
  compileUserTemplate,
} from './utils/emailRenderer';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

// Configure multer for file uploads
const fileStorage = multer.diskStorage({
  destination: function (_req: Express.Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (_req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: fileStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG and GIF are allowed.'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(cookieParser());

  // Authentication routes
  app.post('/api/register', async (req: Request, res: Response) => {
    try {
      const data = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await dbStorage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Hash password and create user
      const hashedPassword = await hashPassword(data.password);
      const user = await dbStorage.createUser({
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName || null,
        lastName: data.lastName || null,
      });

      // Generate token and set cookie
      const token = generateToken(user.id);
      res.cookie('token', token, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Registration error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to register user' });
    }
  });

  app.post('/api/login', async (req: Request, res: Response) => {
    try {
      const data = loginSchema.parse(req.body);
      
      // Find user by email
      const user = await dbStorage.getUserByEmail(data.email);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Verify password
      const isValidPassword = await verifyPassword(data.password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Generate token and set cookie
      const token = generateToken(user.id);
      res.cookie('token', token, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to login' });
    }
  });

  app.post('/api/logout', (req: Request, res: Response) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
  });

  app.get('/api/auth/user', authenticate as any, async (req: any, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // Return user without password
      const { password: _, ...userWithoutPassword } = req.user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Add this route before the company routes
  app.post('/api/upload/logo', authenticate as any, upload.single('logo'), async (req: any, res: Response) => {
    try {
      if (!req.file) {
        console.error('No file uploaded');
        return res.status(400).json({ message: 'No file uploaded' });
      }

      // Create a URL for the uploaded file
      const fileUrl = `${process.env.FRONTEND_URL}/uploads/${req.file.filename}`;
      console.log('File uploaded successfully:', {
        filename: req.file.filename,
        url: fileUrl,
        size: req.file.size,
        mimetype: req.file.mimetype
      });
      
      res.json({ url: fileUrl });
    } catch (error) {
      console.error('File upload error:', error);
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'File size too large. Maximum size is 5MB.' });
        }
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: 'Failed to upload file' });
    }
  });

  // Serve uploaded files
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  // Autocorrect endpoint
  app.post('/api/autocorrect', authenticate as any, async (req: any, res: Response) => {
    try {
      const { texts } = req.body;
      if (!Array.isArray(texts) || texts.length === 0) {
        return res.status(400).json({ message: "No texts provided" });
      }
      // Get company and OpenAI API key
      const company = await dbStorage.getCompanyByUserId(req.user!.id);
      if (!company?.openAiApiKey) {
        return res.status(400).json({ message: "OpenAI API key not set in company profile" });
      }
      // Call OpenAI API for autocorrect
      const prompt = texts.map((t, i) => `Q${i + 1}: ${t}`).join('\n');
      const systemPrompt =
        company.openAiAutocorrectInstructions?.trim() ||
        "You are a helpful assistant that corrects spelling and grammar mistakes in product names and short descriptions. Only return the corrected text, one per line, in the same order.";
      const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${company.openAiApiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4.1",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
          ],
          max_tokens: 256,
          temperature: 0.2,
        }),
      });
      if (!openaiRes.ok) {
        const err = await openaiRes.text();
        return res.status(500).json({ message: "OpenAI API error", error: err });
      }
      const data = await openaiRes.json();
      const output = data.choices?.[0]?.message?.content || "";
      // Split output into lines, trim, and map to original order
      const corrected = output.split('\n').map(line => line.replace(/^Q\d+:\s*/, '').trim()).filter(Boolean);
      // Pad to match input length
      while (corrected.length < texts.length) corrected.push("");
      res.json({ corrected });
    } catch (error) {
      console.error("Autocorrect error:", error);
      res.status(500).json({ message: "Failed to autocorrect", error: error instanceof Error ? error.message : error });
    }
  });

  // AI Settings endpoints
  app.get('/api/ai-settings', authenticate as any, async (req: any, res: Response) => {
    try {
      const company = await dbStorage.getCompanyByUserId(req.user!.id);
      if (!company) return res.status(404).json({ message: "Company not found" });
      let maskedKey = "";
      if (company.openAiApiKey && typeof company.openAiApiKey === "string") {
        const key = company.openAiApiKey;
        maskedKey =
          key.length > 8
            ? key.slice(0, 4) + "****" + key.slice(-4)
            : "****" + key.slice(-4);
      }
      res.json({
        openAiApiKeySet: !!company.openAiApiKey,
        maskedKey,
        openAiAutocorrectInstructions: company.openAiAutocorrectInstructions || "",
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch AI settings" });
    }
  });

  app.put('/api/ai-settings', authenticate as any, async (req: any, res: Response) => {
    try {
      const { openAiApiKey, openAiAutocorrectInstructions } = req.body;
      const update: any = {};
      if (typeof openAiApiKey === "string") update.openAiApiKey = openAiApiKey;
      if (typeof openAiAutocorrectInstructions === "string") update.openAiAutocorrectInstructions = openAiAutocorrectInstructions;
      const company = await dbStorage.updateCompany(req.user!.id, update);
      res.json({
        openAiApiKeySet: !!company.openAiApiKey,
        openAiAutocorrectInstructions: company.openAiAutocorrectInstructions || "",
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to update AI settings" });
    }
  });

  // Company routes
  app.get('/api/company', authenticate as any, async (req: any, res: Response) => {
    try {
      const company = await dbStorage.getCompanyByUserId(req.user!.id);
      if (company) {
        // Do not expose openAiApiKey in GET response
        const { openAiApiKey, ...safeCompany } = company;
        res.json({
          ...safeCompany,
          openAiApiKeySet: typeof openAiApiKey === "string" && openAiApiKey.length > 0
        });
      } else {
        res.json(null);
      }
    } catch (error) {
      console.error('Error fetching company:', error);
      res.status(500).json({ message: 'Failed to fetch company' });
    }
  });

  app.post('/api/company', authenticate as any, async (req: any, res: Response) => {
    try {
      const company = await dbStorage.createCompany({
        ...req.body,
        userId: req.user!.id,
      });
      res.json(company);
    } catch (error) {
      console.error('Error creating company:', error);
      res.status(500).json({ message: 'Failed to create company' });
    }
  });

  app.put('/api/company', authenticate as any, async (req: any, res: Response) => {
    try {
      const company = await dbStorage.updateCompany(req.user!.id, req.body);
      res.json(company);
    } catch (error) {
      console.error('Error updating company:', error);
      res.status(500).json({ message: 'Failed to update company' });
    }
  });

  // Customer routes
  app.get('/api/customers', authenticate as any, async (req: any, res: Response) => {
    try {
      const customers = await dbStorage.getCustomersByUserId(req.user!.id);
      res.json(customers);
    } catch (error) {
      console.error('Error fetching customers:', error);
      res.status(500).json({ message: 'Failed to fetch customers' });
    }
  });

  app.get('/api/customers/:id', authenticate as any, async (req: any, res: Response) => {
    try {
      const customer = await dbStorage.getCustomerById(parseInt(req.params.id), req.user!.id);
      if (!customer) {
        return res.status(404).json({ message: 'Customer not found' });
      }
      res.json(customer);
    } catch (error) {
      console.error('Error fetching customer:', error);
      res.status(500).json({ message: 'Failed to fetch customer' });
    }
  });

  app.post('/api/customers', authenticate as any, async (req: any, res: Response) => {
    try {
      const customer = await dbStorage.createCustomer({
        ...req.body,
        userId: req.user!.id,
      });
      res.json(customer);
    } catch (error) {
      console.error('Error creating customer:', error);
      res.status(500).json({ message: 'Failed to create customer' });
    }
  });

  app.put('/api/customers/:id', authenticate as any, async (req: any, res: Response) => {
    try {
      const customer = await dbStorage.updateCustomer(parseInt(req.params.id), req.user!.id, req.body);
      res.json(customer);
    } catch (error) {
      console.error('Error updating customer:', error);
      res.status(500).json({ message: 'Failed to update customer' });
    }
  });

  app.delete('/api/customers/:id', authenticate as any, async (req: any, res: Response) => {
    try {
      await dbStorage.deleteCustomer(parseInt(req.params.id), req.user!.id);
      res.json({ message: 'Customer deleted successfully' });
    } catch (error) {
      console.error('Error deleting customer:', error);
      res.status(500).json({ message: 'Failed to delete customer' });
    }
  });

  // Invoice routes
  app.get('/api/invoices', authenticate as any, async (req: any, res: Response) => {
    try {
      const invoices = await dbStorage.getInvoicesByUserId(req.user!.id);
      res.json(invoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      res.status(500).json({ message: 'Failed to fetch invoices' });
    }
  });

  // Invoice search route
  app.get('/api/invoices/search', authenticate as any, async (req: any, res: Response) => {
    try {
      const query = typeof req.query.query === "string" ? req.query.query : "";
      const limit = req.query.limit ? parseInt(req.query.limit) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset) : 0;
      if (!query.trim()) {
        return res.status(400).json({ message: "Missing search query" });
      }
      const { results, total } = await dbStorage.searchInvoicesByUserId(req.user!.id, query, limit, offset);
      res.json({ results, total });
    } catch (error) {
      console.error('Error searching invoices:', error);
      res.status(500).json({ message: 'Failed to search invoices' });
    }
  });

  app.get('/api/invoices/next-number', authenticate as any, async (req: any, res: Response) => {
    try {
      const number = await dbStorage.getNextInvoiceNumber(req.user!.id);
      res.json({ number });
    } catch (error) {
      console.error('Error fetching invoice next number:', error);
      res.status(500).json({ message: 'Failed to fetch invoice number' });
    }
  });

  app.get('/api/invoices/:id', authenticate as any, async (req: any, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid invoice ID' });
      }
      const invoice = await dbStorage.getInvoiceWithDetails(id, req.user!.id);
      if (!invoice) {
        return res.status(404).json({ message: 'Invoice not found' });
      }
      res.json(invoice);
    } catch (error) {
      console.error('Error fetching invoice:', error);
      res.status(500).json({ message: 'Failed to fetch invoice' });
    }
  });

  app.post('/api/invoices', authenticate as any, async (req: any, res: Response) => {
    try {
      const { lineItems, ...invoiceData } = req.body;
      
      const invoiceNumber = await dbStorage.getNextInvoiceNumber(req.user!.id);
      
      // Generate a secure payment token
      const paymentToken = crypto.randomBytes(32).toString('hex');
      
      // Convert date strings to Date objects and ensure proper types
      const invoice = await dbStorage.createInvoice({
        ...invoiceData,
        customerId: parseInt(invoiceData.customerId),
        date: invoiceData.date ? new Date(invoiceData.date) : new Date(),
        dueDate: invoiceData.dueDate ? new Date(invoiceData.dueDate) : new Date(),
        invoiceNumber,
        userId: req.user!.id,
        paymentToken,
      });

      if (lineItems && lineItems.length > 0) {
        await dbStorage.createInvoiceLineItems(
          lineItems.map((item: any) => ({
            ...item,
            invoiceId: invoice.id,
            quantity: parseFloat(item.quantity),
            rate: parseFloat(item.rate),
            taxRate: parseFloat(item.taxRate),
            amount: parseFloat(item.amount),
          }))
        );
      }

      const invoiceWithDetails = await dbStorage.getInvoiceWithDetails(invoice.id, req.user!.id);
      res.json(invoiceWithDetails);
    } catch (error) {
      console.error('Error creating invoice:', error);
      res.status(500).json({ message: 'Failed to create invoice' });
    }
  });

  app.put('/api/invoices/:id', authenticate as any, async (req: any, res: Response) => {
    try {
      const { lineItems, ...invoiceData } = req.body;
      
      // Convert date strings to Date objects for update
      const processedData = {
        ...invoiceData,
        customerId: invoiceData.customerId ? parseInt(invoiceData.customerId) : undefined,
        date: invoiceData.date ? new Date(invoiceData.date) : undefined,
        dueDate: invoiceData.dueDate ? new Date(invoiceData.dueDate) : undefined,
      };
      
      const invoice = await dbStorage.updateInvoice(parseInt(req.params.id), req.user!.id, processedData);

      if (lineItems) {
        await dbStorage.updateInvoiceLineItems(
          invoice.id,
          lineItems.map((item: any) => ({
            ...item,
            invoiceId: invoice.id,
            quantity: parseFloat(item.quantity),
            rate: parseFloat(item.rate),
            taxRate: parseFloat(item.taxRate),
            amount: parseFloat(item.amount),
          }))
        );
      }

      const invoiceWithDetails = await dbStorage.getInvoiceWithDetails(invoice.id, req.user!.id);
      res.json(invoiceWithDetails);
    } catch (error) {
      console.error('Error updating invoice:', error);
      res.status(500).json({ message: 'Failed to update invoice' });
    }
  });

  app.delete('/api/invoices/:id', authenticate as any, async (req: any, res: Response) => {
    try {
      await dbStorage.deleteInvoice(parseInt(req.params.id), req.user!.id);
      res.json({ message: 'Invoice deleted successfully' });
    } catch (error) {
      console.error('Error deleting invoice:', error);
      res.status(500).json({ message: 'Failed to delete invoice' });
    }
  });

  // Quotation routes
  app.get('/api/quotations', authenticate as any, async (req: any, res: Response) => {
    try {
      const quotations = await dbStorage.getQuotationsByUserId(req.user!.id);
      res.json(quotations);
    } catch (error) {
      console.error('Error fetching quotations:', error);
      res.status(500).json({ message: 'Failed to fetch quotations' });
    }
  });

  app.get('/api/quotations/next-number', authenticate as any, async (req: any, res: Response) => {
    try {
      const number = await dbStorage.getNextQuotationNumber(req.user!.id);
      res.json({ number });
    } catch (error) {
      console.error('Error fetching quotation next number:', error);
      res.status(500).json({ message: 'Failed to fetch quotation number' });
    }
  });

  app.get('/api/quotations/:id', authenticate as any, async (req: any, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid quotation ID' });
      }
      const quotation = await dbStorage.getQuotationWithDetails(id, req.user!.id);
      if (!quotation) {
        return res.status(404).json({ message: 'Quotation not found' });
      }
      res.json(quotation);
    } catch (error) {
      console.error('Error fetching quotation:', error);
      res.status(500).json({ message: 'Failed to fetch quotation' });
    }
  });

  app.post('/api/quotations', authenticate as any, async (req: any, res: Response) => {
    try {
      const { lineItems, ...quotationData } = req.body;
      
      const quotationNumber = await dbStorage.getNextQuotationNumber(req.user!.id);
      
      // Convert date strings to Date objects
      const quotation = await dbStorage.createQuotation({
        ...quotationData,
        customerId: parseInt(quotationData.customerId),
        date: quotationData.date ? new Date(quotationData.date) : new Date(),
        validUntil: quotationData.validUntil ? new Date(quotationData.validUntil) : new Date(),
        quotationNumber,
        userId: req.user!.id,
      });

      if (lineItems && lineItems.length > 0) {
        await dbStorage.createQuotationLineItems(
          lineItems.map((item: any) => ({
            ...item,
            quotationId: quotation.id,
            quantity: parseFloat(item.quantity),
            rate: parseFloat(item.rate),
            taxRate: parseFloat(item.taxRate),
            amount: parseFloat(item.amount),
          }))
        );
      }

      const quotationWithDetails = await dbStorage.getQuotationWithDetails(quotation.id, req.user!.id);
      res.json(quotationWithDetails);
    } catch (error) {
      console.error('Error creating quotation:', error);
      console.error('Request body:', req.body);
      res.status(500).json({ 
        message: 'Failed to create quotation',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.put('/api/quotations/:id', authenticate as any, async (req: any, res: Response) => {
    try {
      const { lineItems, ...quotationData } = req.body;
      
      // Convert date strings to Date objects for update
      const processedData = {
        ...quotationData,
        customerId: quotationData.customerId ? parseInt(quotationData.customerId) : undefined,
        date: quotationData.date ? new Date(quotationData.date) : undefined,
        validUntil: quotationData.validUntil ? new Date(quotationData.validUntil) : undefined,
      };
      
      const quotation = await dbStorage.updateQuotation(parseInt(req.params.id), req.user!.id, processedData);

      if (lineItems) {
        await dbStorage.updateQuotationLineItems(
          quotation.id,
          lineItems.map((item: any) => ({
            ...item,
            quotationId: quotation.id,
            quantity: parseFloat(item.quantity),
            rate: parseFloat(item.rate),
            taxRate: parseFloat(item.taxRate),
            amount: parseFloat(item.amount),
          }))
        );
      }

      const quotationWithDetails = await dbStorage.getQuotationWithDetails(quotation.id, req.user!.id);
      res.json(quotationWithDetails);
    } catch (error) {
      console.error('Error updating quotation:', error);
      res.status(500).json({ message: 'Failed to update quotation' });
    }
  });

  app.delete('/api/quotations/:id', authenticate as any, async (req: any, res: Response) => {
    try {
      await dbStorage.deleteQuotation(parseInt(req.params.id), req.user!.id);
      res.json({ message: 'Quotation deleted successfully' });
    } catch (error) {
      console.error('Error deleting quotation:', error);
      res.status(500).json({ message: 'Failed to delete quotation' });
    }
  });

  // PDF download routes
  app.get('/api/invoices/:id/pdf', authenticate as any, async (req: any, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid invoice ID' });
      }
      
      const invoice = await dbStorage.getInvoiceWithDetails(id, req.user!.id);
      if (!invoice) {
        return res.status(404).json({ message: 'Invoice not found' });
      }

      // Get type from query, default to "full"
      const type = typeof req.query.type === "string" && req.query.type === "minimal" ? "minimal" : "full";
      
      // Use jsreport cloud to render invoice PDF
      const { renderInvoicePdf } = await import('./invoicePdfService');
      const pdfStream = await renderInvoicePdf(invoice, type);

      res.setHeader('Content-Type', 'application/pdf');
      // Sanitize customer name for filename
      const customerName = invoice.customer?.name
        ? invoice.customer.name.replace(/[^a-zA-Z0-9 _-]/g, '').replace(/\s+/g, '_')
        : 'Customer';
      res.setHeader('Content-Disposition', `attachment; filename=invoice-${customerName}-${invoice.invoiceNumber}.pdf`);
      pdfStream.pipe(res);
    } catch (error) {
      console.error('Error generating invoice PDF:', error);
      res.status(500).json({ message: 'Failed to generate PDF' });
    }
  });

  app.get('/api/quotations/:id/pdf', authenticate as any, async (req: any, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid quotation ID' });
      }
      
      const quotation = await dbStorage.getQuotationWithDetails(id, req.user!.id);
      if (!quotation) {
        return res.status(404).json({ message: 'Quotation not found' });
      }
      
      // Use jsreport cloud to render quotation PDF
      const { renderQuotationPdf } = await import('./quotationPdfService');
      const pdfStream = await renderQuotationPdf(quotation);

      res.setHeader('Content-Type', 'application/pdf');
      // Sanitize customer name for filename
      const customerName = quotation.customer?.name
        ? quotation.customer.name.replace(/[^a-zA-Z0-9 _-]/g, '').replace(/\s+/g, '_')
        : 'Customer';
      res.setHeader('Content-Disposition', `attachment; filename=quotation-${customerName}-${quotation.quotationNumber}.pdf`);
      pdfStream.pipe(res);
    } catch (error) {
      console.error('Error generating quotation PDF:', error);
      res.status(500).json({ message: 'Failed to generate PDF' });
    }
  });

  // Dashboard statistics
  app.get('/api/dashboard/stats', authenticate as any, async (req: any, res: Response) => {
    try {
      const stats = await dbStorage.getDashboardStats(req.user!.id);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ message: 'Failed to fetch dashboard statistics' });
    }
  });

  // Add this route after the invoice PDF download route
  app.post('/api/invoices/:id/send-email', authenticate as any, async (req: any, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const userId = (req.user as User).id;
      const invoice = await dbStorage.getInvoiceWithDetails(id, userId);

      if (!invoice) {
        res.status(404).json({ error: 'Invoice not found' });
        return;
      }
      if (!invoice.customer?.email) {
        res.status(400).json({ error: 'Customer email not found' });
        return;
      }

      // Check if Resend API key is configured
      if (!process.env.RESEND_API_KEY) {
        console.error('RESEND_API_KEY is not configured');
        res.status(500).json({ error: 'Email service is not configured' });
        return;
      }

      console.log('Resend API Key found:', process.env.RESEND_API_KEY ? 'Yes' : 'No');
      console.log('Environment variables loaded:', {
        NODE_ENV: process.env.NODE_ENV,
        RESEND_API_KEY: process.env.RESEND_API_KEY ? 'Present' : 'Missing'
      });

      // Generate PDF as a Buffer
      const doc = generateInvoicePDF(invoice);
      const chunks: Buffer[] = [];
      
      // Create a promise that resolves when the PDF is fully generated
      const pdfPromise = new Promise<Buffer>((resolve, reject) => {
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        doc.end();
      });

      // Wait for the PDF to be fully generated
      const pdfBuffer = await pdfPromise;
      console.log('PDF generated successfully, size:', pdfBuffer.length);

      // Send the email with the generated PDF
      const resend = new Resend(process.env.RESEND_API_KEY);
      const customerEmail = invoice.customer.email as string;
      
      console.log('Attempting to send email:', {
        from: 'invoicebuddy@adhithyaelectronics.in',
        to: customerEmail,
        subject: `Invoice ${invoice.invoiceNumber} from ${invoice.company?.name || 'Your Company'}`,
        attachmentSize: pdfBuffer.length
      });

      // Resolve email template (customer -> company -> user), fallback to default
      const ctx = {
        frontendUrl: process.env.FRONTEND_URL,
        company: invoice.company || null,
        customer: invoice.customer || null,
        invoice: {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          date: invoice.date,
          dueDate: invoice.dueDate,
          subtotal: Number(invoice.subtotal),
          taxAmount: Number(invoice.taxAmount),
          total: Number(invoice.total),
          notes: invoice.notes || null,
          paymentToken: invoice.paymentToken || null,
        },
        payUrl: `${process.env.FRONTEND_URL || 'http://127.0.0.1:5000'}/pay/${invoice.paymentToken ?? ''}`,
      };

      const customTemplate = await resolveEmailTemplate(userId, 'invoice_email', {
        customerId: invoice.customer.id,
        companyId: invoice.company?.id,
      });

      let subject = buildDefaultInvoiceEmailSubject(ctx);
      let html = buildDefaultInvoiceEmailHtml(ctx);
      if (customTemplate) {
        subject = compileUserTemplate(customTemplate.subject, ctx);
        html = compileUserTemplate(customTemplate.html, ctx);
      }

      const emailResponse = await resend.emails.send({
        from: 'invoicebuddy@adhithyaelectronics.in',
        to: [customerEmail],
        subject,
        html,
        attachments: [
          {
            filename: `Invoice-${invoice.invoiceNumber}.pdf`,
            content: pdfBuffer.toString('base64'),
          },
        ],
      });

      console.log('Email sent successfully:', emailResponse);

      // Send success response only after everything is done
      res.json({ success: true });
    } catch (err) {
      console.error('Error sending email:', err);
      if (err instanceof Error) {
        console.error('Error details:', {
          message: err.message,
          stack: err.stack,
          name: err.name
        });
      }
      res.status(500).json({ 
        error: 'Failed to send email',
        details: err instanceof Error ? err.message : 'Unknown error'
      });
    }
  });

  // Add Razorpay payment route by token
  app.post('/api/invoices/payment/:token', async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid token' });
      }
      // Fetch invoice by paymentToken
      const invoice = await dbStorage.getInvoiceByToken(token);
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      // Initialize Razorpay
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID!,
        key_secret: process.env.RAZORPAY_KEY_SECRET!
      });
      // Create Razorpay order
      const order = await razorpay.orders.create({
        amount: Math.round(Number(invoice.total) * 100), // Convert to paise
        currency: 'INR',
        receipt: `invoice_${invoice.invoiceNumber}`,
        notes: {
          paymentToken: invoice.paymentToken
        }
      });
      res.json({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID
      });
    } catch (error) {
      console.error('Error creating payment:', error);
      res.status(500).json({ error: 'Failed to create payment' });
    }
  });

  // Add payment verification route
  app.post('/api/payment/verify', async (req: Request, res: Response) => {
    try {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      } = req.body;

      // Create Razorpay instance
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID!,
        key_secret: process.env.RAZORPAY_KEY_SECRET!
      });

      // Verify signature
      const generated_signature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
        .update(razorpay_order_id + '|' + razorpay_payment_id)
        .digest('hex');

      if (generated_signature === razorpay_signature) {
        // Payment is successful
        const order = await razorpay.orders.fetch(razorpay_order_id);
        // Robustly check for order.notes and required fields
        if (!order.notes || !order.notes.paymentToken) {
          return res.status(400).json({ error: 'Order notes missing paymentToken' });
        }
        const paymentToken = String(order.notes.paymentToken);
        const invoice = await dbStorage.getInvoiceWithDetailsByToken(paymentToken);

        if (!invoice) {
          return res.status(404).json({ error: 'Invoice not found' });
        }
        const recipient = invoice.customer?.email || invoice.user?.email;
        if (recipient) {
          // Send payment confirmation email with custom template if available
          const resend = new Resend(process.env.RESEND_API_KEY);
          const ctx = {
            frontendUrl: process.env.FRONTEND_URL,
            company: invoice.company || null,
            customer: invoice.customer || null,
            invoice: {
              id: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              total: Number(invoice.total),
            },
            paymentId: razorpay_payment_id,
            date: new Date(),
          };
          const customTemplate = await resolveEmailTemplate(invoice.userId, 'payment_confirmation_email', {
            customerId: invoice.customer?.id ?? undefined,
            companyId: invoice.company?.id,
          });
          let subject = buildDefaultPaymentConfirmationSubject(ctx);
          let html = buildDefaultPaymentConfirmationHtml(ctx);
          if (customTemplate) {
            subject = compileUserTemplate(customTemplate.subject, ctx);
            html = compileUserTemplate(customTemplate.html, ctx);
          }
          await resend.emails.send({
            from: 'invoicebuddy@adhithyaelectronics.in',
            to: [recipient],
            subject,
            html,
          });
        }

        res.json({ success: true });
      } else {
        res.status(400).json({ error: 'Invalid signature' });
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      res.status(500).json({ error: 'Failed to verify payment' });
    }
  });

  // Template management routes (Email Templates)
  app.get('/api/templates/email', authenticate as any, async (req: any, res: Response) => {
    try {
      const { type, scopeType, scopeId } = req.query as { type?: string; scopeType?: string; scopeId?: string };
      const templates = await listEmailTemplates(req.user!.id, {
        templateType: type as any,
        scopeType: scopeType as any,
        scopeId: scopeId ? parseInt(scopeId) : undefined,
      });
      res.json(templates);
    } catch (error) {
      console.error('Error listing email templates:', error);
      res.status(500).json({ message: 'Failed to list email templates' });
    }
  });

  app.post('/api/templates/email', authenticate as any, async (req: any, res: Response) => {
    try {
      const schema = z.object({
        scopeType: z.enum(['user', 'company', 'customer']),
        scopeId: z.number().optional(),
        templateType: z.enum(['invoice_email', 'quotation_email', 'payment_confirmation_email']),
        subject: z.string().min(1),
        html: z.string().min(1),
      });
      const data = schema.parse(req.body);
      const created = await createEmailTemplate(req.user!.id, data as any);
      res.json(created);
    } catch (error) {
      console.error('Error creating email template:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid template data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create email template' });
    }
  });

  app.put('/api/templates/email/:id', authenticate as any, async (req: any, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const schema = z.object({
        scopeType: z.enum(['user', 'company', 'customer']).optional(),
        scopeId: z.number().nullable().optional(),
        templateType: z.enum(['invoice_email', 'quotation_email', 'payment_confirmation_email']).optional(),
        subject: z.string().min(1).optional(),
        html: z.string().min(1).optional(),
      });
      const data = schema.parse(req.body);
      const updated = await updateEmailTemplate(req.user!.id, id, data as any);
      res.json(updated);
    } catch (error) {
      console.error('Error updating email template:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid template data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to update email template' });
    }
  });

  app.delete('/api/templates/email/:id', authenticate as any, async (req: any, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await deleteEmailTemplate(req.user!.id, id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting email template:', error);
      res.status(500).json({ message: 'Failed to delete email template' });
    }
  });

  // Document (PDF appearance) templates
  app.get('/api/templates/document', authenticate as any, async (req: any, res: Response) => {
    try {
      const { docType, scopeType, scopeId } = req.query as { docType?: string; scopeType?: string; scopeId?: string };
      const templates = await listDocumentTemplates(req.user!.id, {
        docType: docType as any,
        scopeType: scopeType as any,
        scopeId: scopeId ? parseInt(scopeId) : undefined,
      });
      res.json(templates);
    } catch (error) {
      console.error('Error listing document templates:', error);
      res.status(500).json({ message: 'Failed to list document templates' });
    }
  });

  app.post('/api/templates/document', authenticate as any, async (req: any, res: Response) => {
    try {
      const schema = z.object({
        scopeType: z.enum(['user', 'company', 'customer']),
        scopeId: z.number().optional(),
        docType: z.enum(['invoice', 'quotation']),
        settings: z.object({
          primaryColor: z.string().optional(),
          footerText: z.string().optional(),
          // Designer layout payload: page + elements
          layout: z.any().optional(),
        }),
      });
      const data = schema.parse(req.body);
      const created = await createDocumentTemplate(req.user!.id, data as any);
      res.json(created);
    } catch (error) {
      console.error('Error creating document template:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid document template data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create document template' });
    }
  });

  app.put('/api/templates/document/:id', authenticate as any, async (req: any, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const schema = z.object({
        scopeType: z.enum(['user', 'company', 'customer']).optional(),
        scopeId: z.number().nullable().optional(),
        docType: z.enum(['invoice', 'quotation']).optional(),
        settings: z.object({
          primaryColor: z.string().optional(),
          footerText: z.string().optional(),
          layout: z.any().optional(),
        }).optional(),
      });
      const data = schema.parse(req.body);
      const updated = await updateDocumentTemplate(req.user!.id, id, data as any);
      res.json(updated);
    } catch (error) {
      console.error('Error updating document template:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid document template data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to update document template' });
    }
  });

  app.delete('/api/templates/document/:id', authenticate as any, async (req: any, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await deleteDocumentTemplate(req.user!.id, id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting document template:', error);
      res.status(500).json({ message: 'Failed to delete document template' });
    }
  });

  // Preview compile for email templates (no DB writes)
  app.post('/api/templates/preview/email', authenticate as any, async (req: any, res: Response) => {
    try {
      const schema = z.object({
        subject: z.string().min(1),
        html: z.string().min(1),
        context: z.any().optional(),
      });
      const data = schema.parse(req.body);
      const ctx = data.context ?? {
        frontendUrl: process.env.FRONTEND_URL || "http://127.0.0.1:5000",
        company: { name: "Your Company", email: "info@company.test" },
        customer: { name: "John Doe", email: "john@example.com" },
        invoice: {
          id: 1,
          invoiceNumber: "INV-001",
          date: new Date(),
          dueDate: new Date(),
          subtotal: 1000,
          taxAmount: 100,
          total: 1100,
          notes: "Sample notes",
          paymentToken: "sampletoken",
        },
        payUrl: `${process.env.FRONTEND_URL || 'http://127.0.0.1:5000'}/pay/sampletoken`,
      };
      const compiled = {
        subject: compileUserTemplate(data.subject, ctx),
        html: compileUserTemplate(data.html, ctx),
      };
      res.json(compiled);
    } catch (error) {
      console.error('Error compiling email template preview:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid preview data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to compile preview' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
