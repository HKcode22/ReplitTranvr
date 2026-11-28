import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildProgressReport, renderProgressMarkdown} from '../scripts/v39_phase5b_progress_report_v39.mjs';
const matrix=JSON.parse(readFileSync(new URL('../data-collection/phase5b/closure-matrix.json',import.meta.url)));
const evidence={observedAtUtc:'2026-11-27T13:32:00Z',mainSha:'2b9cb404da863aede54d9069e440ff32bcf6d00e',sampleLimit:100,runs:[
 {id:1,lane:'SOURCE',headSha:'2b9cb404da863aede54d9069e440ff32bcf6d00e',status:'in_progress',conclusion:null},
 {id:2,lane:'SOURCE',headSha:'2b9cb404da863aede54d9069e440ff32bcf6d00e',status:'completed',conclusion:'success'},
 {id:3,lane:'CI',headSha:'c4408c621a84a2549355d935cca7333c5527d3c2',status:'completed',conclusion:'failure'}]};
test('preserves 16 scoped closures and every open family, with P0 first',()=>{
 const r=buildProgressReport(matrix,evidence);
 assert.deepEqual(r.counts,{total:matrix.failures.length,closed:16,notClosed:matrix.failures.length-16});
 assert.equal(r.openFailures.length,matrix.failures.length-16);
 assert.deepEqual(r.openFailures.filter(x=>x.scientificRisk==='P0_SCIENTIFIC').map(x=>x.id),['F005','F010','F026','F027','F029','F042']);
 assert.deepEqual(r.sourceSample,{total:2,active:1,queued:0,succeeded:1,failed:0,otherTerminal:0});
 assert.equal(r.actualPreCommitVerified,false);assert.equal(r.softwareCausalImprovementVerified,false);
 const md=renderProgressMarkdown(r);
 for(const f of matrix.failures)assert.ok(md.includes(f.id));
 assert.match(md,/not a complete study denominator/);assert.match(md,/not demonstrated/);
 assert.match(md,/actions\/runs\/2/);
});
test('rejects duplicate IDs, closure drift, missing evidence and inconsistent run states',()=>{
 for(const mutate of [
  m=>m.failures.push(m.failures[0]),
  m=>m.failures[0].closureEvidence='',
  m=>m.failures[0].closureStatus='NOT_CLOSED',
  m=>m.counts.partialOrOpen++,
 ]){const m=structuredClone(matrix);mutate(m);assert.throws(()=>buildProgressReport(m,evidence));}
 for(const patch of [{observedAtUtc:'bad'},{mainSha:'main'},{runs:[...evidence.runs,evidence.runs[0]]},
 {runs:[{...evidence.runs[0],conclusion:'success'}]}])assert.throws(()=>buildProgressReport(matrix,{...evidence,...patch}));
});
test('does not promote candidate or historical loss from green CI or SOURCE success',()=>{
 const r=buildProgressReport(matrix,{...evidence,runs:evidence.runs.map(x=>({...x,status:'completed',conclusion:'success'}))});
 assert.equal(r.counts.notClosed,matrix.failures.length-16);
 assert.equal(r.actualPreCommitVerified,false);
 assert.equal(r.openFailures.find(x=>x.id==='F026').classification,'HISTORICAL_LOSS_NO_BACKFILL');
 assert.ok(r.closedFailures.every(x=>x.closureStatus==='CLOSED'));
});
