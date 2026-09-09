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
import {
  extractFlightNotification,
  type SamplingMeta,
} from "./lib/disruption/flightNotificationExtractor_v3";
import {
  upsertFlightNotifications,
  appendResearchEvents,
  researchEventKey,
  semanticObservationKey,
} from "./lib/disruption/flightDataPrePostStore_v3";
import { resolveWebhookFlightIdentity } from "./lib/disruption/flightInstanceCanonical_v3";
import { persistProcessingAttempt, persistRawDeliveryTransaction } from "./lib/disruption/rawIngress_v3";
import { verifyAuthRecord, approvedArtifactHashesFromLedger, sha256HexString, type AuthRecord } from "./lib/disruption/authRecord_v39";
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

// Mutation guard for provider-mutating management routes (ChatGPT round-3
// item 5, §1.5.1 item 5): subscription create/delete, balance refill, and
// collection start require an EXACT experiment authorization, not a boolean
// kill switch. The caller supplies x-experiment-auth: <AUTH record JSON>;
// the record is verified (format, validity window, phase/gate scope match,
// positive ceilings, NON-EMPTY predecessors present in the evidence ledger)
// before any provider mutation. Read-only routes and collection/stop (safety)
// stay available.
function loadLedgerText(): string {
  try {
    return readFileSync(join(process.cwd(), "SEPmd", "V3.9_RUN_REPORTS_AND_EVIDENCE.md"), "utf8");
  } catch {
    return "";
  }
}

function loadLedgerEvidenceIds(): string[] {
  const text = loadLedgerText();
  return Array.from(
    new Set(Array.from(text.matchAll(/\b((?:RUN|GATE|AUTH|ISS|DEC)-\d{8}-[0-9A-Z]+)\b/g)).map((m) => m[1])),
  );
}

function managementMutationGuard(expectedScope: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const raw = req.header("x-experiment-auth");
    if (!raw) {
      res.status(403).json({
        error: "Provider mutations require x-experiment-auth: <AUTH record JSON> with exact scope. See §1.5.15.",
      });
      return;
    }
    let record: AuthRecord;
    try {
      record = JSON.parse(raw);
    } catch {
      res.status(403).json({ error: "x-experiment-auth is not valid JSON." });
      return;
    }
    if (!record.predecessorEvidenceIds || record.predecessorEvidenceIds.length === 0) {
      res.status(403).json({
        error: "AUTH refused: predecessor evidence list is empty — authorizations must cite the gate evidence that enables them.",
      });
      return;
    }
    // Hash-locked artifact (ChatGPT round-3 item 6): the exact presented
    // bytes must hash to an approved AUTH_ARTIFACT_SHA256 ledger token.
    // A hand-crafted record citing real ledger IDs still refuses here.
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

export function registerV3Routes(app: Express): void {
  // ---------------------------------------------------------------------
  // WEBHOOK INGRESS — durably persist raw delivery/items BEFORE successful
  // 2xx (§1.5.2 / CRIT-003). If raw persistence fails, return 5xx (provider
  // retry, not silent loss). Semantic-parse failures after durable raw commit
  // are recorded as processing attempts and may still return 2xx.
  // Registered on BOTH the bare path and the /:secret path.
  // ---------------------------------------------------------------------
  const webhookIngress = async (req: Request, res: Response) => {
    const startedAt = Date.now();
    // Scoped outside try so the catch path can still record a processing_attempt
    // against the durable raw delivery when one exists (§1.5.2 item 6).
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
      receivedAtForCatch = receivedAt;
      flightsForCatch = Array.isArray(body) ? body : Array.isArray(body?.flights) ? body.flights : [];

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
      }

      // S2 — durable raw persistence BEFORE semantic extraction and before 2xx
      // (CRIT-003 / §1.5.2 / ChatGPT round-3 item 8): envelope + items commit in
      // ONE database transaction. Either both are durable or neither is. Any
      // failure returns 5xx so the provider retries (never silent loss).
      // available_at for all downstream facts derives from the actual durable
      // commit timestamp returned here — never receivedAt alone, never null.
      let rawDeliveryId: string | null = null;
      let rawCommittedAtUtc: Date = receivedAt;
      try {
        const committed = await persistRawDeliveryTransaction(
          {
            subscriptionId: subId ?? null,
            batchId: sampling?.batchId ?? null,
            httpMethod: req.method ?? "POST",
            httpPath: req.originalUrl ?? req.path ?? null,
            rawBody: body,
            providerPublishedUtc: (() => {
              const first = flights[0] as any;
              const raw = first?.lastUpdatedUtc ?? balance?.lastDeductedUtc ?? null;
              return raw ? new Date(raw) : null;
            })(),
            receivedAtUtc: receivedAt,
            adbDeliveryId: (req.headers as any)?.["x-delivery-id"] ?? null,
            adbCostCredits: null,
          },
          flights.map((flight: any, i: number) => {
            const carrier = flight?.airline ?? {};
            return {
              itemIndex: i,
              flightNumber: (typeof flight?.number === "string" && flight.number) ? String(flight.number) : (typeof flight?.callSign === "string" ? String(flight.callSign) : null),
              carrierIata: carrier?.iata ?? null,
              carrierIcao: carrier?.icao ?? null,
              status: flight?.status != null ? String(flight.status) : null,
              statusCode: typeof flight?.status === "number" ? Math.trunc(flight.status) : null,
              rawItem: flight,
              lastUpdatedUtc: flight?.lastUpdatedUtc ? new Date(flight.lastUpdatedUtc) : null,
              departureScheduledUtc: flight?.departure?.scheduledTime?.utc ? new Date(flight.departure.scheduledTime.utc) : null,
              arrivalScheduledUtc: flight?.arrival?.scheduledTime?.utc ? new Date(flight.arrival.scheduledTime.utc) : null,
              parsingOutcome: "pending",
              canonicalFlightInstanceId: null,
            };
          }),
        );
        rawDeliveryId = committed.deliveryId;
        rawCommittedAtUtc = committed.committedAtUtc;
      } catch (rawErr: any) {
        console.error("[adb-v3-webhook] raw delivery persistence failed — returning 5xx:", rawErr?.message || rawErr);
        res.status(500).json({ error: "Raw persistence failed; please retry" });
        return;
      }
      // Raw envelope is durable from here on; copy the id for the catch path.
      rawDeliveryIdForCatch = rawDeliveryId;

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

      // §1.5.2 item 6: parser/semantic failure AFTER durable raw commit is
      // recorded as a processing_attempt (recoverable) — it never erases raw
      // evidence and the handler may still 2xx. Track outcomes for the attempt row.
      const attemptStartedAt = new Date();
      let researchAppended = false;
      let attemptError: string | null = null;

      const identities = await Promise.all(rows.map((r, i) => {
        // 0G: live-location (AIRBORNE) rows ALSO resolve canonical identity so
        // every airborne point is keyed by flight_instance_id, never by
        // flight/carrier/time (same-number/codeshare/multi-leg/retime safe).
        const flight = flights[i] ?? {};
        return resolveWebhookFlightIdentity({
          operatingCarrier: r.carrierIata ?? r.carrierIcao,
          operatingFlightNumber: r.flightNumber,
          originIcao: r.depAirportIcao,
          originalDestinationIcao: r.arrAirportIcao,
          scheduledGateOutUtc: r.depScheduledUtc?.toISOString(),
          originTimeZone: flight?.departure?.airport?.timeZone,
          scheduleVerified: !!flight?.departure?.scheduledTime?.utc,
          providerFlightId: typeof flight?.id === "string" ? flight.id : null,
        });
      }));

      // V3.9 S3/S4/S5 (§6, §6.2) + §1.5.5 item 4: append the research event log
      // BEFORE the convenience/current-state mutation — one row per
      // observation. Location observations keep the location-scoped key so
      // every airborne point survives; NON-location updates use the general
      // semantic-observation identity (canonical instance + type/phase +
      // state clock + raw-item hash), because (flight,carrier,locReportedUtc)
      // is not a universal identity. Never overwrites. Ignores errors (2xx first).
      try {
        await appendResearchEvents(
          rows.flatMap((r, i) => {
            const hasLoc = r.hasLiveLocation === true && !!r.locReportedUtc;
            const identity = identities[i];
            const canonicalIdentityId = identity?.status === "resolved" ? identity.flightInstanceId : null;
            if (!hasLoc && identity?.status !== "resolved") {
              console.warn(`[adb-v3-webhook] semantic identity quarantined index=${i}: ${identity?.reason ?? "unavailable"}`);
              return [];
            }
            const eventKey = hasLoc
              ? researchEventKey({
                  flightNumber: r.flightNumber,
                  carrierIata: r.carrierIata,
                  locReportedUtc: r.locReportedUtc,
                  lastUpdatedUtc: r.lastUpdatedUtc,
                  receivedAt: r.receivedAt ?? new Date(),
                  index: i,
                })
              : semanticObservationKey({
                  canonicalFlightInstanceId: canonicalIdentityId!,
                  eventType: "status_change",
                  eventPhase: r.dataStage as "PRE" | "POST",
                  locReportedUtc: null,
                  providerStateUpdatedUtc: r.lastUpdatedUtc ?? null,
                  rawItemSha256: createHash("sha256")
                    .update(JSON.stringify(flights[i] ?? null))
                    .digest("hex"),
                });
            return [{
            eventKey,
            flightInstanceId: canonicalIdentityId,
            flightNumber: r.flightNumber,
            carrierIata: r.carrierIata,
            carrierIcao: r.carrierIcao,
            callSign: r.callSign,
            aircraftReg: r.aircraftReg,
            aircraftModeS: r.aircraftModeS,
            aircraftModel: r.aircraftModel,
            eventTimestamp: r.locReportedUtc ?? r.lastUpdatedUtc,
            providerPublishedUtc: r.lastUpdatedUtc,
            // §1.5.2 item 5 / ChatGPT round-3 item 8: available_at derives from
            // the ACTUAL durable commit timestamp of the raw transaction above
            // — never receivedAt alone, never null for snapshot facts.
            availableAt: rawCommittedAtUtc,
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
            // §1.5.4 / ChatGPT P0-4: the eight OOOI aliases stay NULL unless
            // Gate 0.5 verifies their provider-native semantics. Revised and
            // runway times are NEVER copied into alias columns merely to fill
            // them (revised ≠ scheduled, runway actuality unverified).
            // scheduledGateOut/scheduledGateIn keep the provider's scheduled
            // times (correct semantic class; gate-vs-runway sub-semantics
            // pending Gate 0.5, tracked by milestone_unverified=true default).
            scheduledGateOut: r.depScheduledUtc,
            actualGateOut: null,
            scheduledWheelsOff: null,
            actualWheelsOff: null,
            scheduledWheelsOn: null,
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
            }];
          }),
        );
        researchAppended = true;
      } catch (researchErr: any) {
        attemptError = String(researchErr?.message || researchErr);
        console.error(
          "[adb-v3-webhook] research event log write FAILED — blocking current-state upsert (event-log-before-state):",
          attemptError,
        );
        // 0E: an immutable research event is REQUIRED before mutable current
        // state. On event-log failure we must NOT advance state without it;
        // fail the semantic attempt (raw evidence remains durable, 2xx still
        // stops provider retries but current state is not silently updated).
        const eventFailure = new Error(`research event log write failed: ${attemptError}`);
        eventFailure.name = "ResearchEventLogFailure";
        throw eventFailure;
      }

      // §1.5.5 item 4: convenience/current-state mutation happens AFTER the
      // event-log append. If this throws, the outer catch records a failed
      // processing_attempt (raw + any appended events remain durable).
      const stats = await upsertFlightNotifications(rows);

      // Record the processing attempt for this delivery (best-effort; raw evidence already durable).
      try {
        await persistProcessingAttempt({
          deliveryId: rawDeliveryId ?? "unknown",
          attemptIndex: 0,
          parserVersion: "flightNotificationExtractor_v3",
          schemaVersion: null,
          outcome: attemptError ? "partial" : "success",
          itemsReceived: flights.length,
          itemsParsed: rows.length,
          itemsStored: stats.stored,
          itemsSkipped: skipped,
          itemsFailed: attemptError ? 1 : 0,
          validationErrors: null,
          parseErrors: attemptError ? [attemptError] : null,
          storageErrors: null,
          errorMessage: attemptError,
          startedAtUtc: attemptStartedAt,
          completedAtUtc: new Date(),
          durationMs: Date.now() - attemptStartedAt.getTime(),
          upsertResult: { stored: stats.stored, inserted: stats.inserted, updated: stats.updated },
          researchEventsAppended: researchAppended,
          ingestEventWritten: false,
        });
      } catch (attemptErr: any) {
        console.warn("[adb-v3-webhook] processing_attempt write failed:", attemptErr?.message || attemptErr);
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
      // §1.5.2 item 6/7: the ONLY failure that may still return non-2xx is a raw
      // persistence failure — but that path returns 5xx directly above and never
      // reaches here. Reaching this catch means raw IS durable (or the error
      // happened before raw commit, e.g. sampling lookup), so respond 2xx and
      // record a FAILED processing_attempt when a deliveryId exists. Never erase raw.
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
      // Persist the failed processing attempt (recoverable semantic failure after durable raw).
      try {
        if (typeof rawDeliveryIdForCatch === "string" && rawDeliveryIdForCatch) {
          await persistProcessingAttempt({
            deliveryId: rawDeliveryIdForCatch,
            attemptIndex: 0,
            parserVersion: "flightNotificationExtractor_v3",
            schemaVersion: null,
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

  app.post("/api/v1/subscriptions/balance/refill", managementGuard, managementMutationGuard("refill"), async (req: Request, res: Response) => {
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

  app.post("/api/v1/subscriptions/webhook", managementGuard, managementMutationGuard("subscription"), async (req: Request, res: Response) => {
    const { subjectType, subjectId, maxDeliveryRetries, url } = req.body || {};
    if (subjectType !== "FlightByNumber" && subjectType !== "FlightByAirportIcao") {
      return res.status(400).json({ error: "subjectType must be FlightByNumber or FlightByAirportIcao" });
    }
    if (!subjectId || typeof subjectId !== "string") {
      return res.status(400).json({ error: "subjectId is required" });
    }
    // CRIT-004 / §1.5.1 item 4: V3.9 experimental collection requires maxDeliveryRetries=0.
    // Single owner: resolveExperimentalRetries() in aerodataboxLimiter_v3.
    let retriesResolved: number;
    try {
      retriesResolved = resolveExperimentalRetries(
        maxDeliveryRetries === undefined ? undefined : Number(maxDeliveryRetries),
      );
    } catch {
      return res.status(400).json({ error: "maxDeliveryRetries must be 0 for V3.9 experimental subscriptions (omit or send 0)" });
    }
    const subscription = await createSubscription(subjectType as SubscriptionSubjectType, subjectId, {
      url: url || defaultWebhookUrl(),
      maxDeliveryRetries: retriesResolved,
    });
    if (!subscription) {
      return res.status(502).json({ error: "Failed to create subscription" });
    }
    res.status(201).json({ subscription });
  });

  app.delete("/api/v1/subscriptions/webhook/:id", managementGuard, managementMutationGuard("subscription"), async (req: Request, res: Response) => {
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

  app.post("/api/v1/collection/start", managementGuard, managementMutationGuard("collection"), async (_req: Request, res: Response) => {
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
