import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const doc=readFileSync(new URL("../data-collection/phase6/RECOVERY_REGISTER.md",import.meta.url),"utf8");
const rows=doc.split("\n").filter(l=>/^\| [FIC]\d{3} \|/.test(l)).map(l=>l.split("|").slice(1,-1).map(s=>s.trim()));
test("consecutive F/I/C identifiers and valid references",()=>{
 const ids=new Set(rows.map(r=>r[0]));assert.equal(ids.size,rows.length);
 for(const prefix of ["F","I","C"]){const a=rows.filter(r=>r[0].startsWith(prefix));assert.ok(a.length);a.forEach((r,i)=>assert.equal(r[0],prefix+String(i+1).padStart(3,"0")));}
 for(const r of rows){const refs=r[0].startsWith("C")?[r[3],r[4]]:[r[3]];for(const x of refs)for(const id of x.split(",").map(s=>s.trim()))assert.ok(ids.has(id),r[0]+" unknown reference "+id);}
});
test("reciprocal F/I references and durable operator entrypoint",()=>{
 const by=new Map(rows.map(r=>[r[0],r]));
 for(const r of rows.filter(r=>r[0].startsWith("F")))for(const id of r[3].split(",").map(s=>s.trim()))assert.ok(by.get(id)[3].split(",").map(s=>s.trim()).includes(r[0]),r[0]+" not reciprocated by "+id);
 for(const r of rows.filter(r=>r[0].startsWith("I")))for(const id of r[3].split(",").map(s=>s.trim()))assert.ok(by.get(id)[3].split(",").map(s=>s.trim()).includes(r[0]),r[0]+" not reciprocated by "+id);
 assert.match(readFileSync(new URL("../AGENTS.md",import.meta.url),"utf8"),/data-collection\/phase6\/RECOVERY_REGISTER\.md/);
});
