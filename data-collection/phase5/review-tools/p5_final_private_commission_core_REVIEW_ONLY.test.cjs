'use strict';
const {finishPrivateCommission}=require('./p5_final_private_commission_core_REVIEW_ONLY.cjs');
const {test}=require('node:test');const assert=require('node:assert/strict');
function fixture(){
 const b="345f642e0df3266853a1f9d5e3f12fa262ddf1ee",h="570c2e29784231c6ceffab8d620fbe2fd1887762",t="ccf9f6665e3a8547476651a17efcf2261d32c53c",m="a".repeat(40),e="b".repeat(64),sql="c".repeat(64),q="d".repeat(64);
 const s={main:b,head:h,base:b,tree:t,open:true,draft:true,allCi:true,pin:b,primaryEnabled:true,mode:"OFF",privateApprovalPresent:false,endpoint:e},pre={privateState:"ABSENT",allIncidentCount:0,enabled:0,batches:0,segments:0,subscriptions:0,deletionstops:0,packets:0,indexes:0,claims:0,endpointSha256:e,sqlSha256:sql};
 const events=[],z={s,pre,events,yes:true,review:{...pre,status:"PRIVATE_EXPIRY_OWNER_REVIEW_ONLY_NO_GO",reviewedMainSha:m,reviewSha256:q,providerCalls:0,databaseWrites:0,phase6PaidGo:false},grant:{status:"PRIVATE_EXPIRY_FUNCTIONS_GRANTED_COMMIT_ACKNOWLEDGED",reviewedMainSha:m,reviewSha256:q,functionsInstalled:4,functionGrants:4,newRoles:0,newTables:0,ownerReadback:"GRANTED",privateApplyEnabled:false,providerCalls:0,phase6PaidGo:false},v:{status:"PRIVATE_COMMISSION_TRANSITION_PRIMARY_VERIFY_NO_GO",reviewedMainSha:m,privateCommissionState:"ABSENT",allPrimaryCountersZero:true,privateApplyEnabled:false,phase6PaidGo:false,runId:123}};
 z.io={state:()=>({...z.s}),testHelper:()=>{},ownerPreflight:()=>z.pre,report:()=>{},confirm:()=>z.yes,merge:()=>{events.push("merge");return m},repin:()=>{events.push("repin");return z.v},checkout:()=>{events.push("checkout")},ownerReview:()=>z.review,commission:()=>{events.push("commission");return z.grant},verifyGranted:()=>{events.push("verify");return {...z.v,privateCommissionState:"GRANTED",runId:124}}};return z;
}
const cases=[["review no mutation",f=>finishPrivateCommission(f.io),[],"P5_FINAL_PRIVATE_REVIEW_ONLY"],
["commission entire ordered sequence",f=>finishPrivateCommission(f.io,"commission"),["merge","repin","checkout","commission","verify"],"P5_FINAL_PRIVATE_FUNCTIONS_COMMISSIONED_RESTRICTED_ACTORS_VERIFIED_NO_GO"],
["stale main",f=>{f.s.main="f".repeat(40);return finishPrivateCommission(f.io,"commission")},[],"PREMERGE_SCOPE_CHANGED"],
["bad CI",f=>{f.s.allCi=false;return finishPrivateCommission(f.io,"commission")},[],"PREMERGE_SCOPE_CHANGED"],
["preexisting functions",f=>{f.pre.privateState="GRANTED";return finishPrivateCommission(f.io,"commission")},[],"OWNER_PREFLIGHT_NOT_EMPTY_STOPPED"],
["nonempty private tables",f=>{f.pre.packets=1;return finishPrivateCommission(f.io,"commission")},[],"OWNER_PREFLIGHT_NOT_EMPTY_STOPPED"],
["owner declines",f=>{f.yes=false;return finishPrivateCommission(f.io,"commission")},[],"OWNER_DECLINED"],
["lost merge ACK",f=>{f.io.merge=()=>{f.events.push("merge");throw Error("MERGE_UNKNOWN")};return finishPrivateCommission(f.io,"commission")},["merge"],"MERGE_UNKNOWN"],
["failed re-pin",f=>{f.v.privateCommissionState="GRANTED";return finishPrivateCommission(f.io,"commission")},["merge","repin"],"REPIN_VERIFY_NOT_CONFIRMED"],
["owner readback drift",f=>{f.review.sqlSha256="e".repeat(64);return finishPrivateCommission(f.io,"commission")},["merge","repin","checkout"],"OWNER_REVIEW_DRIFT"],
["lost grant ACK",f=>{f.io.commission=()=>{f.events.push("commission");throw Error("GRANT_UNKNOWN")};return finishPrivateCommission(f.io,"commission")},["merge","repin","checkout","commission"],"GRANT_UNKNOWN"],
["verify refuses",f=>{f.io.verifyGranted=()=>{f.events.push("verify");return {}};return finishPrivateCommission(f.io,"commission")},["merge","repin","checkout","commission","verify"],"INDEPENDENT_GRANTED_VERIFY_REQUIRED_NO_REPLAY"]];
for(const [name,run,expected,status] of cases)test(name,()=>{const f=fixture();let actual;try{actual=run(f).status}catch(e){actual=e.message}assert.ok(actual.includes(status));assert.deepEqual(f.events,expected)});
