/** Phase6: actual durable V0083 POST original -> matched PRE outcome
 * observability. No second GET, label training approval, new storage,
 * migration, or provider-specific actual gate-out assumption.
 *
 * Use the original PRE lineage query and decoded-body verifier. A flight
 * missing in POST is not cancelled; revisedTime/runwayTime may be estimates.
 * Report only aggregate counts. Missing/expired PRE is not a negative outcome.
 */
import type {Pool} from "pg";
import {verifyStoredDecodedFidsBodyV39} from "./phase4Gate5DecodedFidsReadback_v39";
import {verifyCanonicalFidsEnvelopeV39} from "./fidsEnvelopeCanonical_v39";
import {inspectP4OnePaidNonretainedFidsV39} from "./phase4Gate5OnePaidNonretainedSourceInspection_v39";
import {assessP5AmendmentEGateOutDelayCandidate,type P5EGateOutFirstCycleInput} from "./phase5AmendmentEGateOutDelayLabel_v39";
import {P5_FUTURE_POST_ACTUAL_PRE_SQL,verifyP5FuturePostReviewedFrame,type P5ReviewedFuturePostOneGet} from "./phase5V0083FuturePostOriginalDb_v39";
import {P5_STAGE28_GROUPS} from "./phase5Stage28DedicatedRolePool_v39";
const SHA=/^[a-f0-9]{64}$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const offsets={"T-24h":86400000,"T-6h":21600000,"T-90m":5400000} as const;
type Horizon=keyof typeof offsets;
const hold=(s:string):never=>{throw Error("HOLD_P6_ACTUAL_POST_OBSERVABILITY_"+s);};
const obj=(x:unknown):Record<string,unknown>=>x&&typeof x==="object"&&!Array.isArray(x)?x as Record<string,unknown>:{};
const date=(x:unknown):number|null=>{
 if(!(x instanceof Date)&&!(typeof x==="string"&&/\d{4}-\d\d-\d\d[T ]\d\d:\d\d/.test(x)&&/(?:Z|[+-]\d\d:\d\d)$/.test(x)))return null;
 const n=x instanceof Date?x.getTime():Date.parse(x);return Number.isFinite(n)?n:null;
};
const reqDate=(x:unknown):number=>{const n=date(x);return n===null?hold("INVALID_DATABASE_CLOCK"):n;};
const iso=(n:number)=>new Date(n).toISOString();
const id=(x:unknown):x is string=>typeof x==="string"&&x.length>=3&&x.length<=180&&!x.startsWith("fidsrec:")&&![...x].some(c=>c.charCodeAt(0)<32);
const number=(x:unknown)=>{
 const m=typeof x==="string"?x.trim().toUpperCase().match(/^([A-Z0-9]{2})[ \t]*([0-9]{1,4})$/):null;
 return m?m[1]+(m[2].replace(/^0+/,"")||"0"):null;
};
const ico=(x:unknown):x is string=>typeof x==="string"&&/^[A-Z0-9]{4}$/.test(x);
const atField=(x:unknown)=>date(obj(x).utc);
/** Same source, PRE cutoff, confirmed physical member and exact frame joins
 * as existing V0083, expanded to the whole original UTC service partition.
 * Metadata only; no read of PRE raw bodies or expired source content. */
export const P6_POST_PARTITION_PRE_SQL=P5_FUTURE_POST_ACTUAL_PRE_SQL
 .replace("SELECT s.id::text AS snapshot_id","SELECT s.flight_instance_id,s.id::text AS snapshot_id,fp.provider_record_key,fp.flight_number,fp.dep_airport_icao,fp.arr_airport_icao,fp.dep_scheduled_utc,fp.available_at AS member_available_at")
 .replace("s.flight_instance_id=$4","s.selected_t_milestone_utc >= $4::timestamptz AND s.selected_t_milestone_utc < $6::timestamptz")
 +" AND q.state='ACTIVE' AND fp.scope_classification='confirmed_core' AND fp.query_direction='Departure' AND q.rights_review_sha256=$7 AND b.rights_review_sha256=$7 "+
 " AND q.service_window_start_utc=$4::timestamptz AND q.service_window_end_utc=$6::timestamptz "+
 " AND b.source_expires_at_utc>$8::timestamptz AND r.raw_expired_at_utc IS NULL AND r.raw_payload IS NOT NULL "+
 " ORDER BY s.flight_instance_id,s.horizon,s.id LIMIT 7501";
export interface P6PostCommittedScope{
 packet:P5ReviewedFuturePostOneGet;
 populationQueryId:string;responseSha256:string;normalizedMembers:number;
 reservationSha256:string;
}
export interface P6PostOriginalReadback{
 population_query_id:string;response_hash:string;source_airport_icao:string;
 query_direction:string;service_window_start_utc:unknown;service_window_end_utc:unknown;
 from_local:string;to_local:string;airport_iana_timezone:string;openapi_sha256:string;
 fids_retrieval_utc:unknown;available_at:unknown;raw_persisted_at_utc:unknown;
 raw_expired_at_utc:unknown;raw_payload:unknown;members:number;
}
type Row=Record<string,unknown>;
const empty=()=>({retainedCutoffSafePre:0,matchedNativePost:0,missingNativeId:0,postAbsent:0,ambiguousIdentity:0,
 reportedCancelled:0,reportedRevisedTime:0,reportedRunwayTime:0,changedGenericSchedule:0,duplicatePre:0,
 labelEvidenceUnverified:0,actualGateOutNumericCandidates:0,
 idlessExactReportedService:0,idlessDepartureQueryContextService:0,idlessServiceAmbiguous:0,idlessServiceNotObserved:0,
 idlessServiceReportedRevised:0,idlessServiceReportedRunway:0,idlessServiceReportedCancelled:0});
/** Existing raw-body integrity, exact V0083 observation scope, then native
 * ID + operator + explicit route and number match. Never substitute latest
 * POST schedule for frozen PRE native T. No supplied truth booleans. */
export function auditP6ActualPostOutcomeObservability(s:P6PostCommittedScope,row:P6PostOriginalReadback,pre:readonly Row[],clockUtc:string){
 const p=s?.packet,f=verifyP5FuturePostReviewedFrame(p),now=reqDate(clockUtc);
 if(!UUID.test(s.populationQueryId??"")||!SHA.test(s.responseSha256??"")||s.reservationSha256!==f.reservedSha256||
    !Number.isSafeInteger(s.normalizedMembers)||s.normalizedMembers<0||s.normalizedMembers>2500||
    !row||row.population_query_id!==s.populationQueryId||row.response_hash!==s.responseSha256||
    row.source_airport_icao!==p.airportIcao||row.query_direction!=="Departure"||
    reqDate(row.service_window_start_utc)!==f.from||reqDate(row.service_window_end_utc)!==f.to||
    row.from_local!==p.fromLocal||row.to_local!==p.toLocal||row.airport_iana_timezone!==p.airportIanaTimezone||
    row.openapi_sha256!==p.reviewedProviderContractSha256||row.raw_expired_at_utc!==null||
    Number(row.members)!==s.normalizedMembers||!Array.isArray(pre)||pre.length>7500)hold("COMMITTED_ORIGINAL_OR_SCOPE_DRIFT");
 const raw=obj(row.raw_payload),contract=obj(raw.fidsRequestContract),available=reqDate(row.available_at),retrieved=reqDate(row.fids_retrieval_utc),persisted=reqDate(row.raw_persisted_at_utc);
 if(retrieved<f.start||retrieved>available||persisted<retrieved||persisted>available||available>now||
    now-available>600000||reqDate(raw.fetchedAtUtc)!==retrieved||raw.phase5PostReservationSha256!==s.reservationSha256||
    raw.phase5PostPurpose!=="FUTURE_POST_SOURCE_OBSERVATION_NOT_AN_ACTUAL_PHYSICAL_LABEL"||
    contract.phase5PostReservationSha256!==s.reservationSha256||contract.direction!=="Departure"||contract.airportIcao!==p.airportIcao||
    contract.fromLocal!==p.fromLocal||contract.toLocal!==p.toLocal||contract.openapiSha256!==p.reviewedProviderContractSha256||
    verifyStoredDecodedFidsBodyV39({payload:raw,persisted_response_hash:s.responseSha256})!=="verified"||
    verifyCanonicalFidsEnvelopeV39(raw)!=="verified"||!Array.isArray(raw.departures)||raw.departures.length>900)
  hold("POST_BODY_RECEIPT_OR_FRESHNESS_DRIFT");
 const byId=new Map<string,Row[]>(),movements=(raw.departures as unknown[]).map(obj);
 const fieldShape=inspectP4OnePaidNonretainedFidsV39({departures:movements});
 for(const m of movements){const k=m.id;if(id(k)){const a=byId.get(k)??[];a.push(m);byId.set(k,a);}}
 const counts:Record<Horizon,ReturnType<typeof empty>>={"T-24h":empty(),"T-6h":empty(),"T-90m":empty()};
 const grouped=new Map<string,Row[]>();let invalidPre=0;
 for(const x of pre){
  const h=x.horizon as Horizon,t=date(x.selected_t_milestone_utc),cutoff=date(x.prediction_cutoff_utc),
   issued=date(x.created_at),source=date(x.original_available_at),expires=date(x.source_expires_at_utc),member=date(x.member_available_at);
  if(!Object.hasOwn(offsets,h)||!/^leg:[A-Za-z0-9:|._-]{5,196}$/.test(String(x.flight_instance_id??""))||
     !/^\d+$/.test(String(x.snapshot_id??""))||typeof x.query_digest!=="string"||!SHA.test(x.query_digest)||
     t===null||t<f.from||t>=f.to||cutoff===null||t-cutoff!==offsets[h]||
     issued===null||source===null||member===null||expires===null||expires<=now||
     source>member||member>issued||issued>cutoff||issued>=expires||
     !SHA.test(String(x.fids_response_hash??""))||x.fids_response_hash!==x.binding_response_hash||
     x.dep_airport_icao!==p.airportIcao||date(x.dep_scheduled_utc)!==t){invalidPre++;continue;}
  const key=x.flight_instance_id+"|"+h;
  const a=grouped.get(key)??[];a.push(x);grouped.set(key,a);
 }
 const uniqueRetainedFlights=new Set<string>();const privateDecisions: {draft:P5EGateOutFirstCycleInput;postResponseSha256:string;postDecodedBodySha256:string;postMatch:"EXACT_REPORTED_NATIVE_ID_ROUTE_NUMBER_NOT_INDEPENDENT_PHYSICAL_CERTIFICATION";reportedRevisedUtc:string|null;reportedRunwayUtc:string|null;reportedCancellation:boolean}[]=[];
 const bodySha=String(obj(raw.originalDecodedEntityBodyEvidence).bodySha256);
 // The public FlightContract does not promise a stable id. Report a separate
 // diagnostic for ID-less exact scheduled services; never invent an id or
 // replace the positive-native-id evidence tier. Retime cannot qualify.
 const serviceKey=(num:unknown,dest:unknown,t:number|null)=>{
  const n=number(num);return n&&ico(dest)&&t!==null?JSON.stringify([p.airportIcao,n,dest,t]):null;
 };
 const serviceRows=new Map<string,Row[]>(),servicePreIds=new Map<string,Set<string>>();
 for(const m of movements){
  const dep=obj(m.departure),arr=obj(m.arrival),origin=obj(dep.airport).icao;
  // An explicitly conflicting airport is never repaired by query context.
  if(origin!==undefined&&origin!==null&&origin!==p.airportIcao)continue;
  const k=serviceKey(m.number,obj(arr.airport).icao,atField(dep.scheduledTime));
  if(k){const a=serviceRows.get(k)??[];a.push(m);serviceRows.set(k,a);}
 }
 for(const a of grouped.values())for(const x of a){
  const k=serviceKey(x.flight_number,x.arr_airport_icao,date(x.selected_t_milestone_utc));
  if(k){const ids=servicePreIds.get(k)??new Set<string>();ids.add(String(x.flight_instance_id));servicePreIds.set(k,ids);}
 }
 function observeIdlessService(x:Row,c:ReturnType<typeof empty>){
  const k=serviceKey(x.flight_number,x.arr_airport_icao,date(x.selected_t_milestone_utc));
  if(!k){c.idlessServiceNotObserved++;return;}
  if(servicePreIds.get(k)?.size!==1){c.idlessServiceAmbiguous++;return;}
  const hits=serviceRows.get(k)??[];
  if(hits.length===0){c.idlessServiceNotObserved++;return;}
  if(hits.length!==1||!["IsOperator",1].includes(hits[0].codeshareStatus as string|number)){
   c.idlessServiceAmbiguous++;return;
  }
  const m=hits[0],dep=obj(m.departure),origin=obj(dep.airport).icao;
  if(origin===p.airportIcao)c.idlessExactReportedService++;
  else c.idlessDepartureQueryContextService++;
  if(atField(dep.revisedTime)!==null)c.idlessServiceReportedRevised++;
  if(atField(dep.runwayTime)!==null)c.idlessServiceReportedRunway++;
  if(m.status==="Canceled"||m.status===10)c.idlessServiceReportedCancelled++;
 }
 const preIdsByProvider=new Map<string,Set<string>>();
 for(const a of grouped.values())for(const x of a){
  if(!id(x.provider_record_key))continue;
  const seen=preIdsByProvider.get(x.provider_record_key)??new Set<string>();
  seen.add(String(x.flight_instance_id));preIdsByProvider.set(x.provider_record_key,seen);
 }
 for(const a of grouped.values()){
  const x=a[0],h=x.horizon as Horizon,c=counts[h];c.retainedCutoffSafePre++;
  uniqueRetainedFlights.add(String(x.flight_instance_id));
  if(a.length!==1){c.duplicatePre++;continue;}
  if(!id(x.provider_record_key)){c.missingNativeId++;observeIdlessService(x,c);continue;}
  if(preIdsByProvider.get(x.provider_record_key)?.size!==1){c.ambiguousIdentity++;continue;}
  const matches=byId.get(x.provider_record_key)??[];
  if(!matches.length){c.postAbsent++;continue;}
  if(matches.length!==1){c.ambiguousIdentity++;continue;}
  const m=matches[0],dep=obj(m.departure),arr=obj(m.arrival);
  const origin=obj(dep.airport).icao,dest=obj(arr.airport).icao;
  if(!["IsOperator",1].includes(m.codeshareStatus as string|number)||origin!==p.airportIcao||
     !ico(x.arr_airport_icao)||dest!==x.arr_airport_icao||!number(m.number)||number(m.number)!==number(x.flight_number)){
    c.ambiguousIdentity++;continue;
  }
  const t=reqDate(x.selected_t_milestone_utc),scheduled=atField(dep.scheduledTime),revised=atField(dep.revisedTime),runway=atField(dep.runwayTime);
  // Same positive native identifier plus exact route/number may still
  // refer to a different service if the reported schedule is far away.
  if(scheduled===null||Math.abs(scheduled-t)>86400000){c.ambiguousIdentity++;continue;}
  c.matchedNativePost++;
  if(scheduled!==t)c.changedGenericSchedule++;
  const cancellation=m.status==="Canceled"||m.status===10;
  if(cancellation)c.reportedCancelled++;
  if(revised!==null)c.reportedRevisedTime++;
  if(runway!==null)c.reportedRunwayTime++;
  const draft:P5EGateOutFirstCycleInput={schema:"v39.phase5.amendment-e-gateout-first-cycle-candidate.v1",
   frozenSourceOriginalSha256:String(x.fids_response_hash),flightInstanceId:String(x.flight_instance_id),horizon:h,
   selectedNativeTUtc:iso(t),preIssuedAtUtc:iso(reqDate(x.created_at)),originalSourceAvailableAtUtc:iso(reqDate(x.original_available_at)),
   operatingLegIdentityExternallyVerified:false,
   scheduled:{utc:iso(t),milestone:"GENERAL_SCHEDULED_DEPARTURE",externallyVerifiedGateOutMeaning:false,evidenceSha256:null},
   outcome:{operation:"UNKNOWN",event:"NO_EVENT",actualUtc:null,firstAvailableAtUtc:null,externallyVerifiedActualOnly:false,evidenceSha256:null,recoveryGraceElapsed:false}};
  const assessed=assessP5AmendmentEGateOutDelayCandidate(draft);
  if(assessed.hasNumericalCandidate||assessed.candidateDelayMinutes!==null)hold("UNATTESTED_GATE_OUT_SHOULD_NEVER_BE_NUMERIC");
  c.labelEvidenceUnverified++;
  privateDecisions.push({draft,postResponseSha256:s.responseSha256,postDecodedBodySha256:bodySha,
   postMatch:"EXACT_REPORTED_NATIVE_ID_ROUTE_NUMBER_NOT_INDEPENDENT_PHYSICAL_CERTIFICATION",
   reportedRevisedUtc:revised===null?null:iso(revised),reportedRunwayUtc:runway===null?null:iso(runway),reportedCancellation:cancellation});
 }
 const out={schema:"v39.phase6.actual-post-outcome-observability.v1",status:"COMMITTED_POST_MATCHED_PRE_FIELD_OBSERVABILITY_NOT_ACTUAL_LABEL",
  preScope:"CURRENTLY_RETAINED_PRE_IN_EXACT_PHYSICAL_SERVICE_PARTITION",normalizedPostMembers:s.normalizedMembers,
  originalPostDepartureRows:fieldShape.observedDepartureRecords,postOperatorReportedRows:fieldShape.providerOperatorTaggedObservations,
  postGenericScheduledRows:fieldShape.scheduledTimeFieldPresent,postRevisedRows:fieldShape.revisedTimeFieldPresent,
  postRunwayRows:fieldShape.runwayTimeFieldPresent,invalidPreRows:invalidPre,uniqueRetainedPreFlights:uniqueRetainedFlights.size,
  byHorizon:counts,idlessServiceEvidenceTier:"CONDITIONAL_EXACT_REPORTED_SCHEDULE_ROUTE_NUMBER_ONLY_NOT_PHYSICAL_LEG",
  actualGateOutNumericCandidates:0,fullStudyDenominatorCertified:false,
  confirmedCancellationLabels:0,physicalGateOutLabels:0,physicalRunwayLabels:0,
  retainedEvidenceOnly:true,providerCalls:0,databaseWrites:0,phase6PaidGo:false};
 return Object.freeze(Object.defineProperty(out,"privateDecisions",{value:Object.freeze(privateDecisions),enumerable:false})) as typeof out&{readonly privateDecisions:typeof privateDecisions};
}
/** Fresh restricted DB read immediately after original+members COMMIT.
 * No logging raw bytes or private decisions. Failure is an audit failure
 * AFTER confirmed capture, never permission to repeat a paid GET. */
export async function readP6CommittedPostOutcomeObservability(pool:Pick<Pool,"connect">,s:P6PostCommittedScope){
 const f=verifyP5FuturePostReviewedFrame(s.packet);
 if(s.reservationSha256!==f.reservedSha256||!UUID.test(s.populationQueryId??"")||!SHA.test(s.responseSha256??""))
  hold("UNBOUND_POST_READ");
 const c=await pool.connect();let tx=false;
 try{
  await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");tx=true;
  await c.query("SET LOCAL statement_timeout='12000ms'");
  const q=await c.query("SELECT current_user AS role,session_user AS login,current_database() AS db,"+
   "current_setting('transaction_read_only') AS ro,current_setting('server_version_num')::int AS version,pg_is_in_recovery() AS replica,clock_timestamp() AS now");
  const w=q.rows[0];
  if(q.rowCount!==1||w?.role!==P5_STAGE28_GROUPS.source||w.login!=="phase5_p5_source_login_20261108"||w.db!=="neondb"||
     w.ro!=="on"||Number(w.version)<160000||Number(w.version)>=170000||w.replica!==false)hold("NOT_RESTRICTED_SOURCE_READONLY");
  const clock=iso(reqDate(w.now));
  const post=await c.query("SELECT r.population_query_id::text,r.response_hash,r.source_airport_icao,r.query_direction,"+
   "r.service_window_start_utc,r.service_window_end_utc,r.from_local,r.to_local,r.airport_iana_timezone,r.openapi_sha256,"+
   "r.fids_retrieval_utc,r.available_at,r.raw_persisted_at_utc,r.raw_expired_at_utc,r.raw_payload,"+
   "(SELECT count(*)::int FROM clean.flight_population fp WHERE fp.population_query_id=r.population_query_id AND fp.batch_id=$2) AS members "+
   "FROM clean.fids_query_response r WHERE r.population_query_id=$1::uuid AND r.response_hash=$3 "+
   "AND r.raw_expired_at_utc IS NULL AND r.raw_payload IS NOT NULL AND r.available_at<=$4::timestamptz "+
   "AND r.available_at>=$4::timestamptz-interval '10 minutes' AND r.raw_persisted_at_utc>=$4::timestamptz-interval '10 minutes' "+
   "AND r.raw_payload->>'phase5PostReservationSha256'=$2 LIMIT 2",[s.populationQueryId,s.reservationSha256,s.responseSha256,clock]);
  if(post.rowCount!==1)hold("EXACT_FRESH_COMMITTED_POST_NOT_RETAINED");
  const p=s.packet,pre=await c.query(P6_POST_PARTITION_PRE_SQL,[p.manifestSha256,p.runDayIndex,p.airportIcao,p.plannedSourceFromUtc,
   p.reviewedFrameSha256,p.plannedSourceToUtc,p.reviewedSourceRightsSha256,clock]);
  if(pre.rowCount!==pre.rows.length||pre.rows.length>7500)hold("PRE_PARTITION_BOUND_EXCEEDED");
  const out=auditP6ActualPostOutcomeObservability(s,post.rows[0],pre.rows,clock);
  await c.query("ROLLBACK");tx=false;return out;
 }finally{if(tx)await c.query("ROLLBACK").catch(()=>{});c.release();}
}
