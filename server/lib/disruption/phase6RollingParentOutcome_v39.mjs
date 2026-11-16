/** Minimal sanitized GitHub job outcome marker. Only finite allowlisted
 * dispositions go to GITHUB_OUTPUT; no provider content or private IDs.
 * An ACK is never a paid receipt. A no-POST preflight HOLD is not an
 * ambiguous dispatch: expose it without failing the old history guard.
 */
import {appendFileSync} from "node:fs";
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
