#!/usr/bin/env bash
# Detached historical compiler fixtures; never connect to production or apply a stage.
set -Eeuo pipefail
set +x
umask 077
ROOT="$(git rev-parse --show-toplevel)"
test "$(pwd -P)" = "$(cd "$ROOT" && pwd -P)"
OUT="${1:?output pair directory required}"
test ! -e "$OUT"
mkdir -m 700 "$OUT"
OUT="$(cd "$OUT" && pwd -P)"
RUNTIME="${P6_FIXTURE_RUNTIME:-$ROOT/node_modules}"
test -x "$RUNTIME/.bin/tsx"
export ADB_AUTO_COLLECT=0 V39_PHASE6_PROCESS_ARMED=0 V39_PHASE6_OWNER_APPROVED=0
unset DATABASE_URL V39_DATABASE_RUNTIME_URL AERODATABOX_API_KEY RAPIDAPI_KEY AERODATABOX_WEBHOOK_SECRET
TMP="$(mktemp -d)"
cleanup(){ git -C "$ROOT" worktree remove --force "$TMP/old" >/dev/null 2>&1 || true; git -C "$ROOT" worktree remove --force "$TMP/new" >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
recover(){
 local name="$1" code="$2" date="$3" stage="$4" cost="$5"
 git cat-file -e "$code^{commit}" || git fetch --no-tags origin "$code"
 git worktree add --detach "$TMP/$name" "$code" >/dev/null
 (
 cd "$TMP/$name"
 test "$(git rev-parse HEAD)" = "$code"
 test "$(git hash-object review-tools/p6_nov23_prospective_revision_owner_v39.ts)" = 774d1d0907076b25487ecb3bce28a35a3ad319af
 test -z "$(git status --porcelain --untracked-files=no)"
 ln -s "$RUNTIME" node_modules
 export P6_FIXTURE_CODE="$code" P6_FIXTURE_DATE="$date" P6_FIXTURE_STAGE="$stage" P6_FIXTURE_COST="$cost" P6_FIXTURE_OUTPUT="$OUT/$name"
 node --input-type=module <<'JS'
import fs from 'node:fs';
const src=fs.readFileSync('review-tools/p6_nov23_prospective_revision_owner_v39.ts','utf8');
const cut=src.indexOf('\nasync function main(){');
if(cut<0)throw Error('EXACT_HISTORICAL_COMPILER_LAYOUT');
const raw=src.slice(0,cut);
const original='compileP6ProspectiveDisabledStageRevisionV39(ctx)';
if(raw.split(original).length!==2)throw Error('FIXTURE_CLOCK_LOCATION');
fs.writeFileSync('review-tools/.p6_fixture_only.ts',raw.replace(original,'compileP6ProspectiveDisabledStageRevisionV39({...ctx,now:new Date("2026-11-22T03:40:00.000Z")})')+'\n',{mode:0o600,flag:'wx'});
JS
 cat >> review-tools/.p6_fixture_only.ts <<'TS'
const h=exactCheckout(),now=new Date("2026-11-22T03:40:00.000Z");
if(h!==process.env.P6_FIXTURE_CODE||process.env.DATABASE_URL||process.env.V39_DATABASE_RUNTIME_URL||process.env.AERODATABOX_API_KEY||process.env.RAPIDAPI_KEY||process.env.AERODATABOX_WEBHOOK_SECRET)hold("FIXTURE_SCOPE");
const prev=recoverP6Nov22StageInputFromCommittedEvidence().input,b=baseReview(h,prev),date=process.env.P6_FIXTURE_DATE!,raw=readFileSync(date),d=sha(raw);
if(!raw.equals(execFileSync("git",["show",h+":"+date],{stdio:["ignore","pipe","ignore"]})))hold("FIXTURE_DATE_BYTES");
validateP6MondayDateDecision(JSON.parse(raw.toString("utf8")),{reviewDigest:b.reviewDigest,dateReceiptSha256:b.scope.dateReceiptSha256,oldStageSha256:P6_NOV22_STAGE_SHA,sourceInventorySha256:b.scope.sourceInventorySha256},now);
const v=prepared(prev,h,b,d);
if(v.stageSha!==process.env.P6_FIXTURE_STAGE||v.costSha!==process.env.P6_FIXTURE_COST||sha(v.ctx.newManifestRaw)!==v.ctx.newInput.manifestSha256||hash(v.config)!==v.ctx.newInput.configSha256)hold("FIXTURE_EXACT_BYTES");
verifyP6ActualCommittedPlanParity(v.result,p=>execFileSync("git",["show",h+":"+p],{stdio:["ignore","pipe","ignore"],timeout:15000,maxBuffer:600000}),p=>readFileSync(p));
const dir=process.env.P6_FIXTURE_OUTPUT!;
mkdirSync(dir,{mode:0o700});
for(const [name,raw] of Object.entries({"prospective-revision-package.json":JSON.stringify(v.ctx),"new-stage-input.json":JSON.stringify(v.ctx.newInput),"new-manifest.json":v.ctx.newManifestRaw,"new-config.json":JSON.stringify(v.config),"new-external.json":JSON.stringify(v.external),"new-timing.json":JSON.stringify(v.timing)}))writeFileSync(join(dir,name),raw,{mode:0o600,flag:"wx"});
console.log(JSON.stringify({status:"HISTORICAL_FIXTURE_EXACT_NO_GO",head:h,stageSha:v.stageSha,costSha:v.costSha,providerCalls:0,databaseWrites:0}));
TS
 ./node_modules/.bin/tsx review-tools/.p6_fixture_only.ts
 )
}
recover old 781140cde71af3b72376c2db9f0fdb84204a2b7c data-collection/phase5/evidence/2026-11-21_monday_exact_machine_bound_date_decision.json a4c30369fcb52eb58da2dd12ec0ea9dabb07fe41b171f44fcb766d0408b3f682 ebf61e512a40c03e3bd3be679a83f995645b199f0bbb172f82677e9cb7976f0e
if [ "${2:-}" = "--old-only" ]; then
 echo 'P6_OLD_HISTORICAL_PACKAGE_EXACT_NO_GO'
 exit 0
fi
test -z "${2:-}"
recover new 795ace55984b44a3d0bffa886d33a5ec11d31927 data-collection/phase5/evidence/2026-11-22_monday_exact_machine_bound_date_decision.json 8adfc61a2bdc73ebacf17aa16788bfa14b890d2eb501e8ca7435109116f096fc cef58dcc4e8009d46e686bb555faab0fe952b9921e8aa3aa13d610ea443e3bf9
echo 'P6_BOTH_HISTORICAL_FIXTURES_EXACT_NO_GO'
