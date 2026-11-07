import {describe,it,expect,beforeAll,afterAll} from "vitest";
import {Pool} from "pg";
import {
 inspectP5T24NativeCommitWitness,
 type P5Stage15NativeT24ReadbackScope
} from "../server/lib/disruption/phase5NativeT24CommitWitnessReadonly_v39";

const URL="postgresql://postgres:postgres@localhost:5432/neondb?sslmode=disable";
const ROLE="phase5_fids_pre_auditor_ciuser01";
const READER_URL="postgresql://"+ROLE+":ci-only@localhost:5432/neondb?sslmode=disable";
const ACTIVE=process.env.V39_P5_STAGE15_REAL_COMMIT_PG16==="1"?describe:describe.skip;
const hash=(c:string)=>c.repeat(64);
const iso=(n:number)=>new Date(n).toISOString();
const originalId="d23e4567-e89b-42d3-a456-426614174000";
const sourceSha=hash("a"),frame=hash("b"),config=hash("c");
function scope(id:string,cutoffMs:number):P5Stage15NativeT24ReadbackScope{
 return {
  flightInstanceId:id,expectedT24CutoffUtc:iso(cutoffMs),
  expectedSelectedTNativeUtc:iso(cutoffMs+86_400_000),
  expectedSelectedTVersion:"departure.scheduledTime.utc:ci-only:"+hash("d"),
  expectedPopulationQueryId:originalId,
  expectedFidsResponseSha256:sourceSha,
  reviewedFrameSha256:frame,reviewedConfigSha256:config,
  expectedRestrictedReaderRole:ROLE
 };
}
ACTIVE("Phase5 Stage15 native PG16 transaction COMMIT time vs misleading created_at",()=>{
 let admin:Pool,reader:Pool,positive:P5Stage15NativeT24ReadbackScope;
 beforeAll(async()=>{
  if(process.env.GITHUB_ACTIONS!=="true"||
     process.env.DATABASE_URL!==URL||
     process.env.AERODATABOX_API_KEY||
     process.env.V39_PHASE6_PROCESS_ARMED!=="0")
    throw Error("REFUSED_STAGE15_NOT_DISPOSABLE_PG16");
  admin=new Pool({connectionString:URL,max:3});
  const trackingReadback=await admin.query(
   "SELECT current_setting('track_commit_timestamp') AS tracked");
  expect(trackingReadback.rows[0].tracked).toBe("on");
  await admin.query("CREATE ROLE "+ROLE+" LOGIN PASSWORD 'ci-only'"+
    " NOSUPERUSER NOCREATEDB NOCREATEROLE");
  await admin.query("GRANT USAGE ON SCHEMA clean TO "+ROLE);
  await admin.query("GRANT SELECT ON clean.flight_snapshots TO "+ROLE);
  reader=new Pool({connectionString:READER_URL,max:2});
  const now=(await admin.query("SELECT clock_timestamp() AS now")).rows[0].now;
  positive=scope("leg:ci:t24early",new Date(now).getTime()+120_000);
  await admin.query("INSERT INTO clean.flight_snapshots"+
    "(flight_instance_id,prediction_state,horizon,prediction_cutoff_utc,"+
    "selected_t_milestone_utc,selected_t_version,population_query_id,"+
    "fids_response_hash,frame_hash,config_hash,builder_version)"+
    "VALUES($1,'PRE_DEPARTURE','T-24h',$2,$3,$4,$5,$6,$7,$8,'ci')",[
      positive.flightInstanceId,positive.expectedT24CutoffUtc,
      positive.expectedSelectedTNativeUtc,positive.expectedSelectedTVersion,
      originalId,sourceSha,frame,config
    ]);
 });
 afterAll(async()=>{if(reader)await reader.end();if(admin)await admin.end();});
 it("uses native xmin commit time and never the transaction-start created_at",async()=>{
  const r=await inspectP5T24NativeCommitWitness(reader,positive);
  expect(r.status).toBe(
   "NATIVE_DB_T24_TRANSACTION_COMMIT_TIMESTAMP_VERIFIED_SOURCE_NOT_CERTIFIED");
  expect(r.durableBeforeOwnT24Cutoff).toBe(true);
  expect(r.nativeCommitTimestampTracked).toBe(true);
  expect(r.withinThreeMinuteDueWindow).toBe(true);
  expect(Date.parse(r.nativeTransactionCommitUtc)).toBeLessThan(
   Date.parse(r.t24CutoffUtc));
  expect(r.transactionId).toMatch(/^[0-9]+$/);
  expect(r.actualV0079SourceAndPopulationCertified).toBe(false);
  expect(r.nativeProviderScheduleSemanticsCertified).toBe(false);
  expect(r.t6OrT90WriteAuthorizedByThisCheck).toBe(false);
  expect(r.sourceAndMLRetentionRightsCertified).toBe(false);
  expect(r.phase6PaidGo).toBe(false);
 });
 it("refuses an after-cutoff commit even if manually backdated created_at",async()=>{
  const n=new Date((await admin.query(
    "SELECT clock_timestamp() AS n")).rows[0].n).getTime();
  const bad=scope("leg:ci:t24late",n-60_000);
  await admin.query("INSERT INTO clean.flight_snapshots"+
    "(flight_instance_id,prediction_state,horizon,prediction_cutoff_utc,"+
    "selected_t_milestone_utc,selected_t_version,population_query_id,"+
    "fids_response_hash,frame_hash,config_hash,builder_version,created_at)"+
    "VALUES($1,'PRE_DEPARTURE','T-24h',$2,$3,$4,$5,$6,$7,$8,'ci',$9)",
    [bad.flightInstanceId,bad.expectedT24CutoffUtc,
     bad.expectedSelectedTNativeUtc,bad.expectedSelectedTVersion,
     originalId,sourceSha,frame,config,iso(n-120_000)]);
  const row=await admin.query(
    "SELECT created_at<=prediction_cutoff_utc AS misleading"+
    " FROM clean.flight_snapshots WHERE flight_instance_id=$1",
    [bad.flightInstanceId]);
  expect(row.rows[0].misleading).toBe(true);
  await expect(inspectP5T24NativeCommitWitness(reader,bad))
   .rejects.toThrow("T24_NATIVE_TRANSACTION_COMMITTED_AFTER_CUTOFF");
 });
 it("rejects a later schedule rewrite or another T24 row for same identity",async()=>{
  const drift={...positive,
   expectedSelectedTNativeUtc:iso(
    Date.parse(positive.expectedSelectedTNativeUtc)+300_000)};
  await expect(inspectP5T24NativeCommitWitness(reader,drift))
   .rejects.toThrow("T24_NOT_EXACTLY_24_HOURS_BEFORE_SELECTED_T");
  const t=Date.parse(positive.expectedT24CutoffUtc)+60_000;
  await admin.query("INSERT INTO clean.flight_snapshots"+
    "(flight_instance_id,prediction_state,horizon,prediction_cutoff_utc,"+
    "selected_t_milestone_utc,selected_t_version,population_query_id,"+
    "fids_response_hash,frame_hash,config_hash,builder_version)"+
    "VALUES($1,'PRE_DEPARTURE','T-24h',$2,$3,$4,$5,$6,$7,$8,'ci')",
    [positive.flightInstanceId,iso(t),iso(t+86_400_000),
     positive.expectedSelectedTVersion,originalId,sourceSha,frame,config]);
  await expect(inspectP5T24NativeCommitWitness(reader,positive))
   .rejects.toThrow("ABSENT_OR_MULTIPLE_FROZEN_T24");
 });
 it("refuses the owner/admin role and a false tracking flag",async()=>{
  await expect(inspectP5T24NativeCommitWitness(admin,positive))
   .rejects.toThrow("RESTRICTED_DB_ROLE_OR_READ_ONLY");
  const proxy={connect:async()=>{
   const c=await reader.connect();
   return {
    release:()=>c.release(),
    query:async(sql:string,args?:unknown[])=>{
     const r=await c.query(sql,args);
     if(sql.includes("current_setting('track_commit_timestamp'"))
       return {...r,rows:r.rows.map(v=>({...v,track:"off"}))};
     return r;
    }
   };
  }};
  await expect(inspectP5T24NativeCommitWitness(proxy as any,positive))
   .rejects.toThrow("POSTGRES_NATIVE_COMMIT_TIMESTAMP_NOT_ENABLED");
 });
});
