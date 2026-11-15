/** Disposable real B0062 row lock/expiry tests; in-memory object store ONLY. */
import {describe,it,expect,beforeAll,afterAll} from "vitest";
import {Pool} from "pg";
import {randomUUID} from "node:crypto";
import {verifyOneExpiredProviderBlobV39,type ProviderBlobExpiryCandidateV39} from "../server/lib/disruption/providerBlobExpiry_v39";
import {providerBlobObjectNameV39,type ProviderBlobRefV39} from "../server/lib/disruption/providerBlobStore_v39";
const URL="postgresql://postgres:postgres@localhost:5432/neondb?sslmode=disable";
const suite=process.env.V39_P5_DAILY_QA_REAL_PG16==="1"?describe:describe.skip;
const run=()=> "provider-blob-expiry-"+randomUUID();
suite("existing B0062 serialized blob expiry and absence reconciliation",()=>{
 let db:Pool;
 const makeStore=()=>{const objects=new Set<string>();let deletes=0,refuse=false,loseAck=false;return {objects,get deletes(){return deletes;},set refuse(x:boolean){refuse=x;},set loseAck(x:boolean){loseAck=x;},
  exists:async(name:string)=>objects.has(name),delete:async(name:string)=>{deletes++;if(!refuse)objects.delete(name);if(loseAck)throw Error("CI_LOST_STORAGE_ACK");}};};
 beforeAll(async()=>{
  if(process.env.GITHUB_ACTIONS!=="true"||process.env.DATABASE_URL!==URL||
   process.env.V39_PHASE6_PROCESS_ARMED!=="0"||process.env.AERODATABOX_API_KEY)throw Error("NOT_DISPOSABLE_PG16");
  db=new Pool({connectionString:URL,max:4});
 });
 afterAll(async()=>{await db?.end();});
 async function make(future=false):Promise<ProviderBlobExpiryCandidateV39>{
  const blobRefId=randomUUID(),contentClass="live_fids_cache" as const;
  const dbNow=new Date((await db.query("SELECT clock_timestamp() AS at")).rows[0].at).getTime();
  const persistedAtUtc=new Date(dbNow-(future?0:25*3600_000)).toISOString();
  const expiresAtUtc=new Date(Date.parse(persistedAtUtc)+24*3600_000).toISOString();
  const objectName=providerBlobObjectNameV39(contentClass,blobRefId),contentSha256="a".repeat(64);
  const ref:ProviderBlobRefV39={blobRefId,objectName,contentClass,contentSha256,contentBytes:12,persistedAtUtc,expiresAtUtc,retentionHours:24,contractVersion:"provider-blob-contract-v39@1.0.0",storageKind:"replit_app_storage"};
  await db.query("INSERT INTO clean.provider_content_blob_ref(blob_ref_id,object_name,content_class,content_sha256,content_bytes,source_kind,source_record_id,persisted_at_utc,retention_hours,expires_at_utc) VALUES($1,$2,$3,$4,12,'fids','synthetic-ci',$5,24,$6)",[blobRefId,objectName,contentClass,contentSha256,persistedAtUtc,expiresAtUtc]);
  return {blobRefId,objectName,contentClass,contentSha256,expiresAtUtc,ref};
 }
 async function marker(c:ProviderBlobExpiryCandidateV39){return (await db.query("SELECT deletion_run_id, deletion_verified_at_utc>=expires_at_utc AS after_expiry FROM clean.provider_content_blob_ref WHERE blob_ref_id=$1",[c.blobRefId])).rows[0];}
 it("serializes two overlapping workers and performs one delete/immutable marker",async()=>{
  const c=await make(),s=makeStore(),a=run(),b=run();s.objects.add(c.objectName);
  const result=await Promise.all([verifyOneExpiredProviderBlobV39(db,s,c,a),verifyOneExpiredProviderBlobV39(db,s,c,b)]);
  expect(result.sort()).toEqual(["ALREADY_VERIFIED","VERIFIED_NOW"]);
  expect(s.deletes).toBe(1);
  const m=await marker(c);expect([a,b]).toContain(m.deletion_run_id);expect(m.after_expiry).toBe(true);
  expect(await s.exists(c.objectName)).toBe(false);
  s.objects.add(c.objectName);
  await expect(verifyOneExpiredProviderBlobV39(db,s,c,run())).rejects.toThrow("VERIFIED_MARKER_OBJECT_DISAGREES");
  expect(s.deletes).toBe(1);
 });
 it("rejects future expiry and candidate drift before any remote deletion",async()=>{
  const future=await make(true),s=makeStore();s.objects.add(future.objectName);
  await expect(verifyOneExpiredProviderBlobV39(db,s,future,run())).rejects.toThrow("BEFORE_EXPIRY");
  const c=await make();s.objects.add(c.objectName);
  const changed={...c,ref:{...c.ref,contentBytes:999}};
  await expect(verifyOneExpiredProviderBlobV39(db,s,changed,run())).rejects.toThrow("REF_DRIFT");
  expect(s.deletes).toBe(0);expect((await marker(c)).deletion_run_id).toBeNull();
 });
 it("does not tombstone a failed physical delete, then reconciles observed absence after a lost ACK",async()=>{
  const c=await make(),s=makeStore();s.objects.add(c.objectName);s.refuse=true;
  await expect(verifyOneExpiredProviderBlobV39(db,s,c,run())).rejects.toThrow("DELETE_VERIFICATION_FAILED");
  expect((await marker(c)).deletion_run_id).toBeNull();
  s.refuse=false;s.loseAck=true;
  await expect(verifyOneExpiredProviderBlobV39(db,s,c,run())).rejects.toThrow("CI_LOST_STORAGE_ACK");
  expect((await marker(c)).deletion_run_id).toBeNull();expect(await s.exists(c.objectName)).toBe(false);
  const next=run();expect(await verifyOneExpiredProviderBlobV39(db,s,c,next)).toBe("VERIFIED_NOW");
  expect(s.deletes).toBe(2);expect(await marker(c)).toEqual({deletion_run_id:next,after_expiry:true});
 });
});
