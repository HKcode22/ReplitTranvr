/**
 * Gate05 independent STOP runtime candidate. DRAFT ONLY, NEVER AUTO-DEPLOY.
 *
 * No AeroDataBox import/call, no commissioning/activation/permit code.
 * MUST run in a separately managed safety-only service, NOT in the app's
 * Replit Shell/published dispatcher process. Host must supply ONLY a dedicated
 * safety-login URL. The worker cannot self-attest independent supervision,
 * owner-signer provenance, external alert acknowledgment or deployment.
 *
 * Inputs:
 * --signed-bundle <private json> with authorizationBytesBase64,
 *   detachedSignatureBase64, signerPublicKeySpkiDerBase64
 * --pins <independently reviewed private json> with independent review pins
 * --head <exact reviewed committed source SHA>
 * --confirm WATCH_G05_SAFETY_ONLY_NO_PROVIDER
 *
 * Never put private keys, database URLs, credentials or API keys in GitHub.
 */
import pg from "pg";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {previewGate05SignedExpiryGuardPlanV39} from
  "../server/lib/disruption/gate05SignedExpiryGuardPlan_v39";
import {rehearseGate05BoundedExpiryStopRecoveryV39} from
  "../server/lib/disruption/gate05BoundedStopRecovery_v39";
import {previewGate05IndependentStopDbTimeoutPolicyV39} from
  "../server/lib/disruption/gate05IndependentStopDbPolicy_v39";

const HEAD=/^[a-f0-9]{40}$/;
const ROLE=/^gate05_fids_safety_login_[a-zA-Z0-9_]{8,80}$/;

export function validateGate05IndependentStopLaunchV39(
  args:{expectedHead:string;confirm:string},
  env:Record<string,string|undefined>
){
  if(!args||!HEAD.test(args.expectedHead)||
     args.confirm!=="WATCH_G05_SAFETY_ONLY_NO_PROVIDER")
    throw Error("GATE05_SIDE_LAUNCH_INPUT_HOLD");
  // A genuine independent service must not inherit the privileged app
  // database credentials, provider key, general V39 runtime URL or any
  // dispatcher/commissioner passwords.
  if(env.DATABASE_URL||env.DATABASE_RUNTIME_URL||
     env.V39_DATABASE_RUNTIME_URL||env.AERODATABOX_API_KEY||
     env.GATE05_DISPATCH_DATABASE_URL||env.GATE05_COMMISSION_DATABASE_URL)
    throw Error("GATE05_SIDE_SHARED_RUNTIME_CREDENTIALS_HOLD");
  const raw=env.GATE05_SAFETY_DATABASE_URL;
  if(!raw)throw Error("GATE05_SIDE_SAFETY_ONLY_URL_HOLD");
  let url:URL;
  try{url=new URL(raw);}catch{
    throw Error("GATE05_SIDE_INVALID_DATABASE_URL_HOLD");
  }
  if(!["postgres:","postgresql:"].includes(url.protocol)||
     !ROLE.test(decodeURIComponent(url.username))||
     !url.password||!url.hostname||
     !["verify-full"].includes(url.searchParams.get("sslmode")??""))
    throw Error("GATE05_SIDE_RESTRICTED_TLS_URL_HOLD");
  // The approved production target must be separately pinned outside of
  // the connection string. A matching hostname is necessary, not proof of
  // certificate / production identity. No URL is emitted in diagnostics.
  const host=env.GATE05_EXPECTED_DB_HOST;
  if(!host||host!==url.hostname||url.hostname==="localhost"||
     url.hostname==="127.0.0.1")
    throw Error("GATE05_SIDE_DB_HOST_PIN_HOLD");
  return {
    expectedHead:args.expectedHead,
    safetyLogin:decodeURIComponent(url.username),
    requiredGroup:"gate05_fids_safety_v39" as const,
    targetDatabase:"neondb" as const,
    providersAllowed:0 as const,
    activationAllowed:false as const,
    independentlyDeployedAttested:false as const
  };
}

function cli(argv:string[]){
  const flags=new Map<string,string>();
  if(argv.length!==8)throw Error("GATE05_SIDE_CLI_HOLD");
  for(let i=0;i<argv.length;i+=2){
    if(!argv[i].startsWith("--")||!argv[i+1]||flags.has(argv[i]))
      throw Error("GATE05_SIDE_CLI_HOLD");
    flags.set(argv[i],argv[i+1]);
  }
  if([...flags.keys()].sort().join(",")!==
     ["--confirm","--head","--pins","--signed-bundle"].sort().join(","))
    throw Error("GATE05_SIDE_CLI_HOLD");
  return {
    expectedHead:flags.get("--head")!,
    confirm:flags.get("--confirm")!,
    authFile:flags.get("--signed-bundle")!,
    pinsFile:flags.get("--pins")!
  };
}
function readPrivateJson(path:string):any{
  if(typeof path!=="string"||!path.startsWith("/")||path.includes("\0")||
     path.length>1024)throw Error("GATE05_SIDE_FILE_INPUT_HOLD");
  const data=readFileSync(path);
  if(data.length>32768||data.length<2)
    throw Error("GATE05_SIDE_FILE_BYTES_HOLD");
  return JSON.parse(data.toString("utf8"));
}

export async function startGate05IndependentStopProcessV39(
  input:ReturnType<typeof cli>,
  env:NodeJS.ProcessEnv=process.env
){
  const config=validateGate05IndependentStopLaunchV39(input,env);
  // Freeze exact executable identity before DB connection.
  const checked=execFileSync("git",["rev-parse","HEAD"],
    {encoding:"utf8"}).trim();
  if(checked!==config.expectedHead)
    throw Error("GATE05_SIDE_SOURCE_SHA_HOLD");

  const bundle=readPrivateJson(input.authFile);
  const independentPins=readPrivateJson(input.pinsFile);
  const reviewed=previewGate05SignedExpiryGuardPlanV39({
    authorizationBytes:Buffer.from(bundle.authorizationBytesBase64,"base64"),
    detachedSignatureBase64:bundle.detachedSignatureBase64,
    signerPublicKeySpkiDerBase64:bundle.signerPublicKeySpkiDerBase64,
    independentPins
  });
  if(reviewed.sourceCommit!==checked)
    throw Error("GATE05_SIDE_SIGNED_SOURCE_DIVERGENCE_HOLD");

  const opts=previewGate05IndependentStopDbTimeoutPolicyV39().settings;
  const client=new pg.Client({
    connectionString:env.GATE05_SAFETY_DATABASE_URL,
    ...opts
  });
  let connected=false;
  try{
    await client.connect();connected=true;
    const initial=(await client.query(
      "SELECT current_database() AS db,session_user AS login,"+
      "current_user AS role,pg_is_in_recovery() AS replica"
    )).rows[0];
    if(initial?.db!==config.targetDatabase||
       initial?.login!==config.safetyLogin||
       initial?.role!==config.safetyLogin||
       initial?.replica!==false)
      throw Error("GATE05_SIDE_DB_IDENTITY_HOLD");
    await client.query("SET ROLE gate05_fids_safety_v39");
    const active=(await client.query(
      "SELECT current_user AS role"
    )).rows[0];
    if(active?.role!==config.requiredGroup)
      throw Error("GATE05_SIDE_ROLE_HOLD");

    console.log(JSON.stringify({
      status:"GATE05_SAFETY_WATCH_STARTED_NO_PROVIDER",
      scopeId:reviewed.scopeId,
      authSha256:reviewed.reviewedAuthorizationSha256,
      expiresAtUtc:reviewed.expiresAtUtc,
      sourceCommit:checked,
      providerRequests:0,
      independentSupervisorAttested:false
    }));
    const receipt=await rehearseGate05BoundedExpiryStopRecoveryV39({
      signedAuthorization:{
        authorizationBytes:Buffer.from(bundle.authorizationBytesBase64,"base64"),
        detachedSignatureBase64:bundle.detachedSignatureBase64,
        signerPublicKeySpkiDerBase64:bundle.signerPublicKeySpkiDerBase64,
        independentPins
      },
      db:client,
      onUnconfirmedStop:incident=>{
        console.error(JSON.stringify({
          ...incident,
          alertDeliveryAttested:false,
          independentlySupervised:false
        }));
      }
    });
    console.log(JSON.stringify({
      status:"GATE05_STOP_SQL_RECEIPT_RETURNED_POSTCOMMIT_REVIEW_REQUIRED",
      scopeId:receipt.scopeId,
      attemptedStops:receipt.attemptedStops,
      reservedAttempts:receipt.receipt.reservedAttempts,
      reservedUnits:receipt.receipt.reservedUnits,
      providerRequests:0,
      independentlySupervised:false
    }));
  }finally{
    if(connected)await client.end().catch(()=>{});
  }
}

if(import.meta.url===`file://${process.argv[1]}`){
  const start=async()=>{
    const args=cli(process.argv.slice(2));
    await startGate05IndependentStopProcessV39(args);
  };
  start().catch(e=>{
    const msg=e instanceof Error?e.message:"";
    const reason=/^GATE05_[A-Z0-9_]+$/.test(msg)?
      msg:"GATE05_SIDE_UNEXPECTED_FAILURE_HOLD";
    console.error(JSON.stringify({
      status:"GATE05_SIDE_UNCONFIRMED_OPERATOR_ACTION_REQUIRED",
      reason,providerRequests:0,
      stopVerified:false,
      alertDeliveryAttested:false
    }));
    process.exitCode=2;
  });
}
