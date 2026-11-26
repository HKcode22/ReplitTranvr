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
 const covered=new Set(rows.filter(r=>r[0].startsWith("T")).flatMap(r=>refs(r[3])));
 for(const r of rows.filter(r=>r[0].startsWith("F")))assert.ok(covered.has(r[0]),"failure without regression scenario "+r[0]);
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
