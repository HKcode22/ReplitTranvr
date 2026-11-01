/**
 * Phase4 Gate5: offline replay of the current fidsCensus_v3.ts *filter
 * predicates* on already retained original FIDS departure movements.
 *
 * This is not a historical producer-version attestation, source-to-member
 * record identity join, physical-flight count, or science gate pass.
 * PostgreSQL READ ONLY in caller-owned transaction. Never output raw records,
 * original UUID, flight numbers, routes, or source timestamps.
 */
import {assertP4FreshCohortScopeV39,
 type P4FreshCohortScopeV39,type P4FreshReadOnlyDbV39
} from "./phase4Gate5FreshCohortReadOnly_v39";
export const P4_FIDS_FILTER_REPLAY_SCHEMA_V39=
 "v39.phase4.gate5-retained-original-filter-replay.v1" as const;
export const P4_FIDS_FILTER_REPLAY_SQL_V39=[
 "WITH allq AS (SELECT population_query_id,available_at,raw_payload",
 "FROM clean.fids_query_response",
 "WHERE source_airport_icao=$1",
 "AND service_window_start_utc=$2::timestamptz",
 "AND service_window_end_utc=$3::timestamptz",
 "AND available_at<=$4::timestamptz",
 "AND raw_payload IS NOT NULL AND raw_expired_at_utc IS NULL),",
 "q AS (SELECT population_query_id,available_at,raw_payload",
 "FROM allq ORDER BY available_at,population_query_id LIMIT 12)",
 "SELECT row_number() OVER (ORDER BY available_at,population_query_id)::int",
 "AS receipt_rank,raw_payload FROM q ORDER BY receipt_rank"
].join(" ");

type Filters="missing_or_invalid_schedule"|"schedule_before_window"|
 "schedule_at_or_after_window_end"|"excluded_cargo"|"excluded_private_or_ga"|
 "excluded_cancelled"|"excluded_marketing"|"would_be_normalized";
const REASONS:readonly Filters[]=[
 "missing_or_invalid_schedule","schedule_before_window",
 "schedule_at_or_after_window_end","excluded_cargo","excluded_private_or_ga",
 "excluded_cancelled","excluded_marketing","would_be_normalized"
] as const;
type Counters=Record<Filters,number>;
type RequestFrame={
 direction:"Departure";airportIcao:string;
 withCancelled:boolean;withCodeshared:boolean;
 withCargo:boolean;withPrivate:boolean
};
function object(x:unknown):Record<string,any>|null{
 return x&&typeof x==="object"&&!Array.isArray(x)?
  x as Record<string,any>:null;
}
function contract(raw:Record<string,any>,airport:string):RequestFrame{
 const f=object(raw.fidsRequestContract);
 if(!f||f.schema!=="v39.fids-request-frame.application-intent.v1"||
    f.direction!=="Departure"||f.airportIcao!==airport||
    typeof f.withCancelled!=="boolean"||
    typeof f.withCodeshared!=="boolean"||
    typeof f.withCargo!=="boolean"||
    typeof f.withPrivate!=="boolean")
  throw Error("P4_FIDS_FILTER_ORIGINAL_REQUEST_FRAME_HOLD");
 return f as RequestFrame;
}
function selectedDate(x:unknown):number|null{
 // Mirrors fidsCensus_v3.isoOrNull exactly (new Date, finite, ISO).
 if(typeof x!=="string"||!x.trim())return null;
 const d=new Date(x);
 return Number.isFinite(d.getTime())?d.getTime():null;
}
export function classifyP4OriginalFidsDepartureV39(
 raw:unknown,frame:RequestFrame,fromMs:number,toMs:number
):Filters{
 const f=object(raw);
 const scheduled=selectedDate(f?.departure?.scheduledTime?.utc);
 if(scheduled===null)return "missing_or_invalid_schedule";
 if(scheduled<fromMs)return "schedule_before_window";
 if(scheduled>=toMs)return "schedule_at_or_after_window_end";
 if(!frame.withCargo&&f?.isCargo===true)return "excluded_cargo";
 if(!frame.withPrivate&&(f?.isPrivate===true||f?.isGeneralAviation===true))
  return "excluded_private_or_ga";
 if(!frame.withCancelled&&(f?.status==="Canceled"||f?.status===10))
  return "excluded_cancelled";
 if(!frame.withCodeshared&&
    (f?.codeshareStatus==="IsCodeshared"||f?.codeshareStatus===2))
  return "excluded_marketing";
 return "would_be_normalized";
}
export async function auditP4HistoricalOriginalFilterReplayV39(
 db:P4FreshReadOnlyDbV39,scope:P4FreshCohortScopeV39
){
 assertP4FreshCohortScopeV39(scope);
 const result=await db.query(P4_FIDS_FILTER_REPLAY_SQL_V39,[
  scope.airportIcao,scope.serviceWindowStartUtc,
  scope.serviceWindowEndUtc,scope.readAsOfUtc
 ]);
 if(!result||!Array.isArray(result.rows)||result.rows.length>12)
  throw Error("P4_FIDS_FILTER_SOURCE_RESULT_HOLD");
 const perReceipt:Array<{
  receiptRank:number;rawDepartureCount:number;filterCounts:Counters
 }>=[];
 let i=0;
 for(const v of result.rows){
  const r=object(v);
  if(!r||r.receipt_rank!==++i)
   throw Error("P4_FIDS_FILTER_RECEIPT_ORDER_HOLD");
  const raw=object(r.raw_payload);
  if(!raw||!Array.isArray(raw.departures)||raw.departures.length>900)
   throw Error("P4_FIDS_FILTER_RAW_DEPARTURES_SHAPE_HOLD");
  const flags=contract(raw,scope.airportIcao);
  const counts=Object.fromEntries(REASONS.map(k=>[k,0])) as Counters;
  const first=Date.parse(scope.serviceWindowStartUtc);
  const last=Date.parse(scope.serviceWindowEndUtc);
  for(const source of raw.departures){
   const key=classifyP4OriginalFidsDepartureV39(source,flags,first,last);
   counts[key]++;
  }
  if(REASONS.reduce((n,key)=>n+counts[key],0)!==raw.departures.length)
   throw Error("P4_FIDS_FILTER_REPLAY_COUNTER_HOLD");
  perReceipt.push({
   receiptRank:i,rawDepartureCount:raw.departures.length,filterCounts:counts
  });
 }
 const reasonTotals=Object.fromEntries(REASONS.map(k=>[
  k,perReceipt.reduce((n,x)=>n+x.filterCounts[k],0)
 ])) as Counters;
 return {
  schema:P4_FIDS_FILTER_REPLAY_SCHEMA_V39,
  status:perReceipt.length>0
   ?"CURRENT_FILTER_REPLAY_CANDIDATE_NOT_ORIGINAL_MEMBER_CAUSE_PROOF"
   :"NO_RETAINED_ORIGINAL_FILTER_REASON_UNKNOWN",
  manifestSha256:scope.reviewedFrozenManifestSha256,
  inspectedOriginalReceipts:perReceipt.length,
  perReceipt,rawDepartureSourceRows:perReceipt.length?
   perReceipt.reduce((n,x)=>n+x.rawDepartureCount,0):null,
  predictedNormalizedRows:perReceipt.length?reasonTotals.would_be_normalized:null,
  exclusionReasonTotals:perReceipt.length?reasonTotals:null,
  historicalProducerVersionProven:false as const,
  rawMemberOrdinalLinkageVerified:false as const,
  physicalOperatingFlightCount:null,
  actualOnlyWheelsOffCount:null,
  strictGate5Passed:false as const,phase5FreezeAuthorized:false as const,
  phase6Authorized:false as const,providerCalls:0 as const,databaseWrites:0 as const
 };
}
