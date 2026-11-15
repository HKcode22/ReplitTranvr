/**
 * GitHub schedule -> signed 31-parent-day -> ONE due 4-airport draw.
 * Reuses prior six-slot GitHub clock/canary and the existing installed DB
 * Phase6 early sampling writer. NO AeroDataBox and no Replit wall clock.
 *
 * STAGED / OFF by default: every positive gate requires an independently
 * configured reviewed GitHub secret AND actual enabled PG Phase6 auth.
 * No source originals, PRE, POST, Alert or paid collection here.
 */
import {Pool} from "pg";
import {commitEarlyPhase5Draw,type EarlyDrawOwnerPins}
 from "../server/lib/disruption/phase5EarlyAdaptiveDrawOwner_v39";
import {selectP5GitHubNextEarlyDraw,type P5SchedulerDayRow}
 from "../server/lib/disruption/phase5GithubClockEarlyDrawSelector_v39";

type Env=Record<string,string|undefined>;
const SHA=/^[a-f0-9]{64}$/;
const ROLE=/^phase(?:5|6)_[a-z0-9_]{6,64}$/;
const HOLD=(reason:string):never=>{
 throw Error("REFUSED_P5_GH_AUTONOMOUS_EARLY_DRAW_"+reason);
};
function parseEarlyDrawLogin(env:Env){
 const expectedRole=env.V39_P5_EARLY_DRAW_EFFECTIVE_ROLE;
 let u:URL;
 try{u=new URL(env.V39_P5_EARLY_DRAW_DATABASE_URL??"");}
 catch{return HOLD("UNREVIEWED_EARLY_DRAW_DATABASE_ROLE_OR_URL");}
 if(!ROLE.test(expectedRole??"")||
    !["postgresql:","postgres:"].includes(u.protocol)||decodeURIComponent(u.username)!==expectedRole||
    !u.password||!u.hostname.endsWith(".neon.tech")||u.pathname!=="/neondb"||u.hash||
    (u.port!==""&&u.port!=="5432")||u.searchParams.getAll("sslmode").length!==1||
    !["require","verify-full"].includes(u.searchParams.get("sslmode")??"")||
    [...u.searchParams.keys()].some(k=>!["sslmode","channel_binding"].includes(k))||
    (u.searchParams.has("channel_binding")&&(u.searchParams.getAll("channel_binding").length!==1||
     u.searchParams.get("channel_binding")!=="require")))
  HOLD("UNREVIEWED_EARLY_DRAW_DATABASE_ROLE_OR_URL");
 return {expectedRole:expectedRole!,url:env.V39_P5_EARLY_DRAW_DATABASE_URL!};
}

export const P5_EARLY_DRAW_READONLY_CONFIRM="VERIFY_EXISTING_EARLY_DRAW_LOGIN_READONLY_NO_GO";
export function parseP5EarlyDrawReadonlyContext(env:Env){
 if(env.GITHUB_ACTIONS!=="true"||env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    env.GITHUB_REF!=="refs/heads/main"||env.GITHUB_EVENT_NAME!=="workflow_dispatch"||
    env.GITHUB_RUN_ATTEMPT!=="1"||!/^[a-f0-9]{40}$/.test(env.GITHUB_SHA??"")||
    env.P5_EARLY_DRAW_READONLY_MAIN!==env.GITHUB_SHA||env.P5_EARLY_DRAW_MANUAL_CONFIRM!==P5_EARLY_DRAW_READONLY_CONFIRM||
    env.ADB_AUTO_COLLECT!=="0"||env.V39_PHASE6_OWNER_APPROVED!=="0"||
    !["","0"].includes(env.V39_PHASE6_PROCESS_ARMED??"")||
    env.AERODATABOX_API_KEY||env.AERODATABOX_WEBHOOK_SECRET||env.RAPIDAPI_KEY||
    env.DATABASE_URL||env.V39_DATABASE_RUNTIME_URL||env.NODE_TLS_REJECT_UNAUTHORIZED==="0")
  HOLD("NO_EXACT_READONLY_INSPECTION");
 return parseEarlyDrawLogin(env);
}

export const EARLY_DRAW_READ_TABLES=["adb_phase6_authorization","adb_phase6_calendar_day","adb_sampling_frame_registry","adb_sampling_frame",
     "adb_airport_sampling_state","adb_sampling_draw"];
const other=["fids_query_response","flight_snapshots"];
export const EARLY_DRAW_INSERT_COLUMNS:Record<string,string[]>={
   adb_sampling_draw:["run_day_index","slot_id","target_region","draw_type","selected_icao","frozen_draw_seed","adaptive_state_hash","probability_vector","airport_layer_design_probability","selected_at_utc"],
   adb_airport_sampling_state:["icao","last_selected_at","last_selected_run_day"]
  };
export const EARLY_DRAW_UPDATE_COLUMNS:Record<string,string[]>={adb_airport_sampling_state:["last_selected_at","last_selected_run_day","updated_at_utc"]};

export async function verifyP5EarlyDrawObjectAcl(c:Pick<import("pg").PoolClient,"query">,role:string){
  for(const table of [...EARLY_DRAW_READ_TABLES,...other]){
   const relation="clean."+table;
   const columns=(await c.query(`SELECT attname,
    has_column_privilege($2::name,attrelid,attnum,'SELECT') AS sel,
    has_column_privilege($2::name,attrelid,attnum,'INSERT') AS ins,
    has_column_privilege($2::name,attrelid,attnum,'UPDATE') AS upd
    FROM pg_attribute WHERE attrelid=to_regclass($1) AND attnum>0 AND NOT attisdropped ORDER BY attname`,[relation,role])).rows;
   if(!columns.length)HOLD("ACL_REQUIRED_TABLE_MISSING");
   const actual=(key:"ins"|"upd")=>columns.filter(x=>x[key]===true).map(x=>String(x.attname)).sort().join(",");
   if(actual("ins")!==(EARLY_DRAW_INSERT_COLUMNS[table]??[]).slice().sort().join(",")||
      actual("upd")!==(EARLY_DRAW_UPDATE_COLUMNS[table]??[]).slice().sort().join(",")||
      (EARLY_DRAW_READ_TABLES.includes(table)&&columns.some(x=>x.sel!==true)))
    HOLD("ACL_REQUIRED_OR_EXCESS_COLUMN_GRANTS");
   const broad=(await c.query(`SELECT has_table_privilege($2::name,$1::text,'DELETE') OR
      has_table_privilege($2::name,$1::text,'TRUNCATE') OR has_table_privilege($2::name,$1::text,'TRIGGER') bad`,[relation,role])).rows[0];
   if(broad?.bad!==false)HOLD("ACL_EXCESS_TABLE_GRANTS");
  }
  const seq=(await c.query(`SELECT pg_get_serial_sequence('clean.adb_sampling_draw','draw_id') name`)).rows[0]?.name;
  if(seq){
   const s=(await c.query(`SELECT has_sequence_privilege($2::name,$1::text,'USAGE') allowed,
     has_sequence_privilege($2::name,$1::text,'UPDATE') excess`,[seq,role])).rows[0];
   if(s?.allowed!==true||s.excess!==false)HOLD("ACL_DRAW_SEQUENCE_GRANTS");
  }

 return EARLY_DRAW_READ_TABLES.length+other.length;
}

// The same live narrow credential used by the existing writer, but no
// calendar or flight records are selected, and no writes are attempted.
// Expected database is injectable only for disposable real-PG tests.
export async function verifyP5EarlyDrawReadonlyAcl(pool:Pick<Pool,"connect">,expectedRole:string,expectedDb="neondb"){
 const c=await pool.connect();
 let tx=false;
 try{
  await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");tx=true;
  await c.query("SET LOCAL statement_timeout='10000ms'");
  const who=(await c.query(`SELECT current_database() db,current_user actor,session_user login,
    current_setting('server_version_num')::int version,current_setting('transaction_read_only') ro,
    pg_is_in_recovery() replica,
    (SELECT rolcanlogin AND NOT (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls)
      FROM pg_roles WHERE rolname=current_user) restricted,
    has_schema_privilege(current_user,'clean','USAGE') schema_usage,
    has_schema_privilege(current_user,'clean','CREATE') schema_create`)).rows[0];
  if(who?.db!==expectedDb||who.actor!==expectedRole||who.login!==expectedRole||who.ro!=="on"||
     who.replica!==false||who.restricted!==true||who.schema_usage!==true||who.schema_create!==false||
     !Number.isInteger(who.version)||who.version<160000||who.version>=170000)
   HOLD("WRONG_READONLY_ACL_IDENTITY");
  const verifiedTableCount=await verifyP5EarlyDrawObjectAcl(c,expectedRole);
  await c.query("ROLLBACK");tx=false;
  return {status:"EXISTING_EARLY_DRAW_LOGIN_READONLY_ACL_PASS_NO_GO",actor:expectedRole,database:expectedDb,
   pgVersion:who.version,verifiedTableCount,databaseWrites:0,providerCalls:0,phase6PaidGo:false};
 }finally{
  if(tx)await c.query("ROLLBACK").catch(()=>{});
  c.release();
 }
}

export function parseP5GitHubApprovedEarlyDrawContext(env:Env){
 if(env.GITHUB_ACTIONS!=="true"||
    env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    env.GITHUB_REF!=="refs/heads/main"||
    !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA??"")||
    env.GITHUB_RUN_ATTEMPT!=="1"||env.V39_P5_APPROVED_CODE_SHA!==env.GITHUB_SHA||
    !["schedule","workflow_dispatch"].includes(env.GITHUB_EVENT_NAME??"")||
    (env.GITHUB_EVENT_NAME==="workflow_dispatch"&&
     env.P5_EARLY_DRAW_MANUAL_CONFIRM!==
      "ONE_FUTURE_EARLY_DRAW_AFTER_SEPARATE_PHASE6_GO")||
    env.ADB_AUTO_COLLECT!=="0"||
    env.AERODATABOX_API_KEY||env.RAPIDAPI_KEY||env.AERODATABOX_WEBHOOK_SECRET||
    env.DATABASE_URL||env.V39_DATABASE_RUNTIME_URL||env.NODE_TLS_REJECT_UNAUTHORIZED==="0"||
    env.V39_P5_EARLY_DRAW_OWNER_APPROVED!=="1"||
    env.V39_PHASE5_FREEZE_SIGNED!=="1"||
    env.V39_PHASE5_SOURCE_RIGHTS_APPROVED!=="1"||
    env.V39_PHASE6_PROCESS_ARMED!=="1")
  HOLD("NO_MAIN_ONLY_SIGNED_PHASE6_AUTH");
 const keys=[env.V39_P5_MANIFEST_SHA256,env.V39_P5_CALENDAR_HASH,
  env.V39_P5_CONFIG_HASH,env.V39_P5_FRAME_HASH];
 if(!keys.every(x=>typeof x==="string"&&SHA.test(x)))
  HOLD("UNPINNED_SCENE_HASHES");
 const {expectedRole,url}=parseEarlyDrawLogin(env);
 return {
  manifest:keys[0]!,calendar:keys[1]!,config:keys[2]!,
  frame:keys[3]!,expectedRole,url
 };
}
export async function runP5GitHubAutonomousEarlyDraw(
 env:Env,poolFactory:(url:string)=>Pool=(url)=>new Pool({
   connectionString:url,max:1,connectionTimeoutMillis:8000,
   idleTimeoutMillis:2000,application_name:"phase5_github_autonomous_early_draw"
 })
){
 const ctx=parseP5GitHubApprovedEarlyDrawContext(env);
 const pool=poolFactory(ctx.url);
 let client:Awaited<ReturnType<Pool["connect"]>>|undefined;
 let tx=false;
 try{
  client=await pool.connect();
  await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  tx=true;
  await client.query("SET LOCAL statement_timeout='10000ms'");
  const who=(await client.query(
   "SELECT current_database() AS db,current_user AS role,session_user AS login,"+
   "current_setting('server_version_num')::integer AS version,"+
   "current_setting('transaction_read_only') AS ro,"+
   "pg_is_in_recovery() AS replica,clock_timestamp() AS now,"+
   "(SELECT NOT (rolsuper OR rolcreaterole OR rolcreatedb OR rolreplication OR rolbypassrls) AND rolcanlogin FROM pg_roles WHERE rolname=current_user) AS restricted_login,"+
   "(has_any_column_privilege(current_user,'clean.adb_phase6_authorization','UPDATE') OR has_any_column_privilege(current_user,'clean.adb_phase6_authorization','INSERT') OR has_table_privilege(current_user,'clean.adb_phase6_authorization','DELETE')) AS auth_update,"+
   "has_any_column_privilege(current_user,'clean.fids_query_response','INSERT') AS source_insert,"+
   "has_any_column_privilege(current_user,'clean.flight_snapshots','INSERT') AS pre_insert,"+
   "(NOT has_any_column_privilege(current_user,'clean.adb_sampling_draw','UPDATE') AND NOT has_table_privilege(current_user,'clean.adb_sampling_draw','DELETE')) AS draw_immutable"
  )).rows[0];
  if(who?.db!=="neondb"||who.role!==ctx.expectedRole||
     who.login!==ctx.expectedRole||!Number.isSafeInteger(who.version)||who.version<160000||who.version>=170000||
     who.restricted_login!==true||who.auth_update!==false||who.source_insert!==false||who.pre_insert!==false||who.draw_immutable!==true||
     who.ro!=="on"||who.replica!==false)
   HOLD("WRONG_READONLY_DATABASE_IDENTITY");
  const auth=await client.query(
   "SELECT manifest_sha256,calendar_hash,config_hash,enabled,revoked_at_utc"+
   " FROM clean.adb_phase6_authorization WHERE singleton_key=true"
  );
  if(auth.rowCount!==1||auth.rows[0].enabled!==true||
     auth.rows[0].revoked_at_utc!==null||
     auth.rows[0].manifest_sha256!==ctx.manifest||
     auth.rows[0].calendar_hash!==ctx.calendar||
     auth.rows[0].config_hash!==ctx.config)
   HOLD("SEPARATE_PHASE6_DB_AUTHORIZATION_DISABLED_OR_DRIFTED");
  const calendar=await client.query(
   "SELECT c.run_day_index,c.scheduled_start_utc,c.calendar_hash,"+
   "c.config_hash,c.frame_hash,c.date_utc,"+
   "COUNT(d.run_day_index)::integer AS draw_count"+
   " FROM clean.adb_phase6_calendar_day c"+
   " LEFT JOIN clean.adb_sampling_draw d"+
   " ON d.run_day_index=c.run_day_index"+
   " GROUP BY c.run_day_index,c.scheduled_start_utc,c.calendar_hash,"+
   "c.config_hash,c.frame_hash,c.date_utc"+
   " ORDER BY c.run_day_index"
  );
  const selected=selectP5GitHubNextEarlyDraw({
   dbClockUtc:who.now,
   expectedCalendarSha256:ctx.calendar,
   expectedConfigSha256:ctx.config,
   expectedFrameSha256:ctx.frame,
   // Exact separately approved code includes this prospective censoring policy.
   allowLocalMissedDay:true,rows:calendar.rows as P5SchedulerDayRow[]
  });
  await client.query("ROLLBACK");tx=false;
  client.release();client=undefined;
  if(selected.status==="NOT_DUE_OR_ALREADY_SELECTED"){
   return {
    ...selected,status:"NO_DUE_FUTURE_DRAW_AT_DB_CLOCK",
    phase5ScientificFreezePassedByThisJob:false,
    sourceOrFlightPreVerified:false,phase6PaidGoGrantedByThisJob:false
   };
  }
  // EXISTING production writer starts its own SERIALIZABLE transaction,
  // rechecks signed auth and strict lead at DB clock; this selector does
  // not create or bypass any write/admission role grants.
  const pins:EarlyDrawOwnerPins={
   runDayIndex:selected.runDayIndex,
   expectedManifestSha256:ctx.manifest,
   expectedCalendarHash:ctx.calendar,
   expectedConfigHash:ctx.config,
   expectedFrameHash:ctx.frame,
   phase5FreezeApproved:true,githubOnlyApproved:true
  };
  const committed=await commitEarlyPhase5Draw(pool,pins);
  return {
   schema:"v39.phase5.github-six-slot-approved-one-early-draw.v1",
   status:"ONE_APPROVED_EARLY_FOUR_SLOT_DRAW_COMMITTED_NOT_SOURCE",
   runDayIndex:selected.runDayIndex,
   priorCommittedDays:selected.priorCommittedDays,
   missedRunDayIndices:selected.missedRunDayIndices,
   immutableDrawSha256:committed.drawSha256,
   selectedAirportCount:committed.selectedAirportCount,
   selectedAtUtc:committed.selectedAtUtc,
   providerFidsGets:0,providerAlertCreates:0,
   flightPreRowsCreated:0,postObserved:false,
   phase5ScientificFreezePassedByThisJob:false,
   phase6PaidGoGrantedByThisJob:false
  };
 }catch(e){
  if(tx&&client)await client.query("ROLLBACK").catch(()=>{});
  throw e;
 }finally{
  if(client)client.release();
  await pool.end().catch(()=>{});
 }
}
if(process.env.P5_EARLY_DRAW_READONLY_ENTRYPOINT==="1"){
 (async()=>{
  const ctx=parseP5EarlyDrawReadonlyContext(process.env);
  const pool=new Pool({connectionString:ctx.url,max:1,connectionTimeoutMillis:8000,query_timeout:15000});
  try{console.log(JSON.stringify(await verifyP5EarlyDrawReadonlyAcl(pool,ctx.expectedRole)));}
  finally{await pool.end();}
 })().catch(e=>{
  const s=String(e?.message??"");
  console.error(/^REFUSED_P5_GH_AUTONOMOUS_EARLY_DRAW_[A-Z0-9_]+$/.test(s)?s:"REFUSED_P5_GH_AUTONOMOUS_EARLY_DRAW_READONLY_DB_OR_UNEXPECTED");
  process.exitCode=2;
 });
}else if(process.env.P5_GITHUB_AUTONOMOUS_EARLY_DRAW_MAIN_ENTRYPOINT==="1"){
 runP5GitHubAutonomousEarlyDraw(process.env).then(v=>{
  console.log(JSON.stringify(v));
 }).catch(e=>{
  const safe=typeof e?.message==="string"&&
   /^REFUSED_(?:P5_GH_AUTONOMOUS_EARLY_DRAW|P5_GITHUB_EARLY_DRAW_SELECT|PHASE5_EARLY_DRAW)_[A-Z0-9_]+$/.test(e.message)?
   e.message:"REFUSED_P5_GH_AUTONOMOUS_EARLY_DRAW_DB_OR_UNEXPECTED";
  console.error(safe);process.exitCode=2;
 });
}
