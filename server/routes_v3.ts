/**
 * V3.9-f.8 AeroDataBox webhook + management routes.
 * Binding authority: SEPmd/V3.9_DataCollectPlan_f.8.md §§0–21.
 *
 * Webhook ordering is intentionally strict:
 *   durable raw envelope+items -> canonical semantic events -> current-state
 *   convenience upsert -> 2xx.
 * Raw item indices are preserved across parser skips; provider delivery-attempt
 * cost/identity is retained when supplied; every semantic event (including
 * position updates) is keyed by canonical physical flight identity.
 */
import type { Express, Request, Response, NextFunction } from "express";
import { createHash } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";
import type { InsertFlightDataPrePost } from "@shared/schema";
import {
  getBalance,
  refillBalance,
  createSubscription,
  listSubscriptions,
  getSubscription,
  deleteSubscription,
  defaultWebhookUrl,
  resolveExperimentalRetries,
  type SubscriptionSubjectType,
} from "./lib/disruption/aerodataboxLimiter_v3";
import { flightNotificationContractSchema } from "./lib/disruption/flightStatus_v3";
import { extractFlightNotification, type SamplingMeta } from "./lib/disruption/flightNotificationExtractor_v3";
import {
  upsertFlightNotifications,
  appendResearchEvents,
  semanticObservationKey,
} from "./lib/disruption/flightDataPrePostStore_v3";
import { resolveWebhookFlightIdentity } from "./lib/disruption/flightInstanceCanonical_v3";
import { persistProcessingAttempt, persistRawDeliveryTransaction } from "./lib/disruption/rawIngress_v3";
import {
  verifyAuthRecord,
  approvedArtifactHashesFromLedger,
  sha256HexString,
  type AuthRecord,
} from "./lib/disruption/authRecord_v39";
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

function managementGuard(req: Request, res: Response, next: NextFunction): void {
  const secret = webhookSecret();
  if (!secret) return next();
  if (req.header("x-webhook-secret") !== secret) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}

function loadLedgerText(): string {
  try {
    return readFileSync(join(process.cwd(), "SEPmd", "V3.9_RUN_REPORTS_AND_EVIDENCE.md"), "utf8");
  } catch {
    return "";
  }
}
function loadLedgerEvidenceIds(): string[] {
  const text = loadLedgerText();
  return Array.from(new Set(
    Array.from(text.matchAll(/\b((?:RUN|GATE|AUTH|ISS|DEC)-\d{8}-[0-9A-Z]+)\b/g)).map((m) => m[1]),
  ));
}

/**
 * Every provider-mutating management endpoint must pass BOTH exact AUTH and the
 * persistent incident stop. Safety stop itself is intentionally not behind
 * this mutation guard because it must remain callable during an incident.
 */
function managementMutationGuard(expectedScope: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const incident = await pool.query(
        `SELECT cause,occurred_at_utc FROM clean.adb_incident_stop
          WHERE resolved=false ORDER BY occurred_at_utc DESC LIMIT 1`,
      );
      if (incident.rowCount) {
        res.status(423).json({
          error: `REFUSED_INCIDENT_STOP: ${incident.rows[0].cause} at ${incident.rows[0].occurred_at_utc}`,
        });
        return;
      }
    } catch (error: any) {
      // An unreadable safety ledger is uncertainty, never permission.
      res.status(503).json({ error: `REFUSED_INCIDENT_LEDGER_UNAVAILABLE: ${error?.message ?? error}` });
      return;
    }

    const raw = req.header("x-experiment-auth");
    if (!raw) {
      res.status(403).json({ error: "Provider mutations require exact x-experiment-auth authorization." });
      return;
    }
    let record: AuthRecord;
    try {
      record = JSON.parse(raw);
    } catch {
      res.status(403).json({ error: "x-experiment-auth is not valid JSON." });
      return;
    }
    if (!record.predecessorEvidenceIds?.length) {
      res.status(403).json({ error: "AUTH refused: predecessor evidence list is empty." });
      return;
    }
    const ledgerText = loadLedgerText();
    const verdict = verifyAuthRecord(record, {
      nowUtc: new Date(),
      existingEvidenceIds: loadLedgerEvidenceIds(),
      expectedPhaseGate: expectedScope,
      artifactHash: sha256HexString(raw),
      approvedArtifactHashes: approvedArtifactHashesFromLedger(ledgerText),
    });
    if (!verdict.verified) {
      res.status(403).json({ error: `AUTH refused: ${verdict.reason}` });
      return;
    }
    next();
  };
}

function finiteNonnegativeOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
function dateOrNull(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isFinite(d.getTime()) ? d : null;
}
function hashJson(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

/** Extract provider delivery-attempt evidence without fabricating it. */
function providerDeliveryEvidence(body: any, req: Request): { deliveryId: string | null; costCredits: number | null } {
  const attempt = body?.deliveryAttempt ?? body?.delivery?.attempt ?? null;
  const headerId = req.header("x-delivery-id") ?? req.header("x-aerodatabox-delivery-id") ?? null;
  const deliveryId = typeof attempt?.id === "string" && attempt.id.trim()
    ? attempt.id.trim()
    : typeof headerId === "string" && headerId.trim()
      ? headerId.trim()
      : null;
  const costCredits = finiteNonnegativeOrNull(attempt?.costCredits ?? body?.deliveryAttemptCostCredits ?? null);
  return { deliveryId, costCredits };
}

export function registerV3Routes(app: Express): void {
  const webhookIngress = async (req: Request, res: Response) => {
    const startedAt = Date.now();
    let rawDeliveryIdForCatch: string | null = null;
    let receivedAtForCatch: Date | null = null;
    let flightsForCatch: any[] = [];
    try {
      const secret = webhookSecret();
      if (secret && (!req.params.secret || req.params.secret !== secret)) {
        res.status(404).json({ error: "Not found" });
        return;
      }

      const body: any = req.body || {};
      const flights: any[] = Array.isArray(body) ? body : Array.isArray(body?.flights) ? body.flights : [];
      flightsForCatch = flights;
      const parsed = flightNotificationContractSchema.safeParse(body);
      if (!parsed.success) {
        const issues = parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".") || "$"}: ${i.message}`);
        console.warn(`[adb-v3-webhook] payload validation issues (${parsed.error.issues.length}): ${issues.join("; ")}`);
      }

      const subscription = body?.subscription ?? null;
      const balance = body?.balance ?? null;
      const receivedAt = new Date();
      receivedAtForCatch = receivedAt;
      const subId = typeof subscription?.id === "string" ? subscription.id : null;

      let sampling: SamplingMeta | null = null;
      if (subId) {
        try { sampling = await lookupSubscriptionMeta(subId); } catch { sampling = null; }
      }
      // Diagnostic-only fallback for foreign/unmanaged deliveries. It must not
      // fabricate REGIONAL or a design probability.
      if (!sampling?.batchId) {
        const subjType = subscription?.subject?.type;
        const subjId = subscription?.subject?.id;
        const looksLikeAirport = typeof subjId === "string" && /^[A-Za-z]{4}$/.test(subjId) &&
          (subjType === "FlightByAirportIcao" || !subjType);
        const tier = looksLikeAirport ? tierForIcao(subjId) : null;
        if (tier) {
          sampling = {
            batchId: null,
            tier,
            isRandomized: null,
            airportLayerDesignProbability: null,
            plannedShare: null,
            samplingWeight: null,
            randomSeed: null,
            windowStart: null,
            windowEnd: null,
          };
        }
      }

      const deliveryEvidence = providerDeliveryEvidence(body, req);
      let rawDeliveryId: string | null = null;
      let rawCommittedAtUtc = receivedAt;
      try {
        const committed = await persistRawDeliveryTransaction(
          {
            subscriptionId: subId,
            batchId: sampling?.batchId ?? null,
            httpMethod: req.method ?? "POST",
            httpPath: req.originalUrl ?? req.path ?? null,
            rawBody: body,
            providerPublishedUtc: dateOrNull(flights[0]?.lastUpdatedUtc ?? balance?.lastDeductedUtc ?? null),
            receivedAtUtc: receivedAt,
            adbDeliveryId: deliveryEvidence.deliveryId,
            adbCostCredits: deliveryEvidence.costCredits,
          },
          flights.map((flight: any, i: number) => ({
            itemIndex: i,
            flightNumber: typeof flight?.number === "string" && flight.number
              ? String(flight.number)
              : typeof flight?.callSign === "string" ? String(flight.callSign) : null,
            carrierIata: flight?.airline?.iata ?? null,
            carrierIcao: flight?.airline?.icao ?? null,
            status: flight?.status != null ? String(flight.status) : null,
            statusCode: typeof flight?.status === "number" ? Math.trunc(flight.status) : null,
            rawItem: flight,
            lastUpdatedUtc: dateOrNull(flight?.lastUpdatedUtc),
            departureScheduledUtc: dateOrNull(flight?.departure?.scheduledTime?.utc),
            arrivalScheduledUtc: dateOrNull(flight?.arrival?.scheduledTime?.utc),
            parsingOutcome: "pending",
            canonicalFlightInstanceId: null,
          })),
        );
        rawDeliveryId = committed.deliveryId;
        rawCommittedAtUtc = committed.committedAtUtc;
      } catch (rawErr: any) {
        console.error("[adb-v3-webhook] raw delivery persistence failed — returning 5xx:", rawErr?.message || rawErr);
        res.status(500).json({ error: "Raw persistence failed; please retry" });
        return;
      }
      rawDeliveryIdForCatch = rawDeliveryId;

      // Carry the ORIGINAL raw item index/object/hash through extraction. Never
      // recover raw identity via the filtered rows[] index.
      const extracted: Array<{
        row: InsertFlightDataPrePost;
        rawIndex: number;
        rawFlight: any;
        rawItemSha256: string;
      }> = [];
      let skipped = 0;
      flights.forEach((flight: any, rawIndex: number) => {
        const row = extractFlightNotification(flight, {
          subscription,
          balance,
          receivedAt,
          index: rawIndex,
          sampling,
        });
        if (!row) { skipped += 1; return; }
        extracted.push({ row, rawIndex, rawFlight: flight, rawItemSha256: hashJson(flight) });
      });

      const identities = await Promise.all(extracted.map(({ row, rawFlight }) =>
        resolveWebhookFlightIdentity({
          operatingCarrier: row.carrierIata ?? row.carrierIcao,
          operatingFlightNumber: row.flightNumber,
          originIcao: row.depAirportIcao,
          originalDestinationIcao: row.arrAirportIcao,
          scheduledGateOutUtc: row.depScheduledUtc?.toISOString(),
          originTimeZone: rawFlight?.departure?.airport?.timeZone ?? row.depAirportTimezone ?? null,
          scheduleVerified: !!rawFlight?.departure?.scheduledTime?.utc,
          providerFlightId: typeof rawFlight?.id === "string" ? rawFlight.id : null,
        })
      ));

      // Only resolved physical identities may enter semantic research/current
      // state. Raw evidence for unresolved items remains fully durable above.
      const resolved = extracted.flatMap((entry, i) => {
        const identity = identities[i];
        if (identity?.status !== "resolved") {
          console.warn(`[adb-v3-webhook] identity quarantined rawIndex=${entry.rawIndex}: ${identity?.reason ?? "unavailable"}`);
          return [];
        }
        return [{ ...entry, identity }];
      });
      skipped += extracted.length - resolved.length;
      const rows: InsertFlightDataPrePost[] = resolved.map((x) => x.row);

      const attemptStartedAt = new Date();
      let researchAppended = false;
      let attemptError: string | null = null;

      try {
        await appendResearchEvents(
          resolved.map(({ row: r, rawIndex, rawItemSha256, identity }) => {
            const hasLoc = r.hasLiveLocation === true && !!r.locReportedUtc;
            const eventKey = semanticObservationKey({
              canonicalFlightInstanceId: identity.flightInstanceId,
              eventType: hasLoc ? "position_update" : "status_change",
              eventPhase: r.dataStage as "PRE" | "POST",
              locReportedUtc: hasLoc ? r.locReportedUtc : null,
              providerStateUpdatedUtc: r.lastUpdatedUtc ?? null,
              rawItemSha256,
            });
            return {
              eventKey,
              flightInstanceId: identity.flightInstanceId,
              flightNumber: r.flightNumber,
              carrierIata: r.carrierIata,
              carrierIcao: r.carrierIcao,
              callSign: r.callSign,
              aircraftReg: r.aircraftReg,
              aircraftModeS: r.aircraftModeS,
              aircraftModel: r.aircraftModel,
              eventTimestamp: r.locReportedUtc ?? r.lastUpdatedUtc ?? rawCommittedAtUtc,
              providerPublishedUtc: r.lastUpdatedUtc,
              availableAt: rawCommittedAtUtc,
              receivedTimestampUtc: r.receivedAt ?? receivedAt,
              dataStage: r.dataStage as "PRE" | "POST",
              status: r.status,
              hasLiveLocation: hasLoc,
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
              scheduledWheelsOff: null,
              actualWheelsOff: null,
              scheduledWheelsOn: null,
              actualWheelsOn: null,
              scheduledGateIn: r.arrScheduledUtc,
              actualGateIn: null,
              sourceLatencySeconds: r.lastUpdatedUtc
                ? Math.max(0, (receivedAt.getTime() - r.lastUpdatedUtc.getTime()) / 1000)
                : null,
              payloadSha256: rawItemSha256,
              batchId: sampling?.batchId ?? null,
              subscriptionId: subId,
              ingestEventId: null,
              // rawIndex participates in the semantic key through raw hash and
              // remains available in raw_delivery_item provenance.
              _rawIndex: rawIndex,
            } as any;
          }),
        );
        researchAppended = true;
      } catch (researchErr: any) {
        attemptError = String(researchErr?.message || researchErr);
        const eventFailure = new Error(`research event log write failed: ${attemptError}`);
        eventFailure.name = "ResearchEventLogFailure";
        throw eventFailure;
      }

      // Convenience/current-state mutation is strictly after immutable events.
      const stats = await upsertFlightNotifications(rows);

      try {
        await persistProcessingAttempt({
          deliveryId: rawDeliveryId ?? "unknown",
          attemptIndex: 1,
          parserVersion: "flightNotificationExtractor_v3",
          schemaVersion: "v3.9-f.8",
          outcome: attemptError ? "partial" : "success",
          itemsReceived: flights.length,
          itemsParsed: extracted.length,
          itemsStored: stats.stored,
          itemsSkipped: skipped,
          itemsFailed: attemptError ? 1 : 0,
          validationErrors: parsed.success ? null : parsed.error.issues,
          parseErrors: attemptError ? [attemptError] : null,
          storageErrors: null,
          errorMessage: attemptError,
          startedAtUtc: attemptStartedAt,
          completedAtUtc: new Date(),
          durationMs: Date.now() - attemptStartedAt.getTime(),
          upsertResult: stats,
          researchEventsAppended: researchAppended,
          ingestEventWritten: false,
        });
      } catch (attemptErr: any) {
        console.warn("[adb-v3-webhook] processing_attempt write failed:", attemptErr?.message || attemptErr);
      }

      // Compatibility/diagnostic ledger. Safety exposure is derived from
      // durable raw_delivery attempts, not this best-effort table.
      try {
        await pool.query(
          `INSERT INTO clean.adb_ingest_events
           (subscription_id,batch_id,notification_items,rows_stored,rows_inserted,rows_updated,
            rows_skipped,credits_remaining)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
          [subId,sampling?.batchId ?? null,flights.length,stats.stored,stats.inserted,stats.updated,skipped,balance?.creditsRemaining ?? null],
        );
      } catch (ingestErr: any) {
        console.error("[adb-v3-webhook] diagnostic ingest ledger write failed:", ingestErr?.message || ingestErr);
      }

      console.log(`[adb-v3-webhook] received=${flights.length} resolved=${rows.length} skipped=${skipped} stored=${stats.stored} sub=${subId ?? "-"} ms=${Date.now() - startedAt}`);
      res.status(200).json({ received: true, flights: flights.length, stored: stats.stored, skipped });
    } catch (err: any) {
      console.error("[adb-v3-webhook] semantic processing error after raw durability:", err?.message || err);
      try {
        await pool.query(
          `INSERT INTO clean.adb_ingest_events(subscription_id,batch_id,notification_items,delivery_failure,error)
           VALUES($1,$2,0,true,$3)`,
          [typeof req.body?.subscription?.id === "string" ? req.body.subscription.id : null,
           null,
           String(err?.message || "error").slice(0, 500)],
        );
      } catch (ledgerErr: any) {
        console.error("[adb-v3-webhook] failure-ledger write failed:", ledgerErr?.message || ledgerErr);
      }
      try {
        if (rawDeliveryIdForCatch) {
          await persistProcessingAttempt({
            deliveryId: rawDeliveryIdForCatch,
            attemptIndex: 1,
            parserVersion: "flightNotificationExtractor_v3",
            schemaVersion: "v3.9-f.8",
            outcome: "failed",
            itemsReceived: flightsForCatch.length,
            itemsParsed: 0,
            itemsStored: 0,
            itemsSkipped: 0,
            itemsFailed: flightsForCatch.length,
            validationErrors: null,
            parseErrors: [String(err?.message || "error").slice(0, 500)],
            storageErrors: null,
            errorMessage: String(err?.message || "error").slice(0, 500),
            startedAtUtc: receivedAtForCatch ?? new Date(startedAt),
            completedAtUtc: new Date(),
            durationMs: Date.now() - startedAt,
            upsertResult: null,
            researchEventsAppended: false,
            ingestEventWritten: false,
          });
        }
      } catch (attemptErr: any) {
        console.error("[adb-v3-webhook] failed-attempt write failed:", attemptErr?.message || attemptErr);
      }
      // Raw is durable; semantic failure must not cause paid provider retries.
      res.status(200).json({ received: true, error: err?.message || "error" });
    }
  };

  app.post("/api/v1/webhooks/aerodatabox", webhookIngress);
  app.post("/api/v1/webhooks/aerodatabox/:secret", webhookIngress);

  app.get("/api/v1/subscriptions/balance", managementGuard, async (_req, res) => {
    const balance = await getBalance();
    res.status(200).json({ balance });
  });

  app.post("/api/v1/subscriptions/balance/refill", managementGuard, managementMutationGuard("refill"), async (req, res) => {
    const credits = Math.floor(Number(req.body?.credits));
    if (!Number.isFinite(credits) || credits <= 0) return res.status(400).json({ error: "credits must be a positive integer" });
    const balance = await refillBalance(credits);
    if (!balance) return res.status(502).json({ error: "Failed to refill AeroDataBox balance" });
    res.json({ balance });
  });

  app.get("/api/v1/subscriptions/webhook", managementGuard, async (_req, res) => {
    res.json({ subscriptions: await listSubscriptions() });
  });
  app.get("/api/v1/subscriptions/webhook/:id", managementGuard, async (req, res) => {
    const subscription = await getSubscription(String(req.params.id));
    if (!subscription) return res.status(404).json({ error: "Subscription not found" });
    res.json({ subscription });
  });
  app.post("/api/v1/subscriptions/webhook", managementGuard, managementMutationGuard("subscription"), async (req, res) => {
    const { subjectType, subjectId, maxDeliveryRetries, url } = req.body || {};
    if (subjectType !== "FlightByNumber" && subjectType !== "FlightByAirportIcao") return res.status(400).json({ error: "invalid subjectType" });
    if (!subjectId || typeof subjectId !== "string") return res.status(400).json({ error: "subjectId is required" });
    let retriesResolved: number;
    try {
      retriesResolved = resolveExperimentalRetries(maxDeliveryRetries === undefined ? undefined : Number(maxDeliveryRetries));
    } catch {
      return res.status(400).json({ error: "maxDeliveryRetries must be 0 for V3.9 experimental subscriptions" });
    }
    const subscription = await createSubscription(subjectType as SubscriptionSubjectType, subjectId, {
      url: url || defaultWebhookUrl(),
      maxDeliveryRetries: retriesResolved,
    });
    if (!subscription) return res.status(502).json({ error: "Failed to create subscription" });
    res.status(201).json({ subscription });
  });
  app.delete("/api/v1/subscriptions/webhook/:id", managementGuard, managementMutationGuard("subscription"), async (req, res) => {
    const ok = await deleteSubscription(String(req.params.id));
    if (!ok) return res.status(502).json({ error: "Failed to delete subscription" });
    res.json({ success: true });
  });

  app.get("/api/v1/collection/catalog", managementGuard, (_req, res) => {
    res.json({ tiers: AIRPORT_TIERS, byTier: Object.fromEntries(AIRPORT_TIERS.map((t) => [t, [...AIRPORT_CATALOG[t]]])), tierMix: COLLECTOR_CONFIG.tierMix });
  });
  app.get("/api/v1/collection/status", managementGuard, async (_req, res) => {
    try { res.json(await getCollectionStatus()); } catch (err: any) { res.status(500).json({ error: err?.message || "failed to read collection status" }); }
  });
  app.post("/api/v1/collection/start", managementGuard, managementMutationGuard("collection"), async (_req, res) => {
    try { res.status(201).json(await startBatch()); } catch (err: any) { res.status(400).json({ error: err?.message || "failed to start batch" }); }
  });
  app.post("/api/v1/collection/stop", managementGuard, async (req, res) => {
    try {
      const closed = await stopBatch(String(req.body?.reason || "manual"));
      if (!closed) return res.status(404).json({ error: "No active batch to stop" });
      res.json({ stopped: closed });
    } catch (err: any) { res.status(500).json({ error: err?.message || "failed to stop batch" }); }
  });
  app.get("/api/v1/collection/diagnostics", managementGuard, async (_req, res) => {
    try { res.json(await getDiagnostics()); } catch (err: any) { res.status(500).json({ error: err?.message || "failed to run diagnostics" }); }
  });
  app.get("/api/v1/collection/coverage", managementGuard, async (req, res) => {
    try {
      const cov = await getAirportCoverage(req.query?.force === "1" || req.query?.force === "true");
      if (!cov) return res.status(502).json({ error: "Coverage enumeration failed" });
      res.json(cov);
    } catch (err: any) { res.status(500).json({ error: err?.message || "failed to fetch coverage" }); }
  });

  startCollectionWatchdog();
}
