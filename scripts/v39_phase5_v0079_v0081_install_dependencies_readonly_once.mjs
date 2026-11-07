/**
 * Phase5 Stage18: metadata-only, exact production schema dependency inventory.
 * Built for owner-reviewed, source-pinned Replit Shell use on the CURRENT DB.
 * NEVER installs V0079/V0080/V0081, executes paid requests, reads aviation
 * records or grants permissions. No authority for science/Phase6 release.
 */
import pg from "pg";
const {Pool}=pg;
const BASE={
  adb_phase6_calendar_day:[
    "run_day_index","scheduled_start_utc","calendar_hash",
    "config_hash","frame_hash"
  ],
  adb_sampling_draw:[
    "run_day_index","slot_id","selected_icao","selected_at_utc"
  ],
  fids_query_response:[
    "population_query_id","source_airport_icao","query_direction",
    "service_window_start_utc","service_window_end_utc",
    "from_local","to_local","airport_iana_timezone",
    "provider_api_version","fids_protocol_version","openapi_sha256",
    "fids_retrieval_utc","raw_persisted_at_utc","available_at",
    "response_hash","raw_payload","raw_expired_at_utc"
  ],
  flight_population:[
    "population_query_id","source_airport_icao","dep_airport_icao",
    "source_type","available_at","population_member_id",
    "analytic_identity_id","canonical_flight_instance_id",
    "population_role","scope_classification","codeshare_resolution_status",
    "provider_content_expired_at_utc","dep_scheduled_utc"
  ],
  flight_snapshots:[
    "id","flight_instance_id","horizon","prediction_state",
    "population_member_id","selected_t_milestone_utc","selected_t_version",
    "population_query_id","fids_response_hash","frame_hash","config_hash",
    "prediction_cutoff_utc","created_at"
  ]
};
const V0079=[
 "phase5_fids_cycle_budget_v39","phase5_fids_day_budget_v39",
 "phase5_fids_utc_charge_budget_v39","phase5_fids_allowed_query_v39",
 "phase5_fids_physical_attempt_v39","phase5_fids_original_binding_v39"
];
const V0080=["phase5_fids_github_prearm_v39"];
const V0081=["phase5_t24_postcommit_witness_v39"];
const ALL=[...Object.keys(BASE),...V0079,...V0080,...V0081];
const fail=(s)=>{throw Error("REFUSED_P5_STAGE18_DEPENDENCY_"+s);};

export const P5_STAGE18_CATALOG_SQL=[
 "SELECT c.relname AS table_name,",
 "array_agg(a.attname ORDER BY a.attname)",
 "FILTER(WHERE a.attnum>0 AND NOT a.attisdropped) AS column_names",
 "FROM pg_catalog.pg_class c",
 "JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace",
 "LEFT JOIN pg_catalog.pg_attribute a ON a.attrelid=c.oid",
 "WHERE n.nspname='clean' AND c.relkind IN ('r','p')",
 "AND c.relname=ANY($1::text[])",
 "GROUP BY c.oid,c.relname ORDER BY c.relname"
].join(" ");

export async function auditPhase5InstallDependenciesReadonly(pool){
 if(!pool||typeof pool.connect!=="function")fail("NO_DB");
 const c=await pool.connect();let active=false;
 try{
  await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  active=true;
  await c.query("SET LOCAL statement_timeout='8000ms'");
  await c.query("SET LOCAL lock_timeout='1000ms'");
  const head=(await c.query(
   "SELECT current_database() AS db,"+
   "current_setting('transaction_read_only') AS ro,"+
   "current_setting('server_version_num') AS pg_version,"+
   "pg_is_in_recovery() AS replica,clock_timestamp() AS at,"+
   "has_schema_privilege(current_user,'clean','USAGE') AS usage,"+
   "has_schema_privilege(current_user,'clean','CREATE') AS can_create"
  )).rows;
  if(head.length!==1||head[0].db!=="neondb"||head[0].ro!=="on"||
     head[0].replica!==false||
     !Number.isInteger(Number(head[0].pg_version))||
     Number(head[0].pg_version)<160000)fail("EXPECTED_PRIMARY_PG16_DB");
  const at=new Date(head[0].at);
  if(!Number.isFinite(at.getTime()))fail("DB_CLOCK_UNKNOWN");
  const rs=(await c.query(P5_STAGE18_CATALOG_SQL,[ALL])).rows;
  if(!Array.isArray(rs)||rs.length>ALL.length)fail("INVALID_CATALOG_ROWS");
  const found=new Map();
  for(const row of rs){
   if(!ALL.includes(row.table_name)||found.has(row.table_name)||
      !Array.isArray(row.column_names)||
      row.column_names.some(n=>typeof n!=="string"))fail("BAD_CATALOG_ROW");
   found.set(row.table_name,new Set(row.column_names));
  }
  const baseline=Object.entries(BASE).map(([table,required])=>({
   table,presentInCatalog:found.has(table),
   requiredColumnsPresent:found.has(table)&&
     required.every(col=>found.get(table).has(col)),
   missingRequiredColumns:required.filter(col=>!found.get(table)?.has(col))
  }));
  const stage=(arr)=>({
   expectedRelations:arr.length,
   presentRelations:arr.filter(x=>found.has(x)).length,
   relationPresence:arr.map(table=>({table,presentInCatalog:found.has(table)}))
  });
  const stage79=stage(V0079),stage80=stage(V0080),stage81=stage(V0081);
  const baselineReady=baseline.every(x=>x.requiredColumnsPresent);
  const stagedEmpty=stage79.presentRelations===0&&
   stage80.presentRelations===0&&stage81.presentRelations===0;
  const stagedComplete=stage79.presentRelations===6&&
   stage80.presentRelations===1&&stage81.presentRelations===1;
  const stagePartial=!stagedEmpty&&!stagedComplete;
  let classification=baselineReady?
    (stagedEmpty?"BASELINE_PRESENT_ALL_STAGED_ABSENT_NOT_INSTALLED":
      stagedComplete?"STAGED_TABLES_PRESENT_ACL_AND_FUNCTIONS_UNVERIFIED":
        "STAGED_SCHEMA_PARTIAL_OR_OUT_OF_ORDER_HOLD"):
    "BASELINE_COLUMNS_MISSING_OR_TABLE_ABSENT_HOLD";
  await c.query("COMMIT");active=false;
  return {
   schema:"v39.phase5.stage18.install-dependency-catalog-readonly.v1",
   status:"INSTALL_DEPENDENCIES_INSPECTED_READONLY_NO_RELEASE",
   observedAtUtc:at.toISOString(),
   expectedPrimaryDatabaseVerified:true,postgres16OrLater:true,
   transactionReadOnlyVerified:true,
   currentRoleHasCleanSchemaUsage:head[0].usage===true,
   currentRoleCanCreateInClean:head[0].can_create===true,
   baseline,baselineRequiredColumnsPresent:baselineReady,
   v0079:stage79,v0080:stage80,v0081:stage81,
   stageTableSetAllAbsent:stagedEmpty,
   stageTableSetAllPresent:stagedComplete,
   stagedSchemaPartialOrOutOfOrder:stagePartial,
   classification,
   reviewedMigrationOrder:["V0079","V0080","V0081"],
   columnTypesAndConstraintsVerified:false,
   SQLFunctionTriggerAndRoleGrantsVerified:false,
   frozenCalendarAndProviderRightsVerified:false,
   providerNativeTAndPhysicalLegVerified:false,
   productionInstallAuthorized:false,
   paidProviderRequests:0,alertMutations:0,databaseWrites:0,
   phase5FreezePassed:false,phase6PaidGo:false
  };
 }catch(e){
  if(active)await c.query("ROLLBACK").catch(()=>{});
  throw e;
 }finally{c.release();}
}
async function run(){
 let p;
 try{
  if(typeof process.env.DATABASE_URL!=="string"||
     !process.env.DATABASE_URL)fail("NO_DATABASE_URL");
  p=new Pool({connectionString:process.env.DATABASE_URL,max:1,
    connectionTimeoutMillis:8000,idleTimeoutMillis:3000});
  console.log(JSON.stringify(
    await auditPhase5InstallDependenciesReadonly(p),null,2));
 }catch{
  console.log("HOLD_P5_STAGE18_READONLY_DEPENDENCY_AUDIT_UNAVAILABLE");
  process.exitCode=2;
 }finally{await p?.end().catch(()=>{});}
}
if(process.env.P5_STAGE18_DEPENDENCY_ONCE==="1")await run();
