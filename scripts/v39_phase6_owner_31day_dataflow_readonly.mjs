/**
 * Phase 5→6 owner-readable LIVE DATABASE VISIBILITY (READ-ONLY ONLY).
 *
 * Not a flight data export: does not SELECT or print provider payloads,
 * flight IDs, passenger IDs, airport/route rows, API credentials or DB URLs.
 * Last 31 *UTC calendar days* are a diagnostic lookback, NOT the signed
 * 31 parent-day Phase6 experiment calendar. Day counts are sampled/capped.
 * Reuses existing Replit-attached neondb and all installed V0079–V0093.
 *
 * This is deliberately an owner-private CLI rather than a public GitHub log:
 * even run metadata must remain count/limited-ID only in Actions.
 */
import "dotenv/config";
import pg from "pg";
import {fileURLToPath} from "node:url";
import {resolve} from "node:path";

export const P6_OWNER_VISIBILITY_SCHEMA="v39.phase6.owner-readonly-dataflow.v1";
export const P6_OWNER_SAMPLE_LIMIT=1201;
export const P6_OWNER_TABLES=Object.freeze([
 ["SOURCE ORIGINALS","clean.fids_query_response",
  ["available_at","raw_persisted_at_utc"],"Provider FIDS originals and availability"],
 ["NORMALIZED FLIGHTS","clean.flight_population",
  ["available_at","created_at"],"Source-bound normalized flight population"],
 ["PRE SNAPSHOTS","clean.flight_snapshots",
  ["created_at","available_at","captured_at_utc"],"Immutable PRE snapshots; counts do not prove cutoff safety"],
 ["COLLECTION BATCHES","clean.adb_collection_batches",
  ["started_at","created_at"],"Run/Alert batch metadata"],
 ["ALERT SUBSCRIPTIONS","clean.adb_collection_subs",
  ["created_at","started_at"],"Subscriptions requested, not delivered callbacks"],
 ["WEBHOOK RECEIPTS","clean.raw_delivery",
  ["received_at_utc","created_at"],"Raw webhook receipt metadata, not ACK durability proof"],
 ["WEBHOOK ITEMS","clean.raw_delivery_item",
  ["created_at","received_at_utc"],"Webhook items after ingestion"],
 ["WEBHOOK IDENTITIES","clean.webhook_identity_resolution",
  ["resolved_at_utc","created_at"],"Resolved/ambiguous provider identities"],
 ["SEMANTIC EVENTS","clean.flight_events",
  ["created_at","received_at"],"Provider semantic event records"],
 ["POST / OUTCOMES","clean.flight_outcomes",
  ["updated_at","created_at"],"Outcome rows; no assumption actual runway"],
 ["AIRBORNE RAW","clean.raw_airborne_events",
  ["created_at","received_at_utc"],"Airborne data presence, separate from FIDS"],
 ["AIRBORNE CLEAN","clean.clean_airborne_points",
  ["created_at","received_at_utc"],"Cleaned airborne points"],
 ["FLIGHT PRE / POST VIEW","clean.flight_data_pre_post",
  ["received_at","created_at"],"Convenience flight view, not deduplicated physical flights"],
 ["B0062 CALENDAR","clean.adb_phase6_calendar_day",
  ["created_at","updated_at_utc"],"Prospective plan days, not actual observed flights"],
 ["SOURCE QUERY RESERVATIONS","clean.phase5_fids_allowed_query_v39",
  ["created_at_utc","created_at"],"Approved query reservations, not provider originals"],
 ["PAID REST ATTEMPTS","clean.phase5_fids_physical_attempt_v39",
  ["created_at_utc","created_at"],"Physical attempt ledger, not successful observation"],
 ["BOUND SOURCE ORIGINALS","clean.phase5_fids_original_binding_v39",
  ["created_at_utc","created_at"],"Exact saved-original bindings"],
 ["PRE QUEUE","clean.phase5_cd_pre_task_v39",
  ["created_at_utc","created_at"],"Pending/complete queue evidence; exact table may differ"],
 ["PRIVATE PACKET TRANSPORT","phase6_private.frozen_native_packet_v39",
  ["committed_at_utc"],"Private reviewed registry bytes; never select bytes"],
 ["PROVIDER BLOB EXPIRY","clean.provider_content_blob_ref",
  ["persisted_at_utc","created_at_utc"],"Content expiry/deletion metadata; not backup deletion"]
]);
const IDENT=/^[a-z_][a-z0-9_]*$/;
const safe=(x)=>typeof x==="string"&&IDENT.test(x);
const block=(msg)=>{throw Error("HOLD_P6_OWNER_VISIBILITY_"+msg);};
function dayOfUtc(v){
 const s=v instanceof Date?v.toISOString():String(v);
 if(!/^\d{4}-\d\d-\d\d(?:T|\s)/.test(s))block("BAD_UTC_DAY");
 return s.slice(0,10);
}
export function classifyP6ReadOnlyTable({present,canRead,columns,rows}){
 if(!present)return "ABSENT_NOT_A_ZERO";
 if(!canRead)return "DENIED_NOT_A_ZERO";
 if(!Array.isArray(columns)||columns.length===0)return "UNKNOWN_COLUMNS";
 if(rows===null)return "AVAILABLE_METADATA_ONLY_NO_CLOCK";
 if(!Number.isSafeInteger(rows)||rows<0||rows>P6_OWNER_SAMPLE_LIMIT)
  block("BAD_CAPPED_COUNT");
 if(rows===0)return "NO_ROWS_IN_SELECTED_LOOKBACK";
 return rows===P6_OWNER_SAMPLE_LIMIT?"AT_LEAST_SAMPLE_LIMIT_ROWS":
  "EXACT_ROWS_IN_LOOKBACK_UNDER_CAP";
}
export async function inspectP6OwnerDataflowReadOnly(client,{emit=()=>{}}={}){
 if(!client||typeof client.query!=="function")block("INVALID_CLIENT");
 let tx=false;
 const print=(event)=>emit({schema:P6_OWNER_VISIBILITY_SCHEMA,...event});
 const timeline={};
 try{
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");tx=true;
  await client.query("SET LOCAL statement_timeout='7500ms'");
  await client.query("SET LOCAL lock_timeout='1200ms'");
  const b=(await client.query(
   "SELECT current_database() AS db,current_user AS actor,"+
   "current_setting('transaction_read_only') AS ro,"+
   "current_setting('server_version_num')::integer AS version,"+
   "clock_timestamp() AS db_now,"+
   "pg_database_size(current_database())::text AS database_bytes"
  )).rows[0];
  if(!b||b.db!=="neondb"||b.ro!=="on"||b.version<160000||
     b.version>=170000)block("WRONG_PRIMARY_PG16_DATABASE_OR_TRANSACTION");
  const dbNow=new Date(b.db_now);
  if(!Number.isFinite(dbNow.getTime()))block("UNVERIFIED_DB_CLOCK");
  print({event:"RUN_START",description:"Phase6 owner 31-UTC-day dataflow visibility",
   db:b.db,actor:b.actor,dbClockUtc:dbNow.toISOString(),
   databaseBytes:b.database_bytes,lookbackUtcDays:31,
   perTableSampleLimit:P6_OWNER_SAMPLE_LIMIT,
   transaction:"REPEATABLE_READ_READ_ONLY",
   providerCalls:0,databaseWrites:0,paidPhase6Go:false});
  for(const [label,table,candidates,description] of P6_OWNER_TABLES){
   if(!table.split(".").every(safe)||!Array.isArray(candidates)||
      !candidates.every(safe))block("UNSAFE_STATIC_TABLE_IDENTIFIER");
   print({event:"STAGE_START",stage:label,description});
   await client.query("SAVEPOINT p6_table_view");
   try{
    const view=(await client.query(
     "SELECT to_regclass($1) IS NOT NULL AS present,"+
     " CASE WHEN to_regclass($1) IS NOT NULL"+
     " THEN has_table_privilege(current_user,$1,'SELECT')"+
     " ELSE false END AS can_read",[table]
    )).rows[0];
    if(!view?.present||!view.can_read){
     const status=classifyP6ReadOnlyTable({
      present:view?.present===true,canRead:view?.can_read===true,
      columns:[],rows:null});
     print({event:"STAGE_RESULT",stage:label,table,status,
      rowValuesRead:false,reason:"NO_CURRENTLY_VISIBLE_TABLE_OR_GRANT"});
     await client.query("RELEASE SAVEPOINT p6_table_view");
     timeline[label]={status};continue;
    }
    const [schema,name]=table.split(".");
    const cols=(await client.query(
     "SELECT column_name FROM information_schema.columns"+
     " WHERE table_schema=$1 AND table_name=$2 ORDER BY ordinal_position",
     [schema,name]
    )).rows.map(row=>row.column_name);
    const clock=candidates.find(c=>cols.includes(c))??null;
    const expiryColumns=[
     "raw_expired_at_utc","provider_content_expired_at_utc",
     "expires_at_utc","retention_not_after_utc",
     "deletion_verified_at_utc"
    ].filter(c=>cols.includes(c));
    let dateStats=null;
    if(clock){
     // Fixed allowlisted identifiers only; LIMIT protects busy tables.
     // Count ALL sampled rows; no SELECT flight fields or payload bytes.
     const sql="SELECT day_utc::text AS day_utc,COUNT(*)::integer AS n"+
      " FROM (SELECT ("+clock+" AT TIME ZONE 'UTC')::date AS day_utc"+
      " FROM "+table+
      " WHERE "+clock+" >= clock_timestamp()-interval '31 days'"+
      " AND "+clock+" <= clock_timestamp()"+
      " ORDER BY "+clock+" DESC LIMIT "+P6_OWNER_SAMPLE_LIMIT+
      " ) capped GROUP BY day_utc ORDER BY day_utc DESC";
     const r=(await client.query(sql)).rows;
     const days=r.map(x=>({dayUtc:dayOfUtc(x.day_utc),sampleRows:Number(x.n)}));
     const n=days.reduce((a,x)=>a+x.sampleRows,0);
     if(!days.every(x=>Number.isSafeInteger(x.sampleRows)&&
       x.sampleRows>=0)||n>P6_OWNER_SAMPLE_LIMIT)block("BAD_DAY_COUNTS");
     dateStats={clockColumn:clock,
      status:classifyP6ReadOnlyTable({
       present:true,canRead:true,columns:cols,rows:n}),
      rowsSampled:n,lookbackUtcDays:31,countsAreCapped:true,
      days};
    }
    const out={event:"STAGE_RESULT",stage:label,table,
     status:dateStats?.status??"AVAILABLE_METADATA_ONLY_NO_CLOCK",
     columnCount:cols.length,
     timestampColumn:clock,
     hasSensitiveProviderValues:cols.some(c=>/payload|raw_body|response_body|token|secret|flight_?number/i.test(c)),
     expiryMetadataColumns:expiryColumns,
     rowsSampled:dateStats?.rowsSampled??null,
     sampleCapped:dateStats?dateStats.rowsSampled===P6_OWNER_SAMPLE_LIMIT:null,
     days:dateStats?.days??[],
     contentsRead:false,rowValuesRead:false};
    timeline[label]={status:out.status,rowsSampled:out.rowsSampled,
     daysRepresented:out.days.length};
    print(out);
    await client.query("RELEASE SAVEPOINT p6_table_view");
   }catch(e){
    // Outer transaction stays usable after a table's failed read.
    await client.query("ROLLBACK TO SAVEPOINT p6_table_view").catch(()=>{});
    await client.query("RELEASE SAVEPOINT p6_table_view").catch(()=>{});
    const sqlstate=typeof e?.code==="string"&&/^[A-Z0-9]{5}$/.test(e.code)?
      e.code:"UNKNOWN";
    print({event:"STAGE_RESULT",stage:label,table,
     status:"UNKNOWN_NOT_ZERO",sqlstate,contentsRead:false});
    timeline[label]={status:"UNKNOWN_NOT_ZERO"};
   }
  }
  await client.query("ROLLBACK");tx=false;
  print({event:"RUN_SUMMARY",status:"READONLY_METADATA_COMPLETE",
   datasetStages:Object.keys(timeline).length,
   stages:timeline,
   sevenDayContentsPermissionVerified:false,
   thirtyOneDayContentsPermissionVerified:false,
   retainedRawPayloadsExported:0,providerCalls:0,databaseWrites:0,
   flightOutcomeCompletenessNotAssumed:true,
   rightsAndTruePhysicalLabelsNotCertified:true,
   phase5Freeze:false,paidPhase6Go:false});
  return timeline;
 }catch(e){
  if(tx)await client.query("ROLLBACK").catch(()=>{});
  if(String(e?.message??"").startsWith("HOLD_P6_OWNER_VISIBILITY_"))throw e;
  block("SQL_OR_CONNECTION_HELD_CHECK_REDACTED_SQLSTATE");
 }
}
async function main(){
 const emit=(x)=>console.log(JSON.stringify(x));
 if(process.env.GITHUB_ACTIONS==="true"||!process.env.DATABASE_URL)
  block("OWNER_REPLIT_ONLY_DATABASE_URL_NOT_AVAILABLE");
 const client=new pg.Client({
  connectionString:process.env.DATABASE_URL,
  connectionTimeoutMillis:8000,
  options:"-c default_transaction_read_only=on",
  query_timeout:8000,
  application_name:"phase6_owner_31day_dataflow_readonly"
 });
 try{
  await client.connect();
  await inspectP6OwnerDataflowReadOnly(client,{emit});
 }catch{
  console.error("HOLD_P6_OWNER_DATAFLOW_READONLY_NO_PROVIDER_NO_WRITES");
  process.exitCode=2;
 }finally{await client.end().catch(()=>{});}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 await main();
