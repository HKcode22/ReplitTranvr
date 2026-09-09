/**
 * V3.9-f.8 AeroDataBox webhook + management routes.
 * Binding authority: SEPmd/V3.9_DataCollectPlan_f.8.md §§0–21.
 *
 * Webhook ordering:
 *   durable raw envelope+items -> durable identity resolution/quarantine ->
 *   canonical semantic events -> current-state convenience upsert -> 2xx.
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
import {
  resolveWebhookFlightIdentity,
  type WebhookIdentityResolution,
} from "./lib/disruption/flightInstanceCanonical_v3";
import {
  persistProcessingAttempt,
  persistRawDeliveryTransaction,
  updateRawDeliveryOutcome,
} from "./lib/disruption/rawIngress_v3";
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

function webhookSecret(): string | null { return process.env.AERODATABOX_WEBHOOK_SECRET || null; }

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
  try { return readFileSync(join(process.cwd(), "SEPmd", "V3.9_RUN_REPORTS_AND_EVIDENCE.md"), "utf8"); }
  catch { return ""; }
}
function loadLedgerEvidenceIds(): string[] {
  return Array.from(new Set(
    Array.from(loadLedgerText().matchAll(/\b((?:RUN|GATE|AUTH|ISS|DEC)-\d{8}-[0-9A-Z]+)\b/g)).map((m) => m[1]),
  ));
}

/** Every provider mutation must pass exact AUTH plus the persistent incident stop. */
function managementMutationGuard(expectedScope: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const incident = await pool.query(
        `SELECT cause,occurred_at_utc FROM clean.adb_incident_stop
          WHERE resolved=false ORDER BY occurred_at_utc DESC LIMIT 1`,
      );
      if (incident.rowCount) {
        res.status(423).json({ error: `REFUSED_INCIDENT_STOP: ${incident.rows[0].cause} at ${incident.rows[0].occurred_at_utc}` });
        return;
      }
    } catch (error: any) {
      res.status(503).json({ error: `REFUSED_INCIDENT_LEDGER_UNAVAILABLE: ${error?.message ?? error}` });
      return;
    }

    const raw = req.header("x-experiment-auth");
    if (!raw) {
      res.status(403).json({ error: "Provider mutations require exact x-experiment-auth authorization." });
      return;
    }
    let record: AuthRecord;
    try { record = JSON.parse(raw); }
    catch {
      res.status(403).json({ error: "x-experiment-auth is not valid JSON." });
      return;
    }
    if (!record.predecessorEvidenceIds?.length) {
      res.status(403).json({ error: "AUTH refused: predecessor evidence list is empty." });
      return;
    }
    const verdict = verifyAuthRecord(record, {
      nowUtc: new Date(),
      existingEvidenceIds: loadLedgerEvidenceIds(),
      expectedPhaseGate: expectedScope,
      artifactHash: sha256HexString(raw),
      approvedArtifactHashes: approvedArtifactHashesFromLedger(loadLedgerText()),
    });
    if (!verdict.verified) {
      res.status(403).json({ error: `AUTH refused: ${verdict.reason}` });
      return;
    }

    // The HTTP collection-start surface must bind the same AUTH id as the
    // persistent Phase-6 authorization; a generic valid record cannot start it.
    if (expectedScope === "Phase 6 (separate authorization)") {
      try {
        const p6 = await pool.query(
          `SELECT authorization_id FROM clean.adb_phase6_authorization
            WHERE singleton_key=true AND enabled=true AND revoked_at_utc IS NULL`,
        );
        if (p6.rowCount !== 1 || String(p6.rows[0].authorization_id) !== record.authorizationId) {
          res.status(403).json({ error: "AUTH refused: HTTP collection start does not match persistent Phase-6 authorization." });
          return;
        }
      } catch (error: any) {
        res.status(503).json({ error: `REFUSED_PHASE6_AUTH_UNAVAILABLE: ${error?.message ?? error}` });
        return;
      }
    }
    next();
  };
}

function finiteNonnegativeOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
function finiteNonnegativeIntOrNull(value: unknown): number | null {
  const n = finiteNonnegativeOrNull(value);
  return n !== null && Number.isInteger(n) ? n : null;
}
function dateOrNull(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isFinite(d.getTime()) ? d : null;
}
function hashJson(value: unknown): string { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }

interface ProviderDeliveryEvidence {
  notificationId: string | null;
  notificationGeneratedUtc: Date | null;
  attemptId: string | null;
  attemptSeqNo: number | null;
  attemptUtc: Date | null;
  costCredits: number | null;
}
/** Preserve provider-native envelope/attempt fields without substituting flight clocks. */
function providerDeliveryEvidence(body: any, req: Request): ProviderDeliveryEvidence {
  const attempt = body?.deliveryAttempt ?? body?.delivery?.attempt ?? null;
  const notificationIdRaw = body?.id ?? body?.notification?.id ?? null;
  const notificationId = typeof notificationIdRaw === "string" && notificationIdRaw.trim() ? notificationIdRaw.trim() : null;
  const attemptIdRaw = attempt?.id ?? req.header("x-delivery-id") ?? req.header("x-aerodatabox-delivery-id") ?? null;
  const attemptId = typeof attemptIdRaw === "string" && attemptIdRaw.trim() ? attemptIdRaw.trim() : null;
  return {
    notificationId,
    notificationGeneratedUtc: dateOrNull(body?.timestampUtc ?? body?.notification?.timestampUtc ?? null),
    attemptId,
    attemptSeqNo: finiteNonnegativeIntOrNull(attempt?.seqNo),
    attemptUtc: dateOrNull(attempt?.timestampUtc),
    costCredits: finiteNonnegativeOrNull(attempt?.costCredits ?? body?.deliveryAttemptCostCredits ?? null),
  };
}

interface ExtractedWebhookRow {
  row: InsertFlightDataPrePost;
  rawIndex: number;
  rawFlight: any;
  rawItemSha256: string;
}

/**
 * Identity resolution happens after raw durability, so preserve the decision in
 * its own append-only ledger before any semantic/current-state write. Exact
 * retry replay is idempotent; conflicting replay evidence is a persistence
 * failure, never silently overwritten.
 */
async function persistIdentityResolutionLedger(
  deliveryId: string,
  extracted: ExtractedWebhookRow[],
  identities: WebhookIdentityResolution[],
): Promise<void> {
  if (extracted.length !== identities.length) throw new Error("identity resolution cardinality mismatch");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (let i = 0; i < extracted.length; i++) {
      const e = extracted[i];
      const identity = identities[i];
      const resolved = identity.status === "resolved";
      const expected = {
        status: resolved ? "resolved" : "quarantined",
        flightInstanceId: resolved ? identity.flightInstanceId : null,
        initialServiceDate: resolved ? identity.initialServiceDate : null,
        reason: resolved ? null : identity.reason,
      };
      await client.query(
        `INSERT INTO clean.webhook_identity_resolution
           (delivery_id,item_index,raw_item_sha256,resolution_status,flight_instance_id,initial_service_date,reason)
         VALUES($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT(delivery_id,item_index) DO NOTHING`,
        [deliveryId,e.rawIndex,e.rawItemSha256,expected.status,expected.flightInstanceId,expected.initialServiceDate,expected.reason],
      );
      const check = await client.query(
        `SELECT raw_item_sha256,resolution_status,flight_instance_id,initial_service_date::text,reason
           FROM clean.webhook_identity_resolution WHERE delivery_id=$1 AND item_index=$2`,
        [deliveryId,e.rawIndex],
      );
      const x = check.rows[0];
      if (!x || String(x.raw_item_sha256) !== e.rawItemSha256 || String(x.resolution_status) !== expected.status ||
          (x.flight_instance_id ?? null) !== expected.flightInstanceId ||
          (x.initial_service_date ?? null) !== expected.initialServiceDate ||
          (x.reason ?? null) !== expected.reason) {
        throw new Error(`IDENTITY_LEDGER_CONFLICT: ${deliveryId}/${e.rawIndex}`);
      }
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function recordIncident(cause: string, detail: unknown): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO clean.adb_incident_stop(cause,occurred_at_utc,detail,resolved)
       VALUES($1,now(),$2,false)`,
      [cause, JSON.stringify(detail)],
    );
  } catch (error: any) {
    console.error("[adb-v3-webhook] INCIDENT PERSIST FAILED:", error?.message ?? error);
  }
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
            providerPublishedUtc: deliveryEvidence.notificationGeneratedUtc,
            providerNotificationGeneratedUtc: deliveryEvidence.notificationGeneratedUtc,
            receivedAtUtc: receivedAt,
            adbDeliveryId: deliveryEvidence.attemptId,
            adbCostCredits: deliveryEvidence.costCredits,
            notificationId: deliveryEvidence.notificationId,
            deliveryAttemptSeqNo: deliveryEvidence.attemptSeqNo,
            deliveryAttemptUtc: deliveryEvidence.attemptUtc,
            deliveryAttemptCostCredits: deliveryEvidence.costCredits,
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
        await recordIncident("raw-persistence", { error: String(rawErr?.message ?? rawErr), subscriptionId: subId });
        res.status(500).json({ error: "Raw persistence failed; please retry" });
        return;
      }
      rawDeliveryIdForCatch = rawDeliveryId;

      const extracted: ExtractedWebhookRow[] = [];
      let skipped = 0;
      flights.forEach((flight: any, rawIndex: number) => {
        const row = extractFlightNotification(flight, { subscription, balance, receivedAt, index: rawIndex, sampling });
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
          providerRecordKey: typeof rawFlight?.id === "string" ? rawFlight.id : null,
          callsign: row.callSign,
        })
      ));

      await persistIdentityResolutionLedger(rawDeliveryId, extracted, identities);

      const resolved = extracted.flatMap((entry, i) => {
        const identity = identities[i];
        if (identity.status !== "resolved") {
          console.warn(`[adb-v3-webhook] identity quarantined rawIndex=${entry.rawIndex}: ${identity.reason}`);
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
          resolved.map(({ row: r, rawItemSha256, identity }) => {
            const hasLoc = r.hasLiveLocation === true && !!r.locReportedUtc;
            return {
              eventKey: semanticObservationKey({
                canonicalFlightInstanceId: identity.flightInstanceId,
                eventType: hasLoc ? "position_update" : "status_change",
                eventPhase: r.dataStage as "PRE" | "POST",
                locReportedUtc: hasLoc ? r.locReportedUtc : null,
                providerStateUpdatedUtc: r.lastUpdatedUtc ?? null,
                rawItemSha256,
              }),
              flightInstanceId: identity.flightInstanceId,
              flightNumber: r.flightNumber,
              carrierIata: r.carrierIata,
              carrierIcao: r.carrierIcao,
              callSign: r.callSign,
              aircraftReg: r.aircraftReg,
              aircraftModeS: r.aircraftModeS,
              aircraftModel: r.aircraftModel,
              eventTimestamp: r.locReportedUtc ?? r.lastUpdatedUtc ?? rawCommittedAtUtc,
              providerPublishedUtc: deliveryEvidence.notificationGeneratedUtc,
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
              sourceLatencySeconds: deliveryEvidence.notificationGeneratedUtc
                ? Math.max(0, (receivedAt.getTime() - deliveryEvidence.notificationGeneratedUtc.getTime()) / 1000)
                : null,
              payloadSha256: rawItemSha256,
              batchId: sampling?.batchId ?? null,
              subscriptionId: subId,
              ingestEventId: null,
            };
          }),
        );
        researchAppended = true;
      } catch (researchErr: any) {
        attemptError = String(researchErr?.message || researchErr);
        throw new Error(`research event log write failed: ${attemptError}`);
      }

      const stats = await upsertFlightNotifications(rows);

      try {
        await persistProcessingAttempt({
          deliveryId: rawDeliveryId,
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

      try {
        await pool.query(
          `INSERT INTO clean.adb_ingest_events
           (subscription_id,batch_id,notification_items,rows_stored,rows_inserted,rows_updated,rows_skipped,credits_remaining)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
          [subId,sampling?.batchId ?? null,flights.length,stats.stored,stats.inserted,stats.updated,skipped,balance?.creditsRemaining ?? null],
        );
      } catch (ingestErr: any) {
        console.error("[adb-v3-webhook] diagnostic ingest ledger write failed:", ingestErr?.message || ingestErr);
      }
      await updateRawDeliveryOutcome(rawDeliveryId, "success", flights.length, null);

      console.log(`[adb-v3-webhook] received=${flights.length} resolved=${rows.length} quarantined=${extracted.length - resolved.length} skipped=${skipped} stored=${stats.stored} sub=${subId ?? "-"} ms=${Date.now() - startedAt}`);
      res.status(200).json({ received: true, flights: flights.length, stored: stats.stored, skipped });
    } catch (err: any) {
      console.error("[adb-v3-webhook] semantic processing error after raw durability:", err?.message || err);
      if (rawDeliveryIdForCatch) {
        await recordIncident("persistence", {
          deliveryId: rawDeliveryIdForCatch,
          subscriptionId: typeof req.body?.subscription?.id === "string" ? req.body.subscription.id : null,
          error: String(err?.message || "error").slice(0, 500),
        });
        await updateRawDeliveryOutcome(rawDeliveryIdForCatch, "failed", flightsForCatch.length, String(err?.message || "error").slice(0, 500));
      }
      try {
        await pool.query(
          `INSERT INTO clean.adb_ingest_events(subscription_id,batch_id,notification_items,delivery_failure,error)
           VALUES($1,$2,0,true,$3)`,
          [typeof req.body?.subscription?.id === "string" ? req.body.subscription.id : null,null,String(err?.message || "error").slice(0,500)],
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
            parseErrors: [String(err?.message || "error").slice(0,500)],
            storageErrors: null,
            errorMessage: String(err?.message || "error").slice(0,500),
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
      // Raw is durable. Do not trigger a paid provider retry for a downstream
      // semantic failure; the incident stop prevents new subscriptions.
      res.status(200).json({ received: true, error: err?.message || "error" });
    }
  };

  app.post("/api/v1/webhooks/aerodatabox", webhookIngress);
  app.post("/api/v1/webhooks/aerodatabox/:secret", webhookIngress);

  app.get("/api/v1/subscriptions/balance", managementGuard, async (_req, res) => {
    res.status(200).json({ balance: await getBalance() });
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
    try { retriesResolved = resolveExperimentalRetries(maxDeliveryRetries === undefined ? undefined : Number(maxDeliveryRetries)); }
    catch { return res.status(400).json({ error: "maxDeliveryRetries must be 0 for V3.9 experimental subscriptions" }); }
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
    try { res.json(await getCollectionStatus()); }
    catch (err: any) { res.status(500).json({ error: err?.message || "failed to read collection status" }); }
  });
  app.post("/api/v1/collection/start", managementGuard, managementMutationGuard("Phase 6 (separate authorization)"), async (_req, res) => {
    try { res.status(201).json(await startBatch()); }
    catch (err: any) { res.status(400).json({ error: err?.message || "failed to start batch" }); }
  });
  app.post("/api/v1/collection/stop", managementGuard, async (req, res) => {
    try {
      const closed = await stopBatch(String(req.body?.reason || "manual"));
      if (!closed) return res.status(404).json({ error: "No active batch to stop" });
      res.json({ stopped: closed });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "failed to stop batch" });
    }
  });
  app.get("/api/v1/collection/diagnostics", managementGuard, async (_req, res) => {
    try { res.json(await getDiagnostics()); }
    catch (err: any) { res.status(500).json({ error: err?.message || "failed to run diagnostics" }); }
  });
  app.get("/api/v1/collection/coverage", managementGuard, async (req, res) => {
    try {
      const cov = await getAirportCoverage(req.query?.force === "1" || req.query?.force === "true");
      if (!cov) return res.status(502).json({ error: "Coverage enumeration failed" });
      res.json(cov);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "failed to fetch coverage" });
    }
  });

  startCollectionWatchdog();
}
