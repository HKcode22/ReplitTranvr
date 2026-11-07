/**
 * Phase5 Stage2: explicit-scoped ONE-GET FIDS-to-original custody bridge.
 *
 * NOT scheduled or deployed. This prevents the 31-day owner from invoking
 * fetchFidsPopulation() with its application-DB and generic REST defaults.
 * A physical attempt requires the injected V0076-style durable reservation;
 * original + population require the injected V0077-style atomic commit.
 *
 * It DOES NOT certify a provider-native selected T, real flight-level PRE,
 * lawful long-term retention, provider outcome or Phase6 GO.
 */
import { createHash } from "node:crypto";
import { fetchFidsAirport } from "./aerodataboxLimiter_v3";
import { fetchFidsPopulation, type FidsCensusParams, type FidsQueryObservation, type PopulationRow } from "./fidsCensus_v3";
import { verifyPreparedDailyDraw, type PreparedDayForReadback, type PreparedDrawRow } from "./phase5EarlyPreselectionReadback_v39";
import type { P5FidsAcquisition } from "./phase5FidsFreezeGridAdmission_v39";

const HASH=/^[a-f0-9]{64}$/;
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const WINDOW_EARLY_MS=15*60_000;
const MAX_P5_PHYSICAL_ATTEMPTS=1;
const P5_UNIT_PRICE=2;
const RIGHT_WINDOW_MS=23*3_600_000;

function refuse(code:string):never{throw Error("REFUSED_P5_FIDS_SOURCE_"+code);}
function millis(v:string,label:string):number{
 if(!ISO.test(v))refuse(label+"_FORMAT");
 const ms=Date.parse(v);
 if(!Number.isFinite(ms)||new Date(ms).toISOString()!==v)refuse(label+"_TIME");
 return ms;
}
function validHash(s:unknown):s is string{return typeof s==="string"&&HASH.test(s);}
function strictRecord(v:unknown):Record<string,unknown>{
 if(!v||typeof v!=="object"||Array.isArray(v))refuse("ORIGINAL_ENVELOPE_MISSING");
 return v as Record<string,unknown>;
}
function previewClock(x:Date,label:string):number{
 if(!(x instanceof Date)||!Number.isFinite(x.getTime()))refuse(label+"_DB_CLOCK");
 return x.getTime();
}
export interface P5SourceSingleQueryPlan {
  acquisition:P5FidsAcquisition;
  day:PreparedDayForReadback;
  savedEarlyDrawRows:PreparedDrawRow[];
  /** Independently read SHA on the actual committed four selected DB rows. */
  expectedEarlyDrawSha256:string;
  /** Unique day/query signed authority, not any previous cohort reservation. */
  reviewedReleaseSha256:string;
  reviewedProviderRightsSha256:string;
  /**
   * Measured approved single request source latency upper bound; query's
   * latest cutoff must leave this much time for the actual original commit.
   */
  localFrom:string;
  localTo:string;
  ianaTimezone:string;
  providerApiVersion:string;
  fidsProtocolVersion:string;
  openapiSha256:string;
  /** Must be explicitly signed independently; user general consent alone not enough. */
  independentlyApprovedSourceAndRetention:true;
  githubOnlyOwnerApproved:true;
}
export interface P5PhysicalReservation {
  /** SHA of exact committed attempt; not a free-running generic REST ledger. */
  reservationSha256:string;
  queryKey:string;
  runDayIndex:number;
  icao:string;
  maxUnits:2;
  attemptNumber:1;
}
export interface P5OriginalCommit {
  /** Return only AFTER the entire original/population/binding transaction commits. */
  persisted:true;
  reservationSha256:string;
  sourcePopulationQueryId:string;
  sourceResponseHash:string;
  sourceAvailableAtUtc:string;
  normalizedRowsPersisted:number;
  originalDecodedBodySha256:string;
  retentionExpiryUtc:string;
}
export interface P5SourcePorts {
  /** MUST use the trusted V39 PostgreSQL DB clock; not GitHub runner time. */
  readDbClock():Promise<Date>;
  /** MUST atomically persist V0076 physical attempt BEFORE real GET. */
  reservePhysicalBeforeGet(input:{
    queryKey:string;runDayIndex:number;slot:string;horizon:string;
    icao:string;sourceReleaseSha256:string;earlyDrawSha256:string;
    attemptNumber:1;units:2;
  }):Promise<P5PhysicalReservation>;
  /** MUST atomically persist original source and all members with V0077. */
  commitOriginalAndPopulation(input:{
    sourceQuery:FidsQueryObservation;
    normalizedRows:PopulationRow[];
    physical:P5PhysicalReservation;
    rightsReviewSha256:string;
    expectedExpiresAtUtc:string;
  }):Promise<P5OriginalCommit>;
  /** Actual transport is EXPLICIT; testing injects a local fake fetch only. */
  fetchImpl:typeof fetch;
  /** Test-only injects immediate delays; real GitHub owner uses standard pacing. */
  sleepImpl?: (ms:number)=>Promise<void>;
}
export type P5ScopedSourceResult =
  | {status:"SOURCE_UNOBSERVED_OR_UNPERSISTED";plannedPhysicalMaximum:1;
       physicalAttemptsReserved:number;actualPreCertified:false;providerOriginalBound:false}
  | {status:"BOUND_SOURCE_LATE_NOT_PRE";plannedPhysicalMaximum:1;
       physicalAttemptsReserved:1;actualPreCertified:false;providerOriginalBound:true;
       originalAvailableAtUtc:string}
  | {status:"SOURCE_ORIGINAL_BOUND_TIMELY_NOT_FLIGHT_PRE";plannedPhysicalMaximum:1;
       physicalAttemptsReserved:1;actualPreCertified:false;providerOriginalBound:true;
       originalAvailableAtUtc:string;sourcePopulationQueryId:string;
       normalizedRowsPersisted:number};

/** Stage2 preflight; source or reservation must not happen before it succeeds. */
export function admitP5ScopedFidsSource(
  p:P5SourceSingleQueryPlan,dbNow:Date,
): {selectedIcao:string;earliestPlannedCutoffMs:number;currentDbMs:number} {
  const q=p.acquisition,day=p.day;
  if(p.independentlyApprovedSourceAndRetention!==true||
     p.githubOnlyOwnerApproved!==true||
     ![p.reviewedReleaseSha256,p.reviewedProviderRightsSha256,
       p.expectedEarlyDrawSha256,p.openapiSha256].every(validHash))
    refuse("RELEASE_OR_RIGHTS_NOT_PINNED");
  if(q.runDayIndex!==day.runDayIndex ||
     q.icao!==q.icao.toUpperCase()||
     q.providerQueryDirection!=="Departure"||
     !["HUB","MID_A","MID_B","REGIONAL"].includes(q.slot)||
     !["T-24h","T-6h","T-90m"].includes(q.horizon))
    refuse("WRONG_DAY_ROLE_OR_SOURCE_FRAME");
  if(q.apiUnitsPerAttempt!==P5_UNIT_PRICE||q.maxAttempts!==MAX_P5_PHYSICAL_ATTEMPTS)
    refuse("UNKNOWN_ONE_ATTEMPT_PRICING");
  if(!/^[A-Za-z0-9_.:-]{8,150}$/.test(q.queryKey)||
     !/^[-0-9:T]{16,17}$/.test(p.localFrom)||
     !/^[-0-9:T]{16,17}$/.test(p.localTo))
    refuse("QUERY_KEY_OR_LOCAL_FRAME");
  const proposed=verifyPreparedDailyDraw(day,p.savedEarlyDrawRows);
  if(proposed.stateHash!==p.expectedEarlyDrawSha256)
    refuse("EARLY_DRAW_SHA_MISMATCH");
  const selected=proposed.selections.find(s=>s.slotId===q.slot);
  if(!selected||selected.icao!==q.icao)
    refuse("AIRPORT_SELECTION_NOT_MATCHED");
  const earlySelected=millis(proposed.selectedAtUtc,"EARLY_SELECTION");
  const planned=millis(q.scheduledRequestUtc,"REQUEST");
  const cutoff=millis(q.earliestPlannedCutoffUtc,"CUTOFF");
  const start=millis(q.serviceWindowStartUtc,"SERVICE_START");
  const end=millis(q.serviceWindowEndUtc,"SERVICE_END");
  const plannedSelected=millis(q.plannedAirportSelectionUtc,"PLANNED_SELECTION");
  if(start!==day.scheduledStartUtc.getTime()||end<=start||
     plannedSelected>=planned||earlySelected>=planned||
     cutoff<=planned)
    refuse("FROZEN_SOURCE_WINDOW_CONFLICT");
  if(!Number.isSafeInteger(q.maxResponseAndPersistSeconds)||
     q.maxResponseAndPersistSeconds<1||q.maxResponseAndPersistSeconds>3600)
    refuse("UNBOUNDED_SOURCE_LATENCY");
  const now=previewClock(dbNow,"PREFLIGHT");
  if(now<planned-WINDOW_EARLY_MS||
     now>planned+15*60_000||
     now+q.maxResponseAndPersistSeconds*1000>cutoff)
    refuse("DB_CLOCK_OUTSIDE_PROSPECTIVE_WINDOW");
  return {selectedIcao:selected.icao,earliestPlannedCutoffMs:cutoff,currentDbMs:now};
}

/**
 * Deliberately no optional fetch/persist defaults.
 * Generic fidsRestLedger and persistFidsObservation are NEVER used here.
 */
export async function runP5ScopedFidsSource(
  p:P5SourceSingleQueryPlan,ports:P5SourcePorts,
):Promise<P5ScopedSourceResult>{
  if(!ports||typeof ports.readDbClock!=="function"||
     typeof ports.reservePhysicalBeforeGet!=="function"||
     typeof ports.commitOriginalAndPopulation!=="function"||
     typeof ports.fetchImpl!=="function")
    refuse("NO_SCOPED_PORTS");
  const first=admitP5ScopedFidsSource(p,await ports.readDbClock());
  const q=p.acquisition;
  let reserved:P5PhysicalReservation|null=null;
  let commits=0;
  let providerReservationCalls=0;
  // Mutable cell: persist callback is invoked inside an awaited dependency.
  // TS control flow cannot see assignments to a captured local in that call.
  const custody:{proof:P5OriginalCommit|null}={proof:null};
  // fetchFidsAirport intentionally swallows transport failures to NULL. A
  // trusted V0079 DB reservation refusal is NOT a provider source failure:
  // hold it separately so the caller cannot report "source unavailable".
  const admission:{failure:Error|null}={failure:null};
  const sourceParams:FidsCensusParams={
    airportIcao:first.selectedIcao,
    fromLocal:p.localFrom,toLocal:p.localTo,ianaTimezone:p.ianaTimezone,
    withCancelled:true,withCodeshared:true,withCargo:false,withPrivate:false,
    direction:"Departure",serviceWindowStartUtc:new Date(q.serviceWindowStartUtc),
    serviceWindowEndUtc:new Date(q.serviceWindowEndUtc),
    cutoffUtc:new Date(q.earliestPlannedCutoffUtc),
    restCategory:"fids_base",
    providerApiVersion:p.providerApiVersion,
    fidsProtocolVersion:p.fidsProtocolVersion,
    openapiSha256:p.openapiSha256,
  };
  const result=await fetchFidsPopulation(sourceParams,{
    fetchAirport:async(airport,from,to,opts)=>{
      if(airport!==q.icao||from!==p.localFrom||to!==p.localTo||
         opts?.direction!=="Departure"||
         opts?.strictDepartureList!==true||
         opts?.strictArrivalList!==false)
        refuse("UNSIGNED_OR_MISROUTED_SOURCE_REQUEST");
      return fetchFidsAirport(airport,from,to,{
        ...opts,fetchImpl:ports.fetchImpl,
        ...(ports.sleepImpl?{sleepImpl:ports.sleepImpl}:{}),
        budgetOwner:{
          reserve:async(category,units,attemptNumber)=>{
            // Even if the existing provider fetch helper proposes retries,
            // the SECOND reservation is refused BEFORE another GET.
            if(providerReservationCalls!==0||attemptNumber!==1||
               units!==P5_UNIT_PRICE||category!=="fids_base")
              refuse("UNAUTHORIZED_RETRY_OR_UNFUNDED_SOURCE");
            providerReservationCalls++;
            try{
              const clock=await ports.readDbClock();
              admitP5ScopedFidsSource(p,clock);
              const issued=await ports.reservePhysicalBeforeGet({
                queryKey:q.queryKey,runDayIndex:q.runDayIndex,
                slot:q.slot,horizon:q.horizon,icao:q.icao,
                sourceReleaseSha256:p.reviewedReleaseSha256,
                earlyDrawSha256:p.expectedEarlyDrawSha256,
                attemptNumber:1,units:2,
              });
              if(!issued||!validHash(issued.reservationSha256)||
                 issued.queryKey!==q.queryKey||issued.runDayIndex!==q.runDayIndex||
                 issued.icao!==q.icao||issued.attemptNumber!==1||issued.maxUnits!==2)
                refuse("PHYSICAL_RESERVATION_NOT_BOUND");
              reserved=issued;
              return issued.reservationSha256;
            }catch(error){
              // Do not expose SQL texts, secrets or provider Content.
              const m=error instanceof Error?error.message:"";
              admission.failure=/^(REFUSED_PHASE5_[A-Z0-9_]+|P5_[A-Z0-9_]+)$/.test(m)
                ?new Error(m):new Error("REFUSED_P5_FIDS_SOURCE_DB_ADMISSION_FAILED");
              throw error;
            }
          },
        },
      });
    },
    persist:async(sourceQuery,normalizedRows)=>{
      // Source-content received, but do not write "PRE" until original
      // source and ALL normalized members are durably bound in one transaction.
      if(!reserved||providerReservationCalls!==1||commits!==0)
        refuse("PERSIST_WITHOUT_SINGLE_RESERVED_ATTEMPT");
      commits++;
      const raw=strictRecord(sourceQuery.rawPayload);
      if(raw.originalDecodedEntityBodyPreserved!==true||
         raw.originalHttpWireBytesPreserved!==false)
        refuse("PROVIDER_ORIGINAL_DECODED_RECEIPT_REQUIRED");
      const body=strictRecord(raw.originalDecodedEntityBodyEvidence);
      const rawSha=body.bodySha256;
      if(!validHash(rawSha)||body.representation!==
         "FETCH_DECODED_RESPONSE_BODY_BYTES_NOT_HTTP_WIRE")
        refuse("PROVIDER_BODY_SHA_NOT_VERIFIED");
      // Expiry is an upper bound on permitted SOURCE Content custody only.
      // The reviewed rights policy may require earlier deletion.
      const expectedExpiresAtUtc=new Date(
        sourceQuery.availableAtUtc.getTime()+RIGHT_WINDOW_MS).toISOString();
      const ack=await ports.commitOriginalAndPopulation({
        sourceQuery,normalizedRows,physical:reserved,
        rightsReviewSha256:p.reviewedProviderRightsSha256,
        expectedExpiresAtUtc,
      });
      if(!ack||ack.persisted!==true||
         ack.reservationSha256!==reserved.reservationSha256||
         ack.sourcePopulationQueryId!==sourceQuery.populationQueryId||
         ack.sourceResponseHash!==sourceQuery.responseHash||
         ack.originalDecodedBodySha256!==rawSha||
         !Number.isSafeInteger(ack.normalizedRowsPersisted)||
         ack.normalizedRowsPersisted!==normalizedRows.length||
         !ISO.test(ack.sourceAvailableAtUtc)||
         !ISO.test(ack.retentionExpiryUtc)||
         Date.parse(ack.sourceAvailableAtUtc)<sourceQuery.availableAtUtc.getTime()||
         Date.parse(ack.retentionExpiryUtc)>Date.parse(expectedExpiresAtUtc))
        refuse("ATOMIC_ORIGINAL_DB_READBACK_MISMATCH");
      custody.proof=ack;
      return ack.normalizedRowsPersisted;
    },
  });
  // A database reservation rejection can be caught by the lower-level
  // network helper. It must not masquerade as a provider coverage gap.
  if(admission.failure)throw admission.failure;
  const proof=custody.proof;
  if(!result||!proof){
    return {status:"SOURCE_UNOBSERVED_OR_UNPERSISTED",
      plannedPhysicalMaximum:1,physicalAttemptsReserved:reserved?1:0,
      actualPreCertified:false,providerOriginalBound:false};
  }
  if(providerReservationCalls!==1||commits!==1||!reserved)
    refuse("DUPLICATE_SOURCE_OR_ORIGINAL");
  const sourceAvailable=millis(proof.sourceAvailableAtUtc,"ORIGINAL_AVAILABLE");
  const close=sourceAvailable>first.earliestPlannedCutoffMs;
  if(close)
    return {status:"BOUND_SOURCE_LATE_NOT_PRE",plannedPhysicalMaximum:1,
      physicalAttemptsReserved:1,actualPreCertified:false,
      providerOriginalBound:true,originalAvailableAtUtc:proof.sourceAvailableAtUtc};
  return {status:"SOURCE_ORIGINAL_BOUND_TIMELY_NOT_FLIGHT_PRE",
    plannedPhysicalMaximum:1,physicalAttemptsReserved:1,
    actualPreCertified:false,providerOriginalBound:true,
    sourcePopulationQueryId:proof.sourcePopulationQueryId,
    originalAvailableAtUtc:proof.sourceAvailableAtUtc,
    normalizedRowsPersisted:proof.normalizedRowsPersisted};
}

/** Source + selected-day binding digest for reviewer logs, not raw Content. */
export function phase5SourceQueryDigest(p:P5SourceSingleQueryPlan):string{
 return createHash("sha256").update(JSON.stringify({
  runDay:p.acquisition.runDayIndex,queryKey:p.acquisition.queryKey,
  icao:p.acquisition.icao,horizon:p.acquisition.horizon,
  draw:p.expectedEarlyDrawSha256,release:p.reviewedReleaseSha256,
  provider:p.openapiSha256,
 })).digest("hex");
}
