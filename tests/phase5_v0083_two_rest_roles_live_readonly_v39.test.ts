import {describe,it,expect} from "vitest";
import {
 admitP5V0083RestReadonlyEnv,
 verifyP5V0083RestReadonlyCatalog,
 auditP5V0083RestReadOnlySession,
 type P5V0083ReadonlyCatalogRow
} from "../scripts/v39_phase5_v0083_two_rest_roles_live_readonly_once";

const reviewLogin="phase5_p5_other_rest_review_login_20261110";
const reserveLogin="phase5_p5_other_rest_reserve_login_20261110";
function env():Record<string,string|undefined>{
 return{
  GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
  GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"workflow_dispatch",
  GITHUB_RUN_ATTEMPT:"1",
  P5_V0083_REST_READONLY_CONFIRM:
   "VERIFY_V0083_TWO_REST_ROLES_READONLY_NO_PROVIDER",
  P5_V0083_REST_READONLY_EXECUTE:"1",ADB_AUTO_COLLECT:"0",
  V39_PHASE6_PROCESS_ARMED:"0",AERODATABOX_API_KEY:"",
  AERODATABOX_WEBHOOK_SECRET:"",DATABASE_URL:"",
  V39_DATABASE_RUNTIME_URL:"",
  P5_V39_OTHER_REST_REVIEW_DATABASE_URL:
   "postgresql://"+reviewLogin+":ci-only@db.example.test/neondb",
  P5_V39_OTHER_REST_RESERVE_DATABASE_URL:
   "postgresql://"+reserveLogin+":ci-only@db.example.test/neondb"
 };
}
function row(
 group:"review"|"reserve"
):P5V0083ReadonlyCatalogRow{
 return{
  db:"neondb",effective_role:group==="review"?
   "phase5_other_rest_review_prod_20261108":
   "phase5_other_rest_reserve_prod_20261108",
  actual_login:group==="review"?reviewLogin:reserveLogin,
  tx_readonly:"on",pg_version:160000,
  review_insert:group==="review",review_select:false,
  review_update:false,review_delete:false,
  reserve_insert:false,reserve_select:false,
  reserve_update:false,reserve_delete:false,
  reserve_execute:group==="reserve"
 };
}
describe("Phase5 V0083 actual REST logins, NO PROVIDER read-only commissioning",()=>{
 it("admits only two distinct expected secrets in one real DB and manual main",()=>{
  const z=admitP5V0083RestReadonlyEnv(env());
  expect(z.map(x=>x.group)).toEqual(["review","reserve"]);
  expect(z.map(x=>x.login)).toEqual([reviewLogin,reserveLogin]);
 });
 it("refuses PR, second attempt, activated Phase6 or provider key",()=>{
  const a=env();a.GITHUB_REF="refs/pull/123/merge";
  expect(()=>admitP5V0083RestReadonlyEnv(a)).toThrow(
   "NOT_MANUAL_MAIN_READONLY_NO_PROVIDER");
  const b=env();b.GITHUB_RUN_ATTEMPT="2";
  expect(()=>admitP5V0083RestReadonlyEnv(b)).toThrow(
   "NOT_MANUAL_MAIN_READONLY_NO_PROVIDER");
  const c=env();c.V39_PHASE6_PROCESS_ARMED="1";
  expect(()=>admitP5V0083RestReadonlyEnv(c)).toThrow(
   "NOT_MANUAL_MAIN_READONLY_NO_PROVIDER");
  const d=env();d.AERODATABOX_API_KEY="mock";
  expect(()=>admitP5V0083RestReadonlyEnv(d)).toThrow(
   "NOT_MANUAL_MAIN_READONLY_NO_PROVIDER");
 });
 it("refuses missing secret, app login, and cross-database REST workers",()=>{
  const a=env();delete a.P5_V39_OTHER_REST_REVIEW_DATABASE_URL;
  expect(()=>admitP5V0083RestReadonlyEnv(a)).toThrow(
   "UNCOMMISSIONED_REST_SECRET");
  const b=env();
  b.P5_V39_OTHER_REST_RESERVE_DATABASE_URL=
   "postgresql://"+reviewLogin+":mock@db.example.test/neondb";
  expect(()=>admitP5V0083RestReadonlyEnv(b)).toThrow(
   "UNREVIEWED_DEDICATED_REST_LOGIN_OR_DB");
  const c=env();
  c.P5_V39_OTHER_REST_RESERVE_DATABASE_URL=
   "postgresql://"+reserveLogin+":mock@another.example.test/neondb";
  expect(()=>admitP5V0083RestReadonlyEnv(c)).toThrow(
   "REVIEW_AND_RESERVE_DIFFERENT_DB");
 });
 it("checks exact independent narrow rights; no SELECT/UPDATE/DELETE on REST ledgers",()=>{
  expect(verifyP5V0083RestReadonlyCatalog(
   row("review"),"review",reviewLogin).limitedRESTPrivilegeVerified).toBe(true);
  expect(verifyP5V0083RestReadonlyCatalog(
   row("reserve"),"reserve",reserveLogin).limitedRESTPrivilegeVerified).toBe(true);
  const readLeak=row("review");readLeak.review_select=true;
  expect(()=>verifyP5V0083RestReadonlyCatalog(
   readLeak,"review",reviewLogin)).toThrow(
   "REST_REVIEW_RESERVE_PRIVILEGES_TOO_BROAD_OR_MISSING");
  const wrong=row("reserve");wrong.reserve_insert=true;
  expect(()=>verifyP5V0083RestReadonlyCatalog(
   wrong,"reserve",reserveLogin)).toThrow(
   "REST_REVIEW_RESERVE_PRIVILEGES_TOO_BROAD_OR_MISSING");
  const cross=row("review");cross.reserve_execute=true;
  expect(()=>verifyP5V0083RestReadonlyCatalog(
   cross,"review",reviewLogin)).toThrow(
   "REST_REVIEW_RESERVE_PRIVILEGES_TOO_BROAD_OR_MISSING");
 });
 it("rejects a false transaction-read-only claim and wrong effective login",()=>{
  const a=row("review");a.tx_readonly="off";
  expect(()=>verifyP5V0083RestReadonlyCatalog(
   a,"review",reviewLogin)).toThrow(
   "REAL_SESSION_OR_READONLY_TRANSACTION_MISMATCH");
  const b=row("reserve");b.actual_login="phase5_runtime_application_login";
  expect(()=>verifyP5V0083RestReadonlyCatalog(
   b,"reserve",reserveLogin)).toThrow(
   "REAL_SESSION_OR_READONLY_TRANSACTION_MISMATCH");
 });
 it("uses an actual BEGIN READ ONLY, catalog-only SELECT and ROLLBACK",async()=>{
  const calls:string[]=[];
  const client={
   query:async(s:string)=>{
    calls.push(s);
    if(s.startsWith("SELECT current_database"))
     return {rowCount:1,rows:[row("review")]};
    return {rowCount:0,rows:[]};
   },
   release:()=>calls.push("RELEASE")
  };
  const x=await auditP5V0083RestReadOnlySession(
   {connect:async()=>client} as any,"review",reviewLogin);
  expect(x.databaseWrites).toBe(0);
  expect(calls[0]).toContain("READ ONLY");
  expect(calls.some(s=>s.includes("has_table_privilege"))).toBe(true);
  expect(calls).toContain("ROLLBACK");
  expect(calls.at(-1)).toBe("RELEASE");
  expect(calls.some(s=>/INSERT INTO|UPDATE clean|DELETE FROM|CALL clean/.test(s)))
   .toBe(false);
 });
 it("rolls back and releases on a privilege mismatch",async()=>{
  const calls:string[]=[];
  const bad=row("reserve");bad.reserve_select=true;
  const client={
   query:async(s:string)=>{
    calls.push(s);
    if(s.startsWith("SELECT current_database"))
     return{rowCount:1,rows:[bad]};
    return{rowCount:0,rows:[]};
   },
   release:()=>calls.push("RELEASE")
  };
  await expect(auditP5V0083RestReadOnlySession(
   {connect:async()=>client} as any,"reserve",reserveLogin))
   .rejects.toThrow("REST_REVIEW_RESERVE_PRIVILEGES_TOO_BROAD_OR_MISSING");
  expect(calls).toContain("ROLLBACK");
  expect(calls.at(-1)).toBe("RELEASE");
 });
});
