import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import PdfTemplateDesigner, { TemplateLayout } from "@/components/PdfTemplateDesigner";

type Company = {
  id: number;
  name: string;
  email?: string | null;
};

type Customer = {
  id: number;
  name: string;
  email?: string | null;
};

type EmailTemplate = {
  id: number;
  userId: number;
  scopeType: "user" | "company" | "customer";
  scopeId: number | null;
  templateType: "invoice_email" | "quotation_email" | "payment_confirmation_email";
  subject: string;
  html: string;
  createdAt?: string;
  updatedAt?: string;
};

type DocumentTemplate = {
  id: number;
  userId: number;
  scopeType: "user" | "company" | "customer";
  scopeId: number | null;
  docType: "invoice" | "quotation";
  settings: {
    primaryColor?: string;
    footerText?: string;
  };
  createdAt?: string;
  updatedAt?: string;
};

function useCompany() {
  return useQuery<Company | null>({
    queryKey: ["/api/company"],
    queryFn: async () => {
      const res = await fetch("/api/company");
      if (!res.ok) throw new Error("Failed to load company");
      return res.json();
    },
  });
}

function useCustomers() {
  return useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const res = await fetch("/api/customers");
      if (!res.ok) throw new Error("Failed to load customers");
      return res.json();
    },
  });
}

function useEmailTemplates(filter?: { type?: EmailTemplate["templateType"]; scopeType?: EmailTemplate["scopeType"]; scopeId?: number }) {
  const params = new URLSearchParams();
  if (filter?.type) params.set("type", filter.type);
  if (filter?.scopeType) params.set("scopeType", filter.scopeType);
  if (typeof filter?.scopeId === "number") params.set("scopeId", String(filter.scopeId));
  const qs = params.toString();
  return useQuery<EmailTemplate[]>({
    queryKey: ["/api/templates/email", qs],
    queryFn: async () => {
      const res = await fetch(`/api/templates/email${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error("Failed to load email templates");
      return res.json();
    },
  });
}

function useDocumentTemplates(filter?: { docType?: DocumentTemplate["docType"]; scopeType?: DocumentTemplate["scopeType"]; scopeId?: number }) {
  const params = new URLSearchParams();
  if (filter?.docType) params.set("docType", filter.docType);
  if (filter?.scopeType) params.set("scopeType", filter.scopeType);
  if (typeof filter?.scopeId === "number") params.set("scopeId", String(filter.scopeId));
  const qs = params.toString();
  return useQuery<DocumentTemplate[]>({
    queryKey: ["/api/templates/document", qs],
    queryFn: async () => {
      const res = await fetch(`/api/templates/document${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error("Failed to load document templates");
      return res.json();
    },
  });
}

export default function TemplatesSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Templates</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="email">
          <TabsList>
            <TabsTrigger value="email">Email Templates</TabsTrigger>
            <TabsTrigger value="document">Invoice/Quotation Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="mt-4">
            <EmailTemplatesManager />
          </TabsContent>

          <TabsContent value="document" className="mt-4">
            <DocumentTemplatesManager />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function EmailTemplatesManager() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: company } = useCompany();
  const { data: customers } = useCustomers();

  const [templateType, setTemplateType] = useState<EmailTemplate["templateType"]>("invoice_email");
  const [scopeType, setScopeType] = useState<EmailTemplate["scopeType"]>("user");
  const [customerId, setCustomerId] = useState<number | undefined>(undefined);
  const scopeId = scopeType === "user" ? undefined : scopeType === "company" ? company?.id : customerId;

  const [subject, setSubject] = useState<string>("");
  const [html, setHtml] = useState<string>("");

  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewSubject, setPreviewSubject] = useState<string | null>(null);

  const filter = useMemo(
    () => ({ type: templateType, scopeType, scopeId: typeof scopeId === "number" ? scopeId : undefined }),
    [templateType, scopeType, scopeId],
  );
  const { data: templates, refetch } = useEmailTemplates(filter);

  // Reset customer selection when scope changes
  useEffect(() => {
    if (scopeType !== "customer") {
      setCustomerId(undefined);
    }
  }, [scopeType]);

  const createMutation = useMutation({
    mutationFn: async (payload: Omit<EmailTemplate, "id" | "userId" | "createdAt" | "updatedAt">) => {
      const res = await fetch("/api/templates/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save template");
      return res.json() as Promise<EmailTemplate>;
    },
    onSuccess: () => {
      toast({ title: "Saved", description: "Email template saved" });
      setPreviewHtml(null);
      setPreviewSubject(null);
      setSubject("");
      setHtml("");
      qc.invalidateQueries({ queryKey: ["/api/templates/email"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.message || "Failed to save template", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/templates/email/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete template");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Deleted", description: "Email template deleted" });
      qc.invalidateQueries({ queryKey: ["/api/templates/email"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.message || "Failed to delete template", variant: "destructive" });
    },
  });

  const onPreview = async () => {
    try {
      const res = await fetch("/api/templates/preview/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          html,
        }),
      });
      if (!res.ok) throw new Error("Failed to compile preview");
      const data = await res.json();
      setPreviewSubject(data.subject);
      setPreviewHtml(data.html);
    } catch (e: any) {
      toast({ title: "Preview failed", description: e?.message || "Failed to preview", variant: "destructive" });
    }
  };

  const onSave = () => {
    if (!subject || !html) {
      toast({ title: "Missing fields", description: "Please fill subject and HTML", variant: "destructive" });
      return;
    }
    if (scopeType === "customer" && !customerId) {
      toast({ title: "Missing customer", description: "Please select a customer for customer scope", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      scopeType,
      scopeId: scopeType === "user" ? undefined : (scopeId as number),
      templateType,
      subject,
      html,
    } as any);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create or Update Template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Template Type</Label>
              <Select value={templateType} onValueChange={(v) => setTemplateType(v as EmailTemplate["templateType"])}>
                <SelectTrigger>
                  <SelectValue placeholder="Select template type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="invoice_email">Invoice Email</SelectItem>
                  <SelectItem value="quotation_email">Quotation Email</SelectItem>
                  <SelectItem value="payment_confirmation_email">Payment Confirmation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Scope</Label>
              <Select value={scopeType} onValueChange={(v) => setScopeType(v as EmailTemplate["scopeType"])}>
                <SelectTrigger>
                  <SelectValue placeholder="Select scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User (default)</SelectItem>
                  <SelectItem value="company">Company</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {scopeType === "company" && (
              <div>
                <Label>Company</Label>
                <Input readOnly value={company?.name || "No company profile"} />
              </div>
            )}

            {scopeType === "customer" && (
              <div>
                <Label>Customer</Label>
                <Select
                  value={customerId ? String(customerId) : ""}
                  onValueChange={(v) => setCustomerId(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {(customers || []).map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name} {c.email ? `(${c.email})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject (supports handlebars variables too)" />
          </div>

          <div className="space-y-2">
            <Label>HTML Template</Label>
            <Textarea
              className="min-h-[220px] font-mono text-sm"
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              placeholder="HTML template (Handlebars supported). Example: Hello {{customer.name}}, your invoice {{invoice.invoiceNumber}} ..."
            />
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onPreview}>
              Preview
            </Button>
            <Button type="button" onClick={onSave} disabled={createMutation.isPending}>
              Save Template
            </Button>
          </div>

          {previewSubject || previewHtml ? (
            <div className="mt-4">
              <Label>Preview Subject</Label>
              <div className="p-2 border rounded bg-muted">{previewSubject}</div>
              <Label className="mt-3 block">Preview HTML</Label>
              <div className="p-2 border rounded bg-white overflow-auto max-h-[400px]">
                {/* eslint-disable-next-line react/no-danger */}
                <div dangerouslySetInnerHTML={{ __html: previewHtml || "" }} />
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Templates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(templates && templates.length > 0) ? (
            templates.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 border rounded">
                <div className="text-sm">
                  <div className="font-medium">
                    {t.templateType} • {t.scopeType}{t.scopeId ? ` #${t.scopeId}` : ""}
                  </div>
                  <div className="text-slate-600 line-clamp-1">Subject: {t.subject}</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => {
                    setTemplateType(t.templateType);
                    setScopeType(t.scopeType);
                    if (t.scopeType === "customer") setCustomerId(t.scopeId || undefined);
                    setSubject(t.subject || "");
                    setHtml(t.html || "");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}>Load</Button>
                  <Button variant="destructive" onClick={() => deleteMutation.mutate(t.id)}>Delete</Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-slate-600">No templates found for current filters.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DocumentTemplatesManager() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: company } = useCompany();
  const { data: customers } = useCustomers();

  const [docType, setDocType] = useState<DocumentTemplate["docType"]>("invoice");
  const [scopeType, setScopeType] = useState<DocumentTemplate["scopeType"]>("user");
  const [customerId, setCustomerId] = useState<number | undefined>(undefined);
  const scopeId = scopeType === "user" ? undefined : scopeType === "company" ? company?.id : customerId;

  const [primaryColor, setPrimaryColor] = useState<string>("#2563eb");
  const [footerText, setFooterText] = useState<string>("Thank you for your business!");
  const [layout, setLayout] = useState<TemplateLayout | null>(null);

  // Reset customer selection when scope changes
  useEffect(() => {
    if (scopeType !== "customer") {
      setCustomerId(undefined);
    }
  }, [scopeType]);

  const filter = useMemo(
    () => ({ docType, scopeType, scopeId: typeof scopeId === "number" ? scopeId : undefined }),
    [docType, scopeType, scopeId],
  );
  const { data: templates } = useDocumentTemplates(filter);

  const createMutation = useMutation({
    mutationFn: async (payload: Omit<DocumentTemplate, "id" | "userId" | "createdAt" | "updatedAt">) => {
      const res = await fetch("/api/templates/document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save document template");
      return res.json() as Promise<DocumentTemplate>;
    },
    onSuccess: () => {
      toast({ title: "Saved", description: "Document template saved" });
      qc.invalidateQueries({ queryKey: ["/api/templates/document"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.message || "Failed to save document template", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/templates/document/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete document template");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Deleted", description: "Document template deleted" });
      qc.invalidateQueries({ queryKey: ["/api/templates/document"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.message || "Failed to delete document template", variant: "destructive" });
    },
  });

  const onSave = () => {
    if (scopeType === "customer" && !customerId) {
      toast({ title: "Missing customer", description: "Please select a customer for customer scope", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      scopeType,
      scopeId: scopeType === "user" ? undefined : (scopeId as number),
      docType,
      settings: { primaryColor, footerText, layout },
    } as any);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Appearance Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Document Type</Label>
              <Select value={docType} onValueChange={(v) => setDocType(v as DocumentTemplate["docType"])}>
                <SelectTrigger>
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="invoice">Invoice PDF</SelectItem>
                  <SelectItem value="quotation">Quotation PDF</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Scope</Label>
              <Select value={scopeType} onValueChange={(v) => setScopeType(v as DocumentTemplate["scopeType"])}>
                <SelectTrigger>
                  <SelectValue placeholder="Select scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User (default)</SelectItem>
                  <SelectItem value="company">Company</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {scopeType === "company" && (
              <div>
                <Label>Company</Label>
                <Input readOnly value={company?.name || "No company profile"} />
              </div>
            )}

            {scopeType === "customer" && (
              <div>
                <Label>Customer</Label>
                <Select
                  value={customerId ? String(customerId) : ""}
                  onValueChange={(v) => setCustomerId(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {(customers || []).map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name} {c.email ? `(${c.email})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Primary Color</Label>
              <div className="flex gap-2">
                <Input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-16 p-0" />
                <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} placeholder="#2563eb" />
              </div>
            </div>
            <div className="md:col-span-2">
              <Label>Footer Text</Label>
              <Input value={footerText} onChange={(e) => setFooterText(e.target.value)} placeholder="Thank you for your business!" />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={onSave} disabled={createMutation.isPending}>Save Template</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>PDF Template Designer (Beta)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <PdfTemplateDesigner
            value={layout ?? undefined}
            onChange={(next) => setLayout(next)}
            docType={docType}
          />
          <div className="flex gap-2">
            <Button onClick={onSave} disabled={createMutation.isPending}>Save Template</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Appearance Templates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(templates && templates.length > 0) ? (
            templates.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 border rounded">
                <div className="text-sm">
                  <div className="font-medium">
                    {t.docType} • {t.scopeType}{t.scopeId ? ` #${t.scopeId}` : ""}
                  </div>
                  <div className="text-slate-600">
                    Color: <span style={{ color: t.settings.primaryColor || "#111827" }}>{t.settings.primaryColor || "-"}</span>
                    {" • "} Footer: {t.settings.footerText || "-"}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDocType(t.docType);
                      setScopeType(t.scopeType);
                      if (t.scopeType === "customer") setCustomerId(t.scopeId || undefined);
                      setPrimaryColor(t.settings.primaryColor || "#2563eb");
                      setFooterText(t.settings.footerText || "Thank you for your business!");
                      setLayout(((t.settings as any)?.layout) || null);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    Load
                  </Button>
                  <Button variant="destructive" onClick={() => deleteMutation.mutate(t.id)}>Delete</Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-slate-600">No templates found for current filters.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
