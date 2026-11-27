#!/usr/bin/env bash
# Owner-only I132/T126. Read-only wait, then ONE existing reviewed helper.
# This wrapper issues no provider/DB/secret/dispatch calls itself. Never cancel.
set -Eeuo pipefail
set +x
umask 077
hold(){ echo "HOLD_P5B_WAIT_ONCE stage=$stage reason=$1" >&2; exit 2; }
stage=ADMISSION
[[ "$#" == 1 && "$1" == WAIT_ONCE_EXACT_REVIEWED_980 ]] || hold EXACT_MODE
R=HKcode22/ReplitTranvr
TARGET=c4408c621a84a2549355d935cca7333c5527d3c2
BASE=2b9cb404da863aede54d9069e440ff32bcf6d00e
BLOB=1bbec6f1d0dacbc0432b5c7c36955b43163855fa
WF=phase5-one-signed-day-source-child-dispatch.yml
[[ "$(gh api user --jq '.login')" == HKcode22 ]] || hold OWNER
# Only the actual Nov27 signed Day4 drain window. A later day needs review,
# not a silent indefinite loop or modified sampling calendar.
NOT_BEFORE=1795793400 # 2026-11-27T15:30:00Z
NOT_AFTER=1795816800  # 2026-11-27T22:00:00Z
P5B_TMP="$(mktemp -d)"
trap 'rm -rf "$P5B_TMP"' EXIT
assert_release(){
 local pin
 pin="$(gh api "repos/$R/git/ref/heads/main" --jq '.object.sha')" || hold MAIN_UNREADABLE
 [[ "$pin" == "$BASE" ]] || hold MAIN_CHANGED_NO_SECOND_DEPLOY
 gh api "repos/$R/pulls/980" > "$P5B_TMP/pr.json" || hold PR_UNREADABLE
 node -e 'const p=JSON.parse(require("fs").readFileSync(process.argv[1]));if(p.state!=="open"||p.merged!==false||p.head?.sha!==process.argv[2])process.exit(2)' "$P5B_TMP/pr.json" "$TARGET" || hold EXACT_PR_CHANGED
}
stage=READONLY_DRAIN_WAIT
for ((i=0;i<320;i++));do
 assert_release
 now="$(date -u +%s)"
 [[ "$now" =~ ^[0-9]{10}$ ]] || hold CLOCK_UNREADABLE
 (( now < NOT_AFTER )) || hold REVIEWED_WAIT_EXPIRED
 if (( now < NOT_BEFORE ));then
  echo "P5B_WAIT_ONCE signed_day4_source_window_not_finished no_mutation=true"
  sleep 45
  continue
 fi
 active=0
 for state in queued in_progress waiting requested pending;do
  n="$(gh api "repos/$R/actions/workflows/$WF/runs?branch=main&status=$state&per_page=100" --jq '.total_count')" || hold SOURCE_STATUS_UNREADABLE
  [[ "$n" =~ ^[0-9]{1,6}$ ]] || hold SOURCE_COUNT_UNREADABLE
  active=$((active+n))
 done
 if (( active > 0 ));then
  echo "P5B_WAIT_ONCE active_source_children=$active no_cancel=true"
  sleep 45
  continue
 fi
 # No loop surrounds the mutating helper. It recertifies exact CI, fresh STOP,
 # tasks, all-main/relay quiet and full 130-minute database-clock margin itself.
 stage=ONE_EXACT_HELPER
 assert_release
 gh api "repos/$R/git/blobs/$BLOB" --jq '.content' | base64 --decode > "$P5B_TMP/deploy.sh"
 [[ "$(git hash-object "$P5B_TMP/deploy.sh")" == "$BLOB" ]] || hold HELPER_BLOB
 bash -n "$P5B_TMP/deploy.sh"
 bash "$P5B_TMP/deploy.sh" DEPLOY_EXACT_REVIEWED_SOURCE_ONLY_TARGET_980 "$TARGET"
 exit 0
done
hold BOUNDED_WAIT_EXHAUSTED
