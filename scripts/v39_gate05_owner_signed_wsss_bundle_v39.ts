/**
 * Gate05 owner-local authorization constructor, WITHOUT paid provider GET.
 * Requires owner to run explicit scoped-confirmation command from the exact
 * released main source. The operator still independently reviews signer
 * fingerprint, provider rights and source before activating/spending.
 *
 * This script signs once with an ephemeral Ed25519 key, does not export/store
 * its private half and never uploads key/authorization to GitHub. The GitHub
 * safety environment is provisioned separately, only after owner review.
 */
import "dotenv/config";
import {createHash,generateKeyPairSync,randomUUID,sign} from "node:crypto";
import {
  readFileSync,mkdirSync,writeFileSync,chmodSync,statSync
} from "node:fs";
import {join,resolve,isAbsolute} from "node:path";
import {execFileSync} from "node:child_process";
import {
  getBalanceEvidenceStrict,listSubscriptionsStrict
} from "../server/lib/disruption/aerodataboxLimiter_v3";
import {
  gate05FidsQueryFingerprintV39
} from "../server/lib/disruption/gate05ScopedFidsOwner_v39";
import {
  gate05Ed25519SigningMessageV39
} from "../server/lib/disruption/gate05DetachedEd25519Approval_v39";
import {
  previewGate05SignedExpiryGuardPlanV39
} from "../server/lib/disruption/gate05SignedExpiryGuardPlan_v39";
import {
  inspectGate05OpenApiBytesV39
} from "../server/lib/disruption/gate05OpenApiInspector_v39";

const SHA=/^[0-9a-f]{40}$/;
const CONFIRM="I_APPROVE_ONE_WSSS_12_UNIT_FEASIBILITY_AUTH";
function hold(message:string):never{throw Error("GATE05_AUTH_BUILDER_HOLD_"+message);}
export function planGate05WsssSignedWindowV39(
  now:number,requestedStartUtc:string
){
  if(!Number.isSafeInteger(now)||now<Date.parse("2026-10-01T00:00:00Z"))
    hold("CLOCK");
  // Explicit user-selected target; never silently create a 30-minute
  // countdown that expires while permits/secrets/workflows are prepared.
  if(typeof requestedStartUtc!=="string"||
     !/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:00\\.000Z$/.test(requestedStartUtc))
    hold("EXACT_START_REQUIRED");
  const start=Date.parse(requestedStartUtc);
  const quarter=15*60000;
  if(!Number.isSafeInteger(start)||
     new Date(start).toISOString()!==requestedStartUtc||
     start%quarter!==0||
     start<now+2*3600000||
     start>now+20*3600000)
    hold("START_LEAD_2H_TO_20H");
  const end=start+40*60000;
  const sg=(ms:number)=>{
    const pieces=new Intl.DateTimeFormat("en-CA",{
      timeZone:"Asia/Singapore",year:"numeric",month:"2-digit",
      day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"
    }).formatToParts(new Date(ms));
    const p=Object.fromEntries(pieces.map(i=>[i.type,i.value]));
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
  };
  return {
    startsAtUtc:new Date(start).toISOString(),
    expiresAtUtc:new Date(end).toISOString(),
    fromLocal:sg(start+5*60000),
    toLocal:sg(start+15*60000)
  };
}
function cli(args:string[]){
  if(args.length!==10)hold("CLI");
  const m=new Map<string,string>();
  for(let i=0;i<args.length;i+=2){
    if(!args[i].startsWith("--")||!args[i+1]||m.has(args[i]))
      hold("CLI");
    m.set(args[i],args[i+1]);
  }
  if([...m.keys()].sort().join("|")!==
    ["--head","--openapi-file","--output-dir","--confirm","--start-utc"].sort().join("|"))
    hold("CLI");
  return {head:m.get("--head")!,openapiFile:m.get("--openapi-file")!,
    output:m.get("--output-dir")!,confirm:m.get("--confirm")!,\n    requestedStartUtc:m.get("--start-utc")!};
}
export async function createGate05WsssOwnerSignedBundleV39(
  input:ReturnType<typeof cli>){
  if(!SHA.test(input.head)||input.confirm!==CONFIRM)
    hold("OWNER_EXACT_CONFIRMATION");
  if(execFileSync("git",["rev-parse","HEAD"],
      {encoding:"utf8"}).trim()!==input.head)
    hold("SOURCE_NOT_EXACT_MAIN");
  const file=resolve(input.openapiFile),root=resolve(input.output);
  if(!isAbsolute(input.openapiFile)||!isAbsolute(input.output)||
     file===root||root.includes("/workspace/")||root.endsWith("/workspace"))
    hold("PRIVATE_PATH");
  const specStat=statSync(file);
  if(!specStat.isFile()||specStat.size>12000000||specStat.size<50000)
    hold("OPENAPI_SPEC_FILE");
  const doc=inspectGate05OpenApiBytesV39(readFileSync(file));
  if(!doc.fids.localRangeGetTier2||!doc.fids.withLocationQueryBoolean)
    hold("OPENAPI_CONTRACT");

  // Free provider-account checks establish current cycle and no
  // overlapping subscriptions; paid FIDS is NEVER called by this script.
  const balance=await getBalanceEvidenceStrict();
  const subscriptions=await listSubscriptionsStrict();
  if(balance.quota.apiUnitsRemaining<12||
     subscriptions.some(s=>s.isActive))hold("PROVIDER_BUDGET");
  const reset=balance.quota.apiUnitsResetAtUtc;
  if(typeof reset!=="string"||!Number.isFinite(Date.parse(reset)))
    hold("CYCLE_RESET");
  const now=Date.now(),window=planGate05WsssSignedWindowV39(\n    now,input.requestedStartUtc\n  );
  if(Date.parse(window.expiresAtUtc)>=Date.parse(reset))hold("CYCLE_WINDOW");
  const cycleId="RAPIDAPI-RESET-"+reset.replace(/[^0-9]/g,"");
  const scopeId=randomUUID(),suffix=randomUUID().slice(0,8).toUpperCase();
  const authId="AUTH-"+new Date(now).toISOString().slice(0,10)
    .replaceAll("-","")+"-G05WSSS-"+suffix;
  const q={icao:"WSSS",fromLocal:window.fromLocal,toLocal:window.toLocal};
  const auth={
    schema:"v39.gate05.fids-feasibility-auth.v1",
    scopeId,authorizationId:authId,sourceCommit:input.head,
    openapiSha256:doc.sha256,cycleId,providerResetUtc:reset,
    airportIcao:"WSSS",ianaTimezone:"Asia/Singapore",
    fromLocal:q.fromLocal,toLocal:q.toLocal,
    startsAtUtc:window.startsAtUtc,expiresAtUtc:window.expiresAtUtc,
    noLocationQuerySha256:gate05FidsQueryFingerprintV39({...q,withLocation:false}),
    locationQuerySha256:gate05FidsQueryFingerprintV39({...q,withLocation:true}),
    maxBaseUnits:4,maxRetryUnits:8,maxTotalUnits:12,
    maxAlertCreates:0,
    purpose:"TWO_QUERY_FEASIBILITY_NOT_SCIENTIFIC_PILOT"
  };
  const bytes=Buffer.from(JSON.stringify(auth)+"\n","utf8");
  const hash=(data:Buffer)=>createHash("sha256").update(data).digest("hex");
  const {privateKey,publicKey}=generateKeyPairSync("ed25519");
  const spki=Buffer.from(publicKey.export({format:"der",type:"spki"}));
  const signature=sign(null,gate05Ed25519SigningMessageV39(bytes),privateKey);
  const pins={
    independentlyReviewedArtifactSha256:hash(bytes),
    independentlyApprovedSignerSpkiSha256:hash(spki),
    expectedSourceCommit:input.head,
    expectedOpenapiSha256:doc.sha256,
    expectedProviderResetUtc:reset,
    expectedIanaTimezone:"Asia/Singapore",
    observedNowUtc:new Date(now).toISOString()
  };
  const signed={
    authorizationBytesBase64:bytes.toString("base64"),
    detachedSignatureBase64:signature.toString("base64"),
    signerPublicKeySpkiDerBase64:spki.toString("base64")
  };
  const verified=previewGate05SignedExpiryGuardPlanV39({
    authorizationBytes:bytes,
    detachedSignatureBase64:signed.detachedSignatureBase64,
    signerPublicKeySpkiDerBase64:signed.signerPublicKeySpkiDerBase64,
    independentPins:pins
  });
  if(verified.scopeId!==scopeId||verified.sourceCommit!==input.head)
    hold("INTERNAL_SIGNATURE_REVIEW");
  // Owner selects a fresh unique private folder; never overwrite an existing
  // authorization, key or bundle (prevents rerun replay).
  mkdirSync(root,{mode:0o700,recursive:false});
  chmodSync(root,0o700);
  writeFileSync(join(root,"authorization.json"),bytes,{flag:"wx",mode:0o600});
  writeFileSync(join(root,"signed-bundle.json"),
    JSON.stringify(signed,null,2)+"\n",{flag:"wx",mode:0o600});
  writeFileSync(join(root,"independent-pins.json"),
    JSON.stringify(pins,null,2)+"\n",{flag:"wx",mode:0o600});
  console.log(JSON.stringify({
    status:"OWNER_LOCAL_SIGNATURE_CREATED_NOT_YET_EXTERNAL_KEY_ATTESTATION",
    sourceCommit:input.head,scopeId,authorizationId:authId,
    signerPublicKeyFingerprintSha256:hash(spki),
    authorizationByteSha256:hash(bytes),openapiSha256:doc.sha256,
    openapiVersion:doc.version,cycleId,providerResetUtc:reset,
    executionStartUtc:auth.startsAtUtc,executionExpiresUtc:auth.expiresAtUtc,
    fidsFromLocal:auth.fromLocal,fidsToLocal:auth.toLocal,
    capUnits:12,accountUnitsRemainingObserved:balance.quota.apiUnitsRemaining,
    privateFilesRoot:root,providerPaidRequests:0,scopeCreated:false,
    activated:false,signerExternallyAttested:false
  },null,2));
}
if(import.meta.url===`file://${process.argv[1]}`){
  createGate05WsssOwnerSignedBundleV39(cli(process.argv.slice(2)))
    .catch(e=>{
      console.error(JSON.stringify({
        status:"GATE05_OWNER_SIGNING_HOLD",
        reason:e instanceof Error&&
          e.message.startsWith("GATE05_AUTH_BUILDER_HOLD")?e.message:
          "GATE05_AUTH_BUILDER_UNEXPECTED_FAILURE",
        providerPaidRequests:0
      }));
      process.exitCode=2;
    });
}
