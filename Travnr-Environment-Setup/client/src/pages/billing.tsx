import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Receipt, DollarSign, Hash, Plus, Trash2, Star, Loader2, Shield } from "lucide-react";
import type { Payment, SavedCard } from "@shared/schema";

function detectCardBrand(number: string): string {
  const cleaned = number.replace(/\s/g, "");
  if (/^4/.test(cleaned)) return "visa";
  if (/^5[1-5]/.test(cleaned)) return "mastercard";
  if (/^3[47]/.test(cleaned)) return "amex";
  if (/^6/.test(cleaned)) return "discover";
  return "visa";
}

function CardBrandIcon({ brand }: { brand: string }) {
  const label = brand.charAt(0).toUpperCase() + brand.slice(1);
  return (
    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
  );
}

export default function BillingPage() {
  const { toast } = useToast();
  const [showAddCard, setShowAddCard] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardholderName, setCardholderName] = useState("");

  const { data: payments, isLoading: paymentsLoading } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
  });

  const { data: savedCards, isLoading: cardsLoading } = useQuery<SavedCard[]>({
    queryKey: ["/api/saved-cards"],
  });

  const { data: duffelConfig } = useQuery<{ testMode: boolean }>({
    queryKey: ["/api/duffel/config"],
  });

  const addCardMutation = useMutation({
    mutationFn: async () => {
      const cleaned = cardNumber.replace(/\s/g, "");
      if (cleaned.length < 13) throw new Error("Invalid card number");
      const [mm, yy] = cardExpiry.split("/");
      if (!mm || !yy) throw new Error("Invalid expiry (MM/YY)");
      if (!cardCvc || cardCvc.length < 3) throw new Error("Invalid CVC");
      if (!cardholderName.trim()) throw new Error("Cardholder name is required");

      const res = await apiRequest("POST", "/api/saved-cards", {
        cardBrand: detectCardBrand(cleaned),
        lastFour: cleaned.slice(-4),
        expiryMonth: mm.padStart(2, "0"),
        expiryYear: yy.length === 2 ? `20${yy}` : yy,
        cardholderName: cardholderName.trim(),
        isDefault: true,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-cards"] });
      setShowAddCard(false);
      setCardNumber("");
      setCardExpiry("");
      setCardCvc("");
      setCardholderName("");
      toast({ title: "Card saved" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteCardMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/saved-cards/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-cards"] });
      toast({ title: "Card removed" });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/saved-cards/${id}/default`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-cards"] });
      toast({ title: "Default card updated" });
    },
  });

  const totalPaid = payments
    ?.filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + Number(p.amount), 0) || 0;

  const prefillTestCard = () => {
    setCardNumber("4242 4242 4242 4242");
    setCardExpiry("12/25");
    setCardCvc("123");
    setCardholderName("Test Traveler");
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold" data-testid="text-billing-title">Billing</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your payment methods and view transaction history</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-sm text-muted-foreground">Total Paid</span>
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          {paymentsLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <p className="text-2xl font-bold" data-testid="text-total-paid">${totalPaid.toLocaleString()}</p>
          )}
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-sm text-muted-foreground">Transactions</span>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Hash className="w-4 h-4 text-primary" />
            </div>
          </div>
          {paymentsLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="text-2xl font-bold" data-testid="text-transaction-count">{payments?.length || 0}</p>
          )}
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <CreditCard className="w-5 h-5" /> Payment Methods
          </h2>
          {!showAddCard && (
            <Button variant="outline" size="sm" onClick={() => setShowAddCard(true)} data-testid="button-add-card">
              <Plus className="w-4 h-4 mr-1" /> Add Card
            </Button>
          )}
        </div>

        {cardsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <div className="space-y-3">
            {savedCards?.map((card) => (
              <Card key={card.id} className="p-4" data-testid={`card-saved-${card.id}`}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardBrandIcon brand={card.cardBrand} />
                        <span className="font-mono font-medium">**** {card.lastFour}</span>
                        {card.isDefault && <Badge variant="secondary" className="text-xs">Default</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{card.cardholderName} &middot; Exp {card.expiryMonth}/{card.expiryYear}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!card.isDefault && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDefaultMutation.mutate(card.id)}
                        disabled={setDefaultMutation.isPending}
                        data-testid={`button-set-default-${card.id}`}
                      >
                        <Star className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteCardMutation.mutate(card.id)}
                      disabled={deleteCardMutation.isPending}
                      data-testid={`button-delete-card-${card.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

            {!savedCards?.length && !showAddCard && (
              <Card className="p-6 text-center">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">
                  <CreditCard className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground mb-3">No payment methods saved. Add a card to speed up checkout.</p>
                <Button variant="outline" size="sm" onClick={() => setShowAddCard(true)} data-testid="button-add-card-empty">
                  <Plus className="w-4 h-4 mr-1" /> Add Card
                </Button>
              </Card>
            )}

            {showAddCard && (
              <Card className="p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Add Payment Method
                </h3>
                {duffelConfig?.testMode && (
                  <div className="mb-4 p-3 rounded-md border border-dashed bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-2">Test mode is active. Use the test card for testing:</p>
                    <Button variant="outline" size="sm" onClick={prefillTestCard} data-testid="button-prefill-test-card">
                      Fill Test Card (4242...)
                    </Button>
                  </div>
                )}
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Cardholder Name</label>
                    <Input
                      value={cardholderName}
                      onChange={(e) => setCardholderName(e.target.value)}
                      placeholder="Name on card"
                      data-testid="input-cardholder-name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Card Number</label>
                    <Input
                      value={cardNumber}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 16);
                        setCardNumber(val.replace(/(.{4})/g, "$1 ").trim());
                      }}
                      placeholder="4242 4242 4242 4242"
                      data-testid="input-card-number"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Expiry</label>
                      <Input
                        value={cardExpiry}
                        onChange={(e) => {
                          let val = e.target.value.replace(/\D/g, "").slice(0, 4);
                          if (val.length > 2) val = val.slice(0, 2) + "/" + val.slice(2);
                          setCardExpiry(val);
                        }}
                        placeholder="MM/YY"
                        data-testid="input-card-expiry"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">CVC</label>
                      <Input
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        placeholder="123"
                        data-testid="input-card-cvc"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      onClick={() => addCardMutation.mutate()}
                      disabled={addCardMutation.isPending}
                      data-testid="button-save-card"
                    >
                      {addCardMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CreditCard className="w-4 h-4 mr-1" />}
                      Save Card
                    </Button>
                    <Button variant="ghost" onClick={() => setShowAddCard(false)} data-testid="button-cancel-add-card">
                      Cancel
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>

      <Separator />

      <div>
        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Receipt className="w-5 h-5" /> Transaction History
        </h2>

        {paymentsLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : !payments?.length ? (
          <Card className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Receipt className="w-6 h-6 text-primary" />
            </div>
            <p className="font-medium mb-1">No payments yet</p>
            <p className="text-sm text-muted-foreground">Payments for booked flights and approved itineraries will appear here.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {payments.map((payment) => (
              <Card key={payment.id} className="p-4" data-testid={`card-payment-${payment.id}`}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Receipt className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">${Number(payment.amount).toLocaleString()} {payment.currency.toUpperCase()}</p>
                      <p className="text-xs text-muted-foreground">
                        {payment.duffelBookingRef ? `Ref: ${payment.duffelBookingRef}` : payment.proposalId ? `Proposal #${payment.proposalId}` : "Direct booking"}
                        {" "}&middot; {new Date(payment.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={payment.status} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
