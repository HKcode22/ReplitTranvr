import test from "node:test";
import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
const doc=readFileSync(new URL("../data-collection/phase6/RECOVERY_REGISTER.md",import.meta.url),"utf8");
const sections=new Map([["Failures","F"],["Implementations","I"],["Completion components (not gates)","C"],["Regression tests","T"]]);
function parseRegister(source){
 const seen=new Set(), rows=[];
 let prefix;
 for(const line of source.split(/\r?\n/)){
  const heading=/^## (.+)$/.exec(line);
  if(heading){prefix=sections.get(heading[1]);if(prefix){assert.ok(!seen.has(prefix),"duplicate register section "+prefix);seen.add(prefix);}continue;}
  if(!prefix||!/^\|\s*[FICT]\d{3}\s*\|/.test(line))continue;
  const r=line.split("|").slice(1,-1).map(s=>s.trim());
  assert.equal(r[0][0],prefix,"ID in wrong section: "+r[0]);
  assert.equal(r.length,prefix==="T"?7:prefix==="C"?5:4,"wrong column count: "+r[0]);
  rows.push(r);
 }
 assert.equal(seen.size,sections.size,"missing register section");
 return rows;
}
const refs=s=>s.split(",").map(s=>s.trim());
function validateRegister(rows){
 const ids=new Set(rows.map(r=>r[0]));assert.equal(ids.size,rows.length,"duplicate primary ID");
 for(const prefix of ["F","I","C","T"]){const a=rows.filter(r=>r[0].startsWith(prefix));assert.ok(a.length);a.forEach((r,i)=>assert.equal(r[0],prefix+String(i+1).padStart(3,"0")));}
 for(const r of rows){
  const expected=r[0].startsWith("T")?[[r[3],"F"],[r[4],"I"],[r[5],"C"]]:r[0].startsWith("C")?[[r[3],"F"],[r[4],"I"]]:[[r[3],r[0].startsWith("F")?"I":"F"]];
  for(const [col,prefix] of expected)for(const id of refs(col)){assert.ok(ids.has(id),r[0]+" unknown reference "+id);assert.ok(id.startsWith(prefix),r[0]+" wrong reference family "+id);}
 }
 const by=new Map(rows.map(r=>[r[0],r]));
 const tests=rows.filter(r=>r[0].startsWith("T")),matchedF=new Set(),matchedI=new Set();
 for(const row of tests){
  const failures=refs(row[3]);
  for(const f of failures)assert.ok(refs(row[4]).some(id=>refs(by.get(id)[3]).includes(f)),row[0]+" unrelated failure "+f);
  for(const id of refs(row[4])){
   const intersection=refs(by.get(id)[3]).filter(f=>failures.includes(f));
   assert.ok(intersection.length,row[0]+" unrelated implementation "+id);
   matchedI.add(id);intersection.forEach(f=>matchedF.add(f));
  }
 }
 for(const r of rows.filter(r=>r[0].startsWith("F")))assert.ok(matchedF.has(r[0]),"failure without matching implementation regression "+r[0]);
 for(const r of rows.filter(r=>r[0].startsWith("I")))assert.ok(matchedI.has(r[0]),"implementation without matching regression "+r[0]);
 for(const r of rows.filter(r=>/^[FI]/.test(r[0])))for(const id of refs(r[3]))assert.ok(refs(by.get(id)[3]).includes(r[0]),r[0]+" not reciprocated by "+id);
}
test("consecutive F/I/C/T identifiers, valid reciprocal references and durable operator entrypoint",()=>{
 const rows=parseRegister(doc);validateRegister(rows);
 for(const row of rows.filter(r=>r[0].startsWith("T")))for(const path of row[6].split(";").map(x=>x.trim())){
  // Cross-repository fixtures must be immutable exact-commit links; existence is checked separately in relay CI and checkpoint.
  if(/^https:\/\/github\.com\/HKcode22\/TravnrClockRelay\/blob\/[a-f0-9]{40}\/(?:isolated\/)?[A-Za-z0-9_.-]+\.test\.mjs$/.test(path))continue;
  assert.match(path,/^(tests\/|\.github\/workflows\/)[A-Za-z0-9_.\/-]+$/);
  assert.ok(!path.split("/").includes(".."),"invalid test path");
  assert.ok(existsSync(new URL("../"+path,import.meta.url)),row[0]+" missing test path "+path);
 }
 assert.match(readFileSync(new URL("../AGENTS.md",import.meta.url),"utf8"),/data-collection\/phase6\/RECOVERY_REGISTER\.md/);
});
const minimal=`## Failures
| F001 | Open | example | I001 |
## Implementations
| I001 | Partial | example | F001 |
## Completion components (not gates)
| C001 | Open | example | F001 | I001 |
## Regression tests
| T001 | Open | example | F001 | I001 | C001 | tests/example.test.mjs |
## Regression crosswalk
| F001 | historical fixture | expected proof |
`;
test("F032: historical crosswalk repeats IDs without registering them twice",()=>{
 const rows=parseRegister(minimal);assert.equal(rows.length,4);validateRegister(rows);
});
test("primary duplicate, missing section, malformed row and wrong reference remain fatal",()=>{
 assert.throws(()=>validateRegister(parseRegister(minimal.replace("## Implementations","| F001 | Open | duplicate | I001 |\n## Implementations"))),/duplicate primary ID/);
 assert.throws(()=>parseRegister(minimal.replace("## Implementations","## Other")),/missing register section/);
 assert.throws(()=>parseRegister(minimal.replace("| I001 | Partial | example | F001 |","| I001 | Partial | F001 |")),/wrong column count/);
 assert.throws(()=>validateRegister(parseRegister(minimal.replace("| F001 | Open | example | I001 |","| F001 | Open | example | F001 |"))),/wrong reference family/);
});

test("T058 every failure and implementation has a corresponding actual regression mapping",()=>{
 const two=minimal.replace("## Implementations","| F002 | Open | other | I002 |\n## Implementations").replace("## Completion components","| I002 | Partial | other | F002 |\n## Completion components");
 assert.throws(()=>validateRegister(parseRegister(two)),/failure without matching implementation regression F002/);
 const wrong=two.replace("F001 | I001 | C001 | tests/example","F001 | I001, I002 | C001 | tests/example");
 assert.throws(()=>validateRegister(parseRegister(wrong)),/unrelated implementation I002/);
 const untested=minimal.replace("F001 | Open | example | I001","F001 | Open | example | I001, I002").replace("## Completion components","| I002 | Partial | other | F001 |\n## Completion components");
 assert.throws(()=>validateRegister(parseRegister(untested)),/implementation without matching regression I002/);
});

test("T060 each named failure in a multi-failure T must match its own implementation",()=>{
 const two=minimal.replace("## Implementations","| F002 | Open | other | I002 |\n## Implementations").replace("## Completion components","| I002 | Partial | other | F002 |\n## Completion components");
 const both=two.replace("## Regression crosswalk","| T002 | Open | actual second regression | F002 | I002 | C001 | tests/example.test.mjs |\n## Regression crosswalk");
 validateRegister(parseRegister(both));
 const mislabeled=both.replace("F001 | I001 | C001 | tests/example","F001, F002 | I001 | C001 | tests/example");
 assert.throws(()=>validateRegister(parseRegister(mislabeled)),/T001 unrelated failure F002/);
});

const matrixPath=new URL("../data-collection/phase5b/closure-matrix.json",import.meta.url);
const reviewedClosedIds=Object.freeze(["F001","F002","F004","F006","F009","F013","F022","F025","F028","F035","F043","F052"]);
function validateClosure(m,rows){
 const fs=rows.filter(r=>r[0].startsWith("F"));
 assert.equal(m.failures.length,fs.length,"lost failure");
 const seen=new Set();
 const counts={narrowCorrected:0,exactCiGreenPendingDeployment:0,partialOrOpen:0,historicalLoss:0};
 const cls={NARROW_CORRECTION_RECORDED:"narrowCorrected",EXACT_CI_GREEN_DEPLOYMENT_PENDING:"exactCiGreenPendingDeployment",PARTIAL_OR_OPEN:"partialOrOpen",HISTORICAL_LOSS_NO_BACKFILL:"historicalLoss"};
 let closed=0;
 for(const f of m.failures){
  assert.ok(!seen.has(f.id),"duplicate failure");seen.add(f.id);
  const r=fs.find(x=>x[0]===f.id);assert.ok(r,"unknown failure");
  assert.deepEqual(f.implementations,refs(r[3]),"mapping drift "+f.id);
  assert.ok(Object.hasOwn(cls,f.classification),"unknown classification");
  counts[cls[f.classification]]++;
  const eligible=f.classification==="NARROW_CORRECTION_RECORDED";
  assert.equal(f.closureStatus,eligible?"CLOSED":"NOT_CLOSED","partial promotion or lost scoped closure "+f.id);
  if(eligible){closed++;assert.equal(f.closureEvidence,r[2],"closed evidence drift "+f.id);}
  assert.ok(["P0_SCIENTIFIC","P1_SCIENTIFIC","OPERATIONAL"].includes(f.scientificRisk),"missing scientific risk");
  assert.ok(["preservation_admission","outcome_truth","source_effectiveness","release_reliability","evidence_integrity"].includes(f.workstream),"missing workstream");
  assert.ok(typeof f.next==="string"&&f.next.trim().length>0,"missing acceptance");
 }
 assert.deepEqual(m.failures.filter(f=>f.closureStatus==="CLOSED").map(f=>f.id).sort(),[...reviewedClosedIds].sort(),"closure requires explicit reviewed evidence decision");
 assert.deepEqual(m.counts,counts,"classification count mismatch");
 assert.equal(m.binaryClosure.closed,closed);
 assert.equal(m.binaryClosure.notClosed,fs.length-closed);
 for(const id of ["F005","F010","F026","F027","F029","F042"])assert.equal(m.failures.find(f=>f.id===id)?.scientificRisk,"P0_SCIENTIFIC","critical scientific risk "+id);
}
test("T116 actual matrix has binary closure, immutable IDs, evidence and scientific severity",()=>{
 // The dedicated Phase5B folder is introduced only on the follow-on branch.
 const m=JSON.parse(readFileSync(matrixPath,"utf8"));
 validateClosure(m,parseRegister(doc));
});
test("T116 refuses premature closure, duplicates, omissions, count and risk drift",()=>{
 const original=JSON.parse(readFileSync(matrixPath,"utf8")),rows=parseRegister(doc);
 const bad=change=>{const m=structuredClone(original);change(m);assert.throws(()=>validateClosure(m,rows));};
 bad(m=>{m.failures.find(f=>f.id==="F027").closureStatus="CLOSED";});
 bad(m=>{const f=m.failures.find(f=>f.id==="F027");f.classification="NARROW_CORRECTION_RECORDED";f.closureStatus="CLOSED";f.closureEvidence=rows.find(r=>r[0]==="F027")[2];m.counts.narrowCorrected++;m.counts.partialOrOpen--;m.binaryClosure.closed++;m.binaryClosure.notClosed--;});
 bad(m=>{m.failures[1]=structuredClone(m.failures[0]);});
 bad(m=>{m.failures.pop();});
 bad(m=>{m.binaryClosure.closed++;});
 bad(m=>{m.failures.find(f=>f.id==="F026").scientificRisk="OPERATIONAL";});
 bad(m=>{m.failures.find(f=>f.id==="F009").closureEvidence="retention ACK only";});
 bad(m=>{m.failures.find(f=>f.id==="F035").closureEvidence="relay wake ACK only";});
 bad(m=>{m.failures.find(f=>f.id==="F022").closureEvidence="unsupported";});
 bad(m=>{m.failures.find(f=>f.id==="F032").implementations.pop();});
});
