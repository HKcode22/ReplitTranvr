/**
 * Owner-reviewed exact signed WSSS Gate05 AUTH -> one immutable permit ->
 * one PREPARED scope and two immutable hashes. Manual production mutation.
 *
 * NO ACTIVE state, FIDS GET, provider account call, STOP, safety worker launch,
 * or direct scope/table INSERT by the restricted commissioner.
 * The only admin INSERT is the exact separately owner-approved immutable
 * permit; PREPARED is committed by the commission SECURITY DEFINER function.
 *
 * Partial state is reported, never guessed away or blindly retried.
 * Auth, pins and 3-login credentials must already exist in private 0600 files.
 */
import "dotenv/config";
import pg from "pg";
import {readFileSync,writeFileSync,statSync} from "node:fs";
import {resolve,join} from "node:path";
import {createHash} from "node:crypto";
import {execFileSync,spawnSync} from "node:child_process";
import {previewGate05SignedExpiryGuardPlanV39} from
  "../server/lib/disruption/gate05SignedExpiryGuardPlan_v39";

const REPO="HKcode22/ReplitTranvr";
const ENV="gate05-safety";
const CONFIRM="OWNER_APPROVED_G05_PREPARE_ONLY_NO_PROVIDER";
const SHA=/^[0-9a-f]{40}$/;
const DIGEST=/^[0-9a-f]{64}$/;
const hold=(s:string):never=>{throw Error("GATE05_PREPARE_HOLD_"+s);};
export function planGate05PreparedCommissionV39(input:{
  expectedHead:string;authSha256:string;signerSha256:string;
  startUtc:string;expiryUtc:string;credentialExpiryUtc:string;
  now:number;confirmation:string;
}){
  if(!SHA.test(input.expectedHead)||!DIGEST.test(input.authSha256)||
     !DIGEST.test(input.signerSha256)||input.confirmation!==CONFIRM)
    hold("REVIEWED_IDENTITY");
  const start=Date.parse(input.startUtc);
  const end=Date.parse(input.expiryUtc);
  const credentialExpiry=Date.parse(input.credentialExpiryUtc);
  if(!Number.isSafeInteger(input.now)||!Number.isFinite(start)||
     !Number.isFinite(end)||!Number.isFinite(credentialExpiry)||
     start-input.now<15*60000||start-input.now>5*3600000||
     end!==start+40*60000||
     credentialExpiry<end+10*60000)
    hold("SIGNED_WINDOW_OR_LOGIN_EXPIRY");
  return {
    sourceCommit:input.expectedHead,
    startUtc:input.startUtc,expiresUtc:input.expiryUtc,
    scopeState:"PREPARED" as const,
    providerRequests:0 as const,activationAllowed:false as const
  };
}
function cli(v:string[]){
  if(v.length!==14)hold("CLI");
  const o=new Map<string,string>();
  for(let i=0;i<v.length;i+=2){
    if(!v[i]?.startsWith("--")||!v[i+1]||o.has(v[i]))hold("CLI");
    o.set(v[i],v[i+1]);
  }
  if([...o.keys()].sort().join("|")!==
    ["--head","--bundle","--pins","--private-dir","--auth-sha256",
     "--signer-sha256","--confirm"].sort().join("|"))hold("CLI");
  return {
    head:o.get("--head")!,bundle:o.get("--bundle")!,
    pins:o.get("--pins")!,root:o.get("--private-dir")!,
    authSha:o.get("--auth-sha256")!,
    signerSha:o.get("--signer-sha256")!,
    confirm:o.get("--confirm")!
  };
}
function privateFile(path:string){
  const f=resolve(path);
  if(path!==f||!f.startsWith("/tmp/")||f.length>1024)
    hold("PRIVATE_FILE_PATH");
  const st=statSync(f);
  if(!st.isFile()||(st.mode&0o077)!==0||st.size<2||st.size>32768)
    hold("PRIVATE_FILE_PERMISSIONS");
  return JSON.parse(readFileSync(f,"utf8"));
}
function github(args:string[],input?:string){
  const r=spawnSync("gh",args,{encoding:"utf8",input,
    stdio:["pipe","pipe","pipe"],timeout:20000,maxBuffer:1048576});
  if(r.error||r.status!==0)hold("GITHUB_COMMAND");
  return r.stdout;
}
async function run(){
  const opts=cli(process.argv.slice(2));
  if(!SHA.test(opts.head)||!DIGEST.test(opts.authSha)||
     !DIGEST.test(opts.signerSha)||opts.confirm!==CONFIRM)
    hold("CONFIRM_OR_DIGEST");
  if(execFileSync("git",["rev-parse","HEAD"],{
    encoding:"utf8",stdio:["ignore","pipe","ignore"]
  }).trim()!==opts.head)hold("LOCAL_HEAD");
  const ref=JSON.parse(github(["api","repos/"+REPO+"/git/ref/heads/main"]));
  const account=JSON.parse(github(["api","user"]));
  const repo=JSON.parse(github(["api","repos/"+REPO]));
  if(ref.object?.sha!==opts.head||account.login!=="HKcode22"||
     repo.permissions?.admin!==true)hold("MAIN_OR_OWNER");
  const bundle=privateFile(opts.bundle);
  const pins=privateFile(opts.pins);
  const credentialPath=resolve(join(opts.root,"restricted-operator-logins.json"));
  const credentials=privateFile(credentialPath);
  const realRoot=resolve(opts.root);
  if(realRoot!==opts.root||!realRoot.startsWith("/tmp/")||
     (statSync(realRoot).mode&0o077)!==0)hold("PRIVATE_DIR");
  const authBytes=Buffer.from(bundle.authorizationBytesBase64,"base64");
  const reviewed=previewGate05SignedExpiryGuardPlanV39({
    authorizationBytes:authBytes,
    detachedSignatureBase64:bundle.detachedSignatureBase64,
    signerPublicKeySpkiDerBase64:bundle.signerPublicKeySpkiDerBase64,
    independentPins:pins
  });
  const auth=JSON.parse(authBytes.toString("utf8"));
  const actualAuth=createHash("sha256").update(authBytes).digest("hex");
  const actualSigner=createHash("sha256").update(
    Buffer.from(bundle.signerPublicKeySpkiDerBase64,"base64")
  ).digest("hex");
  if(actualAuth!==opts.authSha||actualSigner!==opts.signerSha||
     pins.independentlyReviewedArtifactSha256!==opts.authSha||
     pins.independentlyApprovedSignerSpkiSha256!==opts.signerSha||
     reviewed.sourceCommit!==opts.head||
     credentials.sourceCommit!==opts.head||
     auth.airportIcao!=="WSSS"||
     auth.maxTotalUnits!==12||auth.maxBaseUnits!==4||
     auth.maxRetryUnits!==8||auth.maxAlertCreates!==0||
     auth.startsAtUtc!==credentials.executionStartUtc)
    hold("SIGNED_ARTIFACT_OR_SOURCE");
  const plan=planGate05PreparedCommissionV39({
    expectedHead:opts.head,authSha256:opts.authSha,
    signerSha256:opts.signerSha,
    startUtc:auth.startsAtUtc,expiryUtc:auth.expiresAtUtc,
    credentialExpiryUtc:credentials.expiresUtc,
    now:Date.now(),confirmation:opts.confirm
  });
  // Prevent replay and preserve a durable, private partial-commit receipt.
  const receiptFile=join(realRoot,"commission-receipt.json");
  const initial={schema:"v39.gate05.owner-commission-receipt.v1",
    status:"STARTED_UNSETTLED",scopeId:auth.scopeId,
    authorizationSha256:actualAuth,sourceCommit:opts.head,
    paidProviderRequests:0,scopeState:"UNCONFIRMED"};
  writeFileSync(receiptFile,JSON.stringify(initial)+"\n",{
    flag:"wx",mode:0o600
  });
  const record=(value:unknown)=>{
    writeFileSync(receiptFile,JSON.stringify(value,null,2)+"\n",{
      mode:0o600
    });
  };
  let secrets=0,permitCommitted=false,prepared=false;
  let admin:pg.Client|null=null,commission:pg.Client|null=null;
  try{
    // Materialize only exact signed artifact + reviewed pins as protected
    // encrypted secrets; these are not DATABASE login passwords.
    // Fail here BEFORE introducing an unused one-time SQL permit.
    const policy=JSON.parse(github([
      "api","repos/"+REPO+"/environments/"+ENV
    ]));
    const mainAllowed=JSON.parse(github([
      "api","repos/"+REPO+"/environments/"+ENV+
      "/deployment-branch-policies"
    ])).branch_policies;
    if(policy.deployment_branch_policy?.custom_branch_policies!==true||
       mainAllowed?.length!==1||mainAllowed[0].name!=="main")
      hold("SAFETY_ENV_POLICY");
    const upload=(name:string,object:unknown)=>{
      github(["secret","set",name,"--env",ENV,"--repo",REPO],
        Buffer.from(JSON.stringify(object)+"\n").toString("base64"));
      secrets++;
    };
    upload("GATE05_SIGNED_BUNDLE_B64",bundle);
    upload("GATE05_INDEPENDENT_PINS_B64",pins);
    record({...initial,status:"SIGNED_SAFETY_SECRETS_UPLOADED",
      encryptedSecretCount:secrets,scopeState:"ABSENT"});

    if(!process.env.DATABASE_URL)hold("ADMIN_URL");
    admin=new pg.Client({connectionString:process.env.DATABASE_URL,
      connectionTimeoutMillis:7000,statement_timeout:9000,
      query_timeout:13000,lock_timeout:2000});
    await admin.connect();
    await admin.query("BEGIN");
    let tx=true;
    try{
      const me=(await admin.query(
        "SELECT current_database() AS db,current_user AS who,"+
        "pg_is_in_recovery() AS replica"
      )).rows[0];
      if(me.db!=="neondb"||me.who!=="neondb_owner"||
         me.replica!==false)hold("DATABASE_IDENTITY");
      const inv=(await admin.query(
        "SELECT "+
        "(SELECT count(*)::int FROM clean.gate05_fids_pilot_scope_v39 "+
        " WHERE state IN ('PREPARED','ACTIVE')) AS open,"+
        "(SELECT count(*)::int FROM clean.gate05_fids_commission_permit_v39 "+
        " WHERE consumed_at_utc IS NULL AND revoked_at_utc IS NULL) AS unused"
      )).rows[0];
      if(inv.open!==0||inv.unused!==0)hold("OPEN_SCOPE_OR_PERMIT");
      await admin.query(
        "INSERT INTO clean.gate05_fids_commission_permit_v39 "+
        "(scope_id,authorization_id,authorization_sha256,cycle_id,icao,"+
        "starts_at_utc,expires_at_utc,provider_reset_utc,"+
        "no_location_query_sha256,location_query_sha256) "+
        "VALUES ($1::uuid,$2,$3,$4,'WSSS',$5::timestamptz,"+
        "$6::timestamptz,$7::timestamptz,$8,$9)",
        [auth.scopeId,auth.authorizationId,opts.authSha,auth.cycleId,
          auth.startsAtUtc,auth.expiresAtUtc,auth.providerResetUtc,
          auth.noLocationQuerySha256,auth.locationQuerySha256]
      );
      await admin.query("COMMIT");tx=false;permitCommitted=true;
    }finally{
      if(tx)await admin.query("ROLLBACK").catch(()=>{});
    }
    record({...initial,status:"PERMIT_COMMITTED_NOT_YET_PREPARED",
      encryptedSecretCount:secrets,permitCommitted:true,
      scopeState:"ABSENT"});
    commission=new pg.Client({connectionString:credentials.urls.commission,
      connectionTimeoutMillis:7000,statement_timeout:8000,
      query_timeout:10000,lock_timeout:2000});
    await commission.connect();
    const who=(await commission.query(
      "SELECT current_database() AS db,session_user AS login,"+
      "current_user AS who"
    )).rows[0];
    if(who.db!=="neondb"||
       !/^gate05_fids_commission_login_2026[0-9_]{8,60}[a-f0-9]*$/.test(
         who.login)||who.who!==who.login)hold("COMMISSION_LOGIN_IDENTITY");
    await commission.query("BEGIN");
    let inTransaction=true;
    try{
      await commission.query("SET LOCAL ROLE gate05_fids_commission_v39");
      const made=(await commission.query(
        "SELECT prepared_scope_id,prepared_queries "+
        "FROM clean.prepare_gate05_permitted_scope_v39($1::uuid,$2::text)",
        [auth.scopeId,opts.authSha]
      )).rows;
      if(made.length!==1||made[0].prepared_scope_id!==auth.scopeId||
         made[0].prepared_queries!==2)hold("COMMISSION_FUNCTION_READBACK");
      await commission.query("COMMIT");inTransaction=false;prepared=true;
    }finally{
      if(inTransaction)await commission.query("ROLLBACK").catch(()=>{});
    }
    const state=(await admin.query(
      "SELECT state,base_cap_units,retry_cap_units,base_used_units,"+
      "retry_used_units FROM clean.gate05_fids_pilot_scope_v39 "+
      "WHERE scope_id=$1::uuid",[auth.scopeId]
    )).rows;
    const queries=(await admin.query(
      "SELECT query_index,with_location,query_sha256 "+
      "FROM clean.gate05_fids_allowed_query_v39 "+
      "WHERE scope_id=$1::uuid ORDER BY query_index",[auth.scopeId]
    )).rows;
    const permit=(await admin.query(
      "SELECT consumed_at_utc IS NOT NULL AS used,"+
      "revoked_at_utc IS NOT NULL AS revoked "+
      "FROM clean.gate05_fids_commission_permit_v39 "+
      "WHERE scope_id=$1::uuid",[auth.scopeId]
    )).rows[0];
    const attempts=(await admin.query(
      "SELECT count(*)::int AS n FROM clean.gate05_fids_attempt_v39 "+
      "WHERE scope_id=$1::uuid",[auth.scopeId]
    )).rows[0].n;
    if(state.length!==1||state[0].state!=="PREPARED"||
       state[0].base_cap_units!==4||state[0].retry_cap_units!==8||
       state[0].base_used_units!==0||state[0].retry_used_units!==0||
       queries.length!==2||queries[0].query_index!==1||
       queries[0].with_location!==false||
       queries[0].query_sha256!==auth.noLocationQuerySha256||
       queries[1].query_index!==2||queries[1].with_location!==true||
       queries[1].query_sha256!==auth.locationQuerySha256||
       !permit.used||permit.revoked||attempts!==0)
      hold("EXACT_PREPARED_READBACK");
    const done={...initial,status:"EXACT_PREPARED_NO_PAID_PROVIDER",
      scopeState:"PREPARED",permitCommitted:true,permitConsumed:true,
      encryptedSecretCount:2,verifiedTwoQueries:true,
      reservedAttemptCount:0,providerRequests:0,
      independentSafetyWorkerArmed:false,paidGo:false,
      reviewedStartUtc:plan.startUtc,reviewedExpiresUtc:plan.expiresUtc};
    record(done);
    console.log("GATE05_COMMISSION_PREPARED_VERIFIED",JSON.stringify({
      scopeId:auth.scopeId,authorizationSha256:opts.authSha,
      privateReceiptFile:receiptFile,providerRequests:0,
      scopeState:"PREPARED",workerArmed:false,paidGo:false
    }));
  }catch(e){
    const msg=e instanceof Error?e.message:"";
    console.error("GATE05_COMMISSION_HOLD",JSON.stringify({
      status:prepared?"PREPARED_NEEDS_OPERATOR_REVIEW":
        permitCommitted?"PERMIT_COMMITTED_NOT_YET_PREPARED":
        "BEFORE_PERMIT_COMMIT",
      scopeId:auth.scopeId,receiptFile,
      secretNamesUpdated:secrets,permitCommitted,prepared,
      reason:msg.startsWith("GATE05_PREPARE_HOLD_")?
        msg:"OPERATOR_READBACK_REQUIRED",
      noBlindRetry:true,providerRequests:0,paidGo:false
    }));
    process.exitCode=2;
  }finally{
    if(commission)await commission.end().catch(()=>{});
    if(admin)await admin.end().catch(()=>{});
  }
}
if(import.meta.url==="file://"+process.argv[1]){
  run().catch(e=>{
    const msg=e instanceof Error?e.message:"";
    console.error("GATE05_COMMISSION_PRECHECK_HOLD",JSON.stringify({
      reason:msg.startsWith("GATE05_PREPARE_HOLD_")?
        msg:"MANUAL_OPERATOR_REVIEW_REQUIRED",
      providerRequests:0,paidGo:false
    }));
    process.exitCode=2;
  });
}
