/**
 * Gate4 NEXT2 protected GitHub environment IDENTITY PINS ONLY.
 *
 * --audit: GH GET + private Replit App Storage READ; no writes.
 * --apply-identity-only: source-SHA/GO pinned; changes ONLY the five exact
 * protected environment IDENTITY variables, after reviewer/no-live-STOP checks.
 * --verify: GH GET + private App Storage READ, reports Boolean equality.
 *
 * DOES NOT change credit floor, watch target, UTC time window, STOP runner
 * SHA, GH secrets, provider subscription or app deployment. A successful
 * identity match is not approval to pay or proof STOP is ARMED.
 *
 * Secret bearer/private Ed25519 key stay inside private App Storage;
 * authorisation digest is transported only as GH environment var value,
 * never to stdout, branch history, or GitHub issue comment.
 */
import "dotenv/config";
import {execFileSync} from "node:child_process";
import {pathToFileURL} from "node:url";
import {ReplitProviderBlobStoreV39} from
 "../server/lib/disruption/replitProviderBlobStore_v39";
import {
 gate4Next2StorageKeyV39,gate4Next2OpenSealedValuesV39,NEXT2_ID
} from "../server/lib/disruption/gate4Next2SealedBootstrap_v39";
import {
 openGate4Next2SignerV39,SIGNER_BLOB_V39,SIGNER_SOURCE_V39
} from "./v39_gate4_next2_durable_stop_signer_v39";

const REPO="HKcode22/ReplitTranvr",ENV="gate4-safety";
const PREFIX="repos/"+REPO+"/environments/"+ENV;
const GO="APPLY_NEXT2_G4_IDENTITY_PINS_NO_PROVIDER_NO_STOP_ARM";
const SHA=/^[a-f0-9]{40}$/;
const hash=/^[a-f0-9]{64}$/;
const hold=():never=>{throw Error("GATE4_NEXT2_IDENTITY_PINS_HOLD");};

export const GATE4_IDENTITY_PIN_NAMES_V39=[
 "GATE4_SAFETY_APPROVED_SOURCE",
 "GATE4_SAFETY_APPROVED_SCOPE",
 "GATE4_SAFETY_APPROVED_AUTH",
 "GATE4_SAFETY_APPROVED_ICAO",
 "GATE4_SAFETY_APPROVED_SIGNER_SPKI_SHA256"
] as const;

function gh(path:string,verb?:"POST"|"PATCH",body?:unknown):any{
 const args=["api"];
 if(verb)args.push("--method",verb,"--input","-");
 args.push(path);
 return JSON.parse(execFileSync("gh",args,{
  input:verb?JSON.stringify(body):undefined,
  encoding:"utf8",timeout:12000,maxBuffer:256_000,
  stdio:["pipe","pipe","pipe"]
 })||"{}");
}
async function expected():Promise<Record<string,string>>{
 const bucket=String(process.env.V39_PROVIDER_BLOB_BUCKET_ID??"");
 if(!bucket.startsWith("replit-objstore-"))hold();
 const store=new ReplitProviderBlobStoreV39(bucket);
 const key=gate4Next2StorageKeyV39(SIGNER_SOURCE_V39);
 if(!await store.exists(key)||!await store.exists(SIGNER_BLOB_V39))hold();
 const config=gate4Next2OpenSealedValuesV39(
  await store.downloadBytes(key),SIGNER_SOURCE_V39,process.env);
 const signer=openGate4Next2SignerV39(
  Buffer.from(await store.downloadBytes(SIGNER_BLOB_V39)),
  config.GATE4_PREBIND_AUTH_SHA256
 );
 if(!hash.test(signer.spkiSha256)||!hash.test(
  config.GATE4_PREBIND_AUTH_SHA256))hold();
 return {
  GATE4_SAFETY_APPROVED_SOURCE:SIGNER_SOURCE_V39,
  GATE4_SAFETY_APPROVED_SCOPE:NEXT2_ID,
  GATE4_SAFETY_APPROVED_AUTH:config.GATE4_PREBIND_AUTH_SHA256,
  GATE4_SAFETY_APPROVED_ICAO:"WSSS",
  GATE4_SAFETY_APPROVED_SIGNER_SPKI_SHA256:signer.spkiSha256
 };
}
function inventory():{vars:Record<string,string>;reviewer:boolean}{
 const env=gh(PREFIX);
 const reviewer=Array.isArray(env.protection_rules)&&
  env.protection_rules.some((r:any)=>r.type==="required_reviewers");
 const data=gh(PREFIX+"/variables?per_page=100");
 if(!Array.isArray(data.variables))hold();
 const vars=Object.fromEntries(data.variables.map((v:any)=>[v.name,v.value]));
 return {vars,reviewer};
}
export function identityMatchV39(
 current:Record<string,string>,expected:Record<string,string>
):boolean{
 return GATE4_IDENTITY_PIN_NAMES_V39.every(k=>
  typeof expected[k]==="string"&&expected[k].length>0&&
  current[k]===expected[k]);
}
function liveStopQueued():boolean{
 const x=gh("repos/"+REPO+"/actions/workflows/"+
  "phase3-gate4-live-exact-stop-candidate.yml/runs?per_page=100");
 if(!Array.isArray(x.workflow_runs))hold();
 return x.workflow_runs.some((r:any)=>
  ["in_progress","queued","waiting","pending","requested"].includes(r.status));
}
async function main(){
 let stage="ADMISSION",changed=0;
 try{
  const mode=process.argv[2];
  if(process.argv.length!==3||
   !["--audit","--verify","--apply-identity-only"].includes(mode))hold();
  const apply=mode==="--apply-identity-only";
  if(apply){
   const pin=String(process.env.GATE4_NEXT2_IDENTITY_OPERATOR_SHA??"");
   if(process.env.GATE4_NEXT2_IDENTITY_GO!==GO||
    !SHA.test(pin)||execFileSync("git",["rev-parse","HEAD"],{
      encoding:"utf8",stdio:["ignore","pipe","ignore"]
    }).trim()!==pin)hold();
  }
  const expectedVars=await expected();
  stage="PROTECTED_ENVIRONMENT_READONLY";
  const {vars,reviewer}=inventory();
  if(!reviewer)hold();
  const before=identityMatchV39(vars,expectedVars);
  if(!apply){
   console.log(JSON.stringify({
    status:before?"GATE4_NEXT2_IDENTITY_PINS_READONLY_MATCH":
     "GATE4_NEXT2_IDENTITY_PINS_READONLY_NEED_UPDATE",
    protectedReviewersVerified:true,
    identityMatched:before,
    checked:GATE4_IDENTITY_PIN_NAMES_V39.length,
    providerCalls:0,databaseWrites:0,githubWrites:0,
    stopArmed:false,paidAuthorized:false,
    secretValuesPrinted:false
   }));
   return;
  }
  stage="REQUIRE_NO_RUNNING_GH_STOP";
  if(liveStopQueued())hold();
  stage="WRITE_PROTECTED_IDENTITY_ONLY";
  for(const name of GATE4_IDENTITY_PIN_NAMES_V39){
   if(vars[name]===expectedVars[name])continue;
   const exists=Object.prototype.hasOwnProperty.call(vars,name);
   gh(PREFIX+"/variables"+(exists?"/"+name:""),
      exists?"PATCH":"POST",{name,value:expectedVars[name]});
   changed++;
  }
  stage="READBACK_PROTECTED_PINS";
  const next=inventory();
  if(!next.reviewer||!identityMatchV39(next.vars,expectedVars))hold();
  console.log(JSON.stringify({
   status:"GATE4_NEXT2_PROTECTED_IDENTITY_ONLY_PASS",
   protectedReviewersVerified:true,identityMatched:true,
   reviewedReceiverSource:SIGNER_SOURCE_V39,scopeId:NEXT2_ID,
   variablesUpdated:changed,
   authorizationMatchVerified:true,signerMatchVerified:true,
   creditFloorNotModified:true,softTargetNotModified:true,
   stopTimeNotModified:true,runnerShaNotModified:true,
   noProviderSubscriptionCreated:true,stopArmed:false,
   paidAuthorized:false,secretValuesPrinted:false
  }));
 }catch{
  console.log(JSON.stringify({
   status:"GATE4_NEXT2_IDENTITY_PINS_HOLD",failedStage:stage,
   variablesUpdatedBeforeHold:changed,
   providerCalls:0,databaseWrites:0,
   stopArmed:false,paidAuthorized:false,
   noAutomaticRetry:true,secretValuesPrinted:false
  }));process.exitCode=2;
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
 void main();
