/**
 * GATE4 DRAFT/UNDEPLOYED dedicated Alert-only receiver candidate.
 * NOT the existing Phase2G prepaid published application. Its build and
 * runtime opt-ins are both disabled by default.
 *
 * This may accept only explicitly owned, airport-bound Alert callbacks;
 * never starts a subscription, runs Phase6, activates collector, mutates
 * provider or exposes subscription management endpoints.
 *
 * Remaining release blockers: independently attested exact-owned CREATE
 * custody and human approval, real provider wire shape confirmation,
 * protected runtime/DB privileges, live delivery/ACK/retention proof and
 * independently armed STOP. This source itself verifies none of those.
 */
import express,{type Request,type Response,type NextFunction} from "express";
import {createServer} from "node:http";
import {timingSafeEqual} from "node:crypto";
import {registerV3Routes} from "./routes_v3";
import {assessGate4AlertIngressScopeV39,
  type Gate4AlertIngressScopeV39} from
  "./lib/disruption/gate4AlertIngressScope_v39";

function required(key:string):string{
  const v=String(process.env[key]??"");
  if(!v)throw Error("GATE4_ALERT_RECEIVER_CONFIGURATION_HOLD");
  return v;
}
export function gate4AlertReceiverLaunchReviewV39(
  env:NodeJS.ProcessEnv
):Gate4AlertIngressScopeV39{
  if(env.V39_GATE4_ALERT_RECEIVER_ONLY!=="1"||
     env.V39_CALLBACK_ONLY_RUNTIME!=="1"||
     env.ADB_AUTO_COLLECT!=="false"||
     env.V39_GATE4_ALERT_RECEIVER_RELEASE_REVIEW!==
       "EXPLICIT_STAGED_GATE4_ALERT_ONLY"||
     env.AERODATABOX_API_KEY||env.RAPIDAPI_KEY||
     env.DATABASE_URL||env.GATE05_SAFETY_DATABASE_URL||
     !env.V39_DATABASE_RUNTIME_URL||
     !env.AERODATABOX_WEBHOOK_SECRET||
     env.AERODATABOX_WEBHOOK_SECRET.length<32)
    throw Error("GATE4_ALERT_RECEIVER_LAUNCH_HOLD");
  const source=String(env.V39_DEPLOYED_GIT_HEAD??"");
  if(!/^[a-f0-9]{40}$/.test(source)||
     env.V39_GATE4_APPROVED_SOURCE_COMMIT!==source)
    throw Error("GATE4_ALERT_RECEIVER_SOURCE_PIN_HOLD");
  const scope:Gate4AlertIngressScopeV39={
    sourceCommit:source,
    scopeId:String(env.V39_GATE4_SCOPE_ID??""),
    authorizationSha256:String(env.V39_GATE4_AUTH_SHA256??""),
    subscriptionId:String(env.V39_GATE4_OWNED_SUBSCRIPTION_ID??""),
    airportIcao:String(env.V39_GATE4_AIRPORT_ICAO??"")
  };
  // Validate structural configuration WITHOUT fabricating a provider event.
  if(!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(scope.scopeId)||
    !/^[a-f0-9]{64}$/.test(scope.authorizationSha256)||
    !/^[A-Za-z0-9_-]{6,128}$/.test(scope.subscriptionId)||
    !/^[A-Z]{4}$/.test(scope.airportIcao))
    throw Error("GATE4_ALERT_RECEIVER_CUSTODY_CONFIG_HOLD");
  return scope;
}
export function createGate4AlertReceiverCandidateV39(
  scope:Gate4AlertIngressScopeV39,
  secret:string
){
  if(!secret||secret.length<32)
    throw Error("GATE4_ALERT_RECEIVER_SECRET_HOLD");
  const app=express();
  app.disable("x-powered-by");
  app.set("trust proxy",1);
  const alertPath=/^\/api\/v1\/webhooks\/aerodatabox\/([^/]+)\/?$/;
  const parser=express.json({limit:"2mb",type:"application/json"});
  app.get("/",(_req,res)=>res.status(200).json({
    status:"ok",service:"gate4-alert-receiver-candidate",
    provider_call:false,provider_mutation:false,
    live_gate4_certified:false
  }));
  app.get("/__v39/gate4/alert-route-readiness",(_req,res)=>
    res.status(200).json({
      schema:"v39.gate4.alert-receiver.v1",status:"ROUTE_ONLY",
      gate4_alert_ingress_registered:true,
      gate4_alert_callback_proven:false,
      independently_armed_stop:false,paid_authorization:false,
      provider_call:false,provider_mutation:false
    })
  );
  app.use((req:Request,res:Response,next:NextFunction)=>{
    const match=req.method==="POST"?alertPath.exec(req.path):null;
    if(!match){res.status(404).json({error:"Not found"});return;}
    // URL path holds a bearer secret: never log req.path/originalUrl.
    const supplied=Buffer.from(match[1]),expected=Buffer.from(secret);
    if(supplied.length!==expected.length||
       !timingSafeEqual(supplied,expected)){
      res.status(404).json({error:"Not found"});return;
    }
    if(req.originalUrl.includes("?")||
       !req.is("application/json")){
      res.status(415).json({error:"Invalid envelope"});return;
    }
    parser(req,res,(err?:unknown)=>{
      if(err){res.status(400).json({error:"Invalid envelope"});return;}
      const result=assessGate4AlertIngressScopeV39(scope,req.body);
      if(!result.allowed){
        // Non-2xx may trigger billed retries; a foreign/unowned ID must
        // never receive 2xx or be persisted as this Gate4's trial.
        res.status(422).json({error:"Unrecognized owned scope"});return;
      }
      next();
    });
  });
  // All management, prepaid and full-app routes are registered AFTER a
  // strict allowlist, so only the exact /:secret Alert POST can reach them.
  registerV3Routes(app);
  app.use((_err:unknown,_req:Request,res:Response,_next:NextFunction)=>{
    if(!res.headersSent)res.status(500).json({error:"Receiver error"});
  });
  return app;
}
function launch(){
  const scope=gate4AlertReceiverLaunchReviewV39(process.env);
  const port=Number(required("PORT"));
  if(!Number.isInteger(port)||port<1||port>65535)
    throw Error("GATE4_ALERT_RECEIVER_PORT_HOLD");
  const app=createGate4AlertReceiverCandidateV39(
    scope,required("AERODATABOX_WEBHOOK_SECRET")
  );
  createServer(app).listen({port,host:"0.0.0.0"},()=>{
    console.log("GATE4_DRAFT_ALERT_RECEIVER_LISTENING");
    console.log("LIVE_GATE4_NOT_CERTIFIED");
    console.log("STOP_NOT_ARMED");
  });
}
if(process.argv[1]&&
  import.meta.url===new URL("file://"+process.argv[1]).href){
  launch();
}
