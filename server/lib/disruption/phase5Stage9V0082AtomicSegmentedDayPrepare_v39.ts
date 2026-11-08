/**
 * Phase5: independently reviewed Amendment C Stage9 V0079+V0082 atomic
 * prepared-query/partition writer. NO scheduled workflow, CLI, ADB GET,
 * provider rights declaration, or production installer is supplied.
 *
 * The seven-category V0082 release/caps/daily plans must ALREADY have been
 * frozen by a separately reviewed owner. This restricted writer has
 * SELECT+INSERT on only the TWO child ledgers (query + exact partition)
 * and SELECT-only on budgets/auth/calendar/draws. Never grant it UPDATE,
 * DELETE, physical attempt INSERT, or category/release INSERT.
 *
 * Preloading a category plan is not a phase5 FREEZE: after INSERT, the
 * physical GET trigger still independently requires complete exact
 * charge-day query grids; no paid HTTP or phase6 GO follows from this.
 */
import {createHash} from "node:crypto";
import type {Pool,PoolClient} from "pg";
import {verifyPreparedDailyDraw,type PreparedDayForReadback,
 type PreparedDrawRow} from "./phase5EarlyPreselectionReadback_v39";
import type {Stage8DayProposalResult,Stage8V0079PreparedProposal}
 from "./phase5V0079DailyPreparedQueryProposals_v39";

const SHA=/^[a-f0-9]{64}$/;
const ROLE=/^phase5_fids_prepare_[a-z0-9_]{6,42}$/;
const SLOTS=["HUB","MID_A","MID_B","REGIONAL"] as const;
const HORIZONS=["T-24h","T-6h","T-90m"] as const;
const CATS=["FIDS_BASE_UNITS","FIDS_SPLIT_UNITS",
 "FIDS_RETRY_UNIT_BUDGET","VALIDATION_UNIT_BUDGET",
 "OUTCOME_REST_UNIT_BUDGET","HISTORY_BOOTSTRAP_UNIT_BUDGET",
 "DIAGNOSTIC_UNIT_BUDGET"] as const;
const SOURCE_CATS=new Set(["FIDS_BASE_UNITS","FIDS_SPLIT_UNITS"]);
const HOUR=3600000,MINUTE=60000;
const OFFSETS:Record<string,number>={
 "T-24h":24*HOUR,"T-6h":6*HOUR,"T-90m":90*MINUTE
};
const sha=(x:unknown)=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
const hold=(x:string):never=>{throw Error("REFUSED_P5_V0082_ATOMIC_DAY_PREPARE_"+x);};
const dt=(x:unknown):number=>{
 const v=x instanceof Date?x:new Date(String(x));
 if(!Number.isFinite(v.getTime()))hold("INVALID_DATABASE_TIME");
 return v.getTime();
};
const utc=(x:unknown):string=>new Date(dt(x)).toISOString().slice(0,10);
const integral=(x:unknown,min=0,max=50000)=>
 Number.isSafeInteger(Number(x))&&Number(x)>=min&&Number(x)<=max;

const COLS=[
 "query_digest","manifest_sha256","run_day_index","query_key",
 "slot_id","horizon","airport_icao","early_draw_sha256",
 "reviewed_release_sha256","rights_review_sha256",
 "provider_contract_sha256","github_run_id",
 "service_window_start_utc","service_window_end_utc",
 "from_local","to_local","airport_iana_timezone",
 "provider_api_version","fids_protocol_version",
 "planned_dispatch_utc","planned_charge_utc_date",
 "hard_latest_dispatch_utc","prediction_cutoff_utc",
 "api_units_per_attempt","max_physical_attempts","state"
] as const;
const QUERY_INSERT="INSERT INTO clean.phase5_fids_allowed_query_v39 ("+
 COLS.join(",")+") VALUES ("+COLS.map((_,i)=>"$"+(i+1)).join(",")+
 ") RETURNING query_digest";
const PART_INSERT="INSERT INTO clean.phase5_fids_exact_query_partition_v39 ("+
 "query_digest,manifest_sha256,segment_index,partition_index,window_shape,"+
 "rest_category,reviewed_provider_range_sha256) "+
 "VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING query_digest";

type P=NonNullable<Stage8DayProposalResult["sourcePartitionPins"]>[number];
export interface P5V0082AtomicDayReview {
 proposal:Stage8DayProposalResult;
 expectedProposalSha256:string;
 /** The independently READ-ONLY reconstructed Stage6 source evidence digest. */
 expectedSourceCandidateDigestSha256:string;
 expectedManifestSha256:string;
 expectedCalendarSha256:string;
 expectedConfigSha256:string;
 expectedFrameSha256:string;
 expectedProviderContractSha256:string;
 expectedRightsReviewSha256:string;
 expectedReleaseSha256:string;
 expectedRestrictedWriterRole:string;
 expectedChargeDayBudgetHashSha256:string;
 /** External complete 31-day source/budget review pins, not calculated in writer. */
 reviewed31DaySourceRequestGridSha256:string;
 reviewedCategoryBudgetSha256:string;
 /** These booleans are admission inputs; NOT actual licensing evidence. */
 independentFreezeApproved:true;
 independentRightsReviewApproved:true;
 githubOnlyProspectiveOwnerApproved:true;
}
export interface P5V0082AtomicPreparedResult {
 schema:"v39.phase5.v0082.atomic-segmented-day-prepared.v1";
 status:"ATOMIC_V0079_V0082_PREPARED_UNARMED_NOT_SOURCE_GET";
 runDayIndex:number;manifestSha256:string;
 preparedQueryRows:number;preparedPartitionRows:number;
 preparedProposalSha256:string;
 databaseInserts:number;providerCalls:0;paidSourceAttempts:0;
 frozenCategoryBudgetWritten:false;
 realGithubRunBound:false;sourceOriginalCommitted:false;
 actualFlightPreCertified:false;phase5ScientificFreeze:false;phase6PaidGo:false;
}
function canonicalPartition(q:Stage8V0079PreparedProposal,pin:P,
 parentStart:number,shape:"4h"|"2x2h"|"up-to-6h",rangeMin:number):boolean{
 const parentMinutes=shape==="up-to-6h"?360:240;
 const childMinutes=shape==="2x2h"?120:parentMinutes;
 const startShift=shape==="2x2h"?
  (pin.segmentIndex===1?0:pin.segmentIndex===2?180:-1):
  pin.segmentIndex===1?0:-1;
 if(startShift<0||!integral(pin.partitionIndex,1,360)||
    (pin.partitionIndex-1)*rangeMin>=childMinutes)return false;
 const childStart=parentStart+startShift*MINUTE;
 const a=childStart+(pin.partitionIndex-1)*rangeMin*MINUTE;
 const b=Math.min(childStart+childMinutes*MINUTE,a+rangeMin*MINUTE);
 const offset=OFFSETS[q.horizon];
 return dt(q.service_window_start_utc)===a&&
  dt(q.service_window_end_utc)===b&&
  dt(q.prediction_cutoff_utc)>=a-offset&&
  dt(q.prediction_cutoff_utc)<b-offset&&
  pin.serviceWindowStartUtc===new Date(a).toISOString()&&
  pin.serviceWindowEndUtc===new Date(b).toISOString()&&
  pin.windowShape===shape&&
  pin.restCategory===(pin.partitionIndex===1?
   "FIDS_BASE_UNITS":"FIDS_SPLIT_UNITS");
}
function checkedProposal(p:P5V0082AtomicDayReview):{
 queries:Stage8V0079PreparedProposal[];pins:P[];shape:"4h"|"2x2h"|"up-to-6h";
 range:number;requestedByCharge:Map<string,Map<string,number>>;
 firstDispatch:number
}{
 const x=p?.proposal;
 if(!x)return hold("NOT_REVIEWED_SEGMENTED_V3_PROPOSAL");
 const shape=x.reviewedSegmentedSource,pins=x.sourcePartitionPins;
 if(!shape||!pins)return hold("NOT_REVIEWED_SEGMENTED_V3_PROPOSAL");
 if(x.schema!=="v39.phase5.stage8.v0079-day-prepared-proposals.v1"||
    x.status!=="EXACT_DAY_QUERY_PROPOSALS_NOT_DATABASE_PREPARED_OR_SIGNED"||
    !["4h","2x2h","up-to-6h"].includes(shape.windowShape)||
    !integral(shape.verifiedProviderMaxRangeMinutes,1,360)||
    !SHA.test(shape.reviewedProviderRangeEvidenceSha256)||
    x.databaseWrites!==0||x.providerCalls!==0||
    x.installedV0079!==false||x.actualGitHubPrearmVerified!==false||
    x.phase6Go!==false||x.flightLevelPreCertified!==false)
   hold("NOT_REVIEWED_SEGMENTED_V3_PROPOSAL");
 const hashes=[
  p.expectedProposalSha256,p.expectedSourceCandidateDigestSha256,
  p.expectedManifestSha256,p.expectedCalendarSha256,
  p.expectedConfigSha256,p.expectedFrameSha256,
  p.expectedProviderContractSha256,p.expectedRightsReviewSha256,
  p.expectedReleaseSha256,p.expectedChargeDayBudgetHashSha256,
  p.reviewed31DaySourceRequestGridSha256,p.reviewedCategoryBudgetSha256
 ];
 if(hashes.some(v=>typeof v!=="string"||!SHA.test(v))||
    !ROLE.test(p.expectedRestrictedWriterRole??"")||
    p.independentFreezeApproved!==true||
    p.independentRightsReviewApproved!==true||
    p.githubOnlyProspectiveOwnerApproved!==true||
    x.manifestSha256!==p.expectedManifestSha256||
    x.sourceQueryCount<12||x.sourceQueryCount>384||
    x.maximumCandidateGetUnits!==x.sourceQueryCount*2||
    !Number.isSafeInteger(x.runDayIndex)||x.runDayIndex<1||
    x.runDayIndex>31||
    x.dayProposalSha256!==p.expectedProposalSha256||
    sha(x.actualUtcChargeBudgets)!==p.expectedChargeDayBudgetHashSha256||
    !Array.isArray(x.queries)||x.queries.length!==x.sourceQueryCount||
    !Array.isArray(pins)||pins.length!==x.sourceQueryCount)
   hold("NOT_INDEPENDENTLY_FROZEN_MANIFEST_OR_ROLE");
 // Reconstruct the Stage8 packet hash from Stage6's independently reviewed
 // digest: a caller cannot silently replace rows/pins and keep its signature.
 const reconstructed=sha({
  manifest:p.expectedManifestSha256,
  source:p.expectedSourceCandidateDigestSha256,
  proposals:x.queries,checked:x.actualUtcChargeBudgets,
  reviewedSegmentedSource:shape,sourcePartitionPins:pins
 });
 if(reconstructed!==x.dayProposalSha256)
   hold("ALTERED_V3_PROPOSAL_OR_SOURCE_DIGEST");
 const qByDigest=new Map<string,Stage8V0079PreparedProposal>();
 const keySet=new Set<string>(),groupCounts=new Map<string,number>();
 const requested=new Map<string,Map<string,number>>();
 let first=Infinity;
 for(const q of x.queries){
  if(!SLOTS.includes(q.slot_id as typeof SLOTS[number])||
     !HORIZONS.includes(q.horizon as typeof HORIZONS[number])||
     q.manifest_sha256!==p.expectedManifestSha256||
     q.run_day_index!==x.runDayIndex||
     q.early_draw_sha256!==x.earlyDrawSha256||
     q.reviewed_release_sha256!==p.expectedReleaseSha256||
     q.rights_review_sha256!==p.expectedRightsReviewSha256||
     q.provider_contract_sha256!==p.expectedProviderContractSha256||
     q.github_run_id!=="00000"||q.state!=="PREPARED"||
     q.api_units_per_attempt!==2||q.max_physical_attempts!==1||
     dt(q.planned_dispatch_utc)>=dt(q.hard_latest_dispatch_utc)||
     dt(q.hard_latest_dispatch_utc)>dt(q.prediction_cutoff_utc)-2*MINUTE||
     utc(q.planned_dispatch_utc)!==q.planned_charge_utc_date)
    hold("SOURCE_QUERY_WRONG_CLOCK_OR_REVIEW");
  const {query_digest,...rest}=q;
  if(query_digest!==sha({
   schema:"v39.phase5.v0079.query-prepared-proposal.v1",...rest
  })||qByDigest.has(query_digest)||keySet.has(q.query_key))
    hold("DUPLICATE_OR_CHANGED_V0079_QUERY_DIGEST");
  qByDigest.set(query_digest,q);keySet.add(q.query_key);
  first=Math.min(first,dt(q.planned_dispatch_utc));
 }
 const byDigest=new Set<string>(),coverage=new Map<string,Set<string>>();
 for(const pin of pins){
  const q=qByDigest.get(pin.queryDigest);
  if(!q)return hold("UNSIGNED_OR_DUPLICATED_V0082_PARTITION_BINDING");
  if(byDigest.has(pin.queryDigest)||
     pin.queryKey!==q.query_key||
     pin.reviewedProviderRangeEvidenceSha256!==
       shape.reviewedProviderRangeEvidenceSha256)
    hold("UNSIGNED_OR_DUPLICATED_V0082_PARTITION_BINDING");
  byDigest.add(pin.queryDigest);
  // Canonical geometry also checked against actual saved PostgreSQL parent
  // window inside the SERIALIZABLE transaction below.
  const g=[q.slot_id,q.horizon,pin.segmentIndex,pin.partitionIndex].join("|");
  groupCounts.set(g,(groupCounts.get(g)??0)+1);
  if(groupCounts.get(g)!>32)hold("UNBOUNDED_PARTITION_REFRESHES");
  const c=requested.get(q.planned_charge_utc_date)??new Map<string,number>();
  c.set(pin.restCategory,(c.get(pin.restCategory)??0)+2);
  requested.set(q.planned_charge_utc_date,c);
  const g2=q.slot_id+"|"+q.horizon;
  const terms=coverage.get(g2)??new Set<string>();
  terms.add(pin.segmentIndex+"|"+pin.partitionIndex);coverage.set(g2,terms);
 }
 if(byDigest.size!==qByDigest.size||coverage.size!==12||
    !Array.isArray(x.actualUtcChargeBudgets)||
    requested.size!==x.actualUtcChargeBudgets.length)
   hold("INCOMPLETE_SIGNED_PARTITION_QUERY_GRID");
 const childMin=shape.windowShape==="2x2h"?120:
    shape.windowShape==="4h"?240:360;
 const childCount=shape.windowShape==="2x2h"?2:1;
 const partCount=Math.ceil(childMin/shape.verifiedProviderMaxRangeMinutes);
 for(const slot of SLOTS)for(const h of HORIZONS){
   const got=coverage.get(slot+"|"+h);
   if(!got)return hold("MISSING_SEGMENT_OR_RANGE_PARTITION_COVERAGE");
   if(got.size!==childCount*partCount)
     hold("MISSING_SEGMENT_OR_RANGE_PARTITION_COVERAGE");
   for(let child=1;child<=childCount;child++)
    for(let part=1;part<=partCount;part++)
     if(!got.has(child+"|"+part))
       hold("MISSING_EXPOSED_SOURCE_PARTITION");
 }
 for(const b of x.actualUtcChargeBudgets){
  const cats=requested.get(b.day);
  const count=x.queries.filter(q=>q.planned_charge_utc_date===b.day).length;
  if(!cats||count!==b.queries||b.candidateUnits!==count*2||
     !integral(b.otherReserved)||!integral(b.alreadyReserved)||
     !integral(b.remainingAfterProposal)||b.queries<1)
   hold("UNRECONCILED_PHYSICAL_REQUEST_DATE");
 }
 return {queries:x.queries,pins,shape:shape.windowShape,
  range:shape.verifiedProviderMaxRangeMinutes,
  requestedByCharge:requested,firstDispatch:first};
}
export async function commitStage9P5V0082AtomicSegmentedDay(
 pool:Pick<Pool,"connect">,review:P5V0082AtomicDayReview
):Promise<P5V0082AtomicPreparedResult>{
 const reviewed=checkedProposal(review);
 if(!pool||typeof pool.connect!=="function")hold("NO_RESTRICTED_INSERT_ONLY_POOL");
 const client:PoolClient=await pool.connect();
 let started=false,commitAttempted=false;
 try{
  await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");started=true;
  await client.query("SET LOCAL statement_timeout='12000ms'");
  await client.query("SET LOCAL lock_timeout='3000ms'");
  const actor=(await client.query(
   "SELECT current_database() AS db,current_user AS role,"+
   "current_setting('transaction_read_only') AS ro,"+
   "clock_timestamp() AS at,pg_is_in_recovery() AS replica"
  )).rows[0];
  if(actor?.db!=="neondb"||actor.role!==review.expectedRestrictedWriterRole||
     actor.ro!=="off"||actor.replica!==false)
    hold("NO_REAL_RESTRICTED_PRODUCTION_WRITER_ROLE");
  // Explicitly deny broader powers even if the login name matches.
  const access=(await client.query(
   "SELECT "+
   "has_table_privilege(current_user,"+
   "'clean.phase5_fids_allowed_query_v39','INSERT') AS qi,"+
   "has_table_privilege(current_user,"+
   "'clean.phase5_fids_exact_query_partition_v39','INSERT') AS pi,"+
   "has_table_privilege(current_user,"+
   "'clean.phase5_fids_allowed_query_v39','UPDATE') AS qu,"+
   "has_table_privilege(current_user,"+
   "'clean.phase5_fids_allowed_query_v39','DELETE') AS qd,"+
   "has_table_privilege(current_user,"+
   "'clean.phase5_fids_exact_query_partition_v39','UPDATE') AS pu,"+
   "has_table_privilege(current_user,"+
   "'clean.phase5_fids_exact_query_partition_v39','DELETE') AS pd,"+
   "has_table_privilege(current_user,"+
   "'clean.phase5_fids_utc_rest_category_budget_v39','INSERT') AS bi,"+
   "has_table_privilege(current_user,"+
   "'clean.phase5_fids_seven_rest_release_v39','INSERT') AS ri,"+
   "has_table_privilege(current_user,"+
   "'clean.phase5_fids_physical_attempt_v39','INSERT') AS ai"
  )).rows[0];
  if(!access||access.qi!==true||access.pi!==true||
    [access.qu,access.qd,access.pu,access.pd,access.bi,access.ri,access.ai]
     .some(v=>v!==false))
    hold("NO_EXACT_TWO_TABLE_INSERT_ONLY_ACL");
  // Explicit defense against a mis-granted preparer. INSERT-only on two
  // identity ledgers is insufficient if the same role could UPDATE a
  // budget/category, TRUNCATE a query, or read raw provider Contents.
  // Only immutable hard-coded table and privilege names form this SQL.
  const forbidden=[
   ["clean.phase5_fids_allowed_query_v39",["TRUNCATE"]],
   ["clean.phase5_fids_exact_query_partition_v39",["TRUNCATE"]],
   ["clean.phase5_fids_seven_rest_release_v39",
      ["INSERT","UPDATE","DELETE","TRUNCATE"]],
   ["clean.phase5_fids_cycle_rest_category_cap_v39",
      ["INSERT","UPDATE","DELETE","TRUNCATE"]],
   ["clean.phase5_fids_utc_rest_category_budget_v39",
      ["UPDATE","DELETE","TRUNCATE"]],
   ["clean.phase5_fids_cycle_budget_v39",
      ["INSERT","UPDATE","DELETE","TRUNCATE"]],
   ["clean.phase5_fids_day_budget_v39",
      ["INSERT","UPDATE","DELETE","TRUNCATE"]],
   ["clean.phase5_fids_utc_charge_budget_v39",
      ["INSERT","UPDATE","DELETE","TRUNCATE"]],
   ["clean.phase5_fids_physical_attempt_v39",
      ["UPDATE","DELETE","TRUNCATE"]],
   ["clean.phase5_fids_original_binding_v39",
      ["INSERT","UPDATE","DELETE","TRUNCATE"]],
   ["clean.fids_query_response",["SELECT","INSERT","UPDATE","DELETE"]],
   ["clean.flight_population",["SELECT","INSERT","UPDATE","DELETE"]]
  ] as const;
  const clauses=forbidden.flatMap(([table,privs])=>
    privs.map((priv)=>"has_table_privilege(current_user,'"+
      table+"','"+priv+"')")).map((expr,i)=>expr+" AS forbidden_"+i);
  // Unique aliases are essential: node-postgres otherwise collapses all
  // identically named has_table_privilege columns to one last field.
  const scope=(await client.query("SELECT "+clauses.join(","))).rows[0];
  if(!scope||Object.values(scope).some(v=>v!==false))
   hold("EXTRA_FROZEN_LEDGER_OR_RAW_PROVIDER_PRIVILEGE");
  const now=dt(actor.at),x=review.proposal;
  if(now>=reviewed.firstDispatch-120000)
    hold("PREPARE_AFTER_FIRST_PROSPECTIVE_SOURCE_DEADLINE");
  await client.query(
   "SELECT pg_advisory_xact_lock(hashtext('v39-phase5-prepare-day'),$1)",
   [x.runDayIndex]
  );
  // Check day ownership before spend-plan matching. This refuses a
  // replay deterministically even though previously committed query units
  // already fill the frozen category reservation envelope.
  const existing=(await client.query(
   "SELECT query_digest FROM clean.phase5_fids_allowed_query_v39 "+
   "WHERE manifest_sha256=$1 AND run_day_index=$2",
   [review.expectedManifestSha256,x.runDayIndex]
  )).rows;
  if(existing.length!==0)
    hold("SOURCE_DAY_ALREADY_PARTIALLY_PREPARED_NO_REPLAY");
  const auth=(await client.query(
   "SELECT manifest_sha256,calendar_hash,config_hash,enabled,revoked_at_utc "+
   "FROM clean.adb_phase6_authorization WHERE singleton_key=true"
  )).rows;
  if(auth.length!==1||auth[0].enabled!==true||
     auth[0].revoked_at_utc!==null||
     auth[0].manifest_sha256!==review.expectedManifestSha256||
     auth[0].calendar_hash!==review.expectedCalendarSha256||
     auth[0].config_hash!==review.expectedConfigSha256)
    hold("SAVED_PHASE6_AUTH_NOT_INDEPENDENTLY_ACTIVE");
  const cal=(await client.query(
   "SELECT run_day_index,scheduled_start_utc,frozen_draw_seed,draw_type,"+
   "anchor_icao,slot_regions,pair_airport_set,calendar_hash,config_hash,"+
   "frame_hash,date_utc,window_shape,active_duration_minutes "+
   "FROM clean.adb_phase6_calendar_day WHERE run_day_index=$1",
   [x.runDayIndex]
  )).rows;
  if(cal.length!==1||cal[0].calendar_hash!==review.expectedCalendarSha256||
     cal[0].config_hash!==review.expectedConfigSha256||
     cal[0].frame_hash!==review.expectedFrameSha256||
     Number(cal[0].run_day_index)!==x.runDayIndex||
     cal[0].window_shape!==reviewed.shape||
     Number(cal[0].active_duration_minutes)!==
       (reviewed.shape==="up-to-6h"?360:240)||
     utc(cal[0].scheduled_start_utc)!==utc(cal[0].date_utc))
    hold("ACTUAL_SAVED_CALENDAR_TREATMENT_CHANGED");
  const day:PreparedDayForReadback={
   runDayIndex:x.runDayIndex,
   scheduledStartUtc:new Date(dt(cal[0].scheduled_start_utc)),
   frozenDrawSeed:String(cal[0].frozen_draw_seed),
   drawType:cal[0].draw_type,anchorIcao:String(cal[0].anchor_icao),
   slotRegions:cal[0].slot_regions,pairAirportSet:cal[0].pair_airport_set,
   calendarHash:cal[0].calendar_hash,
   configHash:cal[0].config_hash,frameHash:cal[0].frame_hash
  };
  const draws=(await client.query(
   "SELECT slot_id,target_region,draw_type,selected_icao,"+
   "frozen_draw_seed,selected_at_utc,adaptive_state_hash,"+
   "probability_vector,airport_layer_design_probability "+
   "FROM clean.adb_sampling_draw WHERE run_day_index=$1 ORDER BY slot_id",
   [x.runDayIndex]
  )).rows as PreparedDrawRow[];
  if(draws.length!==4)hold("MISSING_FOUR_REAL_EARLY_AIRPORT_DRAWS");
  const d=verifyPreparedDailyDraw(day,draws);
  if(d.stateHash!==x.earlyDrawSha256||dt(d.selectedAtUtc)>=now)
    hold("ALTERED_FOUR_SLOT_EARLY_SELECTION");
  const selected=new Map(d.selections.map(v=>[v.slotId,v.icao]));
  const parent=day.scheduledStartUtc.getTime();
  for(const pin of reviewed.pins){
   const q=reviewed.queries.find(q=>q.query_digest===pin.queryDigest)!;
   if(selected.get(q.slot_id as typeof SLOTS[number])!==q.airport_icao||
      !canonicalPartition(q,pin,parent,reviewed.shape,reviewed.range))
     hold("SAVED_SOURCE_AIRPORT_OR_EXPOSED_PARTITION_CHANGED");
  }
  const release=(await client.query(
   "SELECT manifest_sha256,reviewed_source_request_grid_sha256,"+
   "reviewed_provider_range_sha256,verified_provider_max_range_minutes,"+
   "reviewed_category_budget_sha256,frozen_at_utc "+
   "FROM clean.phase5_fids_seven_rest_release_v39 "+
   "WHERE manifest_sha256=$1",[review.expectedManifestSha256]
  )).rows;
  if(release.length!==1||
     release[0].reviewed_source_request_grid_sha256!==
       review.reviewed31DaySourceRequestGridSha256||
     release[0].reviewed_provider_range_sha256!==
       x.reviewedSegmentedSource!.reviewedProviderRangeEvidenceSha256||
     Number(release[0].verified_provider_max_range_minutes)!==reviewed.range||
     release[0].reviewed_category_budget_sha256!==
       review.reviewedCategoryBudgetSha256||
     dt(release[0].frozen_at_utc)>=now)
    hold("MISSING_REAL_SAVED_REVIEWED_SEVEN_CATEGORY_FREEZE");
  const budgets=(await client.query(
   "SELECT manifest_sha256,run_day_index,budget_day_utc,calendar_hash,"+
   "config_hash,frame_hash,early_draw_sha256,daily_api_ceiling,"+
   "daily_other_reserved_units,daily_source_reserved_units "+
   "FROM clean.phase5_fids_day_budget_v39 "+
   "WHERE manifest_sha256=$1 AND run_day_index=$2",
   [review.expectedManifestSha256,x.runDayIndex]
  )).rows;
  if(budgets.length!==1||
     budgets[0].calendar_hash!==review.expectedCalendarSha256||
     budgets[0].config_hash!==review.expectedConfigSha256||
     budgets[0].frame_hash!==review.expectedFrameSha256||
     budgets[0].early_draw_sha256!==x.earlyDrawSha256||
     utc(budgets[0].budget_day_utc)!==utc(day.scheduledStartUtc)||
     !integral(budgets[0].daily_api_ceiling,2,1900)||
     !integral(budgets[0].daily_other_reserved_units)||
     !integral(budgets[0].daily_source_reserved_units)||
     Number(budgets[0].daily_other_reserved_units)+
     Number(budgets[0].daily_source_reserved_units)+
     x.maximumCandidateGetUnits>Number(budgets[0].daily_api_ceiling))
    hold("SAVED_PARENT_SOURCE_BUDGET_UNDERFUNDED");
  const cycle=(await client.query(
   "SELECT cycle_api_ceiling,other_category_reserved_units,"+
   "protected_api_floor_units,physically_reserved_units "+
   "FROM clean.phase5_fids_cycle_budget_v39 WHERE manifest_sha256=$1",
   [review.expectedManifestSha256]
  )).rows;
  if(cycle.length!==1||!integral(cycle[0].cycle_api_ceiling,2,50000)||
     !integral(cycle[0].other_category_reserved_units)||
     !integral(cycle[0].protected_api_floor_units)||
     !integral(cycle[0].physically_reserved_units)||
     Number(cycle[0].other_category_reserved_units)+
     Number(cycle[0].protected_api_floor_units)+
     Number(cycle[0].physically_reserved_units)+
     x.maximumCandidateGetUnits>Number(cycle[0].cycle_api_ceiling))
    hold("SAVED_CYCLE_REST_CAP_UNDERFUNDED");
  const caps=(await client.query(
   "SELECT category,ceiling_units "+
   "FROM clean.phase5_fids_cycle_rest_category_cap_v39 "+
   "WHERE manifest_sha256=$1",[review.expectedManifestSha256]
  )).rows;
  const capsMap=new Map<string,number>(caps.map(c=>[c.category,Number(c.ceiling_units)]));
  if(caps.length!==7||capsMap.size!==7||
     CATS.some(c=>!capsMap.has(c)||!integral(capsMap.get(c))))
    hold("MISSING_SEVEN_FROZEN_REST_CYCLE_CATEGORIES");
  const all=(await client.query(
   "SELECT category,SUM(planned_units)::bigint AS planned "+
   "FROM clean.phase5_fids_utc_rest_category_budget_v39 "+
   "WHERE manifest_sha256=$1 GROUP BY category",
   [review.expectedManifestSha256]
  )).rows;
  const totalByCat=new Map<string,number>(all.map(r=>[r.category,Number(r.planned)]));
  if(totalByCat.size!==7||CATS.some(c=>
      !integral(totalByCat.get(c))||
      Number(totalByCat.get(c))>Number(capsMap.get(c))))
    hold("CYCLE_SEVEN_REST_CATEGORY_CEILING_MISMATCH");
  const allOther=CATS.filter(c=>!SOURCE_CATS.has(c)).
    reduce((n,c)=>n+Number(totalByCat.get(c)),0);
  const allFids=Number(totalByCat.get("FIDS_BASE_UNITS"))+
    Number(totalByCat.get("FIDS_SPLIT_UNITS"));
  if(allOther>Number(cycle[0].other_category_reserved_units)||
     allOther+allFids+Number(cycle[0].protected_api_floor_units)>
       Number(cycle[0].cycle_api_ceiling))
    hold("CYCLE_CATEGORIES_NOT_FUNDABLE");
  // All possible payment dates, not service day, are checked. Adjacent
  // source days sharing one UTC date may be prepared separately; ensure
  // that the category covers existing approved+new query units, never
  // falsely claim the complete future grid was already prepared.
  const chargeRows=(await client.query(
   "SELECT charge_day_utc,daily_api_ceiling,daily_other_reserved_units,"+
   "physically_reserved_units FROM clean.phase5_fids_utc_charge_budget_v39 "+
   "WHERE manifest_sha256=$1",
   [review.expectedManifestSha256]
  )).rows;
  const days=new Map(chargeRows.map(r=>[utc(r.charge_day_utc),r]));
  for(const b of x.actualUtcChargeBudgets){
   const row=days.get(b.day);
   if(!row||Number(row.daily_other_reserved_units)!==b.otherReserved||
      Number(row.physically_reserved_units)!==b.alreadyReserved||
      Number(row.daily_api_ceiling)<
        b.otherReserved+b.alreadyReserved+b.candidateUnits)
     hold("REAL_UTC_CHARGE_DAY_BUDGET_MISMATCH");
   const data=(await client.query(
    "SELECT category,planned_units,physically_reserved_units "+
    "FROM clean.phase5_fids_utc_rest_category_budget_v39 "+
    "WHERE manifest_sha256=$1 AND charge_day_utc=$2::date",
    [review.expectedManifestSha256,b.day]
   )).rows;
   const byCat=new Map<string,{planned:number;spent:number}>(data.map(r=>[
     r.category,{planned:Number(r.planned_units),
      spent:Number(r.physically_reserved_units)}]));
   if(data.length!==7||byCat.size!==7||
      CATS.some(c=>!byCat.has(c)||
        !integral(byCat.get(c)!.planned)||!integral(byCat.get(c)!.spent)||
        byCat.get(c)!.planned<byCat.get(c)!.spent))
     hold("INCOMPLETE_SEVEN_UTC_REST_CATEGORIES");
   const other=CATS.filter(c=>!SOURCE_CATS.has(c)).
     reduce((n,c)=>n+byCat.get(c)!.planned,0);
   const source=byCat.get("FIDS_BASE_UNITS")!.planned+
     byCat.get("FIDS_SPLIT_UNITS")!.planned;
   if(other!==b.otherReserved||
      other+source>Number(row.daily_api_ceiling))
     hold("UNRECONCILED_SEVEN_UTC_REST_ENVELOPE");
   const prior=(await client.query(
    "SELECT p.rest_category,COUNT(*)::int AS n "+
    "FROM clean.phase5_fids_allowed_query_v39 q "+
    "JOIN clean.phase5_fids_exact_query_partition_v39 p "+
    "ON p.query_digest=q.query_digest "+
    "WHERE q.manifest_sha256=$1 AND q.planned_charge_utc_date=$2::date "+
    "GROUP BY p.rest_category",
    [review.expectedManifestSha256,b.day]
   )).rows;
   const old=new Map(prior.map(r=>[r.rest_category,Number(r.n)*2]));
   const upcoming=reviewed.requestedByCharge.get(b.day)!;
   for(const cat of ["FIDS_BASE_UNITS","FIDS_SPLIT_UNITS"]){
     if((old.get(cat)??0)+(upcoming.get(cat)??0)>
        byCat.get(cat)!.planned)
       hold("FIDS_SOURCE_CHARGE_DATE_CATEGORY_UNDERFUNDED");
   }
  }
  // In SERIALIZABLE transaction: no half-written query without its exact
  // immutable partition (or vice versa) can survive a failure.
  const pinByDigest=new Map(reviewed.pins.map(p=>[p.queryDigest,p]));
  for(const q of reviewed.queries){
   const values=COLS.map(c=>q[c as keyof Stage8V0079PreparedProposal]);
   const saved=await client.query(QUERY_INSERT,values);
   if(saved.rowCount!==1||saved.rows[0]?.query_digest!==q.query_digest)
     hold("V0079_PREPARED_QUERY_INSERT_MISMATCH");
   const pin=pinByDigest.get(q.query_digest)!;
   const part=await client.query(PART_INSERT,[
     q.query_digest,review.expectedManifestSha256,
     pin.segmentIndex,pin.partitionIndex,pin.windowShape,
     pin.restCategory,pin.reviewedProviderRangeEvidenceSha256
   ]);
   if(part.rowCount!==1||part.rows[0]?.query_digest!==q.query_digest)
     hold("V0082_EXACT_PARTITION_INSERT_MISMATCH");
  }
  commitAttempted=true;
  await client.query("COMMIT");started=false;
  return {
   schema:"v39.phase5.v0082.atomic-segmented-day-prepared.v1",
   status:"ATOMIC_V0079_V0082_PREPARED_UNARMED_NOT_SOURCE_GET",
   runDayIndex:x.runDayIndex,manifestSha256:review.expectedManifestSha256,
   preparedQueryRows:x.sourceQueryCount,
   preparedPartitionRows:x.sourceQueryCount,
   preparedProposalSha256:x.dayProposalSha256,
   databaseInserts:2*x.sourceQueryCount,providerCalls:0,
   paidSourceAttempts:0,frozenCategoryBudgetWritten:false,
   realGithubRunBound:false,sourceOriginalCommitted:false,
   actualFlightPreCertified:false,phase5ScientificFreeze:false,
   phase6PaidGo:false
  };
 }catch(err){
  if(started&&!commitAttempted)
   await client.query("ROLLBACK").catch(()=>{});
  if(commitAttempted)
   hold("AMBIGUOUS_COMMIT_INDEPENDENT_READ_ONLY_AUDIT_BEFORE_RETRY");
  throw err;
 }finally{client.release();}
}
