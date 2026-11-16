/** Content-free SOURCE/POST child custody. A green parent/ACK is not a
 * provider observation or billing receipt. Independently authenticate
 * each child run and required operation, without granting closure.
 */
import {readP6ParentOutcomeSteps} from "./phase6RollingGithubController_v39.mjs";
const HOLD=s=>{throw Error("HOLD_P6_CHILD_CUSTODY_"+s);};
const ID=x=>Number.isSafeInteger(x)&&x>0&&x<1e15;
const C=/^[a-f0-9]{40}$/;
const DISPOSITIONS=["SAFE_PREFLIGHT_HOLD","MISSING_EVIDENCE","NO_DUE_WORK","NO_NEW_ACK","ACKNOWLEDGED_NOT_PAID_RECEIPT"];
const route=(lane,parentJob,workflow,job,step,cap)=>Object.freeze({lane,parentJob,workflow,job,step,cap,
 file:"p6-parent-"+lane.toLowerCase()+"-custody.json",artifactPrefix:"p6-parent-"+lane.toLowerCase()+"-",
 uploadStep:"Preserve exact "+lane+" child ACK custody (no provider content)"});
export const P6_PAID_CHILD_ROUTES=Object.freeze({
 SOURCE:route("SOURCE","separately-authorized-stored-source-children","phase5-one-signed-day-source-child-dispatch.yml","exact-private-source-existing-one-get-child",
 "Authenticate real private PG16 signed index and query, then ORIGINAL one-physical-GET child",8),
 POST:route("POST","separately-authorized-current-private-post-children","phase5-one-signed-future-post-v0083-main-manual.yml","exact-signed-one-v0083-future-post",
 "Exactly one future V0083 reviewed OUTCOME GET plus source original",4)
});
const utc=x=>{if(typeof x!=="string"||!Number.isFinite(Date.parse(x))||new Date(Date.parse(x)).toISOString()!==x)HOLD("CLOCK");return Date.parse(x);};
const ghTime=x=>{if(typeof x!=="string"||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(x)||!Number.isFinite(Date.parse(x)))HOLD("CLOCK");return Date.parse(x);};
export function parseP6ParentChildCustody(bytes,expected){
 const route=P6_PAID_CHILD_ROUTES[expected?.lane];
 if(!route||!Buffer.isBuffer(bytes)||bytes.length<100||bytes.length>4096)HOLD("RECEIPT_BYTES");
 let x;try{x=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));}catch{HOLD("RECEIPT_BYTES");}
 if(!x||Object.keys(x).sort().join(",")!=="childRunIds,disposition,lane,paidGetsCertifiedByParent,parentRunId,permitReplay,phase6PaidGo,providerCallsByParent,recordedAtUtc,reviewedMainSha,schema"||
  x.schema!=="v39.phase6.parent-child-custody.v1"||!ID(x.parentRunId)||x.parentRunId!==expected.parentRunId||
  !C.test(x.reviewedMainSha??"")||x.reviewedMainSha!==expected.reviewedMainSha||x.lane!==route.lane||
  !DISPOSITIONS.includes(x.disposition)||x.disposition!==expected.disposition||
  x.providerCallsByParent!==0||x.paidGetsCertifiedByParent!==0||x.permitReplay!==false||x.phase6PaidGo!==false||
  !Array.isArray(x.childRunIds)||x.childRunIds.length>route.cap||new Set(x.childRunIds).size!==x.childRunIds.length||
  x.childRunIds.some(id=>!ID(id)||id===x.parentRunId)||(x.disposition==="ACKNOWLEDGED_NOT_PAID_RECEIPT")!==(x.childRunIds.length>0))HOLD("RECEIPT_SCOPE");
 utc(x.recordedAtUtc);return x;
}
function exactStep(job,name){
 const steps=job?.steps?.filter(s=>s.name===name)??[];
 if(steps.length!==1||steps[0].status!=="completed"||steps[0].conclusion!=="success")HOLD("REQUIRED_STEP");
}
export async function verifyP6ParentChildCustody({parent,parentJobs,sha,clock,readArtifact,readRun,readJobs}){
 if(!ID(parent?.id)||!C.test(sha??"")||!Number.isSafeInteger(clock)||!Array.isArray(parentJobs)||[readArtifact,readRun,readJobs].some(x=>typeof x!=="function"))
  HOLD("INPUT");
 const seen=new Set(),children=[],receipts=[];
 for(const route of Object.values(P6_PAID_CHILD_ROUTES)){
  const js=parentJobs.filter(j=>j.name===route.parentJob);
  if(js.length!==1||js[0].run_id!==parent.id||js[0].head_sha!==sha||js[0].run_attempt!==1||js[0].status!=="completed"||js[0].conclusion!=="success")
   HOLD("PARENT_JOB");
  const job=js[0],from=ghTime(job.started_at),to=ghTime(job.completed_at);
  if(from<ghTime(parent.created_at)-1000||to<from||to>clock+5000)HOLD("PARENT_CLOCK");
  exactStep(job,route.uploadStep);
  const disposition=readP6ParentOutcomeSteps(job.steps),a=await readArtifact(parent.id,route.lane);
  if(!a||!ID(a.artifactId)||a.runId!==parent.id||a.name!==route.artifactPrefix+parent.id)HOLD("ARTIFACT_SCOPE");
  const x=parseP6ParentChildCustody(a.bytes,{parentRunId:parent.id,reviewedMainSha:sha,lane:route.lane,disposition});
  const recorded=utc(x.recordedAtUtc);
  if(recorded<from-1000||recorded>to+1000)HOLD("RECEIPT_CLOCK");
  receipts.push({parentRunId:parent.id,lane:route.lane,artifactId:a.artifactId,disposition,childCount:x.childRunIds.length});
  for(const id of x.childRunIds){
   if(seen.has(id))HOLD("DUPLICATE_CHILD");
   seen.add(id);
   const child=await readRun(id),created=ghTime(child?.created_at);
   if(child?.id!==id||child.path!==".github/workflows/"+route.workflow||child.head_branch!=="main"||
      child.head_sha!==sha||child.event!=="workflow_dispatch"||child.run_attempt!==1||
      child.status!=="completed"||child.conclusion!=="success"||
      created<from-1000||created>recorded+1000||created>clock+5000)HOLD("CHILD_RUN_NOT_SUCCESS_OR_SCOPE");
   const jobs=await readJobs(id);
   if(!Array.isArray(jobs)||!jobs.length||jobs.length>100||new Set(jobs.map(j=>j?.id)).size!==jobs.length||
      jobs.some(j=>!ID(j?.id)||j.run_id!==id||j.head_sha!==sha||j.run_attempt!==1||j.status!=="completed"))HOLD("CHILD_JOB_IDENTITY");
   const required=jobs.filter(j=>j.name===route.job);
   if(required.length!==1||required[0].conclusion!=="success")HOLD("CHILD_REQUIRED_JOB");
   exactStep(required[0],route.step);
   children.push({parentRunId:parent.id,lane:route.lane,runId:id});
  }
 }
 return {children,receipts};
}
