/**
 * Phase 4 Gate 5: physically bound future-cohort READ-ONLY population/PRE/
 * webhook readback, f.8 §§5-7,16-17; Log §1.9.
 *
 * Reads only V0077 original bindings JOINED to committed V0076 physical
 * attempts and retained FIDS originals. A V0076 reservation alone is NOT
 * a provider response. Caller MUST use one repeatable-read READ-ONLY TX.
 *
 * This is a source-candidate diagnostic, not native selected-T certification,
 * independent provider wire/rights attestation, or whole-frame Gate5 PASS.
 * Three horizon source originals cannot generally all survive to POST when
 * originals expire after 24h: run pre-expiry horizon audits and retain only
 * appropriately licensed non-Contents evidence for later reconciliation.
 */
import {createHash} from "node:crypto";
import {
 partitionP4G5IndependentCaptureV39,
 type P4G5CapturePhysicalPopulationFactV39,
 type P4G5CaptureWebhookFactV39,
 type P4G5CaptureHorizonV39
} from "./phase4Gate5IndependentCapturePartition_v39";

export const P4_G5_BOUND_CAPTURE_READ_SCHEMA_V39 =
 "v39.phase4.gate5-v0077-bound-source-pre-capture-readonly.v1" as const;
const SHA=/^[0-9a-f]{64}$/;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const H=["T-24h","T-6h","T-90m"] as const;
const MS:Record<P4G5CaptureHorizonV39,number>={
 "T-24h":86400000,"T-6h":21600000,"T-90m":5400000
};
const safeText=(x:unknown):x is string=>
 typeof x==="string"&&x.length>0&&x.length<=200&&
 ![...x].some(c=>c.charCodeAt(0)<32);
export interface P4G5BoundReadScopeV39 {
 airportIcao:string;
 reviewedManifestSha256:string;
 serviceStartUtc:string;
 serviceEndUtc:string;
 captureStartUtc:string;
 captureEndUtc:string;
 auditAtUtc:string;
 /**
  * Source of this exact list must be a separately authenticated provider
  * subscription assignment; a caller-supplied string is NOT proof. Empty
  * list => callback fields unknown/NULL, not zero captures.
  */
 reviewedCandidateSubscriptionIds:readonly string[];
}
export interface P4G5BoundReadDbV39 {
 query(sql:string,args:readonly unknown[]):Promise<{rows:unknown[]}>;
}
function reject(why:string):never{
 throw Error("P4_G5_BOUND_CAPTURE_"+why+"_HOLD");
}
function stamp(x:unknown,label:string):number{
 const s=x instanceof Date?x.toISOString():x;
 if(typeof s!=="string"||!UTC.test(s)||!Number.isFinite(Date.parse(s))||
    new Date(Date.parse(s)).toISOString()!==s)reject("CLOCK_"+label);
 return Date.parse(s);
}
function iso(x:unknown,label:string):string{return new Date(stamp(x,label)).toISOString();}
function record(x:unknown,label:string):Record<string,unknown>{
 if(!x||typeof x!=="object"||Array.isArray(x))reject("ROW_"+label);
 return x as Record<string,unknown>;
}
function str(x:unknown,label:string):string{
 if(!safeText(x))reject("FIELD_"+label);
 return x;
}
function hash(x:string):string{
 return createHash("sha256").update(x,"utf8").digest("hex");
}
function optionalStamp(x:unknown,label:string):number|null{
 return x===null||x===undefined?null:stamp(x,label);
}
function validate(s:P4G5BoundReadScopeV39){
 if(!s||!/^[A-Z]{4}$/.test(s.airportIcao)||
    !SHA.test(s.reviewedManifestSha256)||
    !Array.isArray(s.reviewedCandidateSubscriptionIds)||
    s.reviewedCandidateSubscriptionIds.length>8||
    new Set(s.reviewedCandidateSubscriptionIds).size!==s.reviewedCandidateSubscriptionIds.length||
    s.reviewedCandidateSubscriptionIds.some(x=>!safeText(x)))
  reject("REVIEW_SCOPE");
 const a=stamp(s.serviceStartUtc,"SERVICE_START");
 const b=stamp(s.serviceEndUtc,"SERVICE_END");
 const cs=stamp(s.captureStartUtc,"CAPTURE_START");
 const ce=stamp(s.captureEndUtc,"CAPTURE_END");
 const audit=stamp(s.auditAtUtc,"AUDIT");
 if(b<=a||b-a<10*60000||b-a>4*3600000||
    ce<=cs||ce-cs>7*86400000||audit<ce||
    audit-ce>7*86400000||cs>a||ce<b)
  reject("SERVICE_CAPTURE_AUDIT_RANGE");
}

// Strict V0076 reservation -> V0077 binding -> retained original response.
// Query columns are only source metadata; no source raw JSON ever leaves DB.
export const P4_G5_BOUND_SOURCE_ROWS_SQL_V39=[
 "SELECT b.population_query_id::text AS query_id,b.query_digest,",
 "b.original_response_sha256 AS original_sha,b.source_use_expires_at_utc,",
 "o.horizon,o.github_run_id,a.committed_at_utc,",
 "s.response_hash AS response_sha,s.available_at AS original_available_at,",
 "s.raw_expired_at_utc,s.source_airport_icao,",
 "s.service_window_start_utc,s.service_window_end_utc,",
 "p.canonical_flight_instance_id AS flight_id,",
 "p.analytic_identity_id AS analytic_id,",
 "p.population_role,p.scope_classification,p.codeshare_resolution_status,",
 "p.dep_scheduled_utc,p.available_at AS member_available_at,",
 "p.response_hash AS member_sha,p.provider_content_expired_at_utc",
 "FROM clean.phase4_g5_fids_original_binding_v39 b",
 "JOIN clean.phase4_g5_fids_physical_attempt_v39 a",
 "ON a.expected_reservation_sha256=b.expected_reservation_sha256",
 "AND a.query_digest=b.query_digest",
 "JOIN clean.phase4_g5_fids_allowed_query_v39 q",
 "ON q.query_digest=b.query_digest AND q.owner_digest=a.owner_digest",
 "JOIN clean.phase4_g5_fids_physical_owner_v39 o",
 "ON o.owner_digest=a.owner_digest AND o.github_run_id=a.github_run_id",
 "AND o.manifest_sha256=b.manifest_sha256",
 "JOIN clean.fids_query_response s",
 "ON s.population_query_id=b.population_query_id",
 "AND s.response_hash=b.original_response_sha256",
 "LEFT JOIN clean.flight_population p",
 "ON p.population_query_id=s.population_query_id",
 "AND p.source_airport_icao=s.source_airport_icao",
 "AND p.source_type='fids'",
 "AND p.window_start_utc=s.service_window_start_utc",
 "AND p.window_end_utc=s.service_window_end_utc",
 "WHERE b.manifest_sha256=$1",
 "AND s.source_airport_icao=$2",
 "AND s.service_window_start_utc=$3::timestamptz",
 "AND s.service_window_end_utc=$4::timestamptz",
 "AND b.source_use_expires_at_utc>$5::timestamptz",
 "AND s.raw_expired_at_utc IS NULL AND s.raw_payload IS NOT NULL",
 "AND s.available_at<=$5::timestamptz",
 "ORDER BY o.horizon,q.query_index,s.available_at,p.id",
 "LIMIT 30002"
].join(" ");

export const P4_G5_BOUND_PRE_ROWS_SQL_V39=[
 "SELECT s.flight_instance_id AS flight_id,s.horizon,",
 "s.prediction_cutoff_utc,s.selected_t_milestone_utc,",
 "s.population_query_id AS query_id,s.fids_response_hash AS response_sha,",
 "s.created_at,s.builder_version",
 "FROM clean.flight_snapshots s",
 "JOIN clean.phase4_g5_fids_original_binding_v39 b",
 "ON b.population_query_id::text=s.population_query_id",
 "AND b.original_response_sha256=s.fids_response_hash",
 "WHERE b.manifest_sha256=$1",
 "AND b.source_use_expires_at_utc>$2::timestamptz",
 "AND s.prediction_state='PRE_DEPARTURE'",
 "AND s.horizon IN ('T-24h','T-6h','T-90m')",
 "AND s.created_at<=$2::timestamptz",
 "ORDER BY s.flight_instance_id,s.horizon,s.prediction_cutoff_utc",
 "LIMIT 30002"
].join(" ");

// Notification candidates are scoped to an explicitly supplied reviewed
// subscription set, NOT inferred from FIDS airport or a global DB counter.
// A missing resolution or unresolved item is never a negative flight label.
// No event body/headers are fetched or logged.
export const P4_G5_BOUND_WEBHOOK_ROWS_SQL_V39=[
 "SELECT d.delivery_id,d.notification_id,d.subscription_id,",
 "d.received_at_utc,d.delivery_attempt_seq_no,",
 "i.item_index,i.raw_item_sha256,",
 "r.resolution_status,r.flight_instance_id AS flight_id,",
 "fi.origin_icao,fi.initial_scheduled_gate_out_utc",
 "FROM clean.raw_delivery d",
 "LEFT JOIN clean.raw_delivery_item i",
 "ON i.delivery_id=d.delivery_id",
 "AND i.raw_expired_at_utc IS NULL",
 "AND i.provider_content_expired_at_utc IS NULL",
 "LEFT JOIN clean.webhook_identity_resolution r",
 "ON r.delivery_id=d.delivery_id AND r.item_index=i.item_index",
 "AND r.provider_identity_expired_at_utc IS NULL",
 "LEFT JOIN clean.webhook_flight_identity fi",
 "ON fi.flight_instance_id=r.flight_instance_id",
 "WHERE d.subscription_id=ANY($1::text[])",
 "AND d.received_at_utc>=$2::timestamptz",
 "AND d.received_at_utc<$3::timestamptz",
 "AND d.received_at_utc<=$4::timestamptz",
 "AND d.raw_expired_at_utc IS NULL",
 "AND d.provider_content_expired_at_utc IS NULL",
 "ORDER BY d.received_at_utc,d.delivery_id,i.item_index",
 "LIMIT 30002"
].join(" ");

type Original={
 queryId:string;sha:string;horizon:P4G5CaptureHorizonV39;
 sourceAvailable:number;manifest:string;
};
type FlightMember={
 digest:string;flightId:string;role:"CONFIRMED_OPERATING_LEG"|"MARKETING_CODESHARE"|"UNKNOWN";
 primary:boolean;available:number;scheduled:number|null;queryId:string;sha:string;
};
type PreCandidate={
 flightId:string;horizon:P4G5CaptureHorizonV39;
 cutoff:number;selectedT:number|null;queryId:string;sha:string;
 created:number;
};
export async function auditP4G5BoundSourceCaptureReadOnlyV39(
 db:P4G5BoundReadDbV39,scope:P4G5BoundReadScopeV39
){
 validate(scope);
 const base=[scope.reviewedManifestSha256,scope.airportIcao,
   scope.serviceStartUtc,scope.serviceEndUtc,scope.auditAtUtc];
 const raw=await db.query(P4_G5_BOUND_SOURCE_ROWS_SQL_V39,base);
 if(!raw||!Array.isArray(raw.rows)||raw.rows.length>30000)
  reject("SOURCE_QUERY_RESULT_BOUNDS");
 const originals=new Map<string,Original>();
 const sourceMembers=new Map<string,FlightMember[]>();
 let unresolvedIdentityRows=0,invalidRoleRows=0;
 for(const item of raw.rows){
  const r=record(item,"SOURCE");
  const queryId=str(r.query_id,"QUERY_ID"),digest=str(r.query_digest,"QUERY_DIGEST");
  const sourceSha=str(r.original_sha,"ORIGINAL_SHA");
  if(!SHA.test(digest)||!SHA.test(sourceSha)||r.response_sha!==sourceSha)
   reject("ORIGINAL_SHA_OR_QUERY_DIGEST");
  const h=r.horizon;
  if(typeof h!=="string"||!H.includes(h as P4G5CaptureHorizonV39)||
     r.source_airport_icao!==scope.airportIcao||
     iso(r.service_window_start_utc,"SOURCE_START")!==scope.serviceStartUtc||
     iso(r.service_window_end_utc,"SOURCE_END")!==scope.serviceEndUtc)
   reject("ORIGINAL_HORIZON_OR_SCOPE");
  const orig=stamp(r.original_available_at,"ORIGINAL_AVAILABLE");
  const expiry=stamp(r.source_use_expires_at_utc,"SOURCE_EXPIRY");
  const committed=stamp(r.committed_at_utc,"PAID_COMMIT");
  if(orig<committed||orig>stamp(scope.auditAtUtc,"AUDIT")||
     expiry<=stamp(scope.auditAtUtc,"AUDIT")||
     !/^\d{5,25}$/.test(str(r.github_run_id,"GITHUB_RUN")))
   reject("ORIGINAL_OWNER_OR_CLOCK");
  const previously=originals.get(queryId);
  if(previously&&(
      previously.sha!==sourceSha||previously.horizon!==h||
      previously.manifest!==digest||previously.sourceAvailable!==orig))
   reject("ORIGINAL_QUERY_CONTRADICTION");
  originals.set(queryId,{
   queryId,sha:sourceSha,horizon:h as P4G5CaptureHorizonV39,
   sourceAvailable:orig,manifest:digest
  });
  if(r.flight_id===null||r.flight_id===undefined){
   if(r.analytic_id!==null&&r.analytic_id!==undefined)
    unresolvedIdentityRows++;
   continue;
  }
  const flightId=str(r.flight_id,"CANONICAL_ID");
  const available=optionalStamp(r.member_available_at,"MEMBER_AVAILABLE");
  if(available===null||available<orig||
     r.member_sha!==sourceSha||
     r.provider_content_expired_at_utc!==null)
   reject("INVALID_NORMALIZED_SOURCE_LINEAGE");
  const isPrimary=r.population_role==="requested_airport_primary";
  const role=r.scope_classification==="confirmed_core"&&
   r.codeshare_resolution_status==="confirmed_operating_leg"?
     "CONFIRMED_OPERATING_LEG" as const:
   r.codeshare_resolution_status==="resolved_marketing"?
     "MARKETING_CODESHARE" as const:"UNKNOWN" as const;
  if(!isPrimary||role==="UNKNOWN")invalidRoleRows++;
  const member:FlightMember={
   flightId,digest:hash(scope.reviewedManifestSha256+"|"+flightId),
   role,primary:isPrimary,available:Math.max(available,orig),
   scheduled:optionalStamp(r.dep_scheduled_utc,"GENERIC_SCHEDULE"),
   queryId,sha:sourceSha
  };
  sourceMembers.set(flightId,[...(sourceMembers.get(flightId)??[]),member]);
 }
 const byHorizon=Object.fromEntries(H.map(h=>[h,0])) as
   Record<P4G5CaptureHorizonV39,number>;
 for(const o of originals.values())byHorizon[o.horizon]++;
 const count=originals.size;
 // Missing originals could be expired or never acquired; NOT zero flights.
 // The three-horizon POST scientific funnel cannot use such a partial source.
 if(count!==9||H.some(h=>byHorizon[h]!==3))return {
  schema:P4_G5_BOUND_CAPTURE_READ_SCHEMA_V39,
  status:"HOLD_INCOMPLETE_OR_EXPIRED_NINE_ORIGINALS" as const,
  exactBoundOriginalReceiptsPresent:count,
  verifiedSourceSlotsPerHorizon:byHorizon,
  unresolvableSourceIdentityRows:unresolvedIdentityRows,
  actualFlightDenominator:null,
  provisionalCutoffCapturePartition:null,
  actualSelectedTVerified:false as const,actualOnlyWheelsOffVerified:false as const,
  sourceRightsIndependentlyVerified:false as const,
  independentlyVerifiedGithubManifestBytes:false as const,
  providerCalls:0 as const,databaseWrites:0 as const,
  strictGate5Passed:false as const,phase5FreezeAuthorized:false as const,
  phase6Authorized:false as const
 };
 // Candidate PRE counts must come from exact bound originals and be durable
 // at/before each historical cutoff; no post-hoc snapshot backfill.
 const preRows=await db.query(P4_G5_BOUND_PRE_ROWS_SQL_V39,[
  scope.reviewedManifestSha256,scope.auditAtUtc
 ]);
 if(!preRows||!Array.isArray(preRows.rows)||preRows.rows.length>30000)
  reject("PRE_QUERY_RESULT_BOUNDS");
 const pres=new Map<string,PreCandidate>();
 let retrospectivelyWrittenPre=0,invalidPreLineage=0;
 for(const row of preRows.rows){
  const p=record(row,"PRE");
  const id=str(p.flight_id,"PRE_FLIGHT");
  const h=p.horizon;
  if(typeof h!=="string"||!H.includes(h as P4G5CaptureHorizonV39))
   reject("PRE_HORIZON");
  const cutoff=stamp(p.prediction_cutoff_utc,"PRE_CUTOFF");
  const created=stamp(p.created_at,"PRE_CREATED");
  const selected=optionalStamp(p.selected_t_milestone_utc,"PRE_T");
  const queryId=str(p.query_id,"PRE_QUERY"),sha=str(p.response_sha,"PRE_SHA");
  const o=originals.get(queryId);
  if(!o||o.sha!==sha||!sourceMembers.get(id)?.some(m=>
     m.queryId===queryId&&m.sha===sha&&m.available<=cutoff)){
   invalidPreLineage++;continue;
  }
  if(created>cutoff){
   retrospectivelyWrittenPre++;continue;
  }
  const key=id+"|"+h;
  if(pres.has(key))reject("DUPLICATE_PRE_FLIGHT_HORIZON");
  if(o.sourceAvailable>cutoff)reject("PRE_SOURCE_AFTER_CUTOFF");
  pres.set(key,{
   flightId:id,horizon:h as P4G5CaptureHorizonV39,cutoff,
   selectedT:selected,queryId,sha,created
  });
 }
 const population:P4G5CapturePhysicalPopulationFactV39[]=[];
 let conflictingOperatingRoles=0,unverifiedSelectedTCandidates=0;
 for(const [flightId,observations] of sourceMembers){
  const primary=observations.filter(o=>o.primary);
  if(primary.length===0)continue;
  primary.sort((a,b)=>a.available-b.available||a.queryId.localeCompare(b.queryId));
  const schedule=primary.find(o=>o.scheduled!==null)?.scheduled??null;
  const roles=new Set(primary.map(o=>o.role));
  const inconsistent=roles.has("CONFIRMED_OPERATING_LEG")&&roles.size>1;
  if(inconsistent)conflictingOperatingRoles++;
  const role=inconsistent?"UNKNOWN":
    roles.has("CONFIRMED_OPERATING_LEG")?"CONFIRMED_OPERATING_LEG":
    roles.has("MARKETING_CODESHARE")?"MARKETING_CODESHARE":"UNKNOWN";
  for(const h of H){
   const cutoff=schedule===null?null:schedule-MS[h];
   // Retained responses may be present *now*, but this test requires a real
   // original source receipt/member available at the historical cutoff.
   const at=primary.filter(o=>cutoff!==null&&o.available<=cutoff);
   const newest=at.length?at[at.length-1]:primary[0];
   const pre=pres.get(flightId+"|"+h);
   if(pre&&(cutoff===null||pre.cutoff!==cutoff||
     pre.selectedT!==schedule||
     role!=="CONFIRMED_OPERATING_LEG"))reject("PRE_FROZEN_T_OR_ROLE_DRIFT");
   if(cutoff!==null)unverifiedSelectedTCandidates++;
   population.push({
    physicalLegDigest:newest.digest,
    horizon:h,
    primaryFidsObservedInReviewedServiceFrame:true,
    operatingLegRole:role,
    sourceAvailableAtUtc:new Date(newest.available).toISOString(),
    predictionCutoffUtc:cutoff===null?null:new Date(cutoff).toISOString(),
    prePersisted:!!pre
   });
  }
 }
 if(pres.size>population.length)reject("PRE_NOT_IN_COUPLED_POPULATION");
 // No subscription assignment => no valid in/out/unresolved denominator.
 // Do not claim "zero webhook" from no independent review.
 if(scope.reviewedCandidateSubscriptionIds.length===0)return {
  schema:P4_G5_BOUND_CAPTURE_READ_SCHEMA_V39,
  status:"HOLD_WEBHOOK_SUBSCRIPTION_SCOPE_UNBOUND" as const,
  exactBoundOriginalReceiptsPresent:9 as const,
  verifiedSourceSlotsPerHorizon:byHorizon,
  provisionalDistinctPhysicalIds:sourceMembers.size,
  unresolvedSourceIdentityRows:unresolvedIdentityRows,
  unknownOrContextSourceRows:invalidRoleRows,
  conflictingOperatingRoles,
  genericScheduledDepartureCandidates:unverifiedSelectedTCandidates,
  provisionalCutoffCapturePartition:null,
  unresolvedWebhookCount:null,
  sourceRightsIndependentlyVerified:false as const,
  actualSelectedTVerified:false as const,actualOnlyWheelsOffVerified:false as const,
  providerCalls:0 as const,databaseWrites:0 as const,
  strictGate5Passed:false as const,phase5FreezeAuthorized:false as const,
  phase6Authorized:false as const
 };
 const result=await db.query(P4_G5_BOUND_WEBHOOK_ROWS_SQL_V39,[
  [...scope.reviewedCandidateSubscriptionIds],
  scope.captureStartUtc,scope.captureEndUtc,scope.auditAtUtc
 ]);
 if(!result||!Array.isArray(result.rows)||result.rows.length>30000)
  reject("WEBHOOK_QUERY_RESULT_BOUNDS");
 type NotificationGroup={
  ids:Set<string>; seenDelivery:Set<string>;
  sha:Set<string>; received:number; flightIds:Set<string>;
  sourceStatuses:Set<string>; wrongScope:boolean; unresolved:boolean;
 };
 const groups=new Map<string,NotificationGroup>();
 let missingStableNotificationId=0,wrongAirportResolved=0;
 for(const x of result.rows){
  const r=record(x,"WEBHOOK");
  const deliveryId=str(r.delivery_id,"DELIVERY_ID");
  const sub=str(r.subscription_id,"SUBSCRIPTION");
  if(!scope.reviewedCandidateSubscriptionIds.includes(sub))
   reject("CALLBACK_FOREIGN_SUBSCRIPTION");
  const received=stamp(r.received_at_utc,"DELIVERY_RECEIVED");
  if(received<stamp(scope.captureStartUtc,"CAPTURE_START")||
     received>=stamp(scope.captureEndUtc,"CAPTURE_END"))
   reject("CALLBACK_TIME_SCOPE");
  const stable=safeText(r.notification_id)?
     r.notification_id:null;
  if(stable===null)missingStableNotificationId++;
  const itemIndex=r.item_index;
  if(itemIndex!==null&&
    (!Number.isSafeInteger(itemIndex)||Number(itemIndex)<0))reject("ITEM_INDEX");
  const key=(stable??("UNSTABLE-"+deliveryId))+"|"+(itemIndex??"NO_ITEM");
  let g=groups.get(key);
  if(!g){
   g={ids:new Set(),seenDelivery:new Set(),sha:new Set(),received,
      flightIds:new Set(),sourceStatuses:new Set(),wrongScope:false,
      unresolved:false};
   groups.set(key,g);
  }
  g.ids.add(stable??("UNSTABLE-"+deliveryId));
  g.seenDelivery.add(deliveryId);
  if(received<g.received)g.received=received;
  if(r.raw_item_sha256!==null&&r.raw_item_sha256!==undefined){
   const itemHash=str(r.raw_item_sha256,"RAW_ITEM_SHA");
   if(!SHA.test(itemHash))reject("RAW_ITEM_SHA_SHAPE");
   g.sha.add(itemHash);
  }
  const status=r.resolution_status;
  if(status!=="resolved"&&status!=="quarantined"&&status!==null)
   reject("UNKNOWN_PROVIDER_IDENTITY_RESOLUTION");
  g.sourceStatuses.add(status===null?"UNRESOLVED":status);
  if(status==="resolved"){
   const flightId=r.flight_id===null?null:str(r.flight_id,"CALLBACK_FLIGHT");
   if(flightId===null){g.unresolved=true;continue;}
   if(r.origin_icao!==scope.airportIcao||
      optionalStamp(r.initial_scheduled_gate_out_utc,"WEBHOOK_SCHEDULE")===null||
      stamp(r.initial_scheduled_gate_out_utc,"WEBHOOK_SCHEDULE")<
       stamp(scope.serviceStartUtc,"SERVICE_START")||
      stamp(r.initial_scheduled_gate_out_utc,"WEBHOOK_SCHEDULE")>=
       stamp(scope.serviceEndUtc,"SERVICE_END")){
    g.wrongScope=true;wrongAirportResolved++;continue;
   }
   g.flightIds.add(flightId);
  }else g.unresolved=true;
 }
 const deliveries:P4G5CaptureWebhookFactV39[]=[];
 let conflicts=0,unattributable=0;
 for(const [key,g] of groups){
  const conflict=g.wrongScope||g.sha.size>1||g.flightIds.size>1||
   g.sourceStatuses.size>1;
  if(conflict)conflicts++;
  const resolved=!conflict&&!g.unresolved&&g.flightIds.size===1;
  if(!resolved&&!conflict)unattributable++;
  deliveries.push({
   notificationDigest:hash(scope.reviewedManifestSha256+"|NOTIFICATION|"+key),
   receivedAtUtc:new Date(g.received).toISOString(),
   identityStatus:conflict?"CONFLICT":resolved?"RESOLVED":"UNRESOLVED",
   physicalLegDigest:resolved?hash(scope.reviewedManifestSha256+"|"+[...g.flightIds][0]):null,
   attemptCount:g.seenDelivery.size
  });
 }
 const partition=partitionP4G5IndependentCaptureV39({
  airportIcao:scope.airportIcao,
  reviewedFrozenManifestSha256:scope.reviewedManifestSha256,
  captureWindowStartUtc:scope.captureStartUtc,
  captureWindowEndUtc:scope.captureEndUtc,
  auditAsOfUtc:scope.auditAtUtc,
  population,deliveries
 });
 return {
  schema:P4_G5_BOUND_CAPTURE_READ_SCHEMA_V39,
  status:"V0077_BOUND_SOURCE_PRE_AND_SUBSCRIPTION_CANDIDATES_ONLY" as const,
  exactBoundOriginalReceiptsPresent:9 as const,
  verifiedSourceSlotsPerHorizon:byHorizon,
  provisionalDistinctPhysicalIds:sourceMembers.size,
  unresolvedSourceIdentityRows:unresolvedIdentityRows,
  unknownOrContextSourceRows:invalidRoleRows,
  conflictingOperatingRoles,
  genericScheduledDepartureCandidates:unverifiedSelectedTCandidates,
  retroactivelyWrittenPreExcluded:retrospectivelyWrittenPre,
  invalidPreLineageExcluded:invalidPreLineage,
  webhookUnattributableNotifications:unattributable,
  webhookConflictingNotifications:conflicts,
  webhookWrongAirportResolvedRows:wrongAirportResolved,
  webhookNoStableNotificationIdRows:missingStableNotificationId,
  webhookSubscriptionIdsIndependentOwnerProof:false as const,
  originalHTTPSourceRequestFrameIndependentlyVerified:false as const,
  sourceRightsIndependentlyVerified:false as const,
  actualSelectedTVerified:false as const,actualOnlyWheelsOffVerified:false as const,
  expectedAndObservedFromGenericScheduleAreCandidatesOnly:true as const,
  partition,
  strictGate5Passed:false as const,phase5FreezeAuthorized:false as const,
  phase6Authorized:false as const,
  providerCalls:0 as const,databaseWrites:0 as const
 };
}
