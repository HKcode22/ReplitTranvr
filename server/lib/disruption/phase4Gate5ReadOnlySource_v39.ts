/**
 * Phase4 Gate5 bounded, READ-ONLY candidate-source adapter (Plan f.8 §§5,16).
 * This is intentionally NOT an authenticated Gate5 pass or vendor API client.
 *
 * Existing FIDS queries + original webhook item identity are the sole sources.
 * Do not guess missing source fields, turn zero evidence into zero coverage,
 * or use received notifications as the FIDS population denominator.
 * Raw sources never leave the injected query boundary or enter public logs.
 */
import {analyzeGate5Offline,type Gate5Input,type Gate5Report,
  type FidsFact,type WebhookFact,type SnapshotFact} from "./phase4Gate5OfflineFunnel_v39";

export const GATE5_READONLY_ADAPTER_V39="v39.phase4.gate5-readonly-source.v1" as const;
export const GATE5_MAX_FIDS=20000;
export const GATE5_MAX_WEBHOOKS=20000;
export const GATE5_MAX_SNAPSHOTS=20000;
const SHA=/^[a-f0-9]{64}$/;
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/;
export interface Gate5ReadScope {
 airport:string; tier:string;region:string;startUtc:string;endUtc:string;readAsOfUtc:string;
}
export interface Gate5ReadConnection {
 query(sql:string,params?:unknown[]):Promise<{rows:unknown[]}>;
}
function toUtc(x:unknown,reason:string):string{
 if(x instanceof Date){if(!Number.isFinite(x.getTime()))throw Error("GATE5_INVALID_DB_DATE_"+reason);return x.toISOString();}
 if(typeof x!=="string"||!ISO.test(x))throw Error("GATE5_EXPLICIT_UTC_"+reason);
 const n=Date.parse(x);
 if(!Number.isFinite(n)||new Date(n).toISOString().slice(0,19)!==x.slice(0,19))
   throw Error("GATE5_INVALID_UTC_"+reason);
 return new Date(n).toISOString();
}
function id(x:unknown){return typeof x==="string"&&x.length>0&&x.length<=180;}
function record(x:unknown):Record<string,unknown>{
 if(!x||typeof x!=="object"||Array.isArray(x))throw Error("GATE5_SOURCE_ROW_INVALID");
 return x as Record<string,unknown>;
}
function optionalUtc(x:unknown,reason:string):string|null{
 return x===null||x===undefined?null:toUtc(x,reason);
}
export function validateGate5ReadScopeV39(x:Gate5ReadScope):void{
 if(!x||!/^[A-Z]{4}$/.test(x.airport)||!id(x.tier)||!id(x.region))
   throw Error("GATE5_READONLY_SCOPE_INVALID");
 const start=Date.parse(toUtc(x.startUtc,"start"));
 const end=Date.parse(toUtc(x.endUtc,"end"));
 const read=Date.parse(toUtc(x.readAsOfUtc,"read"));
 if(start>=end||end-start>7*86400_000||read<start-48*3600_000)
   throw Error("GATE5_READONLY_WINDOW_INVALID");
}
// These queries require existing logged schema from baseline B0062. All scoped
// and bounded; source content is only checked for evidence presence, not copied.
// Old/expired raw content is *excluded* from candidate inputs, never revived.
export const GATE5_READ_FIDS_SQL_V39=[
 "SELECT p.analytic_identity_id AS analytic_id,",
 " p.canonical_flight_instance_id AS canonical_id, p.population_query_id::text AS query_id,",
 " p.population_role AS role, p.scope_classification AS scope,",
 " p.codeshare_resolution_status AS codeshare, p.dep_scheduled_utc AS scheduled,",
 " p.available_at AS member_available, q.available_at AS query_available,",
 " GREATEST(p.available_at,q.available_at) AS effective_available,",
 " (p.available_at>=q.available_at OR (p.available_at<q.available_at",
 " AND q.available_at-p.available_at<interval '1 millisecond'))",
 " AS source_clock_precision_compatible,",
 " p.response_hash AS row_hash, q.response_hash AS query_hash,",
 " p.source_airport_icao AS airport",
 "FROM clean.flight_population p",
 "JOIN clean.fids_query_response q ON q.population_query_id=p.population_query_id",
 "WHERE p.source_type='fids' AND p.source_airport_icao=$1",
 "AND p.window_start_utc=$2::timestamptz AND p.window_end_utc=$3::timestamptz",
 "AND q.source_airport_icao=$1 AND q.service_window_start_utc=$2::timestamptz",
 "AND q.service_window_end_utc=$3::timestamptz",
 "AND p.available_at <= $4::timestamptz AND q.available_at <= $4::timestamptz",
 "AND p.provider_content_expired_at_utc IS NULL AND q.raw_expired_at_utc IS NULL",
 "AND q.raw_payload IS NOT NULL",
 "ORDER BY p.id ASC LIMIT 20001"
].join(" ");
export const GATE5_READ_WEBHOOK_SQL_V39=[
 "SELECT r.flight_instance_id AS flight_id, d.received_at_utc AS received_at,",
 " d.raw_body_sha256 AS envelope_sha, i.raw_item_sha256 AS item_sha,",
 " r.raw_item_sha256 AS resolution_sha",
 "FROM clean.webhook_identity_resolution r",
 "JOIN clean.raw_delivery_item i ON i.delivery_id=r.delivery_id",
 " AND i.item_index=r.item_index AND i.raw_item_sha256=r.raw_item_sha256",
 "JOIN clean.raw_delivery d ON d.delivery_id=r.delivery_id",
 "WHERE r.resolution_status='resolved' AND r.flight_instance_id IS NOT NULL",
 "AND r.provider_identity_expired_at_utc IS NULL",
 "AND i.provider_content_expired_at_utc IS NULL AND i.raw_expired_at_utc IS NULL",
 "AND d.provider_content_expired_at_utc IS NULL AND d.raw_expired_at_utc IS NULL",
 "AND d.raw_body IS NOT NULL AND i.raw_item IS NOT NULL",
 "AND d.received_at_utc >= $2::timestamptz AND d.received_at_utc < $3::timestamptz",
 "AND d.received_at_utc <= $4::timestamptz",
 "AND EXISTS (SELECT 1 FROM clean.webhook_flight_identity wi",
 " WHERE wi.flight_instance_id=r.flight_instance_id AND wi.origin_icao=$1)",
 "ORDER BY d.received_at_utc ASC LIMIT 20001"
].join(" ");
export const GATE5_READ_SNAPSHOT_SQL_V39=[
 "SELECT s.flight_instance_id AS flight_id, s.horizon,",
 " s.prediction_cutoff_utc AS cutoff, s.population_query_id AS query_id,",
 " s.fids_response_hash AS snapshot_hash,",
 " s.missingness_flags AS missing_flags, s.created_at AS created_at",
 "FROM clean.flight_snapshots s",
 "WHERE s.prediction_state='PRE_DEPARTURE' AND s.created_at <= $4::timestamptz",
 "AND EXISTS (SELECT 1 FROM clean.flight_population p",
 " WHERE p.source_airport_icao=$1 AND p.window_start_utc=$2::timestamptz",
 " AND p.window_end_utc=$3::timestamptz",
 " AND p.canonical_flight_instance_id=s.flight_instance_id",
 " AND p.provider_content_expired_at_utc IS NULL)",
 "ORDER BY s.created_at ASC LIMIT 20001"
].join(" ");

export interface Gate5ReadOnlyResult {
 schema:typeof GATE5_READONLY_ADAPTER_V39;
 status:"OFFLINE_CANDIDATE_ONLY_AUTHENTICITY_AND_CUTOFF_HOLD";
 counts:{
  fidsRowsRead:number;fidsRowsMapped:number;
  fidsRejectedMissingIdentityOrClock:number;
  fidsRejectedHashesOrTime:number;
  webhookRowsRead:number;webhookRowsMapped:number;
  webhookRejectedRawHash:number;
  snapshotRowsRead:number;snapshotRowsMapped:number;
  snapshotsRejectedLineageOrClock:number;
 };
 evidenceLimitReached:false;
 underlyingSourceCompletenessProven:false;
 firstScheduledTIndependentlyValidated:false;
 physicalFlightLinkageIndependentlyValidated:false;
 webhookDeliveryExhaustivenessValidated:false;
 providerActualRunwayLabelValidated:false;
 airbornePopulationIndependentlyValidated:false;
 report:Gate5Report;
 providerCalls:0;databaseWrites:0;
}
/** Injection allows real dedicated connection OR fake disposable test reader. */
export async function readPhase4Gate5CandidateEvidenceV39(
 connection:Gate5ReadConnection,scope:Gate5ReadScope
):Promise<Gate5ReadOnlyResult>{
 validateGate5ReadScopeV39(scope);
 const args=[scope.airport,scope.startUtc,scope.endUtc,scope.readAsOfUtc];
 // Sequential reads must be invoked inside ONE caller-owned read-only,
 // repeatable-read transaction; do not auto-synthesize consistency.
 const fResult=await connection.query(GATE5_READ_FIDS_SQL_V39,args);
 const wResult=await connection.query(GATE5_READ_WEBHOOK_SQL_V39,args);
 const sResult=await connection.query(GATE5_READ_SNAPSHOT_SQL_V39,args);
 if(fResult.rows.length>GATE5_MAX_FIDS||
    wResult.rows.length>GATE5_MAX_WEBHOOKS||
    sResult.rows.length>GATE5_MAX_SNAPSHOTS)
   throw Error("GATE5_SOURCE_LIMIT_REACHED_NOT_COMPLETE");
 let missing=0,bad=0,wbad=0,sbad=0;
 const rows: FidsFact[]=[];
 const firstByFlight=new Map<string,{when:number;t:string|null}>();
 const sourceHashByQuery=new Map<string,string>();
 const pending:Array<FidsFact & {firstSelectedTUtc:string|null}>=[];
 const latest=Date.parse(scope.readAsOfUtc);
 for(const value of fResult.rows){
   const r=record(value);
   const rawId=r.canonical_id;
   const flightId=id(rawId)?String(rawId):
     id(r.analytic_id)?String(r.analytic_id):null;
   if(!flightId||!id(r.query_id)||r.airport!==scope.airport){
     missing++;continue;
   }
   let available:string,queryAt:string,effectiveAt:string;
   try{
     available=toUtc(r.member_available,"fids_member");
     queryAt=toUtc(r.query_available,"fids_query");
     effectiveAt=toUtc(r.effective_available,"fids_effective");
   }catch{missing++;continue;}
   // PostgreSQL retains microseconds; the JS Date adapter does not. A source
   // record may predate its parent receipt by <1ms from serialization alone.
   // Require the DB's exact-precision comparison, then use GREATEST of BOTH
   // original source clocks for every cutoff and first-sighting decision.
   // A >=1ms inversion remains invalid; no historical field is rewritten.
   const effectiveMs=Date.parse(effectiveAt);
   if(r.source_clock_precision_compatible!==true||
      effectiveMs<Math.max(Date.parse(available),Date.parse(queryAt))||
      effectiveMs>latest){bad++;continue;}
   if(typeof r.row_hash!=="string"||!SHA.test(r.row_hash)||
      r.query_hash!==r.row_hash){bad++;continue;}
   const role=r.role==="requested_airport_primary"||r.role==="opposite_movement_context"?
     r.role:"opposite_movement_context"; // never promote unknown role
   const sc=r.scope==="confirmed_core"||r.scope==="auxiliary"?r.scope:"unknown";
   // Confirmed operating leg requires a canonical physical-instance ID;
   // a provisional analytics identifier is not a verified airline-operated leg.
   const cs=rawId===flightId&&r.codeshare==="confirmed_operating_leg"?
     "confirmed_operating_leg":r.codeshare==="resolved_marketing"?
       "resolved_marketing":"ambiguous_unknown";
   let t:string|null=null;
   try{t=optionalUtc(r.scheduled,"schedule");}catch{bad++;continue;}
   if(id(rawId)&&t!==null&&role==="requested_airport_primary"){
     const old=firstByFlight.get(flightId);
     if(!old||effectiveMs<old.when)
       firstByFlight.set(flightId,{when:effectiveMs,t});
   }
   sourceHashByQuery.set(String(r.query_id),String(r.query_hash));
   pending.push({
     flightId,queryId:String(r.query_id),airport:scope.airport,
     role,scope:sc,codeshare:cs,firstSelectedTUtc:null,
     movementScheduledUtc:t,availableAtUtc:effectiveAt,
     departureCountry:null,arrivalCountry:null
   });
 }
 for(const row of pending){
   rows.push({...row,firstSelectedTUtc:firstByFlight.get(row.flightId)?.t??null});
 }
 const webs:WebhookFact[]=[];
 const webSeen=new Set<string>();
 for(const val of wResult.rows){
   const r=record(val);
   if(!id(r.flight_id)||!SHA.test(String(r.envelope_sha??""))||
      !SHA.test(String(r.item_sha??""))||r.item_sha!==r.resolution_sha){
     wbad++;continue;
   }
   let at:string;
   try{at=toUtc(r.received_at,"webhook");}catch{wbad++;continue;}
   const key=String(r.flight_id)+"|"+at;
   if(webSeen.has(key))continue;
   webSeen.add(key);
   webs.push({flightId:String(r.flight_id),airport:scope.airport,receivedAtUtc:at});
 }
 const snaps:SnapshotFact[]=[];
 for(const val of sResult.rows){
   const r=record(val);
   if(!id(r.flight_id)||!id(r.query_id)||
      !["T-24h","T-6h","T-90m"].includes(String(r.horizon))||
      sourceHashByQuery.get(String(r.query_id))!==r.snapshot_hash){
     sbad++;continue;
   }
   let cutoff:string;
   try{cutoff=toUtc(r.cutoff,"snapshot");}catch{sbad++;continue;}
   const flags=r.missing_flags;
   const hasMissing=flags!==null&&typeof flags==="object"&&!Array.isArray(flags)?
     Object.values(flags).some(x=>x!==null&&x!==false):false;
   snaps.push({
     flightId:String(r.flight_id),horizon:r.horizon as SnapshotFact["horizon"],
     cutoffUtc:cutoff,populationQueryId:String(r.query_id),
     requiredComplete:false, // required-feature registry not independently validated here
     optionalMissing:hasMissing,
     targetApplicable:false,targetObserved:false,targetSourceVerified:false
   });
 }
 const input:Gate5Input={
   airport:scope.airport,tier:scope.tier,region:scope.region,
   windowStartUtc:scope.startUtc,windowEndUtc:scope.endUtc,
   fids:rows,webhooks:webs,snapshots:snaps,airborne:[]
 };
 const report=analyzeGate5Offline(input);
 return {
   schema:GATE5_READONLY_ADAPTER_V39,
   status:"OFFLINE_CANDIDATE_ONLY_AUTHENTICITY_AND_CUTOFF_HOLD",
   counts:{
     fidsRowsRead:fResult.rows.length,fidsRowsMapped:rows.length,
     fidsRejectedMissingIdentityOrClock:missing,
     fidsRejectedHashesOrTime:bad,
     webhookRowsRead:wResult.rows.length,webhookRowsMapped:webs.length,
     webhookRejectedRawHash:wbad,
     snapshotRowsRead:sResult.rows.length,snapshotRowsMapped:snaps.length,
     snapshotsRejectedLineageOrClock:sbad
   },
   evidenceLimitReached:false,underlyingSourceCompletenessProven:false,
   firstScheduledTIndependentlyValidated:false,
   physicalFlightLinkageIndependentlyValidated:false,
   webhookDeliveryExhaustivenessValidated:false,
   providerActualRunwayLabelValidated:false,
   airbornePopulationIndependentlyValidated:false,
   report,providerCalls:0,databaseWrites:0
 };
}
