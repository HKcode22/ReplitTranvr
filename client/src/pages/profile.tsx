import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Save, Loader2 } from "lucide-react";
import { PhoneInput } from "@/components/phone-input";
import type { TravelerProfile } from "@shared/schema";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional().default(""),
  homeAirport: z.string().optional().default(""),
  passportCountry: z.string().optional().default(""),
  dateOfBirth: z.string().optional().default(""),
  gender: z.string().optional().default(""),
  title: z.string().optional().default(""),
  passportNumber: z.string().optional().default(""),
  nationality: z.string().optional().default(""),
  seatPreference: z.string().optional().default(""),
  hotelPreference: z.string().optional().default(""),
  budgetRange: z.string().optional().default(""),
  dietaryNotes: z.string().optional().default(""),
  loyaltyPrograms: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: profile, isLoading } = useQuery<TravelerProfile | null>({
    queryKey: ["/api/profile"],
    queryFn: async () => {
      const res = await fetch("/api/profile", { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to load profile");
      return res.json();
    },
  });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "", phone: "", homeAirport: "", passportCountry: "",
      dateOfBirth: "", gender: "", title: "", passportNumber: "", nationality: "",
      seatPreference: "", hotelPreference: "", budgetRange: "",
      dietaryNotes: "", loyaltyPrograms: "", notes: "",
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        name: profile.name || `${user?.firstName || ""} ${user?.lastName || ""}`.trim(),
        phone: profile.phone || "",
        homeAirport: profile.homeAirport || "",
        passportCountry: profile.passportCountry || "",
        dateOfBirth: profile.dateOfBirth || "",
        gender: profile.gender || "",
        title: profile.title || "",
        passportNumber: profile.passportNumber || "",
        nationality: profile.nationality || "",
        seatPreference: profile.seatPreference || "",
        hotelPreference: profile.hotelPreference || "",
        budgetRange: profile.budgetRange || "",
        dietaryNotes: profile.dietaryNotes || "",
        loyaltyPrograms: profile.loyaltyPrograms || "",
        notes: profile.notes || "",
      });
    } else if (!isLoading && user) {
      form.reset({ name: `${user.firstName} ${user.lastName}`.trim() });
    }
  }, [profile, isLoading, user]);

  const saveMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      await apiRequest("POST", "/api/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({ title: "Profile saved" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <h1 className="font-serif text-2xl font-bold mb-1" data-testid="text-profile-title">Traveler Profile</h1>
      <p className="text-muted-foreground text-sm mb-6">Your details and preferences help us plan better trips for you.</p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))} className="space-y-6">
          <Card className="p-5">
            <h3 className="font-semibold mb-4">Passport & Identity</h3>
            <p className="text-xs text-muted-foreground mb-4">These details will auto-fill when booking flights.</p>
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-profile-title">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="mr">Mr</SelectItem>
                        <SelectItem value="mrs">Mrs</SelectItem>
                        <SelectItem value="ms">Ms</SelectItem>
                        <SelectItem value="miss">Miss</SelectItem>
                        <SelectItem value="dr">Dr</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="gender" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-profile-gender">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="m">Male</SelectItem>
                        <SelectItem value="f">Female</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Full Legal Name (as on passport)</FormLabel><FormControl><Input {...field} data-testid="input-profile-name" /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                  <FormItem><FormLabel>Date of Birth</FormLabel><FormControl><Input type="date" {...field} data-testid="input-profile-dob" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Phone Number</FormLabel><FormControl><PhoneInput value={field.value} onChange={field.onChange} data-testid="input-profile-phone" /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <FormField control={form.control} name="nationality" render={({ field }) => (
                  <FormItem><FormLabel>Nationality</FormLabel><FormControl><Input {...field} placeholder="e.g. US" data-testid="input-profile-nationality" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="passportCountry" render={({ field }) => (
                  <FormItem><FormLabel>Passport Country</FormLabel><FormControl><Input {...field} placeholder="e.g. US" data-testid="input-profile-passport-country" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="passportNumber" render={({ field }) => (
                  <FormItem><FormLabel>Passport Number</FormLabel><FormControl><Input {...field} placeholder="Optional" data-testid="input-profile-passport-number" /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold mb-4">Travel Preferences</h3>
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="homeAirport" render={({ field }) => (
                  <FormItem><FormLabel>Home Airport</FormLabel><FormControl><Input placeholder="e.g. LAX" {...field} data-testid="input-profile-airport" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="seatPreference" render={({ field }) => (
                  <FormItem><FormLabel>Seat Preference</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger data-testid="select-seat-preference"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Window">Window</SelectItem>
                        <SelectItem value="Aisle">Aisle</SelectItem>
                        <SelectItem value="Middle">Middle</SelectItem>
                        <SelectItem value="No Preference">No Preference</SelectItem>
                      </SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="hotelPreference" render={({ field }) => (
                  <FormItem><FormLabel>Hotel Preference</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger data-testid="select-hotel-preference"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Budget">Budget</SelectItem>
                        <SelectItem value="Mid-Range">Mid-Range</SelectItem>
                        <SelectItem value="Luxury">Luxury</SelectItem>
                        <SelectItem value="Boutique">Boutique</SelectItem>
                      </SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="budgetRange" render={({ field }) => (
                  <FormItem><FormLabel>Budget Range</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger data-testid="select-budget-range"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Under $1k">Under $1k</SelectItem>
                        <SelectItem value="$1-3k">$1-3k</SelectItem>
                        <SelectItem value="$3-5k">$3-5k</SelectItem>
                        <SelectItem value="$5-10k">$5-10k</SelectItem>
                        <SelectItem value="$10k+">$10k+</SelectItem>
                      </SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="dietaryNotes" render={({ field }) => (
                <FormItem><FormLabel>Dietary Notes</FormLabel><FormControl><Textarea {...field} data-testid="input-dietary-notes" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="loyaltyPrograms" render={({ field }) => (
                <FormItem><FormLabel>Loyalty Programs</FormLabel><FormControl><Textarea {...field} data-testid="input-loyalty-programs" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Additional Notes</FormLabel><FormControl><Textarea {...field} data-testid="input-additional-notes" /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
          </Card>

          <Button disabled={saveMutation.isPending} data-testid="button-save-profile">
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Profile
          </Button>
        </form>
      </Form>
    </div>
  );
}
