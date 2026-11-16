/** Disposable real B0062 row lock/expiry tests; in-memory object store ONLY. */
import {describe,it,expect,beforeAll,afterAll} from "vitest";
import {Pool} from "pg";
import {verifyP5RecurringExpiryActor,executeP5RecurringExpiryRuntime,p5RecurringExpiryGrants} from "../scripts/v39_phase5_recurring_blob_expiry_runtime_v39";
import {randomUUID} from "node:crypto";
import {inventoryP5ExpiryActors} from "../scripts/v39_phase5_recurring_expiry_owner_inventory_v39";
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

 it("actual PG16 scoped actor permissions, read-only preflight, due-only apply and durable deletion STOP",async()=>{
  // This test is in the existing sequential expiry suite; no parallel
  // synthetic due rows can race the fixture. Only disposable local roles.
  const writerRole="p5_expiry_ci_writer",readerRole="p5_expiry_ci_reader";
  let writer:Pool|undefined,reader:Pool|undefined;
  try{
   const beforeCatalog=await db.connect();
   try{expect(await inventoryP5ExpiryActors(beforeCatalog,false)).toMatchObject({namedActorsPresent:0,potentialReusableNarrowActors:0,ownerVerified:true});}
   finally{beforeCatalog.release();}
   await db.query("CREATE ROLE "+writerRole+" LOGIN NOINHERIT PASSWORD 'ci_disposable_writer'");
   await db.query("CREATE ROLE "+readerRole+" LOGIN NOINHERIT PASSWORD 'ci_disposable_reader'");
   for(const sql of p5RecurringExpiryGrants(writerRole,"writer"))await db.query(sql);
   for(const sql of p5RecurringExpiryGrants(readerRole,"reader"))await db.query(sql);
   const after=await db.connect();
   try{expect(await inventoryP5ExpiryActors(after,false)).toMatchObject({namedActorsPresent:0,potentialReusableNarrowActors:2,ownerVerified:true});}
   finally{after.release();}
   writer=new Pool({connectionString:URL.replace("postgres:postgres@",writerRole+":ci_disposable_writer@"),max:2});
   reader=new Pool({connectionString:URL.replace("postgres:postgres@",readerRole+":ci_disposable_reader@"),max:1,options:"-c default_transaction_read_only=on"});
   const verifyActor:typeof verifyP5RecurringExpiryActor=async(d,r,a)=>verifyP5RecurringExpiryActor(d,r,a,false);
   await verifyActor(writer,writerRole,"writer");await verifyActor(reader,readerRole,"reader");
   await db.query("GRANT SELECT (source_record_id) ON clean.provider_content_blob_ref TO "+readerRole);
   await expect(verifyActor(reader,readerRole,"reader")).rejects.toThrow("COLUMN_ACL_DRIFT");
   await db.query("REVOKE SELECT (source_record_id) ON clean.provider_content_blob_ref FROM "+readerRole);
   await db.query("GRANT UPDATE (source_record_id) ON clean.provider_content_blob_ref TO "+writerRole);
   await expect(verifyActor(writer,writerRole,"writer")).rejects.toThrow("COLUMN_ACL_DRIFT");
   await db.query("REVOKE UPDATE (source_record_id) ON clean.provider_content_blob_ref FROM "+writerRole);
   await expect(reader.query("UPDATE clean.provider_content_blob_ref SET deletion_run_id='forbidden' WHERE false")).rejects.toThrow();
   const c=await make(),s=makeStore();s.objects.add(c.objectName);
   const conf={writer,reader,writerRole,readerRole,limit:1,verifyActor,stores:{writer:s,reader:s}};
   expect(await executeP5RecurringExpiryRuntime({...conf,apply:false})).toMatchObject({status:"SCOPED_RUNTIME_VERIFY_ONLY_NO_WRITES",objectDeletions:0});
   expect(s.deletes).toBe(0);
   expect(await executeP5RecurringExpiryRuntime({...conf,apply:true})).toMatchObject({status:"DUE_AT_CUTOFF_CLEARED",verifiedNowCount:1,independentlyReadBackCount:1});
   expect(s.deletes).toBe(1);
   // Seed a synthetic active parent WITHOUT authorizing Phase6 in this
   // disposable database. Only fixture insertion bypasses unrelated
   // phase6 admission triggers, using an owner-local transaction. The
   // actual subsequent restricted incident insertion runs all triggers.
   const syntheticBatch="expiry-ci-active-"+randomUUID();
   const fixture=await db.connect();
   try{
    await fixture.query("BEGIN");
    await fixture.query("SET LOCAL session_replication_role='replica'");
    await fixture.query(`INSERT INTO clean.adb_collection_batches(batch_id,batch_seq,random_seed,status,
     window_start,window_end,credit_budget,tier_mix,airports,run_day_index)
     VALUES($1,999991,7,'ACTIVE',now()-interval '1 hour',now()+interval '1 hour',100,'{}'::jsonb,ARRAY['WSSS'],31)`,[syntheticBatch]);
    await fixture.query("COMMIT");
   }catch(e){await fixture.query("ROLLBACK").catch(()=>{});throw e;}finally{fixture.release();}
   const b=await make();s.objects.add(b.objectName);
   const incidentCount=async()=>Number((await db.query("SELECT count(*)::int AS n FROM clean.adb_incident_stop WHERE cause='deletion' AND detail->>'kind'='recurring_provider_blob_expiry_uncertain' AND resolved=false")).rows[0].n);
   const before=await incidentCount();
   await expect(executeP5RecurringExpiryRuntime({...conf,apply:true,stores:{writer:s,reader:{exists:async name=>name===b.objectName||s.exists(name)}}}))
    .rejects.toThrow("BATCH_UNCERTAIN_DELETION_STOP_RECORDED_NO_RETRY");
   expect(await incidentCount()).toBe(before+1);
   expect((await db.query("SELECT count(*)::int AS n FROM clean.adb_ingest_events WHERE batch_id=$1 AND notification_items=0 AND delivery_failure=true AND error='incident-stop:deletion' AND raw_payload IS NULL",[syntheticBatch])).rows[0].n).toBe(1);
   expect(s.deletes).toBe(2);
   // Recover independent proof only, not a second physical delete and
   // never automatically clear the incident.
   expect(await executeP5RecurringExpiryRuntime({...conf,apply:true})).toMatchObject({recoveredReadbackCount:1,verifiedNowCount:0});
   expect(await incidentCount()).toBe(before+1);
   expect(s.deletes).toBe(2);
   // Do not let the ordinary time budget split a delete from its receipt.
   const n1=await make(),n2=await make();
   s.objects.add(n1.objectName);s.objects.add(n2.objectName);
   let ticks=0;
   const partial=await executeP5RecurringExpiryRuntime({...conf,limit:2,apply:true,workStartBudgetMs:100,
    monotonicNow:()=>ticks++<2?0:100});
   expect(partial).toMatchObject({status:"BACKLOG_REMAINS_AT_CUTOFF",selectedCount:2,
    independentlyReadBackCount:1,remainingAtCutoff:1,stoppedAtWorkBoundary:true});
   expect(s.deletes).toBe(3);
   expect(await executeP5RecurringExpiryRuntime({...conf,apply:true})).toMatchObject({status:"DUE_AT_CUTOFF_CLEARED",verifiedNowCount:1});
   expect(s.deletes).toBe(4);
   // Simulate a remote DELETE that completes AFTER the local deadline.
   // No marker can be written from the timed-out invocation.
   const late=await make();s.objects.add(late.objectName);
   let finish:()=>void=()=>{throw Error("DELETE_WAS_NOT_STARTED");};
   let attempted=0;
   const delayed={exists:s.exists,delete:async(name:string)=>{
    attempted++;
    await new Promise<void>(resolve=>{finish=()=>{s.objects.delete(name);resolve();};});
   }};
   await expect(executeP5RecurringExpiryRuntime({...conf,apply:true,operationTimeoutMs:25,
    stores:{writer:delayed,reader:s}})).rejects.toThrow("BATCH_UNCERTAIN_DELETION_STOP_RECORDED_NO_RETRY");
   expect(attempted).toBe(1);expect((await marker(late)).deletion_run_id).toBeNull();
   expect(await s.exists(late.objectName)).toBe(true);expect(await incidentCount()).toBe(before+2);
   finish();
   expect(await s.exists(late.objectName)).toBe(false);
   expect(await executeP5RecurringExpiryRuntime({...conf,apply:true})).toMatchObject({
    status:"DUE_AT_CUTOFF_CLEARED",verifiedNowCount:1,independentlyReadBackCount:1});
   expect(s.deletes).toBe(4);expect(await incidentCount()).toBe(before+2);
  }finally{
   await writer?.end();await reader?.end();
   for(const role of [writerRole,readerRole]){
    await db.query("DROP OWNED BY "+role).catch(()=>{});
    await db.query("DROP ROLE IF EXISTS "+role);
   }
  }
 });

});
