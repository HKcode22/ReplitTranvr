import {describe,it,expect} from "vitest";
import {
 admitP5TwoStageIndependentReadOnly,
 verifyP5StageRoleCatalog,verifyP5StageTableAcl,
 verifyP5TwoStageOneLiveSession,
 P5_TWO_STAGE_ROLES,P5_TWO_STAGE_TABLES
} from "../scripts/v39_phase5_two_stage_logins_independent_live_readonly_once.mjs";

const sha="a".repeat(40);
const url=(login:string)=>
 "postgresql://"+login+":synthetic_secret_password@fake.neon.tech/neondb?sslmode=require";
const env:Record<string,string>={
 GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
 GITHUB_EVENT_NAME:"workflow_dispatch",GITHUB_REF:"refs/heads/main",
 GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:sha,
 P5_TWO_STAGE_READONLY_APPROVED_MAIN_SHA:sha,
 P5_TWO_STAGE_READONLY_CONFIRM:
  "VERIFY_ONLY_TWO_B0062_V0093_STAGE_LOGIN_SECRETS_READONLY_NO_GO",
 P5_TWO_STAGE_READONLY_EXECUTE:"1",
 ADB_AUTO_COLLECT:"0",V39_PHASE6_PROCESS_ARMED:"0",
 V39_PHASE6_OWNER_APPROVED:"0",
 AERODATABOX_API_KEY:"",RAPIDAPI_KEY:"",
 AERODATABOX_WEBHOOK_SECRET:"",DATABASE_URL:"",
 V39_DATABASE_RUNTIME_URL:"",
 P5_V39_B0062_PRELAUNCH_STAGE_DATABASE_URL:url(P5_TWO_STAGE_ROLES[0].role),
 P5_V39_V0093_COST_ONLY_BUDGET_DATABASE_URL:url(P5_TWO_STAGE_ROLES[1].role)
};
function identity(role:string){
 return {
  db:"neondb",actor:role,session_actor:role,ro:"on",
  pg_version:160009,replica:false,rolcanlogin:true,rolinherit:false,
  rolsuper:false,rolcreaterole:false,rolcreatedb:false,
  rolreplication:false,rolbypassrls:false,
  schema_usage:true,schema_create:false,db_create:false
 };
}
function tableRows(spec:any){
 return P5_TWO_STAGE_TABLES.map(table_name=>({
  table_name,sel:spec.read.includes(table_name),
  ins:spec.insert.includes(table_name),
  upd:false,del:false,trunc:false,ref:false,trigger:false
 }));
}
describe("independent B0062/V0093 actual-login read-only audit",()=>{
 it("is manual, exact-main, two specific PG credentials, no paid or owner DB",()=>{
  const a=admitP5TwoStageIndependentReadOnly(env);
  expect(a.map(x=>x.spec.role)).toEqual(
   P5_TWO_STAGE_ROLES.map(x=>x.role));
  for(const key of [
   "GITHUB_SHA","P5_TWO_STAGE_READONLY_APPROVED_MAIN_SHA",
   "P5_TWO_STAGE_READONLY_CONFIRM","P5_TWO_STAGE_READONLY_EXECUTE",
   "V39_PHASE6_PROCESS_ARMED","DATABASE_URL","AERODATABOX_API_KEY",
   "P5_PRELAUNCH_TWO_LOGIN_APPROVAL"
  ]){
   const bad={
    ...env,[key]:key==="V39_PHASE6_PROCESS_ARMED"?"1":
      key==="DATABASE_URL"?"postgresql://admin:secret@example/neondb":
      key==="AERODATABOX_API_KEY"?"not_allowed":"incorrect"
   };
   expect(()=>admitP5TwoStageIndependentReadOnly(bad))
    .toThrow("NOT_EXACT_MAIN_MANUAL_ZERO_PAID_READONLY_CONFIRMATION");
  }
  expect(()=>admitP5TwoStageIndependentReadOnly({
   ...env,P5_V39_B0062_PRELAUNCH_STAGE_DATABASE_URL:url("neondb_owner")
  })).toThrow("SECRET_ROLE_OR_DB_DOES_NOT_MATCH_COMMISSIONER");
  expect(()=>admitP5TwoStageIndependentReadOnly({
   ...env,P5_V39_V0093_COST_ONLY_BUDGET_DATABASE_URL:""
  })).toThrow("NEW_GITHUB_ACTIONS_SECRET_MISSING");
  expect(()=>admitP5TwoStageIndependentReadOnly({
   ...env,P5_V39_V0093_COST_ONLY_BUDGET_DATABASE_URL:
    "postgresql://"+P5_TWO_STAGE_ROLES[1].role+
    ":password@different.neon.tech/neondb"
  })).toThrow("B0062_V0093_NOT_SAME_NEON_DATABASE");
 });
 it("checks both exact independent login identities and no superuser escalation",()=>{
  for(const s of P5_TWO_STAGE_ROLES){
   expect(verifyP5StageRoleCatalog(identity(s.role),s)).toBe(true);
   for(const patch of [
    {ro:"off"},{actor:"neondb_owner"},{session_actor:"neondb_owner"},
    {rolsuper:true},{rolinherit:true},{rolcreaterole:true},
    {schema_create:true},{db_create:true},{replica:true},
    {pg_version:150000}
   ])
    expect(()=>verifyP5StageRoleCatalog(
     {...identity(s.role),...patch},s
    )).toThrow("IDENTITY_READONLY_OR_ROLE_FLAGS_NOT_VERIFIED");
  }
 });
 it("exact SELECT/INSERT allowlist, denies all other privileges per table",()=>{
  for(const s of P5_TWO_STAGE_ROLES){
   const a=tableRows(s);
   expect(verifyP5StageTableAcl(a,s)).toBe(true);
   const bad=[...a];bad[0]={...bad[0],upd:true};
   expect(()=>verifyP5StageTableAcl(bad,s))
    .toThrow("TABLE_PRIVILEGE_NOT_EXACT_OR_UNEXPECTED");
   const missing=a.slice(1);
   expect(()=>verifyP5StageTableAcl(missing,s))
    .toThrow("TABLE_CATALOG_CARDINALITY_OR_DUPLICATE");
   const stale=[...a];
   stale[0]={...stale[0],sel:!stale[0].sel};
   expect(()=>verifyP5StageTableAcl(stale,s))
    .toThrow("TABLE_PRIVILEGE_NOT_EXACT_OR_UNEXPECTED");
  }
 });
 it("executes only catalog/ACL SQL inside READ ONLY transaction",async()=>{
  for(const spec of P5_TWO_STAGE_ROLES){
   const history:string[]=[];
   let released=false;
   const pool:any={
    connect:async()=>({
     query:async(query:string,args?:unknown[])=>{
      history.push(query);
      if(query.startsWith("BEGIN")||query.startsWith("SET LOCAL")||
         query==="ROLLBACK")return {rows:[]};
      if(query.includes("current_database() db"))return{
       rows:[identity(spec.role)]
      };
      if(query.includes("FROM unnest($1::text[])"))return{
       rows:tableRows(spec)
      };
      if(query.includes("pg_catalog.pg_auth_members"))return{
       rows:[{n:0}]
      };
      if(query.includes("pg_catalog.pg_proc"))return{
       rows:[{n:0}]
      };
      throw Error("UNEXPECTED_SQL");
     },
     release:()=>{released=true;}
    })
   };
   const out=await verifyP5TwoStageOneLiveSession(pool,spec);
   expect(out.verifiedIndependentSession).toBe(true);
   expect(out.dbWrites).toBe(0);
   expect(history[0]).toContain("READ ONLY");
   expect(history.at(-1)).toBe("ROLLBACK");
   expect(released).toBe(true);
   // CREATE/UPDATE/INSERT here occur only as quoted privilege names in
   // SELECT catalog expressions. Validate top-level SQL statement verbs.
   expect(history.every(q=>
    /^(BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY$|SET LOCAL |SELECT |ROLLBACK$)/.
     test(q))).toBe(true);
  }
 });
 it("HOLD if any inherited SECURITY DEFINER execute path is exposed",async()=>{
  const spec=P5_TWO_STAGE_ROLES[0];
  const pool:any={connect:async()=>({
   query:async(q:string)=>{
    if(q.includes("current_database() db"))return{
     rows:[identity(spec.role)]};
    if(q.includes("FROM unnest($1::text[])"))return{
     rows:tableRows(spec)};
    if(q.includes("pg_catalog.pg_auth_members"))return{
     rows:[{n:0}]};
    if(q.includes("pg_catalog.pg_proc"))return{rows:[{n:1}]};
    return {rows:[]};
   },
   release:()=>{}
  })};
  await expect(verifyP5TwoStageOneLiveSession(pool,spec))
   .rejects.toThrow("UNREVIEWED_EXECUTABLE_SECURITY_DEFINER_FUNCTION");
 });
});
