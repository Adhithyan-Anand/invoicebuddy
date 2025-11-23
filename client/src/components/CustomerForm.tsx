import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  isCompany: z.boolean(),
  company: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
}).refine(
  (data) => {
    if (data.isCompany) {
      return !!data.company && data.company.trim().length > 0;
    }
    return true;
  },
  {
    message: "Company name is required when 'Company' is selected",
    path: ["company"],
  }
);

interface CustomerFormProps {
  customer?: any;
  onClose: () => void;
}

export default function CustomerForm({ customer, onClose }: CustomerFormProps) {
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: customer?.name || "",
      isCompany: !!customer?.company,
      company: customer?.company || "",
      email: customer?.email || "",
      phone: customer?.phone || "",
      address: customer?.address || "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = customer ? `/api/customers/${customer.id}` : "/api/customers";
      const method = customer ? "PUT" : "POST";
      await apiRequest(method, url, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: customer ? "Customer updated successfully" : "Customer created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
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
        description: customer ? "Failed to update customer" : "Failed to create customer",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    // Clean up empty strings
    const cleanData = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key, 
        value === "" ? null : value
      ])
    );

    // If Individual is selected, set company to "Individual"
    if (!cleanData.isCompany) {
      cleanData.company = "Individual";
    }
    
    createMutation.mutate(cleanData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name *</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isCompany"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-2">
                <FormLabel>Customer Type</FormLabel>
                <div className="flex items-center gap-2">
                  <span>Individual</span>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    id="isCompany"
                  />
                  <span>Company</span>
                </div>
              </FormItem>
            )}
          />
        </div>

        {form.watch("isCompany") && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Corporation" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="john@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input placeholder="+1 (555) 123-4567" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="123 Main St, City, State, ZIP" 
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
              : customer 
                ? "Update Customer" 
                : "Add Customer"
            }
          </Button>
        </div>
      </form>
    </Form>
  );
}
