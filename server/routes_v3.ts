// ============================================================
// v3 — AeroDataBox Flight Alert webhook + subscription routes.
// Company host: travnr.com
//
//   POST  /api/v1/webhooks/aerodatabox/:secret   webhook ingress (2xx fast!)
//   GET   /api/v1/subscriptions/balance          alert credit balance
//   POST  /api/v1/subscriptions/balance/refill   refill { credits }
//   GET   /api/v1/subscriptions/webhook          list subscriptions
//   GET   /api/v1/subscriptions/webhook/:id      one subscription
//   POST  /api/v1/subscriptions/webhook          create { subjectType, subjectId }
//   DELETE /api/v1/subscriptions/webhook/:id     delete subscription
//
// Management endpoints are guarded by the same AERODATABOX_WEBHOOK_SECRET
// (header `x-webhook-secret`). If the secret env var is unset (local dev) the
// guard is bypassed.
//
// See MDplan/V3_WebhookExtractionPlan.md §8 Phase 1-2.
// ============================================================

import type { Express, Request, Response, NextFunction } from "express";
import {
  getBalance,
  refillBalance,
  createSubscription,
  listSubscriptions,
  getSubscription,
  deleteSubscription,
  defaultWebhookUrl,
  type SubscriptionSubjectType,
} from "./lib/disruption/aerodataboxLimiter_v3";

function webhookSecret(): string | null {
  return process.env.AERODATABOX_WEBHOOK_SECRET || null;
}

// Guard for subscription management endpoints (not the ingress — that checks
// the :secret path param).
function managementGuard(req: Request, res: Response, next: NextFunction): void {
  const secret = webhookSecret();
  if (!secret) return next(); // dev mode — no secret configured
  const supplied = req.header("x-webhook-secret");
  if (supplied !== secret) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}

export function registerV3Routes(app: Express): void {
  // ---------------------------------------------------------------------
  // WEBHOOK INGRESS — always answer 2xx within 10s or AeroDataBox retries
  // and each retry costs credits. Full extraction lands in Phase 3; for now
  // we acknowledge + log so subscriptions never burn credits on a 4xx/5xx.
  // Registered on BOTH the bare path and the /:secret path:
  //   - secret unset  → subscriptions point at /api/v1/webhooks/aerodatabox
  //   - secret set    → they point at /api/v1/webhooks/aerodatabox/<secret>
  // ---------------------------------------------------------------------
  const webhookIngress = async (req: Request, res: Response) => {
    try {
      const secret = webhookSecret();
      if (secret && (!req.params.secret || req.params.secret !== secret)) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      const body: any = req.body || {};
      const flights = Array.isArray(body?.flights) ? body.flights : [];
      const subscriptionId = body?.subscription?.id ?? null;
      const creditsRemaining = body?.balance?.creditsRemaining ?? null;
      console.log(
        `[adb-v3-webhook] received flights=${flights.length} subscription=${subscriptionId ?? "-"} credits=${creditsRemaining ?? "-"} firstFlight=${flights[0]?.number ?? "-"}`,
      );
      res.status(200).json({ received: true, flights: flights.length });
    } catch (err: any) {
      // NEVER 5xx here — a 5xx triggers a paid retry. Log and 2xx anyway.
      console.error("[adb-v3-webhook] error:", err?.message || err);
      res.status(200).json({ received: true, error: err?.message || "error" });
    }
  };
  app.post("/api/v1/webhooks/aerodatabox", webhookIngress);
  app.post("/api/v1/webhooks/aerodatabox/:secret", webhookIngress);

  // ---------------------------------------------------------------------
  // SUBSCRIPTION MANAGEMENT
  // ---------------------------------------------------------------------
  app.get("/api/v1/subscriptions/balance", managementGuard, async (_req: Request, res: Response) => {
    const balance = await getBalance();
    if (!balance) {
      return res.status(200).json({
        balance: null,
        message:
          "No alert-credit balance record yet (AeroDataBox answered an empty 200). " +
          "Initialize it with POST /api/v1/subscriptions/balance/refill { credits: N } — 1 credit = 1 API unit.",
      });
    }
    res.json({ balance });
  });

  app.post("/api/v1/subscriptions/balance/refill", managementGuard, async (req: Request, res: Response) => {
    const credits = Math.floor(Number(req.body?.credits));
    if (!Number.isFinite(credits) || credits <= 0) {
      return res.status(400).json({ error: "credits must be a positive integer" });
    }
    const balance = await refillBalance(credits);
    if (!balance) return res.status(502).json({ error: "Failed to refill AeroDataBox balance" });
    res.json({ balance });
  });

  app.get("/api/v1/subscriptions/webhook", managementGuard, async (_req: Request, res: Response) => {
    const subscriptions = await listSubscriptions();
    res.json({ subscriptions });
  });

  app.get("/api/v1/subscriptions/webhook/:id", managementGuard, async (req: Request, res: Response) => {
    const subscription = await getSubscription(String(req.params.id));
    if (!subscription) return res.status(404).json({ error: "Subscription not found" });
    res.json({ subscription });
  });

  app.post("/api/v1/subscriptions/webhook", managementGuard, async (req: Request, res: Response) => {
    const { subjectType, subjectId, maxDeliveryRetries, url } = req.body || {};
    if (subjectType !== "FlightByNumber" && subjectType !== "FlightByAirportIcao") {
      return res.status(400).json({ error: "subjectType must be FlightByNumber or FlightByAirportIcao" });
    }
    if (!subjectId || typeof subjectId !== "string") {
      return res.status(400).json({ error: "subjectId is required" });
    }
    const subscription = await createSubscription(subjectType as SubscriptionSubjectType, subjectId, {
      url: url || defaultWebhookUrl(),
      maxDeliveryRetries: maxDeliveryRetries === undefined ? 2 : Number(maxDeliveryRetries),
    });
    if (!subscription) {
      return res.status(502).json({ error: "Failed to create subscription" });
    }
    res.status(201).json({ subscription });
  });

  app.delete("/api/v1/subscriptions/webhook/:id", managementGuard, async (req: Request, res: Response) => {
    const ok = await deleteSubscription(String(req.params.id));
    if (!ok) return res.status(502).json({ error: "Failed to delete subscription" });
    res.json({ success: true });
  });
}
