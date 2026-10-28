#!/usr/bin/env bash
# Deterministic reviewed-content Gate4 raw-first + NEXT4 isolated receiver build, no provider/database calls.
# Gate05 prospective receiver source fully reviewed by PRs #230-232, frozen
# at 84b7f156. A separate packaging commit changes only this build script,
# staged migration and read-only installer; deployable inputs must remain
# byte-identical to the frozen reviewed source commit. The earlier NEXT4
# runtime remains a historical source, not the new Gate05 publish source.
set -Eeuo pipefail
set +x
cd "$(git rev-parse --show-toplevel)"
PIN=84b7f1565d0402facc8c3b9aacedc599eb6e2af1
EXPECTED='build = ["bash", "scripts/v39_gate4_reviewed_source_build_v39.sh"]'
hold(){ echo "GATE4_VERIFIED_BUILD_SOURCE_HOLD" >&2; exit 2; }
test "$#" -eq 0 || { test "$#" -eq 1 && test "$1" = "--verify-only"; } || hold
git cat-file -e "$PIN^{commit}" 2>/dev/null || hold
git merge-base --is-ancestor "$PIN" HEAD || hold
git diff --quiet "$PIN" HEAD -- \
 client server shared package.json package-lock.json scripts/build.ts \
 vite.config.ts tsconfig.json postcss.config.js tailwind.config.ts \
 components.json drizzle.config.ts .replit || hold
git diff --quiet HEAD -- client server shared package.json package-lock.json \
 scripts/build.ts vite.config.ts tsconfig.json postcss.config.js \
 tailwind.config.ts components.json drizzle.config.ts .replit \
 scripts/v39_gate4_reviewed_source_build_v39.sh || hold
git diff --cached --quiet -- client server shared package.json package-lock.json \
 scripts/build.ts vite.config.ts tsconfig.json postcss.config.js \
 tailwind.config.ts components.json drizzle.config.ts .replit \
 scripts/v39_gate4_reviewed_source_build_v39.sh || hold
test -z "$(git ls-files --others --exclude-standard -- \
 client server shared scripts/build.ts vite.config.ts tsconfig.json)" || hold
grep -Fxq "$EXPECTED" .replit || hold
OVERRIDE="$(printenv V39_BUILD_GIT_HEAD 2>/dev/null || true)"
test -z "$OVERRIDE" || test "$OVERRIDE" = "$PIN" || hold
SNAPSHOT="$(git rev-parse HEAD)"
if test "$#" -eq 1; then
 echo "GATE4_REVIEWED_CONTENT_PREFLIGHT_PASS"
 exit 0
fi
# Baked identity is reviewed byte-equivalent receiver source, not packaging HEAD.
V39_CALLBACK_ONLY_BUILD=1 V39_BUILD_GIT_HEAD="$PIN" npm run build
node --input-type=module - "$PIN" "$SNAPSHOT" <<'NODE'
import {readFileSync,writeFileSync} from 'node:fs';
const [reviewed,snapshot]=process.argv.slice(2);
const m=JSON.parse(readFileSync('dist/v39-build-meta.json','utf8'));
if(m.git_head!==reviewed)throw Error('SOURCE_PIN_META_HOLD');
writeFileSync('dist/v39-snapshot-provenance.json',
 JSON.stringify({
  schema:'v39.gate4.source-equivalence-build.v1',
  reviewed_runtime_source_commit:reviewed,
  actual_replit_snapshot_git_head:snapshot,
  runtime_inputs_identical_to_reviewed:true
 },null,2)+'\n',{mode:0o600});
NODE
echo "GATE4_REVIEWED_CONTENT_BUILD_PASS"
