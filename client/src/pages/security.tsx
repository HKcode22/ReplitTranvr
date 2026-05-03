import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Lock, Eye, Server, FileCheck, Globe, Users, Database, KeyRound, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export default function SecurityPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    setSavingPassword(true);
    try {
      await apiRequest("POST", "/api/auth/change-password", { currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({
        title: "Password updated",
        description: "Other devices have been signed out.",
      });
    } catch (err: any) {
      setPasswordError(err?.message || "Could not update password");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold" data-testid="text-security-title">Security & Compliance</h1>
        <p className="text-muted-foreground text-sm mt-1">How we protect your data and ensure your privacy</p>
      </div>

      {user && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold" data-testid="text-change-password-heading">Change Password</h2>
              <p className="text-sm text-muted-foreground">Updating your password signs out every other device.</p>
            </div>
          </div>
          <Separator />
          <form onSubmit={handleChangePassword} className="space-y-3">
            {passwordError && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md" data-testid="text-change-password-error">
                {passwordError}
              </div>
            )}
            <div>
              <Label htmlFor="current-password">Current password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                data-testid="input-current-password"
              />
            </div>
            <div>
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                data-testid="input-change-new-password"
              />
            </div>
            <div>
              <Label htmlFor="confirm-new-password">Confirm new password</Label>
              <Input
                id="confirm-new-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                data-testid="input-confirm-new-password"
              />
            </div>
            <Button type="submit" disabled={savingPassword} data-testid="button-change-password">
              {savingPassword && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Update password
            </Button>
          </form>
        </Card>
      )}

      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold" data-testid="text-data-protection-heading">Data Protection</h2>
            <p className="text-sm text-muted-foreground">Your personal and travel information is secured at every level</p>
          </div>
        </div>
        <Separator />
        <div className="space-y-4">
          <div className="flex gap-3">
            <Lock className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Encryption in Transit & at Rest</p>
              <p className="text-sm text-muted-foreground">All data is encrypted using TLS 1.2+ during transmission and AES-256 encryption at rest. Your passwords are securely hashed using bcrypt.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Database className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Secure Database</p>
              <p className="text-sm text-muted-foreground">Your data is stored in an encrypted PostgreSQL database with regular automated backups and point-in-time recovery capabilities.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Server className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Infrastructure Security</p>
              <p className="text-sm text-muted-foreground">Our infrastructure is hosted on secure cloud platforms with automated monitoring, intrusion detection, and regular security updates.</p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Eye className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold" data-testid="text-data-usage-heading">Data Usage</h2>
            <p className="text-sm text-muted-foreground">Understanding how we handle your information</p>
          </div>
        </div>
        <Separator />
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">What We Collect</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Profile</Badge>
                <span className="text-sm text-muted-foreground">Name, email, phone, passport details for flight bookings</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Travel</Badge>
                <span className="text-sm text-muted-foreground">Trip preferences, destinations, booking history</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Calls</Badge>
                <span className="text-sm text-muted-foreground">AI concierge call recordings and transcripts for service improvement</span>
              </div>
            </div>
          </div>
          <Separator />
          <div>
            <p className="text-sm font-medium mb-2">How We Use Your Data</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-primary shrink-0">1.</span>
                <span>To search, compare, and book flights through our airline partner (Duffel)</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary shrink-0">2.</span>
                <span>To provide personalized AI concierge calls tailored to your travel preferences</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary shrink-0">3.</span>
                <span>To process payments securely through Duffel's PCI-compliant payment system</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary shrink-0">4.</span>
                <span>To send booking confirmations and important travel updates via email</span>
              </li>
            </ul>
          </div>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <FileCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold" data-testid="text-compliance-heading">Compliance</h2>
            <p className="text-sm text-muted-foreground">Industry standards and regulations we follow</p>
          </div>
        </div>
        <Separator />
        <div className="space-y-4">
          <div className="flex gap-3">
            <Globe className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">PCI DSS Compliance</p>
              <p className="text-sm text-muted-foreground">Payment card data is handled by our PCI-compliant partner (Duffel). We never store your full card numbers on our servers.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Users className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Data Privacy</p>
              <p className="text-sm text-muted-foreground">We respect your privacy rights. You can request deletion of your personal data at any time by contacting our support team.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Shield className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Third-Party Partners</p>
              <p className="text-sm text-muted-foreground">We work with trusted partners who meet strict security standards:</p>
              <div className="mt-2 flex gap-2 flex-wrap">
                <Badge variant="outline">Duffel</Badge>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
