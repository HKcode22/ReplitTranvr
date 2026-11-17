'use strict';
// Offline ordering core. See the native owner adapter; no side effects here.
function finishPrivateCommission(io,mode="review"){
 const BASE="345f642e0df3266853a1f9d5e3f12fa262ddf1ee",HEAD="570c2e29784231c6ceffab8d620fbe2fd1887762",TREE="ccf9f6665e3a8547476651a17efcf2261d32c53c";
 const hold=x=>{throw Error("HOLD_P5_FINAL_PRIVATE_"+x)};
 const H=/^[0-9a-f]{40}$/,D=/^[0-9a-f]{64}$/;
 const counters=["enabled","batches","segments","subscriptions","deletionstops","packets","indexes","claims"];
 const zero=x=>x&&counters.every(k=>x[k]===0);
 const before=()=>{
  const s=io.state();
  if(!s||s.main!==BASE||s.head!==HEAD||s.base!==BASE||s.tree!==TREE||s.open!==true||s.draft!==true||s.allCi!==true||s.pin!==BASE||s.primaryEnabled!==true||s.mode!=="OFF"||s.privateApprovalPresent!==false||!D.test(s.endpoint??""))hold("PREMERGE_SCOPE_CHANGED");
  return s;
 };
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 if(!["review","commission"].includes(mode))hold("MODE");
 const initial=before();
 io.testHelper();
 const pre=io.ownerPreflight(initial.endpoint);
 if(!zero(pre)||pre.privateState!=="ABSENT"||pre.allIncidentCount!==0||pre.endpointSha256!==initial.endpoint||!D.test(pre.sqlSha256??""))hold("OWNER_PREFLIGHT_NOT_EMPTY_STOPPED");
 if(!same(initial,before()))hold("PREMERGE_CONFIG_DRIFT");
 io.report({status:"P5_FINAL_PRIVATE_NONPAID_PREFLIGHT",candidate:HEAD,tree:TREE,ownerPreflight:pre,exactCi:true,providerCalls:0,phase6PaidGo:false});
 if(mode==="review")return {status:"P5_FINAL_PRIVATE_REVIEW_ONLY",providerCalls:0,databaseWrites:0,phase6PaidGo:false};
 if(!io.confirm("COMMISSION EXACT V0105 FUNCTIONS ONLY NO PAID GO"))hold("OWNER_DECLINED");
 if(!same(initial,before()))hold("PREMERGE_CONFIG_DRIFT");
 // Each external mutation is a one-shot. An exception ends the sequence.
 const merged=io.merge(initial);
 if(!H.test(merged??"")||merged===BASE)hold("MERGE_RECEIPT_UNKNOWN_NO_REPLAY");
 io.report({status:"P5_FINAL_PRIVATE_MERGED_REPIN_REQUIRED",main:merged,providerCalls:0,phase6PaidGo:false});
 const v=io.repin(merged);
 if(v?.status!=="PRIVATE_COMMISSION_TRANSITION_PRIMARY_VERIFY_NO_GO"||v.reviewedMainSha!==merged||v.privateCommissionState!=="ABSENT"||v.allPrimaryCountersZero!==true||v.privateApplyEnabled!==false||v.phase6PaidGo!==false)hold("REPIN_VERIFY_NOT_CONFIRMED");
 io.report({status:"P5_FINAL_PRIVATE_REPIN_VERIFIED",main:merged,runId:v.runId,phase6PaidGo:false});
 io.checkout(merged);
 const review=io.ownerReview(merged);
 if(review?.status!=="PRIVATE_EXPIRY_OWNER_REVIEW_ONLY_NO_GO"||review.reviewedMainSha!==merged||review.privateState!=="ABSENT"||!zero(review)||review.endpointSha256!==pre.endpointSha256||review.sqlSha256!==pre.sqlSha256||!D.test(review.reviewSha256??"")||review.providerCalls!==0||review.databaseWrites!==0||review.phase6PaidGo!==false)hold("OWNER_REVIEW_DRIFT");
 const grant=io.commission(merged,review.reviewSha256);
 if(grant?.status!=="PRIVATE_EXPIRY_FUNCTIONS_GRANTED_COMMIT_ACKNOWLEDGED"||grant.reviewedMainSha!==merged||grant.reviewSha256!==review.reviewSha256||grant.functionsInstalled!==4||grant.functionGrants!==4||grant.newRoles!==0||grant.newTables!==0||grant.ownerReadback!=="GRANTED"||grant.privateApplyEnabled!==false||grant.providerCalls!==0||grant.phase6PaidGo!==false)hold("OWNER_COMMIT_UNVERIFIED_NO_REPLAY");
 io.report({status:"P5_FINAL_PRIVATE_OWNER_COMMITTED_VERIFY_REQUIRED",main:merged,phase6PaidGo:false});
 const verified=io.verifyGranted(merged);
 if(verified?.status!=="PRIVATE_COMMISSION_TRANSITION_PRIMARY_VERIFY_NO_GO"||verified.reviewedMainSha!==merged||verified.privateCommissionState!=="GRANTED"||verified.allPrimaryCountersZero!==true||verified.privateApplyEnabled!==false||verified.phase6PaidGo!==false)hold("INDEPENDENT_GRANTED_VERIFY_REQUIRED_NO_REPLAY");
 return {status:"P5_FINAL_PRIVATE_FUNCTIONS_COMMISSIONED_RESTRICTED_ACTORS_VERIFIED_NO_GO",main:merged,preGrantRun:v.runId,postGrantRun:verified.runId,functionsInstalled:4,functionGrants:4,newRoles:0,newTables:0,privateApplyEnabled:false,sourceRightsApproved:false,scientificFreeze:false,providerCalls:0,phase6PaidGo:false};
}
module.exports={finishPrivateCommission};
