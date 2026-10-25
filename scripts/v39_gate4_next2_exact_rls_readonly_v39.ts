/**
 * NEXT2 existing receiver/owner-writer RLS exact custody -- READ ONLY.
 * A necessary independently reviewed prerequisite before any password-only
 * recovery or actual paid CREATE. Does NOT grant paid permission.
 *
 * Never prints bearer, authorization SHA, DB URL, RLS predicate strings, IDs,
 * original wire, cryptographic salt or role password.
 */
import "dotenv/config";
import pg from "pg";
import {createHash} from "node:crypto";
import {pathToFileURL} from "node:url";
import {ReplitProviderBlobStoreV39} from
 "../server/lib/disruption/replitProviderBlobStore_v39";
import {
 gate4Next2StorageKeyV39,gate4Next2OpenSealedValuesV39,NEXT2_ID
} from "../server/lib/disruption/gate4Next2SealedBootstrap_v39";
import {recoverNext2PredicateV39} from
 "./v39_gate4_next2_lost_private_scope_recovery_v39";
const SRC="087dc948c29d004f88eca141e1fc8e83c2844e3f";
const ONLY_SYNTHETIC=/^g4synthetic_[a-f0-9]{24}$/;
const hold=():never=>{throw Error("GATE4_NEXT2_RLS_READONLY_HOLD");};
const expected=[
 ["gate4_next2_receiver_select_v39",
  "gate4_alert_prebind_original_v39","SELECT","gate4_receiver_2026_next2","qual"],
 ["gate4_next2_receiver_insert_v39",
  "gate4_alert_prebind_original_v39","INSERT","gate4_receiver_2026_next2","with_check"],
 ["gate4_next2_writer_select_v39",
  "gate4_alert_owned_binding_v39","SELECT","gate4_owner_writer_2026_next2","qual"],
 ["gate4_next2_writer_insert_v39",
  "gate4_alert_owned_binding_v39","INSERT","gate4_owner_writer_2026_next2","with_check"]
] as const;
export function strictNext2PolicyAuditV39(
 rows:readonly Record<string,unknown>[],auth:string
):boolean{
 if(rows.length!==expected.length||!/^[a-f0-9]{64}$/.test(auth))
  return false;
 return expected.every(([name,table,cmd,role,clause])=>{
  const found=rows.filter(p=>p.policyname===name);
  if(found.length!==1)return false;
  const p=found[0];
  return p.tablename===table&&p.cmd===cmd&&
   p.role_count===1&&p.assigned_role===role&&
   p.permissive==="PERMISSIVE"&&
   p[clause]!==null&&
   recoverNext2PredicateV39(p[clause],SRC)===auth&&
   p[clause==="qual"?"with_check":"qual"]===null;
 });
}
export async function runNext2RlsAuditReadonlyV39():Promise<void>{
 let stage="ADMISSION",client:pg.Client|undefined,started=false;
 try{
  const bucket=String(process.env.V39_PROVIDER_BLOB_BUCKET_ID??"");
  const owner=String(process.env.V39_PRODUCTION_DATABASE_OWNER_URL??"");
  const conn=new URL(owner);
  if(!bucket.startsWith("replit-objstore-")||
   !["postgres:","postgresql:"].includes(conn.protocol)||
   conn.pathname!=="/neondb"||!conn.password)hold();
  const store=new ReplitProviderBlobStoreV39(bucket);
  const key=gate4Next2StorageKeyV39(SRC);
  if(!await store.exists(key))hold();
  const config=gate4Next2OpenSealedValuesV39(
   await store.downloadBytes(key),SRC,process.env);
  stage="POSTGRES_READONLY";
  client=new pg.Client({connectionString:owner,
   connectionTimeoutMillis:6000,query_timeout:7000,
   statement_timeout:7000,
   options:"-c default_transaction_read_only=on"});
  await client.connect();
  await client.query("BEGIN READ ONLY");started=true;
  const who=(await client.query(
   "SELECT current_database() AS db,"+
   "current_setting('default_transaction_read_only') AS ro"
  )).rows[0];
  if(who?.db!=="neondb"||who?.ro!=="on")hold();
  const p=await client.query(
   "SELECT policyname,tablename,cmd,permissive,"+
   " cardinality(roles) AS role_count,"+
   " roles[1]::text AS assigned_role,qual,with_check"+
   " FROM pg_policies WHERE schemaname='clean' AND"+
   " policyname=ANY($1::name[])",
   [expected.map(x=>x[0])]
  );
  if(!strictNext2PolicyAuditV39(p.rows,
   config.GATE4_PREBIND_AUTH_SHA256))hold();
  const originals=await client.query(
   "SELECT original_wire,original_sha256,source_commit,"+
   " authorization_sha256,airport_icao,"+
   " claimed_provider_subscription_id"+
   " FROM clean.gate4_alert_prebind_original_v39"+
   " WHERE scope_id=$1::uuid",[NEXT2_ID]);
  const binds=await client.query(
   "SELECT count(*)::int AS n FROM"+
   " clean.gate4_alert_owned_binding_v39 WHERE scope_id=$1::uuid",
   [NEXT2_ID]);
  const row=originals.rows[0];
  if(originals.rows.length!==1||binds.rows[0]?.n!==0||
   row?.source_commit!==SRC||
   row.authorization_sha256!==config.GATE4_PREBIND_AUTH_SHA256||
   row.airport_icao!=="WSSS"||
   !ONLY_SYNTHETIC.test(String(row.claimed_provider_subscription_id??""))||
   !Buffer.isBuffer(row.original_wire)||
   createHash("sha256").update(row.original_wire).digest("hex")!==
    row.original_sha256)hold();
  await client.query("ROLLBACK");started=false;
  console.log(JSON.stringify({
   status:"GATE4_NEXT2_EXACT_RLS_READONLY_PASS",
   reviewedSource:true,fullPredicateVerified:true,
   fourScopedPolicies:true,oneSyntheticOriginal:true,
   zeroPaidBindings:true,originalShaVerified:true,
   providerCalls:0,databaseWrites:0,paidAuthorized:false
  }));
 }catch{
  console.log(JSON.stringify({
   status:"GATE4_NEXT2_EXACT_RLS_READONLY_HOLD",failedStage:stage,
   providerCalls:0,databaseWrites:0,paidAuthorized:false
  }));
  process.exitCode=2;
 }finally{
  if(started)await client?.query("ROLLBACK").catch(()=>undefined);
  await client?.end().catch(()=>undefined);
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
 void runNext2RlsAuditReadonlyV39();
