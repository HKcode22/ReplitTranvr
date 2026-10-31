/**
 * Phase 4 Gate 5: retained-source, SAME-WSSS-service-cohort as-of FIDS
 * candidate turnover. Pure read-only measurements. Provisional analytic
 * identities do NOT establish physical flights; a missing/expired receipt
 * never implies zero departures. 24h raw-retention ceiling is unchanged.
 */
import type {P4InventoryDb} from "./phase4Gate5SourceInventory_v39";

export const P4_WSSS_DRIFT_SCHEMA="v39.phase4.wsss-retained-asof-candidate-drift.v1" as const;
const COHORT_START="2026-10-31T17:00:00.000Z";
const COHORT_END="2026-10-31T18:00:00.000Z";
const CUTS={
 "T-24h":"2026-10-30T17:00:00.000Z",
 "T-6h":"2026-10-31T11:00:00.000Z",
 "T-90m":"2026-10-31T15:30:00.000Z"
} as const;
type Horizon=keyof typeof CUTS;
const HORIZONS=Object.keys(CUTS) as Horizon[];
const MAX_QUERIES=12;
const MAX_ROWS=12000;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const SHA=/^[a-f0-9]{64}$/;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/;

export const P4_WSSS_RETAINED_DRIFT_SQL=[
 "WITH q AS (SELECT population_query_id,response_hash,available_at",
 "FROM clean.fids_query_response WHERE source_airport_icao=$1",
 "AND service_window_start_utc=$2::timestamptz",
 "AND service_window_end_utc=$3::timestamptz",
 "AND raw_payload IS NOT NULL AND raw_expired_at_utc IS NULL",
 "AND raw_persisted_at_utc >= $4::timestamptz - interval '24 hours'",
 "AND available_at<=$4::timestamptz",
 "ORDER BY available_at DESC LIMIT 13)",
 "SELECT q.population_query_id::text AS query_id,",
 "q.available_at AS query_available,q.response_hash AS query_hash,",
 "p.analytic_identity_id AS analytic_id,p.available_at AS member_available,",
 "p.response_hash AS member_hash,p.population_role AS role,",
 "p.scope_classification AS scope_class,",
 "p.codeshare_resolution_status AS codeshare,",
 "p.canonical_flight_instance_id AS canonical_id,",
 "p.dep_scheduled_utc AS observed_schedule",
 "FROM q LEFT JOIN clean.flight_population p",
 "ON p.population_query_id=q.population_query_id",
 "AND p.source_type='fids' AND p.source_airport_icao=$1",
 "AND p.provider_content_expired_at_utc IS NULL",
 "ORDER BY q.available_at ASC,q.population_query_id,p.id LIMIT 12001"
].join(" ");

function ms(x:unknown):number{
 const date=x instanceof Date?x:typeof x==="string"&&UTC.test(x)?new Date(x):null;
 if(!date||!Number.isFinite(date.getTime()))throw Error("P4_DRIFT_INVALID_UTC");
 return date.getTime();
}
function str(x:unknown,max=256):string{
 if(typeof x!=="string"||!x.trim()||x.length>max)
  throw Error("P4_DRIFT_INVALID_SOURCE_STRING");
 return x;
}
function rec(x:unknown):Record<string,unknown>{
 if(!x||typeof x!=="object"||Array.isArray(x))
  throw Error("P4_DRIFT_INVALID_DB_ROW");
 return x as Record<string,unknown>;
}
type Member={schedule:number|null;availableAt:number;core:boolean};
type Receipt={when:number; ids:Map<string,Member>; rejected:number; memberships:number; core:number};
const noSource=(horizon:Horizon)=>({
 horizon,status:"NO_RETAINED_SOURCE_AVAILABLE_AT_FIXED_EARLIEST_CUTOFF" as const,
 cutoffUtc:CUTS[horizon],sourceReceiptAvailableUtc:null,
 primaryProvisionalIdentities:null,confirmedCoreTaggedIdentities:null,
 sourceLineageRejectedRows:null
});
const notYet=(horizon:Horizon)=>({
 horizon,status:"FIXED_EARLIEST_CUTOFF_NOT_YET_REACHED" as const,
 cutoffUtc:CUTS[horizon],sourceReceiptAvailableUtc:null,
 primaryProvisionalIdentities:null,confirmedCoreTaggedIdentities:null,
 sourceLineageRejectedRows:null
});
const sourceReport=(horizon:Horizon,r:Receipt)=>({
 horizon,status:"RETAINED_PROVIDER_SOURCE_CANDIDATES_NOT_PHYSICAL_FLIGHTS" as const,
 cutoffUtc:CUTS[horizon],
 sourceReceiptAvailableUtc:new Date(r.when).toISOString(),
 primaryProvisionalIdentities:r.ids.size,
 confirmedCoreTaggedIdentities:r.core,
 sourceLineageRejectedRows:r.rejected
});
type HorizonState=ReturnType<typeof noSource>|ReturnType<typeof notYet>|ReturnType<typeof sourceReport>;
function delta(a:Receipt|null,b:Receipt|null){
 if(!a||!b)return {
  status:"UNOBSERVED_RETAINED_RECEIPT_MISSING" as const,
  reappearingCandidateIds:null,appearingCandidateIds:null,
  absentFromLaterSourceCandidateIds:null,observedScheduleRevisionCandidates:null
 };
 let keep=0,added=0,removed=0,changed=0;
 for(const [id,t] of b.ids){
  if(!a.ids.has(id))added++;
  else{keep++;const old=a.ids.get(id);if(t.schedule!==null&&old?.schedule!==null&&t.schedule!==old?.schedule)changed++;}
 }
 for(const id of a.ids.keys())if(!b.ids.has(id))removed++;
 if(keep+removed!==a.ids.size||keep+added!==b.ids.size)
  throw Error("P4_DRIFT_IMPOSSIBLE_IDENTITY_SET_MATH");
 return{
  status:"PROVISIONAL_QUERY_TURNOVER_NOT_FLIGHT_ARRIVALS_OR_CANCELS" as const,
  reappearingCandidateIds:keep,appearingCandidateIds:added,
  absentFromLaterSourceCandidateIds:removed,observedScheduleRevisionCandidates:changed
 };
}
export async function auditP4WsssRetainedAsOfDriftV39(
 db:P4InventoryDb,
 params:{airport:"WSSS";windowStartUtc:string;windowEndUtc:string;auditUtc:string}
){
 if(!params||params.airport!=="WSSS"||
    params.windowStartUtc!==COHORT_START||params.windowEndUtc!==COHORT_END||
    typeof params.auditUtc!=="string"||!UTC.test(params.auditUtc))
  throw Error("P4_DRIFT_SCOPE_HOLD");
 const audit=ms(params.auditUtc);
 const result=await db.query(P4_WSSS_RETAINED_DRIFT_SQL,
   [params.airport,COHORT_START,COHORT_END,params.auditUtc]);
 if(!result||!Array.isArray(result.rows)||result.rows.length>MAX_ROWS)
  throw Error("P4_DRIFT_ROWS_OVER_BOUND");
 const qs=new Map<string,Receipt>();
 for(const input of result.rows){
  const r=rec(input),id=str(r.query_id);
  if(!UUID.test(id)||typeof r.query_hash!=="string"||!SHA.test(r.query_hash))
   throw Error("P4_DRIFT_RECEIPT_INVALID");
  const at=ms(r.query_available);
  if(at>audit)throw Error("P4_DRIFT_FUTURE_RECEIPT");
  let q=qs.get(id);
  if(!q){q={when:at,ids:new Map(),rejected:0,memberships:0,core:0};qs.set(id,q);}
  else if(q.when!==at)throw Error("P4_DRIFT_QUERY_CLOCK_CONFLICT");
  if(qs.size>MAX_QUERIES)throw Error("P4_DRIFT_QUERY_SAMPLE_TRUNCATED");
  if(r.analytic_id===null)continue; // legitimate empty original query
  q.memberships++;
  // Preserve FIDS membership integrity: query and member hashes/roles,
  // availability no earlier than parent receipt (except PostgreSQL sub-ms
  // serialization), and exclusion of content-expired normalized members.
  const memberAt=ms(r.member_available);
  if(memberAt>audit||memberAt+1<=at||r.member_hash!==r.query_hash||
     r.role!=="requested_airport_primary"){
   q.rejected++;continue;
  }
  const analytic=str(r.analytic_id,256);
  const schedule=r.observed_schedule===null?null:ms(r.observed_schedule);
  if(q.ids.has(analytic)){
   // Duplicate identity inside the same response is not additional flight.
   const old=q.ids.get(analytic);
   if(schedule!==old?.schedule)q.rejected++;
   continue;
  }
  const core=r.scope_class==="confirmed_core"&&
    r.codeshare==="confirmed_operating_leg"&&
    typeof r.canonical_id==="string"&&
    r.canonical_id===analytic;
  q.ids.set(analytic,{schedule,availableAt:Math.max(memberAt,at),core});
  if(core)q.core++;
 }
 const ordered=[...qs.values()].sort((a,b)=>a.when-b.when);
 // Query receipt is necessary but not sufficient: a member can be made
 // durable later, so apply the member's own cutoff for every horizon.
 const memberAsOf=(q:Receipt,cut:number):Receipt=>{
  const ids=new Map<string,Member>();
  for(const [id,m] of q.ids)if(m.availableAt<=cut)ids.set(id,m);
  return {...q,ids,core:[...ids.values()].filter(m=>m.core).length};
 };
 const per=new Map<Horizon,Receipt|null>();
 for(const h of HORIZONS){
  const cut=Date.parse(CUTS[h]);
  // No source retrieved after this prediction cutoff can appear at it.
  const selected=audit>=cut
   ? ordered.filter(q=>q.when<=cut).at(-1)??null : null;
  const latest=selected?memberAsOf(selected,cut):null;
  per.set(h,latest);
 }
 const t24=per.get("T-24h")!,t6=per.get("T-6h")!,t90=per.get("T-90m")!;
 const asOf=Object.fromEntries(HORIZONS.map(h=>{
  const q=per.get(h)!;
  return [h,q?sourceReport(h,q):audit<Date.parse(CUTS[h])?notYet(h):noSource(h)];
 })) as Record<Horizon,HorizonState>;
 const transitions={
  "T24_to_T6":delta(t24,t6),
  "T6_to_T90":delta(t6,t90)
 };
 return {
  schema:P4_WSSS_DRIFT_SCHEMA,
  status:"PROSPECTIVE_COHORT_RETAINED_SOURCE_CANDIDATES_ONLY" as const,
  sourceAirport:params.airport,windowStartUtc:COHORT_START,
  windowEndUtc:COHORT_END,auditUtc:params.auditUtc,
  retainedSourceReceipts:ordered.length,
  retainedPrimaryMembershipRows:ordered.reduce((a,b)=>a+b.memberships,0),
  rejectedSourceLineageRows:ordered.reduce((a,b)=>a+b.rejected,0),
  asOf,transitions,
  identitySetsAreProvisionalNotDistinctPhysicalFlights:true as const,
  noRetainedReceiptMeansUnobservedNotZeroFlights:true as const,
  missingExpiredSourceCannotBeRestoredByFutureQueries:true as const,
  fixedEarliestCutoffNotVerifiedPerFlightSelectedT:true as const,
  actualWheelsOffLabelsVerified:false as const,
  strictGate5Passed:false as const,phase6Authorized:false as const,
  providerCalls:0 as const,databaseWrites:0 as const
 };
}
