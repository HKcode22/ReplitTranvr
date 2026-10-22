import {describe,it,expect,vi} from "vitest";
import {createHash} from "node:crypto";
import {createServer} from "node:http";
import type {Express} from "express";
import {
  quarantineGate4PrebindOriginalV39,
  type Gate4PrebindOriginalStoreV39
} from "../server/lib/disruption/gate4PrebindIngress_v39";
import {
  createGate4AlertReceiverCandidateV39,
  gate4AlertReceiverLaunchReviewV39
} from "../server/gate4AlertReceiverOnly";

const scope={
 scopeId:"11111111-2222-3333-4444-555555555555",
 authorizationSha256:"b".repeat(64),
 sourceCommit:"a".repeat(40),
 airportIcao:"WSSS"
};
const secret="mock-trial-secret-"+ "s".repeat(45);
const wire=Buffer.from(JSON.stringify({
 subscription:{id:"earlyId99",
   subject:{type:"FlightByAirportIcao",id:"WSSS"}},
 flights:[]
}));
const sha=(x:Buffer)=>createHash("sha256").update(x).digest("hex");
function durable():Gate4PrebindOriginalStoreV39{
 const saved=new Map<string,Buffer>();
 return {
   async writeOriginal(o){
     const prior=saved.get(o.originalSha256);
     if(prior && !prior.equals(o.originalBytes))
       throw Error("HASH_COLLISION_OR_FOREIGN_ORIGINAL");
     saved.set(o.originalSha256,Buffer.from(o.originalBytes));
     return {scopeId:o.scopeId,originalSha256:o.originalSha256,
       committed:true,originalBytesVerified:true};
   },
   async readBackOriginal(original){
     const current=saved.get(original.originalSha256);
     const ok=!!current&&sha(current)===original.originalSha256 &&
       current.equals(original.originalBytes);
     return {scopeId:original.scopeId,
       originalSha256:original.originalSha256,
       committed:ok,originalBytesVerified:ok};
   }
 };
}

describe("Gate4 pre-CREATE original-byte quarantine — mocks, no provider",()=>{
 it("stores exact original bytes and ACKs only after commit + readback",async()=>{
   const store=durable();
   const write=vi.spyOn(store,"writeOriginal");
   const read=vi.spyOn(store,"readBackOriginal");
   const out=await quarantineGate4PrebindOriginalV39(scope,wire,store);
   expect(out).toMatchObject({
     httpStatus:200,status:"QUARANTINED_DURABLY_PENDING_ID_BINDING",
     attributedToOwnedSubscription:false,sourceOwnerConfirmed:false,
     paidAuthorization:false,providerRequests:0
   });
   expect(write).toHaveBeenCalledTimes(1);
   const original=write.mock.calls[0][0];
   expect(read).toHaveBeenCalledExactlyOnceWith(original);
   expect(original.originalBytes.equals(wire)).toBe(true);
   expect(original.claimedSubscriptionId).toBe("earlyId99");
   expect(JSON.stringify(out)).not.toContain("earlyId99");
 });
 it("does not upgrade first claimed ID to provider ownership",async()=>{
   const out=await quarantineGate4PrebindOriginalV39(scope,wire,durable());
   expect(out.attributedToOwnedSubscription).toBe(false);
   expect(out.sourceOwnerConfirmed).toBe(false);
 });
 it("holds when commit response is missing even if store accepted bytes",async()=>{
   const store=durable();
   const out=await quarantineGate4PrebindOriginalV39(scope,wire,{
     ...store,
     writeOriginal:async o=>{
       await store.writeOriginal(o);
       throw Error("COMMIT_ACK_LOST");
     }
   });
   expect(out).toMatchObject({httpStatus:503,responseAcknowledged:false});
 });
 it("holds when post-COMMIT independent readback mismatches",async()=>{
   const store=durable();
   const out=await quarantineGate4PrebindOriginalV39(scope,wire,{
     ...store,
     readBackOriginal:async original=>({
       scopeId:original.scopeId,
       originalSha256:original.originalSha256,
       committed:true,originalBytesVerified:false
     })
   });
   expect(out).toMatchObject({httpStatus:503,responseAcknowledged:false});
 });
 it("rejects foreign ICAO, malformed subscription and missing JSON",async()=>{
   const store=durable();
   const write=vi.spyOn(store,"writeOriginal");
   for(const body of [
     Buffer.from("not json"),
     Buffer.from("[]"),
     Buffer.from(JSON.stringify({flights:[]})),
     Buffer.from(JSON.stringify({
       subscription:{id:"earlyId99",
         subject:{type:"FlightByAirportIcao",id:"KLAX"}},flights:[]
     })),
     Buffer.from(JSON.stringify({
       subscription:{id:44,
         subject:{type:"FlightByAirportIcao",id:"WSSS"}},flights:[]
     }))
   ]){
     const out=await quarantineGate4PrebindOriginalV39(scope,body,store);
     expect(out.httpStatus).not.toBe(200);
   }
   expect(write).not.toHaveBeenCalled();
 });
 it("rejects missing or too-large source without writing",async()=>{
   const store=durable(),spy=vi.spyOn(store,"writeOriginal");
   expect((await quarantineGate4PrebindOriginalV39(
     scope,Buffer.alloc(2*1024*1024+1),store)).httpStatus).toBe(400);
   expect((await quarantineGate4PrebindOriginalV39(
     scope,Buffer.alloc(0),store)).httpStatus).toBe(400);
   expect(spy).not.toHaveBeenCalled();
 });
 it("launch cannot claim prebind if provider ID already configured",()=>{
   const env={
     V39_GATE4_ALERT_RECEIVER_ONLY:"1",
     V39_CALLBACK_ONLY_RUNTIME:"1",
     ADB_AUTO_COLLECT:"false",
     V39_GATE4_ALERT_RECEIVER_RELEASE_REVIEW:
       "EXPLICIT_STAGED_GATE4_ALERT_ONLY",
     V39_DATABASE_RUNTIME_URL:"postgresql://fake.invalid/mock",
     AERODATABOX_WEBHOOK_SECRET:secret,
     V39_DEPLOYED_GIT_HEAD:scope.sourceCommit,
     V39_GATE4_APPROVED_SOURCE_COMMIT:scope.sourceCommit,
     V39_GATE4_SCOPE_ID:scope.scopeId,
     V39_GATE4_AUTH_SHA256:scope.authorizationSha256,
     V39_GATE4_AIRPORT_ICAO:"WSSS",
     V39_GATE4_ALERT_PREBIND_MODE:"1"
   };
   expect(gate4AlertReceiverLaunchReviewV39(env))
     .toMatchObject(scope);
   expect(()=>gate4AlertReceiverLaunchReviewV39({
     ...env,V39_GATE4_OWNED_SUBSCRIPTION_ID:"earlyId99"
   })).toThrow("GATE4_PREBIND_CANNOT_ASSUME_ID");
 });
 it("prebind receiver ACK only after injected durable store, not generic handler",async()=>{
   const handler=vi.fn();
   const app=createGate4AlertReceiverCandidateV39(
     scope,secret,(a:Express)=>a.post(
       "/api/v1/webhooks/aerodatabox/:secret",
       (_req,res)=>{handler();res.status(200).json({from:"generic"});}
     ),durable()
   );
   const server=createServer(app);
   await new Promise<void>(r=>server.listen(0,"127.0.0.1",r));
   const addr=server.address();
   if(!addr||typeof addr==="string")throw Error("BAD_PORT");
   try{
     const response=await fetch("http://127.0.0.1:"+addr.port+
       "/api/v1/webhooks/aerodatabox/"+secret,{
         method:"POST",headers:{"content-type":"application/json"},
         body:wire
       });
     expect(response.status).toBe(200);
     expect(await response.json()).toMatchObject({
       received:true,attribution:"none",
       status:"QUARANTINED_DURABLY_PENDING_ID_BINDING"
     });
     expect(handler).not.toHaveBeenCalled();
   }finally{await new Promise<void>(r=>server.close(()=>r()));}
 });
 it("prebind receiver returns non-2xx if durable storage is unavailable",async()=>{
   const store:Gate4PrebindOriginalStoreV39={
     writeOriginal:async()=>{throw Error("DB offline");},
     readBackOriginal:async()=>{throw Error("DB offline");}
   };
   const handler=vi.fn();
   const app=createGate4AlertReceiverCandidateV39(
     scope,secret,(a:Express)=>a.post(
       "/api/v1/webhooks/aerodatabox/:secret",
       (_req,res)=>{handler();res.sendStatus(200);}
     ),store
   );
   const server=createServer(app);
   await new Promise<void>(r=>server.listen(0,"127.0.0.1",r));
   const addr=server.address();
   if(!addr||typeof addr==="string")throw Error("BAD_PORT");
   try{
     const res=await fetch("http://127.0.0.1:"+addr.port+
       "/api/v1/webhooks/aerodatabox/"+secret,{
         method:"POST",headers:{"content-type":"application/json"},
         body:wire
       });
     expect(res.status).toBe(503);
     expect(handler).not.toHaveBeenCalled();
   }finally{await new Promise<void>(r=>server.close(()=>r()));}
 });
});
