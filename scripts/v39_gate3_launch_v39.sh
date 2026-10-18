#!/usr/bin/env bash
# One-shell, NONINTERACTIVE launch of reviewed Gate3 WSSS owner.
# Required before this script: explicit human approval, immutable authorized
# file + ledger SHA in the already-published exact GitHub release, and a
# no-provider doctor/preflight. Launch itself does no automatic retry.
# GitHub Actions remains an INDEPENDENT stop/control process; identifiers
# are securely looked up/verified inside the TypeScript owner, never typed.
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

if [[ "$#" -ne 2 || "$1" != "--auth-file" ]]; then
  echo "GATE3_LAUNCH_REQUIRES_ONE_EXACT_AUTH_FILE_HOLD" >&2
  exit 2
fi
AUTH_FILE="$2"
if [[ ! "$AUTH_FILE" =~ ^data-collection/authorizations/V3\.9_PHASE3_GATE3_AUTH_[0-9]{8}_WSSS[0-9]{2}\.json$ ]] ||
   [[ ! -f "$AUTH_FILE" ]]; then
  echo "GATE3_LAUNCH_INVALID_AUTH_FILE_HOLD" >&2
  exit 2
fi

# A locally running first owner and a durable PREPARED owner must never be
# bypassed. This lock is an adjunct, NOT a replacement for DB serialization.
command -v flock >/dev/null || {
  echo "GATE3_LAUNCH_LOCAL_LOCK_UNAVAILABLE_HOLD" >&2
  exit 2
}
exec 9>/tmp/v39-gate3-wsss-one-owner.lock
flock -n 9 || {
  echo "GATE3_LAUNCH_ANOTHER_OWNER_PROCESS_HOLD" >&2
  exit 2
}

test -z "$(git status --porcelain)" || {
  echo "GATE3_LAUNCH_DIRTY_SOURCE_HOLD" >&2
  exit 2
}

# Parse authoritative checked-in AUTH. Stage A is strictly 3–8min before
# CREATE and cannot be extended or used again under a different UTC start.
FIELDS="$(node --input-type=module -- "$AUTH_FILE" <<'AUTH_INSPECT'
import {readFileSync} from "node:fs";
const file=process.argv[2];
const a=JSON.parse(readFileSync(file,"utf8"));
const m=file.match(/^data-collection\/authorizations\/V3\.9_PHASE3_GATE3_AUTH_(\d{8})_(WSSS\d{2})\.json$/);
if(!m || a.authorizationId!==`AUTH-${m[1]}-G3${m[2]}` ||
   a.phaseGate!=="Phase 3 / Gate 3" ||
   a.maxAlertCredits!==50 || a.maxRestUnitsByCategory!==null ||
   !/^WSSS\/departures\/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z\+600s$/.test(a.airportFilterWindow))
  throw Error("GATE3_LAUNCH_AUTH_SCOPE_HOLD");
const start=Date.parse(a.airportFilterWindow.split("/")[2].split("+")[0]);
const lead=start-Date.now();
if(!Number.isFinite(start)||lead<180000||lead>480000)
  throw Error("GATE3_LAUNCH_OUTSIDE_APPROVED_STAGE_A_HOLD");
process.stdout.write(a.authorizationId+"\n"+a.airportFilterWindow+"\n");
AUTH_INSPECT
)"
mapfile -t VALUES <<< "$FIELDS"
[[ "${#VALUES[@]}" -eq 2 ]] || {
  echo "GATE3_LAUNCH_AUTH_FIELDS_HOLD" >&2
  exit 2
}

# Git SHA is a revision selector, never a secret or manual user input.
# No git checkout, commit, fetch, migration or Replit publish in launch.
command -v gh >/dev/null || {
  echo "GATE3_LAUNCH_GITHUB_CLI_MISSING_HOLD" >&2
  exit 2
}
if [[ -z "${GH_TOKEN:-}" && -z "${GITHUB_TOKEN:-}" ]]; then
  export GH_TOKEN="$(gh auth token)"
fi
HEAD="$(gh api repos/HKcode22/ReplitTranvr/git/ref/heads/main --jq .object.sha)"
[[ "$HEAD" =~ ^[a-f0-9]{40}$ ]] || {
  echo "GATE3_LAUNCH_MAIN_HEAD_UNVERIFIED_HOLD" >&2
  exit 2
}
LOCAL_TREE="$(git rev-parse 'HEAD^{tree}')"
APPROVED_TREE="$(git rev-parse "${HEAD}^{tree}")" || {
  echo "GATE3_LAUNCH_REVIEWED_HEAD_UNAVAILABLE_HOLD" >&2
  exit 2
}
[[ "$LOCAL_TREE" = "$APPROVED_TREE" ]] || {
  echo "GATE3_LAUNCH_LOCAL_SOURCE_SKEW_HOLD" >&2
  exit 2
}

echo "GATE3_ONE_OWNER_BEGIN_AUTOMATIC_WATCHDOG"
# exec leaves STDIN untouched. No copied GitHub IDs, readline, or heredoc on
# the actual paid owner. Owns the local flock until exit and accepts signals.
exec node --import tsx scripts/v39_gate3_one_wsss_operator_v39.ts \
  --auth-id "${VALUES[0]}" \
  --auth-file "$AUTH_FILE" \
  --window "${VALUES[1]}" \
  --icao WSSS --credits 50 --seconds 600 \
  --expected-published-head "$HEAD"
