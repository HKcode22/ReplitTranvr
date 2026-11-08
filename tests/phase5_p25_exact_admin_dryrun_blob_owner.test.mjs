import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const path='scripts/phase5_p25_exact_admin_dryrun_blob_owner.sh';
const src=readFileSync(path,'utf8');
test('immutable scoped source and only reviewed Replit dependencies',()=>{
 for(const sha of [
   'a2d75104cfa4c74d6936da4bc06bf15939671cc0',
   '29544c30e3c9833fd85035e75999ccf2d2e021f6',
   'c6438e63181fe76c7aa0217504a8d5888ad00ec3',
   '6986e2467b9df6da9715e8890730979da8acf204',
   '653fd19a464e5d08bf349867cd51a0bbb44a40aa',
   'df66b9c4c68096fd0722eb23f5dbe413ca198906'
 ])assert.ok(src.includes(sha),sha);
});
test('loader only invokes reviewed DRY-RUN and cleans exact temporary sources',()=>{
 assert.match(src,/set -Eeuo pipefail/);
 assert.match(src,/set \+x/);
 assert.match(src,/trap cleanup EXIT/);
 assert.match(src,/mktemp --suffix=\.ts/);
 assert.match(src,/git hash-object "\$GUARD"/);
 assert.match(src,/git hash-object "\$TMP_SCRIPT"/);
 assert.match(src,/node_modules\/\.bin\/tsx "\$TMP_SCRIPT" --dry-run/);
 assert.doesNotMatch(src,/node_modules\/\.bin\/tsx "\$TMP_SCRIPT" --apply/);
 assert.doesNotMatch(src,/^\s*(?:git (?:fetch|pull|checkout|reset|clean|merge)|gh workflow run|curl|psql)\b/m);
 assert.doesNotMatch(src,/PHASE2G_P25_ADMIN_CLOSEOUT_APPROVAL\s*=/);
});
test('Bash parser and missing-workspace refusal do not touch data',()=>{
 const syntax=spawnSync('bash',['-n',path],{encoding:'utf8',timeout:6000});
 assert.equal(syntax.status,0,syntax.stderr);
 const run=spawnSync('bash',[path],{
  encoding:'utf8',timeout:6000,
  env:{PATH:process.env.PATH,HOME:'/nonexistent-replit-p25-admin'}
 });
 assert.equal(run.status,2);
 assert.match(run.stdout,/HOLD_P25_ADMIN_DRYRUN_NO_WORKSPACE/);
});
