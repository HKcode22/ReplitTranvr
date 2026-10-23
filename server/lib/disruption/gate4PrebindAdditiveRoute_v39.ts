/**
 * Gate4 Alert prebind add-on for the EXISTING Phase2G prepaid callback-only
 * published binary. Disabled by default; mounting adds exactly one ordinary
 * Alert POST and preserves the existing prepaid route (no binary swap).
 *
 * NEVER use the general V39_DATABASE_RUNTIME_URL for the prebind writer.
 * Requires independently provisioned gate4_receiver_... LOGIN with only
 * USAGE clean and SELECT+INSERT on V0071; NO owner binding V0072 access.
 * Provider CREATE/DELETE/paid authority: NONE in this add-on.
 */
import express,{type Express,type Request} from "express";
import {timingSafeEqual} from "node:crypto";
import {Pool} from "pg";
import {quarantineGate4PrebindOriginalV39,
 checkGate4PrebindScopeV39,type Gate4PrebindScopeV39,
 type Gate4PrebindOriginalStoreV39}
 from "./gate4PrebindIngress_v39";
import {createGate4PrebindPgStoreV39} from "./gate4PrebindPgStore_v39";

const name=/^gate4_receiver_[a-z0-9_]{4,60}$/;
type Config={scope:Gate4PrebindScopeV39;secret:string;databaseUrl:string;dbRole:string};
function fail():never{throw Error("GATE4_PREBIND_ADDON_CONFIG_HOLD");}
/**
 * Production scripts/build.ts injects process.env.V39_DEPLOYED_GIT_HEAD
 * into the server binary from reviewed Git HEAD. Never depend on a manually
 * maintained Replit Secret for this build identity. The explicit optional pin
 * remains a fail-closed FREEZE when a specific source is under review.
 *
 * In unit tests only, builtGitHead can be supplied as the audited fixture.
 * No inferred source ID authorizes provider CREATE, DELETE or any paid run.
 */
export function gate4PrebindAdditiveConfigV39(
 env:NodeJS.ProcessEnv,
 builtGitHead=String(process.env.V39_DEPLOYED_GIT_HEAD??"")
):Config|null{
 if(env.V39_GATE4_PREBIND_ADD_ON_PREPAID!=="1")return null;
 const deployed=builtGitHead.trim().toLowerCase();
 const approved=String(env.GATE4_PREBIND_APPROVED_SOURCE_COMMIT??"").trim();
 if(!/^[a-f0-9]{40}$/.test(deployed)||
   (approved!==""&&approved!==deployed)||
   env.GATE4_PREBIND_RELEASE_REVIEW!=="EXPLICIT_NO_PROVIDER_RECEIVER"||
   env.ADB_AUTO_COLLECT!=="false")
   return fail();
 const scope:Gate4PrebindScopeV39={
  sourceCommit:deployed,
  scopeId:String(env.GATE4_PREBIND_SCOPE_ID??""),
  authorizationSha256:String(env.GATE4_PREBIND_AUTH_SHA256??""),
  airportIcao:String(env.GATE4_PREBIND_AIRPORT_ICAO??"")
 };
 const secret=String(env.GATE4_PREBIND_WEBHOOK_SECRET??"");
 const url=String(env.GATE4_PREBIND_DATABASE_URL??"");
 let u:URL;
 try{u=new URL(url);}catch{return fail();}
 const role=decodeURIComponent(u.username);
 if(!checkGate4PrebindScopeV39(scope)||
    secret.length<32||!["postgres:","postgresql:"].includes(u.protocol)||
    !name.test(role)||!u.password||!u.hostname||
    u.searchParams.get("sslmode")!=="verify-full"||
    u.hostname!==env.GATE4_PREBIND_APPROVED_DB_HOST)
  return fail();
 return {scope,secret,databaseUrl:url,dbRole:role};
}
/** Must pass before app starts listening. Rejects current broad runtime role. */
export async function gate4CheckAdditivePgRoleV39(
 pool:Pick<Pool,"query">,expectedRole:string,
 expectedDatabase="neondb"
):Promise<void>{
 const x=await pool.query(
  "SELECT current_database()=$2 AS db_ok,"+
  "current_user=$1 AS role_ok,"+
  "has_schema_privilege(current_user,'clean','USAGE') AS schema_read,"+
  "has_schema_privilege(current_user,'clean','CREATE') AS schema_create,"+
  "has_table_privilege(current_user,"+
    "'clean.gate4_alert_prebind_original_v39','SELECT') AS read_raw,"+
  "has_table_privilege(current_user,"+
    "'clean.gate4_alert_prebind_original_v39','INSERT') AS write_raw,"+
  "has_table_privilege(current_user,"+
    "'clean.gate4_alert_prebind_original_v39','UPDATE') AS update_raw,"+
  "has_table_privilege(current_user,"+
    "'clean.gate4_alert_prebind_original_v39','DELETE') AS delete_raw,"+
  "has_table_privilege(current_user,"+
    "'clean.gate4_alert_owned_binding_v39','SELECT') AS read_owner,"+
  "has_table_privilege(current_user,"+
    "'clean.gate4_alert_owned_binding_v39','INSERT') AS write_owner,"+
  "(SELECT rolcreaterole OR rolsuper FROM pg_roles "+
    "WHERE rolname=current_user) AS role_admin",
  [expectedRole,expectedDatabase]
 );
 const a=x.rows?.[0];
 if(x.rows.length!==1||a?.db_ok!==true||a?.role_ok!==true||
   a?.schema_read!==true||a?.schema_create!==false||
   a?.read_raw!==true||a?.write_raw!==true||
   a?.update_raw!==false||a?.delete_raw!==false||
   a?.read_owner!==false||a?.write_owner!==false||
   a?.role_admin!==false)
  throw Error("GATE4_PREBIND_ADDON_ROLE_UNSAFE_HOLD");
}
export function gate4PrebindAlertPathV39(path:string):boolean{
 return /^\/api\/v1\/webhooks\/aerodatabox\/[^/]+\/?$/.test(path);
}
export function mountGate4PrebindAdditiveRouteV39(
 app:Express,scope:Gate4PrebindScopeV39,secret:string,
 store:Gate4PrebindOriginalStoreV39
):void{
 if(!checkGate4PrebindScopeV39(scope)||secret.length<32||!store)
  throw Error("GATE4_PREBIND_ADDON_ROUTE_NOT_READY");
 const raw=express.raw({type:"application/json",limit:"2mb"});
 app.post("/api/v1/webhooks/aerodatabox/:secret",raw,
  async(req:Request,res)=>{
   // Express permits string[] params for wildcard shapes; reject any
   // ambiguous URL param before comparing a bearer secret.
   const candidate=req.params.secret;
   if(typeof candidate!=="string"){
     res.status(404).json({error:"Not found"});return;
   }
   const supplied=Buffer.from(candidate);
   const expected=Buffer.from(secret);
   if(supplied.length!==expected.length||
      !timingSafeEqual(supplied,expected)){
     res.status(404).json({error:"Not found"});return;
   }
   if(req.originalUrl.includes("?")||!req.is("application/json")){
     res.status(415).json({error:"Invalid envelope"});return;
   }
   let receipt;
   try{
     receipt=await quarantineGate4PrebindOriginalV39(
       scope,req.body as Buffer,store);
   }catch{
     res.status(503).json({received:false,status:"HOLD"});return;
   }
   res.status(receipt.httpStatus).json({
     received:receipt.responseAcknowledged,status:receipt.status,
     attribution:"none",paidAuthorization:false
   });
  });
}
export async function openGate4PrebindAdditiveStoreV39(
 config:Config
):Promise<{store:Gate4PrebindOriginalStoreV39;pool:Pool}>{
 const pool=new Pool({connectionString:config.databaseUrl,
   connectionTimeoutMillis:6000,max:4});
 try{
  await gate4CheckAdditivePgRoleV39(pool,config.dbRole);
  return {store:createGate4PrebindPgStoreV39(pool),pool};
 }catch{
  await pool.end().catch(()=>undefined);
  throw Error("GATE4_PREBIND_ADDON_DATABASE_NOT_READY");
 }
}
