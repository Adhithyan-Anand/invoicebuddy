import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

const quotationSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  quotationNumber: z.string().min(1, "Quotation number is required"),
  date: z.string().min(1, "Date is required"),
  validUntil: z.string().min(1, "Valid until date is required"),
  notes: z.string().optional(),
  status: z.string().default("draft"),
});

interface LineItem {
  description: string;
  quantity: number;
  rate: number;
  taxRate: number;
  amount: number;
}

interface QuotationFormProps {
  quotation?: any;
  onClose: () => void;
}

export default function QuotationForm({ quotation, onClose }: QuotationFormProps) {
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", quantity: 1, rate: 0, taxRate: 0, amount: 0 }
  ]);
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      customerId: quotation?.customerId?.toString() || "",
      quotationNumber: quotation?.quotationNumber || "",
      date: quotation?.date ? new Date(quotation.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      validUntil: quotation?.validUntil ? new Date(quotation.validUntil).toISOString().split('T')[0] : "",
      notes: quotation?.notes || "",
      status: quotation?.status || "draft",
    },
  });

  // Load customers
  const { data: customers = [] } = useQuery({
    queryKey: ["/api/customers"],
    retry: false,
  });

  // Load next quotation number if creating new
  const { data: nextNumberData } = useQuery({
    queryKey: ["/api/quotations/next-number"],
    enabled: !quotation,
    retry: false,
  });

  // Load quotation details if editing
  const { data: quotationDetails } = useQuery({
    queryKey: [`/api/quotations/${quotation?.id}`],
    enabled: !!quotation?.id,
    retry: false,
  });

  // Set next quotation number
  useEffect(() => {
    if (nextNumberData?.number && !quotation) {
      form.setValue("quotationNumber", nextNumberData.number);
    }
  }, [nextNumberData, quotation, form]);

  // Load line items when editing
  useEffect(() => {
    if (quotationDetails?.lineItems) {
      setLineItems(quotationDetails.lineItems.map((item: any) => ({
        description: item.description,
        quantity: parseFloat(item.quantity),
        rate: parseFloat(item.rate),
        taxRate: parseFloat(item.taxRate),
        amount: parseFloat(item.amount),
      })));
    }
  }, [quotationDetails]);

  // Initialize form with quotation details
  useEffect(() => {
    if (quotationDetails) {
      form.reset({
        customerId: quotationDetails.customerId.toString(),
        quotationNumber: quotationDetails.quotationNumber,
        date: new Date(quotationDetails.date).toISOString().split('T')[0],
        validUntil: new Date(quotationDetails.validUntil).toISOString().split('T')[0],
        notes: quotationDetails.notes || "",
        status: quotationDetails.status,
      });
    }
  }, [quotationDetails, form]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = quotation ? `/api/quotations/${quotation.id}` : "/api/quotations";
      const method = quotation ? "PUT" : "POST";
      await apiRequest(method, url, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: quotation ? "Quotation updated successfully" : "Quotation created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
      onClose();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: quotation ? "Failed to update quotation" : "Failed to create quotation",
        variant: "destructive",
      });
    },
  });

  const addLineItem = () => {
    setLineItems([...lineItems, { description: "", quantity: 1, rate: 0, taxRate: 0, amount: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };

    // Calculate amount
    if (field === 'quantity' || field === 'rate' || field === 'taxRate') {
      const item = updated[index];
      const subtotal = item.quantity * item.rate;
      const tax = subtotal * (item.taxRate / 100);
      updated[index].amount = subtotal + tax;
    }

    setLineItems(updated);
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    const taxAmount = lineItems.reduce((sum, item) => sum + (item.quantity * item.rate * item.taxRate / 100), 0);
    const total = subtotal + taxAmount;

    return { subtotal, taxAmount, total };
  };

  const { subtotal, taxAmount, total } = calculateTotals();

  const onSubmit = (data: any) => {
    const quotationData = {
      ...data,
      customerId: parseInt(data.customerId),
      date: new Date(data.date),           // ✅ remove `.toISOString()`
      validUntil: new Date(data.validUntil),
      subtotal: subtotal.toString(),
      taxAmount: taxAmount.toString(),
      total: total.toString(),
      lineItems: lineItems.map(item => ({
        description: item.description,
        quantity: item.quantity.toString(),
        rate: item.rate.toString(),
        taxRate: item.taxRate.toString(),
        amount: item.amount.toString(),
      })),
    };

    createMutation.mutate(quotationData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="customerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customer</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a customer" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {customers.map((customer: any) => (
                      <SelectItem key={customer.id} value={customer.id.toString()}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="quotationNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quotation Number</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quotation Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="validUntil"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valid Until</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Line Items */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-slate-900">Line Items</h3>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={addLineItem}>
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={async () => {
                  // Gather all descriptions and notes
                  const descriptions = lineItems.map(item => item.description);
                  const notes = form.getValues("notes") || "";
                  if (descriptions.every(desc => !desc.trim()) && !notes.trim()) {
                    toast({ title: "Nothing to autocorrect", description: "Please enter product descriptions or notes first." });
                    return;
                  }
                  try {
                    toast({ title: "Autocorrecting...", description: "Checking for spelling mistakes..." });
                    const texts = [...descriptions, notes];
                    const res = await fetch("/api/autocorrect", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ texts }),
                    });
                    if (!res.ok) throw new Error("Failed to autocorrect");
                    const { corrected } = await res.json();
                    setLineItems(lineItems.map((item, idx) => ({
                      ...item,
                      description: corrected[idx] || item.description,
                    })));
                    // Last item is notes
                    if (typeof corrected[descriptions.length] === "string") {
                      form.setValue("notes", corrected[descriptions.length]);
                    }
                    toast({ title: "Autocorrected", description: "Descriptions and notes updated with corrections." });
                  } catch (err) {
                    toast({ title: "Error", description: "Failed to autocorrect descriptions/notes.", variant: "destructive" });
                  }
                }}
              >
                Auto-correct All
              </Button>
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-24">Qty</TableHead>
                  <TableHead className="w-32">Rate</TableHead>
                  <TableHead className="w-24">Tax %</TableHead>
                  <TableHead className="w-32">Total</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Input
                        placeholder="Item description"
                        value={item.description}
                        onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.rate}
                        onChange={(e) => updateLineItem(index, 'rate', parseFloat(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.1"
                        value={item.taxRate}
                        onChange={(e) => updateLineItem(index, 'taxRate', parseFloat(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">₹{item.amount.toFixed(2)}</span>
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLineItem(index)}
                        disabled={lineItems.length <= 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Subtotal:</span>
                <span className="font-medium">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Tax:</span>
                <span className="font-medium">₹{taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold border-t border-slate-200 pt-2">
                <span>Total:</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Additional notes or terms and conditions..."
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-between pt-6 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending}
            className="bg-primary hover:bg-primary/90"
          >
            {createMutation.isPending
              ? "Saving..."
              : quotation
                ? "Update Quotation"
                : "Create Quotation"
            }
          </Button>
        </div>
      </form>
    </Form>
  );
}
