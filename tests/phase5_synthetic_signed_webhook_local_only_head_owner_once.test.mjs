import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const path='scripts/phase5_synthetic_signed_webhook_local_only_head_owner_once.sh';
const src=readFileSync(path,'utf8');

test('local-only HEAD remains exact and executable provenance is checked',()=>{
 for(const required of [
  'a2d75104cfa4c74d6936da4bc06bf15939671cc0',
  '29544c30e3c9833fd85035e75999ccf2d2e021f6',
  'cbcc4783690e6e2c9acec392ac4e644392f3ac82',
  '6c187d58e2b1339aace71079e27767523d8ca3ce',
  'git merge-base --is-ancestor',
  'LOCAL_COMMIT_MODIFIED_PROTECTED_EXECUTABLES',
  'PROTECTED_TRACKED_WORKTREE_DIRTY',
  'UNTRACKED_PROTECTED_SOURCE_PRESENT',
  'GITHUB_MAIN_SIGNED_TEST_BLOB_CHANGED',
  'V39_DATABASE_RUNTIME_URL',
  'V39_PROVIDER_BLOB_BUCKET_ID',
  'SIGNED_WEBHOOK_SECRET_MISSING_OR_SHORT',
  'PAID_PROCESS_ARMED_IN_ENV'
 ])assert.ok(src.includes(required),required);
});

test('one-shot marker is set before permitted synthetic invocation',()=>{
 const marker=src.indexOf('mkdir "$LOCK"');
 const invocation=src.indexOf('node_modules/.bin/tsx "$TEST_PATH"');
 assert.ok(marker>0 && invocation>marker);
 assert.match(src,/PREVIOUS_ONCE_ATTEMPT_MARKER_PRESENT/);
 assert.match(src,/NO_RETRY_UNTIL_AUDIT/);
 assert.match(src,/V39_PHASE6_PROCESS_ARMED=0 V39_PHASE6_OWNER_APPROVED=0 ADB_AUTO_COLLECT=0/);
});

test('never touches Git state or issues paid provider/subscription calls',()=>{
 assert.ok(src.includes('set +x'));
 assert.doesNotMatch(src,/^\s*git\s+(?:fetch|reset|clean|pull|checkout|push|rebase|merge\s+(?!-base))/m);
 assert.doesNotMatch(src,/^\s*(?:curl|wget|psql|npm|npx|gh workflow run)\s/m);
 assert.doesNotMatch(src,/REPLIT_API_KEY|RAPIDAPI_KEY/);
});

test('bash parser and no-workspace refusal prevent execution',()=>{
 const syntax=spawnSync('bash',['-n',path],{encoding:'utf8',timeout:6000});
 assert.equal(syntax.status,0,syntax.stderr);
 const run=spawnSync('bash',[path],{
  encoding:'utf8',timeout:6000,
  env:{PATH:process.env.PATH,HOME:'/nonexistent-phase5-synthetic-owner'}
 });
 assert.equal(run.status,2);
 assert.match(run.stderr,/HOLD_P5_SYNTHETIC_SIGNED_POST_NO_ATTEMPT: WORKSPACE_MISSING/);
});
