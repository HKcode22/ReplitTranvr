#!/usr/bin/env bash
# G12 narrow protected POST SHA recovery only; original 17-secret install is DONE.
# Resets two global paid STOPs at both scopes BEFORE any approved-code update.
set -Eeuo pipefail
set +x
umask 077
R=HKcode22/ReplitTranvr
ENVIRONMENT=phase6-protected-runtime
MAIN=c8e065d665ccacb6d2575070e94c5500b7583044
RELAY=c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed
WF=phase5-one-signed-future-post-v0083-main-manual.yml
WFSHA=348db0b7934b79c90cfb14c7db9d26ff80f0df3e
G12=45123278530
hold(){ echo "HOLD_P6_G12_PROTECTED_$1_PAID_GO_OFF" >&2; exit 2; }
[[ $# -eq 1 && "$1" == ONLY_PROTECTED_POST_C8_SHA_RECONCILE_WITH_PAID_STOPS_ZERO ]] || hold CONFIRM
for cmd in gh jq git date sort comm; do command -v "$cmd" >/dev/null || hold TOOL; done
[[ "$(gh api user --jq .login)" == HKcode22 ]] || hold OWNER
[[ "$(date -u +%s)" -lt "$(date -u -d 2026-11-23T21:50:00Z +%s)" ]] || hold TOO_LATE_FOR_PREGO_REPAIR
[[ ! -e "$HOME/.travnr-p6-g13-owner-paid-go-once.started" ]] || hold G13_ALREADY_ATTEMPTED
pin(){
 [[ "$(gh api "repos/$R/git/ref/heads/main" --jq .object.sha)" == "$MAIN" ]] || hold MAIN_DRIFT
 [[ "$(gh api repos/HKcode22/TravnrClockRelay/git/ref/heads/main --jq .object.sha)" == "$RELAY" ]] || hold RELAY_DRIFT
}
pin
[[ "$(gh api -X GET "repos/$R/contents/.github/workflows/$WF" -f ref=main --jq .sha)" == "$WFSHA" ]] || hold POST_WORKFLOW_CHANGED
gh api "repos/$R/actions/runs/$G12" | jq -e '.status=="completed" and .conclusion=="success" and .run_attempt==1 and .name=="P6 G12 exact current c8 policy postinstall readback NO PROVIDER"' >/dev/null || hold G12_REPO_READBACK
gh api "repos/$R/actions/runs/$G12/jobs?filter=latest&per_page=100" | jq -e '[.jobs[]|select(.name=="repository-secret-readback" and .conclusion=="success" and ([.steps[]|select(.name=="Check 31 canonical installed policy values and both OFF switches in THIS scope" and .conclusion=="success")]|length)==1)]|length==1' >/dev/null || hold G12_31_CANONICAL_VALUES
TMP="$(mktemp -d)"
trap 'rm -rf -- "$TMP"' EXIT
Q="repos/$R/actions/workflows/$WF/runs?branch=main&event=workflow_dispatch&per_page=100"
gh api "$Q" > "$TMP/history.json" || hold RUN_HISTORY
if jq -e --arg sha "$MAIN" '[.workflow_runs[]|select(.head_sha==$sha and .display_title=="P5 POST ACTOR_PREFLIGHT_ONLY" and .created_at>"2026-11-23T06:19:02Z" and .status=="completed" and .conclusion=="success" and .run_attempt==1)]|length>0' "$TMP/history.json" >/dev/null; then
 echo P6_G12_PROTECTED_POST_ALREADY_HAS_SUCCESS_INSPECT_FOUR_STEPS_NO_WRITE
 exit 0
fi
gh api "repos/$R/actions/secrets?per_page=100" > "$TMP/repo.json" || hold REPO_META
gh api "repos/$R/environments/$ENVIRONMENT/secrets?per_page=100" > "$TMP/env.json" || hold ENV_META
for name in V39_P5_POST_APPROVED_CODE_SHA V39_PHASE6_PROCESS_ARMED V39_PHASE6_OWNER_APPROVED; do
 jq -e --arg n "$name" '[.secrets[]|select(.name==$n)]|length==1' "$TMP/repo.json" >/dev/null || hold REPO_NAME
 jq -e --arg n "$name" '[.secrets[]|select(.name==$n)]|length==1' "$TMP/env.json" >/dev/null || hold ENV_NAME
done
RT="$(jq -r '.secrets[]|select(.name=="V39_P5_POST_APPROVED_CODE_SHA")|.updated_at' "$TMP/repo.json")"
ET="$(jq -r '.secrets[]|select(.name=="V39_P5_POST_APPROVED_CODE_SHA")|.updated_at' "$TMP/env.json")"
[[ -n "$RT" && -n "$ET" && "$ET" < "$RT" ]] || hold NO_STALE_ENV_SCOPE_METADATA
pin
# All four safe 0 assertions, then just ONE protected-environment SHA update.
gh secret set V39_PHASE6_PROCESS_ARMED -R "$R" --body 0 >/dev/null || hold REPO_ARM_STOP
gh secret set V39_PHASE6_OWNER_APPROVED -R "$R" --body 0 >/dev/null || hold REPO_OWNER_STOP
gh secret set V39_PHASE6_PROCESS_ARMED -R "$R" -e "$ENVIRONMENT" --body 0 >/dev/null || hold ENV_ARM_STOP
gh secret set V39_PHASE6_OWNER_APPROVED -R "$R" -e "$ENVIRONMENT" --body 0 >/dev/null || hold ENV_OWNER_STOP
pin
gh secret set V39_P5_POST_APPROVED_CODE_SHA -R "$R" -e "$ENVIRONMENT" --body "$MAIN" >/dev/null || hold ENV_SHA_WRITE
pin
gh api "$Q" --jq '.workflow_runs[].id' | sort -n > "$TMP/before" || hold POST_INVENTORY
gh workflow run "$WF" -R "$R" --ref main \
  -f confirm=ONLY_POST_INDEPENDENT_ACTOR_PREFLIGHT_NO_PROVIDER \
  -f frozen_future_post_packet=ACTOR_PREFLIGHT_ONLY \
  -f private_transport=checkout || hold DISPATCH_UNKNOWN
POST=""
for i in $(seq 1 50); do
 gh api "$Q" --jq '.workflow_runs[].id' | sort -n > "$TMP/after" || hold POST_HISTORY
 comm -13 "$TMP/before" "$TMP/after" > "$TMP/new"
 N="$(wc -l < "$TMP/new" | tr -d ' ')"
 [[ "$N" -le 1 ]] || hold MULTIPLE_NEW_POST_RUNS
 if [[ "$N" == 1 ]]; then POST="$(cat "$TMP/new")"; break; fi
 sleep 2
done
[[ "$POST" =~ ^[1-9][0-9]*$ ]] || hold POST_RUN_ID_UNKNOWN
echo "P6_G12_PROTECTED_POST_RUN_ID=$POST"
gh run watch "$POST" -R "$R" --interval 5 --exit-status || hold POST_PREFLIGHT_FAILED
gh api "repos/$R/actions/runs/$POST" | jq -e --arg sha "$MAIN" '.head_sha==$sha and .head_branch=="main" and .display_title=="P5 POST ACTOR_PREFLIGHT_ONLY" and .event=="workflow_dispatch" and .run_attempt==1 and .status=="completed" and .conclusion=="success"' >/dev/null || hold RUN_IDENTITY
gh api "repos/$R/actions/runs/$POST/jobs?filter=latest&per_page=100" | jq -e --arg sha "$MAIN" '[.jobs[]|select(.name=="exact-main-post-actors-only" and .head_sha==$sha and .run_attempt==1 and .conclusion=="success")] as $a | ($a|length)==1 and (([$a[0].steps[]|select(.conclusion=="success" and (.name=="Verify exact disarmed POST actor admission" or .name=="Preflight actual independent POST reviewer no observation" or .name=="Preflight actual restricted POST publisher and deadline clock" or .name=="Preflight exact independent bundle storage actors"))]|length)==4)' >/dev/null || hold FOUR_ACTOR_STEPS
pin
printf '{"status":"P6_G12_PROTECTED_C8_POST_FOUR_STEPS_PASS_PAID_OFF","repoReadbackRunId":%s,"protectedMainPostRunId":%s,"paidGo":false}\n' "$G12" "$POST"
