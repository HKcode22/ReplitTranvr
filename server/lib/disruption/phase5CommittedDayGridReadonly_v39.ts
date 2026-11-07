/**
 * Phase5 Stage7: read a real frozen day and its four persisted airport draw
 * rows from a single PostgreSQL REPEATABLE READ READ ONLY transaction.
 * Then derive twelve candidate queries using Stage6's pure guarded builder.
 *
 * NO provider/Alert call, DB write, role installer or workflow.
 * Do not use ordinary application DB role as a Phase5 independent auditor.
 * A successful result proves only scoped database readback and candidate
 * arithmetic, never lawful source use, actual flight PRE or Phase6 GO.
 */
import type {Pool} from "pg";
import {
 materializeP5DynamicDaySourceGrid,
 P5_DYNAMIC_DAY_GRID_SCHEMA,
 type P5DynamicDayGridInput,type P5DynamicDayGridResult,
} from "./phase5DynamicDaySourceGrid_v39";
import type {PreparedDayForReadback,PreparedDrawRow}
 from "./phase5EarlyPreselectionReadback_v39";

const SHA=/^[a-f0-9]{64}$/;
const DBROLE=/^[a-z_][a-z0-9_]{3,62}$/;
function hold(s:string):never{throw Error("REFUSED_P5_COMMITTED_DAY_READBACK_"+s);}
function stamp(v:unknown):Date{
 const d=v instanceof Date?v:new Date(String(v));
 if(!Number.isFinite(d.getTime()))hold("UNTRUSTED_DB_TIMESTAMP");
 return d;
}
function row(v:unknown,label:string):Record<string,unknown>{
 if(!v||typeof v!=="object"||Array.isArray(v))hold(label+"_ROW_INVALID");
 return v as Record<string,unknown>;
}
const AUTH_SQL=[
 "SELECT manifest_sha256,calendar_hash,config_hash,",
 "enabled,revoked_at_utc FROM clean.adb_phase6_authorization",
 "WHERE singleton_key=true"
].join(" ");
const CALENDAR_SQL=[
 "SELECT run_day_index,scheduled_start_utc,frozen_draw_seed,draw_type,",
 "anchor_icao,slot_regions,pair_airport_set,calendar_hash,",
 "config_hash,frame_hash,date_utc",
 "FROM clean.adb_phase6_calendar_day WHERE run_day_index=$1"
].join(" ");
const DRAW_SQL=[
 "SELECT slot_id,target_region,draw_type,selected_icao,",
 "frozen_draw_seed,selected_at_utc,adaptive_state_hash,",
 "probability_vector,airport_layer_design_probability",
 "FROM clean.adb_sampling_draw WHERE run_day_index=$1",
 "ORDER BY slot_id"
].join(" ");

export interface P5CommittedDayReadonlyScope {
  expectedManifestSha256:string;
  expectedCalendarSha256:string;
  expectedConfigSha256:string;
  expectedFrameSha256:string;
  expectedProviderContractSha256:string;
  expectedEarlyDrawSha256:string;
  expectedRestrictedReaderRole:string;
  runDayIndex:number;
  /** Fixed 12 slot/horizon source templates, no airport names. */
  templates:P5DynamicDayGridInput["templates"];
}
export interface P5CommittedDayReadonlyResult {
  schema:"v39.phase5.db-readback-day-grid.v1";
  status:"SAVED_SOURCE_DAY_READ_ONLY_CANDIDATES_NOT_RELEASED";
  dbClockAtReadUtc:string;
  restrictedReaderRoleVerified:true;
  databaseReadOnlySnapshot:true;
  databaseWrites:0;
  providerCalls:0;
  selectedDayCandidateGrid:P5DynamicDayGridResult;
  sourceResponseCaptured:false;
  flightLevelPreCertified:false;
  accountRightsCertified:false;
  phase5FreezePassed:false;
  phase6Go:false;
}
/**
 * Caller must inject separately reviewed restricted SELECT-only PG pool;
 * verify role identity and session readonly state before querying any draw.
 */
export async function readCommittedP5DayCandidateGrid(
 pool:Pick<Pool,"connect">,scope:P5CommittedDayReadonlyScope,
):Promise<P5CommittedDayReadonlyResult>{
 if(!scope||![scope.expectedManifestSha256,scope.expectedCalendarSha256,
  scope.expectedConfigSha256,scope.expectedFrameSha256,
  scope.expectedProviderContractSha256,scope.expectedEarlyDrawSha256]
  .every(x=>typeof x==="string"&&SHA.test(x))||
  !DBROLE.test(scope.expectedRestrictedReaderRole)||
  !Number.isInteger(scope.runDayIndex)||scope.runDayIndex<1||scope.runDayIndex>31)
  hold("UNPINNED_READBACK_OR_DAY");
 if(!pool||typeof pool.connect!=="function")hold("NO_RESTRICTED_POOL");
 const client=await pool.connect();
 let tx=false;
 try{
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  tx=true;
  await client.query("SET LOCAL statement_timeout='8000ms'");
  await client.query("SET LOCAL lock_timeout='2000ms'");
  const who=await client.query([
   "SELECT current_user AS reader_role,",
   "current_setting('transaction_read_only') AS read_only,",
   "clock_timestamp() AS at"
  ].join(" "));
  if(who.rowCount!==1||who.rows[0]?.read_only!=="on"||
    who.rows[0]?.reader_role!==scope.expectedRestrictedReaderRole)
    hold("UNVERIFIED_RESTRICTED_READ_ONLY_ROLE");
  const clock=stamp(who.rows[0].at);
  const auth=await client.query(AUTH_SQL);
  if(auth.rowCount!==1)hold("MISSING_SIGNED_ACTIVE_AUTHORIZATION");
  const ar=row(auth.rows[0],"AUTH");
  if(ar.enabled!==true||ar.revoked_at_utc!==null||
    ar.manifest_sha256!==scope.expectedManifestSha256||
    ar.calendar_hash!==scope.expectedCalendarSha256||
    ar.config_hash!==scope.expectedConfigSha256)
    hold("ACTIVE_MANIFEST_OR_AUTH_CHANGED");
  const cal=await client.query(CALENDAR_SQL,[scope.runDayIndex]);
  if(cal.rowCount!==1)hold("SAVED_DAY_MISSING");
  const cr=row(cal.rows[0],"CALENDAR");
  if(Number(cr.run_day_index)!==scope.runDayIndex||
    cr.calendar_hash!==scope.expectedCalendarSha256||
    cr.config_hash!==scope.expectedConfigSha256||
    cr.frame_hash!==scope.expectedFrameSha256)
    hold("SAVED_DAY_PIN_MISMATCH");
  const day:PreparedDayForReadback={
    runDayIndex:scope.runDayIndex,
    scheduledStartUtc:stamp(cr.scheduled_start_utc),
    frozenDrawSeed:String(cr.frozen_draw_seed),
    drawType:cr.draw_type as PreparedDayForReadback["drawType"],
    anchorIcao:String(cr.anchor_icao),
    slotRegions:cr.slot_regions as PreparedDayForReadback["slotRegions"],
    pairAirportSet:cr.pair_airport_set as PreparedDayForReadback["pairAirportSet"],
    calendarHash:String(cr.calendar_hash),
    configHash:String(cr.config_hash),
    frameHash:String(cr.frame_hash),
  };
  if(day.scheduledStartUtc.toISOString().slice(0,10)!==
    stamp(cr.date_utc).toISOString().slice(0,10))
    hold("SERVICE_DATE_NOT_MATCHED");
  const draws=await client.query(DRAW_SQL,[scope.runDayIndex]);
  if(draws.rowCount!==4||draws.rows.length!==4)
    hold("FOUR_COMMITTED_DRAW_ROWS_NOT_FOUND");
  const candidates=materializeP5DynamicDaySourceGrid({
    schema:P5_DYNAMIC_DAY_GRID_SCHEMA,
    reviewedCalendarSha256:scope.expectedCalendarSha256,
    reviewedConfigSha256:scope.expectedConfigSha256,
    reviewedFrameSha256:scope.expectedFrameSha256,
    providerContractSha256:scope.expectedProviderContractSha256,
    expectedCommittedEarlyDrawSha256:scope.expectedEarlyDrawSha256,
    day,committedEarlyDrawRows:draws.rows as PreparedDrawRow[],
    templates:scope.templates,
  });
  // Staged source-query prep must finish before first T24 GET; never
  // interpret a post-cutoff DB read as an earlier source prearm.
  const soonest=Math.min(...candidates.acquisitions.map(x=>
    new Date(x.scheduledRequestUtc).getTime()));
  if(clock.getTime()>=soonest)hold("EARLIEST_SOURCE_REQUEST_ALREADY_DUE");
  const sampled=new Date(candidates.selectedAtUtc);
  if(sampled.getTime()>clock.getTime())hold("DRAW_NOT_YET_PERSISTED_AT_DB_CLOCK");
  await client.query("COMMIT");tx=false;
  return {
    schema:"v39.phase5.db-readback-day-grid.v1",
    status:"SAVED_SOURCE_DAY_READ_ONLY_CANDIDATES_NOT_RELEASED",
    dbClockAtReadUtc:clock.toISOString(),
    restrictedReaderRoleVerified:true,databaseReadOnlySnapshot:true,
    databaseWrites:0,providerCalls:0,selectedDayCandidateGrid:candidates,
    sourceResponseCaptured:false,flightLevelPreCertified:false,
    accountRightsCertified:false,phase5FreezePassed:false,phase6Go:false,
  };
 }catch(e){
  if(tx)await client.query("ROLLBACK").catch(()=>{});
  throw e;
 }finally{client.release();}
}
