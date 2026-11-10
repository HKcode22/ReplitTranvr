import {beforeAll,afterAll,describe,it,expect} from "vitest";
import pg from "pg";
import {
 commissionP5V0083TwoRestLoginsOnce,
 P5_V0083_REST_LOGIN_ENTRIES
} from "../scripts/v39_phase5_v0083_two_post_rest_login_secrets_once.mjs";
import {makeP5V0083RestDedicatedRolePool}
 from "../server/lib/disruption/phase5V0083RestDedicatedRolePool_v39";
import {verifyP5V0083RestReadonlyCatalog}
 from "../scripts/v39_phase5_v0083_two_rest_roles_live_readonly_once";
const {Pool}=pg;
const ROOT="postgresql://postgres:postgres@localhost:5432/neondb?sslmode=disable";
const OWNER="postgresql://v0083_ci_owner:ci-only@localhost:5432/neondb?sslmode=disable";
const MAIN="b".repeat(40);
const cfg={
 GITHUB_ACTIONS:"true",
 P5_V0083_TWO_LOGIN_ONCE:"COMMISSION_ONLY_TWO_V0083_REST_LOGIN_SECRETS_NO_PROVIDER",
 P5_V0083_CI_MOCK_ONLY:"1",
 P5_V0083_APPROVED_MAIN_SHA:MAIN,
 DATABASE_URL:OWNER,
 ADB_AUTO_COLLECT:"0",
 V39_PHASE6_PROCESS_ARMED:"0",
 V39_PHASE6_OWNER_APPROVED:"0",
 AERODATABOX_API_KEY:"",
 AERODATABOX_WEBHOOK_SECRET:""
};
const active=process.env.P5_V0083_TWO_LOGIN_DISPOSABLE_PG16_TEST==="1"?describe:describe.skip;
active("V0083 2 dedicated LOGINs+mocked GitHub Secrets, actual isolated PostgreSQL16",()=>{
 let db:InstanceType<typeof Pool>;
 const secrets=new Map<string,string>();
 const driver={
  getMainSha:async()=>MAIN,
  listSecretNames:async()=>[...secrets.keys()],
  setSecret:async(k:string,v:string)=>{secrets.set(k,v);},
  deleteSecret:async(k:string)=>{secrets.delete(k);}
 };
 beforeAll(async()=>{
  if(process.env.GITHUB_ACTIONS!=="true"||
     process.env.DATABASE_URL!==ROOT||
     process.env.P5_V0083_TWO_LOGIN_DISPOSABLE_PG16_TEST!=="1"||
     process.env.AERODATABOX_API_KEY||
     process.env.V39_PHASE6_PROCESS_ARMED!=="0"||
     process.env.V39_PHASE6_OWNER_APPROVED!=="0")
   throw Error("REFUSED_V0083_TEST_NOT_ISOLATED_PG16_MOCK");
  db=new Pool({connectionString:OWNER,max:2});
 });
 afterAll(async()=>{await db?.end();});
 it("refuses change of actual GitHub main or missing owner/purpose without DB mutations",async()=>{
  await expect(commissionP5V0083TwoRestLoginsOnce(db,{
   ...driver,getMainSha:async()=> "f".repeat(40)
  },cfg)).rejects.toThrow("MAIN_CHANGED_FROM_REVIEWED_PIN_NO_MUTATION");
  await expect(commissionP5V0083TwoRestLoginsOnce(db,driver,{
   ...cfg,V39_PHASE6_PROCESS_ARMED:"1"
  })).rejects.toThrow("OWNER_APPROVAL_NONPAID_AND_EXACT_MAIN_REQUIRED");
  await expect(commissionP5V0083TwoRestLoginsOnce(db,driver,{
   ...cfg,GITHUB_ACTIONS:"false",DATABASE_URL:"postgresql://phase5_runtime:password@localhost/neondb"
  })).rejects.toThrow("REVIEWED_ADMIN_CREATOR_DB_ONLY_NO_WORKER_REUSE");
  expect(secrets.size).toBe(0);
 });
 it("on second simulated GitHub secret failure rolls back BOTH roles and cleans attempted keys",async()=>{
  let count=0;
  const failGH={
   ...driver,
   setSecret:async(k:string,v:string)=>{
    count++;
    secrets.set(k,v);
    if(count===2)throw Error("MOCK_SECOND_SECRET_WRITE_ACK_LOST");
   }
  };
  await expect(commissionP5V0083TwoRestLoginsOnce(
   db,failGH,cfg)).rejects.toThrow(/MOCK_SECOND_SECRET_WRITE_ACK_LOST/);
  const u=await db.query(
   "SELECT rolname FROM pg_catalog.pg_roles"+
   " WHERE rolname=ANY($1::text[])",
   [P5_V0083_REST_LOGIN_ENTRIES.map(e=>e.login)]);
  expect(u.rows).toHaveLength(0);
  expect(secrets.size).toBe(0);
 });
 it("rejects unknown or partial GitHub encrypted secrets without touching SQL",async()=>{
  secrets.set(P5_V0083_REST_LOGIN_ENTRIES[0].secret,"EXISTING_DO_NOT_OVERWRITE");
  await expect(commissionP5V0083TwoRestLoginsOnce(
   db,driver,cfg)).rejects.toThrow("GITHUB_SECRET_PREEXISTS_DO_NOT_OVERWRITE");
  secrets.clear();
 });
 it("commits exactly two isolated PG LOGIN roles with two mocked encrypted secrets",async()=>{
  const out=await commissionP5V0083TwoRestLoginsOnce(db,driver,cfg);
  expect(out.status).toBe(
   "P5_V0083_TWO_DEDICATED_POST_REST_LOGINS_AND_ENCRYPTED_SECRETS_COMMITTED");
  expect(out.rolesCreated).toBe(2);
  expect(out.encryptedGithubSecretsCreated).toBe(2);
  expect(out.providerCalls).toBe(0);
  expect(out.providerAlerts).toBe(0);
  expect(out.newRESTReviewOrPhysicalReservations).toBe(0);
  expect(out.sourceRowsWritten).toBe(0);
  expect(out.phase5ScientificFreezePassed).toBe(false);
  expect(out.phase6PaidGo).toBe(false);
  expect(secrets.size).toBe(2);
  for(const entry of P5_V0083_REST_LOGIN_ENTRIES){
   const s=secrets.get(entry.secret)!;
   const url=new URL(s);
   expect(url.username).toBe(entry.login);
   expect(url.password.length).toBeGreaterThanOrEqual(96);
   expect(url.host).toBe("localhost:5432");
   const raw=new Pool({connectionString:s,max:1});
   try{
    const pool=makeP5V0083RestDedicatedRolePool(raw,{
     group:entry.group as "review"|"reserve",
     reviewedDedicatedLogin:entry.login,
     forbiddenApplicationLogin:"phase5_fids_source_ci"
    });
    const client=await pool.connect();
    let q;
    try{
     await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
     q=await client.query(
     "SELECT current_user AS effective_role,session_user AS actual_login,"+
     "current_database() AS db,"+
     "current_setting('transaction_read_only') AS tx_readonly,"+
     "current_setting('server_version_num') AS pg_version,"+
     "has_table_privilege(current_user,"+
      "'clean.phase5_other_rest_reviewed_call_v39','INSERT') AS review_insert,"+
     "has_table_privilege(current_user,"+
      "'clean.phase5_other_rest_reviewed_call_v39','SELECT') AS review_select,"+
     "has_table_privilege(current_user,"+
      "'clean.phase5_other_rest_reviewed_call_v39','UPDATE') AS review_update,"+
     "has_table_privilege(current_user,"+
      "'clean.phase5_other_rest_reviewed_call_v39','DELETE') AS review_delete,"+
     "has_table_privilege(current_user,"+
      "'clean.phase5_other_rest_physical_reservation_v39','INSERT') AS reserve_insert,"+
     "has_table_privilege(current_user,"+
      "'clean.phase5_other_rest_physical_reservation_v39','SELECT') AS reserve_select,"+
     "has_table_privilege(current_user,"+
      "'clean.phase5_other_rest_physical_reservation_v39','UPDATE') AS reserve_update,"+
     "has_table_privilege(current_user,"+
      "'clean.phase5_other_rest_physical_reservation_v39','DELETE') AS reserve_delete,"+
     "has_function_privilege(current_user,"+
      "'clean.reserve_phase5_other_rest_once_v39(text,text,text,text,text,text)',"+
      "'EXECUTE') AS reserve_execute"
     );
     await client.query("ROLLBACK");
    }finally{client.release();}
    const x=q.rows[0];
    // This is a real low-privilege PostgreSQL session, NOT mocked metadata.
    expect(x.db).toBe("neondb");
    expect(x.actual_login).toBe(entry.login);
    expect(x.effective_role).toBe(entry.noLogin);
    expect(x.review_insert).toBe(entry.group==="review");
    expect(x.reserve_execute).toBe(entry.group==="reserve");
    expect([x.review_select,x.review_update,x.review_delete,
     x.reserve_insert,x.reserve_select,x.reserve_update,
     x.reserve_delete]).toEqual(Array(7).fill(false));
    expect(x.tx_readonly).toBe("on");
    expect(verifyP5V0083RestReadonlyCatalog(x,
     entry.group as "review"|"reserve",entry.login).limitedRESTPrivilegeVerified)
     .toBe(true);
   }finally{await raw.end();}
  }
 });
 it("refuses replay after successful COMMIT and never overwrites both secrets",async()=>{
  await expect(commissionP5V0083TwoRestLoginsOnce(
   db,driver,cfg)).rejects.toThrow("GITHUB_SECRET_PREEXISTS_DO_NOT_OVERWRITE");
  expect(secrets.size).toBe(2);
 });
});
