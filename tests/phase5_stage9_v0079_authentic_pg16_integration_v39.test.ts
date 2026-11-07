/**
 * Real, disposable PostgreSQL16 Stage1 -> Stage7 -> Stage8 -> Stage9 test.
 * Uses the boot B0062 schema plus the actual staged V0079 schema, not a toy
 * substitute. Nothing is installed to production, scheduled, or sent to ADB.
 *
 * Test "approval" flags are synthetic CI inputs only, NOT legal clearance.
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
import {commitStage9P5DayV0079PreparedRows,type P5Stage9PreparedDayReview}
  from "../server/lib/disruption/phase5Stage9V0079CommittedDayPrepare_v39";

const URL="postgresql://postgres:postgres@localhost:5432/neondb?sslmode=disable";
const WRITER="phase5_fids_prepare_ci_writer01";
const WURL="postgresql://"+WRITER+":ci-only@localhost:5432/neondb?sslmode=disable";
const suite=process.env.V39_P5_STAGE9_REAL_PG16==="1"?describe:describe.skip;
const MULTI=process.env.V39_P5_STAGE9_MULTI_REFRESH==="1";
const QUERY_COUNT=MULTI?60:12;
const sha=(c:string)=>c.repeat(64);
const digest=(x:unknown)=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
const iso=(n:number)=>new Date(n).toISOString();
const SLOTS=["HUB","MID_A","MID_B","REGIONAL"] as const;
const HORIZONS=[
  ["T-24h",1440,"T24"],["T-6h",360,"T6"],["T-90m",90,"T90"]
] as const;
const TIMEZONES:Record<string,string>={
  WSSS:"Asia/Singapore",OMAA:"Asia/Dubai",
  SKBO:"America/Bogota",KGPT:"America/Chicago"
};
suite("Phase5 Stage9 with authentic B0062+V0079 schema / restricted PG16",()=>{
 let admin:Pool,writer:Pool;
 let pins:P5Stage9PreparedDayReview;
 let manifest=sha("e");
 let serviceStart:string;
 beforeAll(async()=>{
   if(process.env.GITHUB_ACTIONS!=="true"||
      process.env.V39_P5_STAGE9_REAL_PG16!=="1"||
      process.env.DATABASE_URL!==URL||
      process.env.AERODATABOX_API_KEY||
      process.env.V39_PHASE6_PROCESS_ARMED!=="0")
     throw Error("REFUSED_NON_DISPOSABLE_STAGE9_INTEGRATION");
   admin=new Pool({connectionString:URL,max:3});
   const dbNow=new Date((await admin.query(
     "SELECT clock_timestamp() AS at")).rows[0].at).getTime();
   // Early draw is strictly within 72h and >24h45m from service start.
   const start= dbNow + 30*3_600_000;
   serviceStart=iso(start);
   await admin.query(
     "INSERT INTO clean.adb_phase6_authorization "+
     "(authorization_id,manifest_sha256,calendar_hash,config_hash,code_sha,"+
     "schema_version,phase6_start_date,alert_cap_per_parent_day,"+
     "unsettled_burst_margin_credits,protected_alert_floor,enabled,"+
     "predecessor_evidence_ids) VALUES "+
     "('CI-P5-STAGE9',$1,$2,$3,$4,'v39',$5::date,1900,10,1000,true,"+
     "'[\"ci-only\"]'::jsonb)",
     [manifest,sha("a"),sha("b"),"f".repeat(40),serviceStart.slice(0,10)]
   );
   await admin.query(
     "INSERT INTO clean.adb_sampling_frame_registry "+
     "(registry_key,active_frame_version,frame_hash) "+
     "VALUES ('ACTIVE','ci-stage9',$1)",[sha("c")]
   );
   const frame=[
     ["WSSS","HUB","ASIA"],["OMAA","MID","MIDDLE_EAST"],
     ["SKBO","MID","SOUTH_AMERICA"],["KGPT","REGIONAL","NORTH_AMERICA"]
   ];
   for(const [icao,tier,region] of frame){
     await admin.query(
       "INSERT INTO clean.adb_sampling_frame "+
       "(icao,tier,tier_source,traffic_prior,region,feed_schedule,"+
       "feed_live,feed_adsb,pre_eligible,post_eligible,in_frame,"+
       "frame_version,frame_hash) VALUES "+
       "($1,$2,'curated',10,$3,true,true,false,true,true,true,"+
       "'ci-stage9',$4)",[icao,tier,region,sha("c")]
     );
   }
   await admin.query(
     "INSERT INTO clean.adb_phase6_calendar_day "+
     "(run_day_index,budget_day_id,calendar_hash,config_hash,date_utc,"+
     "utc_slot,time_class,window_shape,evaluation_partition,draw_type,"+
     "slot_regions,anchor_icao,pair_airport_set,frozen_draw_seed,"+
     "scheduled_start_utc,active_duration_minutes,frame_hash) "+
     "VALUES (1,'P6D01',$1,$2,$3::date,'CI','CI','4h','CI','NEW_TEMPLATE',"+
     "$4::jsonb,'WSSS',NULL,'ci-stage9-seed',$5::timestamptz,240,$6)",
     [sha("a"),sha("b"),serviceStart.slice(0,10),
      JSON.stringify({HUB:"ASIA",MID_A:"MIDDLE_EAST",
        MID_B:"SOUTH_AMERICA",REGIONAL:"NORTH_AMERICA"}),
      serviceStart,sha("c")]
   );
   const selected=await commitEarlyPhase5Draw(admin,{
     runDayIndex:1,expectedManifestSha256:manifest,
     expectedCalendarHash:sha("a"),expectedConfigHash:sha("b"),
     expectedFrameHash:sha("c"),
     phase5FreezeApproved:true,githubOnlyApproved:true
   });
   expect(selected.status).toBe("EARLY_DRAW_COMMITTED");
   const templates=[] as Array<{
     runDayIndex:number;budgetDayUtc:string;physicalChargeDayUtc:string;
     slot:typeof SLOTS[number];horizon:typeof HORIZONS[number][0];
     providerQueryDirection:"Departure";serviceWindowStartUtc:string;
     serviceWindowEndUtc:string;earliestPlannedCutoffUtc:string;
     scheduledRequestUtc:string;maxResponseAndPersistSeconds:number;
     apiUnitsPerAttempt:number;maxAttempts:number;queryKey:string
   }>;
   for(const slot of SLOTS) for(const [horizon,minutes,label] of HORIZONS){
     const firstCutoff=start-minutes*60_000;
     for(let j=0;j<(MULTI?5:1);j++){
       const cutoff=firstCutoff+j*50*60_000,req=cutoff-600_000;
       templates.push({
         runDayIndex:1,budgetDayUtc:serviceStart.slice(0,10),
         physicalChargeDayUtc:iso(req).slice(0,10),
         slot,horizon,providerQueryDirection:"Departure",
         serviceWindowStartUtc:serviceStart,
         serviceWindowEndUtc:iso(start+4*3_600_000),
         earliestPlannedCutoffUtc:iso(cutoff),
         scheduledRequestUtc:iso(req),maxResponseAndPersistSeconds:120,
         apiUnitsPerAttempt:2,maxAttempts:1,
         queryKey:"ci_stage9_d01_"+slot+"_"+label+
            (MULTI?"_refresh"+j:"")
       });
     }
   }
   const saved=await readCommittedP5DayCandidateGrid(admin,{
     expectedManifestSha256:manifest,expectedCalendarSha256:sha("a"),
     expectedConfigSha256:sha("b"),expectedFrameSha256:sha("c"),
     expectedProviderContractSha256:sha("f"),
     expectedEarlyDrawSha256:selected.drawSha256,
     expectedRestrictedReaderRole:"postgres",runDayIndex:1,templates,
     ...(MULTI?{reviewedRefreshTiming:{
       reviewed31DayCoverageGridSha256:sha("9"),
       maxPopulationStalenessSeconds:3600,
       maxSchedulerSlipSeconds:60,
       minimumPreCommitMarginSeconds:120,
       verifiedProviderMaxFidsWindowMinutes:240
     }}:{})
   });
   expect(saved.databaseReadOnlySnapshot).toBe(true);
   const draw=(await admin.query(
     "SELECT slot_id,target_region,draw_type,selected_icao,frozen_draw_seed,"+
     "selected_at_utc,adaptive_state_hash,probability_vector,"+
     "airport_layer_design_probability FROM clean.adb_sampling_draw "+
     "WHERE run_day_index=1 ORDER BY slot_id")).rows;
   const frames=draw.map(d=>({
     slot:d.slot_id,icao:d.selected_icao,
     ianaTimezone:TIMEZONES[d.selected_icao],
     providerApiVersion:"1.15.4",fidsProtocolVersion:"v39"
   }));
   const chargeDates=[...new Set(templates.map(t=>t.physicalChargeDayUtc))];
   const proposal=planStage8P5DayV0079Proposals({
     stage7:saved,day:{
       runDayIndex:1,scheduledStartUtc:new Date(serviceStart),
       frozenDrawSeed:"ci-stage9-seed",drawType:"NEW_TEMPLATE",
       anchorIcao:"WSSS",
       slotRegions:{HUB:"ASIA",MID_A:"MIDDLE_EAST",
         MID_B:"SOUTH_AMERICA",REGIONAL:"NORTH_AMERICA"},
       pairAirportSet:null,calendarHash:sha("a"),
       configHash:sha("b"),frameHash:sha("c")
     },savedEarlyDrawRows:draw,manifestSha256:manifest,
     calendarSha256:sha("a"),configSha256:sha("b"),
     frameSha256:sha("c"),providerContractSha256:sha("f"),
     reviewedReleaseSha256:sha("1"),rightsReviewSha256:sha("2"),
     localFrames:frames,cycleUnitsAvailable:400,
     chargeDayBudgets:chargeDates.map(date=>({
       chargeDayUtc:date,dailyApiCeiling:1900,
       otherCategoriesReserved:50,existingSourceReserved:0
     }))
   });
   expect(proposal.queries).toHaveLength(QUERY_COUNT);
   await admin.query(
     "INSERT INTO clean.phase5_fids_cycle_budget_v39 "+
     "(manifest_sha256,cycle_api_ceiling,other_category_reserved_units,"+
     "protected_api_floor_units) VALUES ($1,50000,100,100)",
     [manifest]
   );
   await admin.query(
     "INSERT INTO clean.phase5_fids_day_budget_v39 "+
     "(manifest_sha256,run_day_index,budget_day_utc,calendar_hash,"+
     "config_hash,frame_hash,early_draw_sha256,daily_api_ceiling,"+
     "daily_other_reserved_units,daily_source_reserved_units) "+
     "VALUES ($1,1,$2::date,$3,$4,$5,$6,1900,100,0)",
     [manifest,serviceStart.slice(0,10),sha("a"),sha("b"),
      sha("c"),selected.drawSha256]
   );
   for(const date of chargeDates){
     await admin.query(
       "INSERT INTO clean.phase5_fids_utc_charge_budget_v39 "+
       "(manifest_sha256,charge_day_utc,daily_api_ceiling,"+
       "daily_other_reserved_units) VALUES ($1,$2::date,1900,50)",
       [manifest,date]
     );
   }
   pins={
     proposal,expectedProposalSha256:proposal.dayProposalSha256,
     expectedManifestSha256:manifest,expectedCalendarSha256:sha("a"),
     expectedConfigSha256:sha("b"),expectedFrameSha256:sha("c"),
     expectedProviderContractSha256:sha("f"),
     expectedRightsReviewSha256:sha("2"),
     expectedReleaseSha256:sha("1"),
     expectedRestrictedWriterRole:WRITER,
     expectedChargeDayBudgetHashSha256:digest(proposal.actualUtcChargeBudgets),
     independentFreezeApproved:true,independentRightsReviewApproved:true,
     githubOnlyProspectiveOwnerApproved:true
   };
   await admin.query(
     "CREATE ROLE "+WRITER+" LOGIN PASSWORD 'ci-only' NOSUPERUSER NOCREATEDB NOCREATEROLE"
   );
   await admin.query("GRANT USAGE ON SCHEMA clean TO "+WRITER);
   await admin.query(
     "GRANT SELECT ON clean.adb_phase6_authorization,"+
     "clean.adb_phase6_calendar_day,clean.adb_sampling_draw,"+
     "clean.phase5_fids_cycle_budget_v39,"+
     "clean.phase5_fids_day_budget_v39,"+
     "clean.phase5_fids_utc_charge_budget_v39,"+
     "clean.phase5_fids_allowed_query_v39 TO "+WRITER
   );
   await admin.query(
     "GRANT INSERT ON clean.phase5_fids_allowed_query_v39 TO "+WRITER
   );
   writer=new Pool({connectionString:WURL,max:2});
 });
 afterAll(async()=>{
   if(writer)await writer.end();
   if(admin)await admin.end();
 });
 it("commits the exact reviewed source-query count under INSERT-only role",async()=>{
   const access=(await writer.query(
     "SELECT current_user AS role,"+
     "has_table_privilege(current_user,"+
     "'clean.phase5_fids_allowed_query_v39','UPDATE') AS upd,"+
     "has_table_privilege(current_user,"+
     "'clean.phase5_fids_allowed_query_v39','DELETE') AS del"
   )).rows[0];
   expect(access.role).toBe(WRITER);
   expect(access.upd).toBe(false);
   expect(access.del).toBe(false);
   const result=await commitStage9P5DayV0079PreparedRows(writer,pins);
   expect(result.queryRowCount).toBe(QUERY_COUNT);
   expect(result.databaseWrites).toBe(QUERY_COUNT);
   expect(result.providerCalls).toBe(0);
   expect(result.paidSourceAttempts).toBe(0);
   expect(result.phase6PaidGo).toBe(false);
   const physical=await admin.query(
     "SELECT (SELECT count(*)::int FROM clean.phase5_fids_allowed_query_v39) AS q,"+
     "(SELECT count(*)::int FROM clean.phase5_fids_physical_attempt_v39) AS a,"+
     "(SELECT count(*)::int FROM clean.phase5_fids_original_binding_v39) AS o"
   );
   expect(physical.rows[0]).toEqual({q:QUERY_COUNT,a:0,o:0});
 });
 it("refuses blind replay and preserves all original PREPARED rows",async()=>{
   await expect(commitStage9P5DayV0079PreparedRows(writer,pins))
     .rejects.toThrow("EXISTING_QUERY_ROWS_NO_BLIND_DUPLICATE");
   const counts=await admin.query(
     "SELECT count(*)::int AS total,"+
     "count(*) FILTER (WHERE state='PREPARED' AND github_run_id='00000')::int AS prepared "+
     "FROM clean.phase5_fids_allowed_query_v39"
   );
   expect(counts.rows[0]).toEqual({total:QUERY_COUNT,prepared:QUERY_COUNT});
 });
 it("rejects ordinary production-owner DB credentials before any further write",async()=>{
   await expect(commitStage9P5DayV0079PreparedRows(admin,pins))
     .rejects.toThrow("NO_EXACT_INSERT_ONLY_PRODUCTION_ROLE");
   expect(Number((await admin.query(
     "SELECT count(*) AS n FROM clean.phase5_fids_allowed_query_v39"
   )).rows[0].n)).toBe(QUERY_COUNT);
 });
});
