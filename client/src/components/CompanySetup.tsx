import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building2, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useState } from "react";
import { Label as UILabel } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const companySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  address: z.string().optional(),
  website: z.string().url("Invalid website URL").optional().or(z.literal("")),
  taxNumber: z.string().optional(),
  logoUrl: z.string().optional(),
});

interface CompanySetupProps {
  company?: any;
}

export default function CompanySetup({ company }: CompanySetupProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [logoPreview, setLogoPreview] = useState<string | null>(company?.logoUrl || null);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: company?.name || "",
      email: company?.email || "",
      phone: company?.phone || "",
      address: company?.address || "",
      website: company?.website || "",
      taxNumber: company?.taxNumber || "",
      logoUrl: company?.logoUrl || "",
    },
  });

  const uploadLogo = async (file: File) => {
    const formData = new FormData();
    formData.append('logo', file);

    try {
      const response = await fetch('/api/upload/logo', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload logo');
      }

      const data = await response.json();
      if (!data.url) {
        throw new Error('No URL returned from server');
      }

      return data.url;
    } catch (error) {
      console.error('Logo upload error:', error);
      throw error;
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = company ? "/api/company" : "/api/company";
      const method = company ? "PUT" : "POST";
      await apiRequest(method, url, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Company profile updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/company"] });
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
        description: "Failed to update company profile",
        variant: "destructive",
      });
    },
  });

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const logoUrl = await uploadLogo(file);
      form.setValue('logoUrl', logoUrl);
      setLogoPreview(logoUrl);
      toast({
        title: "Success",
        description: "Logo uploaded successfully",
      });
    } catch (error: unknown) {
      console.error('Logo upload error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload logo",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeLogo = () => {
    form.setValue('logoUrl', '');
    setLogoPreview(null);
  };

  const onSubmit = (data: any) => {
    // Clean up empty strings
    const cleanData = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key, 
        value === "" ? null : value
      ])
    );
    
    saveMutation.mutate(cleanData);
  };

  return (
    <div className="space-y-6">
      {!company && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">Complete Your Company Profile</CardTitle>
            <CardDescription className="text-blue-700">
              Set up your company information to appear on all invoices and quotations. 
              This information will be used for professional document generation.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Company Logo */}
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <Avatar className="w-20 h-20">
                <AvatarImage src={logoPreview || ""} alt="Company logo" />
                <AvatarFallback className="bg-slate-100">
                  <Building2 className="w-8 h-8 text-slate-400" />
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="logoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Logo</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-4">
                          {logoPreview && (
                            <div className="relative">
                              <img
                                src={logoPreview}
                                alt="Company logo"
                                className="h-20 w-20 object-contain rounded-lg border"
                              />
                              <button
                                type="button"
                                onClick={removeLogo}
                                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                          <div>
                            <Input
                              id="logo"
                              type="file"
                              accept="image/*"
                              onChange={handleLogoChange}
                              disabled={isUploading}
                              className="hidden"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => document.getElementById('logo')?.click()}
                              disabled={isUploading}
                            >
                              {isUploading ? "Uploading..." : "Upload Logo"}
                            </Button>
                            <p className="mt-1 text-sm text-gray-500">
                              PNG, JPG or GIF up to 5MB
                            </p>
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <p className="text-xs text-slate-500">
                  Enter a URL to your company logo. For best results, use a square image (recommended: 200x200px).
                </p>
              </div>
            </div>
          </div>

          {/* Company Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Your Company Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="contact@company.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="+1 (555) 123-4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input placeholder="https://www.company.com" {...field} />
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
                <FormLabel>Business Address</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="123 Business St, Suite 100, City, State, ZIP" 
                    rows={3}
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="taxNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tax ID / Business Number</FormLabel>
                <FormControl>
                  <Input placeholder="123-45-6789" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end pt-6 border-t border-slate-200">
            <Button 
              type="submit" 
              disabled={saveMutation.isPending || isUploading}
              className="bg-primary hover:bg-primary/90"
            >
              {saveMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
