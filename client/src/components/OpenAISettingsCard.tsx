import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { companies } from "@shared/schema";

const openAISchema = z.object({
  openAiApiKey: z.string().optional(),
  openAiAutocorrectInstructions: z.string().optional(),
});

export default function OpenAISettingsCard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [aiSettings, setAISettings] = useState<any>(null);
  const [lastMaskedKey, setLastMaskedKey] = useState<string | null>(null);

  const fetchAISettings = async () => {
    setLoading(true);
    try {
      const res = await apiRequest("GET", "/api/ai-settings");
      console.log("Fetched AI settings from API:", res);
      setAISettings(res);
    } catch (e) {
      setAISettings(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAISettings();
  }, []);

  const form = useForm({
    resolver: zodResolver(openAISchema),
    defaultValues: {
      openAiApiKey: "",
      openAiAutocorrectInstructions: "",
    },
  });

  const [editingKey, setEditingKey] = useState(false);

  useEffect(() => {
    if (aiSettings) {
      // Prefer backend-provided masked key; fall back to last masked (post-save)
      const maskedKey = aiSettings.maskedKey || lastMaskedKey || "";
      form.reset({
        openAiApiKey: editingKey ? "" : maskedKey,
        openAiAutocorrectInstructions: aiSettings.openAiAutocorrectInstructions || "",
      });
      setLastMaskedKey(maskedKey || null);
    }
  }, [aiSettings, editingKey]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("PUT", "/api/ai-settings", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "AI settings updated successfully",
      });
      fetchAISettings();
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
        description: "Failed to update AI settings",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    const cleanData: any = {};
    // Only send API key if the user explicitly edited it
    if (editingKey && data.openAiApiKey) {
      cleanData.openAiApiKey = data.openAiApiKey;
      // Mask the key locally for UX until backend refetch completes
      setLastMaskedKey(
        data.openAiApiKey.length > 8
          ? data.openAiApiKey.slice(0, 4) + "****" + data.openAiApiKey.slice(-4)
          : "****" + data.openAiApiKey.slice(-4)
      );
    }
    if (data.openAiAutocorrectInstructions !== undefined) {
      cleanData.openAiAutocorrectInstructions = data.openAiAutocorrectInstructions;
    }
    saveMutation.mutate(cleanData);
  };

  if (loading) {
    return <div className="p-8 text-lg">Loading AI Settings...</div>;
  }

  if (!aiSettings) {
    return <div className="p-8 text-lg text-red-600">Failed to load AI Settings. Check the API endpoint and console for errors.</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Settings</CardTitle>
        <CardDescription>
          Manage your OpenAI API key and autocorrect instructions. These settings are used for AI-powered features like autocorrect.
        </CardDescription>
      </CardHeader>
      <div className="p-6 pt-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="openAiApiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>OpenAI API Key</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Input
                        type={aiSettings?.openAiApiKeySet && !editingKey ? "text" : "password"}
                        placeholder={aiSettings?.openAiApiKeySet && !editingKey ? "" : "sk-..."}
                        value={
                          aiSettings?.openAiApiKeySet && !editingKey
                            ? (aiSettings.maskedKey || "")
                            : field.value
                        }
                        readOnly={aiSettings?.openAiApiKeySet && !editingKey}
                        onFocus={() => {
                          if (aiSettings?.openAiApiKeySet && !editingKey) {
                            setEditingKey(true);
                            form.setValue("openAiApiKey", "");
                          }
                        }}
                        onChange={(e) => {
                          if (!editingKey) setEditingKey(true);
                          field.onChange(e);
                        }}
                      />
                      {aiSettings?.openAiApiKeySet && !editingKey && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingKey(true);
                            form.setValue("openAiApiKey", "");
                          }}
                        >
                          Edit
                        </Button>
                      )}
                      {editingKey && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingKey(false);
                            // Restore masked value for display
                            form.setValue("openAiApiKey", aiSettings?.maskedKey || "");
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-slate-500">
                    {aiSettings?.openAiApiKeySet && !editingKey
                      ? `Current key: ${aiSettings.maskedKey || "********"} (click Edit to change)`
                      : "This key is used for AI-powered features like autocorrect. It is stored securely and never shared."}
                  </p>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="openAiAutocorrectInstructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Autocorrect Instructions</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g. Make notes more technical and clear. Use concise, professional language."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-slate-500">
                    These instructions will be sent to the AI to guide how autocorrect should work (e.g., "Make notes more technical and clear").
                  </p>
                </FormItem>
              )}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : "Save AI Settings"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </Card>
  );
}
