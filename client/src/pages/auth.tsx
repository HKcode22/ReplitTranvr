import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, Mail, ArrowLeft, KeyRound } from "lucide-react";

import { apiRequest } from "@/lib/queryClient";

// Mirror of server/lib/phone.ts:normalizePhoneE164 so the register form can
// validate before submit and surface inline errors instead of round-tripping
// to the server for obviously invalid input.
function normalizePhoneE164Client(input: string): string | null {
  if (!input) return null;
  const cleaned = String(input).replace(/[\s\-().]/g, "");
  if (!cleaned) return null;
  if (cleaned.startsWith("+")) {
    const digits = cleaned.slice(1);
    if (!/^\d+$/.test(digits) || digits.length < 7 || digits.length > 15) return null;
    return cleaned;
  }
  if (!/^\d+$/.test(cleaned)) return null;
  if (cleaned.length === 10) return `+1${cleaned}`;
  if (cleaned.length === 11 && cleaned.startsWith("1")) return `+${cleaned}`;
  if (cleaned.length >= 7 && cleaned.length <= 15) return `+${cleaned}`;
  return null;
}

export default function AuthPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const [, setLocation] = useLocation();
  const { user, login, register, isLoading } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<"login" | "register">(params.get("mode") === "register" ? "register" : "login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const emailFromUrl = params.get("email") || "";
  const nameFromUrl = params.get("name") || "";
  const phoneFromUrl = params.get("phone") || "";
  const claimToken = params.get("claim") || "";
  const [firstFromUrl, ...restNameParts] = nameFromUrl.trim().split(/\s+/);
  const lastFromUrl = restNameParts.join(" ");
  const [form, setForm] = useState({
    firstName: firstFromUrl || "",
    lastName: lastFromUrl || "",
    email: emailFromUrl,
    phone: phoneFromUrl,
    password: "",
  });

  useEffect(() => {
    if ((emailFromUrl || nameFromUrl || phoneFromUrl) && !params.get("mode")) {
      setMode("register");
    }
  }, []);

  useEffect(() => {
    if (params.get("verified") === "true") {
      setMode("login");
      toast({ title: "Email verified!", description: "You can now log in." });
    }
    const verifyError = params.get("verifyError");
    if (verifyError) {
      const messages: Record<string, string> = {
        missing: "The verification link is incomplete. Please try clicking the link again or request a new one.",
        invalid: "This verification link has expired or already been used. Please request a new verification email.",
        server: "Something went wrong while verifying your email. Please try again later.",
      };
      toast({
        title: "Verification failed",
        description: messages[verifyError] || messages.server,
        variant: "destructive",
      });
    }
  }, []);

  useEffect(() => {
    if (user && !isLoading) setLocation("/dashboard");
  }, [user, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (mode === "register") {
      const normalized = normalizePhoneE164Client(form.phone);
      if (!normalized) {
        setError("Please enter a valid phone number");
        return;
      }
    }
    setLoading(true);
    try {
      if (mode === "register") {
        const result = await register({
          ...form,
          phone: form.phone,
          claimToken: claimToken || undefined,
        });
        if (result.needsVerification) {
          setNeedsVerification(true);
          setRegisteredEmail(form.email);
        }
      } else {
        await login(form.email, form.password);
      }
    } catch (err: any) {
      setError(err.message?.replace(/^\d+:\s*/, "") || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await apiRequest("POST", "/api/auth/resend-verification", { email: registeredEmail });
      toast({ title: "Verification email sent", description: "Check your inbox." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setResending(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      await apiRequest("POST", "/api/auth/forgot-password", { email: forgotEmail });
      setForgotSent(true);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setForgotLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b h-14 flex items-center px-4 justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-serif font-semibold text-lg">Travnr</span>
          </Link>
          <ThemeToggle />
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-8 text-center">
            {forgotSent ? (
              <>
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <h2 className="font-serif text-2xl font-bold mb-2" data-testid="text-reset-sent-title">Check your email</h2>
                <p className="text-muted-foreground mb-1">If an account exists for</p>
                <p className="font-medium mb-4" data-testid="text-reset-email">{forgotEmail}</p>
                <p className="text-sm text-muted-foreground mb-6">you'll receive a password reset link shortly. The link expires in 1 hour.</p>
                <Button variant="ghost" className="w-full" onClick={() => { setShowForgotPassword(false); setForgotSent(false); setForgotEmail(""); }} data-testid="button-back-to-login-from-reset">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to login
                </Button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <KeyRound className="w-8 h-8 text-primary" />
                </div>
                <h2 className="font-serif text-2xl font-bold mb-2" data-testid="text-forgot-title">Forgot your password?</h2>
                <p className="text-sm text-muted-foreground mb-6">Enter your email address and we'll send you a link to reset your password.</p>
                <form onSubmit={handleForgotPassword} className="space-y-4 text-left">
                  <div>
                    <Label htmlFor="forgot-email">Email</Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                      data-testid="input-forgot-email"
                    />
                  </div>
                  <Button className="w-full" disabled={forgotLoading} data-testid="button-send-reset-link">
                    {forgotLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Send reset link
                  </Button>
                </form>
                <Button variant="ghost" className="w-full mt-2" onClick={() => { setShowForgotPassword(false); setForgotEmail(""); }} data-testid="button-back-to-login-from-forgot">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to login
                </Button>
              </>
            )}
          </Card>
        </div>
      </div>
    );
  }

  if (needsVerification) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b h-14 flex items-center px-4 justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-serif font-semibold text-lg">Travnr</span>
          </Link>
          <ThemeToggle />
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <h2 className="font-serif text-2xl font-bold mb-2" data-testid="text-verify-title">Check your email</h2>
            <p className="text-muted-foreground mb-1">We sent a verification link to</p>
            <p className="font-medium mb-4" data-testid="text-verify-email">{registeredEmail}</p>
            <p className="text-sm text-muted-foreground mb-6">Click the link in the email to verify your account, then come back here to log in.</p>
            <Button variant="outline" onClick={handleResend} disabled={resending} className="w-full" data-testid="button-resend-verification">
              {resending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Resend verification email
            </Button>
            <Button variant="ghost" className="w-full mt-2" onClick={() => { setNeedsVerification(false); setMode("login"); }} data-testid="button-back-to-login">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to login
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b h-14 flex items-center px-4 justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-serif font-semibold text-lg">Travnr</span>
        </Link>
        <ThemeToggle />
      </header>
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8">
          <h2 className="font-serif text-2xl font-bold mb-1" data-testid="text-auth-title">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            {mode === "login" ? "Sign in to your Travnr account" : "Get started with Travnr"}
          </p>

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mb-4" data-testid="text-auth-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    required
                    data-testid="input-first-name"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    id="lastName"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    required
                    data-testid="input-last-name"
                  />
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                data-testid="input-email"
              />
            </div>
            {mode === "register" && (
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+1 555 123 4567"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  required
                  data-testid="input-phone"
                />
              </div>
            )}
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={6}
                  data-testid="input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {mode === "login" && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => { setShowForgotPassword(true); setForgotEmail(form.email); setError(""); }}
                    className="text-xs text-primary hover:underline"
                    data-testid="button-forgot-password"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </div>
            <Button className="w-full" disabled={loading} data-testid="button-auth-submit">
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {mode === "login" ? "Sign In" : "Create Account"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                Don't have an account?{" "}
                <button onClick={() => { setMode("register"); setError(""); }} className="text-primary hover:underline" data-testid="button-switch-to-register">
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button onClick={() => { setMode("login"); setError(""); }} className="text-primary hover:underline" data-testid="button-switch-to-login">
                  Sign in
                </button>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
