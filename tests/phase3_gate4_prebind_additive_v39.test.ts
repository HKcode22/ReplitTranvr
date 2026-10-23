import {describe,it,expect,vi} from "vitest";
import express from "express";
import {createServer} from "node:http";
import type {Pool} from "pg";
import {createHash} from "node:crypto";
import {
 gate4PrebindAdditiveConfigV39,gate4PrebindAlertPathV39,
 gate4CheckAdditivePgRoleV39,mountGate4PrebindAdditiveRouteV39
} from "../server/lib/disruption/gate4PrebindAdditiveRoute_v39";
import {
 assessGate4AlertRouteReadinessV39
} from "../server/lib/disruption/gate4AlertRouteReadiness_v39";
import type {Gate4PrebindOriginalStoreV39} from
 "../server/lib/disruption/gate4PrebindIngress_v39";

const scope={scopeId:"11111111-2222-3333-4444-555555555555",
 sourceCommit:"a".repeat(40),
 authorizationSha256:"b".repeat(64),airportIcao:"WSSS"};
const secret="unit-route-only-secret-"+"z".repeat(36);
const bytes=Buffer.from(JSON.stringify({
 subscription:{id:"subscriptionTest999",
   subject:{type:"FlightByAirportIcao",id:"WSSS"}},
 flights:[]
}));
const digest=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const enabled={
 V39_GATE4_PREBIND_ADD_ON_PREPAID:"1",
 V39_DEPLOYED_GIT_HEAD:scope.sourceCommit,
 GATE4_PREBIND_APPROVED_SOURCE_COMMIT:scope.sourceCommit,
 GATE4_PREBIND_RELEASE_REVIEW:"EXPLICIT_NO_PROVIDER_RECEIVER",
 GATE4_PREBIND_SCOPE_ID:scope.scopeId,
 GATE4_PREBIND_AUTH_SHA256:scope.authorizationSha256,
 GATE4_PREBIND_AIRPORT_ICAO:"WSSS",
 GATE4_PREBIND_WEBHOOK_SECRET:secret,
 GATE4_PREBIND_DATABASE_URL:
  "postgresql://gate4_receiver_unit01:fake@mock.neon.tech/neondb?sslmode=verify-full",
 GATE4_PREBIND_APPROVED_DB_HOST:"mock.neon.tech",
 ADB_AUTO_COLLECT:"false"
};
const good=():Gate4PrebindOriginalStoreV39=>{
 const m=new Map<string,Buffer>();
 return {
  writeOriginal:vi.fn(async o=>{
    m.set(o.originalSha256,Buffer.from(o.originalBytes));
    return {scopeId:o.scopeId,originalSha256:o.originalSha256,
     committed:true,originalBytesVerified:true};
  }),
  readBackOriginal:vi.fn(async o=>{
    const ok=m.get(o.originalSha256)?.equals(o.originalBytes)===true;
    return {scopeId:o.scopeId,originalSha256:o.originalSha256,
     committed:ok,originalBytesVerified:ok};
  })
 };
};
async function httpTest(store:Gate4PrebindOriginalStoreV39,
 fn:(base:string)=>Promise<void>){
 const app=express();
 const old=/^\/api\/v1\/webhooks\/aerodatabox\/[^/]+\/prepaid\/[^/]+$/;
 app.use((req,res,next)=>{
   if(req.method==="POST"&&
      (old.test(req.path)||gate4PrebindAlertPathV39(req.path)))return next();
   res.sendStatus(404);
 });
 mountGate4PrebindAdditiveRouteV39(app,scope,secret,store);
 app.post("/api/v1/webhooks/aerodatabox/:secret/prepaid/:id",
   (_req,res)=>res.status(200).json({route:"existing_prepaid_kept"}));
 const server=createServer(app);
 await new Promise<void>((resolve,reject)=>{
   server.once("error",reject);
   server.listen(0,"127.0.0.1",()=>resolve());
 });
 const addr=server.address();
 if(!addr||typeof addr==="string")throw Error("BAD_TEST_PORT");
 try{await fn("http://127.0.0.1:"+addr.port);}
 finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
}
describe("Gate4 additive prebind on existing prepaid runtime, no provider",()=>{
 it("off by default, no assumption that old host exposes an Alert route",()=>{
   expect(gate4PrebindAdditiveConfigV39({})).toBeNull();
   expect(gate4PrebindAlertPathV39(
    "/api/v1/webhooks/aerodatabox/x/prepaid/session")).toBe(false);
   expect(gate4PrebindAlertPathV39(
    "/api/v1/webhooks/aerodatabox/secret")).toBe(true);
 });
 it("requires separate restricted login and explicit source pin",()=>{
  expect(gate4PrebindAdditiveConfigV39(enabled)?.scope).toEqual(scope);
  for(const x of [
    {GATE4_PREBIND_APPROVED_SOURCE_COMMIT:"c".repeat(40)},
    {GATE4_PREBIND_WEBHOOK_SECRET:"short"},
    {GATE4_PREBIND_DATABASE_URL:
      "postgresql://travnr_v39_runtime:fake@mock.neon.tech/neondb?sslmode=verify-full"},
    {GATE4_PREBIND_APPROVED_DB_HOST:"other.host"},
    {ADB_AUTO_COLLECT:"true"}
  ]){
    expect(()=>gate4PrebindAdditiveConfigV39({...enabled,...x}))
      .toThrow("GATE4_PREBIND_ADDON_CONFIG_HOLD");
  }
 });
 it("role admission fails if V0071 lacks insert or receiver sees V0072",async()=>{
  const ok={
    db_ok:true,role_ok:true,schema_read:true,schema_create:false,
    read_raw:true,write_raw:true,update_raw:false,delete_raw:false,
    read_owner:false,write_owner:false,role_admin:false
  };
  const pool=(x:Record<string,unknown>)=>({
   query:vi.fn(async()=>({rows:[x]}))
  }) as unknown as Pick<Pool,"query">;
  await expect(gate4CheckAdditivePgRoleV39(
   pool(ok),"gate4_receiver_unit01")).resolves.toBeUndefined();
  for(const change of [
    {write_raw:false},{read_owner:true},{schema_create:true},
    {role_admin:true},{update_raw:true}
  ])await expect(gate4CheckAdditivePgRoleV39(
   pool({...ok,...change}),"gate4_receiver_unit01"))
    .rejects.toThrow("GATE4_PREBIND_ADDON_ROLE_UNSAFE_HOLD");
 });
 it("existing prepaid POST and new exact Gate4 POST coexist",async()=>{
  const store=good();
  await httpTest(store,async base=>{
    const old=await fetch(base+
      "/api/v1/webhooks/aerodatabox/a/prepaid/oldsession",
      {method:"POST"});
    expect(old.status).toBe(200);
    expect(await old.json()).toEqual({route:"existing_prepaid_kept"});
    const r=await fetch(base+"/api/v1/webhooks/aerodatabox/"+secret,{
      method:"POST",headers:{"content-type":"application/json"},
      body:bytes
    });
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({
      received:true,attribution:"none",
      status:"QUARANTINED_DURABLY_PENDING_ID_BINDING"
    });
    expect(store.writeOriginal).toHaveBeenCalledTimes(1);
    expect(store.readBackOriginal).toHaveBeenCalledTimes(1);
    const o=vi.mocked(store.writeOriginal).mock.calls[0][0];
    expect(o.originalSha256).toBe(digest(bytes));
    expect(o.originalBytes.equals(bytes)).toBe(true);
  });
 });
 it("wrong bearer secret and body mismatch cannot reach durable store",async()=>{
  const store=good();
  await httpTest(store,async base=>{
    const paths=[
      "/api/v1/webhooks/aerodatabox/wrong",
      "/api/v1/webhooks/aerodatabox/"+secret+"?foo=1"
    ];
    for(const path of paths){
      const r=await fetch(base+path,{
        method:"POST",headers:{"content-type":"application/json"},body:bytes
      });
      expect(r.status).not.toBe(200);
    }
    expect(store.writeOriginal).not.toHaveBeenCalled();
  });
 });
 it("failed post-COMMIT readback never ACKs a provider notification",async()=>{
  const store=good();
  await httpTest({
    ...store,readBackOriginal:async o=>({
      scopeId:o.scopeId,originalSha256:o.originalSha256,
      committed:true,originalBytesVerified:false
    })
  },async base=>{
    const r=await fetch(base+"/api/v1/webhooks/aerodatabox/"+secret,{
      method:"POST",headers:{"content-type":"application/json"},body:bytes
    });
    expect(r.status).toBe(503);
    expect((await r.json()).received).toBe(false);
  });
 });
 it("published health differentiates pre-existing prepaid route from opted-in add-on",()=>{
  const host={
    schema:"v39.phase2f-workspace-runtime.v1",
    status:"PASS",git_head:scope.sourceCommit,
    runtime_owner_mode:"replit-published-deployment",
    published_deployment:true,
    route_owner:"server/phase2gCallbackOnly.ts+server/routes_v3.ts",
    prepaid_route_registered:true,
    gate4_alert_ingress_registered:true,
    gate4_alert_callback_proven:false
  };
  expect(assessGate4AlertRouteReadinessV39(host,scope.sourceCommit))
   .toMatchObject({
    status:"ROUTE_DECLARED_NOT_LIVE_PROVEN",
    prepaidOnlyReceiver:false,alertRouteDeclared:true,
    callbackDeliveryAndAckProven:false,
    liveGate4Certified:false
   });
  expect(assessGate4AlertRouteReadinessV39(
   {...host,gate4_alert_ingress_registered:false},scope.sourceCommit))
   .toMatchObject({status:"HOLD",
    reason:"PUBLISHED_PREPAID_ONLY_ALERT_ROUTE_BLOCKED"});
 });
});
