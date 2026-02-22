import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Phone, Loader2, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import type { TravelerProfile } from "@shared/schema";

const callRequestSchema = z.object({
  destination: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

type CallRequestFormValues = z.infer<typeof callRequestSchema>;

export default function RequestCallPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: profile, isLoading: profileLoading } = useQuery<TravelerProfile | null>({
    queryKey: ["/api/profile"],
    queryFn: async () => {
      const res = await fetch("/api/profile", { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to load profile");
      return res.json();
    },
  });

  const hasPhone = !!profile?.phone;

  const form = useForm<CallRequestFormValues>({
    resolver: zodResolver(callRequestSchema),
    defaultValues: {
      destination: "", notes: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: CallRequestFormValues) => {
      await apiRequest("POST", "/api/call-requests", {
        ...data,
        phone: profile?.phone || "",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/call-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({ title: "Call request submitted!", description: "You'll receive a call shortly." });
      setLocation("/call-history");
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (profileLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-40 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <h1 className="font-serif text-2xl font-bold mb-1" data-testid="text-request-call-title">Request a Call</h1>
      <p className="text-muted-foreground text-sm mb-6">Tell us about your trip and we'll call you right away.</p>

      {!hasPhone && (
        <Card className="p-4 mb-4 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Phone number required</p>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                Please add a phone number to your profile so we can call you.
              </p>
              <Link href="/profile">
                <Button size="sm" variant="outline" className="mt-2" data-testid="button-go-to-profile">
                  Go to Profile
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Phone className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">We'll call you at</p>
            <p className="text-sm text-muted-foreground" data-testid="text-call-phone">
              {hasPhone ? profile.phone : "No phone number on file"}
            </p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
            <FormField control={form.control} name="destination" render={({ field }) => (
              <FormItem><FormLabel>Destination (optional)</FormLabel><FormControl><Input placeholder="e.g. Tokyo, Japan" {...field} data-testid="input-destination" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem><FormLabel>Additional Notes (optional)</FormLabel><FormControl><Textarea placeholder="Any specific requests or preferences..." {...field} data-testid="input-call-notes" /></FormControl><FormMessage /></FormItem>
            )} />
            <Button disabled={mutation.isPending || !hasPhone} className="w-full" data-testid="button-submit-call-request">
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Phone className="w-4 h-4 mr-2" />}
              Call Me Now
            </Button>
          </form>
        </Form>
      </Card>
    </div>
  );
}
