import {describe,it,expect,vi} from "vitest";
import {createHash} from "node:crypto";
import express from "express";
import type {AddressInfo} from "node:net";
import {P5_EXPIRY_RECEIVER_PATH,admitP5ExpiryReceiver,createP5ExpiryReceiverHandler} from "../server/lib/disruption/phase5ExpiryReceiverTransport_v39";
import {executeP5RecurringExpiryRuntime} from "../server/lib/disruption/phase5RecurringExpiryRuntime_v39";
const sha="a".repeat(40),token="b".repeat(64),hash=(s:string)=>createHash("sha256").update(s).digest("hex");
const base={
 P5_RECURRING_EXPIRY_HTTP_ENABLED:"1",V39_DEPLOYED_GIT_HEAD:sha,V39_CALLBACK_ONLY_RUNTIME:"1",
 V39_WORKSPACE_RUNTIME_OWNER_MODE:"replit-published-deployment",ADB_AUTO_COLLECT:"false",
 P5_RECURRING_EXPIRY_HTTP_AUTH_SHA256:hash(token),P5_RECURRING_EXPIRY_APPROVED_MAIN_SHA:sha,
 P5_RECURRING_EXPIRY_MODE:"VERIFY_ONLY",V39_PROVIDER_BLOB_MODE:"required",
 V39_PROVIDER_BLOB_BUCKET_ID:"replit-objstore-synthetic",P5_RECURRING_EXPIRY_EXPECTED_BUCKET_ID:"replit-objstore-synthetic",
 P5_RECURRING_EXPIRY_EXPECTED_DB_ENDPOINT_SHA256:hash("same.invalid/neondb"),
 P5_RECURRING_EXPIRY_WRITER_ROLE:"phase5_recurring_expiry_writer_prod",
 P5_RECURRING_EXPIRY_READER_ROLE:"phase5_recurring_expiry_reader_prod",
 P5_RECURRING_EXPIRY_WRITER_URL:"postgresql://phase5_recurring_expiry_writer_prod:fictional@same.invalid/neondb?sslmode=require",
 P5_RECURRING_EXPIRY_READER_URL:"postgresql://phase5_recurring_expiry_reader_prod:fictional@same.invalid/neondb?sslmode=require",
 DATABASE_URL:"synthetic-owner-not-projected",V39_DATABASE_RUNTIME_URL:"synthetic-broad-not-projected",
 AERODATABOX_WEBHOOK_SECRET:"synthetic-webhook-not-projected"
};
const proof={status:"SCOPED_RUNTIME_VERIFY_ONLY_NO_WRITES",providerCalls:0,objectDownloads:0,distinctDbActorsVerified:true,
 separateStorageReadRequests:true,independentStorageIamVerified:false,backupRetentionVerified:false,phase6PaidGo:false,
 databaseWrites:0,objectDeletions:0};
const headers={authorization:"Bearer "+token,"x-p5-expiry-reviewed-sha":sha,"x-p5-expiry-mode":"VERIFY_ONLY"};
async function withServer(run:Parameters<typeof createP5ExpiryReceiverHandler>[1],fn:(url:string)=>Promise<void>,env:NodeJS.ProcessEnv=base){
 const app=express(),handler=createP5ExpiryReceiverHandler(env,run);
 if(!handler)throw Error("test handler absent");
 app.post(P5_EXPIRY_RECEIVER_PATH,handler);
 const server=app.listen(0,"127.0.0.1");
 try{
  await new Promise<void>((resolve,reject)=>{if(server.listening)resolve();else{server.once("listening",resolve);server.once("error",reject);}});
  await fn("http://127.0.0.1:"+(server.address() as AddressInfo).port+P5_EXPIRY_RECEIVER_PATH);
 }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
}
describe("opt-in published expiry transport",()=>{
 it("defaults off, binds source and scoped actors, and cannot use request/ambient owner credentials",()=>{
  expect(admitP5ExpiryReceiver({...base,P5_RECURRING_EXPIRY_HTTP_ENABLED:"0"})).toBeNull();
  const cfg=admitP5ExpiryReceiver(base);
  expect(cfg?.scope.apply).toBe(false);
  expect(JSON.stringify(cfg)).not.toContain("not-projected");
  for(const patch of [{V39_DEPLOYED_GIT_HEAD:"c".repeat(40)},{ADB_AUTO_COLLECT:"true"},
    {V39_WORKSPACE_RUNTIME_OWNER_MODE:"replit-managed-project"},{NODE_TLS_REJECT_UNAUTHORIZED:"0"},
    {P5_RECURRING_EXPIRY_MODE:"APPLY_DUE_ONLY"},{P5_RECURRING_EXPIRY_HTTP_AUTH_SHA256:"bad"},
    {P5_RECURRING_EXPIRY_WRITER_ROLE:"other_actor"}])
   expect(()=>admitP5ExpiryReceiver({...base,...patch})).toThrow();
  expect(admitP5ExpiryReceiver({...base,P5_RECURRING_EXPIRY_MODE:"APPLY_DUE_ONLY",P5_RECURRING_EXPIRY_APPROVAL:"APPLY_BOUNDED_DECLARED_EXPIRY_ONLY_NO_PROVIDER"})?.scope.apply).toBe(true);
 });
 it("real HTTP: rejects missing/wrong token, source, mode, query and body before calling worker",async()=>{
  const run=vi.fn(async()=>({...proof,extra:"must-not-leak"}));
  await withServer(run,async url=>{
   for(const h of [{...headers,authorization:"Bearer "+"f".repeat(64)},{...headers,authorization:""}]){
    expect((await fetch(url,{method:"POST",headers:h})).status).toBe(404);
   }
   for(const h of [{...headers,"x-p5-expiry-reviewed-sha":"c".repeat(40)},{...headers,"x-p5-expiry-mode":"APPLY_DUE_ONLY"}]){
    expect((await fetch(url,{method:"POST",headers:h})).status).toBe(400);
   }
   expect((await fetch(url+"?key=anything",{method:"POST",headers})).status).toBe(400);
   expect((await fetch(url,{method:"POST",headers,body:"{}"})).status).toBe(400);
   expect(run).not.toHaveBeenCalled();
   const response=await fetch(url,{method:"POST",headers});
   expect(response.status).toBe(200);expect(response.headers.get("cache-control")).toBe("no-store");
   expect(await response.json()).toEqual({...proof,reviewedSourceSha:sha,mode:"VERIFY_ONLY"});
   expect(run).toHaveBeenCalledTimes(1);
  });
 });
 it("does not expose raw errors or accept a false success receipt",async()=>{
  const run=vi.fn(async()=>{throw Error("fictional secret not for response");});
  await withServer(run,async url=>{
   const res=await fetch(url,{method:"POST",headers});
   expect(res.status).toBe(503);expect(await res.json()).toEqual({status:"EXPIRY_RECEIVER_OUTCOME_UNKNOWN_NO_RETRY"});
  });
  await withServer(async()=>({...proof,providerCalls:1}),async url=>{
   expect((await fetch(url,{method:"POST",headers})).status).toBe(503);
  });
 });
 it("fixed apply mode returns only checked aggregate counts and explicitly reports bounded backlog",async()=>{
  const env={...base,P5_RECURRING_EXPIRY_MODE:"APPLY_DUE_ONLY",P5_RECURRING_EXPIRY_APPROVAL:"APPLY_BOUNDED_DECLARED_EXPIRY_ONLY_NO_PROVIDER"};
  const h={...headers,"x-p5-expiry-mode":"APPLY_DUE_ONLY"};
  const counts={selectedCount:2,verifiedNowCount:1,alreadyVerifiedCount:0,independentlyReadBackCount:1,
   recoveredReadbackCount:0,remainingAtCutoff:1,remainingUnwitnessedMarkersAtCutoff:0};
  const result={...proof,status:"BACKLOG_REMAINS_AT_CUTOFF",declaredExpiryOnly:true,...counts,internalObjectName:"fictional-sensitive"};
  await withServer(async()=>result,async url=>{
   expect((await fetch(url,{method:"POST",headers})).status).toBe(400);
   const response=await fetch(url,{method:"POST",headers:h});
   expect(response.status).toBe(200);
   const body=await response.json();
   expect(body).toMatchObject({status:"BACKLOG_REMAINS_AT_CUTOFF",mode:"APPLY_DUE_ONLY",...counts});
   expect(body).not.toHaveProperty("internalObjectName");
  },env);
  await withServer(async()=>({...result,status:"DUE_AT_CUTOFF_CLEARED"}),async url=>{
   expect((await fetch(url,{method:"POST",headers:h})).status).toBe(503);
  },env);
 });
 it("does not begin a second worker while a request is in progress",async()=>{
  let complete:()=>void=()=>{},entered:()=>void=()=>{};
  const started=new Promise<void>(resolve=>{entered=resolve;});
  const run=vi.fn(async()=>{entered();await new Promise<void>(resolve=>{complete=resolve;});return proof;});
  await withServer(run,async url=>{
   const first=fetch(url,{method:"POST",headers});
   await started;
   try{
    const second=await fetch(url,{method:"POST",headers});
    expect(second.status).toBe(409);
    expect(await second.json()).toEqual({status:"EXPIRY_RECEIVER_BUSY_NO_NEW_WORK"});
    expect(run).toHaveBeenCalledTimes(1);
   }finally{complete();await first;}
  });
 });
 it("under the real worker's advisory-lock path, unattended apply stops before mutations at unresolved deletion incident",async()=>{
  const forbidden=vi.fn(async()=>{throw Error("MUTATION_FORBIDDEN");});
  const lock={query:vi.fn(async(sql:string)=>({rows:[{owned:sql.includes("try_advisory_lock")}]})),release:vi.fn()};
  const writer={connect:async()=>lock,query:forbidden} as any;
  const reader={connect:forbidden,query:vi.fn(async()=>({rows:[{blocked:true}]}))} as any;
  await expect(executeP5RecurringExpiryRuntime({writer,reader,apply:true,automatic:true,limit:2,
   writerRole:"expiry_writer",readerRole:"expiry_reader",verifyActor:async()=>{},
   stores:{writer:{exists:async()=>false,delete:forbidden},reader:{exists:async()=>false}}})).rejects.toThrow("AUTOMATIC_DELETION_STOP_UNRESOLVED");
  expect(lock.query).toHaveBeenCalledTimes(2);expect(lock.release).toHaveBeenCalled();
  expect(reader.query).toHaveBeenCalledTimes(1);expect(forbidden).not.toHaveBeenCalled();
 });
});
