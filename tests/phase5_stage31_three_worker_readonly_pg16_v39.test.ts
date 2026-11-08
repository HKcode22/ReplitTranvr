/** Genuine disposable PG16 with exactly the three Stage30-shaped logins.
 * Does NOT read production GitHub Actions secrets or query real flight data.
 */
import {describe,it,expect} from "vitest";
import pg from "pg";
import {verifyP5Stage31WorkerReadOnlyConnections}
 from "../scripts/v39_phase5_stage31_three_nonpaid_live_readonly_github_workers_once";
const {Pool}=pg;
const enabled=process.env.P5_STAGE31_DISPOSABLE_PG16_TEST==="1"?describe:describe.skip;
const entries=[
 ["P5_V39_PREPARE_DATABASE_URL","phase5_p30_prepare_login_20261107"],
 ["P5_V39_PRE_DATABASE_URL","phase5_p30_pre_login_20261107"],
 ["P5_V39_T24_WITNESS_DATABASE_URL","phase5_p30_witness_login_20261107"]
] as const;
const fake=(login:string)=>"postgresql://"+login+":ci-only@localhost:5432/neondb?sslmode=disable";
const ok=()=>({
 GITHUB_ACTIONS:"true",GITHUB_EVENT_NAME:"pull_request",
 GITHUB_REF:"refs/pull/31/merge",P5_STAGE31_CI_DISPOSABLE:"1",
 P5_STAGE31_READONLY_ONCE:"VERIFY_THREE_NONPAID_WORKERS_READONLY_NO_PROVIDER",
 ADB_AUTO_COLLECT:"0",V39_PHASE6_PROCESS_ARMED:"0",
 AERODATABOX_API_KEY:"",
 ...Object.fromEntries(entries.map(([name,login])=>[name,fake(login)]))
});
enabled("Stage31 authentic SQL READ ONLY session per separate PG16 login",()=>{
 it("success: three distinct source-independent SQL role sessions, no writes",async()=>{
  if(process.env.GITHUB_ACTIONS!=="true"||
     process.env.AERODATABOX_API_KEY||
     process.env.V39_PHASE6_PROCESS_ARMED!=="0")
   throw Error("REFUSED_STAGE31_NOT_SAFE_CI");
  const p=new Pool({connectionString:process.env.DATABASE_URL,max:1});
  const tables=["flight_snapshots","fids_query_response",
   "phase5_t24_postcommit_witness_v39"];
  const before=[];
  try{
   for(const t of tables)
    before.push(Number((await p.query("SELECT count(*)::int AS n FROM clean."+t)).rows[0].n));
   const result=await verifyP5Stage31WorkerReadOnlyConnections(ok());
   expect(result.status).toBe("P5_STAGE31_THREE_NONPAID_WORKERS_DISPOSABLE_PG16_VERIFIED");
   expect(result.verifiedDistinctWorkerRoles).toBe(3);
   expect(result.results.map(r=>r.group)).toEqual(["prepare","pre","witness"]);
   for(const r of result.results){
    expect(r.roleSessionVerified).toBe(true);
    expect(r.readOnlyTransactionVerified).toBe(true);
    expect(r.dbWrites).toBe(0);
   }
   expect(result.flightRowsRead).toBe(0);
   expect(result.flightRowsWritten).toBe(0);
   expect(result.paidSourceWorkerActivated).toBe(false);
   expect(result.phase5FreezePassed).toBe(false);
   expect(result.phase6PaidGo).toBe(false);
   for(let i=0;i<tables.length;i++)
    expect(Number((await p.query("SELECT count(*)::int AS n FROM clean."+tables[i])).rows[0].n)).toBe(before[i]);
  }finally{await p.end();}
 });
 it("missing action secret refuses before network or SQL",async()=>{
  const e=ok(); delete (e as Record<string,string>).P5_V39_PRE_DATABASE_URL;
  await expect(verifyP5Stage31WorkerReadOnlyConnections(e)).rejects.toThrow(
   "REFUSED_P5_STAGE31_MISSING_REVIEWED_WORKER_SECRET");
 });
 it("PR must use disposable localhost even if caller supplies other target",async()=>{
  const e=ok();e.P5_V39_PRE_DATABASE_URL=
   "postgresql://phase5_p30_pre_login_20261107:ci-only@other-server.example/neondb";
  await expect(verifyP5Stage31WorkerReadOnlyConnections(e)).rejects.toThrow(
   "REFUSED_P5_STAGE31_CI_MUST_BE_DISPOSABLE_LOCALHOST");
 });
 it("a PR pretending to be manual main cannot expose real worker credentials",async()=>{
  const e=ok();
  e.P5_STAGE31_CI_DISPOSABLE="0";
  await expect(verifyP5Stage31WorkerReadOnlyConnections(e)).rejects.toThrow(
   "REFUSED_P5_STAGE31_ONLY_MANUAL_MAIN_OR_DISPOSABLE_PR_TEST");
 });
 it("a wrong login identity cannot use another restricted source group",async()=>{
  const e=ok();
  e.P5_V39_PRE_DATABASE_URL=fake("phase5_p30_prepare_login_20261107");
  await expect(verifyP5Stage31WorkerReadOnlyConnections(e)).rejects.toThrow(
   "REFUSED_P5_STAGE31_UNREVIEWED_DB_LOGIN_OR_DATABASE");
 });
 it("reject provider key/armed Phase6 even for disposable query",async()=>{
  const e=ok();e.AERODATABOX_API_KEY="forbidden";
  await expect(verifyP5Stage31WorkerReadOnlyConnections(e)).rejects.toThrow(
   "REFUSED_P5_STAGE31_NOT_NO_PROVIDER_GITHUB_ONLY_MODE");
 });
});
