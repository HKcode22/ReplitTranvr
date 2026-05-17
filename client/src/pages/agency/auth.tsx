import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Plane } from "lucide-react";

interface AgencyMe {
  id: number;
  name: string;
  contactEmail: string;
  contactName: string;
  plan?: string;
}

export default function AgencyAuthPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [bootCheck, setBootCheck] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    contactName: "",
    contactEmail: "",
    password: "",
    confirmPassword: "",
    loginEmail: "",
    loginPassword: "",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/agency/auth/me", { credentials: "include" });
        if (!cancelled && r.ok) {
          setLocation("/agency/dashboard");
          return;
        }
      } catch {
        // ignore — show auth page
      }
      if (!cancelled) setBootCheck(false);
    })();
    return () => { cancelled = true; };
  }, [setLocation]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/agency/auth/register", {
        name: form.name,
        contactName: form.contactName,
        contactEmail: form.contactEmail,
        password: form.password,
      });
      const data = await res.json();
      toast({
        title: `Welcome, ${(data as AgencyMe).name}`,
        description: "Your agency account is ready.",
      });
      setLocation("/agency/dashboard");
    } catch (err: any) {
      const msg = err?.message || "Registration failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiRequest("POST", "/api/agency/auth/login", {
        email: form.loginEmail,
        password: form.loginPassword,
      });
      setLocation("/agency/dashboard");
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  if (bootCheck) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-2 text-primary font-semibold">
          <Plane className="h-5 w-5" />
          <span>Travnr for Agencies</span>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md p-6">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold text-foreground">
              Disruption Monitoring
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Sign in to monitor your clients' flights and protect them from disruptions.
            </p>
          </div>

          <Tabs value={mode} onValueChange={(v) => { setMode(v as any); setError(""); }}>
            <TabsList className="grid grid-cols-2 w-full mb-6">
              <TabsTrigger value="login" data-testid="tab-agency-login">Log in</TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-agency-register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4" data-testid="form-agency-login">
                <div className="space-y-2">
                  <Label htmlFor="loginEmail">Email</Label>
                  <Input
                    id="loginEmail"
                    type="email"
                    autoComplete="username"
                    required
                    value={form.loginEmail}
                    onChange={(e) => setForm({ ...form, loginEmail: e.target.value })}
                    data-testid="input-agency-login-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loginPassword">Password</Label>
                  <Input
                    id="loginPassword"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={form.loginPassword}
                    onChange={(e) => setForm({ ...form, loginPassword: e.target.value })}
                    data-testid="input-agency-login-password"
                  />
                </div>
                {error && (
                  <p className="text-sm text-destructive" data-testid="text-agency-login-error">{error}</p>
                )}
                <Button type="submit" className="w-full" disabled={loading} data-testid="button-agency-login">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4" data-testid="form-agency-register">
                <div className="space-y-2">
                  <Label htmlFor="name">Agency Name</Label>
                  <Input
                    id="name"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    data-testid="input-agency-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactName">Your Name</Label>
                  <Input
                    id="contactName"
                    required
                    value={form.contactName}
                    onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                    data-testid="input-agency-contact-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    autoComplete="email"
                    required
                    value={form.contactEmail}
                    onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                    data-testid="input-agency-contact-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    data-testid="input-agency-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    data-testid="input-agency-confirm-password"
                  />
                </div>
                {error && (
                  <p className="text-sm text-destructive" data-testid="text-agency-register-error">{error}</p>
                )}
                <Button type="submit" className="w-full" disabled={loading} data-testid="button-agency-register">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </main>
    </div>
  );
}
