/**
 * Phase4 Gate5: a *single* horizon's 3 V0076/V0077 retained originals and
 * persisted PRE read-back, BEFORE the original 24-hour retention expires.
 *
 * A postflight all-nine-original snapshot is generally impossible with 24h
 * source TTL. Persist only permitted non-Content audit receipts; NEVER copy
 * original provider bodies to GitHub, logs or another long-lived store.
 *
 * Explicitly a PROVISIONAL candidate audit: source-native scheduled T,
 * provider wire/rights, full physical frame, immutable builder and Phase5
 * science release need independent evidence. No paid call and no DB writes.
 */
import {
 P4_G5_BOUND_SOURCE_ROWS_SQL_V39,
 type P4G5BoundReadDbV39
} from "./phase4Gate5BoundSourceCaptureReadonly_v39";
import {
 type P4G5CaptureHorizonV39
} from "./phase4Gate5IndependentCapturePartition_v39";

export const P4_G5_HORIZON_PREEXPIRY_SCHEMA_V39=
 "v39.phase4.gate5-single-horizon-bound-original-preexpiry-v1" as const;
const H=["T-24h","T-6h","T-90m"] as const;
const SHA=/^[a-f0-9]{64}$/;
const RUN=/^\d{5,25}$/;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const LAGS:Record<P4G5CaptureHorizonV39,number>={
 "T-24h":86400000,"T-6h":21600000,"T-90m":5400000
};
export interface P4G5HorizonPreexpiryScopeV39 {
 airportIcao:string;
 serviceStartUtc:string;
 serviceEndUtc:string;
 reviewedManifestSha256:string;
 horizon:P4G5CaptureHorizonV39;
 expectedOwnerGithubRunId:string;
 readAtUtc:string;
}
function hold(x:string):never{
 throw Error("P4_G5_HORIZON_PREEXPIRY_"+x+"_HOLD");
}
function stamp(x:unknown,label:string):number{
 const s=x instanceof Date?x.toISOString():x;
 if(typeof s!=="string"||!UTC.test(s)||
  !Number.isFinite(Date.parse(s))||
  new Date(Date.parse(s)).toISOString()!==s)hold("INVALID_UTC_"+label);
 return Date.parse(s);
}
function row(x:unknown):Record<string,unknown>{
 if(!x||typeof x!=="object"||Array.isArray(x))hold("MALFORMED_DB_ROW");
 return x as Record<string,unknown>;
}
function str(x:unknown,label:string):string{
 if(typeof x!=="string"||x.length<1||x.length>200)
  hold("INVALID_"+label);
 return x;
}
function optionalTime(x:unknown,label:string):number|null{
 return x===null||x===undefined?null:stamp(x,label);
}
function validate(s:P4G5HorizonPreexpiryScopeV39){
 if(!s||!/^[A-Z]{4}$/.test(s.airportIcao)||
   !SHA.test(s.reviewedManifestSha256)||
   !H.includes(s.horizon)||!RUN.test(s.expectedOwnerGithubRunId))
  hold("SCOPE");
 const start=stamp(s.serviceStartUtc,"START");
 const end=stamp(s.serviceEndUtc,"END");
 const audit=stamp(s.readAtUtc,"AUDIT");
 if(end<=start||end-start<10*60000||end-start>4*3600000||
   audit<start-48*3600000||audit>end+2*86400000)
  hold("BOUNDARY");
}
export const P4_G5_HORIZON_PREEXPIRY_SOURCE_SQL_V39=
 P4_G5_BOUND_SOURCE_ROWS_SQL_V39.replace(
  "ORDER BY o.horizon,q.query_index",
  "AND o.horizon=$6 ORDER BY o.horizon,q.query_index"
 );
export const P4_G5_HORIZON_PREEXPIRY_PRE_SQL_V39=[
 "SELECT s.flight_instance_id AS flight_id,s.horizon,",
 "s.prediction_cutoff_utc,s.selected_t_milestone_utc,",
 "s.population_query_id AS query_id,s.fids_response_hash AS response_sha,",
 "s.created_at,s.builder_version",
 "FROM clean.flight_snapshots s",
 "JOIN clean.phase4_g5_fids_original_binding_v39 b",
 "ON b.population_query_id::text=s.population_query_id",
 "AND b.original_response_sha256=s.fids_response_hash",
 "JOIN clean.phase4_g5_fids_allowed_query_v39 q",
 "ON q.query_digest=b.query_digest",
 "JOIN clean.phase4_g5_fids_physical_owner_v39 o",
 "ON o.owner_digest=q.owner_digest",
 "AND o.manifest_sha256=b.manifest_sha256",
 "WHERE b.manifest_sha256=$1 AND o.horizon=$2",
 "AND o.github_run_id=$3",
 "AND b.source_use_expires_at_utc>$4::timestamptz",
 "AND s.prediction_state='PRE_DEPARTURE'",
 "AND s.horizon=$2 AND s.created_at<=$4::timestamptz",
 "ORDER BY s.flight_instance_id,s.prediction_cutoff_utc",
 "LIMIT 30002"
].join(" ");
type Member={
 originalId:string;sha:string;available:number;role:string;
 primary:boolean;genericSchedule:number|null;canonicalId:string
};
export async function auditP4G5HorizonPreexpiryV39(
 db:P4G5BoundReadDbV39,
 scope:P4G5HorizonPreexpiryScopeV39
){
 validate(scope);
 const args=[scope.reviewedManifestSha256,scope.airportIcao,
    scope.serviceStartUtc,scope.serviceEndUtc,scope.readAtUtc,scope.horizon];
 const response=await db.query(P4_G5_HORIZON_PREEXPIRY_SOURCE_SQL_V39,args);
 if(!response||!Array.isArray(response.rows)||response.rows.length>30000)
  hold("SOURCE_READ_LIMIT");
 const originals=new Map<string,{sha:string;queryDigest:string;sourceAt:number}>();
 const flights=new Map<string,Member[]>();
 let missingCanonicalIdentityRows=0,marketingRows=0,ambiguousRows=0,
     nonPrimaryContextRows=0,sourceMissingScheduleRows=0;
 for(const x of response.rows){
  const r=row(x);
  const queryId=str(r.query_id,"QUERY_ID");
  const sha=str(r.original_sha,"ORIGINAL_HASH");
  const qdigest=str(r.query_digest,"QUERY_DIGEST");
  if(!SHA.test(sha)||!SHA.test(qdigest)||r.response_sha!==sha||
    r.horizon!==scope.horizon||
    r.github_run_id!==scope.expectedOwnerGithubRunId||
    r.source_airport_icao!==scope.airportIcao||
    stamp(r.service_window_start_utc,"Q_START")!==stamp(scope.serviceStartUtc,"START")||
    stamp(r.service_window_end_utc,"Q_END")!==stamp(scope.serviceEndUtc,"END"))
   hold("SOURCE_OWNER_HASH_SCOPE");
  const source=stamp(r.original_available_at,"ORIGINAL");
  if(source<stamp(r.committed_at_utc,"COMMIT")||
     source>stamp(scope.readAtUtc,"READ")||
     stamp(r.source_use_expires_at_utc,"EXPIRY")<=
      stamp(scope.readAtUtc,"READ"))
   hold("SOURCE_COMMIT_OR_EXPIRY");
  const old=originals.get(queryId);
  if(old&&(old.sha!==sha||old.queryDigest!==qdigest||old.sourceAt!==source))
   hold("SOURCE_QUERY_CHANGED");
  originals.set(queryId,{sha,queryDigest:qdigest,sourceAt:source});
  if(r.flight_id===null||r.flight_id===undefined){
   if(r.analytic_id!==null&&r.analytic_id!==undefined)
    missingCanonicalIdentityRows++;
   continue;
  }
  const canonicalId=str(r.flight_id,"FLIGHT_ID");
  const available=optionalTime(r.member_available_at,"MEMBER");
  if(available===null||available<source||
     r.member_sha!==sha||
     r.provider_content_expired_at_utc!==null)
   hold("NORMALIZED_MEMBER_SOURCE_PARITY");
  const primary=r.population_role==="requested_airport_primary";
  if(!primary)nonPrimaryContextRows++;
  const role=r.scope_classification==="confirmed_core"&&
       r.codeshare_resolution_status==="confirmed_operating_leg"?
       "CONFIRMED_OPERATING_LEG":
       r.codeshare_resolution_status==="resolved_marketing"?
       "MARKETING_CODESHARE":"UNKNOWN";
  if(role==="MARKETING_CODESHARE")marketingRows++;
  if(role==="UNKNOWN")ambiguousRows++;
  const genericSchedule=optionalTime(r.dep_scheduled_utc,"SCHEDULE");
  if(primary&&genericSchedule===null)sourceMissingScheduleRows++;
  flights.set(canonicalId,[...(flights.get(canonicalId)??[]),{
   originalId:queryId,sha,available:Math.max(source,available),
   role,primary,genericSchedule,canonicalId
  }]);
 }
 const digestCount=new Set([...originals.values()].map(x=>x.queryDigest)).size;
 if(originals.size!==3||digestCount!==3)return {
  schema:P4_G5_HORIZON_PREEXPIRY_SCHEMA_V39,
  status:"HOLD_FROZEN_HORIZON_SOURCE_NOT_ALL_THREE_RETAINED" as const,
  horizon:scope.horizon,
  observedBoundOriginals:originals.size,
  distinctQuerySlots: digestCount,
  qualifyingSourceMemberCandidates:null,
  expectedPreCandidates:null,verifiedCandidatePrePersisted:null,
  missingCanonicalIdentityRows,
  previewSourceRowsNeverOriginalFlightDenominator:true as const,
  sourceRetentionRightsIndependentlyVerified:false as const,
  selectedTAndActualOnlyRunwayIndependentlyVerified:false as const,
  sourceOriginalHTTPWireAttested:false as const,
  githubOwnerAndManifestIndependentlyPinned:false as const,
  scientificGate5Passed:false as const,phase5FreezeAuthorized:false as const,
  phase6Authorized:false as const,providerCalls:0 as const,databaseWrites:0 as const
 };
 const pres=await db.query(P4_G5_HORIZON_PREEXPIRY_PRE_SQL_V39,[
  scope.reviewedManifestSha256,scope.horizon,scope.expectedOwnerGithubRunId,
  scope.readAtUtc
 ]);
 if(!pres||!Array.isArray(pres.rows)||pres.rows.length>30000)
  hold("PRE_READ_LIMIT");
 const preByFlight=new Map<string,Record<string,unknown>[]>();
 for(const x of pres.rows){
  const r=row(x);
  if(r.horizon!==scope.horizon)hold("PRE_WRONG_HORIZON");
  const id=str(r.flight_id,"PRE_ID");
  preByFlight.set(id,[...(preByFlight.get(id)??[]),r]);
 }
 let sourceScopedPhysicalCandidates=0,operatingCandidates=0,
     eligibleCutoffCandidates=0,prePresent=0,
     lateOriginalForCutoff=0,notYetDue=0,
     missingGenericT=0,identityScopeAmbiguous=0,
     invalidOrPosthocPRE=0,extraOrWrongPre=0;
 const audit=stamp(scope.readAtUtc,"READ");
 for(const [id,all] of flights){
  const primary=all.filter(x=>x.primary);
  if(primary.length===0)continue;
  sourceScopedPhysicalCandidates++;
  primary.sort((a,b)=>a.available-b.available||a.originalId.localeCompare(b.originalId));
  const roles=new Set(primary.map(x=>x.role));
  const role=roles.size===1?[...roles][0]:"UNKNOWN";
  if(role!=="CONFIRMED_OPERATING_LEG"){
   identityScopeAmbiguous++;continue;
  }
  operatingCandidates++;
  const firstGenericSchedule=primary.find(x=>x.genericSchedule!==null)?.genericSchedule??null;
  if(firstGenericSchedule===null){missingGenericT++;continue;}
  const cutoff=firstGenericSchedule-LAGS[scope.horizon];
  if(cutoff>audit){notYetDue++;continue;}
  const seenAsOf=primary.filter(x=>x.available<=cutoff);
  if(seenAsOf.length===0){lateOriginalForCutoff++;continue;}
  eligibleCutoffCandidates++;
  const snapshots=preByFlight.get(id)??[];
  let accepted=0;
  for(const p of snapshots){
   const snapshotCutoff=stamp(p.prediction_cutoff_utc,"PRE_CUTOFF");
   const selectedT=optionalTime(p.selected_t_milestone_utc,"PRE_GENERIC_T");
   const created=stamp(p.created_at,"PRE_CREATED");
   const queryId=str(p.query_id,"PRE_QUERY");
   const source=originals.get(queryId);
   if(snapshotCutoff!==cutoff||selectedT!==firstGenericSchedule||
       created>snapshotCutoff||created>audit||!source||
       p.response_sha!==source.sha||
       !seenAsOf.some(x=>x.originalId===queryId&&x.sha===source.sha)){
    invalidOrPosthocPRE++;continue;
   }
   accepted++;
  }
  if(accepted>1)hold("MULTIPLE_QUALIFIED_PRE_PER_FLIGHT_HORIZON");
  if(accepted===1)prePresent++;
 }
 for(const [id,rows] of preByFlight){
  if(!flights.has(id))extraOrWrongPre+=rows.length;
 }
 if(prePresent>eligibleCutoffCandidates)hold("PRE_EXCEEDS_EXPECTED");
 const rate=eligibleCutoffCandidates===0?null:
   prePresent/eligibleCutoffCandidates;
 // Counts are deliberately provisional based on *generic* departure schedule:
 // no external semantic selected-T certificate or legally audited originals.
 return {
  schema:P4_G5_HORIZON_PREEXPIRY_SCHEMA_V39,
  status:"V0077_BOUND_THREE_ORIGINALS_PREEXPIRY_CANDIDATE_ONLY" as const,
  airportIcao:scope.airportIcao,
  horizon:scope.horizon,
  reviewedManifestSha256:scope.reviewedManifestSha256,
  reviewedGithubOwnerRunId:scope.expectedOwnerGithubRunId,
  actualReadAtUtc:scope.readAtUtc,
  observedBoundOriginals:3 as const,distinctQuerySlots:3 as const,
  sourceScopedPhysicalCandidates,operatingCandidates,
  eligibleCutoffCandidates,prePresent,
  missingPreCandidateCount:eligibleCutoffCandidates-prePresent,
  candidatePreCompleteness:rate,
  missingDenominatorReason:eligibleCutoffCandidates===0?
    "ZERO_INDEPENDENTLY_SOURCE_QUALIFIED_CANDIDATES":null,
  lateOriginalForCutoff,notYetDue,
  missingGenericT,identityScopeAmbiguous,
  missingCanonicalIdentityRows,marketingRows,ambiguousRows,
  nonPrimaryContextRows,sourceMissingScheduleRows,
  invalidOrPosthocPRE,extraOrWrongPre,
  independentlyCertifiedOriginalRequestFrame:false as const,
  independentlyVerifiedSourceRights:false as const,
  nativeSelectedTMilestoneIndependentlyVerified:false as const,
  actualOnlyWheelsOffLabelsVerified:false as const,
  realPostflightWebhookInOutUnresolvedAudited:false as const,
  sourceObservationsMustNotBeBackfilledAfterExpiry:true as const,
  scientistPassNotInferableFromProvisionalRates:true as const,
  scientificGate5Passed:false as const,
  phase5FreezeAuthorized:false as const,phase6Authorized:false as const,
  providerCalls:0 as const,databaseWrites:0 as const
 };
}
