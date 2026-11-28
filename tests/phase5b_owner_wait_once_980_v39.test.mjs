import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync,execFileSync} from 'node:child_process';
const script=resolve('scripts/v39_phase5b_owner_wait_once_980.sh');
const helperBlob='1bbec6f1d0dacbc0432b5c7c36955b43163855fa';
const helper=execFileSync('git',['cat-file','blob',helperBlob]);
test('T130 exact historical fixture identity, shallow CI acquisition and no replacement by mutable branch',()=>{
 assert.equal(execFileSync('git',['hash-object','--stdin'],{input:helper,encoding:'utf8'}).trim(),helperBlob);
 const workflow=readFileSync(resolve('.github/workflows/phase5b-source-diagnostics-offline.yml'),'utf8');
 const acquisition=workflow.indexOf('git fetch --no-tags --depth=1 origin c4408c621a84a2549355d935cca7333c5527d3c2');
 const testStep=workflow.indexOf('- run: node --test tests/phase5b_progress_report_v39.test.mjs tests/phase5b_paid_audit_cli_transport_v39.test.mjs tests/phase5b_owner_wait_once_980_v39.test.mjs');
 assert.ok(acquisition>=0&&testStep>acquisition);
 assert.match(workflow,/git cat-file -e 1bbec6f1d0dacbc0432b5c7c36955b43163855fa\^\{blob\}/);
 assert.match(workflow,/git cat-file blob 1bbec6f1d0dacbc0432b5c7c36955b43163855fa \| git hash-object --stdin/);
});
test('T126 waits without mutation then invokes exact reviewed helper once, never retries a hold',()=>{
 for(const scenario of ['quiet','active_then_quiet','before_window_then_quiet','expired','unknown','changed_main','helper_hold','wrong_head','wrong_blob']){
  const d=mkdtempSync(join(tmpdir(),'p5b-wait980-'));
  const put=(name,source)=>writeFileSync(join(d,name),`#!${process.execPath}\n${source}`,{mode:0o700});
  try{
   writeFileSync(join(d,'helper.base64'),helper.toString('base64'));
   put('gh',`const fs=require('fs'),a=process.argv.slice(2),p=a[1],s=process.env.MOCK_SCENARIO;
const out=x=>console.log(JSON.stringify(x));
if(p==='user')console.log('HKcode22');
else if(p.includes('/git/ref/heads/main'))console.log(s==='changed_main'?'x'.repeat(40):'2b9cb404da863aede54d9069e440ff32bcf6d00e');
else if(p.includes('/pulls/980'))out({state:'open',merged:false,head:{sha:s==='wrong_head'?'b'.repeat(40):'c4408c621a84a2549355d935cca7333c5527d3c2'}});
else if(p.includes('/git/blobs/'))console.log(s==='wrong_blob'?Buffer.from('wrong').toString('base64'):fs.readFileSync(process.env.MOCK_DIR+'/helper.base64','utf8'));
else if(p.includes('/runs?')){if(s==='unknown')process.exit(1);let n=0;const f=process.env.MOCK_DIR+'/reads';try{n=+fs.readFileSync(f)}catch{}fs.writeFileSync(f,''+(n+1));console.log(s==='active_then_quiet'&&n===0?'1':'0');}
else process.exit(9);`);
   put('date',`const fs=require('fs'),f=process.env.MOCK_DIR+'/clock';let n=0;try{n=+fs.readFileSync(f)}catch{}fs.writeFileSync(f,''+(n+1));console.log(process.env.MOCK_SCENARIO==='expired'?'1795816900':process.env.MOCK_SCENARIO==='before_window_then_quiet'&&n===0?'1795793300':'1795794000');`); // Nov27 15:40 UTC, past last signed SOURCE.
   put('sleep',`require('fs').appendFileSync(process.env.MOCK_DIR+'/sleeps','wait\\n');`);
   put('bash',`const fs=require('fs'),cp=require('child_process'),a=process.argv.slice(2);
if(a[0]==='-n'){process.exit(cp.spawnSync('/bin/bash',a).status)}
if(a[1]!=='DEPLOY_EXACT_REVIEWED_SOURCE_ONLY_TARGET_980'||a[2]!=='c4408c621a84a2549355d935cca7333c5527d3c2')process.exit(9);
fs.appendFileSync(process.env.MOCK_DIR+'/invoked','once\\n');
if(process.env.MOCK_SCENARIO==='helper_hold')process.exit(2);console.log('MOCK_EXACT_HELPER_ONCE');`);
   const r=spawnSync('/bin/bash',[script,'WAIT_ONCE_EXACT_REVIEWED_980'],{encoding:'utf8',timeout:10000,env:{...process.env,PATH:d+':'+process.env.PATH,MOCK_DIR:d,MOCK_SCENARIO:scenario}});
   let calls='';try{calls=readFileSync(join(d,'invoked'),'utf8')}catch{}
   if(['quiet','active_then_quiet','before_window_then_quiet'].includes(scenario)){assert.equal(r.status,0,r.stderr);assert.equal(calls,'once\n');}
   else if(scenario==='helper_hold'){assert.equal(r.status,2);assert.equal(calls,'once\n');}
   else {assert.notEqual(r.status,0);assert.equal(calls,'');assert.match(r.stderr,/HOLD_P5B_WAIT_ONCE/);}
   if(scenario==='active_then_quiet')assert.ok(readFileSync(join(d,'sleeps'),'utf8').includes('wait'));
  }finally{rmSync(d,{recursive:true,force:true});}
 }
});
