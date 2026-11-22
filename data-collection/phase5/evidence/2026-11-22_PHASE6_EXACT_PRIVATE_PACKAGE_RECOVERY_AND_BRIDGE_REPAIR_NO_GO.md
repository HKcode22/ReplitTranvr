# Phase 6 — recover exact private stage without re-review churn (NO GO)

Observed main: 4dbfb285eb64a3953b4c3a2b7f15172d5478a4b5. PR #926 and #937 are merged. Existing owner-authorized AUTH-20261122-P6SOURCE is recorded; no new AUTH or reviewer identity is created here. Latest owner inspect stopped before SQL because the private package was absent. The public stage is code 795ace55984b44a3d0bffa886d33a5ec11d31927, packet 8adfc61a2bdc73ebacf17aa16788bfa14b890d2eb501e8ca7435109116f096fc, cost cef58dcc4e8009d46e686bb555faab0fe952b9921e8aa3aa13d610ea443e3bf9. Last documented installed packet is 781140c / a4c30369, NOT the reviewed successor.

## Two distinct blockers

1. Recover rather than invent the missing five private package files from the exact historical compiler and committed date decision. The existing prepare-reviewed entrypoint demands HEAD == live main, which changes the output identity after an evidence-only advance. Use the historical compiler in a disposable clone with its DB-capable main entrypoint omitted, preserving the actual decision validator, compiler, and all exact hashes. The detached recovery below cannot apply a database stage. If any exact byte comparison fails, report the hold; do not change the review or hash to fit.
2. Current bridge review 812d778a19cd0a6fff5a7f091a59cf089844444d lists only scripts/v39_phase6_revised_stage_executable_bridge_v39.ts. Actual stage-to-main non-evidence diff additionally lists the public stage input under planning, two checkpoint MDs under phase6, and its README. The bridge rejects these by path, independently of stage availability. This candidate relocates the three added files byte-for-byte into the existing admitted evidence namespace and restores the README to the exact historical stage blob. There is no bridge executable, day plan, review, ledger or AUTH change. The old paths remain in git history. Do not merge automatically while concurrent work or protected pin transition is active.

New preserved paths:
- data-collection/phase5/evidence/phase6-monday-stage-input-795ace55.json
- data-collection/phase5/evidence/2026-11-22_PHASE6_OPERATOR_HANDOFF_PATH_REPAIR_NO_GO.md
- data-collection/phase5/evidence/2026-11-22_PHASE6_OWNER_READONLY_INSPECT_HOLD_PRIVATE_STAGE_MISSING_NO_GO.md

## Fixed scope

Gate 4 complete. Gate 5 requires actual disabled-stage match; Gate 1 requires exact policy/reference bytes and DB commissioning; Gate 2 production POST policy/censoring readiness; Gate 3 remaining custody and retention assurance; Gate 6 six runtime policies and 31 values; Gate 7 already demonstrated bounded three-hop chain, not due-work guarantee; Gate 8 AUTH recorded, no actual enable or paid receipt. Do not rerun already demonstrated rehearsals or old inventories solely for another check. Do not require a not-yet-due real flight outcome as a prelaunch observation; test the outcome/censor path and evaluate real labels when due. No new gate.

## Owner-only exact recovery (read-only with respect to GitHub and production)

Run the following in Replit or Mac terminal. Existing credential files are never printed. No provider/DB credentials are passed to the recovery, no worktree is reset and no GitHub/DB write occurs. This script is prepared from exact source, not yet executed in the owner environment.

```bash
bash <<'P6_RECOVER_EXACT_STAGE'
set -Eeuo pipefail
set +x
umask 077
REPO=HKcode22/ReplitTranvr
STAGE=795ace55984b44a3d0bffa886d33a5ec11d31927
ANCHOR=4dbfb285eb64a3953b4c3a2b7f15172d5478a4b5
PACKET=8adfc61a2bdc73ebacf17aa16788bfa14b890d2eb501e8ca7435109116f096fc
COST=cef58dcc4e8009d46e686bb555faab0fe952b9921e8aa3aa13d610ea443e3bf9
STAGE_REL=data-collection/phase5/planning/phase6-monday-stage-input-795ace55.json
DECISION=data-collection/phase5/evidence/2026-11-22_monday_exact_machine_bound_date_decision.json
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
export ADB_AUTO_COLLECT=0 V39_PHASE6_PROCESS_ARMED=0 V39_PHASE6_OWNER_APPROVED=0
unset DATABASE_URL V39_DATABASE_RUNTIME_URL AERODATABOX_API_KEY RAPIDAPI_KEY AERODATABOX_WEBHOOK_SECRET GITHUB_ACTIONS
gh auth status --hostname github.com >/dev/null
gh repo clone "$REPO" "$TMP/repo" -- --filter=blob:none --no-checkout
cd "$TMP/repo"
git show "$ANCHOR:$STAGE_REL" > "$TMP/expected-stage.json"
test "$(shasum -a 256 "$TMP/expected-stage.json" | awk '{print $1}')" = "$PACKET"
git checkout --detach "$STAGE"
test "$(git rev-parse HEAD)" = "$STAGE"
test "$(git hash-object review-tools/p6_nov23_prospective_revision_owner_v39.ts)" = 774d1d0907076b25487ecb3bce28a35a3ad319af
test -z "$(git status --porcelain --untracked-files=no)"
OUT="$HOME/.travnr-phase6-monday-795ace55"
if [ -e "$OUT" ]; then OUT="$OUT-recovered-$(date -u +%Y%m%dT%H%M%SZ)-$$"; fi
export P6_RECOVERY_OUT="$OUT" P6_RECOVERY_STAGE="$STAGE" P6_RECOVERY_COST="$COST"
export P6_RECOVERY_EXPECTED_STAGE="$TMP/expected-stage.json" P6_RECOVERY_DECISION="$DECISION"
npm ci --include=dev --no-audit --no-fund
node --input-type=module <<'JS'
import fs from 'node:fs';
const src=fs.readFileSync('review-tools/p6_nov23_prospective_revision_owner_v39.ts','utf8');
const cut=src.indexOf('\nasync function main(){');
if(cut<0 || src.indexOf('async function main(){',cut+2)>=0) throw Error('RECOVERY_ENTRYPOINT_LAYOUT');
fs.writeFileSync('review-tools/.p6_exact_recover_only.ts',src.slice(0,cut)+'\n',{mode:0o600,flag:'wx'});
JS
cat >> review-tools/.p6_exact_recover_only.ts <<'TS'
const recoveryHead=exactCheckout();
if(recoveryHead!==process.env.P6_RECOVERY_STAGE || process.env.DATABASE_URL || process.env.V39_DATABASE_RUNTIME_URL || process.env.AERODATABOX_API_KEY || process.env.RAPIDAPI_KEY || process.env.AERODATABOX_WEBHOOK_SECRET || process.env.ADB_AUTO_COLLECT!=="0" || process.env.V39_PHASE6_PROCESS_ARMED!=="0" || process.env.V39_PHASE6_OWNER_APPROVED!=="0") hold("RECOVERY_SCOPE");
const prior=recoverP6Nov22StageInputFromCommittedEvidence().input;
const rb=baseReview(recoveryHead,prior);
const decisionFile=process.env.P6_RECOVERY_DECISION!;
const decisionHash=sha(readFileSync(decisionFile));
approvedDecision(decisionFile,decisionHash,{reviewDigest:rb.reviewDigest,dateReceiptSha256:rb.scope.dateReceiptSha256,oldStageSha256:P6_NOV22_STAGE_SHA,sourceInventorySha256:rb.scope.sourceInventorySha256},recoveryHead);
const rv=prepared(prior,recoveryHead,rb,decisionHash);
const exactStage=readFileSync(process.env.P6_RECOVERY_EXPECTED_STAGE!);
if(!Buffer.from(JSON.stringify(rv.ctx.newInput)).equals(exactStage) || rv.stageSha!==sha(exactStage) || rv.costSha!==process.env.P6_RECOVERY_COST || sha(rv.ctx.newManifestRaw)!==rv.ctx.newInput.manifestSha256 || hash(rv.config)!==rv.ctx.newInput.configSha256) hold("RECOVERY_EXACT_BYTES_DRIFT");
verifyP6ActualCommittedPlanParity(rv.result,p=>execFileSync("git",["show",recoveryHead+":"+p],{stdio:["ignore","pipe","ignore"],timeout:15000,maxBuffer:600000}),p=>readFileSync(p));
const recoverySummary={status:"P6_EXACT_PRIVATE_STAGE_RECOVERED_NO_GO",main:recoveryHead,stageSha256:rv.stageSha,costSha256:rv.costSha,manifestSha256:rv.ctx.newInput.manifestSha256,configSha256:rv.ctx.newInput.configSha256,reviewDigest:rv.reviewDigest,decisionSha256:decisionHash,dayPlanSha256s:rv.result.summary.dayPlanSha256s,sourceQueries:6144,reservedUnits:36740,phase6PaidGo:false,providerCalls:0,databaseReads:0,databaseWrites:0};
const recoveryFiles:Record<string,string>={"prospective-revision-package.json":JSON.stringify(rv.ctx),"new-stage-input.json":JSON.stringify(rv.ctx.newInput),"new-manifest.json":rv.ctx.newManifestRaw,"new-config.json":JSON.stringify(rv.config),"new-external.json":JSON.stringify(rv.external),"new-timing.json":JSON.stringify(rv.timing),"revision-review.json":JSON.stringify(rv.ctx.review),"review-summary.json":JSON.stringify(recoverySummary)};
for(const f of rv.result.files.slice(0,31)) recoveryFiles["plans/"+f.path.split("/").at(-1)]=f.bytes;
console.log(JSON.stringify({...recoverySummary,output:save(process.env.P6_RECOVERY_OUT!,recoveryFiles)}));
TS
./node_modules/.bin/tsx review-tools/.p6_exact_recover_only.ts
node --input-type=module <<'JS'
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const checks=[
 ['pre-policy.json','8a9175f746d9ebfcc21deaa963b6b3d452d90e64f71d84061496bbbe4e6040ae'],
 ['reference-policy.json','ce340f1a7d9d496c42d0782823867b427dc4f793fdfcd4d38c8717bf7872ca64'],
 ['auth.json','8b1e3782d95db532195e626c41c603b00f58467505f368193930617b3c7fd297']
];
const home=fs.realpathSync(process.env.HOME);
for(const [name,expected] of checks){
 let exact=0,unsafe=0;
 for(const dir of fs.readdirSync(home,{withFileTypes:true})){
  if(!dir.isDirectory()||!dir.name.startsWith('.travnr-')) continue;
  const base=path.join(home,dir.name),p=path.join(base,name);
  try{
   const d=fs.lstatSync(base),s=fs.lstatSync(p);
   if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||s.uid!==process.getuid()||d.uid!==process.getuid()||(s.mode&0o077)||(d.mode&0o077)||s.size>200000){unsafe++;continue;}
   if(crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')===expected){exact++;console.log(JSON.stringify({exactPrivateArtifact:name,path:p}));}
  }catch(e){if(e.code!=='ENOENT')throw e;}
 }
 console.log(JSON.stringify({artifact:name,exactMatches:exact,unsafeCandidates:unsafe}));
}
JS
echo 'P6_RECOVERY_ONLY_COMPLETE_NO_GO'
P6_RECOVER_EXACT_STAGE
```

The recovery must not invoke --apply-reviewed: the historical restage helper expects a different predecessor and the last recorded live DB already has a Monday packet. Reconcile actual stage once using exact owner readback and the existing commissioned-stage successor contract before changing any DB. If exact private policies are found on Mac but not Replit, use that original environment or transfer securely; never commit private policies or AUTH. Finish remaining production steps on one final stable main, coordinate expiry and relay repin only once. Source clock is 2026-11-23T23:45Z, AUTH deadline 23:10Z; no paid GO is claimed.

Non-effects: providerCalls=0, databaseReads=0, databaseWrites=0, sourceEnablements=0, phase6PaidGo=false. This checkpoint changes no scientific plan, code, approval bytes, or runtime flag.
