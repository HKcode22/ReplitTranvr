import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const path='scripts/phase5_p25_incident31_32_historical_scope_readonly_owner.sh';
const source=readFileSync(path,'utf8');
const m=source.match(/node <<'P25_READONLY_JAVASCRIPT'\n([\s\S]*?)\nP25_READONLY_JAVASCRIPT\s*$/);
test('bash and embedded Node syntax',()=>{
  const b=spawnSync('bash',['-n',path],{encoding:'utf8',timeout:6000});
  assert.equal(b.status,0,b.stderr);
  assert.ok(m);
  const n=spawnSync(process.execPath,['--check','-'],{
    input:m[1],encoding:'utf8',timeout:6000
  });
  assert.equal(n.status,0,n.stderr);
});
test('read-only exact source and no auto GO',()=>{
 for(const s of [
   'BEGIN TRANSACTION READ ONLY','ROLLBACK',
   "const SESSION=\"b0077437-edc1-459a-9d63-8c6e6e50c4f2\"",
   "const BUDGET=\"P2G-S1-20261013-03\"",
   'clean.adb_incident_stop WHERE resolved=false',
   'WHERE probe_id=19 AND probe_budget_day_id=$2',
   'clean.adb_probe_reconciliation_evidence',
   'clean.provider_content_blob_ref',
   'clean.phase2g_cleanup_journal_v39',
   'expiredButUntombstoned',
   'newSignedSyntheticPostAuthorized:false',
   'historicalIncidentClearanceAuthorized:false',
   'providerCurrentSubscriptionInventoryVerified:false',
   'previousOnceMarkerPreserved',
   'phase6PaidGo:false'
 ]) assert.ok(source.includes(s),s);
});
test('never prints arbitrary incident details, provider payloads or secrets',()=>{
 assert.doesNotMatch(m[1],/console\.log\(\s*(?:process\.env|url|incidents|SESSION|BUDGET)\s*\)/);
 assert.doesNotMatch(m[1],/SELECT\s+\*|SELECT\s+detail[,\s]/i);
 assert.match(m[1],/enumSafe/);
 assert.match(m[1],/OTHER_OR_REDACTED/);
 assert.match(m[1],/actualStoredObjectBytesReadbackPerformed:false/);
});
test('no provider calls or DML/DDL/Git mutation, absent workspace refuses',()=>{
 assert.ok(source.includes('set +x'));
 assert.doesNotMatch(source,/^\s*(?:curl|wget|psql|git\s+(?:fetch|reset|checkout|clean|push|merge|pull)|gh workflow run)\b/m);
 assert.doesNotMatch(m[1],/\b(?:INSERT|UPDATE|DELETE|TRUNCATE|DROP|CREATE|ALTER)\s+(?:INTO|FROM|TABLE|clean\.)/i);
 assert.doesNotMatch(m[1],/fetch\(|axios\(|http\.request|fs\.(?:rm|writeFile|rename|mkdir)/);
 const p=spawnSync('bash',[path],{
   encoding:'utf8',timeout:6000,
   env:{PATH:process.env.PATH,HOME:'/nonexistent-phase5-scope-audit'}
 });
 assert.equal(p.status,2);
 assert.match(p.stdout,/HOLD_P25_RUNTIME_AUDIT_WORKSPACE_MISSING/);
});
