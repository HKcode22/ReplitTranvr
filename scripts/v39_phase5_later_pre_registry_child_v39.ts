/**
 * Registered future T6/T90 child path. One signed per-day SOURCE registry +
 * one signed later PRE shard replaces one global GH SHA per flight.
 * Reuses exact existing Stage14 PRE owner, no second writer or provider.
 *
 * Caller MUST be existing authenticated GitHub workflow_dispatch on MAIN.
 * No SOURCE/POST/Alert privileges. Registry signed bytes are independent
 * pre-approval; contents of registry alone never authenticate rights/GO.
 */
import {readFileSync,lstatSync} from "node:fs";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {runP5SignedWitnessedLaterPre}
 from "./v39_phase5_one_signed_witnessed_later_pre_github_owner_v39";
import {verifyP5SignedLaterPreDayRegistry,
 type P5SignedLaterPreDayRegistry,
 type P5SignedLaterPreDayRegistryPins}
 from "../server/lib/disruption/phase5SignedLaterPreDayRegistry_v39";
import type {P5SignedSourceBatchRegistry}
 from "../server/lib/disruption/phase5SignedPerDaySourceBatchReadonly_v39";

const FILE=/^data-collection\/phase5\/frozen\/[A-Za-z0-9_-]{8,100}\.json$/;
const SOURCE=/^data-collection\/phase5\/frozen\/[A-Za-z0-9_.-]{8,125}\.json$/;
const SHA=/^[a-f0-9]{64}$/;
const CODE=/^[a-f0-9]{40}$/;
function hold(s:string):never{
 throw Error("REFUSED_P5_LATER_REGISTRY_CHILD_"+s);
}
function localBytes(path:string,max:number,source=false):Buffer{
 if(!(source?SOURCE:FILE).test(path))hold("UNREVIEWED_FROZEN_JSON_FILE");
 const st=lstatSync(path);
 if(!st.isFile()||st.isSymbolicLink()||st.size<100||st.size>max)
  hold("SIGNED_PACKET_OR_REGISTRY_INVALID_SIZE");
 return readFileSync(path);
}
export function admitP5LaterRegistryChildEnv(env:NodeJS.ProcessEnv){
 if(env.GITHUB_ACTIONS!=="true"||
    env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    env.GITHUB_REF!=="refs/heads/main"||
    env.GITHUB_EVENT_NAME!=="workflow_dispatch"||
    env.GITHUB_RUN_ATTEMPT!=="1"||
    !CODE.test(env.GITHUB_SHA??"")||
    env.GITHUB_SHA!==env.V39_P5_LATER_PRE_APPROVED_CODE_SHA||
    env.P5_LATER_PRE_CONFIRM!==
      "ONE_SIGNED_WITNESSED_T6_OR_T90_PRE_NO_PROVIDER"||
    env.ADB_AUTO_COLLECT!=="0"||env.AERODATABOX_API_KEY||
    env.AERODATABOX_WEBHOOK_SECRET||env.DATABASE_URL||
    env.V39_DATABASE_RUNTIME_URL||env.V39_P5_SOURCE_DATABASE_URL||
    env.P5_V39_T24_WITNESS_DATABASE_URL||
    env.P5_V39_OTHER_REST_REVIEW_DATABASE_URL||
    env.P5_V39_OTHER_REST_RESERVE_DATABASE_URL||
    env.V39_P5_LATER_PRE_OWNER_APPROVED!=="1"||
    env.V39_P5_LATER_PRE_DAY_REGISTRY_OWNER_APPROVED!=="1"||
    env.V39_PHASE5_FREEZE_SIGNED!=="1"||
    env.V39_PHASE5_SOURCE_RIGHTS_APPROVED!=="1"||
    env.V39_PHASE6_PROCESS_ARMED!=="1"||
    ![env.V39_P5_LATER_PRE_DAY_REGISTRY_SHA256,
      env.V39_P5_SOURCE_BATCH_REGISTRY_SHA256,
      env.V39_P5_MANIFEST_SHA256,env.V39_P5_RELEASE_SHA256,
      env.V39_P5_RIGHTS_SHA256].every(x=>
      typeof x==="string"&&SHA.test(x))||
    !/^[1-9][0-9]*$/.test(env.P5_LATER_PRE_DAY_INDEX??""))
  hold("UNSIGNED_MAIN_DAY_SOURCE_RIGHTS_OR_SEPARATE_RELEASE");
 const day=Number(env.P5_LATER_PRE_DAY_INDEX);
 if(!Number.isSafeInteger(day)||day>31)
  hold("INVALID_FUTURE_RUN_DAY");
 return day;
}
export function approveP5SignedLaterPreChild(
 env:NodeJS.ProcessEnv,
 packetPath:string,registryPath:string,
 registryBytes:Buffer,registry:P5SignedLaterPreDayRegistry,
 sourceBytes:Buffer,source:P5SignedSourceBatchRegistry,
 readFrozenPacket:(p:string)=>Buffer
){
 const day=admitP5LaterRegistryChildEnv(env);
 const pins:P5SignedLaterPreDayRegistryPins={
  registryFilePath:registryPath,
  expectedRegistrySha256:env.V39_P5_LATER_PRE_DAY_REGISTRY_SHA256!,
  expectedSourceDayRegistrySha256:
    env.V39_P5_SOURCE_BATCH_REGISTRY_SHA256!,
  expectedManifestSha256:env.V39_P5_MANIFEST_SHA256!,
  expectedApprovedMainSha:env.GITHUB_SHA!,
  expectedRunDayIndex:day,
  expectedReleaseSha256:env.V39_P5_RELEASE_SHA256!,
  expectedRightsSha256:env.V39_P5_RIGHTS_SHA256!
 };
 const verified=verifyP5SignedLaterPreDayRegistry(
  registryBytes,registry,sourceBytes,source,pins,readFrozenPacket);
 const matching=verified.entries.filter(e=>e.filePath===packetPath);
 if(matching.length!==1)
  hold("SELECTED_PACKET_NOT_IN_INDEPENDENTLY_SIGNED_DAY_REGISTRY");
 const entry=matching[0];
 return{
  packetBytes:entry.bytes,packet:entry.packet,
  // Passed to the ORIGINAL exhaustive prospective PRE owner admission.
  delegatedEnv:{
   ...env,
   V39_P5_LATER_PRE_SIGNED_PACKET_SHA256:entry.packetSha256,
   V39_P5_QUERY_DIGEST:entry.queryDigestSha256,
   V39_P5_LATER_PRE_T24_RECEIPT_SHA256:entry.t24ReceiptSha256??""
  },
  schema:"v39.phase5.signed-day-later-pre-child.v1" as const,
  dynamicPinsFromIndependentRegistry:true as const,
  registrySha256:verified.registrySha256,
  packetSha256:entry.packetSha256,
  runDayIndex:verified.runDayIndex,
  providerCalls:0 as const,
  databaseWritesByAdmission:0 as const,
  phase5FreezeGrantedByRegistry:false as const,
  phase6PaidGoGrantedByRegistry:false as const
 };
}
export async function mainP5LaterRegistryChild(
 env:NodeJS.ProcessEnv,argv:readonly string[]
){
 if(argv.length!==2)hold("EXACT_ONE_PACKET_AND_ONE_SIGNED_DAY_REGISTRY");
 const [packetPath,registryPath]=argv;
 if(!FILE.test(packetPath??"")||!FILE.test(registryPath??"")||
    packetPath===registryPath)
  hold("UNAPPROVED_SOURCE_OR_CHILD_PACKET_PATH");
 // All file digests verified before any database/worker call.
 const registryBytes=localBytes(registryPath,250000);
 let registry:P5SignedLaterPreDayRegistry;
 try{registry=JSON.parse(registryBytes.toString("utf8")) as P5SignedLaterPreDayRegistry;}
 catch{return hold("SIGNED_DAY_REGISTRY_NOT_JSON");}
 const sourcePath=registry?.sourceDayRegistryFilePath;
 const sourceBytes=localBytes(sourcePath,100000,true);
 let source:P5SignedSourceBatchRegistry;
 try{source=JSON.parse(sourceBytes.toString("utf8")) as P5SignedSourceBatchRegistry;}
 catch{return hold("SIGNED_SOURCE_DAY_REGISTRY_NOT_JSON");}
 const ready=approveP5SignedLaterPreChild(
  env,packetPath,registryPath,registryBytes,registry,
  sourceBytes,source,(p)=>localBytes(p,200000));
 const result=await runP5SignedWitnessedLaterPre(
  ready.delegatedEnv,ready.packetBytes,ready.packet,packetPath);
 return{...result,
  signedDayRegistrySha256:ready.registrySha256,
  signedSourceDayRegistrySha256:registry.sourceDayRegistrySha256,
  dynamicPinsFromIndependentRegistry:true as const};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 mainP5LaterRegistryChild(process.env,process.argv.slice(2))
  .then(x=>console.log(JSON.stringify(x)))
  .catch(e=>{
   const msg=e instanceof Error?e.message:"";
   console.error(/^REFUSED_(?:P5|PHASE5)_[A-Z0-9_]+$/.test(msg)?
      msg:"REFUSED_P5_LATER_REGISTRY_CHILD_UNVERIFIED_HOLD_NO_RETRY");
   process.exitCode=2;
  });
}
