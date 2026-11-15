/** Nonpaid release inventory, only owner-visible GitHub metadata.
 * Never read secret values, touch DB, alter vars, dispatch jobs or assert GO.
 * Job references are an inventory, not independent approval; conditional
 * legacy/optional references can be missing without blocking current mode.
 */
import {execFileSync} from "node:child_process";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {resolve} from "node:path";
const REPO="HKcode22/ReplitTranvr";
export const lanes=[
 ["early_draw","phase5-six-slot-approved-early-four-airport-draw.yml","gated-exact-early-parent"],
 ["daily","phase6-nonpaid-source-day-prepare-publish.yml","protected-main-one-day-nonpaid"],
 ["source_parent","phase5-source-upcoming-queue-main-scheduled-readonly.yml","separately-authorized-stored-source-children"],
 ["source_child_and_pre_producer","phase5-one-signed-day-source-child-dispatch.yml","exact-private-source-existing-one-get-child"],
 ["later_enroll","phase6-private-later-enrollment.yml","enroll-current-signed-day"],
 ["t24_enroll","phase6-private-later-enrollment.yml","enroll-current-signed-t24-day"],
 ["later_worker","phase5-cd-github-bounded-pre-tick.yml","bounded-reviewed-real-pre"],
 ["t24_worker","phase5-cd-github-one-queued-t24-witness-main-manual.yml","current-private-native-t24"],
 ["post_producer","phase5-source-upcoming-queue-main-scheduled-readonly.yml","separately-authorized-native-post-producer"],
 ["post_parent","phase5-source-upcoming-queue-main-scheduled-readonly.yml","separately-authorized-current-private-post-children"],
 ["post_child","phase5-one-signed-future-post-v0083-main-manual.yml","exact-signed-one-v0083-future-post"],
 ["pre_recovery","phase5-cd-github-existing-queue-lease-watchdog.yml","reviewed-existing-queue-watchdog"],
 ["retention_metadata","phase5-private-blob-retention-readonly-sentinel-no-provider.yml","private-main-restricted-metadata-sentinel"]
];
export const intended={
 P6_NONPAID_SOURCE_SCHEDULE_ENABLED:"true",
 P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED:"true",
 P6_PRIVATE_SOURCE_REVIEW_MODE:"stored",
 P6_STORED_SOURCE_NATIVE_AUDIT_ENABLED:"1",
 P6_NATIVE_LATER_RUNTIME_ENABLED:"1",
 P6_PRIVATE_LATER_ENROLL_ENABLED:"1",
 P6_PRIVATE_LATER_ENROLL_SCHEDULE_ENABLED:"1",
 P6_PRIVATE_T24_ENROLL_ENABLED:"1",
 P6_PRIVATE_T24_ENROLL_SCHEDULE_ENABLED:"1",
 P5_CD_GH_PRE_SCHEDULE_ENABLED:"1",
 P5_CD_GH_WATCHDOG_ENABLED:"1",
 P6_PRIVATE_CURRENT_PRE_SCHEDULE_ENABLED:"1",
 P6_PRIVATE_T24_EXECUTION_ENABLED:"1",
 P5_CD_GH_T24_SCHEDULE_ENABLED:"1",
 P6_T24_CUSTODY_ENABLED:"1",
 P5_CD_GH_PRE_MODE:"PHASE6_APPROVED",
 P6_NATIVE_POST_PRODUCER_ENABLED:"1",
 P6_PRIVATE_POST_PARENT_ENABLED:"true"
};
export const legacy={
 P5_AUTO_SOURCE_DISPATCH_ENABLED:"true",
 P5_POST_AUTO_DISPATCH_ENABLED:"true",
 P5_T24_AUTO_DISPATCH_ENABLED:"true",
 P5_LATER_PRE_AUTO_DISPATCH_ENABLED:"true",
 P5_LATER_PRE_BATCH_AUTO_DISPATCH_ENABLED:"true"
};
function jobSource(yaml,job){
 const lines=yaml.split(/\r?\n/),start=lines.findIndex(x=>x==="  "+job+":");
 if(start<0)throw Error("HOLD_P6_INVENTORY_JOB_CHANGED_"+job);
 let end=start+1;
 while(end<lines.length&&!/^  [a-zA-Z0-9_-]+:\s*$/.test(lines[end])&&!/^\S/.test(lines[end]))end++;
 return lines.slice(start,end).join("\n");
}
const refs=(s,kind)=>[...new Set([...s.matchAll(new RegExp("\\b"+kind+"\\.([A-Z0-9_]+)","g"))].map(x=>x[1]))].sort();
export function summarizeInventory({readWorkflow,secretNames,variables,head}){
 if(!/^[a-f0-9]{40}$/.test(head)||!Array.isArray(secretNames)||!Array.isArray(variables))throw Error("HOLD_INVENTORY_SCOPE");
 const present=new Set(secretNames),flags=new Map(variables.map(x=>[x.name,x.value]));
 const reports=lanes.map(([lane,file,job])=>{
  const source=jobSource(readWorkflow(file),job),references=refs(source,"secrets"),missing=references.filter(x=>!present.has(x));
  return {lane,workflow:file,job,repositorySecretReferences:references.length,repositorySecretNamesPresent:references.length-missing.length,
   missingRepositorySecretReferences:missing,conditionalOrInheritedSecretsNotResolved:true};
 });
 const known=(spec)=>Object.entries(spec).map(([name,value])=>({name,state:!flags.has(name)?"UNSET":flags.get(name)===value?"MATCHES_REFERENCE_VALUE":"OTHER_VALUE"}));
 return {status:"P6_RELEASE_METADATA_INVENTORY_ONLY_NO_GO",head,repository:REPO,lanes:reports,
  intendedFutureModeFlags:known(intended),legacyCompetingFlags:known(legacy),
  retentionMonitorEnabled:flags.get("P5_RETENTION_READONLY_MONITOR_ENABLED")==="true",
  secretValuesRead:false,actualSecretAuthenticationVerifiedHere:false,approvalValuesVerifiedHere:false,
  databaseWrites:0,providerCalls:0,githubMutations:0,phase6PaidGo:false};
}
function main(){
 if(process.env.GITHUB_ACTIONS==="true")throw Error("HOLD_OWNER_LOCAL_ONLY");
 const cmd=(c,a)=>execFileSync(c,a,{encoding:"utf8",maxBuffer:4*1024*1024,stdio:["ignore","pipe","ignore"]}).trim();
 const head=cmd("git",["rev-parse","HEAD"]),remote=()=>cmd("gh",["api","repos/"+REPO+"/git/ref/heads/main","--jq",".object.sha"]);
 if(head!==remote()||head!==process.env.P6_INVENTORY_REVIEWED_MAIN)throw Error("HOLD_EXACT_MAIN_PIN");
 // REST secrets listing exposes names and dates ONLY, not credentials.
 // Variable entries are only compared to known public non-secret mode flags.
 const list=(endpoint,key)=>cmd("gh",["api","--paginate","repos/"+REPO+"/actions/"+endpoint+"?per_page=100","--jq","."+key+"[] | @json"]).split("\n").filter(Boolean).map(s=>JSON.parse(s));
 const secretNames=list("secrets","secrets").map(x=>x.name);
 const variables=list("variables","variables").filter(x=>Object.hasOwn(intended,x.name)||Object.hasOwn(legacy,x.name)||x.name==="P5_RETENTION_READONLY_MONITOR_ENABLED");
 const out=summarizeInventory({readWorkflow:file=>readFileSync(".github/workflows/"+file,"utf8"),secretNames,variables,head});
 if(head!==remote())throw Error("HOLD_MAIN_CHANGED_DURING_INVENTORY");
 console.log(JSON.stringify(out,null,2));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{main();}catch{console.error("HOLD_P6_RELEASE_METADATA_INVENTORY_NO_WRITES");process.exitCode=2;}
}
