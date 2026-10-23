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
import express,{type Request,type Response,type NextFunction,type Express} from "express";
import {createServer} from "node:http";
import {timingSafeEqual} from "node:crypto";
import {registerV3Routes} from "./routes_v3";
import {getV39Pool} from "./lib/disruption/db_v39";
import {createGate4PrebindPgStoreV39} from "./lib/disruption/gate4PrebindPgStore_v39";
import {quarantineGate4PrebindOriginalV39,
  checkGate4PrebindScopeV39,
  type Gate4PrebindScopeV39,
  type Gate4PrebindOriginalStoreV39} from
  "./lib/disruption/gate4PrebindIngress_v39";
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
):Gate4AlertIngressScopeV39|Gate4PrebindScopeV39{
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
  const prebind=env.V39_GATE4_ALERT_PREBIND_MODE==="1";
  if(prebind&&env.V39_GATE4_OWNED_SUBSCRIPTION_ID)
    throw Error("GATE4_PREBIND_CANNOT_ASSUME_ID");
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
    (!prebind&&!/^[A-Za-z0-9_-]{6,128}$/.test(scope.subscriptionId))||
    !/^[A-Z]{4}$/.test(scope.airportIcao))
    throw Error("GATE4_ALERT_RECEIVER_CUSTODY_CONFIG_HOLD");
  if(prebind){
    const unbound:Gate4PrebindScopeV39={
      sourceCommit:scope.sourceCommit,scopeId:scope.scopeId,
      authorizationSha256:scope.authorizationSha256,
      airportIcao:scope.airportIcao
    };
    if(!checkGate4PrebindScopeV39(unbound))
      throw Error("GATE4_PREBIND_SCOPE_INVALID");
    return unbound;
  }
  return scope;
}
export function createGate4AlertReceiverCandidateV39(
  scope:Gate4AlertIngressScopeV39|Gate4PrebindScopeV39,
  secret:string,
  registerRoutes:(app:Express)=>void=registerV3Routes,
  prebindStore?:Gate4PrebindOriginalStoreV39
){
  const prebind=!("subscriptionId" in scope);
  if(prebind&&!prebindStore)
    throw Error("GATE4_PREBIND_DURABLE_STORE_REQUIRED");
  if(!secret||secret.length<32)
    throw Error("GATE4_ALERT_RECEIVER_SECRET_HOLD");
  const app=express();
  app.disable("x-powered-by");
  app.set("trust proxy",1);
  const alertPath=/^\/api\/v1\/webhooks\/aerodatabox\/([^/]+)\/?$/;
  const parser=express.json({
    limit:"2mb",type:"application/json",
    verify:(req,_res,buf)=>{
      (req as Request&{rawBody?:Buffer}).rawBody=Buffer.from(buf);
    }
  });
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
      if(prebind){
        // Pre-CREATE: persist exactly received bytes and verify post-COMMIT
        // readback. Never call the downstream science handler or infer owner.
        const raw=(req as Request&{rawBody?:Buffer}).rawBody;
        void quarantineGate4PrebindOriginalV39(
          scope as Gate4PrebindScopeV39,
          raw as Buffer,
          prebindStore!
        ).then(out=>{
          res.status(out.httpStatus).json({
            received:out.responseAcknowledged,
            status:out.status,
            attribution:"none",
            paid_authorization:false
          });
        }).catch(()=>{
          res.status(503).json({received:false,status:"HOLD"});
        });
        return;
      }
      const result=assessGate4AlertIngressScopeV39(
        scope as Gate4AlertIngressScopeV39,req.body);
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
  registerRoutes(app);
  app.use((_err:unknown,_req:Request,res:Response,_next:NextFunction)=>{
    if(!res.headersSent)res.status(500).json({error:"Receiver error"});
  });
  return app;
}
async function launch():Promise<void>{
  const scope=gate4AlertReceiverLaunchReviewV39(process.env);
  const port=Number(required("PORT"));
  if(!Number.isInteger(port)||port<1||port>65535)
    throw Error("GATE4_ALERT_RECEIVER_PORT_HOLD");
  const prebind=!("subscriptionId" in scope);
  // No advertised health/listener until the STAGED quarantine table is
  // installed and the active runtime DB role can INSERT and SELECT.
  // These permissions are necessary only: separate restricted-role review,
  // external custody and provider-side first-SEND readiness remain required.
  if(prebind){
    const pool=getV39Pool();
    const r=await pool.query(
      "SELECT to_regclass('clean.gate4_alert_prebind_original_v39') AS tbl,"+
      "has_table_privilege(current_user,"+
      "'clean.gate4_alert_prebind_original_v39','INSERT') AS can_insert,"+
      "has_table_privilege(current_user,"+
      "'clean.gate4_alert_prebind_original_v39','SELECT') AS can_read"
    );
    if(r.rows[0]?.tbl!=="clean.gate4_alert_prebind_original_v39"||
       r.rows[0]?.can_insert!==true||r.rows[0]?.can_read!==true)
      throw Error("GATE4_PREBIND_TABLE_OR_PRIVILEGES_NOT_READY");
  }
  const app=createGate4AlertReceiverCandidateV39(
    scope,required("AERODATABOX_WEBHOOK_SECRET"),
    registerV3Routes,
    prebind?createGate4PrebindPgStoreV39(getV39Pool()):undefined
  );
  createServer(app).listen({port,host:"0.0.0.0"},()=>{
    console.log("GATE4_DRAFT_ALERT_RECEIVER_LISTENING");
    console.log("LIVE_GATE4_NOT_CERTIFIED");
    console.log("STOP_NOT_ARMED");
  });
}
// Only the separately opted-in esbuild bundle has this constant defined.
// Imported source/tests and the ordinary app MUST never start the receiver.
if(process.env.V39_GATE4_RECEIVER_EXECUTION_ENTRYPOINT==="1"){
  launch().catch(()=>{
    // Deliberately redact DB/auth transport detail from startup logs.
    console.error("GATE4_ALERT_RECEIVER_STARTUP_HOLD");
    process.exitCode=2;
  });
}
