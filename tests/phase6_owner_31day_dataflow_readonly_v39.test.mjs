import test from "node:test";
import assert from "node:assert/strict";
import {
 P6_OWNER_TABLES,P6_OWNER_SAMPLE_LIMIT,inspectP6OwnerDataflowReadOnly,
 classifyP6ReadOnlyTable,reviewP6OwnerPreFeatureCoverageCounts,
 formatP6OwnerStageHuman
} from "../scripts/v39_phase6_owner_31day_dataflow_readonly.mjs";

function mock({deny=false,invalidClock=false,injectError=false,
 withBlob=false,withPre=false}={}){
 const queries=[],events=[];
 const c={async query(sql,params=[]){
  queries.push([sql,params]);
  if(sql.startsWith("BEGIN ")||sql.startsWith("SET LOCAL ")||
     sql==="SAVEPOINT p6_table_view"||
     sql==="ROLLBACK TO SAVEPOINT p6_table_view"||
     sql==="RELEASE SAVEPOINT p6_table_view"||sql==="ROLLBACK")
   return{rows:[]};
  if(sql.includes("current_database() AS db"))
   return{rows:[{db:"neondb",actor:"neondb_owner",ro:"on",
     version:160016,db_now:invalidClock?"garbled":"2026-11-13T23:01:00Z",
     database_bytes:"75415552"}]};
  if(sql.includes("to_regclass($1) IS NOT NULL AS present"))
   return{rows:[{present:[
     "clean.fids_query_response","clean.adb_phase6_calendar_day",
     ...(withPre?["clean.flight_snapshots"]:[]),
     ...(withBlob?["clean.provider_content_blob_ref"]:[])
    ].includes(params[0]),can_read:!deny}]};
  if(sql.includes("FROM information_schema.columns")){
   if(params[1]==="flight_snapshots")
    return{rows:["created_at","horizon","features_json"].map(column_name=>({column_name}))};
   if(params[1]==="adb_phase6_calendar_day")
    return{rows:[{column_name:"run_day_index"}]};
   if(params[1]==="provider_content_blob_ref")
    return{rows:["persisted_at_utc","expires_at_utc",
      "deletion_verified_at_utc","deleted_at_utc"].map(column_name=>({column_name}))};
   return{rows:[{column_name:"available_at"},{column_name:"raw_payload"},
     {column_name:"raw_expired_at_utc"}]};
  }
  if(sql.includes("SELECT COUNT(*)::integer AS n FROM (SELECT 1 FROM "))
   return{rows:[{n:sql.includes("adb_phase6_calendar_day")?2:
    sql.includes("provider_content_blob_ref")?65:3}]};
  if(sql.includes("AS marked_deleted_but_unverified"))
   return{rows:[{n:65,marked_deleted_but_unverified:11,
    no_delete_marker:54,older_31d:29}]};
  if(sql.includes("AS with_nonnull_feature"))
   return{rows:[
    {horizon:"T-24h",n:1,invalid_shape:0,empty_feature_array:1,
     with_feature_items:0,with_nonnull_feature:0},
    {horizon:"T-6h",n:1,invalid_shape:0,empty_feature_array:0,
     with_feature_items:1,with_nonnull_feature:1},
    {horizon:"T-90m",n:1,invalid_shape:0,empty_feature_array:0,
     with_feature_items:1,with_nonnull_feature:0}
   ]};
  if(sql.includes("SELECT day_utc::text AS day_utc")){
   if(injectError){const e=new Error("secret api key never printed");
    e.code="42501";throw e;}
   return{rows:[{day_utc:"2026-11-13",n:2},{day_utc:"2026-11-12",n:1}]};
  }
  throw Error("UNEXPECTED_TEST_SQL:"+sql.slice(0,100));
 }};
 return{c,queries,events};
}
test("fixed owner 31-day catalog cannot take free-form table SQL",()=>{
 assert(P6_OWNER_TABLES.length>=15);
 assert(P6_OWNER_TABLES.every(x=>/^(clean|phase6_private)\.[a-z0-9_]+$/.test(x[1])));
 assert.equal(new Set(P6_OWNER_TABLES.map(x=>x[1])).size,P6_OWNER_TABLES.length);
 assert.equal(P6_OWNER_SAMPLE_LIMIT,1201);
});
test("cold schema is NOT an observed zero and sampled cap never exact",()=>{
 assert.equal(classifyP6ReadOnlyTable({present:false,canRead:false,columns:[],rows:null}),
  "ABSENT_NOT_A_ZERO");
 assert.equal(classifyP6ReadOnlyTable({present:true,canRead:false,columns:[],rows:null}),
  "DENIED_NOT_A_ZERO");
 assert.equal(classifyP6ReadOnlyTable({present:true,canRead:true,columns:["x"],rows:1201}),
  "AT_LEAST_SAMPLE_LIMIT_ROWS");
 assert.equal(classifyP6ReadOnlyTable({present:true,canRead:true,columns:["x"],rows:3}),
  "EXACT_ROWS_IN_LOOKBACK_UNDER_CAP");
 assert.throws(()=>classifyP6ReadOnlyTable({
  present:true,canRead:true,columns:["x"],rows:1202}),/BAD_CAPPED_COUNT/);
});
test("read-only pipeline emits chronological stage counts and never selects data bytes",async()=>{
 const x=mock();
 const t=await inspectP6OwnerDataflowReadOnly(x.c,{emit:e=>x.events.push(e)});
 assert.equal(t["SOURCE ORIGINALS"].rowsSampled,3);
 assert.equal(t["SOURCE ORIGINALS"].allTimeRowsSampled,3);
 assert.equal(t["PRE SNAPSHOTS"].status,"ABSENT_NOT_A_ZERO");
 assert.equal(t["B0062 CALENDAR"].status,"EXACT_ROWS_ALL_TIME_UNDER_CAP_NO_CLOCK");
 assert.equal(t["B0062 CALENDAR"].allTimeRowsSampled,2);
 assert(x.events.some(e=>e.stage==="SOURCE ORIGINALS"&&e.event==="STAGE_START"));
 assert(x.events.some(e=>e.stage==="SOURCE ORIGINALS"&&e.event==="STAGE_RESULT"&&
  e.hasSensitiveProviderValues===true&&e.contentsRead===false));
 const end=x.events.find(e=>e.event==="RUN_SUMMARY");
 assert(end&&end.databaseWrites===0&&end.providerCalls===0&&end.paidPhase6Go===false);
 assert.equal(x.events.filter(e=>e.event==="STAGE_RESULT").length,P6_OWNER_TABLES.length);
 assert(x.queries.some(q=>q[0]==="ROLLBACK"));
 assert(!x.queries.some(q=>/\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bCREATE\b|\bCOMMIT\b/.test(q[0])));
 assert(!x.queries.some(q=>/SELECT\s+.*(?:raw_payload|raw_body|payload_bytes)/.test(q[0])));
 assert(!JSON.stringify(x.events).includes("raw_payload"));
});
test("expired refs classified without claiming any object is actually present",async()=>{
 const x=mock({withBlob:true});
 await inspectP6OwnerDataflowReadOnly(x.c,{emit:e=>x.events.push(e)});
 const e=x.events.find(e=>e.event==="STAGE_RESULT"&&e.stage==="PROVIDER BLOB EXPIRY");
 assert.equal(e.expiredProviderBlobReview.sampledExpiredUnverified,65);
 assert.equal(e.expiredProviderBlobReview.noDeletionMarker,54);
 assert.equal(e.expiredProviderBlobReview.deletionMarkedButUnverified,11);
 assert.equal(e.expiredProviderBlobReview.referencePersistedMoreThan31DaysAgo,29);
 assert.equal(e.expiredProviderBlobReview.physicalObjectPresentUnknown,true);
 const line=formatP6OwnerStageHuman(e);
 assert(line.includes("65"));
 assert(line.includes("object presence NOT checked"));
 assert(x.queries.some(q=>q[0].includes("LIMIT 1201")));
 assert(!x.queries.some(q=>/SELECT\\s+.*(?:payload_bytes|raw_body|object_name)/.test(q[0])));
});
test("permission denied is UNKNOWN, not zero",async()=>{
 const x=mock({deny:true});
 await inspectP6OwnerDataflowReadOnly(x.c,{emit:e=>x.events.push(e)});
 assert.equal(x.events.find(e=>e.stage==="SOURCE ORIGINALS"&&e.event==="STAGE_RESULT").status,
  "DENIED_NOT_A_ZERO");
});
test("SQL error stays redacted and savepoint rolls back before next stage",async()=>{
 const x=mock({injectError:true});
 await inspectP6OwnerDataflowReadOnly(x.c,{emit:e=>x.events.push(e)});
 const f=x.events.find(e=>e.stage==="SOURCE ORIGINALS"&&e.event==="STAGE_RESULT");
 assert.equal(f.status,"UNKNOWN_NOT_ZERO");
 assert.equal(f.sqlstate,"42501");
 assert(!JSON.stringify(x.events).includes("secret api key"));
 assert(x.queries.some(q=>q[0]==="ROLLBACK TO SAVEPOINT p6_table_view"));
});
test("human-readable actual stage logs preserve counts but never print provider payloads",async()=>{
 const x=mock();
 await inspectP6OwnerDataflowReadOnly(x.c,{emit:e=>x.events.push(e)});
 const lines=x.events.map(formatP6OwnerStageHuman);
 assert(lines.some(s=>s.includes("[START] Connected to existing neondb")));
 assert(lines.some(s=>s.includes("[CHECK] SOURCE ORIGINALS")));
 assert(lines.some(s=>s.includes("[RESULT] SOURCE ORIGINALS")&&s.includes("3 recent rows")));
 assert(lines.some(s=>s.includes("[FINISH]")&&s.includes("database writes=0")));
 assert(!lines.join("\n").includes("raw_payload"));
 assert(!lines.join("\n").includes("secret"));
});
test("unverified DB clock holds without collecting or printing provider rows",async()=>{
 const x=mock({invalidClock:true});
 await assert.rejects(inspectP6OwnerDataflowReadOnly(x.c,{
  emit:e=>x.events.push(e)}),/HOLD_P6_OWNER_VISIBILITY_UNVERIFIED_DB_CLOCK/);
 assert.equal(x.events.length,0);
 assert(x.queries.some(q=>q[0]==="ROLLBACK"));
});

test("PRE feature coverage aggregates are per-horizon counts only, not scientific label acceptance",()=>{
 const good=reviewP6OwnerPreFeatureCoverageCounts([
  {horizon:"T-90m",n:3,invalid_shape:1,empty_feature_array:1,
   with_feature_items:1,with_nonnull_feature:0},
  {horizon:"T-6h",n:2,invalid_shape:0,empty_feature_array:0,
   with_feature_items:2,with_nonnull_feature:1}
 ]);
 assert.equal(good.sampledTotal,5);
 assert.equal(good.byHorizon[0].horizon,"T-6h");
 assert.equal(good.byHorizon[0].allFeaturesEmptyOrNull,1);
 assert.equal(good.byHorizon[1].allFeaturesEmptyOrNull,3);
 assert.equal(good.physicalDepartureLabelsVerified,false);
 assert.equal(good.originalProviderContentsOrMLRightsCertified,false);
 assert.equal(good.rawFlightValuesTransferredToOwnerCli,false);
 assert.throws(()=>reviewP6OwnerPreFeatureCoverageCounts([
  {horizon:"T-6h",n:1,invalid_shape:0,empty_feature_array:0,
   with_feature_items:1,with_nonnull_feature:2}
 ]),/PRE_FEATURE_AGGREGATE_CONTRADICTION/);
 assert.throws(()=>reviewP6OwnerPreFeatureCoverageCounts([
  {horizon:"SOME-NEW-UNREVIEWED",n:1,invalid_shape:0,
   empty_feature_array:1,with_feature_items:0,with_nonnull_feature:0}
 ]),/PRE_FEATURE_AGGREGATE_CONTRADICTION/);
});
test("existing PRE owner visibility shows only bounded nonnull feature counts without flight values",async()=>{
 const x=mock({withPre:true});
 await inspectP6OwnerDataflowReadOnly(x.c,{emit:e=>x.events.push(e)});
 const e=x.events.find(e=>e.event==="STAGE_RESULT"&&e.stage==="PRE SNAPSHOTS");
 assert.equal(e.preFeatureCoverage.sampledTotal,3);
 assert.equal(e.preFeatureCoverage.byHorizon.length,3);
 assert.equal(e.preFeatureCoverage.byHorizon[0].atLeastOneNonNullFeatureValue,0);
 assert.equal(e.preFeatureCoverage.byHorizon[1].atLeastOneNonNullFeatureValue,1);
 assert.equal(e.preFeatureCoverage.byHorizon[2].atLeastOneNonNullFeatureValue,0);
 assert.equal(e.preFeatureCoverage.physicalDepartureLabelsVerified,false);
 assert.equal(e.contentsRead,false);
 assert.equal(e.rowValuesRead,false);
 assert(!JSON.stringify(x.events).includes("PRIVATE_ORIGINAL_FLIGHT_VALUE"));
 assert(x.queries.some(([sql])=>sql.includes("AS with_nonnull_feature")&&
   sql.includes("LIMIT 1201")&&sql.includes("GROUP BY horizon")));
 assert(!x.queries.some(([sql])=>/SELECT\s+flight_instance_id|SELECT\s+features_json|SELECT\s+raw_payload/.test(sql)));
 const readable=formatP6OwnerStageHuman(e);
 assert(readable.includes("T-6h=1/1 with ≥1 non-null feature"));
 assert(readable.includes("not label or ML readiness"));
});
