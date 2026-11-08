#!/usr/bin/env bash
# PHASE5 V2 callback-only future Replit deployment: reviewed source-equivalent build.
# Candidate source authority is an EXACT, tested GitHub main commit. This is
# NOT a Phase5 FREEZE/Phase6 GO, not a provider call, not a DB migration, and
# not proof of a signed external callback delivery. No paid owner is armed.
#
# Keep scripts/v39_gate4_reviewed_source_build_v39.sh byte-unchanged as the
# historical 84b7f15 receiver build. Never weaken its original provenance.
set -Eeuo pipefail
set +x
cd "$(git rev-parse --show-toplevel)"

# Source SHA of Phase5 PR #481 merged after 5/5 exact-head successful checks.
# This NEW V2 PIN includes Phase5 server engineering; old build scripts remain immutable.
PIN=6c187d58e2b1339aace71079e27767523d8ca3ce
OLD_BUILD='build = ["bash", "scripts/v39_phase5_reviewed_source_build_v39.sh"]'
NEW_BUILD='build = ["bash", "scripts/v39_phase5_callback_release_v2_reviewed_build_v39.sh"]'
hold(){ echo 'PHASE5_CALLBACK_REVIEWED_SOURCE_BUILD_HOLD' >&2; exit 2; }

test "$#" -eq 0 || { test "$#" -eq 1 && test "$1" = "--verify-only"; } || hold
git cat-file -e "$PIN^{commit}" 2>/dev/null || hold
git merge-base --is-ancestor "$PIN" HEAD || hold

# No executable change allowed after the exact reviewed receiver source PIN.
# A future Phase5 source/code update requires its own independently reviewed
# new PIN and deploy-build change. Never silently absorb a future main.
git diff --quiet "$PIN" HEAD -- \
 client server shared package.json package-lock.json scripts/build.ts \
 vite.config.ts tsconfig.json postcss.config.js tailwind.config.ts \
 components.json drizzle.config.ts || hold

# Dirty tracked, staged, or untracked executable/config inputs refuse publish.
git diff --quiet HEAD -- \
 client server shared package.json package-lock.json scripts/build.ts \
 vite.config.ts tsconfig.json postcss.config.js tailwind.config.ts \
 components.json drizzle.config.ts .replit \
 scripts/v39_phase5_callback_release_v2_reviewed_build_v39.sh || hold
git diff --cached --quiet -- \
 client server shared package.json package-lock.json scripts/build.ts \
 vite.config.ts tsconfig.json postcss.config.js tailwind.config.ts \
 components.json drizzle.config.ts .replit \
 scripts/v39_phase5_callback_release_v2_reviewed_build_v39.sh || hold
test -z "$(git ls-files --others --exclude-standard -- \
 client server shared scripts/build.ts vite.config.ts tsconfig.json \
 postcss.config.js tailwind.config.js components.json drizzle.config.ts)" || hold

# Entire published configuration MUST be the exact original reviewed PIN
# config with ONLY the build-wrapper path switched; all env, callback-only
# deployment, object-bucket, runtime flags and HTTP port remain untouched.
test "$(grep -Fxc "$NEW_BUILD" .replit)" -eq 1 || hold
git show "$PIN:.replit" | awk -v old="$OLD_BUILD" -v new="$NEW_BUILD" '
  $0==old { print new; edits++; next }
  { print }
  END { if(edits!=1) exit 2 }
' | cmp -s - .replit || hold

# No unreviewed environment override can spoof the publicly reported code.
OVERRIDE="$(printenv V39_BUILD_GIT_HEAD 2>/dev/null || true)"
test -z "$OVERRIDE" || test "$OVERRIDE" = "$PIN" || hold

SNAPSHOT="$(git rev-parse HEAD)"
if test "$#" -eq 1; then
 echo "PHASE5_V2_CALLBACK_SOURCE_EQUIVALENCE_VERIFIED_NOT_PUBLISHED"
 exit 0
fi

# Replit's build only: no database, provider or deployment action inside here.
V39_CALLBACK_ONLY_BUILD=1 V39_BUILD_GIT_HEAD="$PIN" npm run build
node --input-type=module - "$PIN" "$SNAPSHOT" <<'NODE'
import {readFileSync,writeFileSync} from 'node:fs';
const [reviewed,snapshot]=process.argv.slice(2);
const m=JSON.parse(readFileSync('dist/v39-build-meta.json','utf8'));
if(m.schema!=='v39.build-meta.v1'||m.git_head!==reviewed)
 throw Error('PHASE5_CALLBACK_BUILD_SOURCE_IDENTITY_MISMATCH');
writeFileSync('dist/v39-snapshot-provenance.json',JSON.stringify({
 schema:'v39.phase5.callback-reviewed-source-equivalence.v2',
 reviewed_runtime_source_commit:reviewed,
 actual_replit_snapshot_git_head:snapshot,
 runtime_inputs_identical_to_reviewed:true,
 phase5_freeze_passed:false,
 phase6_paid_launch_authorized:false
},null,2)+'\n',{mode:0o600});
NODE
echo 'PHASE5_V2_CALLBACK_REVIEWED_BUILD_COMPLETE_NOT_DEPLOYED'
