/**
 * Independent, offline ONLY consistency review of the November 2 ephemeral
 * source-field pilot's GitHub log receipts. NOT a scientific/per-flight audit.
 *
 * Input logs are untrusted observations: this module cannot authenticate the
 * GitHub API, original provider bytes, lawful retention or actual wheels-off.
 * Never log, return, or persist the input text or per-flight source identities.
 */
export type Nov2HorizonV39 = "T-24h"|"T-6h"|"T-90m";
export type Nov2ReceiptVerdictV39 =
 "PENDING_UNVERIFIED"|"HOLD_INCONSISTENT"|"SOURCE_ONLY_LOGS_CONSISTENT";
export interface Nov2HorizonReceiptV39 {
 horizon:Nov2HorizonV39;
 verdict:Nov2ReceiptVerdictV39;
 issueCodes:string[];
 observedPaidStarts:number|null;
 successfulSourceReports:number|null;
 measuredTwoUnitDeltas:number|null;
 observationsPerSnapshot:number[]|null;
 strictGate5Passed:false;
 phase5FreezeAuthorized:false;
 phase6Authorized:false;
 rawOriginalSourceAudited:false;
}
type RecordValue=Record<string,unknown>;
const FROZEN_SHA256=
 "aa9a9be29cf9778d3fcaef7b7f08a482d6a5307623453515d7022c62da723136";
const SPECS:Record<Nov2HorizonV39,{starts:string[];prearmDeadline:string}>={
 "T-24h":{starts:[
  "2026-11-01T16:30:00.000Z","2026-11-01T17:00:00.000Z",
  "2026-11-01T17:30:00.000Z"],prearmDeadline:"2026-11-01T15:30:00.000Z"},
 "T-6h":{starts:[
  "2026-11-02T10:30:00.000Z","2026-11-02T11:00:00.000Z",
  "2026-11-02T11:30:00.000Z"],prearmDeadline:"2026-11-02T09:30:00.000Z"},
 "T-90m":{starts:[
  "2026-11-02T15:00:00.000Z","2026-11-02T15:30:00.000Z",
  "2026-11-02T16:00:00.000Z"],prearmDeadline:"2026-11-02T14:00:00.000Z"}
};
const EVENT_START="P4_G5_REAL_NOV2_ONE_ACTUAL_PAID_GET_STARTED";
const EVENT_RESULT="PROVIDER_FIELDS_OBSERVED_SEMANTICS_UNCERTIFIED";
const EVENT_PREARM="P4_G5_REAL_NOV2_HORIZON_GITHUB_PREARM_VERIFIED";
const EVENT_END="P4_G5_REAL_NOV2_AGGREGATE_HORIZON_CLOSED_SOURCE_ONLY";
const EVENTS=new Set([EVENT_START,EVENT_RESULT,EVENT_PREARM,EVENT_END,
 "P4_G5_REAL_NOV2_QUERY_UNOBSERVED_TIMING",
 "P4_G5_REAL_NOV2_SOURCE_UNOBSERVED_AFTER_ONE_POSSIBLY_PAID_GET",
 "P4_G5_REAL_NOV2_SOURCE_UNOBSERVED_BEFORE_GET"]);
function object(v:unknown):v is RecordValue {
 return v!==null&&typeof v==="object"&&!Array.isArray(v);
}
function utcMs(v:unknown):number|null {
 if(typeof v!=="string"||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v))return null;
 const t=Date.parse(v);
 return Number.isFinite(t)&&new Date(t).toISOString()===v?t:null;
}
function int(v:unknown):v is number{
 return typeof v==="number"&&Number.isSafeInteger(v)&&v>=0;
}
function safeEvents(logText:string):RecordValue[] {
 const out:RecordValue[]=[];
 for(const line of logText.split(/\r?\n/)){
  const pos=line.indexOf("{");
  if(pos<0)continue;
  let item:unknown;
  try{item=JSON.parse(line.slice(pos));}catch{continue;}
  if(object(item)&&typeof item.status==="string"&&EVENTS.has(item.status))
   out.push(item);
 }
 return out;
}
function base(horizon:Nov2HorizonV39,verdict:Nov2ReceiptVerdictV39,
 issues:string[],starts:number|null=null,success:number|null=null,
 units:number|null=null,counts:number[]|null=null):Nov2HorizonReceiptV39 {
 return {horizon,verdict,issueCodes:issues,observedPaidStarts:starts,
  successfulSourceReports:success,measuredTwoUnitDeltas:units,
  observationsPerSnapshot:counts,strictGate5Passed:false,
  phase5FreezeAuthorized:false,phase6Authorized:false,
  rawOriginalSourceAudited:false};
}
/**
 * A *completed* GitHub job with its original log must be supplied by a
 * separate authenticated read. Do not interpret inaccessible live logs as
 * zero API requests or as a paid failure.
 */
export function assessP4Nov2SourceReceiptV39(
 horizon:Nov2HorizonV39,
 jobConclusion:"success"|"failure"|"cancelled"|"in_progress"|"queued",
 logText:string|null
):Nov2HorizonReceiptV39 {
 if(jobConclusion==="in_progress"||jobConclusion==="queued"||logText===null)
  return base(horizon,"PENDING_UNVERIFIED",["JOB_OR_LOG_NOT_FINAL"]);
 if(!SPECS[horizon]||typeof logText!=="string"||logText.length>3_000_000)
  return base(horizon,"HOLD_INCONSISTENT",["INVALID_HORIZON_OR_LOG"]);
 const specs=SPECS[horizon], events=safeEvents(logText), errors:string[]=[];
 const take=(status:string)=>events.filter(e=>e.status===status);
 const starts=take(EVENT_START),results=take(EVENT_RESULT),
  prearms=take(EVENT_PREARM),ends=take(EVENT_END);
 if(jobConclusion!=="success")errors.push("JOB_DID_NOT_SUCCEED");
 if(prearms.length!==1)errors.push("PREARM_RECEIPT_COUNT");
 else{
  const p=prearms[0];
  const t=utcMs(p.githubVerifiedAtUtc),job=utcMs(p.jobStartedAtUtc);
  if(p.horizon!==horizon||p.frozenManifestSha256!==FROZEN_SHA256||
    p.plannedQueries!==3||p.maxProviderAttempts!==3||p.maxExpectedUnits!==6||
    p.dbWrites!==0||p.retainedSourceBytes!==0||p.strictGate5Passed!==false||
    !int(Number(p.githubRunId))||t===null||job===null||
    job>t||t>Date.parse(specs.prearmDeadline))
    errors.push("PREARM_PROOF_MISMATCH");
 }
 if(starts.length!==3)errors.push("PAID_START_COUNT");
 if(results.length!==3)errors.push("SOURCE_REPORT_COUNT");
 const counts:number[]=[],startedIndex=new Set<number>(),resultIndex=new Set<number>();
 let measured=0;
 for(const s of starts){
  const i=s.queryIndex;
  if(!int(i)||i>2||startedIndex.has(i)){
   errors.push("START_INDEX_DUPLICATE_OR_INVALID");continue;
  }
  startedIndex.add(i);
  const planned=specs.starts[i],actual=utcMs(s.actualDispatchUtc);
  if(s.horizon!==horizon||s.plannedUtc!==planned||
    s.maxAttemptsForThisSlot!==1||actual===null||
    actual<Date.parse(planned)||actual>Date.parse(planned)+15*60000)
    errors.push("START_WINDOW_OR_GUARD_MISMATCH");
 }
 for(const o of results){
  const i=o.queryIndex;
  if(!int(i)||i>2||resultIndex.has(i)){
   errors.push("REPORT_INDEX_DUPLICATE_OR_INVALID");continue;
  }
  resultIndex.add(i);
  const planned=specs.starts[i];
  const cutoff=new Date(Date.parse(planned)+30*60000).toISOString();
  const recv=utcMs(o.receivedAtUtc);
  const startsForIndex=starts.filter(s=>s.queryIndex===i);
  const dispatch=startsForIndex.length===1?utcMs(startsForIndex[0].actualDispatchUtc):null;
  const count=o.observedDepartureRecords;
  if(o.horizon!==horizon||o.cutoffUtc!==cutoff||
    recv===null||dispatch===null||recv<dispatch||
    !int(count)||!int(o.providerOperatorTaggedObservations)||
    !int(o.providerMarketingTaggedObservations)||
    !int(o.codeshareUnresolvedObservations)||
    o.providerOperatorTaggedObservations+
     o.providerMarketingTaggedObservations+
     o.codeshareUnresolvedObservations!==count||
    o.firstProviderNativeSelectedTCertified!==false||
    o.runwayActualOnlyPerRecordCertified!==false||
    o.confirmedOperatingLegPopulation!==false||
    o.retainedSourceForFutureCohort!==false||
    o.expectedTier2Units!==2||o.providerRequestAttempts!==1||
    o.rawBodyPersisted!==false||o.flightIdsPersisted!==false||
    o.dbWrites!==0||o.retries!==0||o.strictGate5Passed!==false)
    errors.push("SOURCE_REPORT_UNCERTIFIED_OR_INCONSISTENT");
  if(o.headerDeltaMeasured!==null&&
    (!int(o.headerDeltaMeasured)||o.headerDeltaMeasured>6))
    errors.push("INVALID_MEASURED_UNIT_DELTA");
  if(o.headerDeltaMeasured===2)measured+=2;
  if(int(count))counts[i]=count;
 }
 if(ends.length!==1)errors.push("CLOSEOUT_RECEIPT_COUNT");
 else{
  const e=ends[0];
  if(e.horizon!==horizon||e.planned!==3||e.providerRequestsAttempted!==3||
   e.successfulSourceResponses!==3||e.unknownOrUnobservedSlots!==0||
   e.headerBasedUnitsMeasuredForMatching2UnitResponses!==measured||
   e.totalWorstCaseUnitsForThisHorizon!==6||
   e.originalProviderContentPersisted!==false||
   e.physicalUniqueFlightPopulationCertifiable!==false||
   e.certifiedPrePersisted!==false||e.selectedTVerified!==false||
   e.actualOnlyRunwayLabelsVerified!==false||e.strictGate5Passed!==false||
   e.phase5FreezeAuthorized!==false||e.phase6Authorized!==false)
   errors.push("CLOSEOUT_COUNT_OR_SEMANTIC_MISMATCH");
 }
 if(events.some(e=>e.horizon===horizon&&![
  EVENT_PREARM,EVENT_START,EVENT_RESULT,EVENT_END].includes(String(e.status))))
  errors.push("UNOBSERVED_SOURCE_SLOT_PRESENT");
 if(errors.length)return base(horizon,"HOLD_INCONSISTENT",
  [...new Set(errors)].sort());
 return base(horizon,"SOURCE_ONLY_LOGS_CONSISTENT",[],
  3,3,measured,counts);
}
export function combineP4Nov2SourceReceiptsV39(
 receipts:Nov2HorizonReceiptV39[]
){
 const expected=Object.keys(SPECS) as Nov2HorizonV39[];
 const unique=new Set(receipts.map(r=>r.horizon));
 const complete=receipts.length===3&&unique.size===3&&
  expected.every(h=>receipts.some(r=>r.horizon===h&&
   r.verdict==="SOURCE_ONLY_LOGS_CONSISTENT"));
 return {
  verdict:complete?"ALL_NINE_LOG_RECEIPTS_CONSISTENT_SOURCE_ONLY":
   "HOLD_INCOMPLETE_SOURCE_ONLY",
  confirmedFromSuppliedLogsOnly:complete,
  paidStarts:complete?9:null,
  successfulSourceReports:complete?9:null,
  measuredTwoUnitDeltas:complete?receipts.reduce(
   (n,r)=>n+(r.measuredTwoUnitDeltas??0),0):null,
  distinctPhysicalFlights:null,
  certifiedPersistedPRE:null,
  providerNativeSelectedT:null,
  verifiedActualOnlyWheelsOff:null,
  strictGate5Passed:false,phase5FreezeAuthorized:false,
  phase6Authorized:false,providerCallsMadeByAudit:0,
  databaseWritesMadeByAudit:0
 } as const;
}
