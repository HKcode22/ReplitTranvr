#!/usr/bin/env bash
# Offline worker-only regression. Never builds or publishes a callback.
set -Eeuo pipefail
set +x
BASE=24df876fc612c0e4fdfb6f69585ed90bcc56f9b8
BASE_982=697501b9443837018414082434cbe798ab835f92
BASE_POST=9426eda5f749e43b1e798b1c308f5c428f696882
WORKER_POST_INPUTS=(
 server/lib/disruption/phase5ConditionalPostOutcomeMatcher_v39.ts
 server/lib/disruption/phase5ConditionalSignedSchedulePair_v39.ts
 server/lib/disruption/phase5ProspectiveProviderScheduleRevisionPrimary_v39.ts
 server/lib/disruption/phase5V0083FuturePostOriginalDb_v39.ts
 server/lib/disruption/phase6PostNativePreCandidateReadOnce_v39.mjs
)
WORKER_982_INPUTS=(
 server/lib/disruption/phase5ConditionalPostOutcomeMatcher_v39.ts
 server/lib/disruption/phase5ConditionalFidsServiceRecovery_v39.ts
 server/lib/disruption/phase5ConditionalBoundSourceReview_v39.ts
 server/lib/disruption/phase6LaterT24EvidenceBatchReadOnly_v39.ts
 server/lib/disruption/phase5ConditionalPrePermitPreparation_v39.ts
 server/lib/disruption/phase6StoredSourceNativeCandidateAudit_v39.mjs
)
PIN=c3c3050e12c4e327f9c82c35c95f856f3c1cbd20
WRAPPER=scripts/v39_phase5_callback_release_v5_reviewed_build_v39.sh
hold(){ echo PHASE5B_WORKER_ONLY_CALLBACK_SCOPE_HOLD >&2; exit 2; }
[[ "$#" == 2 && ( "$1" == "$BASE" || "$1" == "$BASE_982" || "$1" == "$BASE_POST" ) && "$2" =~ ^[a-f0-9]{40}$ && "$(git rev-parse HEAD)" == "$2" ]] || hold
git merge-base --is-ancestor "$1" HEAD || hold
git merge-base --is-ancestor "$BASE" HEAD || hold
git merge-base --is-ancestor "$PIN" HEAD || hold
inputs=(client server shared package.json package-lock.json scripts/build.ts vite.config.ts tsconfig.json postcss.config.js tailwind.config.ts tailwind.config.js components.json drizzle.config.ts)
git diff --quiet "$BASE" HEAD -- .replit scripts/v39_phase5_reviewed_source_build_v39.sh 'scripts/v39_phase5_callback_release_*_reviewed_build_v39.sh' || hold
changed="$(git diff --name-only --no-renames "$BASE" HEAD -- "${inputs[@]}")" || hold
historical_inputs=(server/lib/disruption/phase5AmendmentEGateOutDelayLabel_v39.ts server/lib/disruption/phase5ConditionalPostOutcomeMatcher_v39.ts server/lib/disruption/phase5ConditionalPrePermitPreparation_v39.ts server/lib/disruption/phase5ConditionalSignedSchedulePair_v39.ts server/lib/disruption/phase5V0083FuturePostOriginalDb_v39.ts server/lib/disruption/phase6NativePostSignedPublication_v39.mjs server/lib/disruption/phase6PostNativePreCandidateReadOnce_v39.mjs server/lib/disruption/phase7LocalPrivatePreHandoff_v39.ts)
expected_inputs=("${historical_inputs[@]}")
if [[ "$1" == "$BASE_982" || "$1" == "$BASE_POST" ]];then expected_inputs+=("${WORKER_982_INPUTS[@]}");fi
if [[ "$1" == "$BASE_POST" ]];then expected_inputs+=("${WORKER_POST_INPUTS[@]}");fi
expected="$(printf '%s\n' "${expected_inputs[@]}" | LC_ALL=C sort -u)"
[[ "$(printf '%s\n' "$changed" | LC_ALL=C sort)" == "$expected" ]] || hold
if [[ "$1" == "$BASE_982" ]];then
 # I140/T136 + I143/T139: require exactly the six reviewed scientific inputs
 # after #981 and their complete twelve-file union with historical #980 drift.
 # Refuse missing repairs, any additional input (including an old allowed
 # input changed again), or publication-wrapper changes. Legacy BASE keeps
 # its original complete eight-file requirement.
 changed_982="$(git diff --name-only --no-renames "$BASE_982" HEAD -- "${inputs[@]}")" || hold
 expected_982="$(printf '%s\n' "${WORKER_982_INPUTS[@]}" | LC_ALL=C sort)"
 [[ "$(printf '%s\n' "$changed_982" | LC_ALL=C sort)" == "$expected_982" ]] || hold
 git diff --quiet "$BASE_982" HEAD -- .replit scripts/v39_phase5_reviewed_source_build_v39.sh 'scripts/v39_phase5_callback_release_*_reviewed_build_v39.sh' || hold
fi
if [[ "$1" == "$BASE_POST" ]];then
 changed_post="$(git diff --name-only --no-renames "$BASE_POST" HEAD -- "${inputs[@]}")" || hold
 expected_post="$(printf '%s\n' "${WORKER_POST_INPUTS[@]}" | LC_ALL=C sort)"
 [[ "$(printf '%s\n' "$changed_post" | LC_ALL=C sort)" == "$expected_post" ]] || hold
 git diff --quiet "$BASE_POST" HEAD -- .replit scripts/v39_phase5_reviewed_source_build_v39.sh 'scripts/v39_phase5_callback_release_*_reviewed_build_v39.sh' || hold
fi
git diff --quiet HEAD -- "${inputs[@]}" .replit "$WRAPPER" || hold
git diff --cached --quiet -- "${inputs[@]}" .replit "$WRAPPER" || hold
[[ -z "$(git ls-files --others --exclude-standard -- "${inputs[@]}" .replit "$WRAPPER")" ]] || hold
if git diff --quiet "$PIN" HEAD -- "${inputs[@]}";then hold;else [[ "$?" == 1 ]] || hold;fi
[[ -z "${V39_BUILD_GIT_HEAD:-}" ]] || hold
set +e
receipt="$(bash "$WRAPPER" --verify-only 2>&1)"
rc=$?
set -e
[[ "$rc" == 2 && "$receipt" == PHASE5_CALLBACK_REVIEWED_SOURCE_BUILD_HOLD ]] || hold
printf '%s\n' PHASE5B_WORKER_ONLY_CALLBACK_PUBLICATION_REFUSED_AS_REQUIRED
