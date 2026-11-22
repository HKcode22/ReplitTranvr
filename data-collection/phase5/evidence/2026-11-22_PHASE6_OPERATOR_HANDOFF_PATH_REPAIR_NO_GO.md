# Phase 6 — operator handoff path repair and current-head reconciliation (NO GO)

**Disposition:** HOLD / NO GO. This is a documentation-only checkpoint. It does not install a
stage, change a secret, dispatch a workflow, contact a provider, mutate a database, enable SOURCE,
or authorize paid collection. **phase6PaidGo=false.**

**Current observed main:** [b9fe58f770328ffd09b387259e64542220f1b1ab](https://github.com/HKcode22/ReplitTranvr/commit/b9fe58f770328ffd09b387259e64542220f1b1ab).

## Verified current-head evidence

- Both current-head safety checks are successful:
  [offline-safety](https://github.com/HKcode22/ReplitTranvr/actions/runs/44976854282/job/137068564661)
  and [public-repo-private-data-hold](https://github.com/HKcode22/ReplitTranvr/actions/runs/44976854305/job/137068564535).
- The owner authorization artifact AUTH-20261122-P6SOURCE is recorded in the source-enable
  ledger. It authorizes only the existing B0062 enable transition; it is not a paid GO and does
  not make a provider call.
- The remaining production evidence is still absent: the latest AUTH checkpoint states that the
  DB remains on the Nov 19 inert stage (code 781140c / manifest b2a691cb), while the reviewed
  candidate binds code 795ace55 and stage-input SHA-256 8adfc61a.

## Corrected stage-input reference

The historical AUTH checkpoint contains a non-executable path:

    data-collection/phase5/planning/phase6-source-day-stub.json

That path is absent from current main. The exact committed input is:

    data-collection/phase5/planning/phase6-monday-stage-input-795ace55.json

Its raw UTF-8 SHA-256 was independently rechecked against current main:

    8adfc61a2bdc73ebacf17aa16788bfa14b890d2eb501e8ca7435109116f096fc

The checked input binds:

| Item | Exact value |
| --- | --- |
| Code SHA | 795ace55984b44a3d0bffa886d33a5ec11d31927 |
| Manifest SHA-256 | a596feb9b3d8a1d75c8856a2f2f6bc559a87d58fd18132bbfa0f48428965118e |
| Config SHA-256 | 9f181bbc70a378f41b85ecd70cd8bc05d8bf4ef76398b0225400c4c21abccebe |
| Frame SHA-256 | 02ec6e78ba1fe3c2923d5a32cc7bd61ed6016a5ed4cfa13ce000a9f52db37c94 |
| Planned Phase 6 start | 2026-11-25 UTC |

This correction does **not** prove that the input has been installed. It removes an operator
path ambiguity only.

## Fixed-gate reconciliation

| Gate | Current disposition |
| --- | --- |
| 1 — PRE producer | Open: the reviewed policy cannot pass production inspect/apply until actual stage identity matches. |
| 2 — POST transport/reviewer | Open: production commissioning and a credible actual gate-out label path remain unproven. |
| 3 — retention | Open: read-only sentinel and visible-slot checks exist, but a positive due-time deletion and backup/PITR proof are still missing. |
| 4 — executable review/merge | Complete for the scoped code-review gate. |
| 5 — disabled Monday stage | Not complete in the production DB: old stage evidence does not establish installation of the reviewed packet. |
| 6 — protected runtime configuration | Open: six policy bytes and 31 static values need installation and independent readback. |
| 7 — autonomous no-provider rehearsal | Bounded no-provider chain subchecks passed; integrated release and scheduling reliability remain open. |
| 8 — separate SOURCE admission / paid authorization | AUTH exists, but SOURCE enablement has not run and paid GO remains separate and false. |

## Owner-run read-only Replit Shell inspection

Run this only from a clean checkout deliberately placed at the current observed main. It makes no
provider call and requests no write-capable runtime flag. It must stop on any identity mismatch;
do not reset, rebase, or overwrite an existing Replit worktree to satisfy it.

~~~bash
set -euo pipefail

# Set this to the existing clean ReplitTranvr checkout. Do not clone, reset, switch branches,
# or overwrite another worktree from this script.
REPO_DIR="${REPO_DIR:-$PWD}"
cd "$REPO_DIR"

EXPECTED_HEAD="b9fe58f770328ffd09b387259e64542220f1b1ab"
STAGE_JSON="data-collection/phase5/planning/phase6-monday-stage-input-795ace55.json"
EXPECTED_STAGE_SHA256="8adfc61a2bdc73ebacf17aa16788bfa14b890d2eb501e8ca7435109116f096fc"
EXPECTED_REVIEW_SHA256="b1f627a1bb3771c894acaf0b9879e2a4f94ce0fc915e00fc743cece77c90eac5"

test "$(git rev-parse --show-toplevel)" = "$PWD"
test "$(git rev-parse HEAD)" = "$EXPECTED_HEAD" || {
  echo "STOP: checkout is not the reviewed current head; preserve it and report the SHA."
  exit 20
}
test -z "$(git status --porcelain)" || {
  echo "STOP: worktree is dirty; preserve local work and do not reset it."
  exit 21
}
test -f "$STAGE_JSON" || {
  echo "STOP: corrected stage input is missing."
  exit 22
}
test "$(shasum -a 256 "$STAGE_JSON" | awk '{print $1}')" = "$EXPECTED_STAGE_SHA256" || {
  echo "STOP: stage input bytes do not match the reviewed SHA-256."
  exit 23
}

# Keep all provider and runtime-arming paths disabled.
export ADB_AUTO_COLLECT=0
export V39_PHASE6_PROCESS_ARMED=0
export V39_PHASE6_OWNER_APPROVED=0
unset AERODATABOX_API_KEY RAPIDAPI_KEY AERODATABOX_WEBHOOK_SECRET
unset V39_DATABASE_RUNTIME_URL GITHUB_ACTIONS

# Supply the existing owner read-only database URL locally without placing it in shell history.
if [ -z "${DATABASE_URL:-}" ]; then
  read -r -s -p "Paste owner read-only DATABASE_URL (hidden): " DATABASE_URL
  printf '\n'
  export DATABASE_URL
fi

node --experimental-strip-types review-tools/p7_commission_pre_policy_owner_v39.ts \
  --inspect \
  "$HOME/.travnr-phase6-monday-795ace55" \
  "$HOME/.travnr-phase6-pre-policy-20261122/pre-policy.json" \
  "$HOME/.travnr-phase6-pre-policy-20261122/reference-policy.json" \
  data-collection/phase5/evidence/2026-11-22_phase7_pre_policy_owner_commission_review.json \
  "$EXPECTED_REVIEW_SHA256"
~~~

Expected outcome is a truthful PASS or HOLD receipt. A HOLD on the old packet is evidence that the
stage has not been reconciled; it is not permission to bypass review, fabricate a receipt, or run
apply-reviewed.

## Explicit non-effects

providerCalls=0; databaseReads=0 by this checkpoint; databaseWrites=0; secretChanges=0;
workflowDispatches=0; sourceEnablements=0; paidGO=false.

The controlling eight-gate register remains unchanged. This checkpoint repairs an exact
operator-reference defect and records the present evidence boundary; it does not add a gate or
relax the scientific, rights, retention, or paid-GO requirements.
