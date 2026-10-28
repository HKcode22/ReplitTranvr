/**
 * Disposable PostgreSQL 16: staged future Gate05 LOGGED custody journal.
 * This test MUST NEVER touch production. Both migrations are transactionally
 * applied and rolled back, without provider calls or real callback bytes.
 */
import {randomUUID} from "node:crypto";
import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
import pg from "pg";

const url=process.env.DATABASE_URL??"";
let local=false;
try{
 const u=new URL(url);
 local=["localhost","127.0.0.1"].includes(u.hostname)&&
   u.pathname==="/v39_ci"&&process.env.GITHUB_ACTIONS==="true"&&
   !process.env.AERODATABOX_API_KEY;
}catch{}
const v74="migrations/staged/V0074__gate05_science_prepaid_owner_v39.sql";
const v75="migrations/staged/V0075__gate05_logged_delivery_custody_v39.sql";
const DELIVERY="ppd_"+"a".repeat(64);
const HASH="b".repeat(64);
(local?describe:describe.skip)("Gate05 durable LOGGED raw callback custody (staged, rollback only)",()=>{
 it("survives erased UNLOGGED item history, rejects foreign refs and is immutable",async()=>{
  const db=new pg.Client({connectionString:url,connectionTimeoutMillis:10000});
  await db.connect();
  try{
   await db.query("BEGIN");
   await db.query(readFileSync(v74,"utf8"));
   await db.query(readFileSync(v75,"utf8"));
   const scope=randomUUID(),blob=randomUUID(),foreign=randomUUID();
   const head="c".repeat(40),auth="d".repeat(64),ticket="e".repeat(64);
   await db.query(
    "INSERT INTO clean.phase3_gate05_science_owner_v39 "+
    "(session_id,source_commit,authorization_sha256,reviewed_stop_ticket_sha256,"+
    "start_at_utc,stop_at_utc,session_expires_at_utc)"+
    " VALUES($1,$2,$3,$4,now()+interval '2 hours',"+
    "now()+interval '3 hours',now()+interval '3 hours 20 minutes')",
    [scope,head,auth,ticket]);
   const objectName=(id:string)=>
     "v39/provider/raw_provider_content/"+id.slice(0,2)+"/"+id+".blob";
   const addRef=async(id:string,src:string)=>db.query(
    "INSERT INTO clean.provider_content_blob_ref "+
    "(blob_ref_id,storage_kind,contract_version,object_name,content_class,"+
    "content_sha256,content_bytes,source_kind,source_record_id,"+
    "persisted_at_utc,retention_hours,expires_at_utc)"+
    " VALUES($1,'replit_app_storage','provider-blob-contract-v39@1.0.0',"+
    "$2,'raw_provider_content',$3,10,'webhook',$4,"+
    "now()-interval '1 minute',168,now()-interval '1 minute'+interval '168 hours')",
    [id,objectName(id),HASH,src]);
   await addRef(blob,"prepaid:"+scope+":"+DELIVERY);
   await addRef(foreign,"prepaid:"+randomUUID()+":"+DELIVERY);
   const insert="INSERT INTO clean.gate05_science_delivery_custody_v39"+
    " (session_id,delivery_id,blob_ref_id,body_sha256,item_count,"+
    " receiver_attempt_at_utc,blob_persisted_at_utc)"+
    " VALUES($1,$2,$3,$4,$5,now()-interval '2 seconds',"+
    "now()-interval '1 minute')";
   const reject=async(label:string,args:any[])=>{
    await db.query("SAVEPOINT "+label);
    await expect(db.query(insert,args)).rejects.toThrow();
    await db.query("ROLLBACK TO SAVEPOINT "+label);
   };
   await reject("wrongref",[scope,DELIVERY,foreign,HASH,2]);
   await reject("wronghash",[scope,DELIVERY,blob,"f".repeat(64),2]);
   await db.query(insert,[scope,DELIVERY,blob,HASH,2]);
   const row=await db.query(
     "SELECT item_count,body_sha256,receiver_attempt_at_utc,"+
     "http_2xx_delivery_verified FROM clean.gate05_science_delivery_custody_v39"+
     " WHERE session_id=$1",[scope]);
   expect(row.rows).toHaveLength(1);
   expect(row.rows[0].item_count).toBe(2);
   expect(row.rows[0].body_sha256).toBe(HASH);
   expect(row.rows[0].http_2xx_delivery_verified).toBe(false);
   const persistence=await db.query(
    "SELECT relname,relpersistence FROM pg_class WHERE oid IN "+
    "('clean.gate05_science_delivery_custody_v39'::regclass,"+
    "'clean.prepaid_probe_item_runtime'::regclass)");
   expect(Object.fromEntries(persistence.rows.map(x=>[x.relname,x.relpersistence])))
     .toMatchObject({gate05_science_delivery_custody_v39:"p",
       prepaid_probe_item_runtime:"u"});
   await db.query("SAVEPOINT immutability");
   await expect(db.query(
     "UPDATE clean.gate05_science_delivery_custody_v39 SET item_count=99 "+
     "WHERE session_id=$1",[scope])).rejects.toThrow("GATE05_CUSTODY_IMMUTABLE");
   await db.query("ROLLBACK TO SAVEPOINT immutability");
   await db.query("SAVEPOINT duplicate");
   await expect(db.query(insert,[scope,DELIVERY,blob,HASH,2])).rejects.toThrow();
   await db.query("ROLLBACK TO SAVEPOINT duplicate");
  }finally{
   await db.query("ROLLBACK").catch(()=>undefined);
   await db.end();
  }
 });
 it("receiver writes journal in same transaction only behind opt-in future switch",()=>{
  const src=readFileSync("server/lib/disruption/prepaidProbeRuntime_v39.ts","utf8");
  const insert=src.indexOf("INSERT INTO clean.gate05_science_delivery_custody_v39");
  const unlogged=src.indexOf("INSERT INTO clean.prepaid_probe_delivery_runtime",insert);
  const commit=src.indexOf('client.query("COMMIT")',unlogged);
  expect(src).toContain("V39_GATE05_DURABLE_CUSTODY_REQUIRED");
  expect(src).toContain('=== "1"');
  expect(src).toContain('"phase3_gate05_science"');
  expect(insert).toBeGreaterThan(0);
  expect(unlogged).toBeGreaterThan(insert);
  expect(commit).toBeGreaterThan(unlogged);
  expect(src).toContain("blob.persistedAtUtc");
  expect(src).not.toContain("http_2xx_delivery_verified,true");
 });
});
