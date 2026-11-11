/**
 * C+D SECOND isolated Stage14 integration with SAME-TRANSACTION generation fence, disposable PG16 ONLY.
 *
 * Synthetic AeroDataBox-like original -> normalized flight rows -> local
 * durable SKIP LOCKED queue -> 1/2/4/8 worker lanes -> actual existing
 * Stage14 SQL writer -> acknowledged post-COMMIT readback -> queue receipt.
 *
 * This tests engineering throughput and custody only. The synthetic
 * "rights" hashes are NOT an external license or production permission;
 * queue fencing must also be checked INSIDE the live writer admission
 * before real production deployment. No provider calls, no live DB, no ML.
 */
import {beforeAll,afterAll,describe,it,expect} from "vitest";
import {Pool,type PoolClient} from "pg";
import {createHash} from "node:crypto";
import {URL as NodeURL} from "node:url";
import {
 persistP5V0079SingleBoundFlightPre,
 type P5Stage14SingleFlightPrePermit
} from "../server/lib/disruption/phase5V0079SingleBoundFlightPreWriter_v39";
import {persistP5CPlusDStage14WithConfirmedAbortRetry}
 from "../server/lib/disruption/phase5CPlusDStage14ConfirmedAbortRetry_v39";
import {persistPreSnapshot,type PreSnapshot}
 from "../server/lib/disruption/preSnapshotBuilder_v3";
import type {P5PreQueueCandidate}
 from "../server/lib/disruption/phase5CPlusDParallelPreProofOfConcept_v39";

const URL=process.env.DATABASE_URL??"";
const active=process.env.V39_P5_CD_STAGE14_FENCE_DISPOSABLE==="1"?describe:describe.skip;
const ROLE="phase5_fids_pre_writer_cd_ciuser01";
const LOGIN_URL=process.env.P5_CD_CI_WRITER_URL??"";
const h=(c:string)=>c.repeat(64),iso=(n:number)=>new Date(n).toISOString();
const manifest=h("a"),query=h("b"),reservation=h("c"),
 rights=h("d"),response=h("e"),contract=h("f");
const qid="c23e4567-e89b-42d3-a456-426614174013";
const FLIGHTS=32;
const RECEIPT=process.env.V39_P5_CD_STAGE14_RECEIPT_DISPOSABLE==="1";
type Claim={id:string;flight_instance_id:string;horizon:"T-24h";
 selected_native_t:string;own_cutoff:string;packet_sha:string;
 generation:number;owner:string;lease_until:string};
active("Phase5 C+D actual Stage14 source-bound parallel PRE on disposable PG16",()=>{
 let admin:Pool,writer:Pool,permit:P5Stage14SingleFlightPrePermit;
 let cutoffMs=0;
 beforeAll(async()=>{
  if(process.env.GITHUB_ACTIONS!=="true"||
    process.env.V39_P5_CD_STAGE14_FENCE_DISPOSABLE!=="1"||
    process.env.DATABASE_URL!==URL||
    process.env.V39_PHASE6_PROCESS_ARMED!=="0"||
    process.env.ADB_AUTO_COLLECT!=="0"||
    process.env.AERODATABOX_API_KEY||
    process.env.AERODATABOX_WEBHOOK_SECRET||
    process.env.P5_V39_PRE_DATABASE_URL||
    process.env.P5_V39_OTHER_REST_RESERVE_DATABASE_URL)
   throw Error("REFUSED_CD_STAGE14_NOT_DISPOSABLE_NO_PROVIDER");
  if(!/^[A-Za-z0-9-]{6,40}$/.test(process.env.P5_CD_CI_PASSWORD??"")||
    !LOGIN_URL.includes("localhost:5432/neondb"))
   throw Error("REFUSED_CD_TEST_LOCAL_DUMMY_CREDENTIALS_MISSING");
  let localOnly=false;
  try{
   const u=new NodeURL(URL);
   localOnly=u.protocol==="postgresql:"&&u.hostname==="localhost"&&
    u.port==="5432"&&u.pathname==="/neondb"&&
    u.username==="postgres"&&u.searchParams.get("sslmode")==="disable";
  }catch{}
  if(!localOnly)throw Error("REFUSED_CD_TEST_NONLOCAL_DATABASE");
  admin=new Pool({connectionString:URL,max:3});
  const who=(await admin.query(
   "SELECT current_database() AS db,current_user AS role,"+
   "current_setting('server_version_num')::integer AS ver"
  )).rows[0];
  if(who.db!=="neondb"||who.role!=="postgres"||who.ver<160000)
   throw Error("REFUSED_CD_STAGE14_WRONG_PG_TARGET");
  const now=new Date((await admin.query(
   "SELECT clock_timestamp() AS at")).rows[0].at).getTime();
  // Real Stage14 accepts only last three minutes and requires COMMIT
  // plus readback before cutoff. Allow 165 seconds for this small test.
  cutoffMs=now+165_000;
  const cutoff=new Date(cutoffMs),native=new Date(cutoffMs+86_400_000);
  const end=new Date(native.getTime()+4*3600_000);
  const dispatch=new Date(now-15*60_000);
  const arr=Array.from({length:FLIGHTS},(_,i)=>({
   flight:"CD"+String(i+1).padStart(3,"0")
  }));
  const payload=Buffer.from(JSON.stringify({departures:arr}));
  const bodyHash=createHash("sha256").update(payload).digest("hex");
  const original={
   originalDecodedEntityBodyPreserved:true,
   originalHttpWireBytesPreserved:false,
   originalDecodedEntityBodyEvidence:{
    representation:"FETCH_DECODED_RESPONSE_BODY_BYTES_NOT_HTTP_WIRE",
    bodySha256:bodyHash,bodyBase64:payload.toString("base64"),
    bodyLengthBytes:payload.length
   }
  };
  await admin.query(
   "INSERT INTO clean.phase5_fids_cycle_budget_v39"+
   "(manifest_sha256,cycle_api_ceiling,other_category_reserved_units,"+
   "protected_api_floor_units) VALUES($1,50000,100,100)",[manifest]);
  await admin.query(
   "INSERT INTO clean.phase5_fids_day_budget_v39"+
   "(manifest_sha256,run_day_index,budget_day_utc,calendar_hash,config_hash,"+
   "frame_hash,early_draw_sha256,daily_api_ceiling,"+
   "daily_other_reserved_units,daily_source_reserved_units)"+
   "VALUES($1,1,$2::date,$3,$4,$5,$6,1900,100,0)",
   [manifest,native.toISOString().slice(0,10),h("1"),h("2"),h("3"),h("4")]);
  await admin.query(
   "INSERT INTO clean.phase5_fids_utc_charge_budget_v39"+
   "(manifest_sha256,charge_day_utc,daily_api_ceiling,"+
   "daily_other_reserved_units) VALUES($1,$2::date,1900,100)",
   [manifest,dispatch.toISOString().slice(0,10)]);
  await admin.query(
   "INSERT INTO clean.phase5_fids_allowed_query_v39"+
   "(query_digest,manifest_sha256,run_day_index,query_key,slot_id,horizon,"+
   "airport_icao,early_draw_sha256,reviewed_release_sha256,"+
   "rights_review_sha256,provider_contract_sha256,github_run_id,"+
   "service_window_start_utc,service_window_end_utc,from_local,to_local,"+
   "airport_iana_timezone,provider_api_version,fids_protocol_version,"+
   "planned_dispatch_utc,planned_charge_utc_date,hard_latest_dispatch_utc,"+
   "prediction_cutoff_utc,api_units_per_attempt,max_physical_attempts,state)"+
   "VALUES($1,$2,1,'cd_parallel_stage14_ci','HUB','T-24h','WSSS',"+
   "$3,$4,$5,$6,'42363348888',$7,$8,'2027-01-01T00:00',"+
   "'2027-01-01T04:00','Asia/Singapore','1.15.4','v39',"+
   "$9,$10::date,$11,$12,2,1,'ACTIVE')",
   [query,manifest,h("4"),h("5"),rights,contract,native,end,
    dispatch,dispatch.toISOString().slice(0,10),
    new Date(now-10*60_000),cutoff]);
  await admin.query(
   "INSERT INTO clean.phase5_fids_physical_attempt_v39"+
   "(reservation_sha256,query_digest,manifest_sha256,github_run_id,"+
   "observed_selected_at_utc,charged_utc_date)"+
   "VALUES($1,$2,$3,'42363348888',$4,$5::date)",
   [reservation,query,manifest,new Date(now-48*3600_000),
    dispatch.toISOString().slice(0,10)]);
  await admin.query(
   "WITH t AS (SELECT clock_timestamp() AS at)"+
   " INSERT INTO clean.fids_query_response"+
   "(population_query_id,source_airport_icao,query_direction,"+
   "service_window_start_utc,service_window_end_utc,from_local,to_local,"+
   "airport_iana_timezone,fids_retrieval_utc,raw_persisted_at_utc,"+
   "available_at,response_hash,raw_payload,provider_api_version,"+
   "fids_protocol_version,openapi_sha256)"+
   "SELECT $1,'WSSS','Departure',$2,$3,"+
   "'2027-01-01T00:00','2027-01-01T04:00','Asia/Singapore',"+
   "t.at,t.at,t.at,$4,$5::jsonb,'1.15.4','v39',$6 FROM t",
   [qid,native,end,response,JSON.stringify(original),contract]);
  for(let i=1;i<=FLIGHTS;i++){
   const flight="leg:ci:cd:"+String(i).padStart(3,"0");
   const fn="CD"+String(i).padStart(3,"0");
   await admin.query(
    "INSERT INTO clean.flight_population"+
    "(source_airport_icao,dep_airport_icao,dep_scheduled_utc,"+
    "window_start_utc,window_end_utc,cutoff_utc,"+
    "source_type,population_query_id,analytic_identity_id,"+
    "canonical_flight_instance_id,population_role,scope_classification,"+
    "available_at,response_hash,flight_number,"+
    "query_direction,from_local,to_local,airport_iana_timezone,"+
    "codeshare_resolution_status,fids_retrieval_utc,"+
    "provider_api_version,fids_protocol_version,openapi_sha256)"+
    "VALUES('WSSS','WSSS',$1,$2,$3,$4,'fids',$5,$6,"+
    "$6,'requested_airport_primary','confirmed_core',"+
    "clock_timestamp(),$7,$8,'Departure',"+
    "'2027-01-01T00:00','2027-01-01T04:00','Asia/Singapore',"+
    "'confirmed_operating_leg',clock_timestamp(),'1.15.4','v39',$9)",
    [native,native,end,cutoff,qid,flight,response,fn,contract]);
  }
  await admin.query(
   "INSERT INTO clean.phase5_fids_original_binding_v39"+
   "(population_query_id,reservation_sha256,query_digest,manifest_sha256,"+
   "response_hash,decoded_original_body_sha256,rights_review_sha256,"+
   "normalized_members_count,source_expires_at_utc)"+
   "VALUES($1,$2,$3,$4,$5,$6,$7,$8,clock_timestamp()+interval '1 hour')",
   [qid,reservation,query,manifest,response,bodyHash,rights,FLIGHTS]);
  await admin.query("CREATE ROLE "+ROLE+
   " LOGIN PASSWORD '"+process.env.P5_CD_CI_PASSWORD+"' NOSUPERUSER NOCREATEDB NOCREATEROLE");
  await admin.query("GRANT USAGE ON SCHEMA clean TO "+ROLE);
  await admin.query(
   "GRANT SELECT ON clean.phase5_fids_allowed_query_v39,"+
   "clean.phase5_fids_physical_attempt_v39,"+
   "clean.phase5_fids_original_binding_v39,"+
   "clean.fids_query_response,clean.flight_population,"+
   "clean.flight_snapshots TO "+ROLE);
  await admin.query("GRANT INSERT ON clean.flight_snapshots TO "+ROLE);
  await admin.query("GRANT USAGE ON SEQUENCE clean.flight_snapshots_id_seq TO "+ROLE);
  writer=new Pool({connectionString:LOGIN_URL,max:10});
  permit={
   manifestSha256:manifest,queryDigestSha256:query,
   expectedSourcePopulationQueryId:qid,expectedSourceResponseSha256:response,
   runDayIndex:1,slot:"HUB",horizon:"T-24h",airportIcao:"WSSS",
   flightInstanceId:"leg:ci:cd:001",expectedGithubSourceRunId:"42363348888",
   expectedReviewedReleaseSha256:h("5"),
   expectedReviewedSourceRightsSha256:rights,
   expectedProviderContractSha256:contract,
   expectedEarlyDrawSha256:h("4"),
   reviewedFrameSha256:h("3"),reviewedConfigSha256:h("2"),
   independentlyReviewedOperatingLegEvidenceSha256:h("8"),
   independentlyReviewedNativeTEvidenceSha256:h("7"),
   independentlyReviewedRunAndRetentionEvidenceSha256:h("9"),
   frozenBuilderSha256:h("c"),builderFrozenAtUtc:iso(now-2*86_400_000),
   selectedTConfig:{
    milestone:"departure.scheduledTime.utc",version:"cd-ci-native-T",
    artifactHash:h("6"),verifiedProviderNativeSchedule:true,
    semanticsEvidenceSha256:h("7")
   },selectedTNativeUtc:native.toISOString(),
   maxPopulationStalenessSeconds:3600,
   expectedRestrictedPreWriterRole:ROLE,
   externalNativeTPhysicalLegAndSourceUseReviewed:true
  };
  const check=await admin.query("SELECT to_regclass('p5_cd_stage14_ci.task') AS relation");
  if(!check.rows[0]?.relation)throw Error("CD_STAGED_FENCE_SCHEMA_MISSING");
  await admin.query("GRANT USAGE ON SCHEMA p5_cd_stage14_ci TO "+ROLE);
  const allowedFunction=RECEIPT
   ?"begin_admitted_write":"assert_write_fence";
  await admin.query("GRANT EXECUTE ON FUNCTION p5_cd_stage14_ci."+
   allowedFunction+"("+
   "bigint,text,text,timestamptz,timestamptz,text,text,bigint) TO "+ROLE);
  for(let i=1;i<=FLIGHTS;i++){
   const batch=[1,2,4,8][Math.floor((i-1)/8)];
   await admin.query(
    "INSERT INTO p5_cd_stage14_ci.task"+
    "(batch_lanes,flight_instance_id,horizon,selected_native_t,"+
    "own_cutoff,packet_sha) VALUES($1,$2,'T-24h',$3,$4,$5)",
    [batch,"leg:ci:cd:"+String(i).padStart(3,"0"),
     native,cutoff,createHash("sha256").update("cd-ci-packet-"+i).digest("hex")]);
  }
 });
 afterAll(async()=>{
  if(writer)await writer.end();
  if(admin){
   await admin.query("DROP SCHEMA IF EXISTS p5_cd_stage14_ci CASCADE").catch(()=>{});
   await admin.end();
  }
 });
 async function claimOne(batch:number,owner:string):Promise<Claim|null>{
  const c:PoolClient=await admin.connect();
  let begun=false;
  try{
   await c.query("BEGIN");begun=true;
   await c.query("SET LOCAL statement_timeout='8000ms'");
   const r=await c.query(
    "WITH chosen AS ("+
    " SELECT id FROM p5_cd_stage14_ci.task"+
    " WHERE batch_lanes=$1 AND status='READY'"+
    " AND own_cutoff-INTERVAL '180 seconds'<=clock_timestamp()"+
    " AND own_cutoff-INTERVAL '2 seconds'>clock_timestamp()"+
    " ORDER BY own_cutoff,id FOR UPDATE SKIP LOCKED LIMIT 1"+
    ") UPDATE p5_cd_stage14_ci.task t"+
    " SET status='CLAIMED',owner=$2,"+
    "generation=t.generation+1,"+
    "lease_until=clock_timestamp()+INTERVAL '90 seconds'"+
    " WHERE t.id=(SELECT id FROM chosen)"+
    " RETURNING t.id::text,t.flight_instance_id,t.horizon,"+
    "t.selected_native_t,t.own_cutoff,t.packet_sha,"+
    "t.generation,t.owner,t.lease_until",[batch,owner]);
   await c.query("COMMIT");begun=false;
   return r.rows[0]??null;
  }catch(e){
   if(begun)await c.query("ROLLBACK").catch(()=>{});
   throw e;
  }finally{c.release();}
 }
 it("queue row lock prevents lease-reclaim UPDATE while owned transaction runs",async()=>{
  const task=(await admin.query(
   "UPDATE p5_cd_stage14_ci.task SET "+
   "status='WRITE_STARTED_UNKNOWN',owner='ci-holder',generation=1,"+
   "lease_until=clock_timestamp()+INTERVAL '90 seconds' "+
   "WHERE id=1 RETURNING id::text,packet_sha")).rows[0];
  const writerSession=await writer.connect();
  const reclaimer=await admin.connect();
  try{
   await writerSession.query("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE READ WRITE");
   const checked=await writerSession.query(
    "SELECT p5_cd_stage14_ci."+ (RECEIPT?"begin_admitted_write":"assert_write_fence")+"("+
    "$1::bigint,$2,$3,$4::timestamptz,$5::timestamptz,$6,$7,$8::bigint) AS ok",
    [task.id,permit.flightInstanceId,permit.horizon,
     permit.selectedTNativeUtc,iso(Date.parse(permit.selectedTNativeUtc)-86_400_000),
     task.packet_sha,"ci-holder",1]);
   expect(checked.rows[0].ok).toBe(true);
   await reclaimer.query("BEGIN");
   await reclaimer.query("SET LOCAL lock_timeout='100ms'");
   await expect(reclaimer.query(
    "UPDATE p5_cd_stage14_ci.task SET generation=2 WHERE id=$1",
    [task.id])).rejects.toMatchObject({code:"55P03"});
  }finally{
   await reclaimer.query("ROLLBACK").catch(()=>{});
   await writerSession.query("ROLLBACK").catch(()=>{});
   reclaimer.release();writerSession.release();
   await admin.query(
    "UPDATE p5_cd_stage14_ci.task SET status='READY',owner=NULL,"+
    "generation=0,lease_until=NULL WHERE id=1");
  }
  const rights=(await admin.query(
   "SELECT has_table_privilege($1,'p5_cd_stage14_ci.task','UPDATE') AS can_update,"+
   "has_table_privilege($1,'p5_cd_stage14_ci.task','SELECT') AS can_select",
   [ROLE])).rows[0];
  expect(rights).toEqual({can_update:false,can_select:false});
 });
 it("stale owner/generation is refused by actual Stage14 before inserting PRE",async()=>{
  const task=(await admin.query(
   "UPDATE p5_cd_stage14_ci.task SET "+
   "status='WRITE_STARTED_UNKNOWN',owner='ci-current',generation=2,"+
   "lease_until=clock_timestamp()+INTERVAL '90 seconds' "+
   "WHERE id=1 RETURNING id::text,packet_sha")).rows[0];
  try{
   await expect(persistP5V0079SingleBoundFlightPre(writer,permit,{
    disposableCdQueueFence:{
     taskId:task.id,owner:"ci-stale",generation:1,
     packetSha256:task.packet_sha
    }
   })).rejects.toThrow("P5_CD_CLAIM_FENCE_STALE_OR_UNQUALIFIED");
   expect((await admin.query(
    "SELECT count(*)::integer AS n FROM clean.flight_snapshots"
   )).rows[0].n).toBe(0);
  }finally{
   await admin.query(
    "UPDATE p5_cd_stage14_ci.task SET status='READY',owner=NULL,"+
    "generation=0,lease_until=NULL WHERE id=1");
  }
 });
 function syntheticPre(flightInstanceId:string):PreSnapshot{
  const native=new Date(permit.selectedTNativeUtc);
  const cutoff=new Date(native.getTime()-86_400_000);
  return{
   flightInstanceId,predictionState:"PRE_DEPARTURE",
   horizon:"T-24h",predictionCutoffUtc:cutoff,
   selectedTMilestoneUtc:native,selectedTVersion:"ci-direct-bypass",
   populationQueryId:qid,features:[],
   provenance:{
    builderVersion:"ci-no-bypass",
    populationQueryId:qid,fidsResponseHash:response,
    scheduleVersion:null,frameHash:permit.reviewedFrameSha256,
    configHash:permit.reviewedConfigSha256,missingnessFlags:{}
   }
  };
 }
 it("CI-only DB trigger refuses a direct PRE INSERT without a transaction receipt",async()=>{
  if(!RECEIPT)return;
  const t=await admin.query(
   "SELECT count(*)::integer AS n FROM p5_cd_stage14_ci.admission_receipt");
  expect(t.rows[0].n).toBe(0);
  await expect(persistPreSnapshot(writer,syntheticPre(permit.flightInstanceId)))
   .rejects.toThrow("P5_CD_INSERT_REQUIRES_SAME_TRANSACTION_ADMISSION");
  expect((await admin.query(
   "SELECT count(*)::integer AS n FROM clean.flight_snapshots"
  )).rows[0].n).toBe(0);
 });
 it("CI-only DB trigger refuses other-flight INSERT even after valid own-task admission",async()=>{
  if(!RECEIPT)return;
  const t=(await admin.query(
   "UPDATE p5_cd_stage14_ci.task SET "+
   "status='WRITE_STARTED_UNKNOWN',owner='ci-valid-writer',generation=4,"+
   "lease_until=clock_timestamp()+INTERVAL '90 seconds' "+
   "WHERE id=1 RETURNING id::text,packet_sha")).rows[0];
  const c=await writer.connect();
  try{
   await c.query("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE READ WRITE");
   const r=await c.query(
    "SELECT p5_cd_stage14_ci.begin_admitted_write("+
    "$1::bigint,$2,$3,$4::timestamptz,$5::timestamptz,"+
    "$6,$7,$8::bigint) AS ok",
    [t.id,permit.flightInstanceId,permit.horizon,
     permit.selectedTNativeUtc,
     new Date(Date.parse(permit.selectedTNativeUtc)-86_400_000),
     t.packet_sha,"ci-valid-writer",4]);
   expect(r.rows[0].ok).toBe(true);
   await expect(persistPreSnapshot(c,syntheticPre("leg:ci:cd:002")))
    .rejects.toThrow("P5_CD_INSERT_REQUIRES_SAME_TRANSACTION_ADMISSION");
  }finally{
   await c.query("ROLLBACK").catch(()=>{});
   c.release();
   await admin.query(
    "UPDATE p5_cd_stage14_ci.task SET status='READY',owner=NULL,"+
    "generation=0,lease_until=NULL WHERE id=1");
  }
  expect((await admin.query(
   "SELECT count(*)::integer AS n FROM clean.flight_snapshots"
  )).rows[0].n).toBe(0);
  expect((await admin.query(
   "SELECT count(*)::integer AS n FROM p5_cd_stage14_ci.admission_receipt"
  )).rows[0].n).toBe(0);
 });
 it("1/2/4/8 workers each process eight real Stage14 SQL PRE snapshots",async()=>{
  const results:Array<{
   lanes:number;verified:number;elapsedMs:number;latenciesMs:number[]
  }>=[];
  for(const lanes of [1,2,4,8]){
   let verified=0,confirmed40001AbortRetries=0;
   const timings:number[]=[];
   const start=performance.now();
   await Promise.all(Array.from({length:lanes},(_,k)=>(async()=>{
    const owner="ci-lane-"+lanes+"-"+k;
    while(true){
     const claim=await claimOne(lanes,owner);
     if(!claim)break;
     const q:P5PreQueueCandidate={
      flightInstanceId:claim.flight_instance_id,
      horizon:"T-24h",
      selectedNativeTUtc:new Date(claim.selected_native_t).toISOString(),
      ownCutoffUtc:new Date(claim.own_cutoff).toISOString(),
      packetSha256:claim.packet_sha,
      handoffState:"EXTERNALLY_REVIEWED_PENDING"
     };
     const marked=await admin.query(
      "UPDATE p5_cd_stage14_ci.task SET status='WRITE_STARTED_UNKNOWN'"+
      " WHERE id=$1 AND owner=$2 AND generation=$3"+
      " AND lease_until>clock_timestamp() AND status='CLAIMED'"+
      " RETURNING id",[claim.id,claim.owner,claim.generation]);
     expect(marked.rowCount).toBe(1);
     const started=performance.now();
     // An error here intentionally leaves the queue in UNKNOWN,
     // NOT READY. No blind transaction retry is allowed.
     const response=await persistP5CPlusDStage14WithConfirmedAbortRetry(
      writer,writer,q,{...permit,flightInstanceId:claim.flight_instance_id},
      async()=>{
       const live=(await admin.query(
        "SELECT count(*)::integer AS n FROM p5_cd_stage14_ci.task"+
        " WHERE id=$1 AND owner=$2 AND generation=$3"+
        " AND status='WRITE_STARTED_UNKNOWN' AND lease_until>clock_timestamp()"+
        " AND own_cutoff-INTERVAL '2 seconds'>clock_timestamp()",
        [claim.id,claim.owner,claim.generation])).rows[0];
       return live.n===1;
      },6,{
       taskId:claim.id,owner:claim.owner,generation:claim.generation,
       packetSha256:claim.packet_sha
      }
     );
     confirmed40001AbortRetries+=response.acknowledged40001AbortRetries;
     const finalized=await admin.query(
      "UPDATE p5_cd_stage14_ci.task SET status='VERIFIED'"+
      " WHERE id=$1 AND status='WRITE_STARTED_UNKNOWN' AND owner=$2"+
      " AND generation=$3 AND lease_until>clock_timestamp()"+
      " RETURNING id",[claim.id,claim.owner,claim.generation]);
     expect(finalized.rowCount).toBe(1);
     verified++;
     timings.push(performance.now()-started);
    }
   })()));
   const elapsedMs=Math.round(performance.now()-start);
   expect(verified).toBe(8);
   results.push({lanes,verified,elapsedMs,latenciesMs:timings});
   console.log("P5_CD_STAGE14_REAL_PG16_LANES="+lanes+
    " VERIFIED=8 DURATION_MS="+elapsedMs+
    " MAX_WRITE_AND_READBACK_MS="+Math.round(Math.max(...timings))+
    " CONFIRMED_40001_ABORT_RETRIES="+confirmed40001AbortRetries);
  }
  const queue=(await admin.query(
   "SELECT count(*)::integer AS n,"+
   "count(*) FILTER(WHERE status='VERIFIED')::integer AS verified,"+
   "count(DISTINCT flight_instance_id)::integer AS distinct_flights"+
   " FROM p5_cd_stage14_ci.task")).rows[0];
  expect(queue).toEqual({n:32,verified:32,distinct_flights:32});
  const snaps=(await admin.query(
   "SELECT flight_instance_id,created_at,prediction_cutoff_utc"+
   " FROM clean.flight_snapshots")).rows;
  expect(snaps).toHaveLength(32);
  expect(new Set(snaps.map(x=>x.flight_instance_id)).size).toBe(32);
  expect(snaps.every(x=>
   new Date(x.created_at).getTime()<new Date(x.prediction_cutoff_utc).getTime()
  )).toBe(true);
  expect(Date.now()).toBeLessThan(cutoffMs);
  // This is a small, intentionally synthetic demonstration, not a
  // statistically sound benchmark or recommended production lane setting.
  console.log("P5_CD_STAGE14_REAL_PG16_32_UNIQUE_VERIFIED_NO_PROVIDER_PASS");
 },140_000);
 it("refuses changed-native-T duplicate queue and second PRE",async()=>{
  await expect(admin.query(
   "INSERT INTO p5_cd_stage14_ci.task("+
   "batch_lanes,flight_instance_id,horizon,selected_native_t,"+
   "own_cutoff,packet_sha) "+
   "SELECT 1,flight_instance_id,horizon,"+
   "selected_native_t+INTERVAL '15 minutes',"+
   "own_cutoff+INTERVAL '15 minutes',packet_sha"+
   " FROM p5_cd_stage14_ci.task WHERE id=1"
  )).rejects.toMatchObject({code:"23505"});
  const used=(await admin.query(
   "SELECT id::text,packet_sha,generation,owner FROM p5_cd_stage14_ci.task WHERE id=1"
  )).rows[0];
  await expect(persistP5V0079SingleBoundFlightPre(writer,permit,{
   disposableCdQueueFence:{
    taskId:used.id,owner:used.owner,generation:used.generation,
    packetSha256:used.packet_sha
   }
  })).rejects.toThrow("P5_CD_CLAIM_FENCE_STALE_OR_UNQUALIFIED");
  expect((await admin.query(
   "SELECT count(*)::integer AS n FROM clean.flight_snapshots"
  )).rows[0].n).toBe(32);
 });
});
