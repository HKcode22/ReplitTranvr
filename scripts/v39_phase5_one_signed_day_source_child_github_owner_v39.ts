/**
 * Main-only, paid-capable but default-DISABLED per-day source child.
 * Authenticate the independently pinned per-day registry + exact selected
 * file BEFORE running the ALREADY reviewed manual one-query source worker.
 *
 * This executable does NOT request a second physical GET or rewrite SQL.
 * Child has its own true GITHUB_RUN_ID and cannot reuse application DB role.
 */
import {readFileSync,lstatSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {admitP5SignedDaySourceChild}
 from "../server/lib/disruption/phase5SignedDaySourceChildRelease_v39";
import type {P5SignedSourceBatchRegistry}
 from "../server/lib/disruption/phase5SignedPerDaySourceBatchReadonly_v39";
import type {P5GitHubOneQueryReleaseEnvelope}
 from "../server/lib/disruption/phase5GitHubOneQueryReleaseAdmission_v39";

const FILE=/^data-collection\/phase5\/frozen\/[A-Za-z0-9_.-]{8,125}\.json$/;
function fail(s:string):never{throw Error("REFUSED_P5_SIGNED_SOURCE_CHILD_"+s);}
function immutableFile(path:string,max:number):Buffer{
 if(!FILE.test(path))fail("UNAPPROVED_SIGNED_JSON_PATH");
 const stat=lstatSync(path);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size<100||stat.size>max)
  fail("SIGNATURE_FILE_MISSING_OR_TOO_LARGE");
 return readFileSync(path);
}
export function prepareP5SignedDaySourceChildFiles(
 env:NodeJS.ProcessEnv,releaseFile:string,registryFile:string
){
 const registryBytes=immutableFile(registryFile,100000);
 const packetBytes=immutableFile(releaseFile,200000);
 let registry:P5SignedSourceBatchRegistry;
 let packet:P5GitHubOneQueryReleaseEnvelope;
 try{
  registry=JSON.parse(registryBytes.toString("utf8")) as P5SignedSourceBatchRegistry;
  packet=JSON.parse(packetBytes.toString("utf8")) as P5GitHubOneQueryReleaseEnvelope;
 }catch{return fail("FROZEN_SOURCE_PACKET_OR_REGISTRY_NOT_JSON");}
 return admitP5SignedDaySourceChild(
  env,registryBytes,registry,packetBytes,packet,releaseFile,registryFile);
}
export function mainP5SignedDaySourceChild(
 env:NodeJS.ProcessEnv,argv:readonly string[]
):void{
 if(argv.length!==2)fail("EXACT_TWO_INPUT_FILES_REQUIRED");
 const [releaseFile,registryFile]=argv;
 const admitted=prepareP5SignedDaySourceChildFiles(
  env,releaseFile,registryFile);
 // No user-selected command or shell. Inherit true GITHUB_RUN_ID and all
 // independently approved source/go/role/budget secrets. Derive ONLY the
 // two mutable query pins from the externally SHA-pinned frozen registry.
 const child=spawnSync("./node_modules/.bin/tsx",[
  "scripts/v39_phase5_one_query_github_fids_source_owner_v39.ts",
  admitted.frozenPacketPath
 ],{
  shell:false,stdio:"inherit",
  timeout:140*60000,
  env:{
   ...env,
   V39_P5_QUERY_DIGEST:admitted.dynamicOneGetEnv.V39_P5_QUERY_DIGEST,
   V39_P5_SIGNED_QUERY_JSON_SHA256:
    admitted.dynamicOneGetEnv.V39_P5_SIGNED_QUERY_JSON_SHA256
  }
 });
 if(child.error||child.signal||child.status!==0)
  fail("EXISTING_ONE_QUERY_OWNER_FAILED_NO_REPLAY");
}
if(process.env.P5_SIGNED_DAY_SOURCE_CHILD_ENTRYPOINT==="1"){
 try{mainP5SignedDaySourceChild(process.env,process.argv.slice(2));}
 catch(e){
  const msg=e instanceof Error?e.message:"";
  console.error(/^REFUSED_P5_SIGNED_SOURCE_CHILD_[A-Z0-9_]+$/.test(msg)?
   msg:"REFUSED_P5_SIGNED_SOURCE_CHILD_UNVERIFIED_OR_RUNTIME_HOLD");
  process.exitCode=2;
 }
}
