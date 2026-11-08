import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";

const applyPath="scripts/phase5_p25_exact_admin_apply_reviewed_once_owner.sh";
const auditPath="scripts/phase5_p25_admin_after_apply_independent_readonly_owner.sh";
const apply=readFileSync(applyPath,"utf8");
const audit=readFileSync(auditPath,"utf8");

test("both P25 owner helpers parse as valid Bash",()=>{
 for(const path of [applyPath,auditPath]){
  const r=spawnSync("bash",["-n",path],{encoding:"utf8",timeout:7000});
  assert.equal(r.status,0,r.stderr);
 }
});
test("independent post-audit embedded JavaScript parses",()=>{
 const m=audit.match(/node <<'P25_INDEPENDENT_ADMIN_AUDIT_JS'\n([\s\S]*?)\nP25_INDEPENDENT_ADMIN_AUDIT_JS\s*$/);
 assert.ok(m);
 const r=spawnSync(process.execPath,["--check","-"],{
  input:m[1],encoding:"utf8",timeout:7000
 });
 assert.equal(r.status,0,r.stderr);
});
test("admin apply requires exact named authorization, source pins and once marker",()=>{
 for(const p of [
  'P25_ADMIN_OPERATOR_CONFIRMED',
  'APPROVE_P25_ONLY_RESOLVE_INCIDENTS_31_32_CLOSE_BUDGET_PRESERVE_FAILED_GAP2',
  'CLOSE_EXACT_31_32_AND_P25_BUDGET_PRESERVE_DELIVERY_GAP',
  "a2d75104cfa4c74d6936da4bc06bf15939671cc0",
  "29544c30e3c9833fd85035e75999ccf2d2e021f6",
  "6986e2467b9df6da9715e8890730979da8acf204",
  "c6438e63181fe76c7aa0217504a8d5888ad00ec3",
  "df10e4d943fb98c06c3f8eaef356ec5ee829b2f0",
  "fec8e8f7da7f89495b0e65fc33225f453c222e68",
  "phase5-p25-exact-31-32-budget-admin-apply-once.lock",
  "phase5-synthetic-signed-post-a2d75104-once.lock",
  'mkdir "$APPLY_ONCE"',
  'RUN_INDEPENDENT_READONLY_POSTAUDIT'
 ]) assert.ok(apply.includes(p),p);
 assert.match(apply,/node_modules\/\.bin\/tsx "\$RUNNER" --apply/);
 assert.doesNotMatch(apply,/node_modules\/\.bin\/tsx "\$RUNNER" --dry-run/);
 assert.match(apply,/trap cleanup EXIT/);
 assert.match(apply,/set \+x/);
 assert.doesNotMatch(apply,/rm -rf|git (?:reset|clean|checkout|pull|push)|gh workflow run|curl|wget/);
 assert.doesNotMatch(apply,/rm -f -- "\$APPLY_ONCE"|rmdir "\$APPLY_ONCE"/);
});
test("no implicit approval or admin mutation from post-audit",()=>{
 for(const s of [
  "BEGIN TRANSACTION READ ONLY",
  'ROLLBACK',
  'originalProbeStillFailedGap2',
  'P25_EXPIRED_ORIGINALS_EXACT_PROVIDER_AND_RUNTIME_STOP_VERIFIED',
  'phase5-p25-exact-31-32-budget-admin-apply-once.lock',
  'phase6PaidGo:false',
  'dbMutations:0,providerMutations:0,blobMutations:0',
  'scientificHistoricalResult:"failed/DELIVERY_GAP"'
 ]) assert.ok(audit.includes(s),s);
 assert.doesNotMatch(audit,/\b(?:INSERT|UPDATE|DELETE|TRUNCATE|ALTER|DROP)\s+(?:INTO|FROM|TABLE|clean\.)/i);
 assert.doesNotMatch(audit,/gh workflow run|curl|wget|git (?:reset|clean|checkout)|fs\.(?:writeFile|unlink|rm|rmdir|mkdir)/);
});
test("missing operator workspace always HOLDs without attempt or approval",()=>{
 for(const path of [applyPath,auditPath]){
  const r=spawnSync("bash",[path],{
   encoding:"utf8",timeout:7000,
   env:{PATH:process.env.PATH,HOME:"/nonexistent-p25-admin-test"}
  });
  assert.equal(r.status,2);
  assert.match(r.stdout,/HOLD_P25_ADMIN_(?:APPLY_OWNER|POSTAUDIT)_WORKSPACE_MISSING/);
 }
});
