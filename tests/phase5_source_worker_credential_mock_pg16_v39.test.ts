import {beforeAll,afterAll,describe,it,expect} from "vitest";
import pg from "pg";
import {commissionPhase5SourceCredential,SOURCE}
 from "../scripts/v39_phase5_source_worker_credential_owner_once.mjs";
import {makeP5Stage28DedicatedRolePool}
 from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39";
import {verifyP5SourceRealGitHubReadOnly}
 from "../scripts/v39_phase5_source_live_github_readonly_once";
const {Pool}=pg;
const OWNER_URL="postgresql://phase5_source_ci_owner:ci-only@localhost:5432/neondb?sslmode=disable";
const active=process.env.P5_SOURCE_DISPOSABLE_PG16_TEST==="1"?describe:describe.skip;
const ENV={
 GITHUB_ACTIONS:"true",
 P5_SOURCE_CREDENTIAL_ONCE:"COMMISSION_SOURCE_LOGIN_AND_SECRET_NO_PROVIDER_CALLS",
 DATABASE_URL:OWNER_URL,
 V39_DATABASE_RUNTIME_URL:"postgresql://phase5_source_ci_app:ci-only@localhost:5432/neondb?sslmode=disable",
 ADB_AUTO_COLLECT:"0",V39_PHASE6_PROCESS_ARMED:"0",
};
active("Phase5 isolated SOURCE account: real disposable PG16 and GitHub secret MOCK",()=>{
 let owner:InstanceType<typeof Pool>;
 const secrets=new Map<string,string>();
 const driver={
  listSecretNames:async()=>[...secrets.keys()],
  setSecret:async(name:string,value:string)=>{secrets.set(name,value);},
  deleteSecret:async(name:string)=>{secrets.delete(name);}
 };
 beforeAll(async()=>{
  if(process.env.GITHUB_ACTIONS!=="true"||
     process.env.P5_SOURCE_DISPOSABLE_PG16_TEST!=="1"||
     process.env.DATABASE_URL!==
       "postgresql://postgres:postgres@localhost:5432/neondb?sslmode=disable"||
     process.env.AERODATABOX_API_KEY||process.env.V39_PHASE6_PROCESS_ARMED!=="0")
    throw Error("REFUSED_NON_DISPOSABLE_SOURCE_CREDENTIAL_TEST");
  owner=new Pool({connectionString:OWNER_URL,max:2});
 });
 afterAll(async()=>await owner?.end());
 it("rolls back new LOGIN and GH secret if remote write reports an error",async()=>{
  let mutation=false;
  const failed={...driver,setSecret:async(name:string,value:string)=>{
   secrets.set(name,value);mutation=true;
   throw Error("CI_INJECTED_REMOTE_SECRET_ACK_MISSING");
  }};
  await expect(commissionPhase5SourceCredential(owner,failed,ENV))
   .rejects.toThrow("CI_INJECTED_REMOTE_SECRET_ACK_MISSING");
  expect(mutation).toBe(true);
  expect(secrets.size).toBe(0);
  const x=await owner.query(
   "SELECT rolname FROM pg_catalog.pg_roles WHERE rolname=$1",[SOURCE.login]);
  expect(x.rows).toHaveLength(0);
 });
 it("commits exactly one SOURCE LOGIN with SET-only rights and encrypted GH mock",async()=>{
  const result=await commissionPhase5SourceCredential(owner,driver,ENV);
  expect(result.status).toBe(
   "P5_DEDICATED_SOURCE_LOGIN_AND_ENCRYPTED_SECRET_COMMISSIONED_INERT");
  expect(result.loginRoleCreated).toBe(1);
  expect(result.githubActionsSecretsCreated).toBe(1);
  expect(result.providerFidsGets).toBe(0);
  expect(result.alertCreates).toBe(0);
  expect(result.phase6PaidGo).toBe(false);
  expect(result.sourceContentsRightsCertified).toBe(false);
  expect([...secrets.keys()]).toEqual([SOURCE.secret]);
  const u=new URL(secrets.get(SOURCE.secret)!);
  expect(u.username).toBe(SOURCE.login);
  expect(u.password.length).toBeGreaterThanOrEqual(64);
  const direct=new Pool({connectionString:u.toString(),max:1});
  try{
   // A fresh NOINHERIT login has no USAGE on schema clean; its attempt
   // to resolve a qualified table for has_table_privilege would correctly
   // fail. Check schema isolation without granting it access just for CI.
   const before=await direct.query(
    "SELECT current_user AS who, "+
    "has_schema_privilege(current_user,'clean','USAGE') AS can_schema");
   expect(before.rows[0].who).toBe(SOURCE.login);
   expect(before.rows[0].can_schema).toBe(false);
   const source=makeP5Stage28DedicatedRolePool(direct,{
    group:"source",reviewedDedicatedLogin:SOURCE.login,
    forbiddenApplicationLogin:"phase5_source_ci_app"
   });
   const current=await source.query(
    "SELECT session_user AS login,current_user AS current,"+
    "has_table_privilege(current_user,'clean.phase5_fids_original_binding_v39','INSERT') AS can_original,"+
    "has_table_privilege(current_user,'clean.flight_snapshots','INSERT') AS can_pre");
   expect(current.rows[0]).toEqual({login:SOURCE.login,current:SOURCE.group,
    can_original:true,can_pre:false});
   const report=await verifyP5SourceRealGitHubReadOnly({
    GITHUB_ACTIONS:"true",
    GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
    GITHUB_REF:"refs/pull/464/merge",
    GITHUB_EVENT_NAME:"pull_request",
    P5_SOURCE_READONLY_CI_DISPOSABLE:"1",
    P5_SOURCE_READONLY_CONFIRM:"VERIFY_SOURCE_ROLE_READONLY_NO_PROVIDER",
    ADB_AUTO_COLLECT:"0",V39_PHASE6_PROCESS_ARMED:"0",
    AERODATABOX_API_KEY:"",AERODATABOX_WEBHOOK_SECRET:"",
    V39_P5_SOURCE_DATABASE_URL:secrets.get(SOURCE.secret)
   });
   expect(report.status).toBe("P5_SOURCE_DISPOSABLE_PG16_READONLY_ROLE_VERIFIED");
   expect(report.authenticatedRoleSet).toBe(true);
   expect(report.readOnlyTransactionVerified).toBe(true);
   expect(report.providerFidsGets).toBe(0);
   expect(report.flightRowsRead).toBe(0);
   expect(report.flightRowsWritten).toBe(0);
   expect(report.phase5FreezePassed).toBe(false);
   expect(report.phase6PaidGo).toBe(false);
  }finally{await direct.end();}
 });
 it("source live smoke refuses PR with real remote DB URL before making a query",async()=>{
   await expect(verifyP5SourceRealGitHubReadOnly({
    GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
    GITHUB_REF:"refs/pull/464/merge",GITHUB_EVENT_NAME:"pull_request",
    P5_SOURCE_READONLY_CI_DISPOSABLE:"1",
    P5_SOURCE_READONLY_CONFIRM:"VERIFY_SOURCE_ROLE_READONLY_NO_PROVIDER",
    ADB_AUTO_COLLECT:"0",V39_PHASE6_PROCESS_ARMED:"0",
    V39_P5_SOURCE_DATABASE_URL:
      "postgresql://"+SOURCE.login+":"+"b".repeat(72)+"@prod.example/neondb"
   })).rejects.toThrow("REFUSED_P5_SOURCE_READONLY_CI_ONLY_DISPOSABLE_LOCALHOST");
 });
 it("source live smoke refuses a provider key before connecting",async()=>{
   await expect(verifyP5SourceRealGitHubReadOnly({
    GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
    GITHUB_REF:"refs/pull/464/merge",GITHUB_EVENT_NAME:"pull_request",
    P5_SOURCE_READONLY_CI_DISPOSABLE:"1",
    P5_SOURCE_READONLY_CONFIRM:"VERIFY_SOURCE_ROLE_READONLY_NO_PROVIDER",
    ADB_AUTO_COLLECT:"0",V39_PHASE6_PROCESS_ARMED:"0",
    AERODATABOX_API_KEY:"NO_PROVIDER_PERMITTED",
    V39_P5_SOURCE_DATABASE_URL:secrets.get(SOURCE.secret)
   })).rejects.toThrow("REFUSED_P5_SOURCE_READONLY_GITHUB_ONLY_NO_PROVIDER_CONTEXT_REQUIRED");
 });
 it("refuses a replay even when only encrypted secret state exists",async()=>{
  await expect(commissionPhase5SourceCredential(owner,driver,ENV))
   .rejects.toThrow(
    "REFUSED_P5_SOURCE_CREDENTIAL_SOURCE_SECRET_ALREADY_EXISTS_NO_OVERWRITE");
  expect(secrets.size).toBe(1);
 });
});
