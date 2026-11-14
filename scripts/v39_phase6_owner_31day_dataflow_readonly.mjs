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
export const P6_OWNER_PRE_HORIZONS=Object.freeze(["T-24h","T-6h","T-90m"]);
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
 if(!/^\d{4}-\d\d-\d\d(?:T|\s|$)/.test(s))block("BAD_UTC_DAY");
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

/**
 * Counts-only, bounded existing PRE feature visibility.
 * No flight IDs, feature names, provider values, sample rows or training
 * payloads leave SQL. Empty/non-null does not itself establish label
 * correctness, completeness, provenance, lawful use or model quality.
 */
export function reviewP6OwnerPreFeatureCoverageCounts(rows){
 if(!Array.isArray(rows)||rows.length>3)block("PRE_FEATURE_AGGREGATE_SHAPE");
 const seen=new Set(),out=[];
 let total=0;
 for(const r of rows){
  const n=Number(r?.n),invalid=Number(r?.invalid_shape),
   empty=Number(r?.empty_feature_array),
   withItems=Number(r?.with_feature_items),
   usable=Number(r?.with_nonnull_feature);
  if(!P6_OWNER_PRE_HORIZONS.includes(r?.horizon)||
     seen.has(r.horizon)||
     ![n,invalid,empty,withItems,usable].every(x=>
      Number.isSafeInteger(x)&&x>=0&&x<=P6_OWNER_SAMPLE_LIMIT)||
     invalid+empty+withItems!==n||
     usable>withItems||
     total+n>P6_OWNER_SAMPLE_LIMIT)
   block("PRE_FEATURE_AGGREGATE_CONTRADICTION");
  seen.add(r.horizon);total+=n;
  out.push(Object.freeze({
   horizon:r.horizon,sampledPreSnapshots:n,
   missingOrInvalidFeatureArray:invalid,
   emptyFeatureArray:empty,
   anyFeatureObjects:withItems,
   atLeastOneNonNullFeatureValue:usable,
   allFeaturesEmptyOrNull:n-usable
  }));
 }
 out.sort((a,b)=>P6_OWNER_PRE_HORIZONS.indexOf(a.horizon)-
  P6_OWNER_PRE_HORIZONS.indexOf(b.horizon));
 return Object.freeze({
  status:total===0?"NO_PRE_ROWS_IN_CAPPED_RECENT_LOOKBACK":
   total===P6_OWNER_SAMPLE_LIMIT?"CAPPED_PRE_SAMPLE_NOT_A_31DAY_DENOMINATOR":
   "PRE_FEATURE_PRESENCE_COUNTS_ONLY_NOT_MODEL_READINESS",
  sampledTotal:total,limit:P6_OWNER_SAMPLE_LIMIT,
  countMayBeCapped:total===P6_OWNER_SAMPLE_LIMIT,
  byHorizon:out,
  physicalDepartureLabelsVerified:false,
  originalProviderContentsOrMLRightsCertified:false,
  rawFlightValuesTransferredToOwnerCli:false,
  legitimateFeatureUseAtForecastIssuanceCertifiedHere:false
 });
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
    // Schema-level hint only: a column named response_headers does not
    // prove the original FIDS response actually retained Cache-Control.
    // Never SELECT header values; they may include credentials.
    const httpHeaderMetadataColumns=cols.filter(c=>
      /^(cache_control|cache_control_max_age|http_response_headers|response_headers|raw_response_headers|original_response_headers)$/.test(c));
    // All-time capped presence/volume is separate from 31-day lookback.
    // Without a recognized timestamp, NEVER report zero or call it recent.
    const boundedAllTime=(await client.query(
      "SELECT COUNT(*)::integer AS n FROM (SELECT 1 FROM "+table+
      " LIMIT "+P6_OWNER_SAMPLE_LIMIT+") bounded"
    )).rows[0]?.n;
    const totalN=Number(boundedAllTime);
    if(!Number.isSafeInteger(totalN)||totalN<0||
       totalN>P6_OWNER_SAMPLE_LIMIT)block("BAD_CAPPED_ALL_TIME_COUNT");
    const allTimeSample={
      rowsSampled:totalN,
      status:totalN===P6_OWNER_SAMPLE_LIMIT?
       "AT_LEAST_SAMPLE_LIMIT_ALL_TIME":
       "EXACT_ALL_TIME_UNDER_CAP",
      cap:P6_OWNER_SAMPLE_LIMIT
    };
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
    // Real PRE queue state is more useful than counting tasks alone.
    // Strict state enumeration: never SELECT flight_instance_id or packet.
    let taskStates=null;
    if(table==="clean.phase5_cd_pre_task_v39"&&
       cols.includes("state")&&clock){
      const stateSql="SELECT state,COUNT(*)::integer AS n FROM ("+
       "SELECT state FROM "+table+" WHERE "+clock+
       " >= clock_timestamp()-interval '31 days' "+
       "ORDER BY "+clock+" DESC LIMIT "+P6_OWNER_SAMPLE_LIMIT+
       ") bounded GROUP BY state ORDER BY state";
      const stateResult=(await client.query(stateSql)).rows;
      const allowed=new Set(["READY","CLAIMED","WRITE_STARTED_UNKNOWN",
       "VERIFIED_ON_TIME","MISSED","QUARANTINED"]);
      if(stateResult.some(x=>!allowed.has(x.state)||
         !Number.isSafeInteger(Number(x.n))||Number(x.n)<0))
        block("UNKNOWN_PRE_QUEUE_STATE");
      taskStates=stateResult.map(x=>({state:x.state,count:Number(x.n)}));
    }
    // PRE science visibility: only counts, never SELECT any feature value
    // to this process. A missing features_json column means UNKNOWN, not 0.
    let preFeatureCoverage=null;
    if(table==="clean.flight_snapshots"){
     if(!clock||!cols.includes("horizon")||
        !cols.includes("features_json")||!cols.includes("created_at")){
      preFeatureCoverage={status:"UNKNOWN_REQUIRED_PRE_FEATURE_METADATA",
       sampledTotal:null,byHorizon:[],
       physicalDepartureLabelsVerified:false,
       rawFlightValuesTransferredToOwnerCli:false};
     }else{
      // Bounded newest rows only. Evaluate JSON fields inside PostgreSQL,
      // expose ONLY the per-horizon aggregated sample counts.
      const safeJson="CASE WHEN jsonb_typeof(features_json::jsonb)='array'"+
       " THEN features_json::jsonb ELSE '[]'::jsonb END";
      const valid="jsonb_typeof(features_json::jsonb)='array'";
      // Classify each bounded row BEFORE GROUP BY. A correlated EXISTS
      // inside aggregate FILTER could trigger PostgreSQL ungrouped-column
      // errors on the raw private JSON. Return only five count columns.
      const sql="SELECT horizon,COUNT(*)::integer AS n,"+
       "COUNT(*) FILTER (WHERE invalid_shape)::integer AS invalid_shape,"+
       "COUNT(*) FILTER (WHERE empty_array)::integer AS empty_feature_array,"+
       "COUNT(*) FILTER (WHERE has_items)::integer AS with_feature_items,"+
       "COUNT(*) FILTER (WHERE has_nonnull)::integer AS with_nonnull_feature"+
       " FROM (SELECT horizon,"+
       " (features_json IS NULL OR NOT ("+valid+"))"+
          " AS invalid_shape,"+
       " ("+valid+" AND jsonb_array_length("+safeJson+")=0)"+
          " AS empty_array,"+
       " ("+valid+" AND jsonb_array_length("+safeJson+")>0)"+
          " AS has_items,"+
       " EXISTS (SELECT 1 FROM jsonb_array_elements("+safeJson+")"+
          " AS v(field) WHERE jsonb_typeof(v.field)='object'"+
          " AND v.field ? 'value'"+
          " AND v.field->'value' <> 'null'::jsonb)"+
          " AS has_nonnull"+
       " FROM (SELECT horizon,features_json FROM clean.flight_snapshots"+
       " WHERE created_at >= clock_timestamp()-interval '31 days'"+
       " AND created_at <= clock_timestamp()"+
       " ORDER BY created_at DESC LIMIT "+P6_OWNER_SAMPLE_LIMIT+
       ") capped) classified GROUP BY horizon ORDER BY horizon";
      preFeatureCoverage=reviewP6OwnerPreFeatureCoverageCounts(
       (await client.query(sql)).rows);
     }
    }
    // Expiry metadata only, not payload. A primary deletion marker
    // cannot prove replicas, PITR/backups, purpose or lawfulness.
    let deletionReview=null;
    if(table==="clean.provider_content_blob_ref"&&
       cols.includes("expires_at_utc")&&
       cols.includes("deletion_verified_at_utc")&&
       cols.includes("persisted_at_utc")){
      const hasDeletedClock=cols.includes("deleted_at_utc");
      const hasPersistClock=cols.includes("persisted_at_utc");
      const z=await client.query(
       "SELECT COUNT(*)::integer AS n,"+
       (hasDeletedClock?
        "COUNT(*) FILTER (WHERE deleted_at_utc IS NOT NULL)::integer"+
        " AS marked_deleted_but_unverified,"+
        "COUNT(*) FILTER (WHERE deleted_at_utc IS NULL)::integer"+
        " AS no_delete_marker,":
        "NULL::integer AS marked_deleted_but_unverified,"+
        "NULL::integer AS no_delete_marker,")+
       (hasPersistClock?
        "COUNT(*) FILTER (WHERE persisted_at_utc < "+
        "clock_timestamp()-interval '31 days')::integer AS older_31d":
        "NULL::integer AS older_31d")+
       " FROM (SELECT "+[
        ...(hasDeletedClock?["deleted_at_utc"]:[]),
        ...(hasPersistClock?["persisted_at_utc"]:[])
       ].join(",")+
       " FROM clean.provider_content_blob_ref"+
       " WHERE expires_at_utc<=clock_timestamp()"+
       " AND deletion_verified_at_utc IS NULL LIMIT "+
       P6_OWNER_SAMPLE_LIMIT+") bounded"
      );
      const a=z.rows[0];
      const n=Number(a?.n);
      if(!Number.isSafeInteger(n)||n<0||n>P6_OWNER_SAMPLE_LIMIT)
       block("INVALID_EXPIRED_BLOB_REVIEW_COUNT");
      const numericOrNull=(v)=>v===null?null:
       Number.isSafeInteger(Number(v))&&Number(v)>=0?
       Number(v):block("INVALID_BLOB_BUCKET");
      const marked=numericOrNull(a.marked_deleted_but_unverified);
      const noMarker=numericOrNull(a.no_delete_marker);
      const older=numericOrNull(a.older_31d);
      if((marked!==null&&noMarker!==null&&marked+noMarker!==n)||
         (older!==null&&older>n))block("BLOB_BUCKET_CONTRADICTION");
      deletionReview={status:n===P6_OWNER_SAMPLE_LIMIT?
       "AT_LEAST_SAMPLE_LIMIT_NEEDS_OWNER_INSPECTION":
       n===0?"NO_EXPIRED_UNVERIFIED_BLOBS_IN_SAMPLED_TABLE":
       "EXPIRED_PRIMARY_BLOB_DELETION_NOT_VERIFIED_REVIEW",
       sampledExpiredUnverified:n,
       deletionMarkedButUnverified:marked,
       noDeletionMarker:noMarker,
       referencePersistedMoreThan31DaysAgo:older,
       physicalObjectPresentUnknown:true,
       sourceLegalRightsOrBackupExpiryCertified:false};
    }
    const noClockStatus=totalN===0?"NO_ROWS_ALL_TIME":
      totalN===P6_OWNER_SAMPLE_LIMIT?
       "AT_LEAST_SAMPLE_LIMIT_ALL_TIME_NO_CLOCK":
       "EXACT_ROWS_ALL_TIME_UNDER_CAP_NO_CLOCK";
    const out={event:"STAGE_RESULT",stage:label,table,
     status:dateStats?.status??noClockStatus,
     allTimeSample,
     noRecognizedEventClock:clock===null,
     columnCount:cols.length,
     timestampColumn:clock,
     hasSensitiveProviderValues:cols.some(c=>/payload|raw_body|response_body|token|secret|flight_?number/i.test(c)),
     expiryMetadataColumns:expiryColumns,
     httpHeaderMetadataColumnNames:httpHeaderMetadataColumns,
     authenticatedOriginalCacheControlVerified:false,
     preQueueStateCounts:taskStates,
     preFeatureCoverage,
     expiredProviderBlobReview:deletionReview,
     rowsSampled:dateStats?.rowsSampled??null,
     sampleCapped:dateStats?dateStats.rowsSampled===P6_OWNER_SAMPLE_LIMIT:null,
     days:dateStats?.days??[],
     contentsRead:false,rowValuesRead:false};
    timeline[label]={status:out.status,rowsSampled:out.rowsSampled,
     allTimeRowsSampled:out.allTimeSample.rowsSampled,
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
export function formatP6OwnerStageHuman(e){
 if(!e||e.schema!==P6_OWNER_VISIBILITY_SCHEMA)block("INVALID_HUMAN_STAGE_EVENT");
 if(e.event==="RUN_START")
  return "[START] Connected to existing "+e.db+" as "+e.actor+
   "; DB time "+e.dbClockUtc+
   "; inspecting last "+e.lookbackUtcDays+" UTC days READ ONLY.";
 if(e.event==="STAGE_START")
  return "[CHECK] "+e.stage+": "+e.description;
 if(e.event==="STAGE_RESULT"){
  const status=String(e.status??"UNKNOWN");
  const rows=e.rowsSampled===null||e.rowsSampled===undefined?"no count":
    String(e.rowsSampled)+" recent rows sampled";
  const days=Array.isArray(e.days)&&e.days.length?
    " | UTC dates "+e.days.slice(0,6).map(d=>d.dayUtc+":"+d.sampleRows).join(",")+
    (e.days.length>6?" (+more)":""):"";
  const state=e.preQueueStateCounts?
    " | queue "+e.preQueueStateCounts.map(x=>x.state+":"+x.count).join(","):"";
  const preFeatures=e.preFeatureCoverage?
    " | PRE feature coverage: "+
    (e.preFeatureCoverage.sampledTotal===null?"unknown":
      String(e.preFeatureCoverage.sampledTotal)+" recent sampled")+
    (e.preFeatureCoverage.countMayBeCapped?" (capped)":"")+
    (Array.isArray(e.preFeatureCoverage.byHorizon)?
     e.preFeatureCoverage.byHorizon.map(x=>
      x.horizon+"="+x.atLeastOneNonNullFeatureValue+
      "/"+x.sampledPreSnapshots+" with ≥1 non-null feature").join(","):"")+
    " (not label or ML readiness)":"";
  const deletion=e.expiredProviderBlobReview?
    " | expired blob refs lacking verified deletion: "+
      e.expiredProviderBlobReview.sampledExpiredUnverified+
      " (no deletion marker: "+
      (e.expiredProviderBlobReview.noDeletionMarker??"unknown")+
      ", marked but unverified: "+
      (e.expiredProviderBlobReview.deletionMarkedButUnverified??"unknown")+
      ", refs older than 31d: "+
      (e.expiredProviderBlobReview.referencePersistedMoreThan31DaysAgo??"unknown")+
      "; object presence NOT checked)":"";
  const allTime=e.allTimeSample?
    " | all-time sampled: "+e.allTimeSample.rowsSampled+
    (e.allTimeSample.status==="AT_LEAST_SAMPLE_LIMIT_ALL_TIME"?"+":"")+
    (e.noRecognizedEventClock?" (NO timestamp; NOT 31d)":""):"";
  return "[RESULT] "+e.stage+" — "+status+" | "+rows+days+
    allTime+state+preFeatures+deletion+" | original contents NOT read";
 }
 if(e.event==="RUN_SUMMARY")
  return "[FINISH] "+e.datasetStages+" stages checked; provider calls=0,"+
   " database writes=0; Phase5 FREEZE and Phase6 paid GO remain false."+
   " Table rows are limited samples, not 31-day completeness or data-use rights.";
 block("UNRECOGNIZED_STAGE_EVENT");
}
async function main(){
 const args=process.argv.slice(2);
 if(args.some(x=>x!=="--human"))block("UNKNOWN_ARG_NO_PRIVATE_DUMP");
 const human=args.includes("--human");
 const emit=(x)=>console.log(human?formatP6OwnerStageHuman(x):
   JSON.stringify(x));
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
