/** Disposable real B0062 row lock/expiry tests; in-memory object store ONLY. */
import {describe,it,expect,beforeAll,afterAll} from "vitest";
import {Pool} from "pg";
import {randomUUID} from "node:crypto";
import {verifyOneExpiredProviderBlobV39,runBoundedProviderBlobExpiryBatchV39,type ProviderBlobExpiryCandidateV39} from "../server/lib/disruption/providerBlobExpiry_v39";
import {providerBlobObjectNameV39,type ProviderBlobRefV39} from "../server/lib/disruption/providerBlobStore_v39";
const URL="postgresql://postgres:postgres@localhost:5432/neondb?sslmode=disable";
const suite=process.env.V39_P5_DAILY_QA_REAL_PG16==="1"?describe:describe.skip;
const run=()=> "provider-blob-expiry-"+randomUUID();
suite("existing B0062 serialized blob expiry and absence reconciliation",()=>{
 let db:Pool,readback:Pool;
 const makeStore=()=>{const objects=new Set<string>();let deletes=0,refuse=false,loseAck=false;return {objects,get deletes(){return deletes;},set refuse(x:boolean){refuse=x;},set loseAck(x:boolean){loseAck=x;},
  exists:async(name:string)=>objects.has(name),delete:async(name:string)=>{deletes++;if(!refuse)objects.delete(name);if(loseAck)throw Error("CI_LOST_STORAGE_ACK");}};};
 beforeAll(async()=>{
  if(process.env.GITHUB_ACTIONS!=="true"||process.env.DATABASE_URL!==URL||
   process.env.V39_PHASE6_PROCESS_ARMED!=="0"||process.env.AERODATABOX_API_KEY)throw Error("NOT_DISPOSABLE_PG16");
  db=new Pool({connectionString:URL,max:4});
  readback=new Pool({connectionString:URL,max:2});
 });
 afterAll(async()=>{await db?.end();await readback?.end();});
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
  // Retire the valid synthetic overdue fixture before the later all-due batch.
  await verifyOneExpiredProviderBlobV39(db,s,c,run());
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
 it("services oldest due rows in bounded batches, leaves future rows and independently reads back each commit",async()=>{
  const a=await make(),b=await make(),future=await make(true),s=makeStore();
  for(const c of [a,b,future])s.objects.add(c.objectName);
  await expect(runBoundedProviderBlobExpiryBatchV39(db,s,readback,s,0)).rejects.toThrow("BATCH_LIMIT_INVALID");
  expect(s.deletes).toBe(0);
  const first=await runBoundedProviderBlobExpiryBatchV39(db,s,readback,s,1);
  expect(first).toEqual({status:"BACKLOG_REMAINS_AT_CUTOFF",selectedCount:1,verifiedNowCount:1,
   alreadyVerifiedCount:0,independentlyReadBackCount:1,recoveredReadbackCount:0,remainingAtCutoff:1,remainingUnwitnessedMarkersAtCutoff:0});
  expect(s.deletes).toBe(1);expect(await s.exists(future.objectName)).toBe(true);
  expect([await marker(a),await marker(b)].filter(x=>x.deletion_run_id!==null)).toHaveLength(1);
  const second=await runBoundedProviderBlobExpiryBatchV39(db,s,readback,s,2);
  expect(second).toEqual({status:"DUE_AT_CUTOFF_CLEARED",selectedCount:1,verifiedNowCount:1,
   alreadyVerifiedCount:0,independentlyReadBackCount:1,recoveredReadbackCount:0,remainingAtCutoff:0,remainingUnwitnessedMarkersAtCutoff:0});
  expect(s.deletes).toBe(2);expect(await s.exists(future.objectName)).toBe(true);
  expect(await marker(future)).toMatchObject({deletion_run_id:null});
  expect(await runBoundedProviderBlobExpiryBatchV39(db,s,readback,s,1)).toMatchObject({
   status:"DUE_AT_CUTOFF_CLEARED",selectedCount:0,remainingAtCutoff:0});
  expect(s.deletes).toBe(2);
 });
 it("refuses a contradictory independent primary readback even after marker commit",async()=>{
  const c=await make(),s=makeStore();s.objects.add(c.objectName);
  await expect(runBoundedProviderBlobExpiryBatchV39(db,s,readback,{exists:async()=>true},1))
   .rejects.toThrow("RECURRING_PRIMARY_READBACK_FAILED");
  expect(s.deletes).toBe(1);expect(await s.exists(c.objectName)).toBe(false);
  expect((await marker(c)).deletion_run_id).not.toBeNull();
  const next=await make();s.objects.add(next.objectName);
  // A fresh run cannot hide the first marker behind a zero-pending scan;
  // even with other due work, recover the previous proof first. Do not
  // delete again if the independent reader says the object is present.
  await expect(runBoundedProviderBlobExpiryBatchV39(db,s,readback,{exists:async()=>true},1))
   .rejects.toThrow("RECURRING_PRIMARY_READBACK_FAILED");
  expect(s.deletes).toBe(1);expect(await s.exists(next.objectName)).toBe(true);
  const witness=await runBoundedProviderBlobExpiryBatchV39(db,s,readback,s,1);
  expect(witness).toEqual({status:"BACKLOG_REMAINS_AT_CUTOFF",selectedCount:1,verifiedNowCount:0,
   alreadyVerifiedCount:1,independentlyReadBackCount:1,recoveredReadbackCount:1,
   remainingAtCutoff:1,remainingUnwitnessedMarkersAtCutoff:0});
  expect(s.deletes).toBe(1);
  const proof=(await readback.query("SELECT surface,content_hash,source_table,expiry_run_id,deletion_mode FROM clean.retention_tombstone WHERE record_id=$1",
   ["provider_content_blob_ref:"+c.blobRefId])).rows;
  expect(proof).toEqual([{surface:"object",content_hash:c.contentSha256,
   source_table:"clean.provider_content_blob_ref",expiry_run_id:(await marker(c)).deletion_run_id,
   deletion_mode:"independent-primary-object-absence"}]);
  expect(await runBoundedProviderBlobExpiryBatchV39(db,s,readback,s,1)).toMatchObject({
   status:"DUE_AT_CUTOFF_CLEARED",verifiedNowCount:1,remainingAtCutoff:0,remainingUnwitnessedMarkersAtCutoff:0});
  expect(s.deletes).toBe(2);
 });

 it("recovers an interruption after marker COMMIT, bounded independently witnessed backlog, without new DELETE",async()=>{
  const a=await make(),b=await make(),legacy=await make(),s=makeStore();
  for(const c of [a,b,legacy])s.objects.add(c.objectName);
  const recurring=()=> "provider-blob-expiry-recurring-v39-"+randomUUID();
  await verifyOneExpiredProviderBlobV39(db,s,a,recurring());
  await verifyOneExpiredProviderBlobV39(db,s,b,recurring());
  await verifyOneExpiredProviderBlobV39(db,s,legacy,run());
  expect(s.deletes).toBe(3);
  const one=await runBoundedProviderBlobExpiryBatchV39(db,s,readback,s,1);
  expect(one).toMatchObject({status:"BACKLOG_REMAINS_AT_CUTOFF",selectedCount:1,
   recoveredReadbackCount:1,verifiedNowCount:0,remainingAtCutoff:0,remainingUnwitnessedMarkersAtCutoff:1});
  const two=await runBoundedProviderBlobExpiryBatchV39(db,s,readback,s,1);
  expect(two).toMatchObject({status:"DUE_AT_CUTOFF_CLEARED",selectedCount:1,
   recoveredReadbackCount:1,verifiedNowCount:0,remainingAtCutoff:0,remainingUnwitnessedMarkersAtCutoff:0});
  const old=await readback.query("SELECT 1 FROM clean.retention_tombstone WHERE surface='object' AND record_id=$1",
   ["provider_content_blob_ref:"+legacy.blobRefId]);
  expect(old.rowCount).toBe(0);expect(s.deletes).toBe(3);
  expect(await runBoundedProviderBlobExpiryBatchV39(db,s,readback,s,1)).toMatchObject({
   status:"DUE_AT_CUTOFF_CLEARED",selectedCount:0,remainingUnwitnessedMarkersAtCutoff:0});
 });

});
