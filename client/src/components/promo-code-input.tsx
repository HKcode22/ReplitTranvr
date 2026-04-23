import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tag, X, Check, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export type AppliedPromo = {
  code: string;
  overrideAmountCents: number;
  forceManual: boolean;
};

type Props = {
  applied: AppliedPromo | null;
  onApply: (promo: AppliedPromo) => void;
  onClear: () => void;
  currency: string;
};

export function PromoCodeInput({ applied, onApply, onClear, currency }: Props) {
  const { toast } = useToast();
  const [code, setCode] = useState("");

  const mutation = useMutation({
    mutationFn: async (rawCode: string) => {
      const res = await apiRequest("POST", "/api/promo/validate", { code: rawCode });
      return (await res.json()) as { valid: boolean; code: string; overrideAmountCents: number; forceManual: boolean };
    },
    onSuccess: (data) => {
      if (!data.valid) {
        toast({ title: "Invalid promo code", variant: "destructive" });
        return;
      }
      onApply({ code: data.code, overrideAmountCents: data.overrideAmountCents, forceManual: data.forceManual });
      toast({ title: `Promo applied: ${data.code}` });
      setCode("");
    },
    onError: (err: Error) => {
      const raw = err.message?.replace(/^\d+:\s*/, "") || "Invalid promo code";
      let msg = raw;
      try { const parsed = JSON.parse(raw); msg = parsed.message || raw; } catch {}
      toast({ title: "Promo rejected", description: msg, variant: "destructive" });
    },
  });

  if (applied) {
    const dollars = (applied.overrideAmountCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 });
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-violet-500/30 bg-violet-500/5 px-3 py-2" data-testid="promo-applied">
        <div className="flex items-center gap-2 min-w-0">
          <Check className="w-4 h-4 text-violet-600 shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">
              Promo <span className="font-mono">{applied.code}</span> applied
            </div>
            <div className="text-xs text-muted-foreground">
              Charge overridden to {currency.toUpperCase()} {dollars}
              {applied.forceManual && " · routes to manual fallback"}
            </div>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClear}
          data-testid="button-clear-promo"
        >
          <X className="w-3 h-3 mr-1" /> Remove
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
          <Tag className="w-3 h-3" /> Promo code (optional)
        </div>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter code"
          disabled={mutation.isPending}
          data-testid="input-promo-code"
        />
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={() => code.trim() && mutation.mutate(code.trim())}
        disabled={mutation.isPending || !code.trim()}
        data-testid="button-apply-promo"
      >
        {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
      </Button>
    </div>
  );
}
