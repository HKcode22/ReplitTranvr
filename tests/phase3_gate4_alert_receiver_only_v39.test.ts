import {describe,it,expect,vi} from "vitest";
import {createServer,type Server} from "node:http";
import {readFileSync} from "node:fs";
import type {Express} from "express";
import {assessGate4AlertIngressScopeV39} from
  "../server/lib/disruption/gate4AlertIngressScope_v39";
import {
  createGate4AlertReceiverCandidateV39,
  gate4AlertReceiverLaunchReviewV39
} from "../server/gate4AlertReceiverOnly";

const secret="unit-test-not-a-real-callback-secret-"+ "x".repeat(40);
const subId="exactOwned99",icao="WSSS";
const sha="a".repeat(40),auth="b".repeat(64);
const scope={
  scopeId:"11111111-2222-3333-4444-555555555555",
  authorizationSha256:auth,
  sourceCommit:sha,subscriptionId:subId,airportIcao:icao
};
const payload={
  subscription:{id:subId,subject:{type:"FlightByAirportIcao",id:icao}},
  flights:[] as unknown[]
};
const launchEnv={
  V39_GATE4_ALERT_RECEIVER_ONLY:"1",
  V39_CALLBACK_ONLY_RUNTIME:"1",
  V39_GATE4_ALERT_RECEIVER_RELEASE_REVIEW:"EXPLICIT_STAGED_GATE4_ALERT_ONLY",
  ADB_AUTO_COLLECT:"false",V39_DATABASE_RUNTIME_URL:"postgres://fake.invalid/test",
  AERODATABOX_WEBHOOK_SECRET:secret,
  V39_DEPLOYED_GIT_HEAD:sha,V39_GATE4_APPROVED_SOURCE_COMMIT:sha,
  V39_GATE4_SCOPE_ID:scope.scopeId,
  V39_GATE4_AUTH_SHA256:auth,
  V39_GATE4_OWNED_SUBSCRIPTION_ID:subId,
  V39_GATE4_AIRPORT_ICAO:icao
};
async function localServer(callback:(base:string,ack:ReturnType<typeof vi.fn>)=>Promise<void>){
  const ack=vi.fn();
  const app=createGate4AlertReceiverCandidateV39(
    scope,secret,(a:Express)=>{
      a.post("/api/v1/webhooks/aerodatabox/:secret",(_req,res)=>{
        ack();res.status(200).json({received:true,synthetic:true});
      });
    }
  );
  const server:Server=createServer(app);
  await new Promise<void>((resolve,reject)=>{
    server.once("error",reject);
    server.listen(0,"127.0.0.1",()=>resolve());
  });
  const addr=server.address();
  if(!addr||typeof addr==="string")throw Error("TEST_SERVER_ADDR");
  try{await callback("http://127.0.0.1:"+addr.port,ack);}
  finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
}
const post=async(base:string,path:string,body:unknown=payload,
  type="application/json")=>fetch(base+path,{
    method:"POST",headers:{"content-type":type},
    body:JSON.stringify(body)
  });
const path="/api/v1/webhooks/aerodatabox/"+secret;

describe("Gate4 standalone Alert receiver strict scope — zero-provider tests",()=>{
  it("refuses non-canonical and unknown subscription ownership",()=>{
    for(const obj of [
      null,[],{},
      {flights:[]},
      {...payload,subscription:{id:"foreignID",subject:payload.subscription.subject}},
      {...payload,subscription:{...payload.subscription,subject:{
        ...payload.subscription.subject,id:"KLAX"
      }}},
      {...payload,subscription:{...payload.subscription,subject:{
        ...payload.subscription.subject,type:"FlightByNumber"
      }}},
      {...payload,flights:"not a list"},
      {...payload,flights:Array.from({length:251},()=>({}))}
    ])expect(assessGate4AlertIngressScopeV39(scope,obj).allowed).toBe(false);
  });
  it("owned shape remains only a route admission, not real delivery proof",()=>{
    expect(assessGate4AlertIngressScopeV39(scope,payload)).toMatchObject({
      allowed:true,reason:"EXACT_OWNED_SCOPE_SHAPE_ONLY",
      callbackDeliveryAndAckProven:false,paidAuthorization:false,
      providerRequests:0,databaseWrites:0
    });
  });
  it("rejects missing/foreign review pins before any real payload",()=>{
    expect(assessGate4AlertIngressScopeV39({
      ...scope,subscriptionId:""
    },payload).allowed).toBe(false);
    expect(assessGate4AlertIngressScopeV39({
      ...scope,authorizationSha256:"garbage"
    },payload).allowed).toBe(false);
  });
  it("launch refuses provider, legacy DB or Gate05 keys",()=>{
    for(const [key,value] of [
      ["AERODATABOX_API_KEY","PAYMENT_KEY"],
      ["RAPIDAPI_KEY","PAYMENT_KEY"],
      ["DATABASE_URL","postgres://general.invalid/db"],
      ["GATE05_SAFETY_DATABASE_URL","postgres://other.invalid/db"]
    ]){
      expect(()=>gate4AlertReceiverLaunchReviewV39({
        ...launchEnv,[key]:value
      })).toThrow("GATE4_ALERT_RECEIVER_LAUNCH_HOLD");
    }
  });
  it("launch requires exact released source, scope ID and explicit opt-in",()=>{
    expect(gate4AlertReceiverLaunchReviewV39(launchEnv)).toMatchObject(scope);
    for(const changes of [
      {V39_GATE4_ALERT_RECEIVER_ONLY:"0"},
      {V39_CALLBACK_ONLY_RUNTIME:"0"},
      {V39_GATE4_ALERT_RECEIVER_RELEASE_REVIEW:""},
      {V39_GATE4_APPROVED_SOURCE_COMMIT:"f".repeat(40)},
      {V39_GATE4_OWNED_SUBSCRIPTION_ID:""},
      {V39_GATE4_AUTH_SHA256:"junk"},
      {ADB_AUTO_COLLECT:"true"}
    ])expect(()=>gate4AlertReceiverLaunchReviewV39({
      ...launchEnv,...changes
    })).toThrow(/GATE4_ALERT_RECEIVER_/);
  });
  it("mock POST valid exact-owned scope reaches only injected handler",async()=>{
    await localServer(async(base,ack)=>{
      const response=await post(base,path);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({received:true,synthetic:true});
      expect(ack).toHaveBeenCalledTimes(1);
    });
  });
  it("wrong secret, missing secret, management and prepaid routes stay blocked",async()=>{
    await localServer(async(base,ack)=>{
      for(const [method,p] of [
        ["POST","/api/v1/webhooks/aerodatabox/wrong-secret"],
        ["POST","/api/v1/webhooks/aerodatabox"],
        ["POST","/api/v1/subscriptions/balance/refill"],
        ["POST",path+"/prepaid/123"],
        ["GET","/api/v1/subscriptions/webhook"]
      ]){
        const res=await fetch(base+p,{method});
        expect(res.status).toBe(404);
      }
      expect(ack).not.toHaveBeenCalled();
    });
  });
  it("foreign ID, ICAO mismatch, bad content type and query string never reach handler",async()=>{
    await localServer(async(base,ack)=>{
      expect((await post(base,path,{...payload,subscription:{
        ...payload.subscription,id:"foreignID"
      }})).status).toBe(422);
      expect((await post(base,path,{...payload,subscription:{
        ...payload.subscription,subject:{
          ...payload.subscription.subject,id:"KLAX"
        }
      }})).status).toBe(422);
      expect((await post(base,path,{...payload,flights:[]},
        "text/plain")).status).toBe(415);
      expect((await post(base,path+"?override=1")).status).toBe(415);
      expect(ack).not.toHaveBeenCalled();
    });
  });
  it("public candidate route does not claim real Alert callback ACK or independent STOP",async()=>{
    await localServer(async(base,ack)=>{
      const x=await fetch(base+"/__v39/gate4/alert-route-readiness");
      expect(x.status).toBe(200);
      const json=await x.json();
      expect(json).toMatchObject({
        status:"ROUTE_ONLY",gate4_alert_ingress_registered:true,
        gate4_alert_callback_proven:false,
        independently_armed_stop:false,paid_authorization:false,
        provider_mutation:false
      });
      expect(ack).not.toHaveBeenCalled();
    });
  });
  it("build entrypoint separately opted-in; existing prepaid runtime unchanged",()=>{
    const build=readFileSync(new URL("../scripts/build.ts",import.meta.url),"utf8");
    expect(build).toContain("V39_GATE4_ALERT_RECEIVER_BUILD");
    expect(build).toContain("GATE4_ALERT_BUILD_MUST_BE_SEPARATE_FROM_PREPAID");
    expect(build).toContain("server/gate4AlertReceiverOnly.ts");
    const minimal=readFileSync(
      new URL("../server/phase2gCallbackOnly.ts",import.meta.url),"utf8");
    expect(minimal).toContain("prepaidPath.test(req.path)");
    expect(minimal).toContain("gate4AlertIngressRegistered: gate4AdditiveEnabled");
    expect(minimal).not.toContain("gate4AlertIngressRegistered: true");
  });
});
