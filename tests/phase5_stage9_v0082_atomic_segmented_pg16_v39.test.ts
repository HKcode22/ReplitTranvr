/**
 * Actual disposable PostgreSQL16 (B0062 + V0079 + V0082), no ADB provider.
 * Independent fixture auth/rights booleans are synthetic CI inputs only.
 * Verifies atomic two-table prepared rows under SELECT+INSERT-only owner.
 */
import {beforeAll,afterAll,describe,it,expect} from "vitest";
import {Pool} from "pg";
import {createHash} from "node:crypto";
import {commitEarlyPhase5Draw} from
 "../server/lib/disruption/phase5EarlyAdaptiveDrawOwner_v39";
import {readCommittedP5DayCandidateGrid} from
 "../server/lib/disruption/phase5CommittedDayGridReadonly_v39";
import {planStage8P5DayV0079Proposals} from
 "../server/lib/disruption/phase5V0079DailyPreparedQueryProposals_v39";
import {commitStage9P5V0082AtomicSegmentedDay,
 type P5V0082AtomicDayReview} from
 "../server/lib/disruption/phase5Stage9V0082AtomicSegmentedDayPrepare_v39";

const URL="postgresql://postgres:postgres@localhost:5432/neondb?sslmode=disable";
const USER="phase5_fids_prepare_ci_atomic01";
const WURL="postgresql://"+USER+":ci-only@localhost:5432/neondb?sslmode=disable";
const enabled=process.env.V39_P5_V0082_ATOMIC_PG16==="1";
const suite=enabled?describe:describe.skip;
const sha=(c:string)=>c.repeat(64);
const digest=(x:unknown)=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
const iso=(n:number)=>new Date(n).toISOString();
const H=3600000,M=60000;
const SLOTS=["HUB","MID_A","MID_B","REGIONAL"] as const;
const HORIZONS=[
 ["T-24h",24*H,"T24"],["T-6h",6*H,"T6"],["T-90m",90*M,"T90"]
] as const;
const TIMEZONES:Record<string,string>={
 WSSS:"Asia/Singapore",OMAA:"Asia/Dubai",
 SKBO:"America/Bogota",KGPT:"America/Chicago"
};
const CATS=[
 "FIDS_BASE_UNITS","FIDS_SPLIT_UNITS","FIDS_RETRY_UNIT_BUDGET",
 "VALIDATION_UNIT_BUDGET","OUTCOME_REST_UNIT_BUDGET",
 "HISTORY_BOOTSTRAP_UNIT_BUDGET","DIAGNOSTIC_UNIT_BUDGET"
] as const;
suite("Phase5 V0082 REAL atomic segmented day PG16 (no provider)",()=>{
 let admin:Pool,writer:Pool,review:P5V0082AtomicDayReview;
 let selectedAt:string,serviceStart:string;
 const manifest=sha("e"),range=sha("8"),budgetHash=sha("6"),gridHash=sha("7");
 beforeAll(async()=>{
  if(process.env.GITHUB_ACTIONS!=="true"||
     process.env.V39_P5_V0082_ATOMIC_PG16!=="1"||
     process.env.DATABASE_URL!==URL||
     process.env.AERODATABOX_API_KEY||
     process.env.V39_PHASE6_PROCESS_ARMED!=="0"||
     process.env.V39_PHASE6_OWNER_APPROVED!=="0")
    throw Error("REFUSED_NONDISPOSABLE_V0082_ATOMIC_PG16");
  admin=new Pool({connectionString:URL,max:4});
  const now=new Date((await admin.query(
   "SELECT clock_timestamp() AS at")).rows[0].at).getTime();
  const start=now+30*H;serviceStart=iso(start);
  await admin.query(
   "INSERT INTO clean.adb_phase6_authorization "+
   "(authorization_id,manifest_sha256,calendar_hash,config_hash,code_sha,"+
   "schema_version,phase6_start_date,alert_cap_per_parent_day,"+
   "unsettled_burst_margin_credits,protected_alert_floor,enabled,"+
   "predecessor_evidence_ids) "+
   "VALUES ('CI-V0082-ATOMIC',$1,$2,$3,$4,'v39',$5::date,1900,10,1000,true,"+
   "'[\"synthetic-no-provider\"]'::jsonb)",
   [manifest,sha("a"),sha("b"),"f".repeat(40),serviceStart.slice(0,10)]
  );
  await admin.query(
   "INSERT INTO clean.adb_sampling_frame_registry "+
   "(registry_key,active_frame_version,frame_hash) "+
   "VALUES ('ACTIVE','ci-v0082',$1)",[sha("c")]
  );
  for(const [icao,tier,region] of [
   ["WSSS","HUB","ASIA"],["OMAA","MID","MIDDLE_EAST"],
   ["SKBO","MID","SOUTH_AMERICA"],["KGPT","REGIONAL","NORTH_AMERICA"]
  ]){
   await admin.query(
    "INSERT INTO clean.adb_sampling_frame "+
    "(icao,tier,tier_source,traffic_prior,region,feed_schedule,"+
    "feed_live,feed_adsb,pre_eligible,post_eligible,in_frame,"+
    "frame_version,frame_hash) "+
    "VALUES ($1,$2,'curated',10,$3,true,true,false,true,true,true,"+
    "'ci-v0082',$4)",[icao,tier,region,sha("c")]
   );
  }
  await admin.query(
   "INSERT INTO clean.adb_phase6_calendar_day "+
   "(run_day_index,budget_day_id,calendar_hash,config_hash,date_utc,"+
   "utc_slot,time_class,window_shape,evaluation_partition,draw_type,"+
   "slot_regions,anchor_icao,pair_airport_set,frozen_draw_seed,"+
   "scheduled_start_utc,active_duration_minutes,frame_hash) "+
   "VALUES (1,'P6V0082D1',$1,$2,$3::date,'CI','CI','2x2h',"+
   "'CI','NEW_TEMPLATE',$4::jsonb,'WSSS',NULL,"+
   "'ci-v0082-seed',$5::timestamptz,240,$6)",
   [sha("a"),sha("b"),serviceStart.slice(0,10),
    JSON.stringify({HUB:"ASIA",MID_A:"MIDDLE_EAST",
     MID_B:"SOUTH_AMERICA",REGIONAL:"NORTH_AMERICA"}),
    serviceStart,sha("c")]
  );
  const select=await commitEarlyPhase5Draw(admin,{
   runDayIndex:1,expectedManifestSha256:manifest,
   expectedCalendarHash:sha("a"),expectedConfigHash:sha("b"),
   expectedFrameHash:sha("c"),
   phase5FreezeApproved:true,githubOnlyApproved:true
  });
  expect(select.status).toBe("EARLY_DRAW_COMMITTED");
  const draw=(await admin.query(
   "SELECT slot_id,target_region,draw_type,selected_icao,"+
   "frozen_draw_seed,selected_at_utc,adaptive_state_hash,"+
   "probability_vector,airport_layer_design_probability "+
   "FROM clean.adb_sampling_draw WHERE run_day_index=1 ORDER BY slot_id"
  )).rows;
  selectedAt=new Date(draw[0].selected_at_utc).toISOString();
  const templates=[] as Array<{
   runDayIndex:number;budgetDayUtc:string;physicalChargeDayUtc:string;
   slot:typeof SLOTS[number];horizon:typeof HORIZONS[number][0];
   providerQueryDirection:"Departure";serviceWindowStartUtc:string;
   serviceWindowEndUtc:string;earliestPlannedCutoffUtc:string;
   scheduledRequestUtc:string;maxResponseAndPersistSeconds:number;
   apiUnitsPerAttempt:number;maxAttempts:number;queryKey:string;
  }>;
  for(const slot of SLOTS)for(const [horizon,offset,label] of HORIZONS)
   for(const [seg,shift] of [[1,0],[2,3]]){
    const partStart=start+shift*H,partEnd=partStart+2*H;
    for(let j=0;j<3;j++){
     const request=partStart-offset-4*M+j*45*M;
     templates.push({
      runDayIndex:1,budgetDayUtc:serviceStart.slice(0,10),
      physicalChargeDayUtc:iso(request).slice(0,10),
      slot,horizon,providerQueryDirection:"Departure",
      serviceWindowStartUtc:iso(partStart),
      serviceWindowEndUtc:iso(partEnd),
      earliestPlannedCutoffUtc:iso(request+6*M),
      scheduledRequestUtc:iso(request),
      maxResponseAndPersistSeconds:60,apiUnitsPerAttempt:2,maxAttempts:1,
      queryKey:["CI0082",slot,label,"s"+seg,"r"+j].join("_")
     });
    }
   }
  const timing={
   reviewed31DayCoverageGridSha256:sha("9"),
   maxPopulationStalenessSeconds:3600,maxSchedulerSlipSeconds:0,
   minimumPreCommitMarginSeconds:120,verifiedProviderMaxFidsWindowMinutes:120
  };
  const segmented={
   windowShape:"2x2h" as const,verifiedProviderMaxRangeMinutes:120,
   reviewedProviderRangeEvidenceSha256:range
  };
  const saved=await readCommittedP5DayCandidateGrid(admin,{
   expectedManifestSha256:manifest,expectedCalendarSha256:sha("a"),
   expectedConfigSha256:sha("b"),expectedFrameSha256:sha("c"),
   expectedProviderContractSha256:sha("f"),
   expectedEarlyDrawSha256:select.drawSha256,
   expectedRestrictedReaderRole:"postgres",
   runDayIndex:1,templates,reviewedRefreshTiming:timing,
   reviewedSegmentedSource:segmented
  });
  expect(saved.selectedDayCandidateGrid.acquisitionCount).toBe(72);
  const proposal=planStage8P5DayV0079Proposals({
   stage7:saved,day:{
    runDayIndex:1,scheduledStartUtc:new Date(serviceStart),
    frozenDrawSeed:"ci-v0082-seed",drawType:"NEW_TEMPLATE",
    anchorIcao:"WSSS",slotRegions:{
     HUB:"ASIA",MID_A:"MIDDLE_EAST",
     MID_B:"SOUTH_AMERICA",REGIONAL:"NORTH_AMERICA"},
    pairAirportSet:null,calendarHash:sha("a"),configHash:sha("b"),
    frameHash:sha("c")
   },savedEarlyDrawRows:draw,
   manifestSha256:manifest,calendarSha256:sha("a"),configSha256:sha("b"),
   frameSha256:sha("c"),providerContractSha256:sha("f"),
   reviewedReleaseSha256:sha("1"),rightsReviewSha256:sha("2"),
   localFrames:draw.map(d=>({
    slot:d.slot_id,icao:d.selected_icao,
    ianaTimezone:TIMEZONES[d.selected_icao],
    providerApiVersion:"1.15.4",fidsProtocolVersion:"v39"
   })),
   cycleUnitsAvailable:10000,
   chargeDayBudgets:saved.selectedDayCandidateGrid.actualChargeDayUtcCounts.map(d=>({
    chargeDayUtc:d.day,dailyApiCeiling:1900,
    otherCategoriesReserved:0,existingSourceReserved:0
   }))
  });
  expect(proposal.sourceQueryCount).toBe(72);
  expect(proposal.sourcePartitionPins).toHaveLength(72);
  review={
   proposal,expectedProposalSha256:proposal.dayProposalSha256,
   expectedSourceCandidateDigestSha256:
      saved.selectedDayCandidateGrid.sourceCandidateDigestSha256,
   expectedManifestSha256:manifest,expectedCalendarSha256:sha("a"),
   expectedConfigSha256:sha("b"),expectedFrameSha256:sha("c"),
   expectedProviderContractSha256:sha("f"),
   expectedRightsReviewSha256:sha("2"),expectedReleaseSha256:sha("1"),
   expectedRestrictedWriterRole:USER,
   expectedChargeDayBudgetHashSha256:digest(proposal.actualUtcChargeBudgets),
   reviewed31DaySourceRequestGridSha256:gridHash,
   reviewedCategoryBudgetSha256:budgetHash,
   independentFreezeApproved:true,independentRightsReviewApproved:true,
   githubOnlyProspectiveOwnerApproved:true
  };
  await admin.query(
   "INSERT INTO clean.phase5_fids_cycle_budget_v39 "+
   "(manifest_sha256,cycle_api_ceiling,other_category_reserved_units,"+
   "protected_api_floor_units) VALUES ($1,50000,0,100)",[manifest]);
  await admin.query(
   "INSERT INTO clean.phase5_fids_day_budget_v39 "+
   "(manifest_sha256,run_day_index,budget_day_utc,calendar_hash,"+
   "config_hash,frame_hash,early_draw_sha256,daily_api_ceiling,"+
   "daily_other_reserved_units,daily_source_reserved_units) "+
   "VALUES ($1,1,$2::date,$3,$4,$5,$6,1900,0,0)",
   [manifest,serviceStart.slice(0,10),sha("a"),sha("b"),sha("c"),
    select.drawSha256]);
  const days=[...new Set(proposal.queries.map(q=>q.planned_charge_utc_date))];
  for(const day of days){
   await admin.query(
    "INSERT INTO clean.phase5_fids_utc_charge_budget_v39 "+
    "(manifest_sha256,charge_day_utc,daily_api_ceiling,"+
    "daily_other_reserved_units) VALUES ($1,$2::date,1900,0)",
    [manifest,day]
   );
  }
  await admin.query(
   "INSERT INTO clean.phase5_fids_seven_rest_release_v39 "+
   "(manifest_sha256,reviewed_source_request_grid_sha256,"+
   "reviewed_provider_range_sha256,verified_provider_max_range_minutes,"+
   "reviewed_category_budget_sha256) VALUES ($1,$2,$3,120,$4)",
   [manifest,gridHash,range,budgetHash]
  );
  const perDay=new Map<string,Map<string,number>>();
  for(const pin of proposal.sourcePartitionPins!){
   const q=proposal.queries.find(q=>q.query_digest===pin.queryDigest)!;
   const cat=perDay.get(q.planned_charge_utc_date)??new Map<string,number>();
   cat.set(pin.restCategory,(cat.get(pin.restCategory)??0)+2);
   perDay.set(q.planned_charge_utc_date,cat);
  }
  for(const category of CATS){
   const total=days.reduce((n,d)=>n+
     (perDay.get(d)?.get(category)??0),0);
   await admin.query(
    "INSERT INTO clean.phase5_fids_cycle_rest_category_cap_v39 "+
    "(manifest_sha256,category,ceiling_units) VALUES ($1,$2,$3)",
    [manifest,category,total]
   );
  }
  for(const day of days)for(const category of CATS){
   const plan=perDay.get(day)?.get(category)??0;
   await admin.query(
    "INSERT INTO clean.phase5_fids_utc_rest_category_budget_v39 "+
    "(manifest_sha256,charge_day_utc,category,planned_units) "+
    "VALUES ($1,$2::date,$3,$4)",[manifest,day,category,plan]
   );
  }
  await admin.query(
   "CREATE ROLE "+USER+" LOGIN PASSWORD 'ci-only' NOSUPERUSER NOCREATEDB NOCREATEROLE"
  );
  await admin.query("GRANT USAGE ON SCHEMA clean TO "+USER);
  const reads=[
   "clean.adb_phase6_authorization",
   "clean.adb_phase6_calendar_day","clean.adb_sampling_draw",
   "clean.phase5_fids_cycle_budget_v39",
   "clean.phase5_fids_day_budget_v39",
   "clean.phase5_fids_utc_charge_budget_v39",
   "clean.phase5_fids_allowed_query_v39",
   "clean.phase5_fids_seven_rest_release_v39",
   "clean.phase5_fids_cycle_rest_category_cap_v39",
   "clean.phase5_fids_utc_rest_category_budget_v39",
   "clean.phase5_fids_exact_query_partition_v39"
  ];
  await admin.query("GRANT SELECT ON "+reads.join(",")+" TO "+USER);
  await admin.query(
   "GRANT INSERT ON clean.phase5_fids_allowed_query_v39,"+
   "clean.phase5_fids_exact_query_partition_v39 TO "+USER
  );
  writer=new Pool({connectionString:WURL,max:2});
 });
 afterAll(async()=>{if(writer)await writer.end();if(admin)await admin.end();});
 async function counts(){
  const r=(await admin.query(
   "SELECT (SELECT count(*)::int FROM clean.phase5_fids_allowed_query_v39) q,"+
   "(SELECT count(*)::int FROM clean.phase5_fids_exact_query_partition_v39) p,"+
   "(SELECT count(*)::int FROM clean.phase5_fids_physical_attempt_v39) a,"+
   "(SELECT count(*)::int FROM clean.phase5_fids_original_binding_v39) o"
  )).rows[0];
  return r as {q:number;p:number;a:number;o:number};
 }
 it("refuses production owner role and tampered reviewer source digest",async()=>{
  await expect(commitStage9P5V0082AtomicSegmentedDay(admin,review))
   .rejects.toThrow("NO_REAL_RESTRICTED_PRODUCTION_WRITER_ROLE");
  const wrong={...review,expectedSourceCandidateDigestSha256:sha("0")};
  await expect(commitStage9P5V0082AtomicSegmentedDay(writer,wrong))
   .rejects.toThrow("ALTERED_V3_PROPOSAL_OR_SOURCE_DIGEST");
  expect(await counts()).toEqual({q:0,p:0,a:0,o:0});
 });
 it("refuses missing seventh category, with zero prepared query leakage",async()=>{
  // Remove the zero-valued seventh category (not a protected row update).
  await admin.query(
   "DELETE FROM clean.phase5_fids_utc_rest_category_budget_v39 "+
   "WHERE manifest_sha256=$1 AND category='DIAGNOSTIC_UNIT_BUDGET'",
   [manifest]);
  await expect(commitStage9P5V0082AtomicSegmentedDay(writer,review))
   .rejects.toThrow("CYCLE_SEVEN_REST_CATEGORY_CEILING_MISMATCH");
  expect(await counts()).toEqual({q:0,p:0,a:0,o:0});
  const days=[...new Set(review.proposal.queries.map(q=>q.planned_charge_utc_date))];
  for(const day of days)await admin.query(
   "INSERT INTO clean.phase5_fids_utc_rest_category_budget_v39 "+
   "(manifest_sha256,charge_day_utc,category,planned_units) "+
   "VALUES ($1,$2::date,'DIAGNOSTIC_UNIT_BUDGET',0)",[manifest,day]);
 });
 it("rolls back BOTH table inserts on an injected 2nd partition failure",async()=>{
  await admin.query(`CREATE FUNCTION clean.ci_v0082_bomb() RETURNS trigger
    LANGUAGE plpgsql AS $$
    BEGIN IF (SELECT count(*) FROM clean.phase5_fids_exact_query_partition_v39)>=1
      THEN RAISE EXCEPTION 'CI_EXPECTED_SECOND_PARTITION_FAILURE';
      END IF; RETURN NEW; END $$`);
  await admin.query(`CREATE TRIGGER ci_v0082_atomic_fail
    BEFORE INSERT ON clean.phase5_fids_exact_query_partition_v39
    FOR EACH ROW EXECUTE FUNCTION clean.ci_v0082_bomb()`);
  await expect(commitStage9P5V0082AtomicSegmentedDay(writer,review))
    .rejects.toThrow("CI_EXPECTED_SECOND_PARTITION_FAILURE");
  expect(await counts()).toEqual({q:0,p:0,a:0,o:0});
  await admin.query("DROP TRIGGER ci_v0082_atomic_fail ON clean.phase5_fids_exact_query_partition_v39");
  await admin.query("DROP FUNCTION clean.ci_v0082_bomb()");
 });
 it("prepares all 72 SOURCE queries plus 72 exact V0082 partitions atomically",async()=>{
  const result=await commitStage9P5V0082AtomicSegmentedDay(writer,review);
  expect(result.preparedQueryRows).toBe(72);
  expect(result.preparedPartitionRows).toBe(72);
  expect(result.databaseInserts).toBe(144);
  expect(result.providerCalls).toBe(0);
  expect(result.paidSourceAttempts).toBe(0);
  expect(result.frozenCategoryBudgetWritten).toBe(false);
  expect(result.phase6PaidGo).toBe(false);
  expect(await counts()).toEqual({q:72,p:72,a:0,o:0});
  const category=(await admin.query(
   "SELECT rest_category,COUNT(*)::int n "+
   "FROM clean.phase5_fids_exact_query_partition_v39 "+
   "GROUP BY rest_category"
  )).rows;
  expect(category).toEqual([{rest_category:"FIDS_BASE_UNITS",n:72}]);
  const meta=(await admin.query(
   "SELECT count(*) FILTER (WHERE github_run_id='00000' "+
   "AND state='PREPARED')::int prepared "+
   "FROM clean.phase5_fids_allowed_query_v39"
  )).rows[0];
  expect(meta.prepared).toBe(72);
 });
 it("refuses replay after commit, no duplicates or excess permissions",async()=>{
  await expect(commitStage9P5V0082AtomicSegmentedDay(writer,review))
    .rejects.toThrow("SOURCE_DAY_ALREADY_PARTIALLY_PREPARED_NO_REPLAY");
  expect(await counts()).toEqual({q:72,p:72,a:0,o:0});
  const privileges=(await writer.query(
   "SELECT has_table_privilege(current_user,"+
   "'clean.phase5_fids_physical_attempt_v39','INSERT') AS attempt,"+
   "has_table_privilege(current_user,"+
   "'clean.phase5_fids_utc_rest_category_budget_v39','INSERT') AS budget,"+
   "has_table_privilege(current_user,"+
   "'clean.phase5_fids_allowed_query_v39','UPDATE') AS mutate"
  )).rows[0];
  expect(privileges).toEqual({attempt:false,budget:false,mutate:false});
 });
});
