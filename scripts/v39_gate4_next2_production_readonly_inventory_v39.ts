/**
 * Gate4 NEXT2: actual production Neon catalog + original-byte SHA READ ONLY.
 * Never creates roles, writes SQL, calls AeroDataBox or schedules workflows.
 * Validated facts must precede a newly sealed NEXT2 commissioning release.
 * Prints only fixed booleans, counts, and classification status, never credentials,
 * original bytes, subscription IDs, secrets, SHA-bearing policy predicates.
 */
import "dotenv/config";
import pg from "pg";
import {createHash} from "node:crypto";
import {pathToFileURL} from "node:url";

export const NEXT2_SCOPE="16f819c6-7c68-4d5a-82cf-3820e9294dc7";
export const NEXT2_RECEIVER="gate4_receiver_2026_next2";
export const NEXT2_WRITER="gate4_owner_writer_2026_next2";
export const FROZEN_RECEIVER_SOURCE="29d3e0dff8b8863f55f6d73e609e21480b8e46db";
export const HISTORICAL_SCOPE="498dccd7-5da3-4687-a6ea-e0dc03b54398";
export const SPENT_NEXT1_SCOPE="d6c0fcac-798e-4913-bfd1-a561adb3dd82";

const receiverPolicies=[
 "gate4_legacy_receiver_select_v39","gate4_legacy_receiver_insert_v39",
 "gate4_next_receiver_select_v39","gate4_next_receiver_insert_v39"
].sort();
const writerPolicies=[
 "gate4_safety_select_v39",
 "gate4_next_writer_select_v39","gate4_next_writer_insert_v39"
].sort();

export type Gate4Next2CatalogSummaryV39=Readonly<{
  correctDbOwner:boolean;transactionReadOnly:boolean;
  rawRls:boolean;ownerRls:boolean;
  rawRows:number;oldOriginals:number;next1Originals:number;otherOriginals:number;
  ownedRows:number;oldOwned:number;next1Owned:number;otherOwned:number;
  allOriginalShaVerified:boolean;
  receiverPoliciesExact:boolean;writerPoliciesExact:boolean;
  legacyReceiverRolesScoped:boolean;priorWriterRoleObserved:boolean;
  next2RolesAbsent:boolean;
}>;
export function classifyGate4Next2CatalogV39(x:Gate4Next2CatalogSummaryV39):
 "NEXT2_READONLY_CATALOG_READY_FOR_NEW_NO_PROVIDER_COMMISSION"|
 "NEXT2_READONLY_CATALOG_HOLD" {
 return x.correctDbOwner&&x.transactionReadOnly&&x.rawRls&&x.ownerRls&&
   x.rawRows===1&&x.oldOriginals===1&&x.next1Originals===0&&
   x.otherOriginals===0&&
   x.ownedRows===2&&x.oldOwned===1&&x.next1Owned===1&&
   x.otherOwned===0&&x.allOriginalShaVerified&&
   x.receiverPoliciesExact&&x.writerPoliciesExact&&
   x.legacyReceiverRolesScoped&&x.priorWriterRoleObserved&&
   x.next2RolesAbsent
   ?"NEXT2_READONLY_CATALOG_READY_FOR_NEW_NO_PROVIDER_COMMISSION"
   :"NEXT2_READONLY_CATALOG_HOLD";
}
function dbNamesSame(a:URL,b:URL):boolean{
 return a.hostname.replace("-pooler.",".")+":"+(a.port||"5432")+a.pathname===
  b.hostname.replace("-pooler.",".")+":"+(b.port||"5432")+b.pathname;
}
function integer(x:unknown):number{
 return typeof x==="number"&&Number.isSafeInteger(x)&&x>=0?x:-1;
}
export async function inspectGate4Next2ProductionV39():Promise<void>{
 let client:pg.Client|undefined,stage="APPROVED_READONLY_SOURCE";
 try{
  if(process.env.GATE4_NEXT2_READONLY_CONFIRM!==
     "INSPECT_GATE4_EXISTING_PRODUCTION_NO_PROVIDER")throw Error("READONLY_CONFIRM_MISSING");
  const owner=String(process.env.V39_PRODUCTION_DATABASE_OWNER_URL??"");
  const runtime=String(process.env.V39_DATABASE_RUNTIME_URL??"");
  let o:URL,r:URL;
  try{o=new URL(owner);r=new URL(runtime);}catch{throw Error("DATABASE_URL_MISSING");}
  if(!["postgres:","postgresql:"].includes(o.protocol)||
     !["postgres:","postgresql:"].includes(r.protocol)||
     !o.password||!r.password||o.pathname!=="/neondb"||
     !dbNamesSame(o,r)||decodeURIComponent(o.username)===decodeURIComponent(r.username))
    throw Error("DATABASE_TARGET_ISOLATION");
  stage="CONNECT_READONLY";
  client=new pg.Client({connectionString:owner,
   connectionTimeoutMillis:6000,query_timeout:7000,
   statement_timeout:7000,application_name:"gate4_next2_catalog_readonly",
   options:"-c default_transaction_read_only=on"});
  await client.connect();
  await client.query("BEGIN TRANSACTION READ ONLY");
  await client.query("SET LOCAL statement_timeout='6000ms'");
  stage="CATALOG_READBACK";
  const who=(await client.query(
   "SELECT current_database() AS db,current_user AS actor,"+
   "current_setting('transaction_read_only') AS ro,"+
   "(SELECT rolsuper FROM pg_roles WHERE rolname=current_user) AS superuser,"+
   "(SELECT rolcreaterole FROM pg_roles WHERE rolname=current_user) AS role_admin,"+
   "has_schema_privilege(current_user,'clean','CREATE') AS schema_ddl"
  )).rows[0];
  const correctDbOwner=who?.db==="neondb"&&
   who?.actor===decodeURIComponent(o.username)&&
   who.superuser===false&&who.role_admin===true&&who.schema_ddl===true;
  const rows=(await client.query(
   "SELECT 'original' AS origin,scope_id::text AS scope_id,"+
   "original_wire AS wire,original_sha256 AS sha FROM "+
   "clean.gate4_alert_prebind_original_v39"
  )).rows;
  const ownerCounts=(await client.query(
   "SELECT scope_id::text AS scope,count(*)::int AS n "+
   "FROM clean.gate4_alert_owned_binding_v39 GROUP BY scope_id"
  )).rows;
  const meta=(await client.query(
   "SELECT c.relname AS name,c.relrowsecurity AS rls "+
   "FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace "+
   "WHERE n.nspname='clean' AND c.relname = ANY($1::text[])",
   [["gate4_alert_prebind_original_v39","gate4_alert_owned_binding_v39"]]
  )).rows;
  const policies=(await client.query(
   "SELECT tablename,policyname,cmd,roles,permissive "+
   "FROM pg_policies WHERE schemaname='clean' AND "+
   "tablename = ANY($1::text[])",
   [["gate4_alert_prebind_original_v39","gate4_alert_owned_binding_v39"]]
  )).rows;
  const roleNames=[
   "gate4_receiver_20261022","gate4_receiver_2026_next1",
   "gate4_owner_writer_20261023","gate4_owner_writer_2026_next1",
   "gate4_safety_reader_20261022",
   NEXT2_RECEIVER,NEXT2_WRITER
  ];
  const roles=(await client.query(
   "SELECT rolname,rolcanlogin,rolsuper,rolbypassrls,rolcreaterole,rolcreatedb "+
   "FROM pg_roles WHERE rolname=ANY($1::text[])",[roleNames]
  )).rows;
  const assigned=(n:string)=>roles.find(x=>x.rolname===n);
  const safeReceiver=(n:string)=>{
   const x=assigned(n);
   return !!x&&x.rolsuper===false&&x.rolbypassrls===false&&
    x.rolcreaterole===false&&x.rolcreatedb===false;
  };
  const exact=(table:string,expected:string[])=>
   JSON.stringify(policies.filter(x=>x.tablename===table)
    .map(x=>x.policyname).sort())===JSON.stringify(expected)&&
   policies.filter(x=>x.tablename===table).every(x=>
    x.permissive==="PERMISSIVE"&&x.roles.length===1);
  const count=(scope:string,data:readonly {scope:string}[])=>
   data.filter(x=>x.scope===scope).length;
  const validRows=rows.every(x=>
   Buffer.isBuffer(x.wire)&&typeof x.sha==="string"&&
   createHash("sha256").update(x.wire).digest("hex")===x.sha);
  const oldO=rows.filter(x=>x.scope_id===HISTORICAL_SCOPE).length;
  const nextO=rows.filter(x=>x.scope_id===SPENT_NEXT1_SCOPE).length;
  const oldB=ownerCounts.find(x=>x.scope===HISTORICAL_SCOPE)?.n??0;
  const nextB=ownerCounts.find(x=>x.scope===SPENT_NEXT1_SCOPE)?.n??0;
  const ownedN=ownerCounts.reduce((n,x)=>n+integer(x.n),0);
  const summary:Gate4Next2CatalogSummaryV39={
   correctDbOwner,transactionReadOnly:who?.ro==="on",
   rawRls:meta.find(x=>x.name==="gate4_alert_prebind_original_v39")?.rls===true,
   ownerRls:meta.find(x=>x.name==="gate4_alert_owned_binding_v39")?.rls===true,
   rawRows:rows.length,oldOriginals:oldO,next1Originals:nextO,
   otherOriginals:rows.length-oldO-nextO,
   ownedRows:ownedN,oldOwned:oldB,next1Owned:nextB,
   otherOwned:ownedN-oldB-nextB,
   allOriginalShaVerified:validRows,
   receiverPoliciesExact:exact("gate4_alert_prebind_original_v39",receiverPolicies),
   writerPoliciesExact:exact("gate4_alert_owned_binding_v39",writerPolicies),
   legacyReceiverRolesScoped:safeReceiver("gate4_receiver_20261022")&&
    safeReceiver("gate4_receiver_2026_next1")&&
    safeReceiver("gate4_safety_reader_20261022"),
   priorWriterRoleObserved:
    !!assigned("gate4_owner_writer_20261023")&&
    !!assigned("gate4_owner_writer_2026_next1"),
   next2RolesAbsent:!assigned(NEXT2_RECEIVER)&&!assigned(NEXT2_WRITER)
  };
  await client.query("ROLLBACK");
  console.log(JSON.stringify({
   status:classifyGate4Next2CatalogV39(summary),
   proposedNewScope:NEXT2_SCOPE,proposedPublishedReceiver:FROZEN_RECEIVER_SOURCE,
   ...summary,providerRequests:0,providerCreates:0,
   databaseWrites:0,replitDeploys:0
  },null,2));
 }catch{
  await client?.query("ROLLBACK").catch(()=>{});
  console.log(JSON.stringify({
   status:"NEXT2_READONLY_CATALOG_HOLD",failedStage:stage,
   providerRequests:0,databaseWrites:0
  }));
  process.exitCode=2;
 }finally{await client?.end().catch(()=>{});}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.length!==3||process.argv[2]!=="--read-only"){
  console.log("NEXT2_READONLY_CATALOG_HOLD");
  process.exitCode=2;
 }else void inspectGate4Next2ProductionV39();
}
