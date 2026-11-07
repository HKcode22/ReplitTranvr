import {beforeAll,afterAll,describe,it,expect} from "vitest";
import pg from "pg";
import {
 provisionP5Stage30NonpaidWorkerLogins,P5_STAGE30_ENTRIES
} from "../scripts/v39_phase5_stage30_three_nonpaid_github_worker_login_secrets_owner_once.mjs";
import {makeP5Stage28DedicatedRolePool}
 from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39";
const {Pool}=pg;
const URL="postgresql://phase5_stage30_ci_owner:ci-only@localhost:5432/neondb?sslmode=disable";
const CONFIG={
 GITHUB_ACTIONS:"true",
 P5_STAGE30_NONPAID_LOGINS_ONCE:"COMMISSION_THREE_NONPAID_GITHUB_WORKER_LOGINS_NO_SOURCE",
 DATABASE_URL:URL,
 V39_DATABASE_RUNTIME_URL:"postgresql://phase5_stage30_app_ci:ci-only@localhost:5432/neondb?sslmode=disable",
 ADB_AUTO_COLLECT:"0",
 V39_PHASE6_PROCESS_ARMED:"0"
};
const active=process.env.P5_STAGE30_DISPOSABLE_GH_SECRET_PG16_TEST==="1"?describe:describe.skip;
active("Stage30 three real PG16 role logins, GitHub secret API MOCK ONLY",()=>{
 let owner:InstanceType<typeof Pool>;
 const secrets=new Map<string,string>();
 const gh={
  listSecretNames:async()=>[...secrets.keys()],
  setSecret:async(name:string,value:string)=>{secrets.set(name,value);},
  deleteSecret:async(name:string)=>{secrets.delete(name);}
 };
 beforeAll(async()=>{
  if(process.env.GITHUB_ACTIONS!=="true"||
    process.env.DATABASE_URL!=="postgresql://postgres:postgres@localhost:5432/neondb?sslmode=disable"||
    process.env.AERODATABOX_API_KEY||
    process.env.V39_PHASE6_PROCESS_ARMED!=="0"||
    process.env.P5_STAGE30_DISPOSABLE_GH_SECRET_PG16_TEST!=="1")
    throw Error("REFUSED_STAGE30_NOT_DISPOSABLE_GITHUB_MOCK");
  owner=new Pool({connectionString:URL,max:2});
 });
 afterAll(async()=>await owner?.end());
 it("rollback transaction and delete the first created remote secret on second mock failure",async()=>{
  let count=0;
  const failing={
   ...gh,
   setSecret:async(name:string,value:string)=>{
    count++;
    if(count===2)throw Error("MOCK_GITHUB_ACTIONS_SECRET_WRITE_FAILURE");
    secrets.set(name,value);
   }
  };
  await expect(provisionP5Stage30NonpaidWorkerLogins(
     owner,failing,CONFIG)).rejects.toThrow(/MOCK_GITHUB_ACTIONS_SECRET_WRITE_FAILURE/);
  const r=await owner.query(
   "SELECT rolname FROM pg_catalog.pg_roles "+
   "WHERE rolname=ANY($1::text[])",
   [P5_STAGE30_ENTRIES.map(x=>x.login)]);
  expect(r.rows).toHaveLength(0);
  expect(secrets.size).toBe(0);
 });
 it("creates exactly three non-admin LOGIN/SET-only memberships, secrets mocked",async()=>{
  const out=await provisionP5Stage30NonpaidWorkerLogins(owner,gh,CONFIG);
  expect(out.status).toBe("P5_STAGE30_THREE_NONPAID_DEDICATED_GITHUB_LOGINS_COMMITTED_INERT");
  expect(out.rolesCreated).toBe(3);
  expect(out.gitHubActionsSecretsCreated).toBe(3);
  expect(out.sourcePaidWorkerLoginOrSecretCreated).toBe(false);
  expect(out.providerFidsGets).toBe(0);
  expect(out.providerAlertCreates).toBe(0);
  expect(out.phase5FreezePassed).toBe(false);
  expect(out.phase6PaidGo).toBe(false);
  expect(secrets.size).toBe(3);
  expect([...secrets.keys()].sort()).toEqual(P5_STAGE30_ENTRIES.map(x=>x.secret).sort());
  for(const e of P5_STAGE30_ENTRIES){
   const value=secrets.get(e.secret)!;
   const u=new URL(value);
   expect(u.username).toBe(e.login);
   expect(u.password.length).toBeGreaterThanOrEqual(64);
   expect(u.host).toBe("localhost:5432");
   const direct=new Pool({connectionString:value,max:2});
   try{
    const role=makeP5Stage28DedicatedRolePool(direct,{
     group:e.key as "prepare"|"pre"|"witness",
     reviewedDedicatedLogin:e.login,
     forbiddenApplicationLogin:"phase5_stage30_app_ci"
    });
    const current=await role.query("SELECT current_user AS actor,session_user AS login");
    expect(current.rows[0]).toEqual({actor:e.group,login:e.login});
   }finally{await direct.end();}
  }
 });
 it("refuses to repeat existing irreversible role and encrypted secret setup",async()=>{
  await expect(provisionP5Stage30NonpaidWorkerLogins(
   owner,gh,CONFIG)).rejects.toThrow(
    "REFUSED_P5_STAGE30_GITHUB_SECRET_ALREADY_EXISTS_DO_NOT_OVERWRITE");
  expect(secrets.size).toBe(3);
 });
});
