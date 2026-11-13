/**
 * Real disposable PostgreSQL16 ONLY; no actual Neon, provider, credentials,
 * paid source, calendar or budget writes. Mock GitHub secret transport.
 * The existing V0079/V0082/V0093 source schemas are installed by CI.
 */
import {Pool} from "pg";
import {URL as NodeURL} from "node:url";
import {describe,it,expect,beforeAll,afterAll} from "vitest";
import {
 APPROVAL, ENTRIES, commissionP5PrelaunchTwoNarrowLoginsOnce
} from "../scripts/v39_phase5_prelaunch_two_narrow_logins_owner_once.mjs";

const URL="postgresql://postgres:postgres@localhost:5432/neondb?sslmode=disable";
const ENABLED=process.env.P5_PRELAUNCH_TWO_LOGIN_PG16_TEST==="1";
const suite=ENABLED?describe:describe.skip;
const SHA="b".repeat(40);
const baseEnv={
 P5_PRELAUNCH_TWO_LOGIN_APPROVAL:APPROVAL,
 ADB_AUTO_COLLECT:"0",
 V39_PHASE6_PROCESS_ARMED:"0",
 V39_PHASE6_OWNER_APPROVED:"0",
 AERODATABOX_API_KEY:"",
 RAPIDAPI_KEY:"",
 AERODATABOX_WEBHOOK_SECRET:"",
 P5_PRELAUNCH_APPROVED_MAIN_SHA:SHA,
 DATABASE_URL:URL,
 GITHUB_ACTIONS:"true",
 P5_PRELAUNCH_CI_DISPOSABLE_PG16:"1",
 P5_PRELAUNCH_CI_INJECT_PRECOMMIT_FAILURE:"0"
};
function fakeGitHub(){
 const secrets=new Map<string,string>();
 let sha=SHA;
 return {
  secrets,
  getMainSha:async()=>sha,
  listSecretNames:async()=>[...secrets.keys()],
  setSecret:async(name:string,value:string)=>{
   if(secrets.has(name))throw Error("CI_DUPLICATE_GITHUB_SECRET");
   secrets.set(name,value);
  },
  deleteSecret:async(name:string)=>{secrets.delete(name);},
  moveMain:(s:string)=>{sha=s;}
 };
}
suite("Phase5 two narrow owner login credentials + restricted B0062/V0093 ACL",()=>{
 let pool:Pool;
 beforeAll(async()=>{
  if(process.env.GITHUB_ACTIONS!=="true"||
     process.env.DATABASE_URL!==URL||
     process.env.V39_PHASE6_PROCESS_ARMED!=="0"||
     process.env.V39_PHASE6_OWNER_APPROVED!=="0"||
     process.env.AERODATABOX_API_KEY||
     process.env.RAPIDAPI_KEY)
   throw Error("REFUSED_NONDISPOSABLE_TWO_LOGIN_TEST");
  pool=new Pool({connectionString:URL,max:1});
 });
 afterAll(async()=>{await pool?.end();});
 async function countRoles(){
  const a=await pool.query(
   "SELECT COUNT(*)::int n FROM pg_catalog.pg_roles WHERE rolname=ANY($1::text[])",
   [ENTRIES.map(x=>x.role)]);
  return a.rows[0].n;
 }
 async function zeroSource(){
  const x=await pool.query("SELECT "+
   "(SELECT COUNT(*)::int FROM clean.adb_phase6_calendar_day) calendar,"+
   "(SELECT COUNT(*)::int FROM clean.adb_phase6_authorization) auth,"+
   "(SELECT COUNT(*)::int FROM clean.phase5_fids_seven_rest_release_v39) release,"+
   "(SELECT COUNT(*)::int FROM clean.phase5_fids_allowed_query_v39) source,"+
   "(SELECT COUNT(*)::int FROM clean.phase5_fids_physical_attempt_v39) attempt");
  return x.rows[0];
 }
 it("starts virgin, cannot use unapproved main or preexisting secret",async()=>{
  expect(await countRoles()).toBe(0);
  const gh=fakeGitHub();
  gh.moveMain("a".repeat(40));
  await expect(commissionP5PrelaunchTwoNarrowLoginsOnce(
   pool,gh,baseEnv)).rejects.toThrow("GITHUB_MAIN_NOT_EXACT_APPROVED_SHA");
  gh.moveMain(SHA);
  gh.secrets.set(ENTRIES[0].secret,"CI_EXISTING");
  await expect(commissionP5PrelaunchTwoNarrowLoginsOnce(
   pool,gh,baseEnv)).rejects.toThrow("GITHUB_SECRET_ALREADY_PRESENT");
  expect(await countRoles()).toBe(0);
  expect(await zeroSource()).toEqual({
   calendar:0,auth:0,release:0,source:0,attempt:0
  });
 });
 it("atomically rolls back roles and cleans both mock encrypted secrets on injected precommit failure",async()=>{
  const gh=fakeGitHub();
  await expect(commissionP5PrelaunchTwoNarrowLoginsOnce(
   pool,gh,{...baseEnv,P5_PRELAUNCH_CI_INJECT_PRECOMMIT_FAILURE:"1"}
  )).rejects.toThrow("CI_INJECTED_PRECOMMIT_FAILURE");
  expect(await countRoles()).toBe(0);
  expect([...gh.secrets.keys()]).toEqual([]);
  expect(await zeroSource()).toEqual({
   calendar:0,auth:0,release:0,source:0,attempt:0
  });
 });
 it("rejects missing explicit approval before any schema or role mutation",async()=>{
  const gh=fakeGitHub();
  await expect(commissionP5PrelaunchTwoNarrowLoginsOnce(
   pool,gh,{...baseEnv,P5_PRELAUNCH_TWO_LOGIN_APPROVAL:""}
  )).rejects.toThrow("NOT_EXACT_OWNER_NO_PROVIDER_INERT_APPROVAL");
  expect(await countRoles()).toBe(0);
 });
 it("commissions exactly two no-inheritance, no-admin, source-denied production-shaped logins",async()=>{
  const gh=fakeGitHub();
  const receipt=await commissionP5PrelaunchTwoNarrowLoginsOnce(
   pool,gh,baseEnv);
  expect(receipt.status).toBe(
   "P5_B0062_AND_V0093_TWO_NARROW_LOGINS_COMMISSIONED_NO_GO");
  expect(receipt.productionLoginCount).toBe(2);
  expect(receipt.encryptedGithubSecretsCreated).toBe(2);
  expect(receipt.noRoleMemberships).toBe(true);
  expect(receipt.calendarOrBudgetRowsWritten).toBe(0);
  expect(receipt.providerCalls).toBe(0);
  expect(receipt.phase6PaidGo).toBe(false);
  expect(await countRoles()).toBe(2);
  expect([...gh.secrets.keys()].sort()).toEqual(
   ENTRIES.map(e=>e.secret).sort());
  // Do not emit actual connection URLs/passwords in CI logs. Merely assert
  // role-specific secrets differ and refer to the expected isolated DB.
  for(const entry of ENTRIES){
   const url=new NodeURL(gh.secrets.get(entry.secret)!);
   expect(decodeURIComponent(url.username)).toBe(entry.role);
   expect(url.pathname).toBe("/neondb");
   expect(url.password.length).toBeGreaterThan(60);
  }
  const a=await pool.query(
   "SELECT rolname,rolcanlogin,rolsuper,rolinherit,rolcreaterole "+
   "FROM pg_catalog.pg_roles WHERE rolname=ANY($1::text[])",
   [ENTRIES.map(e=>e.role)]);
  expect(a.rows).toHaveLength(2);
  expect(a.rows.every(x=>x.rolcanlogin===true&&
   x.rolsuper===false&&x.rolinherit===false&&
   x.rolcreaterole===false)).toBe(true);
  expect(await zeroSource()).toEqual({
   calendar:0,auth:0,release:0,source:0,attempt:0
  });
  await expect(commissionP5PrelaunchTwoNarrowLoginsOnce(
   pool,fakeGitHub(),baseEnv)).rejects.toThrow(
    "ROLE_ALREADY_EXISTS_OR_PARTIALLY_COMMISSIONED_NEVER_RETRY");
 });
});
