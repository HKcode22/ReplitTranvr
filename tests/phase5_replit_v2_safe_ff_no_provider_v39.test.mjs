import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const file='scripts/phase5_replit_v2_local_preserve_fastforward_owner_once.sh';
const s=readFileSync(file,'utf8');
test('exact reviewed V2 repo/old workspace/source pins are fail closed',()=>{
 for(const v of [
 "REPO='HKcode22/ReplitTranvr'",
 "ORIGINAL_HEAD='7e34c6fdbec2e1fb488497e1bf47582755015206'",
 "REVIEWED_MINIMUM_MAIN='2b58e3d09c307f8a3ae0d9ec256216842baf8437'",
 "REVIEWED_EXECUTABLE_PIN='6c187d58e2b1339aace71079e27767523d8ca3ce'",
 "BUILD_BLOB='259bfd635666e9253021d364e3d68a452355cacc'",
 'LOCAL_CHECKOUT_NOT_THE_OBSERVED_ONE',
 'LOCAL_BRANCH_CHANGED',
 'MAIN_NOT_STRICT_FAST_FORWARD_OF_LOCAL',
 'CURRENT_MAIN_SAFETY_NOT_GREEN',
 'MAIN_CHANGED_PROTECTED_APPLICATION_SINCE_V2_REVIEW',
 'UNREVIEWED_V2_DEPLOY_CONFIG'
 ])assert(s.includes(v),v);
});
test('does not mutate old worktree unless a private backup is successfully validated',()=>{
 const backup=s.indexOf('git bundle verify "$BACKUP/original_local_git.bundle"');
 const untracked=s.indexOf('tar --null -cf "$BACKUP/untracked_files.tar"');
 const ff=s.indexOf('git merge --ff-only FETCH_HEAD');
 assert(backup>0&&untracked>backup&&ff>untracked,'backup first, git FF last');
 assert(s.includes('git ls-files --others --exclude-standard -z > "$BACKUP/untracked_paths.nul"'));
 assert(s.includes('git show HEAD:.replit > "$BACKUP/original_published_build_config.replit"'));
 assert(s.includes('chmod 700 "$BACKUP_PARENT"'));
 assert(s.includes('[[ -z "$(git status --porcelain --untracked-files=no)" ]]'));
});
test('no destructive Git changes, publisher, DB, secrets export, provider or paid activation',()=>{
 assert(!/\bgit\s+(?:reset|checkout|switch|clean|push|rebase)\b/.test(s));
 assert(!/\bgh\s+workflow\s+run\b/.test(s));
 assert(!/\bnpm\s+run\s+build\b/.test(s));
 assert(!/\b(replit\s+publish|AERODATABOX_API_KEY|DATABASE_URL|curl|wget)\b/.test(s));
 assert(s.includes("bash \"$BUILD\" --verify-only"));
 assert(s.includes('V39_PHASE6_PROCESS_ARMED=0'));
 assert(s.includes('V39_PHASE6_OWNER_APPROVED=0'));
 assert(s.includes('provider_calls=0; db_writes=0'));
});
test('script syntax correct, and never runs within CI',()=>{
 const p=spawnSync('bash',['-n',file],{encoding:'utf8',timeout:8000});
 assert.equal(p.status,0,p.stderr);
 const q=spawnSync('bash',[file],{
  encoding:'utf8',timeout:9000,env:{PATH:process.env.PATH,HOME:'/dev/null'}
 });
 assert.notEqual(q.status,0);
 assert.match(q.stderr,/HOLD_PHASE5_REPLIT_V2_SAFE_FF/);
});
