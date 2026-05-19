import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle2, Plane } from "lucide-react";

export default function DisruptionConfirmed() {
  const [params, setParams] = useState<URLSearchParams | null>(null);

  useEffect(() => {
    setParams(new URLSearchParams(window.location.search));
  }, []);

  const kept = params?.get("kept") === "true";
  const flight = params?.get("flight") || "";
  const selected = params?.get("selected") || "";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">
            {kept ? "Got it — keeping your flight" : "Selection received"}
          </h1>
          <p className="text-muted-foreground">
            {kept
              ? `You've chosen to keep your original flight${flight ? ` (${flight})` : ""}. Your travel agent has been notified.`
              : `You've selected ${selected || "an alternative flight"}. Your travel agent has been notified and will handle the rebooking.`}
          </p>
        </div>

        <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground text-left space-y-1">
          <div className="flex items-center gap-2">
            <Plane className="w-4 h-4 shrink-0" />
            <span>Your travel agent will be in touch shortly to confirm the details.</span>
          </div>
          <p className="pl-6">You don't need to do anything else right now.</p>
        </div>
      </div>
    </div>
  );
}
