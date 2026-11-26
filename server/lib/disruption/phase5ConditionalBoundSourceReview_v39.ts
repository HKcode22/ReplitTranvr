/** Separate prospective schedule-service review from the actual bound SOURCE.
 * No native PRE permit, production writer, signer, provider GET or policy change.
 * The caller must supply independently authenticated prospective policy/scope;
 * this reader does not authenticate a signature merely from a digest.
 */
import {prepareP5ConditionalFidsServiceRecoveryV39} from "./phase5ConditionalFidsServiceRecovery_v39";
import {P5_STAGE14_BOUND_SOURCE_SQL} from "./phase5V0079SingleBoundFlightPreWriter_v39";
import {P5_E_BATCH_ORIGINAL_SQL,P5_E_V0079_SOURCE_READONLY_LOGIN_V39,type P5EReadOnlyPgPool} from "./phase5AmendmentEOriginalFidsReadonlyCompiler_v39";
import type {P5ActualSourceCandidateScope} from "./phase5ActualSourceNativeFlightCandidateAudit_v39";
type ReviewScope={
 source:P5ActualSourceCandidateScope;protocolSha256:string;ownerProspectiveSeparateTierApproved:true;
 frozenStudyStartUtc:string;policyEffectiveUtc:string;minimumReviewLeadSeconds:number;
 expectedPopulationQueryId:string;expectedResponseSha256:string;expectedDecodedBodySha256:string;
 expectedLocalFrom:string;expectedLocalTo:string;
};
const SHA=/^[a-f0-9]{64}$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const hold=(why:string):never=>{throw Error("HOLD_P5_CONDITIONAL_BOUND_"+why);};
const stamp=(x:unknown)=>{
 const n=x instanceof Date?x.getTime():typeof x==="string"?Date.parse(x):NaN;
 if(!Number.isFinite(n))hold("CLOCK");
 return new Date(n).toISOString();
};
const ms=(x:unknown)=>Date.parse(stamp(x));
export function prepareP5BoundConditionalServiceReview(s:ReviewScope,rows:readonly Record<string,unknown>[],originals:readonly Record<string,unknown>[],clock:Date|string){
 const q=s?.source;
 if(!q||s.ownerProspectiveSeparateTierApproved!==true||![q.manifestSha256,q.queryDigestSha256,q.reviewedReleaseSha256,q.rightsReviewSha256,q.providerContractSha256,q.earlyDrawSha256,s.protocolSha256,s.expectedResponseSha256,s.expectedDecodedBodySha256].every(x=>SHA.test(x??""))||
 !UUID.test(s.expectedPopulationQueryId??"")||!q.plannedRequestUtc||!Number.isSafeInteger(q.runDayIndex)||q.runDayIndex<1||q.runDayIndex>31||
 !["HUB","MID_A","MID_B","REGIONAL"].includes(q.slot)||!["T-24h","T-6h","T-90m"].includes(q.horizon)||
 !/^[A-Z]{4}$/.test(q.airportIcao??"")||!/^\d{1,20}$/.test(q.expectedSourceGithubRunId??"")||
 !s.expectedLocalFrom||!s.expectedLocalTo||rows.length!==1||originals.length!==1)hold("EXACT_SCOPE");
 const o=rows[0],r=originals[0],p=r.raw_payload as Record<string,any>|null;
 if(o.manifest_sha256!==q.manifestSha256||Number(o.run_day_index)!==q.runDayIndex||o.slot_id!==q.slot||o.horizon!==q.horizon||
 o.airport_icao!==q.airportIcao||o.fids_airport_icao!==q.airportIcao||o.state!=="ACTIVE"||
 o.github_run_id!==q.expectedSourceGithubRunId||o.attempt_run_id!==q.expectedSourceGithubRunId||
 o.early_draw_sha256!==q.earlyDrawSha256||o.reviewed_release_sha256!==q.reviewedReleaseSha256||
 o.rights_review_sha256!==q.rightsReviewSha256||o.bound_rights!==q.rightsReviewSha256||r.binding_rights!==q.rightsReviewSha256||
 o.provider_contract_sha256!==q.providerContractSha256||o.original_current!==true||r.raw_expired_at_utc!==null||
 o.population_query_id!==s.expectedPopulationQueryId||r.population_query_id!==s.expectedPopulationQueryId||
 o.original_response_hash!==s.expectedResponseSha256||o.fids_response_hash!==s.expectedResponseSha256||r.stored_response_hash!==s.expectedResponseSha256||
 r.decoded_original_body_sha256!==s.expectedDecodedBodySha256||p?.originalDecodedEntityBodyEvidence?.bodySha256!==s.expectedDecodedBodySha256||
 p?.fidsRequestContract?.openapiSha256!==q.providerContractSha256||p?.fidsRequestContract?.fromLocal!==s.expectedLocalFrom||
 p?.fidsRequestContract?.toLocal!==s.expectedLocalTo)hold("ORIGINAL_BINDING");
 const n=ms(clock),res=ms(o.reserved_at),ret=ms(o.fids_retrieval_utc),persist=ms(o.raw_persisted_at_utc),avail=ms(o.source_available),bound=ms(o.bound_at_utc),exp=ms(o.source_expires_at_utc);
 if(ms(q.plannedRequestUtc)>res||res>ret||ret>persist||persist>avail||avail>bound||bound>n||n>=exp||
 exp>avail+23*3600000||ms(r.raw_persisted_at_utc)!==persist||ms(r.source_expires_at_utc)!==exp)hold("SOURCE_CLOCK");
 // Bound-at (not merely retrieval/available-at) is the earliest possible
 // source eligibility; no historical forecast timestamp is reconstructed.
 return prepareP5ConditionalFidsServiceRecoveryV39(p,{
  protocolSha256:s.protocolSha256,ownerProspectiveSeparateTierApproved:true,
  manifestSha256:q.manifestSha256,runDayIndex:q.runDayIndex,sourceResponseSha256:s.expectedResponseSha256,sourceQueryId:s.expectedPopulationQueryId,
  airportIcao:q.airportIcao,frozenStudyStartUtc:s.frozenStudyStartUtc,policyEffectiveUtc:s.policyEffectiveUtc,
  plannedSourceUtc:q.plannedRequestUtc,sourceAvailableUtc:stamp(o.bound_at_utc),sourceExpiresUtc:stamp(o.source_expires_at_utc),dbObservedUtc:stamp(clock),
  serviceWindowStartUtc:stamp(o.service_window_start_utc),serviceWindowEndUtc:stamp(o.service_window_end_utc),horizon:q.horizon,
  maximumStalenessSeconds:q.maxPopulationStalenessSeconds,minimumReviewLeadSeconds:s.minimumReviewLeadSeconds
 });
}
export async function readP5BoundConditionalServiceReview(pool:P5EReadOnlyPgPool,s:ReviewScope){
 const c=await pool.connect();let began=false;
 try{
  await c.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");began=true;
  await c.query("SET LOCAL statement_timeout='15s'");
  const g=(await c.query("SELECT session_user::text AS login,current_user::text AS actor,current_setting('transaction_read_only') AS ro,NOT pg_is_in_recovery() AS primary")).rows;
  if(g.length!==1||g[0].login!==P5_E_V0079_SOURCE_READONLY_LOGIN_V39||g[0].actor!==P5_E_V0079_SOURCE_READONLY_LOGIN_V39||g[0].ro!=="on"||g[0].primary!==true)hold("ROLE");
  const q=s.source,params=[q.manifestSha256,q.queryDigestSha256];
  const rows=(await c.query(P5_STAGE14_BOUND_SOURCE_SQL,params)).rows;
  if(rows.length!==1||rows[0].population_query_id!==s.expectedPopulationQueryId||ms(rows[0].source_expires_at_utc)<=ms((await c.query("SELECT clock_timestamp() AS at")).rows[0]?.at)+30000)hold("ORIGINAL_SCOPE_OR_EXPIRY");
  // Existing reader SQL plus a fresh retention fence before retrieving raw.
  const sql=P5_E_BATCH_ORIGINAL_SQL.replace("AND r.raw_payload IS NOT NULL","AND b.source_expires_at_utc>clock_timestamp()+interval '30 seconds' AND r.raw_payload IS NOT NULL");
  if(sql===P5_E_BATCH_ORIGINAL_SQL)hold("QUERY_CONTRACT");
  const originals=(await c.query(sql,[...params,s.expectedPopulationQueryId])).rows;
  const z=(await c.query("SELECT clock_timestamp() AS at")).rows;
  if(z.length!==1)hold("CLOCK");
  const report=prepareP5BoundConditionalServiceReview(s,rows,originals,stamp(z[0].at));
  await c.query("COMMIT");began=false;
  return report;
 }finally{if(began)await c.query("ROLLBACK").catch(()=>{});c.release();}
}
