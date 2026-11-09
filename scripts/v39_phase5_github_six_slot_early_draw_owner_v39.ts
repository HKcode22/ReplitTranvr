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
export function parseP5GitHubApprovedEarlyDrawContext(env:Env){
 if(env.GITHUB_ACTIONS!=="true"||
    env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    env.GITHUB_REF!=="refs/heads/main"||
    !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA??"")||
    env.GITHUB_RUN_ATTEMPT!=="1"||
    !["schedule","workflow_dispatch"].includes(env.GITHUB_EVENT_NAME??"")||
    (env.GITHUB_EVENT_NAME==="workflow_dispatch"&&
     env.P5_EARLY_DRAW_MANUAL_CONFIRM!==
      "ONE_FUTURE_EARLY_DRAW_AFTER_SEPARATE_PHASE6_GO")||
    env.ADB_AUTO_COLLECT!=="0"||
    env.AERODATABOX_API_KEY||
    env.V39_P5_EARLY_DRAW_OWNER_APPROVED!=="1"||
    env.V39_PHASE5_FREEZE_SIGNED!=="1"||
    env.V39_PHASE5_SOURCE_RIGHTS_APPROVED!=="1"||
    env.V39_PHASE6_PROCESS_ARMED!=="1")
  HOLD("NO_MAIN_ONLY_SIGNED_PHASE6_AUTH");
 const keys=[env.V39_P5_MANIFEST_SHA256,env.V39_P5_CALENDAR_HASH,
  env.V39_P5_CONFIG_HASH,env.V39_P5_FRAME_HASH];
 if(!keys.every(x=>typeof x==="string"&&SHA.test(x)))
  HOLD("UNPINNED_SCENE_HASHES");
 const expectedRole=env.V39_P5_EARLY_DRAW_EFFECTIVE_ROLE;
 if(!ROLE.test(expectedRole??"")||
    typeof env.V39_P5_EARLY_DRAW_DATABASE_URL!=="string"||
    !/^postgres(?:ql)?:\/\//.test(env.V39_P5_EARLY_DRAW_DATABASE_URL))
  HOLD("UNREVIEWED_EARLY_DRAW_DATABASE_ROLE_OR_URL");
 return {
  manifest:keys[0]!,calendar:keys[1]!,config:keys[2]!,
  frame:keys[3]!,expectedRole:expectedRole!,
  url:env.V39_P5_EARLY_DRAW_DATABASE_URL!
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
   "SELECT current_database() AS db,current_user AS role,"+
   "current_setting('transaction_read_only') AS ro,"+
   "pg_is_in_recovery() AS replica,clock_timestamp() AS now"
  )).rows[0];
  if(who?.db!=="neondb"||who.role!==ctx.expectedRole||
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
   rows:calendar.rows as P5SchedulerDayRow[]
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
if(process.env.P5_GITHUB_AUTONOMOUS_EARLY_DRAW_MAIN_ENTRYPOINT==="1"){
 runP5GitHubAutonomousEarlyDraw(process.env).then(v=>{
  console.log(JSON.stringify(v));
 }).catch(e=>{
  const safe=typeof e?.message==="string"&&
   /^REFUSED_(?:P5_GH_AUTONOMOUS_EARLY_DRAW|P5_GITHUB_EARLY_DRAW_SELECT|PHASE5_EARLY_DRAW)_[A-Z0-9_]+$/.test(e.message)?
   e.message:"REFUSED_P5_GH_AUTONOMOUS_EARLY_DRAW_DB_OR_UNEXPECTED";
  console.error(safe);process.exitCode=2;
 });
}
