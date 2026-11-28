import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
test('real audit process reads escape-bearing gh logs privately and retains no-proof failures',()=>{
 const dir=mkdtempSync(join(tmpdir(),'p5b-audit-cli-'));
 const head='a'.repeat(40),path='.github/workflows/phase5-one-signed-day-source-child-dispatch.yml';
 const run={id:123,head_sha:head,event:'workflow_dispatch',head_branch:'main',run_attempt:1,status:'completed',conclusion:'success',created_at:'2026-11-27T13:00:00Z',workflow_id:7,path};
 const job={id:456,name:'exact-private-source-existing-one-get-child',run_id:123,head_sha:head,run_attempt:1,status:'completed',conclusion:'success',steps:[
  {name:'Admission for real actor preflight ONLY (no paid capability)',conclusion:'skipped'},
  {name:'Authenticate real private PG16 signed index and query, then ORIGINAL one-physical-GET child',conclusion:'success',started_at:'2026-11-27T13:00:00Z',completed_at:'2026-11-27T13:01:00Z'}]};
 const log='\u001b[31mPRIVATE_RAW_DO_NOT_PRINT\u001b[0m\n'+['PREARM_COMMITTED','RESERVATION_CONFIRMED','HTTP_OK','ORIGINAL_PERSIST_CONFIRMED','OUTCOME_TIMELY'].map(x=>'2026-11-27T13:00:30Z P6_SOURCE_DIAG '+x).join('\n');
 const mock=`#!${process.execPath}\nconst a=process.argv.slice(2),p=a.find(x=>x.startsWith('repos/'));const out=x=>console.log(JSON.stringify(x));
 if(a.includes('user'))console.log('HKcode22');
 else if(p.endsWith('/git/ref/heads/main'))out({object:{sha:${JSON.stringify(head)}}});
 else if(p.includes('/actions/jobs/')){if(!a.includes('--allow-escape-sequences')||process.env.P5B_TEST_LOG_DENIED==='1')process.exit(1);process.stdout.write(${JSON.stringify(log)});}
 else if(p.includes('/actions/runs/123/jobs'))out({total_count:1,jobs:[${JSON.stringify(job)}]});
 else if(p.includes('/runs?'))out({total_count:1,workflow_runs:[${JSON.stringify(run)}]});
 else out({id:7,path:${JSON.stringify(path)}});\n`;
 try{
  writeFileSync(join(dir,'gh'),mock,{mode:0o700});
  for(const denied of ['0','1']){
   const r=spawnSync(process.execPath,[resolve('scripts/v39_phase5b_paid_child_audit_owner.mjs'),head],{encoding:'utf8',env:{...process.env,PATH:dir+':'+process.env.PATH,P5B_TEST_LOG_DENIED:denied},timeout:10000});
   assert.equal(r.status,0,r.stderr);const x=JSON.parse(r.stdout);
   assert.equal(x.receipts[0].status,denied==='0'?'TIMELY_ORIGINAL_REPORTED_BY_CHILD':'PAID_STEP_LOG_UNAVAILABLE_OR_NO_DIAGNOSTIC');
   assert.equal(x.actualPreCommitVerified,false);assert.equal(x.providerBillingVerified,false);
   assert.doesNotMatch(r.stdout,/PRIVATE_RAW_DO_NOT_PRINT|\u001b/);
  }
 }finally{rmSync(dir,{recursive:true,force:true});}
});
