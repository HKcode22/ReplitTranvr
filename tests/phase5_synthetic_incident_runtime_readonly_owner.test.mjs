import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const path='scripts/phase5_synthetic_incident_runtime_readonly_owner.sh';
const src=readFileSync(path,'utf8');

test('runtime incident diagnostic uses explicit READ ONLY transaction and exact current incident source',()=>{
  for(const expected of [
    'BEGIN READ ONLY',
    'ROLLBACK',
    'clean.adb_incident_stop WHERE resolved=false',
    'clean.adb_anchor_probe',
    "detail->>'kind'",
    "detail->>'reason'",
    'phase5-synthetic-signed-post-a2d75104-once.lock',
    'syntheticRetryAuthorized:false',
    'providerCalls:0',
    'dbWrites:0'
  ])assert.ok(src.includes(expected),expected);
});
test('only exposes structured safe incident enums, not arbitrary JSON detail, secrets, or full error',()=>{
  assert.match(src,/safeEnum/);
  assert.match(src,/safeHistoricalError/);
  assert.match(src,/OTHER_OR_REDACTED/);
  assert.match(src,/REDACTED_ERROR/);
  assert.doesNotMatch(src,/JSON\.stringify\(r\.detail/);
  assert.doesNotMatch(src,/console\.log\(url\)|console\.log\(process\.env\)/);
});
test('never sends HTTP POST, changes Git, opens paid collector, updates incident rows or touches marker',()=>{
  assert.ok(src.includes('set +x'));
  assert.doesNotMatch(src,/^\s*(?:curl|wget|psql|git\s+(?:fetch|reset|clean|checkout|merge|pull|push)|gh\s+workflow\s+run)\b/m);
  assert.doesNotMatch(src,/\b(?:INSERT|UPDATE|DELETE|TRUNCATE|CREATE|ALTER|DROP)\s+(?:TABLE\s+|FROM\s+|INTO\s+|clean\.)/i);
  assert.doesNotMatch(src,/fs\.(?:rm|unlink|rmdir|mkdir|writeFile|appendFile|rename)/);
});
test('parser valid and missing workspace is a named read-only HOLD',()=>{
  const syntax=spawnSync('bash',['-n',path],{encoding:'utf8',timeout:6000});
  assert.equal(syntax.status,0,syntax.stderr);
  const run=spawnSync('bash',[path],{
    encoding:'utf8',timeout:6000,
    env:{PATH:process.env.PATH,HOME:'/nonexistent-p5-readonly-incident'}
  });
  assert.equal(run.status,2);
  assert.match(run.stdout,/HOLD_INCIDENT_READONLY_WORKSPACE_MISSING/);
});
