/**
 * V3.9-f.8 AeroDataBox webhook + management routes.
 * Binding authority: SEPmd/V3.9_DataCollectPlan_f.8.md §§0–21.
 *
 * Webhook order:
 * raw envelope/items -> identity resolution/quarantine -> semantic events ->
 * current-state convenience upsert -> 2xx.
 *
 * Phase-6 start/stop are intentionally NOT exposed as HTTP mutations. Start
 * must use the exact v39:phase6:start owner; emergency stop must use
 * v39:phase6:pause so provider DELETE + frozen settlement remain single-owner.
 */
import {
  json,
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { createHash, createHmac, timingSafeEqual } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";
import type { InsertFlightDataPrePost } from "@shared/schema";
import {
  getBalance,
  refillBalance,
  createSubscription,
  listSubscriptions,
  listSubscriptionsStrict,
  getSubscription,
  deleteSubscription,
  defaultWebhookUrl,
  resolveExperimentalRetries,
  type SubscriptionSubjectType,
} from "./lib/disruption/aerodataboxLimiter_v3";
import { flightNotificationContractSchema } from "./lib/disruption/flightStatus_v3";
import { extractFlightNotification, type SamplingMeta } from "./lib/disruption/flightNotificationExtractor_v3";
import { upsertFlightNotifications, appendResearchEvents, semanticObservationKey } from "./lib/disruption/flightDataPrePostStore_v3";
import { resolveWebhookFlightIdentity, type WebhookIdentityResolution } from "./lib/disruption/flightInstanceCanonical_v3";
import { persistProcessingAttempt, persistRawDeliveryTransaction, updateRawDeliveryOutcome } from "./lib/disruption/rawIngress_v3";
import {
  cleanupPrepaidProbeSessionLocalV39,
  persistPrepaidProbeWebhookV39,
  recordPrepaidProbeCallbackFailureV39,
  recordPrepaidProbeIngressFailureV39,
} from "./lib/disruption/prepaidProbeRuntime_v39";
import { assertPrepaidOriginalJsonStructureV39 } from "./lib/disruption/prepaidOriginalJsonStructure_v39";
import { verifyAuthRecord, approvedArtifactHashesFromLedger, sha256HexString, type AuthRecord } from "./lib/disruption/authRecord_v39";
import { v39Pool as pool } from "./lib/disruption/db_v39";
import {verifyReadOnlyDbLivePreflightV39} from "./lib/disruption/phase2gDbLivePreflight_v39";
import { verifyPhase2gCleanupAttestationV39 } from "./lib/disruption/phase2gCleanupAttestation_v39";
import {
  assertPhase2gCleanupBlobCountsV39,
  assertPhase2gCleanupJournalMatchV39,
  phase2gCleanupScopeHashV39,
} from "./lib/disruption/phase2gCleanupReplay_v39";
import {
  getCollectionStatus,
  getDiagnostics,
  getAirportCoverage,
  lookupSubscriptionMeta,
  COLLECTOR_CONFIG,
} from "./lib/disruption/adbCollectionController_v3";
import { AIRPORT_CATALOG, AIRPORT_TIERS, tierForIcao } from "./lib/disruption/adbAirportCatalog_v3";

function webhookSecret(): string | null { return process.env.AERODATABOX_WEBHOOK_SECRET || null; }
function phase2gWebhookSecretMatch(req: Request, res: Response): void {
  const expected = webhookSecret();
  if (!expected) { res.status(503).json({ error: "WEBHOOK_SECRET_NOT_CONFIGURED" }); return; }
  const supplied = String(req.header("x-v39-phase2g-webhook-secret") ?? "");
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.status(200).json({
    schema: "v39.phase2g-webhook-secret-match.v1",
    status: "PASS",
    provider_call: false,
    provider_mutation: false,
    alert_credits_spent: 0,
  });
}
function phase2gRuntimeDbBinding(req: Request, res: Response): void {
  const runtimeUrl = String(process.env.V39_DATABASE_RUNTIME_URL ?? "").trim();
  if (!runtimeUrl) { res.status(503).json({ error: "V39_DATABASE_RUNTIME_URL_NOT_CONFIGURED" }); return; }
  const challenge = String(req.header("x-v39-phase2g-db-challenge") ?? "").trim();
  const supplied = String(req.header("x-v39-phase2g-db-proof") ?? "").trim().toLowerCase();
  if (!/^[A-Za-z0-9_.:-]{16,256}$/.test(challenge) || !/^[a-f0-9]{64}$/.test(supplied)) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const expected = createHmac("sha256", runtimeUrl)
    .update(`phase2g-db-binding:${challenge}`)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.status(200).json({
    schema: "v39.phase2g-runtime-db-binding.v1",
    status: "PASS",
    provider_call: false,
    provider_mutation: false,
    database_mutation: false,
    alert_credits_spent: 0,
  });
}
/**
 * A guarded SELECT-only prelaunch check, separate from the every-15s
 * HMAC-only database binding probe. Prevents a paid Stage1 owner from
 * starting when the URL matches but PostgreSQL is actually unavailable.
 */
async function phase2gDbLivePreflight(req:Request,res:Response):Promise<void> {
  const attestation=await verifyReadOnlyDbLivePreflightV39({
    runtimeUrl:String(process.env.V39_DATABASE_RUNTIME_URL??"").trim(),
    challenge:String(req.header("x-v39-phase2g-db-live-challenge")??"").trim(),
    suppliedProof:String(req.header("x-v39-phase2g-db-live-proof")??"").trim().toLowerCase(),
    selectOne:async()=>{
      const result=await pool.query("SELECT 1 AS connected");
      return {rows:result.rows};
    }
  });
  res.setHeader("cache-control","no-store");
  res.status(attestation.http).json(attestation.body);
}
function phase2gCleanupControlKeyMatch(req: Request, res: Response): void {
  const secret = String(process.env.V39_PHASE2G_CLEANUP_SIGNING_KEY ?? "").trim();
  const origin = String(process.env.V39_PHASE2G_CALLBACK_ORIGIN ?? "").trim();
  if (secret.length < 32 || !/^https:\/\/[^/]+$/.test(origin)) {
    res.status(503).json({ error: "PHASE2G_CLEANUP_AUTH_NOT_CONFIGURED" });
    return;
  }
  const nonce = String(req.header("x-v39-phase2g-cleanup-nonce") ?? "").trim();
  const supplied = String(req.header("x-v39-phase2g-cleanup-key-proof") ?? "").trim().toLowerCase();
  if (!/^[A-Za-z0-9_.:-]{16,256}$/.test(nonce) || !/^[a-f0-9]{64}$/.test(supplied)) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const expected = createHmac("sha256", secret)
    .update(`phase2g-cleanup-control-key-binding:${origin}:${nonce}`)
    .digest("hex");
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.status(200).json({
    schema: "v39.phase2g-cleanup-control-key-match.v1",
    status: "PASS",
    provider_call: false,
    provider_mutation: false,
    database_mutation: false,
    alert_credits_spent: 0,
  });
}
function phase2gCleanupProofGuard(req: Request, res: Response, next: NextFunction): void {
  const secret = String(process.env.V39_PHASE2G_CLEANUP_SIGNING_KEY ?? "").trim();
  const expectedOrigin = String(process.env.V39_PHASE2G_CALLBACK_ORIGIN ?? "").trim();
  if (secret.length < 32 || !expectedOrigin) {
    res.status(503).json({ error: "PHASE2G_CLEANUP_AUTH_NOT_CONFIGURED" });
    return;
  }
  try {
    verifyPhase2gCleanupAttestationV39(
      req.body,
      String(req.header("x-v39-phase2g-cleanup-proof") ?? ""),
      secret,
      expectedOrigin,
    );
    next();
  } catch {
    res.status(403).json({ error: "Forbidden" });
  }
}
function managementGuard(req: Request, res: Response, next: NextFunction): void {
  const secret = webhookSecret();
  if (!secret) { res.status(503).json({ error: "WEBHOOK_SECRET_NOT_CONFIGURED" }); return; }
  if (req.header("x-webhook-secret") !== secret) { res.status(403).json({ error: "Forbidden" }); return; }
  next();
}
function loadLedgerText(): string {
  try { return readFileSync(join(process.cwd(), "SEPmd", "V3.9_RUN_REPORTS_AND_EVIDENCE.md"), "utf8"); }
  catch { return ""; }
}
function loadLedgerEvidenceIds(): string[] {
  return Array.from(new Set(Array.from(loadLedgerText().matchAll(/\b((?:RUN|GATE|AUTH|ISS|DEC)-\d{8}-[0-9A-Z]+)\b/g)).map((m) => m[1])));
}

function managementMutationGuard(expectedScope: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const incident = await pool.query(`SELECT cause,occurred_at_utc FROM clean.adb_incident_stop WHERE resolved=false ORDER BY occurred_at_utc DESC LIMIT 1`);
      if (incident.rowCount) { res.status(423).json({ error:`REFUSED_INCIDENT_STOP: ${incident.rows[0].cause} at ${incident.rows[0].occurred_at_utc}` }); return; }

      /*
       * Provider Alert balance and billable subscription
       * inventory are account-wide. Manual management
       * mutations must never race a probing/settling owner.
       */
      const activeProbe = await pool.query(
        `SELECT probe_id,icao,status
           FROM clean.adb_anchor_probe
          WHERE status IN ('probing','settling')
          ORDER BY recorded_at DESC
          LIMIT 1`,
      );

      if (activeProbe.rowCount) {
        const row = activeProbe.rows[0];

        res.status(423).json({
          error:
            `REFUSED_PROVIDER_MUTATION_DURING_LIVE_PROBE:` +
            `probe=${row.probe_id}:` +
            `icao=${row.icao}:` +
            `status=${row.status}`,
        });

        return;
      }
    } catch (error: any) {
      res.status(503).json({ error:`REFUSED_INCIDENT_LEDGER_UNAVAILABLE: ${error?.message ?? error}` }); return;
    }
    const raw = req.header("x-experiment-auth");
    if (!raw) { res.status(403).json({ error:"Provider mutations require exact x-experiment-auth authorization." }); return; }
    let record: AuthRecord;
    try { record=JSON.parse(raw); }
    catch { res.status(403).json({ error:"x-experiment-auth is not valid JSON." }); return; }
    if (!record.predecessorEvidenceIds?.length) { res.status(403).json({ error:"AUTH refused: predecessor evidence list is empty." }); return; }
    const verdict=verifyAuthRecord(record,{
      nowUtc:new Date(),existingEvidenceIds:loadLedgerEvidenceIds(),expectedPhaseGate:expectedScope,
      artifactHash:sha256HexString(raw),approvedArtifactHashes:approvedArtifactHashesFromLedger(loadLedgerText()),
    });
    if(!verdict.verified){res.status(403).json({error:`AUTH refused: ${verdict.reason}`});return;}
    next();
  };
}

function finiteNonnegativeOrNull(value: unknown): number | null {
  if (value===null||value===undefined||value==="") return null;
  const n=Number(value); return Number.isFinite(n)&&n>=0?n:null;
}
function finiteNonnegativeIntOrNull(value: unknown): number | null {
  const n=finiteNonnegativeOrNull(value); return n!==null&&Number.isInteger(n)?n:null;
}
function dateOrNull(value: unknown): Date | null {
  if(!value)return null;const d=new Date(String(value));return Number.isFinite(d.getTime())?d:null;
}
function hashJson(value: unknown): string { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }

interface ProviderDeliveryEvidence {
  notificationId:string|null;notificationGeneratedUtc:Date|null;attemptId:string|null;
  attemptSeqNo:number|null;attemptUtc:Date|null;costCredits:number|null;
}
function providerDeliveryEvidence(body:any,req:Request):ProviderDeliveryEvidence{
  const attempt=body?.deliveryAttempt??body?.delivery?.attempt??null;
  const notificationIdRaw=body?.id??body?.notification?.id??null;
  const notificationId=typeof notificationIdRaw==="string"&&notificationIdRaw.trim()?notificationIdRaw.trim():null;
  const attemptIdRaw=attempt?.id??req.header("x-delivery-id")??req.header("x-aerodatabox-delivery-id")??null;
  const attemptId=typeof attemptIdRaw==="string"&&attemptIdRaw.trim()?attemptIdRaw.trim():null;
  return {notificationId,notificationGeneratedUtc:dateOrNull(body?.timestampUtc??body?.notification?.timestampUtc??null),attemptId,
    attemptSeqNo:finiteNonnegativeIntOrNull(attempt?.seqNo),attemptUtc:dateOrNull(attempt?.timestampUtc),costCredits:finiteNonnegativeOrNull(attempt?.costCredits??body?.deliveryAttemptCostCredits??null)};
}

interface ExtractedWebhookRow { row:InsertFlightDataPrePost;rawIndex:number;rawFlight:any;rawItemSha256:string }
async function persistIdentityResolutionLedger(deliveryId:string,extracted:ExtractedWebhookRow[],identities:WebhookIdentityResolution[]):Promise<void>{
  if(extracted.length!==identities.length)throw new Error("identity resolution cardinality mismatch");
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    for(let i=0;i<extracted.length;i++){
      const e=extracted[i],identity=identities[i],resolved=identity.status==="resolved";
      const expected={status:resolved?"resolved":"quarantined",flightInstanceId:resolved?identity.flightInstanceId:null,initialServiceDate:resolved?identity.initialServiceDate:null,reason:resolved?null:identity.reason};
      await client.query(`INSERT INTO clean.webhook_identity_resolution(delivery_id,item_index,raw_item_sha256,resolution_status,flight_instance_id,initial_service_date,reason) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(delivery_id,item_index) DO NOTHING`,[deliveryId,e.rawIndex,e.rawItemSha256,expected.status,expected.flightInstanceId,expected.initialServiceDate,expected.reason]);
      const check=await client.query(`SELECT raw_item_sha256,resolution_status,flight_instance_id,initial_service_date::text,reason FROM clean.webhook_identity_resolution WHERE delivery_id=$1 AND item_index=$2`,[deliveryId,e.rawIndex]);
      const x=check.rows[0];
      if(!x||String(x.raw_item_sha256)!==e.rawItemSha256||String(x.resolution_status)!==expected.status||(x.flight_instance_id??null)!==expected.flightInstanceId||(x.initial_service_date??null)!==expected.initialServiceDate||(x.reason??null)!==expected.reason)throw new Error(`IDENTITY_LEDGER_CONFLICT: ${deliveryId}/${e.rawIndex}`);
    }
    await client.query("COMMIT");
  }catch(error){await client.query("ROLLBACK").catch(()=>undefined);throw error;}finally{client.release();}
}
async function recordIncident(cause:string,detail:unknown):Promise<void>{
  try{await pool.query(`INSERT INTO clean.adb_incident_stop(cause,occurred_at_utc,detail,resolved) VALUES($1,now(),$2,false)`,[cause,JSON.stringify(detail)]);}
  catch(error:any){console.error("[adb-v3-webhook] INCIDENT PERSIST FAILED:",error?.message??error);}
}

export function registerV3Routes(app:Express):void{
  app.post("/__v39/phase2g/webhook-secret-match",phase2gWebhookSecretMatch);
  app.post("/__v39/phase2g/runtime-db-binding",phase2gRuntimeDbBinding);
  app.post("/__v39/phase2g/db-live-preflight",phase2gDbLivePreflight);
  app.post("/__v39/phase2g/cleanup-control-match",phase2gCleanupControlKeyMatch);

  /*
   * Dedicated prepaid callback parser.
   *
   * The global body parsers intentionally skip this exact
   * route family so parser failures can reach the prepaid
   * error boundary below.
   */
  /**
   * Reject unauthenticated prepaid POST BEFORE attempting JSON parsing.
   * Previously Express parsed up to 2MB before the secret comparison.
   * Keep the existing ingress secret check as defense in depth.
   */
  const prepaidEarlySecretGuard=(req:Request,res:Response,next:NextFunction):void=>{
    const expected=webhookSecret();
    if(!expected){res.status(503).json({error:"WEBHOOK_SECRET_NOT_CONFIGURED"});return;}
    const supplied=String(req.params.secret??"");
    const a=Buffer.from(expected);
    const b=Buffer.from(supplied);
    if(a.length!==b.length||!timingSafeEqual(a,b)){
      res.status(404).json({error:"Not found"});
      return;
    }
    next();
  };

  const prepaidJsonParser = json({
    limit: "2mb",
    verify: (req, _res, buf) => {
      // Never let JSON.parse silently overwrite provider attempt, flight
      // identity or billable item-credit keys (including escaped aliases).
      // This checks real received bytes BEFORE the canonicalizing store,
      // but is NOT an independently authenticated original-wire archive.
      assertPrepaidOriginalJsonStructureV39(buf);
      req.rawBody = buf;
    },
  });

  const prepaidWebhookIngress=async(req:Request,res:Response)=>{
    const secret=webhookSecret();
    if(!secret){res.status(503).json({error:"WEBHOOK_SECRET_NOT_CONFIGURED"});return;}
    if(!req.params.secret||req.params.secret!==secret){res.status(404).json({error:"Not found"});return;}
    const sessionId=String(req.params.sessionId??"").trim();
    const startedAt=Date.now();

    if (!req.is("application/json")) {
      const counted =
        await recordPrepaidProbeIngressFailureV39(
          sessionId,
        ).catch(() => false);

      await recordIncident(
        "prepaid-ingress-content-type",
        {
          mode: "prepaid_probe",
          sessionId,
          counted,
        },
      );

      console.error(
        `[adb-v3-prepaid] invalid content-type session=${sessionId}`,
      );

      res.status(415).json({
        error:
          "Prepaid probe requires application/json",
      });
      return;
    }

    try{
      const persisted=await persistPrepaidProbeWebhookV39({sessionId,body:req.body??{},receivedAtUtc:new Date()});
      console.log(`[adb-v3-prepaid] session=${sessionId} items=${persisted.itemCount} duplicate=${persisted.duplicate} ms=${Date.now()-startedAt}`);
      res.status(200).json({received:true,items:persisted.itemCount,duplicate:persisted.duplicate});
    }catch(err:any){
      console.error("[adb-v3-prepaid] durable persistence failed — returning 5xx (provider details redacted)");
      if (!err?.phase2gFailureRecorded) {
        await recordPrepaidProbeCallbackFailureV39(
          sessionId,
        ).catch(() => undefined);
      }
      await recordIncident("raw-persistence",{mode:"prepaid_probe",sessionId,error:String(err?.message??"error").slice(0,240)});
      res.status(500).json({error:"Prepaid probe persistence failed; please retry"});
    }
  };
  const webhookIngress=async(req:Request,res:Response)=>{
    const startedAt=Date.now();let rawDeliveryIdForCatch:string|null=null;let receivedAtForCatch:Date|null=null;let flightsForCatch:any[]=[];let samplingForCatch:SamplingMeta|null=null;
    try{
      const secret=webhookSecret();if(!secret){res.status(503).json({error:"WEBHOOK_SECRET_NOT_CONFIGURED"});return;}if(!req.params.secret||req.params.secret!==secret){res.status(404).json({error:"Not found"});return;}
      const body:any=req.body||{};const flights:any[]=Array.isArray(body)?body:Array.isArray(body?.flights)?body.flights:[];flightsForCatch=flights;
      const parsed=flightNotificationContractSchema.safeParse(body);if(!parsed.success){const issues=parsed.error.issues.slice(0,5).map((i)=>`${i.path.join(".")||"$"}: ${i.message}`);console.warn(`[adb-v3-webhook] payload validation issues (${parsed.error.issues.length}): ${issues.join("; ")}`);}
      const subscription=body?.subscription??null,balance=body?.balance??null,receivedAt=new Date();receivedAtForCatch=receivedAt;const subId=typeof subscription?.id==="string"?subscription.id:null;
      let sampling:SamplingMeta|null=null;if(subId){try{sampling=await lookupSubscriptionMeta(subId);}catch{sampling=null;}}
      if(!sampling?.batchId){const subjType=subscription?.subject?.type,subjId=subscription?.subject?.id;const looksLikeAirport=typeof subjId==="string"&&/^[A-Za-z]{4}$/.test(subjId)&&(subjType==="FlightByAirportIcao"||!subjType);const tier=looksLikeAirport?tierForIcao(subjId):null;if(tier)sampling={batchId:null,tier,isRandomized:null,airportLayerDesignProbability:null,plannedShare:null,samplingWeight:null,randomSeed:null,windowStart:null,windowEnd:null};}
      samplingForCatch=sampling;
      const deliveryEvidence=providerDeliveryEvidence(body,req);let rawDeliveryId:string|null=null;let rawCommittedAtUtc=receivedAt;
      try{
        const committed=await persistRawDeliveryTransaction({subscriptionId:subId,batchId:sampling?.batchId??null,httpMethod:req.method??"POST",httpPath:req.originalUrl??req.path??null,rawBody:body,providerPublishedUtc:deliveryEvidence.notificationGeneratedUtc,providerNotificationGeneratedUtc:deliveryEvidence.notificationGeneratedUtc,receivedAtUtc:receivedAt,adbDeliveryId:deliveryEvidence.attemptId,adbCostCredits:deliveryEvidence.costCredits,notificationId:deliveryEvidence.notificationId,deliveryAttemptSeqNo:deliveryEvidence.attemptSeqNo,deliveryAttemptUtc:deliveryEvidence.attemptUtc,deliveryAttemptCostCredits:deliveryEvidence.costCredits},flights.map((flight:any,i:number)=>({itemIndex:i,flightNumber:typeof flight?.number==="string"&&flight.number?String(flight.number):typeof flight?.callSign==="string"?String(flight.callSign):null,carrierIata:flight?.airline?.iata??null,carrierIcao:flight?.airline?.icao??null,status:flight?.status!=null?String(flight.status):null,statusCode:typeof flight?.status==="number"?Math.trunc(flight.status):null,rawItem:flight,lastUpdatedUtc:dateOrNull(flight?.lastUpdatedUtc),departureScheduledUtc:dateOrNull(flight?.departure?.scheduledTime?.utc),arrivalScheduledUtc:dateOrNull(flight?.arrival?.scheduledTime?.utc),parsingOutcome:"pending",canonicalFlightInstanceId:null})));
        rawDeliveryId=committed.deliveryId;rawCommittedAtUtc=committed.committedAtUtc;
      }catch(rawErr:any){console.error("[adb-v3-webhook] raw delivery persistence failed — returning 5xx:",rawErr?.message||rawErr);await recordIncident("raw-persistence",{error:String(rawErr?.message??rawErr),subscriptionId:subId});res.status(500).json({error:"Raw persistence failed; please retry"});return;}
      rawDeliveryIdForCatch=rawDeliveryId;

      const extracted:ExtractedWebhookRow[]=[];let skipped=0;flights.forEach((flight:any,rawIndex:number)=>{const row=extractFlightNotification(flight,{subscription,balance,receivedAt,index:rawIndex,sampling});if(!row){skipped++;return;}extracted.push({row,rawIndex,rawFlight:flight,rawItemSha256:hashJson(flight)});});
      const identities=await Promise.all(extracted.map(({row,rawFlight})=>resolveWebhookFlightIdentity({operatingCarrier:row.carrierIata??row.carrierIcao,operatingFlightNumber:row.flightNumber,originIcao:row.depAirportIcao,originalDestinationIcao:row.arrAirportIcao,scheduledGateOutUtc:row.depScheduledUtc?.toISOString(),originTimeZone:rawFlight?.departure?.airport?.timeZone??row.depAirportTimezone??null,scheduleVerified:!!rawFlight?.departure?.scheduledTime?.utc,providerFlightId:typeof rawFlight?.id==="string"?rawFlight.id:null,providerRecordKey:typeof rawFlight?.id==="string"?rawFlight.id:null,callsign:row.callSign})));
      await persistIdentityResolutionLedger(rawDeliveryId,extracted,identities);
      const resolved=extracted.flatMap((entry,i)=>{const identity=identities[i];if(identity.status!=="resolved"){console.warn(`[adb-v3-webhook] identity quarantined rawIndex=${entry.rawIndex}: ${identity.reason}`);return [];}return[{...entry,identity}];});skipped+=extracted.length-resolved.length;const rows:InsertFlightDataPrePost[]=resolved.map((x)=>x.row);

      const attemptStartedAt=new Date();let researchAppended=false;let attemptError:string|null=null;
      try{await appendResearchEvents(resolved.map(({row:r,rawItemSha256,identity})=>{const hasLoc=r.hasLiveLocation===true&&!!r.locReportedUtc;return{eventKey:semanticObservationKey({canonicalFlightInstanceId:identity.flightInstanceId,eventType:hasLoc?"position_update":"status_change",eventPhase:r.dataStage as "PRE"|"POST",locReportedUtc:hasLoc?r.locReportedUtc:null,providerStateUpdatedUtc:r.lastUpdatedUtc??null,rawItemSha256}),flightInstanceId:identity.flightInstanceId,flightNumber:r.flightNumber,carrierIata:r.carrierIata,carrierIcao:r.carrierIcao,callSign:r.callSign,aircraftReg:r.aircraftReg,aircraftModeS:r.aircraftModeS,aircraftModel:r.aircraftModel,eventTimestamp:r.locReportedUtc??r.lastUpdatedUtc??rawCommittedAtUtc,providerPublishedUtc:deliveryEvidence.notificationGeneratedUtc,availableAt:rawCommittedAtUtc,receivedTimestampUtc:r.receivedAt??receivedAt,dataStage:r.dataStage as "PRE"|"POST",status:r.status,hasLiveLocation:hasLoc,locLat:r.locLat,locLon:r.locLon,locAltitudeFt:r.locAltitudeFt,locPressureAltitudeFt:r.locPressureAltitudeFt,locGroundSpeedKt:r.locGroundSpeedKt,locTrueTrackDeg:r.locTrueTrackDeg,locVsiFpm:r.locVsiFpm,locReportedUtc:r.locReportedUtc,scheduledGateOut:r.depScheduledUtc,actualGateOut:null,scheduledWheelsOff:null,actualWheelsOff:null,scheduledWheelsOn:null,actualWheelsOn:null,scheduledGateIn:r.arrScheduledUtc,actualGateIn:null,sourceLatencySeconds:deliveryEvidence.notificationGeneratedUtc?Math.max(0,(receivedAt.getTime()-deliveryEvidence.notificationGeneratedUtc.getTime())/1000):null,payloadSha256:rawItemSha256,batchId:sampling?.batchId??null,subscriptionId:subId,ingestEventId:null};}));researchAppended=true;}catch(researchErr:any){attemptError=String(researchErr?.message||researchErr);throw new Error(`research event log write failed: ${attemptError}`);}
      const stats=await upsertFlightNotifications(rows);
      try{await persistProcessingAttempt({deliveryId:rawDeliveryId,attemptIndex:1,parserVersion:"flightNotificationExtractor_v3",schemaVersion:"v3.9-f.8",outcome:attemptError?"partial":"success",itemsReceived:flights.length,itemsParsed:extracted.length,itemsStored:stats.stored,itemsSkipped:skipped,itemsFailed:attemptError?1:0,validationErrors:parsed.success?null:parsed.error.issues,parseErrors:attemptError?[attemptError]:null,storageErrors:null,errorMessage:attemptError,startedAtUtc:attemptStartedAt,completedAtUtc:new Date(),durationMs:Date.now()-attemptStartedAt.getTime(),upsertResult:stats,researchEventsAppended:researchAppended,ingestEventWritten:false});}catch(attemptErr:any){console.warn("[adb-v3-webhook] processing_attempt write failed:",attemptErr?.message||attemptErr);}
      try{await pool.query(`INSERT INTO clean.adb_ingest_events(subscription_id,batch_id,notification_items,rows_stored,rows_inserted,rows_updated,rows_skipped,credits_remaining) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,[subId,sampling?.batchId??null,flights.length,stats.stored,stats.inserted,stats.updated,skipped,balance?.creditsRemaining??null]);}catch(ingestErr:any){console.error("[adb-v3-webhook] diagnostic ingest ledger write failed:",ingestErr?.message||ingestErr);}
      await updateRawDeliveryOutcome(rawDeliveryId,"success",flights.length,null);
      console.log(`[adb-v3-webhook] received=${flights.length} resolved=${rows.length} quarantined=${extracted.length-resolved.length} skipped=${skipped} stored=${stats.stored} sub=${subId??"-"} ms=${Date.now()-startedAt}`);res.status(200).json({received:true,flights:flights.length,stored:stats.stored,skipped});
    }catch(err:any){
      console.error("[adb-v3-webhook] semantic processing error after raw durability:",err?.message||err);
      if(rawDeliveryIdForCatch){await recordIncident("persistence",{deliveryId:rawDeliveryIdForCatch,subscriptionId:typeof req.body?.subscription?.id==="string"?req.body.subscription.id:null,error:String(err?.message||"error").slice(0,500)});await updateRawDeliveryOutcome(rawDeliveryIdForCatch,"failed",flightsForCatch.length,String(err?.message||"error").slice(0,500));}
      try{await pool.query(`INSERT INTO clean.adb_ingest_events(subscription_id,batch_id,notification_items,delivery_failure,error) VALUES($1,$2,0,true,$3)`,[typeof req.body?.subscription?.id==="string"?req.body.subscription.id:null,samplingForCatch?.batchId??null,String(err?.message||"error").slice(0,500)]);}catch(ledgerErr:any){console.error("[adb-v3-webhook] failure-ledger write failed:",ledgerErr?.message||ledgerErr);}
      try{if(rawDeliveryIdForCatch)await persistProcessingAttempt({deliveryId:rawDeliveryIdForCatch,attemptIndex:1,parserVersion:"flightNotificationExtractor_v3",schemaVersion:"v3.9-f.8",outcome:"failed",itemsReceived:flightsForCatch.length,itemsParsed:0,itemsStored:0,itemsSkipped:0,itemsFailed:flightsForCatch.length,validationErrors:null,parseErrors:[String(err?.message||"error").slice(0,500)],storageErrors:null,errorMessage:String(err?.message||"error").slice(0,500),startedAtUtc:receivedAtForCatch??new Date(startedAt),completedAtUtc:new Date(),durationMs:Date.now()-startedAt,upsertResult:null,researchEventsAppended:false,ingestEventWritten:false});}catch(attemptErr:any){console.error("[adb-v3-webhook] failed-attempt write failed:",attemptErr?.message||attemptErr);}
      res.status(200).json({received:true,error:err?.message||"error"});
    }
  };

  app.post(
    "/api/v1/webhooks/aerodatabox/:secret/prepaid/:sessionId",
    prepaidEarlySecretGuard,
    prepaidJsonParser,
    prepaidWebhookIngress,
  );

  /*
   * Dedicated parser-error boundary for the prepaid route.
   *
   * Wrong-secret requests must not be able to poison a
   * legitimate runtime session's callback counters.
   */
  app.use(
    async (
      err: any,
      req: Request,
      res: Response,
      next: NextFunction,
    ) => {
      const pathOnly =
        String(
          req.originalUrl ??
          req.url ??
          "",
        ).split("?")[0];

      const match =
        /^\/api\/v1\/webhooks\/aerodatabox\/([^/]+)\/prepaid\/([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/?$/i
          .exec(pathOnly);

      if (!match) {
        next(err);
        return;
      }

      const expected = webhookSecret();

      if (!expected) {
        res.status(503).json({
          error:
            "WEBHOOK_SECRET_NOT_CONFIGURED",
        });
        return;
      }

      let supplied: string;

      try {
        supplied =
          decodeURIComponent(match[1]);
      } catch {
        res.status(404).json({
          error: "Not found",
        });
        return;
      }

      const expectedBytes =
        Buffer.from(expected);

      const suppliedBytes =
        Buffer.from(supplied);

      if (
        expectedBytes.length !==
          suppliedBytes.length ||
        !timingSafeEqual(
          expectedBytes,
          suppliedBytes,
        )
      ) {
        res.status(404).json({
          error: "Not found",
        });
        return;
      }

      const sessionId =
        match[2].toLowerCase();

      const counted =
        await recordPrepaidProbeIngressFailureV39(
          sessionId,
        ).catch(() => false);

      const tooLarge =
        err?.type === "entity.too.large" ||
        Number(err?.status) === 413;

      const status =
        tooLarge ? 413 : 400;

      await recordIncident(
        "prepaid-ingress-json-parser",
        {
          mode: "prepaid_probe",
          sessionId,
          counted,
          parser_type:
            String(
              err?.type ??
              "unknown",
            ).slice(0, 80),
          http_status: status,
        },
      );

      console.error(
        `[adb-v3-prepaid] JSON ingress failure session=${sessionId} status=${status}`,
      );

      res.status(status).json({
        error:
          tooLarge
            ? "Prepaid probe payload too large"
            : "Prepaid probe JSON invalid",
      });
    },
  );

  // GitHub alone verifies the provider account and signs a fresh, exact-session
  // provider-INACTIVE attestation. This receiver holds no AeroDataBox API key.
  // Fail closed on missing signature/configuration, stale assertions, runtime
  // state loss, mismatched probe ownership or unexpected live blob counts.
  app.post("/__v39/phase2g/runtime-cleanup", phase2gCleanupProofGuard, async (req,res) => {
    const proof = req.body as import("./lib/disruption/phase2gCleanupAttestation_v39").Phase2gCleanupAttestationV39;
    const sessionId = proof.session_id;
    const deletionRunId = proof.deletion_run_id;
    const requestSha = phase2gCleanupScopeHashV39(proof);

    // A signed replay must match the original immutable deletion run.
    const journalQ = await pool.query(
      `SELECT session_id,probe_id,deletion_run_id,request_sha256,
              expected_live_blobs,state,deleted_blobs,
              deleted_runtime_rows,verified_at_utc
         FROM clean.phase2g_cleanup_journal_v39
        WHERE session_id=$1::uuid`,
      [sessionId],
    );

    const priorJournal = journalQ.rows[0] ?? null;
    if (priorJournal) {
      try {
        assertPhase2gCleanupJournalMatchV39(proof, priorJournal);
      } catch {
        res.status(409).json({
          error: "EXACT_STAGE1_CLEANUP_JOURNAL_SCOPE_CONFLICT",
        });
        return;
      }
    }

    const blobCountsSql = `
      SELECT
        count(*)::int AS total,
        count(*) FILTER (
          WHERE deletion_verified_at_utc IS NULL
        )::int AS live,
        count(*) FILTER (
          WHERE deletion_verified_at_utc IS NOT NULL
            AND deletion_run_id=$2
        )::int AS verified_for_run
      FROM clean.provider_content_blob_ref
      WHERE source_kind='webhook'
        AND source_record_id LIKE $1`;
    const blobCountsParams = [
      `prepaid:${sessionId}:%`,
      deletionRunId,
    ];

    // The runtime session is intentionally gone after VERIFIED.
    // Recover the original result ONLY from journal, historical
    // probe identity, tombstones and absence of all runtime rows.
    if (priorJournal?.state === "VERIFIED") {
      const probe = await pool.query(
        `SELECT probe_id,status,reconciliation_status,
                duration_censored,stop_reason,
                provider_content_safe_mode,probe_budget_day_id,icao
           FROM clean.adb_anchor_probe
          WHERE runtime_session_id=$1::uuid
            AND probe_id=$2 AND stage=1`,
        [sessionId, proof.probe_id],
      );

      const p = probe.rows[0];
      if (
        probe.rowCount !== 1 ||
        !["settling", "completed"].includes(String(p.status)) ||
        p.reconciliation_status !== "MATCH" ||
        p.duration_censored !== false ||
        p.stop_reason != null ||
        p.provider_content_safe_mode !== true ||
        String(p.probe_budget_day_id) !== proof.probe_budget_day_id ||
        String(p.icao).toUpperCase() !== proof.icao
      ) {
        res.status(409).json({
          error: "EXACT_STAGE1_VERIFIED_PROBE_CONFLICT",
        });
        return;
      }

      const counts = await pool.query(
        blobCountsSql,
        blobCountsParams,
      );
      try {
        assertPhase2gCleanupBlobCountsV39(
          counts.rows[0] ?? {},
          proof.expected_live_blobs,
          true,
        );
      } catch {
        res.status(409).json({
          error: "EXACT_STAGE1_VERIFIED_BLOBS_CONFLICT",
        });
        return;
      }

      const remaining = await pool.query(
        `SELECT
          (SELECT count(*)::int FROM clean.prepaid_probe_session_runtime
            WHERE session_id=$1) AS sessions,
          (SELECT count(*)::int FROM clean.prepaid_probe_delivery_runtime
            WHERE session_id=$1) AS deliveries,
          (SELECT count(*)::int FROM clean.prepaid_probe_item_runtime
            WHERE session_id=$1) AS items`,
        [sessionId],
      );

      if (
        ["sessions", "deliveries", "items"].some(
          k => Number(remaining.rows[0]?.[k] ?? -1) !== 0,
        )
      ) {
        res.status(409).json({
          error: "EXACT_STAGE1_VERIFIED_RUNTIME_ROWS_REMAIN",
        });
        return;
      }

      res.status(200).json({
        schema: "v39.phase2g-runtime-cleanup.v1",
        status: "PASS",
        session_id: sessionId,
        probe_id: proof.probe_id,
        deleted_blobs: Number(priorJournal.deleted_blobs),
        deleted_runtime_rows: Number(
          priorJournal.deleted_runtime_rows,
        ),
        verified_at_utc: new Date(
          priorJournal.verified_at_utc,
        ).toISOString(),
        provider_inactive_attestation_verified: true,
        provider_call: false,
        provider_mutation: false,
        recovery_replay: true,
      });
      return;
    }
    const owner = await pool.query(
      `SELECT p.probe_id,p.status,p.stage,p.provider_content_safe_mode,
              p.probe_budget_day_id,p.icao,p.reconciliation_status,
              p.duration_censored,p.stop_reason,
              r.state AS runtime_state,
              r.last_delivery_at_utc AS runtime_last_delivery_at_utc,
              r.provider_subscription_id AS runtime_provider_subscription_id
         FROM clean.adb_anchor_probe p
         JOIN clean.prepaid_probe_session_runtime r
           ON r.session_id=p.runtime_session_id
          AND r.owner_kind='anchor_probe'
          AND r.owner_probe_id=p.probe_id
          AND r.stage=1
        WHERE p.runtime_session_id=$1::uuid
          AND p.probe_id=$2::int
          AND p.stage=1
          AND p.provider_content_safe_mode=true`,
      [sessionId, proof.probe_id],
    );
    if (owner.rowCount !== 1) {
      res.status(409).json({ error: "EXACT_STAGE1_SESSION_OWNER_NOT_FOUND" });
      return;
    }
    const row = owner.rows[0];
    const runtimeState = String(row.runtime_state ?? "");
    const probeStatus = String(row.status ?? "");
    if (runtimeState !== "settling" ||
        probeStatus !== "settling" ||
        String(row.reconciliation_status ?? "") !== "MATCH" ||
        row.duration_censored !== false ||
        row.stop_reason != null ||
        String(row.probe_budget_day_id ?? "") !== proof.probe_budget_day_id ||
        String(row.icao ?? "").toUpperCase() !== proof.icao ||
        String(row.runtime_provider_subscription_id ?? "") !== proof.provider_subscription_id) {
      res.status(409).json({ error: "EXACT_STAGE1_SESSION_PROOF_MISMATCH_OR_UNSAFE_STATE" });
      return;
    }

    const lastDeliveryMs = Date.parse(String(row.runtime_last_delivery_at_utc ?? ""));
    if (!Number.isFinite(lastDeliveryMs) || Date.now() - lastDeliveryMs < 30_000) {
      res.status(409).json({ error: "EXACT_STAGE1_CALLBACK_QUIESCENCE_NOT_PROVEN" });
      return;
    }

    const live = await pool.query(
      blobCountsSql,
      blobCountsParams,
    );
    try {
      assertPhase2gCleanupBlobCountsV39(
        live.rows[0] ?? {},
        proof.expected_live_blobs,
      );
    } catch {
      res.status(409).json({
        error: "EXACT_STAGE1_LIVE_BLOB_COUNT_MISMATCH",
      });
      return;
    }

    try {
      const cleaned = await cleanupPrepaidProbeSessionLocalV39(
        sessionId,
        deletionRunId,
        async (client) => {
          const checked = await client.query(
            `SELECT p.probe_id,p.status,p.stage,
                    p.provider_content_safe_mode,
                    p.probe_budget_day_id,p.icao,
                    p.reconciliation_status,
                    p.duration_censored,p.stop_reason,
                    p.runtime_cleanup_verified_at_utc,
                    r.state AS runtime_state,
                    r.last_delivery_at_utc AS runtime_last_delivery_at_utc,
                    r.provider_subscription_id AS runtime_provider_subscription_id
               FROM clean.adb_anchor_probe p
               JOIN clean.prepaid_probe_session_runtime r
                 ON r.session_id=p.runtime_session_id
                AND r.owner_kind='anchor_probe'
                AND r.owner_probe_id=p.probe_id
                AND r.stage=1
              WHERE p.runtime_session_id=$1::uuid
                AND p.probe_id=$2::int
                AND p.stage=1
                AND p.provider_content_safe_mode=true
              FOR UPDATE OF r,p`,
            [sessionId, proof.probe_id],
          );

          if (checked.rowCount !== 1) {
            throw new Error("EXACT_STAGE1_LOCKED_OWNER_NOT_FOUND");
          }

          const x = checked.rows[0];

          if (
            String(x.runtime_state) !== "settling" ||
            String(x.status) !== "settling" ||
            String(x.reconciliation_status) !== "MATCH" ||
            x.duration_censored !== false ||
            x.stop_reason != null ||
            x.runtime_cleanup_verified_at_utc != null ||
            String(x.probe_budget_day_id ?? "") !== proof.probe_budget_day_id ||
            String(x.icao ?? "").toUpperCase() !== proof.icao ||
            String(x.runtime_provider_subscription_id ?? "") !==
              proof.provider_subscription_id
          ) {
            throw new Error("EXACT_STAGE1_LOCKED_PROOF_MISMATCH");
          }

          const lastMs = Date.parse(
            String(x.runtime_last_delivery_at_utc ?? ""),
          );
          if (
            !Number.isFinite(lastMs) ||
            Date.now() - lastMs < 30_000
          ) {
            throw new Error("EXACT_STAGE1_LOCKED_CALLBACK_NOT_QUIET");
          }

          const liveAgain = await client.query(
            blobCountsSql,
            blobCountsParams,
          );
          try {
            assertPhase2gCleanupBlobCountsV39(
              liveAgain.rows[0] ?? {},
              proof.expected_live_blobs,
            );
          } catch {
            throw new Error(
              "EXACT_STAGE1_LOCKED_BLOB_COUNT_MISMATCH",
            );
          }
        },
        {
          probeId: proof.probe_id,
          expectedLiveBlobs: proof.expected_live_blobs,
          requestSha256: requestSha,
        },
      );
      res.status(200).json({
        schema: "v39.phase2g-runtime-cleanup.v1",
        status: "PASS",
        session_id: sessionId,
        probe_id: Number(row.probe_id),
        deleted_blobs: cleaned.deletedBlobs,
        deleted_runtime_rows: cleaned.deletedRuntimeRows,
        verified_at_utc: cleaned.verifiedAtUtc,
        provider_inactive_attestation_verified: true,
        provider_call: false,
        provider_mutation: false,
      });
    } catch (error: any) {
      console.error("[phase2g-runtime-cleanup] failed:", error?.name ?? "unknown");
      res.status(500).json({
        schema: "v39.phase2g-runtime-cleanup.v1",
        status: "FAIL",
        session_id: sessionId,
        error: "REMOTE_CLEANUP_FAILED",
        provider_mutation: false,
      });
    }
  });
  app.post("/api/v1/webhooks/aerodatabox",webhookIngress);
  app.post("/api/v1/webhooks/aerodatabox/:secret",webhookIngress);
  app.get("/api/v1/subscriptions/balance",managementGuard,async(_req,res)=>{res.status(200).json({balance:await getBalance()});});
  app.post("/api/v1/subscriptions/balance/refill",managementGuard,managementMutationGuard("refill"),async(req,res)=>{const credits=Math.floor(Number(req.body?.credits));if(!Number.isFinite(credits)||credits<=0)return res.status(400).json({error:"credits must be a positive integer"});const balance=await refillBalance(credits);if(!balance)return res.status(502).json({error:"Failed to refill AeroDataBox balance"});res.json({balance});});
  app.get("/api/v1/subscriptions/webhook",managementGuard,async(_req,res)=>{res.json({subscriptions:await listSubscriptions()});});
  app.get("/api/v1/subscriptions/webhook/:id",managementGuard,async(req,res)=>{const subscription=await getSubscription(String(req.params.id));if(!subscription)return res.status(404).json({error:"Subscription not found"});res.json({subscription});});
  app.post("/api/v1/subscriptions/webhook",managementGuard,managementMutationGuard("subscription"),async(req,res)=>{const{subjectType,subjectId,maxDeliveryRetries,url}=req.body||{};if(subjectType!=="FlightByNumber"&&subjectType!=="FlightByAirportIcao")return res.status(400).json({error:"invalid subjectType"});if(!subjectId||typeof subjectId!=="string")return res.status(400).json({error:"subjectId is required"});let retriesResolved:number;try{retriesResolved=resolveExperimentalRetries(maxDeliveryRetries===undefined?undefined:Number(maxDeliveryRetries));}catch{return res.status(400).json({error:"maxDeliveryRetries must be 0 for V3.9 experimental subscriptions"});}const subscription=await createSubscription(subjectType as SubscriptionSubjectType,subjectId,{url:url||defaultWebhookUrl(),maxDeliveryRetries:retriesResolved});if(!subscription)return res.status(502).json({error:"Failed to create subscription"});res.status(201).json({subscription});});
  app.delete("/api/v1/subscriptions/webhook/:id",managementGuard,managementMutationGuard("subscription"),async(req,res)=>{const ok=await deleteSubscription(String(req.params.id));if(!ok)return res.status(502).json({error:"Failed to delete subscription"});res.json({success:true});});

  app.get("/api/v1/collection/catalog",managementGuard,(_req,res)=>{res.json({tiers:AIRPORT_TIERS,byTier:Object.fromEntries(AIRPORT_TIERS.map((t)=>[t,[...AIRPORT_CATALOG[t]]])),tierMix:COLLECTOR_CONFIG.tierMix});});
  app.get("/api/v1/collection/status",managementGuard,async(_req,res)=>{try{res.json(await getCollectionStatus());}catch(err:any){res.status(500).json({error:err?.message||"failed to read collection status"});}});
  app.post("/api/v1/collection/start",managementGuard,async(_req,res)=>{
    res.status(409).json({error:"REFUSED_PHASE6_HTTP_START: use the exact v39:phase6:start wrapper/owner; HTTP is not a Phase-6 start authority."});
  });
  app.post("/api/v1/collection/stop",managementGuard,async(_req,res)=>{
    res.status(409).json({error:"REFUSED_PHASE6_HTTP_STOP: use v39:phase6:pause; HTTP is not a Phase-6 stop/settlement authority."});
  });
  app.get("/api/v1/collection/diagnostics",managementGuard,async(_req,res)=>{try{res.json(await getDiagnostics());}catch(err:any){res.status(500).json({error:err?.message||"failed to run diagnostics"});}});
  app.get("/api/v1/collection/coverage",managementGuard,async(req,res)=>{try{const cov=await getAirportCoverage(req.query?.force==="1"||req.query?.force==="true");if(!cov)return res.status(502).json({error:"Coverage enumeration failed"});res.json(cov);}catch(err:any){res.status(500).json({error:err?.message||"failed to fetch coverage"});}});
}
