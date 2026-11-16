/** Minimal sanitized GitHub job outcome marker. Only finite allowlisted
 * dispositions go to GITHUB_OUTPUT; no provider content or private IDs.
 * An ACK is never a paid receipt. A no-POST preflight HOLD is not an
 * ambiguous dispatch: expose it without failing the old history guard.
 */
import {appendFileSync,writeFileSync} from "node:fs";
import {join} from "node:path";
const hold=()=>{throw Error("HOLD_P6_PARENT_OUTCOME_INVALID_NO_REPLAY");};
const rules={
 SOURCE:{
  hold:["HOLD_PRE_DISPATCH_NO_POST"],
  missing:["SELECTED_SOURCE_DAY_REVIEWS_UNAVAILABLE_NO_DISPATCH"],
  idle:["NO_DUE_SOURCE_NO_DISPATCH","NO_SIGNED_DUE_CHILD_NO_DISPATCH"],
  ack:["BOUNDED_STORED_SOURCE_CHILD_DISPATCH_ACKS_NOT_PAID_RECEIPTS","STALE_REMAINING_PLAN_DEFERRED_NO_REPLAY"],cap:8
 },
 POST:{
  hold:["HOLD_POST_PREFLIGHT_NO_DISPATCH"],
  missing:[],idle:["NO_SIGNED_DUE_POST"],
  ack:["BOUNDED_POST_CHILD_ACKS_NOT_REST_RECEIPTS"],cap:4
 }
};
export function classifyP6ParentOutcome(lane,r){
 const p=rules[lane],n=r?.acknowledgedGithubChildCount;
 if(!p||r?.providerCallsByParent!==0||r?.databaseWritesByParent!==0||
    r?.paidGetsCertifiedByParent!==0||r?.independentPaidChildAdmissionStillRequired!==true||
    !Number.isSafeInteger(n)||n<0||n>p.cap)hold();
 if(p.hold.includes(r.status)||p.missing.includes(r.status)||p.idle.includes(r.status)){
  if(n!==0)hold();
  if(p.hold.includes(r.status))return "SAFE_PREFLIGHT_HOLD";
  if(p.missing.includes(r.status)||(r.unavailableSelectedDayCount??0)>0||(r.unavailableDays??0)>0)
   return "MISSING_EVIDENCE";
  return "NO_DUE_WORK";
 }
 if(!p.ack.includes(r.status)||!Array.isArray(r.acknowledgedGithubRunIds)||
    r.acknowledgedGithubRunIds.length!==n||
    new Set(r.acknowledgedGithubRunIds).size!==n||
    r.acknowledgedGithubRunIds.some(x=>!Number.isSafeInteger(x)||x<1))hold();
 if(n>0)return "ACKNOWLEDGED_NOT_PAID_RECEIPT";
 if((r.unavailableSelectedDayCount??0)>0||(r.unavailableDays??0)>0)return "MISSING_EVIDENCE";
 return "NO_NEW_ACK";
}
export function writeP6ParentOutcome(lane,r,env=process.env,append=appendFileSync){
 const disposition=classifyP6ParentOutcome(lane,r);
 if(env.GITHUB_ACTIONS==="true"){
  if(typeof env.GITHUB_OUTPUT!=="string"||!env.GITHUB_OUTPUT.startsWith("/")||env.GITHUB_OUTPUT.includes("\n"))hold();
  append(env.GITHUB_OUTPUT,"parent_disposition="+disposition+"\n","utf8");
 }
 return disposition;
}

export const P6_PARENT_CHILD_CUSTODY_FILES=Object.freeze({SOURCE:"p6-parent-source-custody.json",POST:"p6-parent-post-custody.json"});
// Only public GitHub run IDs and operational metadata, never request
// identifiers, packet hashes, provider content, or arbitrary diagnostics.
export function preserveP6ParentChildCustody(lane,r,env=process.env,write=writeFileSync,now=Date.now){
 const disposition=classifyP6ParentOutcome(lane,r),file=P6_PARENT_CHILD_CUSTODY_FILES[lane];
 if(env.GITHUB_ACTIONS!=="true"||env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
  env.GITHUB_REF!=="refs/heads/main"||!["schedule","workflow_dispatch"].includes(env.GITHUB_EVENT_NAME)||
  env.GITHUB_RUN_ATTEMPT!=="1"||!/^\d{5,15}$/.test(env.GITHUB_RUN_ID??"")||!Number.isSafeInteger(Number(env.GITHUB_RUN_ID))||
  !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA??"")||
  typeof env.RUNNER_TEMP!=="string"||!env.RUNNER_TEMP.startsWith("/")||env.RUNNER_TEMP.includes("\n"))hold();
 const ids=r.acknowledgedGithubRunIds??[];
 if(!Array.isArray(ids)||ids.length!==r.acknowledgedGithubChildCount||ids.length>rules[lane].cap||
  new Set(ids).size!==ids.length||ids.some(x=>!Number.isSafeInteger(x)||x<1||x>=1e15||x===Number(env.GITHUB_RUN_ID)))hold();
 const raw=Buffer.from(JSON.stringify({schema:"v39.phase6.parent-child-custody.v1",parentRunId:Number(env.GITHUB_RUN_ID),
 reviewedMainSha:env.GITHUB_SHA,lane,disposition,childRunIds:ids,recordedAtUtc:new Date(now()).toISOString(),
 providerCallsByParent:0,paidGetsCertifiedByParent:0,permitReplay:false,phase6PaidGo:false}));
 write(join(env.RUNNER_TEMP,file),raw,{flag:"wx",mode:0o600});
 return disposition;
}

// Only an explicitly combined rolling-controller dispatch must produce the
// optional child custody artifact. Native baseline capture must not depend
// on artifact-upload infrastructure or optional V0102 commissioning.
export function writeP6ParentOutcomeWithOptionalCustody(lane,r,env=process.env,{write=writeFileSync,append=appendFileSync,now=Date.now}={}){
 const required=env.P6_PARENT_CHILD_CUSTODY_REQUIRED;
 if(required==="1"){
  if(env.GITHUB_EVENT_NAME!=="workflow_dispatch")hold();
  preserveP6ParentChildCustody(lane,r,env,write,now);
 }else if(required!==undefined&&required!==""&&required!=="0")hold();
 return writeP6ParentOutcome(lane,r,env,append);
}
