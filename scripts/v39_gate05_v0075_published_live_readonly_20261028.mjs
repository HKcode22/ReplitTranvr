/**
 * Gate05 live source/Neon attestation. Read-only, no provider and no billing.
 * Run automatically from GitHub on the reviewed main workflow landing.
 * Existing published-health and HMAC challenge routes are NOT callback POSTs.
 *
 * Public identity is distinct from authenticated DB binding, which is
 * distinct from effective runtime DB privileges on V0075. All must pass.
 */
import pg from "pg";
import {createHmac,randomUUID} from "node:crypto";

const expectedSource="84b7f1565d0402facc8c3b9aacedc599eb6e2af1";
const base="https://replit-tranvr--hk84164.replit.app";
const url=String(process.env.V39_DATABASE_RUNTIME_URL??"").trim();
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const r={
  schema:"v39.gate05.v0075.published-live-readonly.v1",
  status:"HOLD",
  stage:"ENVIRONMENT",
  expectedSource,observedSource:null,
  publishedSourceMatches:false,durableCustodyReady:false,
  alertIngressRegistered:false,publishedDeployment:false,
  authenticatedDbBinding:false,authenticatedDbLive:false,
  loggedJournal:false,immutableTrigger:false,schemaUsage:false,
  runtimeInsert:false,runtimeUpdate:null,runtimeDelete:null,
  publicInsert:null,dbWrites:0,providerRequests:0,paidTrialStarted:false,
  scienceGate05Passed:false
};
let db;
const assert=(x,code)=>{if(!x)throw Error(code);};
const challenge=()=> "gate05-v0075-readonly-"+randomUUID();
const proof=(prefix,nonce)=>createHmac("sha256",url).update(prefix+nonce).digest("hex");
async function remote(path,headers={}){
  const response=await fetch(base+path,{
    method:Object.keys(headers).length?"POST":"GET",
    headers:{accept:"application/json",...headers},
    cache:"no-store",redirect:"error",signal:AbortSignal.timeout(12000)
  });
  const body=await response.json().catch(()=>null);
  return {code:response.status,body};
}
try{
  assert(url.length>20,"RUNTIME_URL_NOT_SET");
  const parsed=new URL(url);
  assert(["postgres:","postgresql:"].includes(parsed.protocol),"RUNTIME_DB_PROTOCOL_HOLD");
  r.stage="PUBLISHED_SOURCE";
  // Briefly allow Replit promotion or cold-start to settle. Never accept
  // wrong source as a success; these are free read-only GETs.
  for(let n=0;n<5;n++){
    try{
      const {code,body}=await remote("/__v39/workspace-runtime");
      r.observedSource=/^[0-9a-f]{40}$/.test(String(body?.git_head??""))
        ?body.git_head:null;
      r.publishedSourceMatches=code===200&&body?.status==="PASS"&&
        body?.git_head===expectedSource;
      r.durableCustodyReady=body?.gate05_durable_custody_ready===true;
      r.alertIngressRegistered=body?.gate4_alert_ingress_registered===true;
      r.publishedDeployment=body?.published_deployment===true&&
        body?.runtime_owner_mode==="replit-published-deployment";
      if(r.publishedSourceMatches&&r.durableCustodyReady&&
        r.alertIngressRegistered&&r.publishedDeployment&&
        body?.prepaid_route_registered===true&&
        body?.provider_mutation===false)break;
    }catch{
      // Treat transient network errors as retryable; never infer identity.
    }
    if(n<4)await sleep(3000);
  }
  assert(r.publishedSourceMatches&&r.durableCustodyReady&&
    r.alertIngressRegistered&&r.publishedDeployment,
    "SOURCE_OR_OPT_IN_HOLD");

  r.stage="AUTHENTICATED_PUBLISHED_DB_BINDING";
  const b=challenge();
  const bind=await remote("/__v39/phase2g/runtime-db-binding",{
    "x-v39-phase2g-db-challenge":b,
    "x-v39-phase2g-db-proof":proof("phase2g-db-binding:",b)
  });
  r.authenticatedDbBinding=bind.code===200&&
    bind.body?.schema==="v39.phase2g-runtime-db-binding.v1"&&
    bind.body?.status==="PASS"&&bind.body?.database_mutation===false&&
    bind.body?.provider_call===false&&bind.body?.provider_mutation===false;
  assert(r.authenticatedDbBinding,"PUBLISHED_DB_HMAC_BINDING_HOLD");

  r.stage="AUTHENTICATED_PUBLISHED_DB_LIVE";
  const nonce=challenge();
  const live=await remote("/__v39/phase2g/db-live-preflight",{
    "x-v39-phase2g-db-live-challenge":nonce,
    "x-v39-phase2g-db-live-proof":proof("phase2g-db-live-preflight:",nonce)
  });
  r.authenticatedDbLive=live.code===200&&
    live.body?.schema==="v39.phase2g-db-live-preflight.v1"&&
    live.body?.status==="PASS"&&
    live.body?.database_connection_verified===true&&
    live.body?.database_mutation===false&&
    live.body?.provider_call===false&&
    live.body?.provider_mutation===false;
  assert(r.authenticatedDbLive,"PUBLISHED_DB_LIVE_SELECT_HOLD");

  r.stage="POSTGRESQL_RUNTIME_LOGGED_ACL_READONLY";
  db=new pg.Client({
    connectionString:url,
    options:"-c default_transaction_read_only=on",
    connectionTimeoutMillis:8000,query_timeout:10000,
    statement_timeout:10000,
    application_name:"gate05_v0075_published_live_readonly"
  });
  await db.connect();
  await db.query("BEGIN TRANSACTION READ ONLY");
  const rows=(await db.query(
    "SELECT c.relpersistence='p' AND c.relkind='r' AS logged,"+
    "has_schema_privilege('clean','USAGE') AS su,"+
    "has_table_privilege(c.oid,'INSERT') AS ins,"+
    "has_table_privilege(c.oid,'UPDATE') AS upd,"+
    "has_table_privilege(c.oid,'DELETE') AS del,"+
    "EXISTS(SELECT 1 FROM pg_trigger t JOIN pg_proc p "+
    "ON t.tgfoid=p.oid WHERE t.tgrelid=c.oid "+
    "AND t.tgname='gate05_delivery_custody_immutable_v39' "+
    "AND p.prosecdef) AS immutable,"+
    "EXISTS(SELECT 1 FROM aclexplode(COALESCE(c.relacl,"+
    "acldefault('r',c.relowner))) a WHERE a.grantee=0 "+
    "AND a.privilege_type='INSERT') AS pub "+
    "FROM pg_class c WHERE c.oid="+
    "to_regclass('clean.gate05_science_delivery_custody_v39')"
  )).rows;
  const x=rows[0];
  r.loggedJournal=x?.logged===true;
  r.immutableTrigger=x?.immutable===true;
  r.schemaUsage=x?.su===true;
  r.runtimeInsert=x?.ins===true;
  r.runtimeUpdate=x?.upd??null;
  r.runtimeDelete=x?.del??null;
  r.publicInsert=x?.pub??null;
  await db.query("ROLLBACK");
  assert(r.loggedJournal&&r.immutableTrigger&&r.schemaUsage&&
    r.runtimeInsert&&r.runtimeUpdate===false&&
    r.runtimeDelete===false&&r.publicInsert===false,
    "RUNTIME_V0075_MINIMAL_ACL_HOLD");
  r.stage="COMPLETE";
  r.status="GATE05_V0075_LIVE_RECEIVER_DB_READONLY_PASS";
}catch{
  r.status="GATE05_V0075_LIVE_RECEIVER_DB_READONLY_HOLD";
  process.exitCode=2;
}finally{
  if(db)await db.end().catch(()=>undefined);
  console.log(JSON.stringify(r,null,2));
}