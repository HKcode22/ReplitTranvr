/**
 * Actual disposable PostgreSQL16 (B0062 + V0079 + V0082), no ADB provider.
 * Independent fixture auth/rights booleans are synthetic CI inputs only.
 * Verifies atomic two-table prepared rows under SELECT+INSERT-only owner.
 */
import {beforeAll,afterAll,describe,it,expect} from "vitest";
import {Pool,Client} from "pg";
import {produceP6DelegatedDailySourceReview} from "../server/lib/disruption/phase6DelegatedDailySourceReviewProducer_v39";
import {createHash,generateKeyPairSync} from "node:crypto";
import {publishP6StoredSourceShardOnce} from "../server/lib/disruption/phase6StoredSourceShardPublication_v39.mjs";
import {publishP6DayEpochIndexRevisionOnce} from "../server/lib/disruption/phase6DayEpochSignedIndexOnce_v39.mjs";
import {readP6StoredPrivateReviewOnce} from "../server/lib/disruption/phase6StoredPrivateReviewReadOnce_v39.mjs";
import {hydrateAndInspectP6DayEpochOriginalSemanticsReadOnly} from "../server/lib/disruption/phase6DayEpochOriginalSemanticHandoff_v39.mjs";
import {signP6ReviewedPreparedSourceDay,signP6InitialSourceIndexAfterRegistryReadback,recoverP6ReviewedPreparedSourceDayFromCommittedPackets} from "../server/lib/disruption/phase6ReviewedPreparedSourceShardSigner_v39";
import {commitEarlyPhase5Draw} from
 "../server/lib/disruption/phase5EarlyAdaptiveDrawOwner_v39";
import {readCommittedP5DayCandidateGrid,
 type P5CommittedDayReadonlyScope} from
 "../server/lib/disruption/phase5CommittedDayGridReadonly_v39";
import {planP5Stage8FromCommittedDayReadback,
 type P5Stage8SourceReviewWithoutCopiedDraw}
 from "../server/lib/disruption/phase5V0079DailyPreparedQueryProposals_v39";
import {prepareP5ReviewedSourceDayFromSavedDraw}
 from "../server/lib/disruption/phase5ReviewedSourceDayPrepareOrchestrator_v39";
import {planP6StoredSourceDraftShards} from "../server/lib/disruption/phase6StoredSourceDraftShardPlanner_v39";
import {draftP5OneGetFromActualPreparedSource}
 from "../server/lib/disruption/phase5PreparedQueryToOneGetDraft_v39";
import {P5_SOURCE_UPCOMING_METADATA_SQL,
 classifyP5SignedUpcomingSourceQueue}
 from "../server/lib/disruption/phase5SourceUpcomingDueQueueReadonly_v39";
import {P5_STAGE28_GROUPS}
 from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39";
import {commitStage9P5V0082AtomicSegmentedDay,readBackP5Stage9PreparedDayOnce,
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
 let readScope:P5CommittedDayReadonlyScope;
 let sourceReview:P5Stage8SourceReviewWithoutCopiedDraw;
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
  // Two exposed 2h children, each partitioned into two 1h provider GET
  // ranges. This tests BOTH BASE and SPLIT in the real V0082 DB table.
  for(const slot of SLOTS)for(const [horizon,offset,label] of HORIZONS)
   for(const [seg,shift] of [[1,0],[2,3]])
    for(let part=0;part<2;part++){
     const partStart=start+(shift+part)*H,partEnd=partStart+H;
     for(let j=0;j<2;j++){
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
       queryKey:["CI0082",slot,label,"s"+seg,"p"+part,"r"+j].join("_")
      });
     }
    }
  const timing={
   reviewed31DayCoverageGridSha256:sha("9"),
   maxPopulationStalenessSeconds:3600,maxSchedulerSlipSeconds:0,
   minimumPreCommitMarginSeconds:120,verifiedProviderMaxFidsWindowMinutes:60
  };
  const segmented={
   windowShape:"2x2h" as const,verifiedProviderMaxRangeMinutes:60,
   reviewedProviderRangeEvidenceSha256:range
  };
  readScope={
   expectedManifestSha256:manifest,expectedCalendarSha256:sha("a"),
   expectedConfigSha256:sha("b"),expectedFrameSha256:sha("c"),
   expectedProviderContractSha256:sha("f"),
   expectedEarlyDrawSha256:select.drawSha256,
   expectedRestrictedReaderRole:"postgres",
   runDayIndex:1,templates,reviewedRefreshTiming:timing,
   reviewedSegmentedSource:segmented
  };
  const saved=await readCommittedP5DayCandidateGrid(admin,readScope);
  expect(saved.selectedDayCandidateGrid.acquisitionCount).toBe(96);
  expect(saved.committedDayAndDrawProof?.drawRows).toHaveLength(4);
  sourceReview={
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
  };
  const proposal=planP5Stage8FromCommittedDayReadback(saved,sourceReview);
  expect(proposal.sourceQueryCount).toBe(96);
  expect(proposal.sourcePartitionPins).toHaveLength(96);
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
   "reviewed_category_budget_sha256) VALUES ($1,$2,$3,60,$4)",
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
  // Intentionally leave the zero-funded seventh UTC category absent
  // for the first real negative PG16 test. Restore only after it refuses.
  for(const day of days)for(const category of CATS){
   if(category==="DIAGNOSTIC_UNIT_BUDGET")continue;
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
 it("derives exactly one unarmed future GitHub GET draft from the actual saved four-airport PG draw and approved source BASE/SPLIT query",async()=>{
  const saved=await readCommittedP5DayCandidateGrid(admin,readScope);
  const planned=planP5Stage8FromCommittedDayReadback(saved,sourceReview);
  const expected={
   expectedDayProposalSha256:planned.dayProposalSha256,
   expectedCandidateGridSha256:saved.selectedDayCandidateGrid.sourceCandidateDigestSha256,
   expectedManifestSha256:manifest
  };
  const sharded=planP6StoredSourceDraftShards(saved,planned,expected);
  expect(sharded.queryCount).toBe(96);
  expect(sharded.shardCount).toBeGreaterThan(1);
  expect(sharded.providerCalls).toBe(0);
  expect(sharded.phase6PaidGo).toBe(false);
  expect(JSON.stringify(sharded)).not.toContain("unsignedDraft");
  const all=sharded.privateDraftShards.flatMap(s=>s.entries);
  expect(new Set(all.map(e=>e.queryDigestSha256))).toEqual(new Set(planned.queries.map(q=>q.query_digest)));
  for(const s of sharded.privateDraftShards){
   expect(s.entries.length).toBeLessThanOrEqual(96);
   expect(Date.parse(s.hardLatestUtc)-Date.parse(s.earliestProposedNotBeforeUtc)).toBeLessThanOrEqual(180*60_000);
   for(const e of s.entries){
    expect(e.unsignedDraft.unsignedQueryEnvelope.plan.githubOnlyOwnerApproved).toBe(false);
    expect(e.unsignedDraft.unsignedQueryEnvelope.plan.independentlyApprovedSourceAndRetention).toBe(false);
   }
  }
  const changed={...planned,queries:planned.queries.map(x=>({...x}))};
  changed.queries[0].hard_latest_dispatch_utc=serviceStart;
  expect(()=>planP6StoredSourceDraftShards(saved,changed,expected)).toThrow("ALTERED_OR_INCOMPLETE_REVIEWED_PROPOSAL");
  for(const category of ["FIDS_BASE_UNITS","FIDS_SPLIT_UNITS"] as const){
   const pin=planned.sourcePartitionPins!.find(x=>x.restCategory===category)!;
   const out=draftP5OneGetFromActualPreparedSource(saved,planned,{
    ...expected,queryDigestSha256:pin.queryDigest
   });
   expect(out.selectedQueryDigestSha256).toBe(pin.queryDigest);
   expect(out.restCategory).toBe(category);
   expect(out.unsignedQueryEnvelope.queryDigestSha256).toBe(pin.queryDigest);
   expect(out.unsignedQueryEnvelope.plan.acquisition.queryKey).toBe(pin.queryKey);
   expect(out.unsignedQueryEnvelope.plan.acquisition.icao)
    .toBe(planned.queries.find(q=>q.query_digest===pin.queryDigest)!.airport_icao);
   expect(out.unsignedQueryEnvelope.plan.sourcePartition.partitionIndex).toBe(pin.partitionIndex);
   expect(out.unsignedQueryEnvelope.plan.sourcePartition.segmentIndex).toBe(pin.segmentIndex);
   expect(out.unsignedQueryEnvelope.plan.day.scheduledStartUtc).toBe(serviceStart);
   expect(out.unsignedQueryEnvelope.plan.independentlyApprovedSourceAndRetention)
    .toBe(false);
   expect(out.unsignedQueryEnvelope.plan.githubOnlyOwnerApproved).toBe(false);
   expect(out.selectedQueryAlreadyPreparedInProduction).toBe(false);
   expect(out.sourceContentsAndMlRightsApproved).toBe(false);
   expect(out.phase6PaidGo).toBe(false);
   expect(out.providerCalls).toBe(0);
   expect(out.databaseWrites).toBe(0);
  }
  const first=planned.queries[0];
  const reviewPins={...expected,queryDigestSha256:first.query_digest};
  expect(()=>draftP5OneGetFromActualPreparedSource(
   saved,planned,{...reviewPins,expectedDayProposalSha256:sha("0")}
  )).toThrow("DAY_EARLY_DRAW_CANDIDATE_OR_SOURCE_PROPOSAL_CHANGED");
  expect(()=>draftP5OneGetFromActualPreparedSource(
   saved,planned,{...reviewPins,expectedCandidateGridSha256:sha("0")}
  )).toThrow("DAY_EARLY_DRAW_CANDIDATE_OR_SOURCE_PROPOSAL_CHANGED");
  const tampered={...planned,queries:planned.queries.map(x=>({...x}))};
  tampered.queries[0].planned_dispatch_utc=serviceStart;
  expect(()=>draftP5OneGetFromActualPreparedSource(saved,tampered,reviewPins))
   .toThrow("PREPARED_QUERY_OR_PARTITION_NOT_SAME_SAVED_SOURCE");
  await expect(readBackP5Stage9PreparedDayOnce(writer,review))
   .rejects.toThrow("READBACK_INCOMPLETE_OR_EXTRA_PREPARED_DAY");
  expect(await counts()).toEqual({q:0,p:0,a:0,o:0});
 });
 it("refuses production owner role and tampered reviewer source digest",async()=>{
  await expect(commitStage9P5V0082AtomicSegmentedDay(admin,review))
   .rejects.toThrow("NO_REAL_RESTRICTED_PRODUCTION_WRITER_ROLE");
  const wrong={...review,expectedSourceCandidateDigestSha256:sha("0")};
  await expect(commitStage9P5V0082AtomicSegmentedDay(writer,wrong))
   .rejects.toThrow("ALTERED_V3_PROPOSAL_OR_SOURCE_DIGEST");
  expect(await counts()).toEqual({q:0,p:0,a:0,o:0});
 });
 it("refuses an externally unreviewed dynamic query after same-snapshot Stage7; zero writes",async()=>{
  const {proposal:unusedProposal,...reviewPins}=review;
  void unusedProposal;
  await expect(prepareP5ReviewedSourceDayFromSavedDraw(admin,writer,{
   readScope,sourceReview,stage9Review:{
    ...reviewPins,expectedProposalSha256:sha("0")
   }
  })).rejects.toThrow("DYNAMIC_DAY_PROPOSAL_NOT_EXTERNALLY_REVIEWED");
  expect(await counts()).toEqual({q:0,p:0,a:0,o:0});
  await expect(prepareP5ReviewedSourceDayFromSavedDraw(admin,writer,{
   readScope,sourceReview:{
    ...sourceReview,rightsReviewSha256:sha("0")
   },
   stage9Review:reviewPins
  })).rejects.toThrow("STAGES_7_8_9_SOURCE_CALENDAR_OR_RIGHTS_DRIFT");
  expect(await counts()).toEqual({q:0,p:0,a:0,o:0});
 });
 it("rejects budget UPDATE escalation on an otherwise scoped two-table writer",async()=>{
  await admin.query(
   "GRANT UPDATE ON clean.phase5_fids_cycle_budget_v39 TO "+USER
  );
  try{
   await expect(commitStage9P5V0082AtomicSegmentedDay(writer,review))
    .rejects.toThrow("EXTRA_FROZEN_LEDGER_OR_RAW_PROVIDER_PRIVILEGE");
   expect(await counts()).toEqual({q:0,p:0,a:0,o:0});
  }finally{
   await admin.query(
    "REVOKE UPDATE ON clean.phase5_fids_cycle_budget_v39 FROM "+USER
   );
  }
 });
 it("refuses missing seventh category, with zero prepared query leakage",async()=>{
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
 it("delegated reviewer derives exact daily packet from actual saved four-slot draw and physical UTC budget",async()=>{
  const dayPlan={schema:"v39.phase6.reviewed-future-day-source-plan.v1",runDayIndex:1,
   expectedServiceStartUtc:serviceStart,expectedDrawType:"NEW_TEMPLATE",
   pairedIcaos:Object.fromEntries(sourceReview.localFrames.map(f=>[f.slot,f.icao])),
   templates:readScope.templates,reviewedRefreshTiming:readScope.reviewedRefreshTiming,
   reviewedSegmentedSource:readScope.reviewedSegmentedSource};
  const raw=Buffer.from(JSON.stringify(dayPlan)),now=Date.now();
  const policy={schema:"v39.phase6.delegated-daily-source-review-policy.v1",
   approvedCodeSha:"f".repeat(40),manifestSha256:manifest,
   calendarSha256:review.expectedCalendarSha256,configSha256:review.expectedConfigSha256,
   frameSha256:review.expectedFrameSha256,releaseSha256:review.expectedReleaseSha256,
   rightsSha256:review.expectedRightsReviewSha256,providerContractSha256:review.expectedProviderContractSha256,
   reviewed31DaySourceRequestGridSha256:gridHash,reviewedCategoryBudgetSha256:budgetHash,
   expectedPrepareRole:USER,validFromUtc:iso(now-H),validUntilUtc:iso(now+6*24*H),
   maxQueriesPerDay:384,dailyRestCeiling:1900,cycleRestCeiling:50000,minimumProtectedFloor:100,
   providerApiVersion:"1.15.4",fidsProtocolVersion:"v39",
   airportFrames:sourceReview.localFrames.map(f=>({icao:f.icao,ianaTimezone:f.ianaTimezone})),
   dayPlanSha256s:Array.from({length:31},(_,i)=>({runDayIndex:i+1,sha256:i===0?
    createHash("sha256").update(raw).digest("hex"):digest({testOnlyFutureDay:i+1})})),
   delegatedDailyPacketProductionApproved:true};
  const policyBytes=Buffer.from(JSON.stringify(policy));
  const args={readPool:writer,policyBytes,dayPlanBytes:raw,pins:{
   independent31DayDelegationPolicyApproved:true as const,
   expectedPolicySha256:createHash("sha256").update(policyBytes).digest("hex"),
   expectedReviewedMainSha:policy.approvedCodeSha,expectedRunDayIndex:1,
   noProviderCredentialsInReviewer:true as const,existingPaidDispatchApproved:false as const}};
  const produced=await produceP6DelegatedDailySourceReview(args);
  expect(produced.queryCount).toBe(96);
  expect(produced.privatePacket.reviewedPrepareInput.readScope.expectedEarlyDrawSha256)
   .toBe(readScope.expectedEarlyDrawSha256);
  expect(produced.privatePacket.reviewedPrepareInput.sourceReview.cycleUnitsAvailable).toBe(49900);
  expect(produced.delegatedAutomatedReviewNotHumanReview).toBe(true);
  expect(JSON.stringify(produced)).not.toContain("reviewedPrepareInput");
  expect(produced.phase6PaidGo).toBe(false);
  expect(produced.exactDailyPacketSha256).toBe(createHash("sha256").update(produced.privatePacketBytes).digest("hex"));
  expect((await produceP6DelegatedDailySourceReview(args)).exactDailyPacketSha256).toBe(produced.exactDailyPacketSha256);
  await expect(produceP6DelegatedDailySourceReview({...args,dayPlanBytes:Buffer.from(JSON.stringify({...dayPlan,runDayIndex:2}))}))
   .rejects.toThrow("EXACT_APPROVAL_BYTES_MISMATCH");
  await expect(produceP6DelegatedDailySourceReview({...args,readPool:admin}))
   .rejects.toThrow("RESTRICTED_REVIEWER_OR_POLICY_CLOCK");
  expect(await counts()).toEqual({q:0,p:0,a:0,o:0});
 });
 it("prepares exact 96 queries + 96 V0082 BASE/SPLIT partitions atomically",async()=>{
  const {proposal:unusedProposal,...reviewPins}=review;
  void unusedProposal;
  const result=await prepareP5ReviewedSourceDayFromSavedDraw(admin,writer,{
   readScope,sourceReview,stage9Review:reviewPins,
   preparePrivateUnsignedSourceDraftShards:true
  });
  expect(result.preparedDayReadback?.verifiedQueryCount).toBe(96);
  expect(result.preparedDayReadback?.verifiedPartitionCount).toBe(96);
  expect(result.preparedDayReadback?.separateReadOnlySnapshot).toBe(true);
  expect(result.unsignedSourceDraftSummary?.queryCount).toBe(96);
  expect(result.privateUnsignedSourceDraftPlan?.privateDraftShards.flatMap(s=>s.entries).length).toBe(96);
  expect(JSON.stringify(result)).not.toContain("privateUnsignedSourceDraftPlan");
  expect(JSON.stringify(result)).not.toContain("unsignedDraft");
  expect(result.preparedQueryRows).toBe(96);
  expect(result.preparedPartitionRows).toBe(96);
  expect(result.databaseInserts).toBe(192);
  expect(result.providerCalls).toBe(0);
  expect(result.paidSourceAttempts).toBe(0);
  expect(result.frozenCategoryBudgetWritten).toBe(false);
  expect(result.phase6PaidGo).toBe(false);
  expect(await counts()).toEqual({q:96,p:96,a:0,o:0});
  const category=(await admin.query(
   "SELECT rest_category,COUNT(*)::int n "+
   "FROM clean.phase5_fids_exact_query_partition_v39 "+
   "GROUP BY rest_category"
  )).rows;
  expect(category).toEqual([
    {rest_category:"FIDS_BASE_UNITS",n:48},
    {rest_category:"FIDS_SPLIT_UNITS",n:48}
   ]);
  const meta=(await admin.query(
   "SELECT count(*) FILTER (WHERE github_run_id='00000' "+
   "AND state='PREPARED')::int prepared "+
   "FROM clean.phase5_fids_allowed_query_v39"
  )).rows[0];
  expect(meta.prepared).toBe(96);
 });
 it("observes actual 96 PREPARED queries via V0080 aware READ-ONLY queue SQL, without prearm or provider",async()=>{
  const planned=Math.min(...review.proposal.queries.map(x=>
   Date.parse(x.planned_dispatch_utc)));
  const observedAt=new Date(planned-60*60_000);
  const actual=(await admin.query(P5_SOURCE_UPCOMING_METADATA_SQL,
   [manifest,observedAt])).rows;
  expect(actual.length).toBeGreaterThan(0);
  expect(actual.length).toBeLessThanOrEqual(96);
  const result=classifyP5SignedUpcomingSourceQueue(actual,{
   expectedManifestSha256:manifest,
   expectedReleaseSha256:sha("1"),
   expectedRightsSha256:sha("2"),
   expectedProviderContractSha256:sha("f"),
   expectedSourceRole:P5_STAGE28_GROUPS.source
  },observedAt);
  expect(result.observedQueries).toBe(actual.length);
  expect(result.candidates.some(x=>
   x.status==="DUE_SOON_REVIEW_REQUIRED_NO_PAID_DISPATCH")).toBe(true);
  expect(result.paidGetDispatched).toBe(false);
  expect(result.sourceRangeAndSevenRestCategoriesNotCertifiedHere).toBe(true);
  expect(result.providerCalls).toBe(0);
  expect(result.dbWrites).toBe(0);
  const budget=await counts();
  expect(budget).toEqual({q:96,p:96,a:0,o:0});
 });
 it("fresh exact prepared readback is repeatable without rewriting, refuses unreviewed actor or proposal",async()=>{
  const ok=await readBackP5Stage9PreparedDayOnce(writer,review);
  expect(ok.verifiedQueryCount).toBe(96);
  expect(ok.verifiedPartitionCount).toBe(96);
  expect(ok.independentReviewerAuthorityEstablishedHere).toBe(false);
  expect(ok.databaseWrites).toBe(0);
  expect(ok.providerCalls).toBe(0);
  await expect(readBackP5Stage9PreparedDayOnce(admin,review))
   .rejects.toThrow("READBACK_WRONG_RESTRICTED_ROLE_OR_DATABASE");
  await expect(readBackP5Stage9PreparedDayOnce(writer,{...review,
   expectedSourceCandidateDigestSha256:sha("0")}))
   .rejects.toThrow("ALTERED_V3_PROPOSAL_OR_SOURCE_DIGEST");
  expect(await counts()).toEqual({q:96,p:96,a:0,o:0});
 });
 it("delegated policy signer independently rederives all 96 prepared queries from actual PG before exact signatures",async()=>{
  const {proposal:discard,...stage9Review}=review;void discard;
  const day={schema:"v39.phase5.github-signed-one-day-source-preparation.v1",
   approvedCodeSha:"f".repeat(40),manifestSha256:manifest,runDayIndex:1,
   independentlyReviewedExactDaySourcePacket:true,reviewedPrepareInput:{
    readScope:{...readScope,expectedRestrictedReaderRole:USER},sourceReview,stage9Review
   }};
  const query=generateKeyPairSync("ed25519"),registry=generateKeyPairSync("ed25519");
  const fp=(key:typeof query.publicKey)=>createHash("sha256").update(key.export({format:"der",type:"spki"})).digest("hex");
  const now=Date.now(),policy={schema:"v39.phase6.delegated-source-review-policy.v1",
   approvedCodeSha:day.approvedCodeSha,manifestSha256:manifest,
   calendarSha256:review.expectedCalendarSha256,configSha256:review.expectedConfigSha256,
   frameSha256:review.expectedFrameSha256,releaseSha256:review.expectedReleaseSha256,
   rightsSha256:review.expectedRightsReviewSha256,providerContractSha256:review.expectedProviderContractSha256,
   reviewed31DaySourceRequestGridSha256:review.reviewed31DaySourceRequestGridSha256,
   reviewedCategoryBudgetSha256:review.reviewedCategoryBudgetSha256,
   expectedPrepareRole:USER,validFromUtc:new Date(now-3600000).toISOString(),
   validUntilUtc:new Date(now+6*86400000).toISOString(),
   maximumReviewRetentionHours:96,maxQueriesPerDay:384,
   queryReviewerFingerprintSha256:fp(query.publicKey),registryReviewerFingerprintSha256:fp(registry.publicKey),
   delegatedAutomatedSourceSigningApproved:true};
  const bytes=Buffer.from(JSON.stringify(policy)),daily=Buffer.from(JSON.stringify(day));
  const args={readPool:writer,policyBytes:bytes,dailyPreparePacketBytes:daily,
   pins:{independentExactPolicyAndDailyReviewApproved:true as const,
    expectedPolicySha256:createHash("sha256").update(bytes).digest("hex"),
    expectedDailyPreparePacketSha256:createHash("sha256").update(daily).digest("hex"),
    expectedReviewedMainSha:day.approvedCodeSha,existingPaidDispatchApproved:false as const,
    noProviderCredentialsInSigner:true as const},queryKey:query.privateKey,registryKey:registry.privateKey};
  const result=await signP6ReviewedPreparedSourceDay(args);
  expect(result.queryCount).toBe(96);
  expect(result.actualPreparedLedgerVerified).toBe(true);
  expect(result.automatedDelegatedSignatureNotHumanReview).toBe(true);
  const all=result.privateSignedShards.flatMap(x=>x.queryPackets);
  expect(all).toHaveLength(96);
  expect(new Set(all.map(x=>JSON.parse(x.bytes.toString("utf8")).queryDigestSha256)))
   .toEqual(new Set(review.proposal.queries.map(x=>x.query_digest)));
  expect(all.every(x=>JSON.parse(x.bytes.toString("utf8")).plan.githubOnlyOwnerApproved===true)).toBe(true);
  expect(JSON.stringify(result)).not.toContain("signatureBase64");
  expect(result.phase6PaidGo).toBe(false);
  await expect(signP6ReviewedPreparedSourceDay({...args,queryKey:registry.privateKey}))
   .rejects.toThrow("SIGNER_KEY_NOT_APPROVED_BY_POLICY");
  await expect(signP6ReviewedPreparedSourceDay({...args,pins:{...args.pins,expectedDailyPreparePacketSha256:sha("0")}}))
   .rejects.toThrow("UNPINNED_EXACT_APPROVAL_BYTES");
  expect(await counts()).toEqual({q:96,p:96,a:0,o:0});
  if(process.env.P6_SOURCE_SIGNER_PIPELINE_DISPOSABLE_ONLY==="1"){
   const readerLogin="phase6_private_reader_login_ci_pipeline",publisherLogin="phase6_private_publisher_login_ci_pipeline";
   const reader=new Client({connectionString:"postgresql://"+readerLogin+":ci-only-source-reader@localhost:5432/neondb?sslmode=disable"});
   const publisher=new Client({connectionString:"postgresql://"+publisherLogin+":ci-only-source-publisher@localhost:5432/neondb?sslmode=disable"});
   await reader.connect();await publisher.connect();
   try{
    await reader.query("SET ROLE phase6_private_frozen_reader_v39");
    await publisher.query("SET ROLE phase6_private_frozen_publisher_v39");
    const pem=(key:typeof query.publicKey)=>key.export({format:"pem",type:"spki"}).toString();
    const trust={independentStudyTrustPinsApproved:true,expectedReaderSessionLogin:readerLogin,
     reviewedCodeSha:policy.approvedCodeSha,manifestSha256:policy.manifestSha256,
     calendarSha256:policy.calendarSha256,releaseSha256:policy.releaseSha256,rightsSha256:policy.rightsSha256,
     dayReviewerFingerprintSha256:fp(registry.publicKey),dayReviewerPublicKeyPem:pem(registry.publicKey),
     queryReviewerFingerprintSha256:fp(query.publicKey),queryReviewerPublicKeyPem:pem(query.publicKey),
     registryReviewerFingerprintSha256:fp(registry.publicKey),registryReviewerPublicKeyPem:pem(registry.publicKey)};
    const idxArgs={readerClient:reader,expectedReaderSessionLogin:readerLogin,policyBytes:bytes,
     pins:args.pins,signedDay:result,registryKey:registry.privateKey,queryPublicKeyPem:pem(query.publicKey)};
    await expect(signP6InitialSourceIndexAfterRegistryReadback(idxArgs))
     .rejects.toThrow("INDEX_REGISTRY_OR_QUERY_NOT_FULLY_COMMITTED");
    expect(result.shardCount).toBeGreaterThan(1);
    const recoveryPins={...args.pins,independentRegistryRecoveryApproved:true as const};
    const pubArgs=(sh:typeof result.privateSignedShards[number],resume:boolean,pub:typeof publisher=publisher)=>{
     const v=sh.registryReviewWire.review;
     return {publisherClient:pub,readerClient:reader,trust,registryBytes:sh.registryBytes,
      registryReviewWire:sh.registryReviewWire,queryPackets:sh.queryPackets,
      scope:{privateSourceShardPublicationApproved:true,separateProviderContentRightsReviewApproved:true,
       existingPaidDispatchApproved:false,adbAutoCollect:"0",phase6ProcessArmed:"0",
       resumeFromIndependentReadbackApproved:resume,
       registryReattestationFromCommittedRowApproved:sh.registryReattestedFromCommittedRow===true,
       expectedPublisherSessionLogin:publisherLogin,expectedProviderContractSha256:policy.providerContractSha256,
       approvedRetentionNotAfterUtc:new Date(Math.max(Date.parse(v.retentionNotAfterUtc),
        ...sh.queryPackets.map(q=>Date.parse(q.wire.review.retentionNotAfterUtc)))).toISOString(),
       expectedRunDayIndex:1,expectedShardIndex:sh.shardIndex,expectedRegistryPath:v.logicalPath,
       expectedRegistrySha256:v.registrySha256}};
    };
    const first=await publishP6StoredSourceShardOnce(pubArgs(result.privateSignedShards[0],false));
    expect(first.insertedRegistryCount).toBe(1);
    // Actual query commit followed by simulated loss of the COMMIT acknowledgement.
    // The original publisher must stop. Recovery must not reuse the original
    // in-memory signed bundles or assume the failed transaction was rolled back.
    let lost=false;
    const interrupted={query:async(sql:string,values?:any[])=>{
     const ret=await (publisher.query as any).call(publisher,sql,values);
     if(sql==="COMMIT"&&!lost){lost=true;throw Error("SIMULATED_LOST_COMMIT_ACK");}
     return ret;
    }} as unknown as typeof publisher;
    await expect(publishP6StoredSourceShardOnce(pubArgs(result.privateSignedShards[1],false,interrupted)))
     .rejects.toThrow("PARTIAL_OR_UNKNOWN_PUBLICATION_READBACK_REQUIRED_NO_REPLAY");
    expect(lost).toBe(true);
    await expect(recoverP6ReviewedPreparedSourceDayFromCommittedPackets({...args,
     readerClient:reader,expectedReaderSessionLogin:readerLogin}))
     .rejects.toThrow("RESTART_RECOVERY_NOT_INDEPENDENTLY_APPROVED");
    const recovered=await recoverP6ReviewedPreparedSourceDayFromCommittedPackets({...args,
     pins:recoveryPins,readerClient:reader,expectedReaderSessionLogin:readerLogin});
    expect(recovered.exactOriginalQueryWiresReused).toBe(first.insertedQueryCount+1);
    expect(recovered.existingRegistriesFreshlyReattested).toBe(1);
    expect(recovered.historicalRegistrySignatureRecreated).toBe(false);
    expect(recovered.privateSignedShards[0].queryPackets.map(q=>q.wire))
     .toEqual(result.privateSignedShards[0].queryPackets.map(q=>q.wire));
    expect(recovered.privateSignedShards[1].queryPackets[0].wire)
     .toEqual(result.privateSignedShards[1].queryPackets[0].wire);
    let published=first.insertedQueryCount+1,registries=1;
    for(const sh of recovered.privateSignedShards){
     const receipt=await publishP6StoredSourceShardOnce(pubArgs(sh,true));
     published+=receipt.insertedQueryCount;registries+=receipt.insertedRegistryCount;
     if(sh.shardIndex===1){
      expect(receipt.insertedRegistryCount).toBe(0);
      expect(receipt.insertedQueryCount).toBe(0);
      expect(receipt.registryFreshlyReattestedNotOriginalSignature).toBe(true);
     }
    }
    expect(published).toBe(96);
    expect(registries).toBe(result.shardCount);
    await expect(signP6InitialSourceIndexAfterRegistryReadback({...idxArgs,signedDay:recovered}))
     .rejects.toThrow("INDEX_REATTESTATION_NOT_APPROVED");
    const idx=await signP6InitialSourceIndexAfterRegistryReadback({...idxArgs,
     pins:recoveryPins,signedDay:recovered});
    expect(idx.registryCount).toBe(result.shardCount);
    expect(idx.expiredShardCount).toBe(0);
    expect(JSON.stringify(idx)).not.toContain("signatureBase64");
    const put=await publishP6DayEpochIndexRevisionOnce({client:publisher,...idx.privateSignedIndex,
     scope:{privateDayIndexStorageApproved:true,independentProviderContentsReviewApproved:true,
      existingPaidDispatchApproved:false,adbAutoCollect:"0",phase6ProcessArmed:"0",
      expectedPublisherSessionLogin:publisherLogin,approvedCodeSha:policy.approvedCodeSha,
      approvedCalendarSha256:policy.calendarSha256,approvedRightsSha256:policy.rightsSha256,
      approvedRetentionNotAfterUtc:recovered.retentionNotAfterUtc,persistVerifiedReviewWire:true}});
    expect(put.indexSha256).toBe(idx.indexSha256);
    const stored=await readP6StoredPrivateReviewOnce({client:reader,trust,
     scope:{privateStoredReviewReadOnlyApproved:true,existingPaidDispatchApproved:false},
     selector:{kind:"CURRENT_DAY",runDayIndex:1}});
    const semantic=await hydrateAndInspectP6DayEpochOriginalSemanticsReadOnly({
     client:reader,pins:stored.pins,wire:stored.wire,publicKeyPem:stored.publicKeyPem,
     scope:{privateDayRegistryReadOnlyApproved:true,existingPaidDispatchApproved:false,requireCurrentRevisionForPlanning:true}});
    expect(semantic.redactedSummary.externallySignedDayEpochIndexSha256).toBe(idx.indexSha256);
    expect(semantic.redactedSummary.phase6PaidGo).toBe(false);
    await expect(signP6InitialSourceIndexAfterRegistryReadback({...idxArgs,pins:recoveryPins,signedDay:recovered}))
     .rejects.toThrow("INDEX_GENESIS_ALREADY_CLAIMED_NO_REPLAY");
    const rows=(await admin.query("SELECT kind,count(*)::int AS n FROM phase6_private.frozen_native_packet_v39 GROUP BY kind")).rows;
    expect(Object.fromEntries(rows.map(x=>[x.kind,x.n]))).toEqual({
     SOURCE_QUERY_PACKET:96,SOURCE_DAY_REGISTRY:result.shardCount});
   }finally{await publisher.end();await reader.end();}
  }
  expect(await counts()).toEqual({q:96,p:96,a:0,o:0});
 },60_000);
 it("refuses replay after commit, no duplicates or excess permissions",async()=>{
  await expect(commitStage9P5V0082AtomicSegmentedDay(writer,review))
    .rejects.toThrow("SOURCE_DAY_ALREADY_PARTIALLY_PREPARED_NO_REPLAY");
  expect(await counts()).toEqual({q:96,p:96,a:0,o:0});
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
