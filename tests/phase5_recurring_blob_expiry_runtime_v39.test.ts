import {describe,it,expect} from "vitest";
import {createHash} from "node:crypto";
import {admitP5ExpiryOwnerInventory,ownerInventoryIdentityFailures,ownerInventoryClientTls} from "../scripts/v39_phase5_recurring_expiry_owner_inventory_v39";
import {admitP5RecurringExpiryRuntime,executeP5RecurringExpiryRuntime,boundP5RecurringExpiryStorage} from "../scripts/v39_phase5_recurring_blob_expiry_runtime_v39";
const sha="a".repeat(40),base={
 P5_RECURRING_EXPIRY_APPROVED_MAIN_SHA:sha,ADB_AUTO_COLLECT:"0",V39_PROVIDER_BLOB_MODE:"required",
 V39_PROVIDER_BLOB_BUCKET_ID:"replit-objstore-synthetic",P5_RECURRING_EXPIRY_EXPECTED_BUCKET_ID:"replit-objstore-synthetic",
 P5_RECURRING_EXPIRY_EXPECTED_DB_ENDPOINT_SHA256:createHash("sha256").update("same.invalid/neondb").digest("hex"),
 P5_RECURRING_EXPIRY_WRITER_ROLE:"expiry_writer",P5_RECURRING_EXPIRY_READER_ROLE:"expiry_reader",
 P5_RECURRING_EXPIRY_WRITER_URL:"postgresql://expiry_writer:fictional@same.invalid/neondb?sslmode=require",
 P5_RECURRING_EXPIRY_READER_URL:"postgresql://expiry_reader:fictional@same.invalid/neondb?sslmode=require"
};
describe("fixed recurring Replit expiry runtime admission",()=>{
 it("defaults to verification, refuses broad, wrong, unencrypted, cross-endpoint or same actor URLs",()=>{
  expect(admitP5RecurringExpiryRuntime(base,sha)).toMatchObject({apply:false,limit:10});
  for(const patch of [{DATABASE_URL:"owner"},{V39_DATABASE_RUNTIME_URL:"owner"},{AERODATABOX_API_KEY:"forbidden"},
    {GITHUB_ACTIONS:"true"},{P5_RECURRING_EXPIRY_READER_ROLE:"expiry_writer"},
    {P5_RECURRING_EXPIRY_READER_ROLE:"phase5_retention_reader_prod20261114"},
    {P5_RECURRING_EXPIRY_READER_URL:base.P5_RECURRING_EXPIRY_READER_URL.replace("same.invalid","other.invalid")},
    {P5_RECURRING_EXPIRY_WRITER_URL:base.P5_RECURRING_EXPIRY_WRITER_URL.replace("require","disable")},
    {P5_RECURRING_EXPIRY_WRITER_URL:base.P5_RECURRING_EXPIRY_WRITER_URL.replace("same.invalid","same-pooler.invalid")},
    {P5_RECURRING_EXPIRY_EXPECTED_DB_ENDPOINT_SHA256:"c".repeat(64)},
    {P5_RECURRING_EXPIRY_MODE:"APPLY_DUE_ONLY"},{P5_RECURRING_EXPIRY_LIMIT:"26"},
    {P5_RECURRING_EXPIRY_EXPECTED_BUCKET_ID:"replit-objstore-different"}])
   expect(()=>admitP5RecurringExpiryRuntime({...base,...patch},sha)).toThrow("HOLD_P5_RECURRING_EXPIRY_");
  expect(admitP5RecurringExpiryRuntime({...base,P5_RECURRING_EXPIRY_MODE:"APPLY_DUE_ONLY",
   P5_RECURRING_EXPIRY_APPROVAL:"APPLY_BOUNDED_DECLARED_EXPIRY_ONLY_NO_PROVIDER"},sha)).toMatchObject({apply:true});
 });
 it("verification never uses DELETE/query or implies independent IAM or backup proof",async()=>{
  const calls:string[]=[];
  const forbidden=async()=>{throw Error("FORBIDDEN");};
  const writer={query:forbidden,connect:forbidden} as any,reader={query:forbidden,connect:forbidden} as any;
  const result=await executeP5RecurringExpiryRuntime({writer,reader,writerRole:"expiry_writer",readerRole:"expiry_reader",limit:10,apply:false,
   verifyActor:async(_db,role)=>{calls.push(role);},stores:{writer:{exists:async()=>{calls.push("writer.exists");return false;},delete:forbidden},
   reader:{exists:async()=>{calls.push("reader.exists");return false;}}}});
  expect(calls).toEqual(["expiry_writer","expiry_reader","writer.exists","reader.exists"]);
  expect(result).toMatchObject({status:"SCOPED_RUNTIME_VERIFY_ONLY_NO_WRITES",databaseWrites:0,objectDeletions:0,independentStorageIamVerified:false,backupRetentionVerified:false});
 });
 it("a timed-out SDK call poisons both adapters without pretending to cancel the remote operation",async()=>{
  let attempted=0;
  let finish:(v:boolean)=>void=()=>{};
  const guarded=boundP5RecurringExpiryStorage({writer:{exists:async()=>{attempted++;return new Promise<boolean>(r=>{finish=r;});},
   delete:async()=>{attempted++;}},reader:{exists:async()=>{attempted++;return false;}}},10);
  await expect(guarded.writer.exists("synthetic")).rejects.toThrow("STORAGE_OUTCOME_UNKNOWN_NO_RETRY");
  await expect(guarded.writer.delete("synthetic")).rejects.toThrow("STORAGE_INVOCATION_POISONED");
  await expect(guarded.reader.exists("synthetic")).rejects.toThrow("STORAGE_INVOCATION_POISONED");
  finish(true);
  expect(attempted).toBe(1);
 });
 it("refuses nonboolean presence rather than falsely certifying absence",async()=>{
  const guarded=boundP5RecurringExpiryStorage({writer:{exists:async()=>undefined as any,delete:async()=>{}},
   reader:{exists:async()=>false}});
  await expect(guarded.writer.exists("synthetic")).rejects.toThrow("STORAGE_PRESENCE_UNKNOWN");
  await expect(guarded.reader.exists("synthetic")).rejects.toThrow("STORAGE_INVOCATION_POISONED");
 });
 it("a readback ACL failure prevents any storage request",async()=>{
  const forbidden=async()=>{throw Error("FORBIDDEN_STORAGE_OR_SQL");};
  const writer={query:forbidden,connect:forbidden} as any,reader={query:forbidden,connect:forbidden} as any;
  await expect(executeP5RecurringExpiryRuntime({writer,reader,writerRole:"expiry_writer",readerRole:"expiry_reader",limit:10,apply:true,
   verifyActor:async(_db,_role,actor)=>{if(actor==="reader")throw Error("READER_ACL");},stores:{writer:{exists:forbidden,delete:forbidden},reader:{exists:forbidden}}})).rejects.toThrow("READER_ACL");
 });
});

describe("existing owner inventory admission",()=>{
 const ownerEnv={P5_RECURRING_EXPIRY_APPROVED_MAIN_SHA:sha,ADB_AUTO_COLLECT:"0",V39_PHASE6_PROCESS_ARMED:"0",
  V39_PHASE6_OWNER_APPROVED:"0",DATABASE_URL:"postgresql://neondb_owner:synthetic@ep-test-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require",
  V39_PROVIDER_BLOB_MODE:"required",V39_PROVIDER_BLOB_BUCKET_ID:"replit-objstore-synthetic"};
 it("inventories an existing pooler but refuses cross-endpoint or non-STOP state",()=>{
  expect(admitP5ExpiryOwnerInventory(ownerEnv,sha,sha).directEndpointAvailable).toBe(false);
  for(const patch of [{P5_RECURRING_EXPIRY_DIRECT_OWNER_URL:ownerEnv.DATABASE_URL.replace("ep-test-pooler","ep-other")},
   {P5_RECURRING_EXPIRY_DIRECT_OWNER_URL:ownerEnv.DATABASE_URL},
   {AERODATABOX_API_KEY:"forbidden"},{V39_PHASE6_PROCESS_ARMED:"1"}])
   expect(()=>admitP5ExpiryOwnerInventory({...ownerEnv,...patch},sha,sha)).toThrow("HOLD_P5_EXPIRY_OWNER_INVENTORY_");
  const direct=ownerEnv.DATABASE_URL.replace("-pooler","");
  expect(admitP5ExpiryOwnerInventory({...ownerEnv,P5_RECURRING_EXPIRY_DIRECT_OWNER_URL:direct},sha,sha).directEndpointAvailable).toBe(true);
 });
});

describe("Neon owner read-only actual transport vs backend TLS metadata",()=>{
 const who={db:"neondb",actor:"neondb_owner",login:"neondb_owner",ver:160010,replica:false,ro:"on",rolcreaterole:true,rolsuper:false,tls:false};
 it("requires actual client certificate verification even if backend says TLS is enabled",()=>{
  expect(ownerInventoryIdentityFailures(who,true,true)).toEqual([]);
  expect(ownerInventoryIdentityFailures({...who,tls:true},true,false)).toEqual(["CLIENT_TLS"]);
  expect(ownerInventoryIdentityFailures(who,true,false)).toEqual(["CLIENT_TLS"]);
  expect(ownerInventoryIdentityFailures({...who,tls:null},true,true)).toEqual(["BACKEND_TLS_METADATA"]);
  expect(ownerInventoryClientTls({connection:{stream:{encrypted:true,authorized:true}}} as any,"ep-test.neon.tech")).toBe(false);
 });
 it("does not relax any production actor, privilege, version or read-only requirement",()=>{
  expect(ownerInventoryIdentityFailures({...who,actor:"other",login:"other",rolsuper:true,rolcreaterole:false,ver:150000,ro:"off",replica:true},true,true))
   .toEqual(["PG16","PRIMARY","READ_ONLY","CREATEROLE","OWNER","NON_SUPERUSER"]);
 });
 it("normalizes only the session-local sslmode to verify-full",()=>{
  const env={P5_RECURRING_EXPIRY_APPROVED_MAIN_SHA:sha,ADB_AUTO_COLLECT:"0",V39_PHASE6_PROCESS_ARMED:"0",
   V39_PHASE6_OWNER_APPROVED:"0",DATABASE_URL:"postgresql://neondb_owner:synthetic@ep-test-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require",
   V39_PROVIDER_BLOB_MODE:"required",V39_PROVIDER_BLOB_BUCKET_ID:"replit-objstore-synthetic"};
  const cfg=admitP5ExpiryOwnerInventory(env,sha,sha);
  expect(new URL(cfg.url).searchParams.get("sslmode")).toBe("verify-full");
  expect(env.DATABASE_URL).toContain("sslmode=require");
  expect(cfg.directEndpointAvailable).toBe(false);
 });
});
