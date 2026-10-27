#!/usr/bin/env bash
# NEXT4 owner-approved ONE paid WSSS trial. No prior NEXT1/2/3 replay.
# Existing NEXT4 receiver live+sealed. Independent STOP+GET monitor MUST be armed.
set -Eeuo pipefail
set +x
cd ~/workspace
SOURCE=1885703c04ba8f24bf8d1183f873eb86d1f83d7c
PREVIOUS=f857fad235b27ab5f0863040d1e7780dfa0d83e6
HEAD="$(git rev-parse FETCH_HEAD)"
test "$(git branch --show-current)" = release/gate4-rawfirst-20261026
test -z "$(git status --porcelain=v1 --untracked-files=normal)"
CURRENT="$(git rev-parse HEAD)"
if test "$CURRENT" != "$HEAD"; then
 case "$CURRENT" in
 "$PREVIOUS"|a5a605516022ea0f8ee49960298ed5b3b0046b8f|6ad89838044d80c8994f3126733859e70cb0fa2b)
   git merge-base --is-ancestor HEAD FETCH_HEAD
   git merge --ff-only FETCH_HEAD
   ;;
 *) echo NEXT4_PAID_HOLD_UNREVIEWED_LOCAL_HEAD; exit 2 ;;
 esac
fi
test "$(git rev-parse HEAD)" = "$HEAD"
test -z "$(git status --porcelain=v1 --untracked-files=normal)"
echo NEXT4_PAID_MAIN_SOURCE_ALIGNED
V39_BUILD_GIT_HEAD="$SOURCE" bash scripts/v39_gate4_reviewed_source_build_v39.sh --verify-only
node --input-type=module <<'NODE'
import {readFileSync} from 'node:fs';
const s=JSON.parse(readFileSync('dist/v39-build-meta.json','utf8')).git_head;
if(s!=='1885703c04ba8f24bf8d1183f873eb86d1f83d7c')
 throw Error('NEXT4_PAID_REVIEWED_BUILD_HOLD');
console.log('NEXT4_PAID_REVIEWED_BUILD_VERIFIED');
NODE
command -v gh >/dev/null
gh auth status >/dev/null 2>&1
export GATE4_NEXT4_PAID_OPERATOR_SHA="$HEAD"
export GATE4_NEXT4_PAID_GO=OWNER_APPROVED_ONE_NEXT4_WSSS_TRIAL_SOFT5_FLOOR1900_WITH_BURST_RISK
echo NEXT4_OWNER_APPROVED_ONE_TRIAL_GATE_ACTIVE
node --import tsx scripts/v39_gate4_next4_one_paid_trial_v39.ts --run
