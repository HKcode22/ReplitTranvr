import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const path='scripts/phase5_synthetic_webhook_local_checkout_readonly_diagnosis.sh';
const src=readFileSync(path,'utf8');

test('source and HEAD diagnostic preserves independent GitHub ancestry and exact source hash',()=>{
  for(const required of [
    '29544c30e3c9833fd85035e75999ccf2d2e021f6',
    'cbcc4783690e6e2c9acec392ac4e644392f3ac82',
    'LOCAL_COMMIT_IS_GITHUB_MAIN_ANCESTOR',
    'PROTECTED_SOURCE_UNCHANGED_FROM_HISTORICAL_PIN',
    'PROTECTED_WORKTREE_CLEAN',
    'LOCAL_SIGNED_TEST_EXACT_HASH',
    'GITHUB_MAIN_SIGNED_TEST_EXACT_HASH',
    'server shared package.json package-lock.json .replit',
    'DO_NOT_SEND_SIGNED_POST',
    'READONLY_ONLY_NO_POST_NO_DB_NO_PROVIDER',
  ]) assert.ok(src.includes(required),required);
});

test('never invokes checkout, Git mutation, external POST, database or provider',()=>{
  assert.ok(src.includes('set +x'));
  assert.doesNotMatch(src,/\b(?:git\s+(?:fetch|reset|clean|pull|merge\b(?!-base)|rebase|checkout|push)|gh\s+workflow\s+run|curl|wget|psql|tsx|npm|npx)\b/);
  assert.doesNotMatch(src,/AERODATABOX_WEBHOOK_SECRET|DATABASE_URL|PRIVATE_KEY|API_KEY/);
  assert.match(src,/gh api "repos\/\$REPO\/compare\/\$LOCAL_HEAD\.\.\.main"/);
});

test('bash syntax is valid and missing workspace always refuses',()=>{
  const syntax=spawnSync('bash',['-n',path],{encoding:'utf8',timeout:6000});
  assert.equal(syntax.status,0,syntax.stderr);
  const run=spawnSync('bash',[path],{
    encoding:'utf8',timeout:6000,
    env:{PATH:process.env.PATH,HOME:'/nonexistent-phase5-diagnostic-workspace'}
  });
  assert.equal(run.status,2);
  assert.match(run.stdout,/HOLD WORKSPACE_DIRECTORY_MISSING/);
  assert.match(run.stdout,/NO_POST_NO_DB_NO_PROVIDER/);
});
