/**
 * One-use owner repair for the actual missing Day2 V0079 parent binding.
 * Execute only in detached exact c8 main checkout, using existing attached
 * owner DATABASE_URL. No provider, policy edits, new credentials or flags.
 */
import {Client} from "pg";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {verifyPreparedDailyDraw,type PreparedDayForReadback,type PreparedDrawRow} from "../server/lib/disruption/phase5EarlyPreselectionReadback_v39";
const MAIN="c8e065d665ccacb6d2575070e94c5500b7583044";
const PLAN="data-collection/phase5/planning/phase6-source-day-02.json";
const hold=(s:string):never=>{throw Error("HOLD_P6_DAY2_PARENT_BIND_"+s);};
const int=(x:unknown,min=0,max=50000)=>typeof x==="number"&&Number.isSafeInteger(x)&&x>=min&&x<=max;
const sha=(x:unknown)=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x);
async function run(){
 if(process.argv[2]!=="OWNER_APPROVES_BIND_EXISTING_DAY2_ONLY_NO_PROVIDER"||
    execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim()!==MAIN||
    execFileSync("git",["hash-object",PLAN],{encoding:"utf8"}).trim()!=="c7816c2b4cb6170e827de83628cf86b082be83de"||
    !process.env.DATABASE_URL)hold("EXACT_CHECKOUT_OR_OWNER_AUTH");
 const plan=JSON.parse(readFileSync(PLAN,"utf8"));
 const expected={HUB:"WSSS",MID_A:"SBFL",MID_B:"TJSJ",REGIONAL:"LSZB"};
 if(plan.runDayIndex!==2||plan.expectedServiceStartUtc!=="2026-11-26T04:00:00.000Z"||
    JSON.stringify(plan.pairedIcaos)!==JSON.stringify(expected)||
    plan.templates.length!==192||new Set(plan.templates.map((t:any)=>t.queryKey)).size!==192||
    plan.templates.some((t:any)=>t.runDayIndex!==2||t.maxAttempts!==1||t.apiUnitsPerAttempt!==2))
  hold("PLAN_DRIFT");
 const byDate=new Map<string,number>();
 for(const t of plan.templates)byDate.set(t.physicalChargeDayUtc,(byDate.get(t.physicalChargeDayUtc)??0)+2);
 if(byDate.size!==2||byDate.get("2026-11-25")!==200||byDate.get("2026-11-26")!==184)hold("UTC_PLAN_DRIFT");
 const c=new Client({connectionString:process.env.DATABASE_URL});
 await c.connect();
 let tx=false,commitAttempted=false;
 try{
  await c.query("BEGIN ISOLATION LEVEL SERIALIZABLE");tx=true;
  await c.query("SET LOCAL statement_timeout='15000ms'");
  await c.query("SET LOCAL lock_timeout='3000ms'");
  await c.query("SELECT pg_advisory_xact_lock(hashtext('v39-phase5-prepare-day'),2)");
  const one=async(sql:string,params:any[]=[])=>{const r=await c.query(sql,params);if(r.rowCount!==1)hold("EXPECTED_ONE_ROW");return r.rows[0];};
  const who=await one("SELECT current_database() db,current_setting('server_version_num')::int ver,current_setting('transaction_read_only') ro,pg_is_in_recovery() replica,clock_timestamp() at");
  if(who.db!=="neondb"||who.ver<160000||who.ver>=170000||who.ro!=="off"||who.replica!==false||
     new Date(who.at).getTime()>=Date.parse("2026-11-25T03:25:00.000Z"))hold("DB_OR_PROSPECTIVE_CLOCK");
  const a=await one("SELECT manifest_sha256,calendar_hash,config_hash,enabled,revoked_at_utc FROM clean.adb_phase6_authorization WHERE singleton_key=true");
  if(a.enabled!==true||a.revoked_at_utc!==null||![a.manifest_sha256,a.calendar_hash,a.config_hash].every(sha))hold("AUTH");
  const cal=await one("SELECT run_day_index,scheduled_start_utc,frozen_draw_seed,draw_type,anchor_icao,slot_regions,pair_airport_set,calendar_hash,config_hash,frame_hash,date_utc::text,window_shape,active_duration_minutes FROM clean.adb_phase6_calendar_day WHERE run_day_index=2");
  if(cal.calendar_hash!==a.calendar_hash||cal.config_hash!==a.config_hash||!sha(cal.frame_hash)||
     new Date(cal.scheduled_start_utc).toISOString()!==plan.expectedServiceStartUtc||
     cal.date_utc!=="2026-11-26"||cal.window_shape!=="4h"||cal.active_duration_minutes!==240||
     cal.draw_type!==plan.expectedDrawType)hold("CALENDAR");
  const d:PreparedDayForReadback={runDayIndex:2,scheduledStartUtc:new Date(cal.scheduled_start_utc),
   frozenDrawSeed:cal.frozen_draw_seed,drawType:cal.draw_type,anchorIcao:cal.anchor_icao,slotRegions:cal.slot_regions,
   pairAirportSet:cal.pair_airport_set,calendarHash:cal.calendar_hash,configHash:cal.config_hash,frameHash:cal.frame_hash};
  const draw=(await c.query("SELECT slot_id,target_region,draw_type,selected_icao,frozen_draw_seed,selected_at_utc,adaptive_state_hash,probability_vector,airport_layer_design_probability FROM clean.adb_sampling_draw WHERE run_day_index=2 ORDER BY slot_id")).rows as PreparedDrawRow[];
  const proof=verifyPreparedDailyDraw(d,draw);
  if(proof.selections.some(s=>expected[s.slotId]!==s.icao)||Date.parse(proof.selectedAtUtc)>=new Date(who.at).getTime())hold("ACTUAL_DRAW");
  const m=a.manifest_sha256;
  const release=await one("SELECT budget_release_mode,reviewed_source_request_grid_sha256,reviewed_cost_envelope_sha256,reviewed_category_budget_sha256,reviewed_provider_range_sha256,verified_provider_max_range_minutes FROM clean.phase5_fids_seven_rest_release_v39 WHERE manifest_sha256=$1",[m]);
  if(release.budget_release_mode!=="COST_UPPER_BOUND"||release.reviewed_source_request_grid_sha256!==null||
     !sha(release.reviewed_cost_envelope_sha256)||!sha(release.reviewed_category_budget_sha256)||
     release.reviewed_provider_range_sha256!==plan.reviewedSegmentedSource.reviewedProviderRangeEvidenceSha256||
     release.verified_provider_max_range_minutes!==plan.reviewedSegmentedSource.verifiedProviderMaxRangeMinutes)hold("FROZEN_COST_RELEASE");
  const stop=await one("SELECT count(*)::int n FROM clean.adb_incident_stop WHERE NOT resolved");
  if(stop.n!==0)hold("UNRESOLVED_STOP");
  const cy=await one("SELECT cycle_api_ceiling,other_category_reserved_units,protected_api_floor_units,physically_reserved_units FROM clean.phase5_fids_cycle_budget_v39 WHERE manifest_sha256=$1",[m]);
  if(!Object.values(cy).every(v=>int(v))||cy.cycle_api_ceiling>50000||
     cy.other_category_reserved_units+cy.protected_api_floor_units+cy.physically_reserved_units+384>cy.cycle_api_ceiling)hold("CYCLE_BUDGET");
  const caps=await c.query("SELECT category,ceiling_units FROM clean.phase5_fids_cycle_rest_category_cap_v39 WHERE manifest_sha256=$1",[m]);
  const totals=await c.query("SELECT category,sum(planned_units)::int AS total FROM clean.phase5_fids_utc_rest_category_budget_v39 WHERE manifest_sha256=$1 GROUP BY category",[m]);
  const categories=["FIDS_BASE_UNITS","FIDS_SPLIT_UNITS","FIDS_RETRY_UNIT_BUDGET","VALIDATION_UNIT_BUDGET","OUTCOME_REST_UNIT_BUDGET","HISTORY_BOOTSTRAP_UNIT_BUDGET","DIAGNOSTIC_UNIT_BUDGET"];
  if(caps.rowCount!==7||totals.rowCount!==7||categories.some(k=>{const a=caps.rows.find(r=>r.category===k),b=totals.rows.find(r=>r.category===k);return !a||!b||!int(a.ceiling_units)||!int(b.total)||b.total>a.ceiling_units;})||
     totals.rows.reduce((n,r)=>n+r.total,0)>36740)hold("SEVEN_CATEGORY_CYCLE");
  for(const [date,units] of byDate){
   const charge=await one("SELECT daily_api_ceiling,daily_other_reserved_units,physically_reserved_units FROM clean.phase5_fids_utc_charge_budget_v39 WHERE manifest_sha256=$1 AND charge_day_utc=$2::date",[m,date]);
   if(!int(charge.daily_api_ceiling,2,1900)||!int(charge.daily_other_reserved_units)||!int(charge.physically_reserved_units)||
      charge.daily_other_reserved_units+charge.physically_reserved_units+units>charge.daily_api_ceiling)hold("PHYSICAL_UTC_CAP");
   const cat=await c.query("SELECT category,planned_units,physically_reserved_units FROM clean.phase5_fids_utc_rest_category_budget_v39 WHERE manifest_sha256=$1 AND charge_day_utc=$2::date",[m,date]);
   if(cat.rowCount!==7||categories.some(k=>!cat.rows.some(r=>r.category===k&&int(r.planned_units)&&int(r.physically_reserved_units)&&r.physically_reserved_units<=r.planned_units)))hold("PHYSICAL_CATEGORIES");
   const base=cat.rows.find(r=>r.category==="FIDS_BASE_UNITS");
   const prior=await one("SELECT count(*)::int n FROM clean.phase5_fids_allowed_query_v39 q JOIN clean.phase5_fids_exact_query_partition_v39 p ON p.query_digest=q.query_digest WHERE q.manifest_sha256=$1 AND q.planned_charge_utc_date=$2::date AND p.rest_category='FIDS_BASE_UNITS' AND q.run_day_index<>2",[m,date]);
   if(prior.n*2+units>base.planned_units||cat.rows.filter(r=>!categories.slice(0,2).includes(r.category)).reduce((n,r)=>n+r.planned_units,0)!==charge.daily_other_reserved_units||
     cat.rows.reduce((n,r)=>n+r.planned_units,0)>charge.daily_api_ceiling)hold("PHYSICAL_CATEGORY_CAP");
  }
  const existing=await c.query("SELECT * FROM clean.phase5_fids_day_budget_v39 WHERE manifest_sha256=$1 AND run_day_index=2",[m]);
  const q=await one("SELECT count(*)::int n FROM clean.phase5_fids_allowed_query_v39 WHERE manifest_sha256=$1 AND run_day_index=2",[m]);
  const matches=(b:any)=>b.calendar_hash===d.calendarHash&&b.config_hash===d.configHash&&b.frame_hash===d.frameHash&&b.early_draw_sha256===proof.stateHash&&b.daily_api_ceiling===384&&b.daily_other_reserved_units===0&&b.daily_source_reserved_units===0;
  if(existing.rowCount===1){
   if(!matches(existing.rows[0]))hold("EXISTING_BINDING_DRIFT");
   await c.query("ROLLBACK");tx=false;
   console.log(JSON.stringify({status:"P6_DAY2_PARENT_ALREADY_BOUND_NO_REPLAY",runDayIndex:2,sourceOnlyParentCeiling:384,preparedQueries:q.n,providerCalls:0}));return;
  }
  if(existing.rowCount!==0||q.n!==0)hold("NONEMPTY_OR_AMBIGUOUS_DAY");
  // This parent counter is exclusively SOURCE, while ALL other REST and
  // physical UTC charges remain enforced in the separate immutable ledgers.
  // Exact full Day2 192*2 cap is strictly narrower than the 1900 ceiling.
  const saved=await c.query("INSERT INTO clean.phase5_fids_day_budget_v39 (manifest_sha256,run_day_index,budget_day_utc,calendar_hash,config_hash,frame_hash,early_draw_sha256,daily_api_ceiling,daily_other_reserved_units,daily_source_reserved_units) VALUES ($1,2,'2026-11-26',$2,$3,$4,$5,384,0,0) RETURNING *",[m,d.calendarHash,d.configHash,d.frameHash,proof.stateHash]);
  if(saved.rowCount!==1||!matches(saved.rows[0]))hold("INSERT_READBACK");
  const clock=await one("SELECT clock_timestamp() at");
  if(new Date(clock.at).getTime()>=Date.parse("2026-11-25T03:25:00.000Z"))hold("DEADLINE");
  commitAttempted=true;await c.query("COMMIT");tx=false;
  await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");tx=true;
  const independent=await one("SELECT * FROM clean.phase5_fids_day_budget_v39 WHERE manifest_sha256=$1 AND run_day_index=2",[m]);
  if(!matches(independent))hold("COMMITTED_READBACK_DRIFT");
  await c.query("ROLLBACK");tx=false;
  console.log(JSON.stringify({status:"P6_DAY2_PARENT_BUDGET_BOUND_AND_READ_BACK",runDayIndex:2,drawCount:4,drawSha256:proof.stateHash,sourceOnlyParentCeiling:384,physicalChargeUnits:Object.fromEntries(byDate),providerCalls:0,policyWrites:0}));
 }catch(e){if(tx)await c.query("ROLLBACK").catch(()=>{});if(commitAttempted)console.error("P6_DAY2_COMMIT_ATTEMPTED_DO_NOT_BLINDLY_REPLAY");throw e;}finally{await c.end();}
}
run().catch(e=>{console.error(typeof e?.message==="string"&&/^HOLD_P6_DAY2_PARENT_BIND_[A-Z_]+$/.test(e.message)?e.message:"HOLD_P6_DAY2_PARENT_BIND_DB_OR_UNEXPECTED");process.exitCode=1;});
