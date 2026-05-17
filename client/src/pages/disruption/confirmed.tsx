import { useSearch } from "wouter";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Plane } from "lucide-react";

export default function DisruptionConfirmedPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const flight = params.get("flight") || "";
  const selected = params.get("selected") || "";
  const kept = params.get("kept") === "true";
  const already = params.get("already") === "true";

  let title = "You're all set";
  let body =
    "Your travel agent has been notified and will handle the rebooking.";

  if (already) {
    title = "You've already responded";
    body = "Your travel agent has been notified — no further action needed.";
  } else if (kept) {
    title = "Got it. Your original flight is confirmed.";
    body = `Your travel agent has been notified that you're sticking with flight ${flight}.`;
  } else if (selected) {
    title = "You're all set";
    body = `Your travel agent has been notified and will rebook you onto flight ${selected}. You won't be charged anything extra.`;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-2 text-blue-600 font-semibold">
          <Plane className="h-5 w-5" />
          <span>Travnr</span>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-16">
        <Card className="bg-white p-10 text-center border border-gray-200" data-testid="card-disruption-confirmed">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-5" />
          <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          <p className="text-base text-gray-600 mt-3 leading-relaxed">{body}</p>
        </Card>
      </main>
    </div>
  );
}
