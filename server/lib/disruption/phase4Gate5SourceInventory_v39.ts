/**
 * Phase4 Gate5: zero-provider, READ-ONLY original-source inventory.
 * Preserves scientific distinctions: SQL metadata != raw SHA readback;
 * recent FIDS response sample != population frame; candidate scheduled T
 * != independently verified selected T; logged blob ref != original bytes.
 * Never outputs flight IDs, source hashes, airplane IDs or time windows.
 */
export const P4_SOURCE_INVENTORY_SCHEMA="v39.phase4.gate5-live-source-inventory.v1" as const;
const SHA=/^[a-f0-9]{64}$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/;
export const P4_REQUIRED_SOURCE_TABLES=Object.freeze([
 "fids_query_response","flight_population","provider_content_blob_ref",
 "raw_delivery","raw_delivery_item","webhook_identity_resolution",
 "flight_snapshots"
] as const);
const TOP=12;
const MAX_MEMBER=20000;
const MAX_BLOBS=20000;
function date(x:unknown):number{
 if(x instanceof Date){
  if(!Number.isFinite(x.getTime()))throw Error("P4_INV_BAD_DATE");
  return x.getTime();
 }
 if(typeof x!=="string"||!UTC.test(x))throw Error("P4_INV_BAD_UTC");
 const t=Date.parse(x);
 if(!Number.isFinite(t)||new Date(t).toISOString().slice(0,19)!==x.slice(0,19))
  throw Error("P4_INV_BAD_DATE");
 return t;
}
const r=(x:unknown):Record<string,unknown>=>{
 if(!x||typeof x!=="object"||Array.isArray(x))throw Error("P4_INV_BAD_ROW");
 return x as Record<string,unknown>;
};
export const P4_INV_CATALOG_SQL=[
 "SELECT c.relname AS name,c.relpersistence AS persistence,",
 "pg_catalog.has_table_privilege(c.oid,'SELECT') AS readable",
 "FROM pg_catalog.pg_class c",
 "JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace",
 "WHERE n.nspname='clean' AND c.relname=ANY($1::text[])",
 "AND c.relkind IN ('r','p') ORDER BY c.relname"
].join(" ");
export const P4_INV_FIDS_SQL=[
 "SELECT population_query_id::text AS query_id,",
 "available_at,raw_payload IS NOT NULL AS raw_present,",
 "raw_expired_at_utc,response_hash,",
 "source_airport_icao AS airport,service_window_start_utc AS service_start,",
 "service_window_end_utc AS service_end",
 "FROM clean.fids_query_response",
 "WHERE source_airport_icao=$1 AND available_at<=$2::timestamptz",
 "ORDER BY available_at DESC LIMIT 12"
].join(" ");
export const P4_INV_POPULATION_SQL=[
 "SELECT p.population_query_id::text AS query_id,",
 "p.canonical_flight_instance_id AS canonical_id,",
 "p.population_role AS population_role,p.scope_classification AS scope,",
 "p.codeshare_resolution_status AS codeshare,p.available_at,",
 "p.dep_scheduled_utc,p.response_hash,",
 "p.provider_content_expired_at_utc",
 "FROM clean.flight_population p",
 "WHERE p.population_query_id=ANY($1::uuid[]) AND p.source_type='fids'",
 "ORDER BY p.id LIMIT 20001"
].join(" ");
export const P4_INV_BLOB_SQL=[
 "SELECT source_kind,content_class,content_sha256,content_bytes,",
 "persisted_at_utc,expires_at_utc,deleted_at_utc,source_record_id",
 "FROM clean.provider_content_blob_ref",
 "WHERE source_kind='webhook' AND persisted_at_utc>=$1::timestamptz",
 "AND persisted_at_utc<=$2::timestamptz",
 "ORDER BY persisted_at_utc DESC LIMIT 20001"
].join(" ");
export interface P4InventoryDb{query(sql:string,params:unknown[]):Promise<{rows:unknown[]}>}
export interface P4InventoryReport{
 schema:typeof P4_SOURCE_INVENTORY_SCHEMA;
 status:"BLOCKED_MISSING_OR_UNREADABLE_SOURCE_RELATIONS"|
  "NO_SAMPLED_FIDS_SOURCE_OBSERVED_NOT_ZERO_COVERAGE"|
  "FIDS_AND_WEBHOOK_METADATA_SAMPLE_NOT_SCIENCE_PASS"|
  "FIDS_METADATA_SAMPLE_NOT_SCIENCE_PASS";
 sourceAirport:string;
 inspectedRelations:number;loggedAndReadableRelations:number;
 unavailableRelations:number;unloggedOrUnreadableRelations:number;
 latestFidsQuerySample:number;querySampleLimit:number;
 fidsQueriesWithUnexpiredInlineRaw:number;
 fidsQueriesWithExpiredOrMissingRaw:number;
 candidatePopulationRows:number;
 candidateOperatingLegRows:number;
 candidateRowsBeforeScheduledHorizon:{"T-24h":number;"T-6h":number;"T-90m":number};
 ambiguousOrOtherPopulationRows:number;
 webhookOriginalBlobRefsSample:number;
 webhookUnexpiredLedgerRefs:number;
 webhookExpiredOrDeletedLedgerRefs:number;
 webhookInvalidLedgerRefs:number;
 missingFidsIsSourceUnknown:true;
 allSourceCompletenessVerified:false;
 rawOriginalBytesHashReadbackProven:false;
 originalCallbackAcknowledgementVerified:false;
 firstSelectedTIndependentlyVerified:false;
 physicalFlightIdentityIndependentlyVerified:false;
 actualWheelsOffLabelVerified:false;
 stableRestartRecoveryVerified:false;
 strictGate5Passed:false;phase6Authorized:false;
 providerCalls:0;databaseWrites:0;
}
export async function auditP4Gate5OriginalSourceInventory(
 db:P4InventoryDb,scope:{airport:string;auditUtc:string}
):Promise<P4InventoryReport>{
 if(!scope||!/^[A-Z]{4}$/.test(scope.airport))throw Error("P4_INV_BAD_AIRPORT");
 const now=date(scope.auditUtc);
 const base={
  schema:P4_SOURCE_INVENTORY_SCHEMA,sourceAirport:scope.airport,
  latestFidsQuerySample:0,querySampleLimit:TOP,
  fidsQueriesWithUnexpiredInlineRaw:0,fidsQueriesWithExpiredOrMissingRaw:0,
  candidatePopulationRows:0,candidateOperatingLegRows:0,
  candidateRowsBeforeScheduledHorizon:{"T-24h":0,"T-6h":0,"T-90m":0},
  ambiguousOrOtherPopulationRows:0,webhookOriginalBlobRefsSample:0,
  webhookUnexpiredLedgerRefs:0,webhookExpiredOrDeletedLedgerRefs:0,
  webhookInvalidLedgerRefs:0,
  missingFidsIsSourceUnknown:true as const,allSourceCompletenessVerified:false as const,
  rawOriginalBytesHashReadbackProven:false as const,
  originalCallbackAcknowledgementVerified:false as const,
  firstSelectedTIndependentlyVerified:false as const,
  physicalFlightIdentityIndependentlyVerified:false as const,
  actualWheelsOffLabelVerified:false as const,stableRestartRecoveryVerified:false as const,
  strictGate5Passed:false as const,phase6Authorized:false as const,
  providerCalls:0 as const,databaseWrites:0 as const
 };
 const catalog=await db.query(P4_INV_CATALOG_SQL,[[...P4_REQUIRED_SOURCE_TABLES]]);
 if(!catalog||!Array.isArray(catalog.rows)||catalog.rows.length>P4_REQUIRED_SOURCE_TABLES.length)
  throw Error("P4_INV_CATALOG_OUT_OF_BOUNDS");
 const have=new Map<string,{persistence:string;readable:boolean}>();
 for(const val of catalog.rows){
  const c=r(val),name=c.name;
  if(typeof name!=="string"||
   !P4_REQUIRED_SOURCE_TABLES.includes(name as typeof P4_REQUIRED_SOURCE_TABLES[number])||
   have.has(name)||typeof c.persistence!=="string"||
   typeof c.readable!=="boolean")throw Error("P4_INV_BAD_CATALOG_RECORD");
  have.set(name,{persistence:c.persistence,readable:c.readable});
 }
 const good=[...have.values()].filter(x=>x.persistence==="p"&&x.readable).length;
 const missing=P4_REQUIRED_SOURCE_TABLES.length-have.size;
 const wrong=have.size-good;
 const prefix={...base,inspectedRelations:have.size,
  loggedAndReadableRelations:good,unavailableRelations:missing,
  unloggedOrUnreadableRelations:wrong};
 if(missing||wrong)return {...prefix,
  status:"BLOCKED_MISSING_OR_UNREADABLE_SOURCE_RELATIONS"};
 const qresult=await db.query(P4_INV_FIDS_SQL,[scope.airport,scope.auditUtc]);
 if(!qresult||!Array.isArray(qresult.rows)||qresult.rows.length>TOP)
  throw Error("P4_INV_FIDS_SAMPLE_OVER_BOUND");
 const queries=new Map<string,{hash:string;rawReady:boolean}>();
 let rawReady=0,rawUnready=0;
 for(const val of qresult.rows){
  const row=r(val);
  if(typeof row.query_id!=="string"||!UUID.test(row.query_id)||
   queries.has(row.query_id)||row.airport!==scope.airport||
   typeof row.response_hash!=="string"||!SHA.test(row.response_hash)||
   typeof row.raw_present!=="boolean")
   throw Error("P4_INV_INVALID_SOURCE_RECEIPT");
  if(date(row.available_at)>now||date(row.service_start)>=date(row.service_end))
   throw Error("P4_INV_SOURCE_CLOCK_INCONSISTENCY");
  const ready=row.raw_present===true&&row.raw_expired_at_utc===null;
  queries.set(row.query_id,{hash:row.response_hash,rawReady:ready});
  if(ready)rawReady++;else rawUnready++;
 }
 let total=0,operating=0,excluded=0;
 const asOf={"T-24h":0,"T-6h":0,"T-90m":0};
 if(queries.size){
  const population=await db.query(P4_INV_POPULATION_SQL,[[...queries.keys()]]);
  if(!population||!Array.isArray(population.rows)||population.rows.length>MAX_MEMBER)
   throw Error("P4_INV_POPULATION_SAMPLE_TRUNCATED");
  total=population.rows.length;
  for(const val of population.rows){
   const p=r(val),q=queries.get(String(p.query_id));
   if(!q||typeof p.response_hash!=="string"||p.response_hash!==q.hash)
    throw Error("P4_INV_POPULATION_QUERY_LINEAGE_MISMATCH");
   const legitimate=p.canonical_id!==null&&typeof p.canonical_id==="string"&&
    p.canonical_id.length>0&&
    p.population_role==="requested_airport_primary"&&
    p.scope==="confirmed_core"&&p.codeshare==="confirmed_operating_leg"&&
    q.rawReady&&p.provider_content_expired_at_utc===null;
   if(!legitimate){excluded++;continue;}
   if(p.available_at===null||p.dep_scheduled_utc===null){excluded++;continue;}
   const scheduled=date(p.dep_scheduled_utc),available=date(p.available_at);
   if(available>now){excluded++;continue;}
   operating++;
   if(available<=scheduled-86400000)asOf["T-24h"]++;
   if(available<=scheduled-21600000)asOf["T-6h"]++;
   if(available<=scheduled-5400000)asOf["T-90m"]++;
  }
 }
 const since=new Date(now-7*86400000).toISOString();
 const blob=await db.query(P4_INV_BLOB_SQL,[since,scope.auditUtc]);
 if(!blob||!Array.isArray(blob.rows)||blob.rows.length>MAX_BLOBS)
  throw Error("P4_INV_BLOB_METADATA_TRUNCATED");
 let still=0,expired=0,invalid=0;
 for(const val of blob.rows){
  const b=r(val);
  const safe=b.source_kind==="webhook"&&b.content_class==="raw_provider_content"&&
   typeof b.content_sha256==="string"&&SHA.test(b.content_sha256)&&
   Number.isSafeInteger(Number(b.content_bytes))&&Number(b.content_bytes)>0&&
   typeof b.source_record_id==="string"&&b.source_record_id.startsWith("prepaid:");
  if(!safe){invalid++;continue;}
  const persisted=date(b.persisted_at_utc),expires=date(b.expires_at_utc);
  if(expires<=persisted){invalid++;continue;}
  if(b.deleted_at_utc!==null||expires<=now)expired++;else still++;
 }
 return {
  ...prefix,
  status:queries.size===0?"NO_SAMPLED_FIDS_SOURCE_OBSERVED_NOT_ZERO_COVERAGE":
    blob.rows.length?"FIDS_AND_WEBHOOK_METADATA_SAMPLE_NOT_SCIENCE_PASS":
    "FIDS_METADATA_SAMPLE_NOT_SCIENCE_PASS",
  latestFidsQuerySample:queries.size,
  fidsQueriesWithUnexpiredInlineRaw:rawReady,
  fidsQueriesWithExpiredOrMissingRaw:rawUnready,
  candidatePopulationRows:total,candidateOperatingLegRows:operating,
  candidateRowsBeforeScheduledHorizon:asOf,
  ambiguousOrOtherPopulationRows:excluded,
  webhookOriginalBlobRefsSample:blob.rows.length,
  webhookUnexpiredLedgerRefs:still,
  webhookExpiredOrDeletedLedgerRefs:expired,
  webhookInvalidLedgerRefs:invalid
 };
}
