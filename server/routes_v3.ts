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
// See MDplan/V3_WebhookExtractionPlan.md §8 Phase 1-3.
// ============================================================

import type { Express, Request, Response, NextFunction } from "express";
import type { InsertFlightDataPrePost } from "@shared/schema";
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
import { flightNotificationContractSchema } from "./lib/disruption/flightStatus_v3";
import {
  extractFlightNotification,
  type SamplingMeta,
} from "./lib/disruption/flightNotificationExtractor_v3";
import {
  upsertFlightNotifications,
  appendResearchEvents,
  researchEventKey,
} from "./lib/disruption/flightDataPrePostStore_v3";
import { pool } from "./db";
import {
  startBatch,
  stopBatch,
  getCollectionStatus,
  getDiagnostics,
  getAirportCoverage,
  lookupSubscriptionMeta,
  startCollectionWatchdog,
  COLLECTOR_CONFIG,
} from "./lib/disruption/adbCollectionController_v3";
import { AIRPORT_CATALOG, AIRPORT_TIERS, tierForIcao } from "./lib/disruption/adbAirportCatalog_v3";

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
  // and each retry costs credits. On validation failure we still ack 2xx
  // (4xx/5xx triggers a costly retry).
  // Registered on BOTH the bare path and the /:secret path:
  //   - secret unset  → subscriptions point at /api/v1/webhooks/aerodatabox
  //   - secret set    → they point at /api/v1/webhooks/aerodatabox/<secret>
  // ---------------------------------------------------------------------
  const webhookIngress = async (req: Request, res: Response) => {
    const startedAt = Date.now();
    try {
      const secret = webhookSecret();
      if (secret && (!req.params.secret || req.params.secret !== secret)) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      const body: any = req.body || {};
      const flights: any[] = Array.isArray(body)
        ? body
        : Array.isArray(body?.flights)
          ? body.flights
          : [];

      // Validation gate (plan §5): mirror PrePosFeat.md exactly. Never
      // hard-fail on it — the extractor is null-safe, so log the issues and
      // store what we can. The 2xx is what stops AeroDataBox burning credits.
      const parsed = flightNotificationContractSchema.safeParse(body);
      if (!parsed.success) {
        const issues = parsed.error.issues
          .slice(0, 5)
          .map((i) => `${i.path.join(".") || "$"}: ${i.message}`);
        console.warn(
          `[adb-v3-webhook] payload validation issues (${parsed.error.issues.length}) — extracting defensively: ${issues.join("; ")}`,
        );
      }

      const subscription = body?.subscription ?? null;
      const balance = body?.balance ?? null;
      const receivedAt = new Date();

      // Sampling metadata: if this subscription belongs to a managed batch,
      // stamp every row with batch/tier/probability/weight. If not, fall back
      // to the catalog tier derived from the airport ICAO.
      let sampling: SamplingMeta | null = null;
      const subId = subscription?.id;
      if (subId) {
        try {
          sampling = await lookupSubscriptionMeta(String(subId));
        } catch {
          sampling = null;
        }
      }
      if (!sampling?.batchId) {
        // Real deliveries sometimes omit subject.type (it arrives null), so
        // derive the tier from the subject id (a 4-letter ICAO airport code).
        const subjType = subscription?.subject?.type;
        const subjId = subscription?.subject?.id;
        const looksLikeAirport =
          typeof subjId === "string" &&
          /^[A-Za-z]{4}$/.test(subjId) &&
          (subjType === "FlightByAirportIcao" || !subjType);
        if (looksLikeAirport) {
          const tier = tierForIcao(subjId);
          if (tier) {
            sampling = {
              batchId: null,
              tier,
              samplingProbability: null,
              samplingWeight: null,
              randomSeed: null,
              windowStart: null,
              windowEnd: null,
            };
          }
        }
      }

      const rows: InsertFlightDataPrePost[] = [];
      let skipped = 0;
      flights.forEach((flight: any, i: number) => {
        const row = extractFlightNotification(flight, {
          subscription,
          balance,
          receivedAt,
          index: i,
          sampling,
        });
        if (row) rows.push(row);
        else skipped++;
      });

      const stats = await upsertFlightNotifications(rows);

      // V3.9 S3/S4/S5 (§6, §6.2): append the research event log — one row per
      // observation, keyed on (flight, carrier, locReportedUtc) so every
      // airborne point survives. Never overwrites. Ignores errors (2xx first).
      try {
        await appendResearchEvents(
          rows.map((r, i) => ({
            eventKey: researchEventKey({
              flightNumber: r.flightNumber,
              carrierIata: r.carrierIata,
              locReportedUtc: r.locReportedUtc,
              lastUpdatedUtc: r.lastUpdatedUtc,
              receivedAt: r.receivedAt ?? new Date(),
              index: i,
            }),
            flightNumber: r.flightNumber,
            carrierIata: r.carrierIata,
            carrierIcao: r.carrierIcao,
            callSign: r.callSign,
            aircraftReg: r.aircraftReg,
            aircraftModeS: r.aircraftModeS,
            aircraftModel: r.aircraftModel,
            eventTimestamp: r.locReportedUtc ?? r.lastUpdatedUtc,
            providerPublishedUtc: r.lastUpdatedUtc,
            availableAt: null,
            receivedTimestampUtc: r.receivedAt ?? new Date(),
            dataStage: r.dataStage as "PRE" | "POST",
            status: r.status,
            hasLiveLocation: r.hasLiveLocation === true,
            locLat: r.locLat,
            locLon: r.locLon,
            locAltitudeFt: r.locAltitudeFt,
            locPressureAltitudeFt: r.locPressureAltitudeFt,
            locGroundSpeedKt: r.locGroundSpeedKt,
            locTrueTrackDeg: r.locTrueTrackDeg,
            locVsiFpm: r.locVsiFpm,
            locReportedUtc: r.locReportedUtc,
            scheduledGateOut: r.depScheduledUtc,
            actualGateOut: null,
            scheduledWheelsOff: r.depRevisedUtc,
            actualWheelsOff: r.depRunwayUtc,
            scheduledWheelsOn: r.arrRunwayUtc,
            actualWheelsOn: null,
            scheduledGateIn: r.arrScheduledUtc,
            actualGateIn: null,
            sourceLatencySeconds:
              r.lastUpdatedUtc && r.receivedAt
                ? Math.max(0, (r.receivedAt.getTime() - r.lastUpdatedUtc.getTime()) / 1000)
                : null,
            payloadSha256: null,
            batchId: sampling?.batchId ?? null,
            subscriptionId: subId ?? null,
            ingestEventId: null,
          })),
        );
      } catch (researchErr: any) {
        console.error(
          "[adb-v3-webhook] research event log write failed:",
          researchErr?.message || researchErr,
        );
      }

      // V3.9 three-quantity credit ledger (§13, §44-A): one row per delivery so
      // the controller can reconcile C_external (balance delta) vs C_internal
      // (notification_items) per batch — even across a restart. Single-writer
      // (only this ingress writes adb_ingest_events).
      try {
        await pool.query(
          `INSERT INTO clean.adb_ingest_events
             (subscription_id, batch_id, notification_items, rows_stored,
              rows_inserted, rows_updated, rows_skipped, credits_remaining)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            subId ?? null,
            sampling?.batchId ?? null,
            flights.length,
            stats.stored,
            stats.inserted,
            stats.updated,
            skipped,
            balance?.creditsRemaining ?? null,
          ],
        );
      } catch (ingestErr: any) {
        // Accounting must NEVER fail the webhook 2xx — the delivery already
        // landed; log loudly so the reconciliation finds the gap.
        console.error("[adb-v3-webhook] ingest-event write failed:", ingestErr?.message || ingestErr);
      }

      // Compact per-delivery detail so the log shows WHICH flights landed:
      //   dep→arr status (repeat N times if the same flight already exists)
      const detail = rows
        .slice(0, 8)
        .map(
          (r) =>
            `${r.depAirportIcao}->${r.arrAirportIcao}:${r.status ?? "?"}${r.samplingBatchId ? `[${r.samplingBatchId}/${r.airportTier ?? "?"}]` : ""}`,
        )
        .join(" ");
      const more = rows.length > 8 ? ` +${rows.length - 8} more` : "";
      const batchTier = rows[0]?.samplingBatchId
        ? ` batch=${rows[0].samplingBatchId} tier=${rows[0].airportTier ?? "-"}`
        : rows[0]?.airportTier
          ? ` tier=${rows[0].airportTier}`
          : "";

      console.log(
        `[adb-v3-webhook] received flights=${flights.length} stored=${stats.stored} (new=${stats.inserted} updated=${stats.updated}) skipped=${skipped} subscription=${subscription?.id ?? "-"} credits=${balance?.creditsRemaining ?? "-"} ms=${Date.now() - startedAt}${batchTier} | ${detail || "-"}${more}`,
      );
      res.status(200).json({
        received: true,
        flights: flights.length,
        stored: stats.stored,
        skipped,
      });
    } catch (err: any) {
      // NEVER 5xx here — a 5xx triggers a paid retry. Log and 2xx anyway.
      console.error("[adb-v3-webhook] error:", err?.message || err);
      // V3.9 delivery-failure ledger (§44-C): count the failed delivery so the
      // failure-rate gate can PAUSE collection (it never throws back a 5xx).
      try {
        const subIdRaw = req.body?.subscription?.id ?? null;
        await pool.query(
          `INSERT INTO clean.adb_ingest_events
             (subscription_id, notification_items, delivery_failure, error)
           VALUES ($1, 0, true, $2)`,
          [typeof subIdRaw === "string" ? subIdRaw : null, String(err?.message || "error").slice(0, 500)],
        );
      } catch (ledgerErr: any) {
        console.error("[adb-v3-webhook] failure-ledger write failed:", ledgerErr?.message || ledgerErr);
      }
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

  // ---------------------------------------------------------------------
  // TIER-ROTATING COLLECTION (MDplan/V3_CollectionStrategy.md)
  // Subscribe to a small rotating set of airports for a short window,
  // collect, unsubscribe, move to the next batch. Budget-guarded.
  // ---------------------------------------------------------------------
  app.get("/api/v1/collection/catalog", managementGuard, (_req: Request, res: Response) => {
    const byTier = Object.fromEntries(
      AIRPORT_TIERS.map((t) => [t, [...AIRPORT_CATALOG[t]]]),
    );
    res.json({ tiers: AIRPORT_TIERS, byTier, tierMix: COLLECTOR_CONFIG.tierMix });
  });

  app.get("/api/v1/collection/status", managementGuard, async (_req: Request, res: Response) => {
    try {
      res.json(await getCollectionStatus());
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "failed to read collection status" });
    }
  });

  app.post("/api/v1/collection/start", managementGuard, async (_req: Request, res: Response) => {
    try {
      const result = await startBatch();
      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err?.message || "failed to start batch" });
    }
  });

  app.post("/api/v1/collection/stop", managementGuard, async (req: Request, res: Response) => {
    try {
      const reason = String(req.body?.reason || "manual");
      const closed = await stopBatch(reason);
      if (!closed) return res.status(404).json({ error: "No active batch to stop" });
      res.json({ stopped: closed });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "failed to stop batch" });
    }
  });

  app.get("/api/v1/collection/diagnostics", managementGuard, async (_req: Request, res: Response) => {
    try {
      res.json(await getDiagnostics());
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "failed to run diagnostics" });
    }
  });

  app.get("/api/v1/collection/coverage", managementGuard, async (req: Request, res: Response) => {
    try {
      const force = req.query?.force === "1" || req.query?.force === "true";
      const cov = await getAirportCoverage(force);
      if (!cov) return res.status(502).json({ error: "Coverage enumeration failed — check AERODATABOX_API_KEY" });
      res.json(cov);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "failed to fetch coverage" });
    }
  });

  // Auto-stop watchdog: closes a batch when its window elapses or its credit
  // budget is reached. DB reads + free delete calls only — cannot burn credits.
  startCollectionWatchdog();
}
