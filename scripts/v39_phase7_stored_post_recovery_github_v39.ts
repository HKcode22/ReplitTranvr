/** Dedicated completion event plus exact manual recovery, never POST replay. */
import {discoverP7WorkflowRunRecoverySelector,executeP7StoredPostRecovery,type P7RecoverySelector} from "../server/lib/disruption/phase7StoredPostRecoveryAdmission_v39";
const e=process.env;
function n(s:string|undefined,max:number){
 if(!/^[1-9][0-9]{0,5}$/.test(s??"")||Number(s)>max)throw Error("HOLD_P7_RECOVERY_SELECTOR");
 return Number(s);
}
async function main(){
 if(e.P6_PHASE7_POST_RECOVERY_CONFIRM!=="RECOVER_EXACT_COMMITTED_POST_NO_PROVIDER"||process.argv.length!==2)throw Error("HOLD_P7_RECOVERY_CONFIRM");
 let s:P7RecoverySelector;
 if(e.GITHUB_EVENT_NAME==="workflow_run"){
  if([e.P6_PRIVATE_POST_DAY,e.P6_PRIVATE_POST_REVISION,e.P6_PRIVATE_POST_INDEX_SHA,e.P6_PRIVATE_POST_SHARD,e.P6_PRIVATE_POST_PACKET_SHA,e.P6_PRIVATE_POST_ROUTE_SHA].some(Boolean))throw Error("HOLD_P7_RECOVERY_MIXED_MODE");
  s=await discoverP7WorkflowRunRecoverySelector(e,e.P6_PHASE7_ORIGINAL_POST_RUN_ID??"");
 }else if(e.GITHUB_EVENT_NAME==="workflow_dispatch"){
  s={runDayIndex:n(e.P6_PRIVATE_POST_DAY,31),indexRevision:n(e.P6_PRIVATE_POST_REVISION,1024),
  indexSha256:e.P6_PRIVATE_POST_INDEX_SHA??"",shardIndex:n(e.P6_PRIVATE_POST_SHARD,100000),
  packetSha256:e.P6_PRIVATE_POST_PACKET_SHA??"",routingIntentSha256:e.P6_PRIVATE_POST_ROUTE_SHA??"",originalGithubRunId:e.P6_PHASE7_ORIGINAL_POST_RUN_ID??""};
 }else throw Error("HOLD_P7_RECOVERY_EVENT");
 console.log(JSON.stringify(await executeP7StoredPostRecovery(e,s)));
}
main().catch(err=>{const s=String(err?.message??"");console.error(/^HOLD_P7_[A-Z0-9_]+$/.test(s)?s:"HOLD_P7_RECOVERY_REDACTED_NO_PAID_REPLAY");process.exitCode=2});
