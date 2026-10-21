/**
 * One-use exact Gate05 activation via ACTIVATE-ONLY authenticated LOGIN.
 * MUST be explicitly run by the owner AFTER a real same-scope in-progress
 * GitHub safety-only STOP job has been inspected. Never calls FIDS/provider.
 *
 * Separate from authorization construction/commissioning and dispatcher.
 * A failed post-COMMIT readback is AMBIGUOUS: don't rerun blindly.
 */
import "dotenv/config";
import pg from "pg";
import {readFileSync,statSync,writeFileSync} from "node:fs";
import {resolve,join} from "node:path";
import {execFileSync,spawnSync} from "node:child_process";
import {createHash} from "node:crypto";
import {previewGate05SignedExpiryGuardPlanV39} from
  "../server/lib/disruption/gate05SignedExpiryGuardPlan_v39";
import {assertGate05SafetyJobLiveV39} from
  "./v39_gate05_scoped_fids_feasibility_operator_v39";

const REPO="HKcode22/ReplitTranvr";
const CONFIRM="OWNER_APPROVED_G05_ACTIVATE_AFTER_ARMED_SAFETY_NO_PROVIDER";
const SHA=/^[0-9a-f]{40}$/;
const hold=(m:string):never=>{throw Error("GATE05_ACTIVATE_HOLD_"+m);};
export function checkGate05ActivationWindowV39(
  now:number,start:string,end:string,confirmation:string
){
  const a=Date.parse(start),b=Date.parse(end);
  if(confirmation!==CONFIRM||!Number.isSafeInteger(now)||
     !Number.isFinite(a)||!Number.isFinite(b)||
     b-a!==40*60000||now<a||now>=b-15000)
    hold("WINDOW_OR_EXACT_CONFIRM");
  return {activateEligible:true as const,paidGo:false as const,
    providerRequests:0 as const};
}
function cli(v:string[]){
  if(v.length!==12)hold("CLI");
  const m=new Map<string,string>();
  for(let i=0;i<v.length;i+=2){
    if(!v[i]?.startsWith("--")||!v[i+1]||m.has(v[i]))hold("CLI");
    m.set(v[i],v[i+1]);
  }
  if([...m.keys()].sort().join("|")!==
    ["--head","--bundle","--pins","--private-dir",
     "--safety-run","--confirm"].sort().join("|"))hold("CLI");
  return {head:m.get("--head")!,bundle:m.get("--bundle")!,
    pins:m.get("--pins")!,root:m.get("--private-dir")!,
    run:m.get("--safety-run")!,confirm:m.get("--confirm")!};
}
function privateJson(s:string){
  if(resolve(s)!==s||!s.startsWith("/tmp/")||s.length>1024)
    hold("PRIVATE_PATH");
  const st=statSync(s);
  if(!st.isFile()||(st.mode&0o077)!==0||st.size<2||st.size>32768)
    hold("PRIVATE_FILE");
  return JSON.parse(readFileSync(s,"utf8"));
}
function gh(args:string[]){
  const r=spawnSync("gh",args,{
    encoding:"utf8",stdio:["ignore","pipe","pipe"],
    timeout:10000,maxBuffer:1048576
  });
  if(r.error||r.status!==0)hold("GITHUB_READ");
  try{return JSON.parse(r.stdout);}catch{return hold("GITHUB_JSON");}
}
async function run(){
  const p=cli(process.argv.slice(2));
  if(!SHA.test(p.head)||!/^[1-9][0-9]{7,13}$/.test(p.run)||
     p.confirm!==CONFIRM)hold("INPUT");
  const local=execFileSync("git",["rev-parse","HEAD"],{
    encoding:"utf8",stdio:["ignore","pipe","ignore"]
  }).trim();
  const main=gh(["api","repos/"+REPO+"/git/ref/heads/main"]);
  const account=gh(["api","user"]);
  if(local!==p.head||main.object?.sha!==p.head||
     account.login!=="HKcode22")hold("HEAD_OR_OWNER");
  const bundle=privateJson(p.bundle),pins=privateJson(p.pins);
  const credential=privateJson(join(p.root,"restricted-operator-logins.json"));
  const commission=privateJson(join(p.root,"commission-receipt.json"));
  const bytes=Buffer.from(bundle.authorizationBytesBase64,"base64");
  const reviewed=previewGate05SignedExpiryGuardPlanV39({
    authorizationBytes:bytes,
    detachedSignatureBase64:bundle.detachedSignatureBase64,
    signerPublicKeySpkiDerBase64:bundle.signerPublicKeySpkiDerBase64,
    independentPins:pins
  });
  const auth=JSON.parse(bytes.toString("utf8"));
  const digest=createHash("sha256").update(bytes).digest("hex");
  if(digest!==reviewed.reviewedAuthorizationSha256||
     reviewed.sourceCommit!==p.head||
     commission.status!=="EXACT_PREPARED_NO_PAID_PROVIDER"||
     commission.scopeId!==reviewed.scopeId||
     commission.authorizationSha256!==digest||
     credential.sourceCommit!==p.head||
     credential.executionStartUtc!==auth.startsAtUtc||
     Date.parse(credential.expiresUtc)<Date.parse(auth.expiresAtUtc)+10*60000)
    hold("PREPARED_ARTIFACT_OR_CREDENTIAL");
  checkGate05ActivationWindowV39(
    Date.now(),auth.startsAtUtc,auth.expiresAtUtc,p.confirm
  );
  const assertLive=()=>{
    const run=gh(["api","repos/"+REPO+"/actions/runs/"+p.run]);
    const jobs=gh(["api","repos/"+REPO+"/actions/runs/"+p.run+
      "/jobs?per_page=100"]);
    assertGate05SafetyJobLiveV39(run,jobs,p.head,
      reviewed.scopeId,reviewed.reviewedAuthorizationSha256);
  };
  assertLive();
  const receipt=join(p.root,"activation-receipt.json");
  const initial={schema:"v39.gate05.activation-receipt.v1",
    status:"STARTED_ACTIVE_UNCONFIRMED",scopeId:reviewed.scopeId,
    authorizationSha256:digest,sourceCommit:p.head,
    safetyRunId:p.run,providerRequests:0,paidGo:false};
  writeFileSync(receipt,JSON.stringify(initial)+"\n",{
    flag:"wx",mode:0o600
  });
  let activationCommitted=false;
  let client:pg.Client|null=null,admin:pg.Client|null=null;
  const record=(value:unknown)=>writeFileSync(
    receipt,JSON.stringify(value,null,2)+"\n",{mode:0o600}
  );
  try{
    client=new pg.Client({connectionString:credential.urls.activate,
      connectionTimeoutMillis:7000,statement_timeout:8000,
      query_timeout:10000,lock_timeout:2000});
    await client.connect();
    const identity=(await client.query(
      "SELECT current_database() AS db,session_user AS login,"+
      "current_user AS actor,pg_is_in_recovery() AS replica"
    )).rows[0];
    if(identity.db!=="neondb"||identity.replica!==false||
       !/^gate05_fids_activate_login_2026[0-9_]{8,60}[a-f0-9]*$/.test(
         identity.login)||identity.actor!==identity.login)
      hold("ACTIVATOR_LOGIN");
    // One more fresh live GH check immediately before executing ACTIVATE.
    assertLive();
    await client.query("BEGIN");
    let tx=true;
    try{
      await client.query("SET LOCAL ROLE gate05_fids_activate_v39");
      const state=(await client.query(
        "SELECT scope_id,state,expires_at_utc "+
        "FROM clean.activate_gate05_prepared_scope_v39($1::uuid,$2::text)",
        [reviewed.scopeId,digest]
      )).rows;
      if(state.length!==1||state[0].scope_id!==reviewed.scopeId||
         state[0].state!=="ACTIVE"||
         new Date(state[0].expires_at_utc).getTime()!==
           Date.parse(auth.expiresAtUtc))
        hold("ACTIVATOR_RESULT");
      await client.query("COMMIT");tx=false;activationCommitted=true;
    }finally{
      if(tx)await client.query("ROLLBACK").catch(()=>{});
    }
    record({...initial,status:"ACTIVE_COMMITTED_READBACK_PENDING"});
    // Only admin READ-ONLY evidence; activation was by limited LOGIN.
    if(!process.env.DATABASE_URL)hold("ADMIN_READBACK_URL");
    admin=new pg.Client({connectionString:process.env.DATABASE_URL,
      connectionTimeoutMillis:7000,statement_timeout:8000});
    await admin.connect();
    await admin.query("BEGIN READ ONLY");
    const db=(await admin.query(
      "SELECT current_database() AS db,current_user AS who"
    )).rows[0];
    if(db.db!=="neondb"||db.who!=="neondb_owner")
      hold("ADMIN_READBACK_IDENTITY");
    const state=(await admin.query(
      "SELECT state,base_used_units,retry_used_units "+
      "FROM clean.gate05_fids_pilot_scope_v39 "+
      "WHERE scope_id=$1::uuid",[reviewed.scopeId]
    )).rows;
    const attempts=(await admin.query(
      "SELECT count(*)::int AS n FROM clean.gate05_fids_attempt_v39 "+
      "WHERE scope_id=$1::uuid",[reviewed.scopeId]
    )).rows[0].n;
    if(state.length!==1||state[0].state!=="ACTIVE"||
       state[0].base_used_units!==0||
       state[0].retry_used_units!==0||attempts!==0)
      hold("ACTIVE_READBACK");
    // Stop running jobs may exit during readback: this is not ongoing proof.
    assertLive();
    const done={...initial,status:"ACTIVE_VERIFIED_NO_PROVIDER",
      providerRequests:0,scopeState:"ACTIVE",reservedAttempts:0,
      activeVerified:true,paidGo:false,stopReceiptConfirmed:false};
    record(done);
    console.log("GATE05_ACTIVATION_VERIFIED_NO_PROVIDER",JSON.stringify({
      scopeId:reviewed.scopeId,authorizationSha256:digest,
      safetyRun:p.run,privateReceipt:receipt,
      providerRequests:0,paidGo:false,stopReceiptConfirmed:false
    }));
  }catch(e){
    const message=e instanceof Error?e.message:"";
    console.error("GATE05_ACTIVATION_HOLD",JSON.stringify({
      phase:activationCommitted?"AFTER_ACTIVE_COMMIT":"BEFORE_ACTIVE_COMMIT",
      activationCommitted,privateReceipt:receipt,
      reason:message.startsWith("GATE05_ACTIVATE_HOLD_")?
        message:"OPERATOR_REVIEW_REQUIRED",
      noBlindRetry:true,providerRequests:0,paidGo:false
    }));
    process.exitCode=2;
  }finally{
    if(admin){
      await admin.query("ROLLBACK").catch(()=>{});
      await admin.end().catch(()=>{});
    }
    if(client)await client.end().catch(()=>{});
  }
}
if(import.meta.url==="file://"+process.argv[1]){
  run().catch(e=>{
    const msg=e instanceof Error?e.message:"";
    console.error("GATE05_ACTIVATION_PRECHECK_HOLD",JSON.stringify({
      reason:msg.startsWith("GATE05_ACTIVATE_HOLD_")?
        msg:"OPERATOR_REVIEW_REQUIRED",
      providerRequests:0,paidGo:false
    }));
    process.exitCode=2;
  });
}
