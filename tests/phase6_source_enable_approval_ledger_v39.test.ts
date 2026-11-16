import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {mkdtempSync,rmSync,writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {describe,it,expect} from "vitest";
import {verifyP6SourceEnableAuthBytes,verifyP6SourceEnableAuthFile,
 P6_SOURCE_AUTH_LEDGER_SCHEMA,P6_SOURCE_AUTH_PHASE,P6_SOURCE_AUTH_SCOPE}
 from "../scripts/v39_phase6_source_enable_approval_ledger_v39";

const sha=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const bytes=(x:unknown)=>Buffer.from(JSON.stringify(x,null,2)+"\n");
const now=new Date("2026-11-19T00:00:00.000Z");
const OLD="RUN-20260915-HISTORICAL",NEW="RUN-20261116-FIXTURE";
const path="data-collection/phase5/evidence/fixture-only.json";
const evidence=bytes({fixture:true});
const history=Buffer.from("historical "+OLD+"\nAUTH_ARTIFACT_SHA256:"+"a".repeat(64)+"\n");
const record={authorizationId:"AUTH-20261119-SYNTHETICFIXTURE",phaseGate:P6_SOURCE_AUTH_PHASE,
 airportFilterWindow:P6_SOURCE_AUTH_SCOPE,maxAlertCredits:100,maxRestUnitsByCategory:null,
 startNotBeforeUtc:"2026-11-18T00:00:00.000Z",expiresAtUtc:"2026-11-21T00:00:00.000Z",
 cleanupOwner:"fixture-owner",predecessorEvidenceIds:[OLD,NEW]};
const authBytes=bytes(record);
const entry={authorizationId:record.authorizationId,artifactSha256:sha(authBytes),predecessorEvidenceIds:[OLD,NEW]};
const ledger={schema:P6_SOURCE_AUTH_LEDGER_SCHEMA,phaseGate:P6_SOURCE_AUTH_PHASE,
 scope:P6_SOURCE_AUTH_SCOPE,evidence:[{evidenceId:NEW,path,sha256:sha(evidence)}],approvals:[entry]};
const read=(p:string)=>{if(p!==path)throw Error("UNEXPECTED_FIXTURE_PATH");return evidence;};
const verify=(a=authBytes,l=bytes(ledger),h=history,r=read,t=now)=>verifyP6SourceEnableAuthBytes(a,l,h,r,t);

describe("exact Phase6 source enable approval continuation, no provider or DB",()=>{
 it("accepts only a synthetic exact reviewed record with bound predecessor bytes",()=>{
  const a=verify();
  expect(a.verdict.verified).toBe(true);expect(a.artifactHash).toBe(sha(authBytes));
 });
 it("empty ledger refuses even when predecessor evidence exists",()=>{
  expect(()=>verify(authBytes,bytes({...ledger,approvals:[]}))).toThrow("EXACT_SCOPED_AUTH_NOT_APPROVED");
 });
 it("historical approval token alone does not authorize the scoped enable",()=>{
  const h=Buffer.concat([history,Buffer.from("AUTH_ARTIFACT_SHA256:"+sha(authBytes))]);
  expect(()=>verify(authBytes,bytes({...ledger,approvals:[]} ),h)).toThrow("EXACT_SCOPED_AUTH_NOT_APPROVED");
 });
 it("rejects differently serialized AUTH bytes despite same parsed record",()=>{
  expect(()=>verify(Buffer.from(JSON.stringify(record)))).toThrow("EXACT_SCOPED_AUTH_NOT_APPROVED");
 });
 it("rejects mismatched authorization ID or ordered predecessors",()=>{
  expect(()=>verify(authBytes,bytes({...ledger,approvals:[{...entry,authorizationId:"AUTH-20261119-OTHER"}]}))).toThrow("EXACT_SCOPED_AUTH_NOT_APPROVED");
  expect(()=>verify(authBytes,bytes({...ledger,approvals:[{...entry,predecessorEvidenceIds:[NEW,OLD]}]}))).toThrow("EXACT_SCOPED_AUTH_NOT_APPROVED");
 });
 it("rejects unknown, malformed and repeated predecessor IDs",()=>{
  expect(()=>verify(authBytes,bytes({...ledger,approvals:[{...entry,predecessorEvidenceIds:["RUN-20261116-UNKNOWN"]}]}))).toThrow("INVALID_OR_DUPLICATE_EXACT_APPROVAL");
  expect(()=>verify(authBytes,bytes({...ledger,approvals:[{...entry,predecessorEvidenceIds:[OLD,OLD]}]}))).toThrow("INVALID_OR_DUPLICATE_EXACT_APPROVAL");
 });
 it("rejects drift or missing committed evidence",()=>{
  expect(()=>verify(authBytes,bytes(ledger),history,()=>Buffer.from("changed"))).toThrow("PINNED_PREDECESSOR_EVIDENCE_DRIFT");
  expect(()=>verify(authBytes,bytes(ledger),Buffer.from("no predecessors"))).toThrow("INVALID_OR_DUPLICATE_EXACT_APPROVAL");
 });
 it("cannot use unrelated paths, historical evidence ID collisions or traversal",()=>{
  for(const p of ["../../secrets.json","data-collection/phase5/evidence/../x.json","scripts/x.ts"])
   expect(()=>verify(authBytes,bytes({...ledger,evidence:[{...ledger.evidence[0],path:p}]}))).toThrow("INVALID_OR_DUPLICATE_PREDECESSOR_EVIDENCE");
  expect(()=>verify(authBytes,bytes({...ledger,evidence:[{...ledger.evidence[0],evidenceId:OLD}]}))).toThrow("INVALID_OR_DUPLICATE_PREDECESSOR_EVIDENCE");
 });
 it("rejects duplicate approvals and duplicate evidence",()=>{
  expect(()=>verify(authBytes,bytes({...ledger,approvals:[entry,entry]}))).toThrow("INVALID_OR_DUPLICATE_EXACT_APPROVAL");
  expect(()=>verify(authBytes,bytes({...ledger,evidence:[...ledger.evidence,...ledger.evidence]}))).toThrow("INVALID_OR_DUPLICATE_PREDECESSOR_EVIDENCE");
 });
 it("rejects wrong scope or phase even with a matching approved hash",()=>{
  for(const altered of [{phaseGate:"Phase 2 / Gate 1"},{airportFilterWindow:"legacy Alert start"}]){
   const a=bytes({...record,...altered});
   expect(()=>verify(a,bytes({...ledger,approvals:[{...entry,artifactSha256:sha(a)}]}))).toThrow("INVALID_SOURCE_ENABLE_AUTH_SCOPE");
  }
  expect(()=>verify(authBytes,bytes({...ledger,phaseGate:"Phase 2 / Gate 1"}))).toThrow("INVALID_SCOPED_APPROVAL_LEDGER");
 });
 it("rejects noncanonical or extra-member approval index",()=>{
  expect(()=>verify(authBytes,Buffer.from(JSON.stringify(ledger)))).toThrow("INVALID_SCOPED_APPROVAL_LEDGER");
  expect(()=>verify(authBytes,bytes({...ledger,ownerApproved:true}))).toThrow("INVALID_SCOPED_APPROVAL_LEDGER");
  expect(()=>verify(authBytes,Buffer.from(bytes(ledger).toString().replace('"approvals": [','"approvals": [],\n  "approvals": [')))).toThrow("INVALID_SCOPED_APPROVAL_LEDGER");
 });
 it("preserves ordinary AUTH validity checks",()=>{
  expect(verify(authBytes,bytes(ledger),history,read,new Date("2026-11-22T00:00:00.000Z")).verdict.verified).toBe(false);
  expect(verify(authBytes,bytes(ledger),history,read,new Date("2026-11-17T00:00:00.000Z")).verdict.verified).toBe(false);
 });
 it("real checked-out Git fixture does not contain this synthetic approval",()=>{
  const root=mkdtempSync(join(tmpdir(),"p6-approval-test-"));
  try{
   const p=join(root,"synthetic-auth.json");writeFileSync(p,authBytes);
   const head=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();
   expect(()=>verifyP6SourceEnableAuthFile(p,head,now)).toThrow("EXACT_SCOPED_AUTH_NOT_APPROVED");
   expect(()=>verifyP6SourceEnableAuthFile(p,"HEAD",now)).toThrow("EXACT_MAIN_REQUIRED");
  }finally{rmSync(root,{recursive:true,force:true});}
 });
});
