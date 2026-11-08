import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const PIN='6c187d58e2b1339aace71079e27767523d8ca3ce';
const FILE='scripts/v39_phase5_callback_release_v2_reviewed_build_v39.sh';
const H1='scripts/v39_phase5_reviewed_source_build_v39.sh';
const H0='scripts/v39_gate4_reviewed_source_build_v39.sh';
const source=readFileSync(FILE,'utf8');
const cfg=readFileSync('.replit','utf8');
describe('new V2 callback-only reviewed SOURCE release candidate, never publish',()=>{
 it('retains unchanged historical builder pins and exact reviewed source',()=>{
  expect(readFileSync(H1,'utf8')).toContain('PIN=1ca938bece03b90ab952f1bb762f25aedb5ede18');
  expect(readFileSync(H0,'utf8')).toContain('PIN=84b7f1565d0402facc8c3b9aacedc599eb6e2af1');
  expect(source).toContain('PIN='+PIN);
  expect(source).toContain('git merge-base --is-ancestor "$PIN" HEAD');
  expect(source).toContain('git diff --quiet "$PIN" HEAD --');
  expect(source).toContain('git diff --quiet HEAD --');
  expect(source).toContain('git diff --cached --quiet --');
  expect(source).toContain('scripts/v39_phase5_callback_release_v2_reviewed_build_v39.sh || hold');
  expect(source).toContain('git ls-files --others --exclude-standard');
  expect(source).toContain('git show "$PIN:.replit"');
  expect(source).toContain('cmp -s - .replit');
  expect(source).toContain('OVERRIDE="$(printenv V39_BUILD_GIT_HEAD');
  expect(source).toContain('V39_CALLBACK_ONLY_BUILD=1 V39_BUILD_GIT_HEAD="$PIN" npm run build');
  expect(source).toContain('runtime_inputs_identical_to_reviewed:true');
  expect(source).toContain('phase5_freeze_passed:false');
  expect(source).toContain('phase6_paid_launch_authorized:false');
  for(const bad of ['AERODATABOX_API_KEY','DATABASE_URL','gh workflow run','db:push','git reset --hard','git pull','replit publish']){
   expect(source).not.toContain(bad);
  }
 });
 it('changes only Replit build path; deployment and callback secret custody remain',()=>{
  expect(cfg).toContain('build = ["bash", "'+FILE+'"]');
  expect(cfg).not.toContain('build = ["bash", "'+H1+'"]');
  expect(cfg).toContain('deploymentTarget = "autoscale"');
  expect(cfg).toContain('"V39_CALLBACK_ONLY_RUNTIME=1"');
  expect(cfg).toContain('"V39_GATE05_DURABLE_CUSTODY_REQUIRED=1"');
  expect(cfg).toContain('V39_PROVIDER_BLOB_MODE = "required"');
  expect(cfg).not.toContain('[postMerge]');
 });
 it('refuses invalid build arguments, does not auto-publish',()=>{
  const check=spawnSync('bash',['-n',FILE],{encoding:'utf8',timeout:10000});
  expect(check.status).toBe(0);
  const no=spawnSync('bash',[FILE,'--publish'],{encoding:'utf8',timeout:10000});
  expect(no.status).not.toBe(0);
  expect(no.stderr).toContain('PHASE5_CALLBACK_REVIEWED_SOURCE_BUILD_HOLD');
 });
 it('requires full reviewed ancestry and tests exact source-equivalence when local history is present',()=>{
  const ancestor=spawnSync('git',['merge-base','--is-ancestor',PIN,'HEAD'],{encoding:'utf8',timeout:10000});
  if(ancestor.status!==0){
   expect(source).toContain('git cat-file -e "$PIN^{commit}"');
   return;
  }
  const ok=spawnSync('bash',[FILE,'--verify-only'],{encoding:'utf8',timeout:10000});
  expect(ok.status).toBe(0);
  expect(ok.stdout.trim()).toBe('PHASE5_V2_CALLBACK_SOURCE_EQUIVALENCE_VERIFIED_NOT_PUBLISHED');
 });
});