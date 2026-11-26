/** Separate prospective schedule-service review from the actual bound SOURCE.
 * No native PRE permit, production writer, signer, provider GET or policy change.
 * The caller must supply independently authenticated prospective policy/scope;
 * this reader does not authenticate a signature merely from a digest.
 */
import {prepareP5ConditionalFidsServiceRecoveryV39} from "./phase5ConditionalFidsServiceRecovery_v39";
import {P5_STAGE28_GROUPS} from "./phase5Stage28DedicatedRolePool_v39";
import {P5_STAGE14_BOUND_SOURCE_SQL} from "./phase5V0079SingleBoundFlightPreWriter_v39";
import {P5_E_BATCH_ORIGINAL_SQL,P5_E_V0079_SOURCE_READONLY_LOGIN_V39,type P5EReadOnlyPgPool} from "./phase5AmendmentEOriginalFidsReadonlyCompiler_v39";
import {P5_ACTUAL_SOURCE_ALL_MEMBERS_READONLY_SQL,type P5ActualSourceCandidateScope} from "./phase5ActualSourceNativeFlightCandidateAudit_v39";
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
  plannedSourceUtc:stamp(q.plannedRequestUtc),sourceAvailableUtc:stamp(o.bound_at_utc),sourceExpiresUtc:stamp(o.source_expires_at_utc),dbObservedUtc:stamp(clock),
  serviceWindowStartUtc:stamp(o.service_window_start_utc),serviceWindowEndUtc:stamp(o.service_window_end_utc),horizon:q.horizon,
  maximumStalenessSeconds:q.maxPopulationStalenessSeconds,minimumReviewLeadSeconds:s.minimumReviewLeadSeconds
 });
}
/** Existing Stage14 writer accepts exactly these G5A fields. This
 * does not fabricate a signed permit or an issued PRE. */
export function matchP5ConditionalStage14Members(
 s:ReviewScope,report:ReturnType<typeof prepareP5BoundConditionalServiceReview>,
 members:readonly Record<string,unknown>[],expectedCount:number,dbClock:string){
 if(!Number.isSafeInteger(expectedCount)||expectedCount<0||expectedCount>2500||members.length!==expectedCount)hold("MEMBER_COUNT");
 const by=new Map<string,Record<string,unknown>[]>();
 for(const m of members){
  if(m.population_query_id!==s.expectedPopulationQueryId||m.response_hash!==s.expectedResponseSha256||m.provider_content_expired_at_utc!==null||
   typeof m.population_member_id!=="string"||!m.population_member_id)hold("MEMBER_CUSTODY");
  const key=String(m.analytic_identity_id??"");
  by.set(key,[...(by.get(key)??[]),m]);
 }
 const matched=[];
 let missingOrAmbiguous=0;
 for(const candidate of report.privateCandidates){
  const id=candidate.stage14ConditionalFlightInstanceId;
  if(id===null){missingOrAmbiguous++;continue;}
  const rows=by.get(id)??[];
  if(rows.length!==1){missingOrAmbiguous++;continue;}
  const m=rows[0];
  if(m.canonical_flight_instance_id!==id||m.source_airport_icao!==s.source.airportIcao||
    m.dep_airport_icao!==s.source.airportIcao||m.arr_airport_icao!==candidate.destinationIcao||
    m.flight_number!==candidate.operatorFlightNumber||m.scope_classification!=="unknown"||
    m.codeshare_resolution_status!=="g5a_conditional_operator_composite_no_native_id"||
    m.source_type!=="fids"||m.population_role!=="requested_airport_primary"||m.query_direction!=="Departure"||
    ms(m.dep_scheduled_utc)!==ms(candidate.selectedReportedDepartureUtc)||
    ms(m.available_at)>ms(dbClock)||ms(m.available_at)>ms(candidate.ownCutoffUtc)){
   missingOrAmbiguous++;continue;
  }
  matched.push(Object.freeze({flightInstanceId:id,populationMemberId:String(m.population_member_id),
   expectedSourcePopulationQueryId:s.expectedPopulationQueryId,expectedSourceResponseSha256:s.expectedResponseSha256,
   identityEvidenceTier:"CONDITIONAL_QUERY_FILTERED_SERVICE" as const,reviewedProtocolAmendmentSha256:s.protocolSha256,
   requireProspectiveConditionalSourceMarker:true as const,
   reviewedStableServiceKeySha256:id.slice("leg:g5a:".length),expectedOperatorFlightNumber:candidate.operatorFlightNumber,
   expectedDestinationIcao:candidate.destinationIcao,selectedTNativeUtc:candidate.selectedReportedDepartureUtc,
   predictionCutoffUtc:candidate.ownCutoffUtc}));
 }
 const summary={stage14MatchedMembershipCount:matched.length,missingOrAmbiguous,actualPreIssued:false,providerCalls:0,databaseWrites:0};
 return Object.freeze(Object.defineProperty(summary,"privateReviewProposals",{value:Object.freeze(matched),enumerable:false})) as typeof summary&{readonly privateReviewProposals:readonly (typeof matched)[number][]};
}
export async function readP5BoundConditionalServiceReview(pool:P5EReadOnlyPgPool,s:ReviewScope){
 return readBound(pool,s,false);
}
/** Runtime-only entry: the caller has verified signed SOURCE packet bytes and
 * an actual committed-query audit. Derive decoded-body digest from the exact
 * existing immutable binding, not from the body to be verified. */
export async function readP5SignedConditionalServiceReview(pool:P5EReadOnlyPgPool,s:Omit<ReviewScope,"expectedDecodedBodySha256">){
 return readBound(pool,s,true);
}
async function readBound(pool:P5EReadOnlyPgPool,input:Omit<ReviewScope,"expectedDecodedBodySha256">&{expectedDecodedBodySha256?:string},signed:boolean){
 const c=await pool.connect();let began=false;
 try{
  await c.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");began=true;
  await c.query("SET LOCAL statement_timeout='15s'");
  await c.query("SET LOCAL lock_timeout='2000ms'");
  const g=(await c.query("SELECT session_user::text AS login,current_user::text AS actor,current_database() AS db,current_setting('server_version_num')::integer AS version,current_setting('transaction_read_only') AS ro,NOT pg_is_in_recovery() AS primary")).rows;
  // The commissioned Stage28 pool authenticates the dedicated login, then
  // SET ROLEs to the existing restricted SOURCE group, not to the login.
  if(g.length!==1||g[0].login!==P5_E_V0079_SOURCE_READONLY_LOGIN_V39||g[0].actor!==P5_STAGE28_GROUPS.source||
    g[0].db!=="neondb"||Number(g[0].version)<160000||Number(g[0].version)>=170000||!Number.isFinite(Number(g[0].version))||
    g[0].ro!=="on"||g[0].primary!==true)hold("ROLE");
  const q=input.source,params=[q.manifestSha256,q.queryDigestSha256];
  const boundSql=signed?P5_STAGE14_BOUND_SOURCE_SQL.replace("b.normalized_members_count,b.bound_at_utc,","b.normalized_members_count,b.bound_at_utc,b.decoded_original_body_sha256,"):P5_STAGE14_BOUND_SOURCE_SQL;
  if(signed&&boundSql===P5_STAGE14_BOUND_SOURCE_SQL)hold("BINDING_QUERY_CONTRACT");
  const rows=(await c.query(boundSql,params)).rows;
  const o=rows[0];
  const bodyHash=signed?o?.decoded_original_body_sha256:input.expectedDecodedBodySha256;
  if(typeof bodyHash!=="string"||!SHA.test(bodyHash)||
    (signed&&o?.conditional_source_protocol_sha256!==input.protocolSha256))return hold("SIGNED_SOURCE_MARKER_OR_BODY_BINDING");
  const s:ReviewScope={...input,expectedDecodedBodySha256:bodyHash};
  if(rows.length!==1||!o||s.ownerProspectiveSeparateTierApproved!==true||!SHA.test(s.protocolSha256??"")||
    !q.plannedRequestUtc||ms(s.policyEffectiveUtc)>ms(q.plannedRequestUtc)||o.manifest_sha256!==q.manifestSha256||
    Number(o.run_day_index)!==q.runDayIndex||o.slot_id!==q.slot||o.horizon!==q.horizon||o.airport_icao!==q.airportIcao||
    o.state!=="ACTIVE"||o.github_run_id!==q.expectedSourceGithubRunId||o.attempt_run_id!==q.expectedSourceGithubRunId||
    o.rights_review_sha256!==q.rightsReviewSha256||o.bound_rights!==q.rightsReviewSha256||o.reviewed_release_sha256!==q.reviewedReleaseSha256||
    o.provider_contract_sha256!==q.providerContractSha256||o.early_draw_sha256!==q.earlyDrawSha256||o.original_current!==true||
    o.population_query_id!==s.expectedPopulationQueryId||o.original_response_hash!==s.expectedResponseSha256||o.fids_response_hash!==s.expectedResponseSha256||
    ms(o.source_expires_at_utc)<=ms((await c.query("SELECT clock_timestamp() AS at")).rows[0]?.at)+30000)hold("ORIGINAL_SCOPE_OR_EXPIRY");
  // Existing reader SQL plus a fresh retention fence before retrieving raw.
  const sql=P5_E_BATCH_ORIGINAL_SQL.replace("AND r.raw_payload IS NOT NULL","AND b.source_expires_at_utc>clock_timestamp()+interval '30 seconds' AND r.raw_payload IS NOT NULL");
  if(sql===P5_E_BATCH_ORIGINAL_SQL)hold("QUERY_CONTRACT");
  const originals=(await c.query(sql,[...params,s.expectedPopulationQueryId])).rows;
  if(signed){
   const raw=originals[0]?.raw_payload as Record<string,any>|undefined;
   const marker=raw?.fidsRequestContract?.phase5ConditionalService;
   if(originals.length!==1||marker?.protocolSha256!==s.protocolSha256||marker?.cohortStartUtc!==s.frozenStudyStartUtc)
    hold("SIGNED_ORIGINAL_COHORT_MARKER_DRIFT");
  }
  const z=(await c.query("SELECT clock_timestamp() AS at")).rows;
  if(z.length!==1)hold("CLOCK");
  prepareP5BoundConditionalServiceReview(s,rows,originals,stamp(z[0].at));
  const members=(await c.query(P5_ACTUAL_SOURCE_ALL_MEMBERS_READONLY_SQL,[s.expectedPopulationQueryId])).rows;
  const fresh=(await c.query("SELECT clock_timestamp() AS at")).rows;
  if(fresh.length!==1||ms(fresh[0].at)>=ms(o.source_expires_at_utc))hold("FRESH_MEMBER_CLOCK");
  // Reprepare at actual fresh clock: member reading cannot steal PRE lead.
  const finalReport=prepareP5BoundConditionalServiceReview(s,rows,originals,stamp(fresh[0].at));
  const memberReview=matchP5ConditionalStage14Members(s,finalReport,members,Number(o.normalized_members_count),stamp(fresh[0].at));
  await c.query("COMMIT");began=false;
  return Object.freeze({report:finalReport,memberReview});
 }finally{if(began)await c.query("ROLLBACK").catch(()=>{});c.release();}
}
