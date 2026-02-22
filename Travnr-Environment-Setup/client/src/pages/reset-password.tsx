import { useState } from "react";
import { Link, useSearch, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, CheckCircle, ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function ResetPasswordPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const token = params.get("token") || "";
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await apiRequest("POST", "/api/auth/reset-password", { token, password });
      setSuccess(true);
    } catch (err: any) {
      const raw = err.message?.replace(/^\d+:\s*/, "") || "Something went wrong";
      try {
        const parsed = JSON.parse(raw);
        setError(parsed.message || raw);
      } catch {
        setError(raw);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
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
            <h2 className="font-serif text-2xl font-bold mb-2">Invalid reset link</h2>
            <p className="text-sm text-muted-foreground mb-6">This password reset link is invalid or has expired.</p>
            <Button variant="ghost" className="w-full" onClick={() => setLocation("/auth")} data-testid="button-go-to-login">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to login
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  if (success) {
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
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="font-serif text-2xl font-bold mb-2" data-testid="text-reset-success-title">Password reset</h2>
            <p className="text-sm text-muted-foreground mb-6">Your password has been successfully reset. You can now log in with your new password.</p>
            <Button className="w-full" onClick={() => setLocation("/auth")} data-testid="button-login-after-reset">
              Sign in
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
          <h2 className="font-serif text-2xl font-bold mb-1" data-testid="text-reset-title">Set new password</h2>
          <p className="text-muted-foreground text-sm mb-6">Enter your new password below.</p>

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mb-4" data-testid="text-reset-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="new-password">New password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  data-testid="input-new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  data-testid="button-toggle-new-password"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                data-testid="input-confirm-password"
              />
            </div>
            <Button className="w-full" disabled={loading} data-testid="button-reset-password">
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Reset password
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
