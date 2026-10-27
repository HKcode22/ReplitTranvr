#!/usr/bin/env bash
# Existing NEXT4 live source; launch the owner-authorized one-off paid trial
# from a detached reviewed Git checkout. NEVER rewrite the Replit release
# branch, its private evidence, or the published callback runtime.
set -Eeuo pipefail
set +x
ROOT="$HOME/workspace"
cd "$ROOT"
SOURCE=1885703c04ba8f24bf8d1183f873eb86d1f83d7c
PIN="$(git rev-parse FETCH_HEAD)"
test "$PIN" = "$(git ls-remote origin refs/heads/main | awk '{print $1}')"
test "$(git branch --show-current)" = release/gate4-rawfirst-20261026
test -z "$(git status --porcelain=v1 --untracked-files=normal)"
test -d "$ROOT/node_modules"
test -f "$ROOT/dist/v39-build-meta.json"
# Validate the already published runtime's build pin without building again.
node --input-type=module <<'NODE'
import {readFileSync} from "node:fs";
const p=JSON.parse(readFileSync("dist/v39-build-meta.json","utf8"));
if(p.git_head!=="1885703c04ba8f24bf8d1183f873eb86d1f83d7c")
 throw Error("NEXT4_PUBLISHED_RUNTIME_BUILD_PIN_HOLD");
NODE
echo NEXT4_ORIGINAL_REPLIT_BRANCH_PRESERVED
WORK="$(mktemp -d /tmp/gate4-next4-paid.XXXXXX)"
CLEANUP(){
 git -C "$ROOT" worktree remove --force "$WORK" >/dev/null 2>&1 || true
 rmdir "$WORK" >/dev/null 2>&1 || true
}
trap CLEANUP EXIT
git -C "$ROOT" worktree add --detach "$WORK" "$PIN" >/dev/null
ln -s "$ROOT/node_modules" "$WORK/node_modules"
if test -f "$ROOT/.env"; then ln -s "$ROOT/.env" "$WORK/.env"; fi
mkdir -p "$WORK/dist"
cp "$ROOT/dist/v39-build-meta.json" "$WORK/dist/v39-build-meta.json"
cd "$WORK"
test "$(git rev-parse HEAD)" = "$PIN"
V39_BUILD_GIT_HEAD="$SOURCE" bash scripts/v39_gate4_reviewed_source_build_v39.sh --verify-only
echo NEXT4_REVIEWED_ISOLATED_SOURCE_PASS
command -v gh >/dev/null
gh auth status >/dev/null 2>&1
export GATE4_NEXT4_PAID_OPERATOR_SHA="$PIN"
export GATE4_NEXT4_PAID_GO=OWNER_APPROVED_ONE_NEXT4_WSSS_TRIAL_SOFT5_FLOOR1900_WITH_BURST_RISK
echo NEXT4_OWNER_APPROVED_ONE_TRIAL_GATE_ACTIVE
node --import tsx scripts/v39_gate4_next4_one_paid_trial_v39.ts --run
