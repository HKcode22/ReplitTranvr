/**
 * Phase5 Stage9: DB-only prospective V0079 PREPARED query-row admission.
 * NOT deployed; there is deliberately NO workflow/CLI that invokes it.
 * This is a first-stage prepared-row writer, not a paid source call,
 * signed account-specific rights proof, V0079 installer, flight PRE or GO.
 *
 * A future separately approved GitHub release must supply independently
 * reviewed exact digests and a distinct INSERT-only DB role, and re-verify
 * source-use/retention legality before invoking this code. An input boolean
 * or hash is not by itself legal permission.
 */
import {createHash} from "node:crypto";
import type {Pool,PoolClient} from "pg";
import {verifyPreparedDailyDraw,type PreparedDayForReadback,
 type PreparedDrawRow} from "./phase5EarlyPreselectionReadback_v39";
import type {Stage8DayProposalResult,Stage8V0079PreparedProposal}
 from "./phase5V0079DailyPreparedQueryProposals_v39";

const SHA=/^[a-f0-9]{64}$/;
const ROLE=/^phase5_fids_prepare_[a-z0-9_]{6,42}$/;
const SLOTS=["HUB","MID_A","MID_B","REGIONAL"];
const HORIZONS=["T-24h","T-6h","T-90m"];
const sha=(x:unknown)=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
function hold(x:string):never{throw Error("REFUSED_P5_STAGE9_DAY_PREPARE_"+x);}
function time(x:unknown):Date{
 const d=x instanceof Date?x:new Date(String(x));
 if(!Number.isFinite(d.getTime()))hold("INVALID_DATABASE_TIME");
 return d;
}
function dayDate(x:unknown):string{
 const s=x instanceof Date?x.toISOString().slice(0,10):String(x);
 if(!/^\d{4}-\d\d-\d\d$/.test(s))hold("INVALID_DB_SERVICE_DATE");
 return s;
}
const COLUMNS=[
 "query_digest","manifest_sha256","run_day_index","query_key",
 "slot_id","horizon","airport_icao","early_draw_sha256",
 "reviewed_release_sha256","rights_review_sha256",
 "provider_contract_sha256","github_run_id",
 "service_window_start_utc","service_window_end_utc","from_local","to_local",
 "airport_iana_timezone","provider_api_version","fids_protocol_version",
 "planned_dispatch_utc","planned_charge_utc_date",
 "hard_latest_dispatch_utc","prediction_cutoff_utc",
 "api_units_per_attempt","max_physical_attempts","state"
] as const;
export interface P5Stage9PreparedDayReview {
 proposal:Stage8DayProposalResult;
 expectedProposalSha256:string;
 expectedManifestSha256:string;
 expectedCalendarSha256:string;
 expectedConfigSha256:string;
 expectedFrameSha256:string;
 expectedProviderContractSha256:string;
 expectedRightsReviewSha256:string;
 expectedReleaseSha256:string;
 expectedRestrictedWriterRole:string;
 expectedChargeDayBudgetHashSha256:string;
 /** Separately approved review inputs, NOT self-authenticating signatures. */
 independentFreezeApproved:true;
 independentRightsReviewApproved:true;
 githubOnlyProspectiveOwnerApproved:true;
}
export interface P5Stage9DayPrepared {
 schema:"v39.phase5.stage9.verified-day-prepared-db-commit.v1";
 status:"TWELVE_V0079_PREPARED_QUERY_ROWS_COMMITTED_NOT_SOURCE_GET";
 day:number;manifestSha256:string;
 queryRowCount:12;preparedDigestSha256:string;
 firstPhysicalGetAtUtc:string;
 databaseWrites:12;providerCalls:0;paidSourceAttempts:0;
 realGithubRunBound:false;flightLevelPreCertified:false;
 finalPhase5FreezePassed:false;phase6PaidGo:false;
}
function verifyScope(p:P5Stage9PreparedDayReview):void{
 const x=p?.proposal;
 if(!x||x.schema!=="v39.phase5.stage8.v0079-day-prepared-proposals.v1"||
    x.status!=="EXACT_DAY_QUERY_PROPOSALS_NOT_DATABASE_PREPARED_OR_SIGNED"||
    x.sourceQueryCount!==12||x.maximumCandidateGetUnits!==24||
    x.databaseWrites!==0||x.providerCalls!==0||x.installedV0079!==false||
    x.actualGitHubPrearmVerified!==false||
    x.independentlyReviewedSourceRights!==false||
    x.flightLevelPreCertified!==false||x.phase6Go!==false)
    hold("NOT_STAGE8_UNRELEASED_PROPOSALS");
 if(![p.expectedProposalSha256,p.expectedManifestSha256,
    p.expectedCalendarSha256,p.expectedConfigSha256,p.expectedFrameSha256,
    p.expectedProviderContractSha256,p.expectedRightsReviewSha256,
    p.expectedReleaseSha256,p.expectedChargeDayBudgetHashSha256,
    x.dayProposalSha256,x.earlyDrawSha256].every(z=>
    typeof z==="string"&&SHA.test(z))||
    x.manifestSha256!==p.expectedManifestSha256||
    x.dayProposalSha256!==p.expectedProposalSha256||
    !ROLE.test(p.expectedRestrictedWriterRole??"")||
    p.independentFreezeApproved!==true||
    p.independentRightsReviewApproved!==true||
    p.githubOnlyProspectiveOwnerApproved!==true)
    hold("NO_INDEPENDENT_RELEASE_OR_RESTRICTED_ROLE");
 if(!Number.isInteger(x.runDayIndex)||x.runDayIndex<1||x.runDayIndex>31||
    !Array.isArray(x.queries)||x.queries.length!==12||
    !Array.isArray(x.actualUtcChargeBudgets)||
    sha(x.actualUtcChargeBudgets)!==p.expectedChargeDayBudgetHashSha256)
    hold("DAY_OR_FROZEN_UTC_CHARGE_BUDGET_INVALID");
 const cross=new Set<string>();
 for(const q of x.queries){
   if(q.manifest_sha256!==p.expectedManifestSha256||
      q.run_day_index!==x.runDayIndex||
      q.early_draw_sha256!==x.earlyDrawSha256||
      q.reviewed_release_sha256!==p.expectedReleaseSha256||
      q.rights_review_sha256!==p.expectedRightsReviewSha256||
      q.provider_contract_sha256!==p.expectedProviderContractSha256||
      q.github_run_id!=="00000"||
      q.state!=="PREPARED"||q.api_units_per_attempt!==2||
      q.max_physical_attempts!==1||
      !SLOTS.includes(q.slot_id)||!HORIZONS.includes(q.horizon))
      hold("V0079_PREPARED_COLUMN_OR_RELEASE_PIN_MISMATCH");
   const {query_digest,...contents}=q;
   if(query_digest!==sha({
      schema:"v39.phase5.v0079.query-prepared-proposal.v1",...contents
   }))hold("QUERY_DIGEST_CHANGED_AFTER_REVIEW");
   const key=q.slot_id+"|"+q.horizon;
   if(cross.has(key))hold("DUPLICATE_SLOT_HORIZON");
   cross.add(key);
 }
 if(cross.size!==12)hold("INCOMPLETE_DAILY_SLOTS");
}
export async function commitStage9P5DayV0079PreparedRows(
 pool:Pick<Pool,"connect">,p:P5Stage9PreparedDayReview
):Promise<P5Stage9DayPrepared>{
 verifyScope(p);
 if(!pool||typeof pool.connect!=="function")hold("RESTRICTED_DB_POOL_ABSENT");
 const client:PoolClient=await pool.connect();
 let started=false,commitAttempted=false;
 try{
  await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");started=true;
  await client.query("SET LOCAL statement_timeout='12000ms'");
  await client.query("SET LOCAL lock_timeout='3000ms'");
  const who=(await client.query(
   "SELECT current_database() AS db,current_user AS actor,"+
   "current_setting('transaction_read_only') AS read_only,"+
   "clock_timestamp() AS at,pg_is_in_recovery() AS replica,"+
   "has_table_privilege(current_user,"+
   "'clean.phase5_fids_allowed_query_v39','INSERT') AS can_insert,"+
   "has_table_privilege(current_user,"+
   "'clean.phase5_fids_allowed_query_v39','UPDATE') AS can_update,"+
   "has_table_privilege(current_user,"+
   "'clean.phase5_fids_allowed_query_v39','DELETE') AS can_delete"
  )).rows[0];
  if(who?.db!=="neondb"||who.actor!==p.expectedRestrictedWriterRole||
     who.read_only!=="off"||who.replica!==false||
     who.can_insert!==true||who.can_update!==false||who.can_delete!==false)
   hold("NO_EXACT_INSERT_ONLY_PRODUCTION_ROLE");
  const stamp=time(who.at).getTime(),x=p.proposal;
  const earliest=Math.min(...x.queries.map(q=>time(q.planned_dispatch_utc).getTime()));
  // The whole day, including T24, must be prospectively prepared.
  if(stamp>=earliest-120_000)hold("MISSED_DAY_SOURCE_PREPARE_WINDOW");
  await client.query(
   "SELECT pg_advisory_xact_lock(hashtext('v39-phase5-prepare-day'),$1)",
   [x.runDayIndex]
  );
  const auth=(await client.query(
   "SELECT manifest_sha256,calendar_hash,config_hash,enabled,revoked_at_utc "+
   "FROM clean.adb_phase6_authorization WHERE singleton_key=true"
  )).rows;
  if(auth.length!==1||auth[0].enabled!==true||auth[0].revoked_at_utc!==null||
     auth[0].manifest_sha256!==p.expectedManifestSha256||
     auth[0].calendar_hash!==p.expectedCalendarSha256||
     auth[0].config_hash!==p.expectedConfigSha256)
   hold("REVOKED_OR_UNFROZEN_AUTHORIZATION");
  const cal=(await client.query(
   "SELECT run_day_index,scheduled_start_utc,frozen_draw_seed,draw_type,"+
   "anchor_icao,slot_regions,pair_airport_set,calendar_hash,config_hash,"+
   "frame_hash,date_utc FROM clean.adb_phase6_calendar_day "+
   "WHERE run_day_index=$1 FOR SHARE",[x.runDayIndex]
  )).rows;
  if(cal.length!==1||cal[0].calendar_hash!==p.expectedCalendarSha256||
      cal[0].config_hash!==p.expectedConfigSha256||
      cal[0].frame_hash!==p.expectedFrameSha256||
      Number(cal[0].run_day_index)!==x.runDayIndex)
   hold("SAVED_CALENDAR_DAY_CHANGED");
  const day:PreparedDayForReadback={
   runDayIndex:x.runDayIndex,scheduledStartUtc:time(cal[0].scheduled_start_utc),
   frozenDrawSeed:String(cal[0].frozen_draw_seed),
   drawType:cal[0].draw_type,anchorIcao:String(cal[0].anchor_icao),
   slotRegions:cal[0].slot_regions,pairAirportSet:cal[0].pair_airport_set,
   calendarHash:cal[0].calendar_hash,
   configHash:cal[0].config_hash,frameHash:cal[0].frame_hash
  };
  if(day.scheduledStartUtc.toISOString().slice(0,10)!==dayDate(cal[0].date_utc))
   hold("SERVICE_DAY_DATE_WRONG");
  const saved=(await client.query(
   "SELECT slot_id,target_region,draw_type,selected_icao,frozen_draw_seed,"+
   "selected_at_utc,adaptive_state_hash,probability_vector,"+
   "airport_layer_design_probability FROM clean.adb_sampling_draw "+
   "WHERE run_day_index=$1 ORDER BY slot_id FOR SHARE",
   [x.runDayIndex]
  )).rows as PreparedDrawRow[];
  if(saved.length!==4)hold("MISSING_FOUR_COMMITTED_DRAW_ROWS");
  const proof=verifyPreparedDailyDraw(day,saved);
  if(proof.stateHash!==x.earlyDrawSha256||Date.parse(proof.selectedAtUtc)>=stamp)
   hold("SAVED_EARLY_DRAW_CHANGED_OR_FUTURE");
  const selected=new Map(proof.selections.map(z=>[z.slotId,z.icao]));
  for(const q of x.queries){
   if(selected.get(q.slot_id)!==q.airport_icao||
      time(q.service_window_start_utc).getTime()!==
       day.scheduledStartUtc.getTime()||
      time(q.planned_dispatch_utc).getTime()>=
       time(q.hard_latest_dispatch_utc).getTime()||
      time(q.hard_latest_dispatch_utc).getTime()>
       time(q.prediction_cutoff_utc).getTime()-120_000||
      time(q.planned_dispatch_utc).toISOString().slice(0,10)!==
       q.planned_charge_utc_date)
    hold("SOURCE_AIRPORT_OR_SOURCE_CUTOFF_OR_CHARGE_DAY_CHANGED");
  }
  const budgets=(await client.query(
   "SELECT manifest_sha256,run_day_index,budget_day_utc,calendar_hash,"+
   "config_hash,frame_hash,early_draw_sha256,daily_api_ceiling,"+
   "daily_other_reserved_units,daily_source_reserved_units "+
   "FROM clean.phase5_fids_day_budget_v39 "+
   "WHERE manifest_sha256=$1 AND run_day_index=$2 FOR SHARE",
   [p.expectedManifestSha256,x.runDayIndex]
  )).rows;
  if(budgets.length!==1||
    budgets[0].early_draw_sha256!==x.earlyDrawSha256||
    budgets[0].calendar_hash!==p.expectedCalendarSha256||
    budgets[0].config_hash!==p.expectedConfigSha256||
    budgets[0].frame_hash!==p.expectedFrameSha256||
    dayDate(budgets[0].budget_day_utc)!==
     day.scheduledStartUtc.toISOString().slice(0,10)||
    Number(budgets[0].daily_other_reserved_units)+
     Number(budgets[0].daily_source_reserved_units)+24>
     Number(budgets[0].daily_api_ceiling))
   hold("DAY_BUDGET_NOT_FROZEN_OR_INSUFFICIENT");
  const cycle=(await client.query(
   "SELECT cycle_api_ceiling,other_category_reserved_units,"+
   "protected_api_floor_units,physically_reserved_units "+
   "FROM clean.phase5_fids_cycle_budget_v39 "+
   "WHERE manifest_sha256=$1 FOR SHARE",[p.expectedManifestSha256]
  )).rows;
  if(cycle.length!==1||[
      "cycle_api_ceiling","other_category_reserved_units",
      "protected_api_floor_units","physically_reserved_units"
     ].some(k=>!Number.isSafeInteger(Number(cycle[0][k]))||
                       Number(cycle[0][k])<0)||
    Number(cycle[0].other_category_reserved_units)+
    Number(cycle[0].protected_api_floor_units)+
    Number(cycle[0].physically_reserved_units)+24>
    Number(cycle[0].cycle_api_ceiling))
   hold("CYCLE_BUDGET_NOT_FROZEN_OR_INSUFFICIENT");
  const charge=(await client.query(
   "SELECT charge_day_utc,daily_api_ceiling,daily_other_reserved_units,"+
   "physically_reserved_units FROM clean.phase5_fids_utc_charge_budget_v39 "+
   "WHERE manifest_sha256=$1 ORDER BY charge_day_utc FOR SHARE",
   [p.expectedManifestSha256]
  )).rows;
  const byDay=new Map(charge.map(a=>[dayDate(a.charge_day_utc),a]));
  for(const b of x.actualUtcChargeBudgets){
   const a=byDay.get(b.day);
   if(!a||Number(a.daily_api_ceiling)<
        Number(a.daily_other_reserved_units)+
        Number(a.physically_reserved_units)+b.candidateUnits||
      Number(a.daily_other_reserved_units)!==b.otherReserved||
      Number(a.physically_reserved_units)!==b.alreadyReserved)
    hold("ACTUAL_UTC_CHARGE_DAY_BUDGET_MISMATCH");
  }
  const existing=(await client.query(
   "SELECT query_digest FROM clean.phase5_fids_allowed_query_v39 "+
   "WHERE manifest_sha256=$1 AND run_day_index=$2 FOR UPDATE",
   [p.expectedManifestSha256,x.runDayIndex]
  ));
  if(existing.rowCount!==0)hold("EXISTING_QUERY_ROWS_NO_BLIND_DUPLICATE");
  for(const q of x.queries){
   const values=COLUMNS.map(c=>q[c as keyof Stage8V0079PreparedProposal]);
   const sql="INSERT INTO clean.phase5_fids_allowed_query_v39 ("+
      COLUMNS.join(",")+") VALUES ("+
      COLUMNS.map((_,i)=>"$"+(i+1)).join(",")+
      ") RETURNING query_digest";
   const ret=await client.query(sql,values);
   if(ret.rowCount!==1||ret.rows[0]?.query_digest!==q.query_digest)
    hold("PREPARED_QUERY_NOT_INSERTED_EXACT");
  }
  commitAttempted=true;
  await client.query("COMMIT");started=false;
  return {
   schema:"v39.phase5.stage9.verified-day-prepared-db-commit.v1",
   status:"TWELVE_V0079_PREPARED_QUERY_ROWS_COMMITTED_NOT_SOURCE_GET",
   day:x.runDayIndex,manifestSha256:p.expectedManifestSha256,
   queryRowCount:12,preparedDigestSha256:x.dayProposalSha256,
   firstPhysicalGetAtUtc:new Date(earliest).toISOString(),
   databaseWrites:12,providerCalls:0,paidSourceAttempts:0,
   realGithubRunBound:false,flightLevelPreCertified:false,
   finalPhase5FreezePassed:false,phase6PaidGo:false
  };
 }catch(err){
  if(started&&!commitAttempted)await client.query("ROLLBACK").catch(()=>{});
  if(commitAttempted)hold("AMBIGUOUS_COMMIT_READONLY_READBACK_BEFORE_RETRY");
  throw err;
 }finally{client.release();}
}
