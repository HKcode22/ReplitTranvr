/**
 * Exact reviewed Phase-6 SOURCE enable approvals, separate from the historical
 * relocation-frozen ledger. This reader grants nothing by itself and is used
 * only by the existing B0062 enable transition, not any legacy paid owner.
 * Empty, absent, malformed or unapproved continuation means HOLD.
 */
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {readFileSync} from "node:fs";
import {verifyAuthRecord,type AuthRecord} from "../server/lib/disruption/authRecord_v39";
import type {VerifiedAuthFile} from "./v39_paid_guard_v39";

export const P6_SOURCE_AUTH_PHASE="Phase 6 (separate authorization)";
export const P6_SOURCE_AUTH_SCOPE="C_D_GITHUB_SOURCE_PRE_POST_EXISTING_CALENDAR_NO_LEGACY_ALERT_START";
export const P6_SOURCE_AUTH_LEDGER_PATH="data-collection/evidence/ledgers/V3.9_PHASE6_SOURCE_ENABLE_APPROVALS.json";
const LEGACY="data-collection/evidence/ledgers/V3.9_RUN_REPORTS_AND_EVIDENCE.md";
const HISTORICAL_BLOB="d859a2794d423ec21542afe304d22344b7fccc14";
export const P6_SOURCE_AUTH_LEDGER_SCHEMA="v39.phase6.source-enable-approval-ledger.v1";
const SHA=/^[a-f0-9]{64}$/,COMMIT=/^[a-f0-9]{40}$/;
const ID=/^(?:RUN|GATE|AUTH|ISS|DEC)-\d{8}-[0-9A-Z]+$/;
const AUTH=/^AUTH-\d{8}-[0-9A-Z]+$/;
const PATH=/^data-collection\/phase5\/evidence\/[A-Za-z0-9][A-Za-z0-9_.-]{0,180}\.(?:json|md)$/;
const hold=(why:string):never=>{throw Error("HOLD_P6_EXACT_SOURCE_AUTH_"+why);};
const hash=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const utf8=(b:Buffer)=>{
 const s=b.toString("utf8");
 if(!Buffer.from(s,"utf8").equals(b))hold("LEDGER_INVALID_UTF8");
 return s;
};
const keys=(o:unknown,want:string[]):boolean=>!!o&&typeof o==="object"&&!Array.isArray(o)&&
 JSON.stringify(Object.keys(o).sort())===JSON.stringify([...want].sort());
const ids=(x:any):x is string[]=>Array.isArray(x)&&x.length>0&&x.length<=128&&
 x.every(y=>typeof y==="string"&&ID.test(y))&&new Set(x).size===x.length;
const asText=(b:Buffer,max:number)=>{
 if(!Buffer.isBuffer(b)||b.length<1||b.length>max)hold("LEDGER_OR_ARTIFACT_SIZE");
 return utf8(b);
};

/** Pure offline verification against exact bytes supplied by the pinned reader.
 * The reviewed ledger must pin the exact AUTH ID, raw artifact SHA, ordered
 * predecessor IDs, phase and scope. New evidence metadata must be hash-bound
 * to committed non-secret Phase5 evidence; the presence of evidence alone
 * never implies approval. The existing AUTH semantic/time verifier still runs.
 */
export function verifyP6SourceEnableAuthBytes(authBytes:Buffer,ledgerBytes:Buffer,
 historicalBytes:Buffer,readEvidence:(path:string)=>Buffer,nowUtc:Date):VerifiedAuthFile{
 const history=asText(historicalBytes,2*1024*1024);
 const historyIds=new Set(Array.from(history.matchAll(/\b((?:RUN|GATE|AUTH|ISS|DEC)-\d{8}-[0-9A-Z]+)\b/g),m=>m[1]));
 const raw=asText(ledgerBytes,256*1024);
 let l:any,a:any;
 try{l=JSON.parse(raw);a=JSON.parse(asText(authBytes,256*1024));}catch{hold("INVALID_APPROVAL_OR_AUTH_JSON");}
 // Canonical pretty JSON prevents duplicate member names, hidden comments and
 // ambiguous parser representations in the committed approval index.
 if(JSON.stringify(l,null,2)+"\n"!==raw||
    !keys(l,["schema","phaseGate","scope","evidence","approvals"])||
    l.schema!==P6_SOURCE_AUTH_LEDGER_SCHEMA||l.phaseGate!==P6_SOURCE_AUTH_PHASE||l.scope!==P6_SOURCE_AUTH_SCOPE||
    !Array.isArray(l.evidence)||l.evidence.length>128||!Array.isArray(l.approvals)||l.approvals.length>32)
  hold("INVALID_SCOPED_APPROVAL_LEDGER");
 const evidenceIds=new Set(historyIds);
 for(const e of l.evidence){
  if(!keys(e,["evidenceId","path","sha256"])||typeof e.evidenceId!=="string"||!ID.test(e.evidenceId)||
     evidenceIds.has(e.evidenceId)||typeof e.path!=="string"||!PATH.test(e.path)||
     typeof e.sha256!=="string"||!SHA.test(e.sha256))hold("INVALID_OR_DUPLICATE_PREDECESSOR_EVIDENCE");
  const b=readEvidence(e.path);
  if(!Buffer.isBuffer(b)||b.length<1||b.length>2*1024*1024||hash(b)!==e.sha256)hold("PINNED_PREDECESSOR_EVIDENCE_DRIFT");
  evidenceIds.add(e.evidenceId);
 }
 const approvalIds=new Set<string>(),approvalHashes=new Set<string>();
 for(const e of l.approvals){
  if(!keys(e,["authorizationId","artifactSha256","predecessorEvidenceIds"])||
     typeof e.authorizationId!=="string"||!AUTH.test(e.authorizationId)||approvalIds.has(e.authorizationId)||
     typeof e.artifactSha256!=="string"||!SHA.test(e.artifactSha256)||approvalHashes.has(e.artifactSha256)||
     !ids(e.predecessorEvidenceIds)||e.predecessorEvidenceIds.some((x:string)=>!evidenceIds.has(x)))
   hold("INVALID_OR_DUPLICATE_EXACT_APPROVAL");
  approvalIds.add(e.authorizationId);approvalHashes.add(e.artifactSha256);
 }
 if(!a||typeof a!=="object"||Array.isArray(a)||typeof a.authorizationId!=="string"||
    !AUTH.test(a.authorizationId)||a.phaseGate!==P6_SOURCE_AUTH_PHASE||a.airportFilterWindow!==P6_SOURCE_AUTH_SCOPE||
    !ids(a.predecessorEvidenceIds)||!Number.isFinite(nowUtc.getTime()))
  hold("INVALID_SOURCE_ENABLE_AUTH_SCOPE");
 const artifactHash=hash(authBytes);
 const entry=l.approvals.find((e:any)=>e.authorizationId===a.authorizationId&&e.artifactSha256===artifactHash);
 if(!entry||JSON.stringify(entry.predecessorEvidenceIds)!==JSON.stringify(a.predecessorEvidenceIds))
  hold("EXACT_SCOPED_AUTH_NOT_APPROVED");
 const record=a as AuthRecord;
 const verdict=verifyAuthRecord(record,{nowUtc,existingEvidenceIds:[...evidenceIds],
  expectedPhaseGate:P6_SOURCE_AUTH_PHASE,artifactHash,approvedArtifactHashes:[entry.artifactSha256]});
 return {record,artifactHash,verdict};
}

/** Read only immutable Git objects at the already-checked clean main commit.
 * No environment override, mutable working-tree approval file, arbitrary
 * ledger path or fallback to legacy approval tokens. Caller still verifies
 * remote main, exact stage, operational review, STOP, and database custody.
 */
export function verifyP6SourceEnableAuthFile(authPath:string,exactMain:string,nowUtc=new Date()):VerifiedAuthFile{
 if(!COMMIT.test(exactMain))hold("EXACT_MAIN_REQUIRED");
 const read=(path:string)=>execFileSync("git",["show",exactMain+":"+path],{
  stdio:["ignore","pipe","ignore"],timeout:15000,maxBuffer:2*1024*1024});
 const historical=read(LEGACY);
 const blob=createHash("sha1").update("blob "+historical.length+"\0").update(historical).digest("hex");
 if(blob!==HISTORICAL_BLOB)hold("IMMUTABLE_HISTORICAL_LEDGER_DRIFT");
 return verifyP6SourceEnableAuthBytes(readFileSync(authPath),read(P6_SOURCE_AUTH_LEDGER_PATH),historical,read,nowUtc);
}
