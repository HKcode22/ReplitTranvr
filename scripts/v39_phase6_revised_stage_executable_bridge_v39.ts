/** Exact executable succession for the already-installed, disabled Nov22
 * stage. The immutable stage packet is never rewritten merely to repin runtime.
 * A genuine separately reviewed operational evidence record must bind every
 * non-evidence changed blob. This does not grant SOURCE or paid authority. */
import {createHash} from "node:crypto";
const SHA=/^[a-f0-9]{64}$/,CODE=/^[a-f0-9]{40}$/;
export const P6_NOV22_STAGE_CODE="0a7b1a28f243de76d4c83026d15f585265ef6f7b";
export const P6_NOV22_STAGE_SHA="6d06cd56f3cf09b7d4f5a6033b70f253e6247a9e1b27dbb839b0080a66e771fc";
export const P6_NOV22_COST_SHA="a3d3525a890bfe542f9588b18d3b5d9367ba657ccae2c1c0401edc625ac46124";
export const P6_NOV22_BRIDGE_REVIEW_PATH="data-collection/phase5/evidence/2026-11-20_phase6_revised_executable_bridge_review.json";
const L="data-collection/evidence/ledgers/V3.9_PHASE6_SOURCE_ENABLE_APPROVALS.json";
const evidence=(p:string)=>p===L||/^data-collection\/phase5\/evidence\/[A-Za-z0-9][A-Za-z0-9_.-]{0,180}\.(?:json|md)$/.test(p);
const pathOk=(p:string)=>typeof p==="string"&&p.length<=220&&/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/.test(p)&&p.split("/").every(x=>x!=="."&&x!=="..")&&!evidence(p);
const fail=(p:string):never=>{throw Error("HOLD_P6_EXACT_SOURCE_AUTH_EXECUTABLE_BRIDGE_"+p)};
const need=(v:unknown,p:string)=>{if(!v)fail(p)};
const sha=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const exact=(x:unknown,keys:string[])=>x!==null&&typeof x==="object"&&!Array.isArray(x)&&Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
export interface P6ReviewedExecutableBridge {
 schema:"v39.phase6.revised-stage-executable-bridge-review.v1";
 stageCodeSha:string;stagePacketSha256:string;costEnvelopeSha256:string;
 reviewedExecutableCommit:string;
 changedBlobs:readonly {path:string;blobSha:string;mode:"100644"|"100755"}[];
 reviewedBy:string;reviewedAtUtc:string;independentOperationalReleaseApproved:true;
 phase6PaidGo:false;
}
export function verifyP6RevisedExecutableBridge(input:{
 stageCode:string;stageSha:string;costSha:string;currentHead:string;
 reviewBytes:Buffer;expectedOperationalEvidenceSha256:string;
 now:Date;stageIsAncestor:boolean;reviewedCommitIsAncestor:boolean;
 reviewedDiff:readonly string[];currentDiff:readonly string[];
 readReviewedBlob:(path:string)=>string;readCurrentBlob:(path:string)=>string;
}){
 need(input.stageCode===P6_NOV22_STAGE_CODE&&input.stageSha===P6_NOV22_STAGE_SHA&&input.costSha===P6_NOV22_COST_SHA&&CODE.test(input.currentHead)&&input.stageIsAncestor===true&&input.reviewedCommitIsAncestor===true,"STAGE_OR_ANCESTRY");
 need(Buffer.isBuffer(input.reviewBytes)&&input.reviewBytes.length>100&&input.reviewBytes.length<=200000&&SHA.test(input.expectedOperationalEvidenceSha256)&&sha(input.reviewBytes)===input.expectedOperationalEvidenceSha256,"OPERATIONAL_EVIDENCE_HASH");
 let x:any;try{x=JSON.parse(input.reviewBytes.toString("utf8"))}catch{fail("REVIEW_JSON")}
 need(Buffer.from(JSON.stringify(x,null,2)+"\n").equals(input.reviewBytes)&&exact(x,["schema","stageCodeSha","stagePacketSha256","costEnvelopeSha256","reviewedExecutableCommit","changedBlobs","reviewedBy","reviewedAtUtc","independentOperationalReleaseApproved","phase6PaidGo"])&&x.schema==="v39.phase6.revised-stage-executable-bridge-review.v1"&&x.stageCodeSha===input.stageCode&&x.stagePacketSha256===input.stageSha&&x.costEnvelopeSha256===input.costSha&&CODE.test(x.reviewedExecutableCommit)&&x.reviewedExecutableCommit!==input.stageCode&&x.independentOperationalReleaseApproved===true&&x.phase6PaidGo===false&&typeof x.reviewedBy==="string"&&x.reviewedBy.trim().length>=3&&typeof x.reviewedAtUtc==="string"&&Number.isFinite(Date.parse(x.reviewedAtUtc))&&new Date(x.reviewedAtUtc).toISOString()===x.reviewedAtUtc&&Date.parse(x.reviewedAtUtc)<=input.now.getTime(),"REVIEW_SCOPE");
 const b=x as P6ReviewedExecutableBridge;
 need(Array.isArray(b.changedBlobs)&&b.changedBlobs.length>=31&&b.changedBlobs.length<=200&&b.changedBlobs.every(v=>exact(v,["path","blobSha","mode"])&&pathOk(v.path)&&CODE.test(v.blobSha)&&["100644","100755"].includes(v.mode)),"EXACT_BLOB_LIST");
 const paths=b.changedBlobs.map(v=>v.path);
 need(new Set(paths).size===paths.length&&JSON.stringify(paths)===JSON.stringify([...paths].sort()),"CANONICAL_PATH_LIST");
 const actual=(d:readonly string[])=>{need(new Set(d).size===d.length&&d.every(p=>evidence(p)||pathOk(p)),"DIFF_PATHS");return d.filter(p=>!evidence(p)).sort()};
 need(JSON.stringify(actual(input.reviewedDiff))===JSON.stringify(paths)&&JSON.stringify(actual(input.currentDiff))===JSON.stringify(paths),"UNREVIEWED_EXECUTABLE_DIFF");
 for(const v of b.changedBlobs)need(input.readReviewedBlob(v.path)===v.mode+" blob "+v.blobSha&&input.readCurrentBlob(v.path)===v.mode+" blob "+v.blobSha,"BLOB_DRIFT");
 // Every day plan is part of the exact reviewed code transition.
 for(let i=1;i<=31;i++)need(paths.includes("data-collection/phase5/planning/phase6-source-day-"+String(i).padStart(2,"0")+".json"),"MISSING_DAY_PLAN");
 return {stageCode:input.stageCode,currentHead:input.currentHead,reviewedExecutableCommit:b.reviewedExecutableCommit,reviewedExecutablePaths:paths.length,operationalEvidenceSha256:input.expectedOperationalEvidenceSha256,phase6PaidGo:false};
}
