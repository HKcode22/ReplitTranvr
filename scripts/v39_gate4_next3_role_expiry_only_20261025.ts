/**
 * NEXT3 2026-10-25: extend existing restricted receiver+writer SQL LOGIN
 * expiry only, 06:20:25 PDT -> 21:00 PDT (2026-10-26 04:00Z).
 * No passwords, RLS policy, grants, schema, row, published config, provider,
 * object store, callback or signer changes.  Scope/auth/source held fixed.
 *
 * --check: read-only owner DB catalog and same-user scope verification.
 * --extend-once: require exact reviewed checkout+typed GO; transactional
 * ALTER ROLE ... VALID UNTIL only for the two preexisting scoped roles.
 * Already-target roles are a read-only verified no-op. Unknown mix = HOLD.
 * Never print owner connection URL, keys or provider IDs.
 */
import "dotenv/config";
import pg from "pg";
import {execFileSync} from "node:child_process";
import {pathToFileURL} from "node:url";
import {
 NEXT3_ID,NEXT3_RECEIVER_ROLE
} from "../server/lib/disruption/gate4Next3SealedBootstrap_v39";

export const NEXT3_EXPIRY_SOURCE_V39="5878b90eed04b2edfe2b226735ff0f02d9be25f3";
export const NEXT3_EXPIRY_WRITER_ROLE_V39="gate4_owner_writer_2026_next3";
export const NEXT3_EXPIRY_OLD_UTC_V39="2026-10-25T13:20:25.382Z";
export const NEXT3_EXPIRY_NEW_UTC_V39="2026-10-26T04:00:00.000Z";
export const NEXT3_EXPIRY_GO_V39="AUTHORIZE_ONLY_NEXT3_TWO_ROLE_VALID_UNTIL_9PM_PDT";
const roles=[NEXT3_RECEIVER_ROLE,NEXT3_EXPIRY_WRITER_ROLE_V39] as const;
const hold=():never=>{throw Error("NEXT3_ROLE_EXPIRY_ONLY_HOLD");};
type RoleRow={rolname:string;rolvaliduntil:Date|string|null;
 rolcanlogin:boolean;rolsuper:boolean;rolbypassrls:boolean;
 rolinherit:boolean;rolcreaterole:boolean;rolcreatedb:boolean;
 rolreplication:boolean};
export function next3RoleExpiryISO(x:Date|string|null):string{
 if(x===null)hold();
 const t=Date.parse(String(x));
 if(!Number.isFinite(t))hold();
 return new Date(t).toISOString();
}
export function next3RoleExpiryStateV39(rows:RoleRow[]):"old"|"new"{
 if(rows.length!==2||new Set(rows.map(x=>x.rolname)).size!==2||
    !roles.every(name=>rows.some(x=>x.rolname===name)))hold();
 if(rows.some(x=>x.rolcanlogin!==true||x.rolsuper!==false||
    x.rolbypassrls!==false||x.rolinherit!==false||
    x.rolcreaterole!==false||x.rolcreatedb!==false||
    x.rolreplication!==false))hold();
 const expiry=rows.map(x=>next3RoleExpiryISO(x.rolvaliduntil));
 if(expiry.every(e=>e===NEXT3_EXPIRY_OLD_UTC_V39))return "old";
 if(expiry.every(e=>e===NEXT3_EXPIRY_NEW_UTC_V39))return "new";
 hold();
}
async function rolesQuery(db:pg.Client):Promise<RoleRow[]>{
 const result=await db.query(
  "SELECT rolname,rolvaliduntil,rolcanlogin,rolsuper,"+
  "rolbypassrls,rolinherit,rolcreaterole,rolcreatedb,"+
  "rolreplication FROM pg_roles WHERE rolname=ANY($1::text[])",
  [[...roles]]
 );
 return result.rows as RoleRow[];
}
async function audit(db:pg.Client):Promise<{
 state:"old"|"new";originals:number;owned:number
}>{
 const state=next3RoleExpiryStateV39(await rolesQuery(db));
 const policies=(await db.query(
  "SELECT policyname,roles,cmd FROM pg_policies "+
  "WHERE schemaname='clean' AND policyname=ANY($1::text[])",
  [[
   "gate4_next3_receiver_select_v39",
   "gate4_next3_receiver_insert_v39",
   "gate4_next3_writer_select_v39",
   "gate4_next3_writer_insert_v39"
  ]]
 )).rows;
 if(policies.length!==4||
    !policies.every(x=>x.roles.length===1))hold();
 const counts=(await db.query(
  "SELECT "+
  "(SELECT count(*)::int FROM clean.gate4_alert_prebind_original_v39 "+
  " WHERE scope_id=$1::uuid) AS originals,"+
  "(SELECT count(*)::int FROM clean.gate4_alert_owned_binding_v39 "+
  " WHERE scope_id=$1::uuid) AS owned",
  [NEXT3_ID]
 )).rows[0];
 if(!counts||counts.originals<1||counts.owned!==0)hold();
 return {state,originals:counts.originals,owned:counts.owned};
}
export async function next3EffectiveWriterExpiryV39(url:string):Promise<string>{
 let parsed:URL;try{parsed=new URL(url);}catch{return hold();}
 if(!["postgres:","postgresql:"].includes(parsed.protocol)||
    decodeURIComponent(parsed.username)!==NEXT3_EXPIRY_WRITER_ROLE_V39||
    !parsed.password||parsed.pathname!=="/neondb"||
    parsed.searchParams.get("sslmode")!=="verify-full")hold();
 const db=new pg.Client({connectionString:url,
  connectionTimeoutMillis:6000,query_timeout:7000,
  options:"-c default_transaction_read_only=on"});
 try{
  await db.connect();
  const r=(await db.query(
   "SELECT current_user AS actor, "+
   "current_setting('transaction_read_only') AS readonly, "+
   "(SELECT rolvaliduntil FROM pg_roles WHERE rolname=current_user) AS expiry"
  )).rows[0];
  if(r?.actor!==NEXT3_EXPIRY_WRITER_ROLE_V39||r.readonly!=="on")hold();
  const iso=next3RoleExpiryISO(r.expiry);
  if(![NEXT3_EXPIRY_OLD_UTC_V39,NEXT3_EXPIRY_NEW_UTC_V39].includes(iso)||
     Date.parse(iso)<Date.now()+45*60000)hold();
  return iso;
 }finally{await db.end().catch(()=>{});}
}
async function run():Promise<void>{
 let stage="ADMISSION",changed=false;
 let db:pg.Client|undefined,tx=false;
 try{
  const mode=process.argv[2];
  if(process.argv.length!==3||
     !["--check","--extend-once"].includes(mode))hold();
  if(mode==="--extend-once"){
   const pin=String(process.env.GATE4_NEXT3_EXPIRY_REVIEWED_HEAD??"");
   if(!/^[a-f0-9]{40}$/.test(pin)||
      process.env.GATE4_NEXT3_EXPIRY_GO!==NEXT3_EXPIRY_GO||
      execFileSync("git",["rev-parse","HEAD"],{
       encoding:"utf8",stdio:["ignore","pipe","ignore"]
      }).trim()!==pin)hold();
  }
  const ownerUrl=String(process.env.V39_PRODUCTION_DATABASE_OWNER_URL??"");
  const runtimeUrl=String(process.env.V39_DATABASE_RUNTIME_URL??"");
  let owner:URL,runtime:URL;
  try{owner=new URL(ownerUrl);runtime=new URL(runtimeUrl);}
  catch{hold();}
  const endpoint=(x:URL)=>x.hostname.replace("-pooler.",".")+":"+
   (x.port||"5432")+x.pathname;
  if(!["postgres:","postgresql:"].includes(owner!.protocol)||
     !owner!.password||runtime!.pathname!=="/neondb"||
     owner!.pathname!=="/neondb"||
     endpoint(owner!)!==endpoint(runtime!)||
     owner!.username===runtime!.username)hold();
  db=new pg.Client({connectionString:ownerUrl,
   connectionTimeoutMillis:6000,query_timeout:10000,
   application_name:"next3_expiry_only_20261025"});
  await db.connect();
  stage="BEGIN_CATALOG_ADMISSION";
  await db.query(mode==="--check"?"BEGIN READ ONLY":
   "BEGIN ISOLATION LEVEL SERIALIZABLE");
  tx=true;
  if(mode==="--extend-once"){
   await db.query("SET LOCAL lock_timeout='2500ms'");
   await db.query("SET LOCAL statement_timeout='8000ms'");
  }
  const ident=(await db.query(
   "SELECT current_database() AS db,current_user AS actor,"+
   "(SELECT rolcreaterole FROM pg_roles WHERE rolname=current_user) AS admin"
  )).rows[0];
  if(ident?.db!=="neondb"||ident.actor!==
     decodeURIComponent(owner!.username)||ident.admin!==true)hold();
  const before=await audit(db);
  if(mode==="--extend-once"&&before.state==="old"){
   stage="ALTER_BOTH_EXPIRIES_TRANSACTION";
   await db.query("ALTER ROLE gate4_receiver_2026_next3 "+
    "VALID UNTIL '2026-10-26 04:00:00+00'");
   await db.query("ALTER ROLE gate4_owner_writer_2026_next3 "+
    "VALID UNTIL '2026-10-26 04:00:00+00'");
   const after=await audit(db);
   if(after.state!=="new"||
      before.originals!==after.originals||
      before.owned!==after.owned)hold();
   changed=true;
  }
  stage="COMMIT_OR_ROLLBACK";
  await db.query(mode==="--check"?"ROLLBACK":"COMMIT");tx=false;
  await db.query("BEGIN READ ONLY");tx=true;
  const verified=await audit(db);
  await db.query("ROLLBACK");tx=false;
  if(mode==="--extend-once"&&verified.state!=="new")hold();
  console.log(JSON.stringify({
   status:mode==="--check"?"NEXT3_ROLE_EXPIRY_READONLY_PASS":
    "NEXT3_ROLE_EXPIRY_9PM_VERIFIED",
   oldExpiryUtc:NEXT3_EXPIRY_OLD_UTC_V39,
   verifiedExpiryUtc:verified.state==="new"?
    NEXT3_EXPIRY_NEW_UTC_V39:NEXT3_EXPIRY_OLD_UTC_V39,
   sqlRolesChanged:changed?2:0,
   rolePasswordChanges:0,policyChanges:0,
   originalRowsPreserved:verified.originals,
   ownedBindings:verified.owned,
   providerCalls:0,appStorageWrites:0,
   publishedReceiverUnchanged:true,stopArmed:false,
   paidCreateAuthorized:false
  }));
 }catch{
  if(tx)await db?.query("ROLLBACK").catch(()=>{});
  console.log(JSON.stringify({
   status:"NEXT3_ROLE_EXPIRY_ONLY_HOLD",stage,
   anySqlAlterAttempted:changed,
   noProviderCalls:true,noAutomaticPaidTrial:true
  }));
  process.exitCode=2;
 }finally{await db?.end().catch(()=>{});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
 void run();
