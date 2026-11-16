import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=readFileSync(".github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml","utf8");
const enrollment=readFileSync(".github/workflows/phase6-private-later-enrollment.yml","utf8");
function jobs(text){
 const matches=[...text.matchAll(/^  ([a-zA-Z][a-zA-Z0-9_-]+):\n/gm)].filter(m=>m.index>text.indexOf("\njobs:"));
 return Object.fromEntries(matches.map((m,i)=>[m[1],text.slice(m.index,matches[i+1]?.index??text.length)]));
}
test("single explicit grouped SOURCE/POST dispatch enables only the three existing separately gated jobs",()=>{
 const group="RUN_CURRENT_SIGNED_SOURCE_POST_CYCLE",j=jobs(source);
 const selected=Object.entries(j).filter(([,text])=>text.includes(group)).map(([name])=>name);
 assert.deepEqual(selected,["separately-authorized-stored-source-children","separately-authorized-current-private-post-children","separately-authorized-native-post-producer"]);
 for(const [name,confirm,flag,env] of [
  [selected[0],"RUN_CURRENT_SIGNED_SOURCE_PARENT","P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED == 'true'","P6_CURRENT_PARENT_DISPATCH_CONFIRM"],
  [selected[1],"RUN_CURRENT_SIGNED_POST_PARENT","P6_PRIVATE_POST_PARENT_ENABLED == 'true'","P6_CURRENT_PARENT_DISPATCH_CONFIRM"],
  [selected[2],"PUBLISH_CURRENT_SIGNED_POST_WINDOWS_NO_PROVIDER","P6_NATIVE_POST_PRODUCER_ENABLED == '1'","P6_NATIVE_POST_PRODUCER_CONFIRM"]]){
  const txt=j[name],condition=txt.split("\n").find(x=>x.startsWith("    if:"));
  assert(condition.includes("github.ref == 'refs/heads/main'"));
  assert(condition.includes("github.event_name == 'workflow_dispatch'"));
  assert(condition.includes("inputs.confirm == '"+group+"' && vars.P6_ROLLING_CONTROLLER_ENABLED == '1'"));
  assert(condition.includes("inputs.confirm == '"+confirm+"'"));
  assert(condition.includes("vars."+flag));
  assert(txt.includes(env+": ${{ github.event_name == 'workflow_dispatch' && '"+confirm+"' || '' }}"));
  assert(txt.includes("V39_PHASE5_FREEZE_SIGNED"));
  assert(txt.includes("V39_PHASE5_SOURCE_RIGHTS_APPROVED"));
  assert(txt.includes("AERODATABOX_API_KEY: ''"));
 }
 assert(!j[selected[2]].includes("actions: write"));
 assert(!j[selected[2]].includes("GITHUB_TOKEN:"));
 assert(j[selected[0]].includes("P5_AUTO_SOURCE_DISPATCH_ENABLED != 'true'"));
 assert(j[selected[1]].includes("P5_POST_AUTO_DISPATCH_ENABLED != 'true'"));
 assert(j[selected[2]].includes("P5_POST_AUTO_DISPATCH_ENABLED != 'true'"));
});
test("one enrollment cycle retains independent horizon scopes, shared concurrency and empty caller day",()=>{
 const group="ENROLL_DUE_CURRENT_SIGNED_PRE_CYCLE_NO_PROVIDER",j=jobs(enrollment);
 const selected=Object.entries(j).filter(([,t])=>t.includes(group)).map(([n])=>n);
 assert.deepEqual(selected,["enroll-current-signed-day","enroll-current-signed-t24-day"]);
 for(const [name,h] of [[selected[0],"LATER"],[selected[1],"T24"]]){
  const t=j[name],line=t.split("\n").find(x=>x.startsWith("    if:"));
  assert(line.includes("inputs.confirm == '"+group+"' && vars.P6_ROLLING_CONTROLLER_ENABLED == '1'"));
  assert(line.includes("inputs.run_days == ''"));
  assert(line.includes("vars.P6_PRIVATE_"+h+"_ENROLL_ENABLED == '1'"));
  assert(line.includes("vars.P6_PRIVATE_"+h+"_ENROLL_SCHEDULE_ENABLED == '1'"));
  assert(t.includes("inputs.confirm == '"+group+"' && 'ENROLL_DUE_CURRENT_SIGNED_"+h+"_NO_PROVIDER'"));
  assert(t.includes("test \"$P5_CD_GH_PRE_STOP\" = 0"));
  assert(t.includes("AERODATABOX_API_KEY: ''"));
  assert(!t.includes("actions: write"));
 }
 assert(enrollment.includes("group: phase6-private-later-enroll-"));
});
