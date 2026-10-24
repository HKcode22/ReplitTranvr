# Gate 4 — merged GitHub release, Replit workspace handoff, and precise completion steps

**Observed on 2026-10-24 (PDT).** This is the short checkpoint after GitHub release fixes were fully merged. It supplements, not replaces, [the one-page historical incident and recovery runbook](2026-10-24_GATE4_ONE_PAGE_UNBLOCK_AND_COMPLETION.md), [START_HERE](START_HERE.md), the full [NEXT1 paid scientific evidence](2026-10-24_GATE4_WSSS_NEXT1_PAID_CREATE_EXACT_STOP_46_CREDIT_DELIVERY_GAP.md), and [issue #38](https://github.com/HKcode22/ReplitTranvr/issues/38).

## Verified repository state, no production modifications

- **[PR #134](https://github.com/HKcode22/ReplitTranvr/pull/134) MERGED** — source `ec2ec41402987a7b6d98d549d412eaaab3cd8264`, merge commit `ecb380d91cc23ffcea8c4696aa6bd135b07bf6cb`. Operator-only change: `scripts/v39_gate4_next2_lost_private_scope_recovery_v39.ts` uses proven HTTP `curl` (sensitive authenticated headers through private standard-input config, not CLI args/logs) instead of Replit's timeout-prone Node `fetch`. Five/five associated GitHub Actions workflows completed SUCCESS. **Never automatically rerun the one-shot mutation operator.**
- **[PR #135](https://github.com/HKcode22/ReplitTranvr/pull/135) MERGED** — source `0a2310bd9d4f8a0101cd67c181cde51dd64f33ab`, merge commit `90d2e678a6a7d10b0e10b2a268dbce3f5fdae164`. New Replit `.replit` build: `bash scripts/v39_gate4_reviewed_source_build_v39.sh`; wrapper refuses unreviewed runtime/build file divergence or dirty inputs, requires reviewed ancestry, and bakes **content-verified reviewed source** `087dc948c29d004f88eca141e1fc8e83c2844e3f` into compiled identity. Actual Replit snapshot Git SHA stored **separately**, as `dist/v39-snapshot-provenance.json`. Five/five associated GitHub Actions workflows completed SUCCESS after correcting existing literal-build-command test assumptions and shallow CI checkout handling. The source-reviewed and Replit snapshot Git identities are **different concepts**; never claim they are the same commit.
- Fetched **post-merge main** `.replit`, source-build script and NEXT2 recovery operator directly: all present; `.replit` calls the new wrapper, wrapper source PIN is exactly `087dc...`, recovery uses `publishedKeyStatusV39` curl and no `await fetch(APP`.
- Owner's authentic read-only Replit tests showed **both** published and current workspace Git snapshot objects descend from reviewed `087dc...`, with **zero** changed tracked runtime/build inputs in compared paths. At last observation Replit deployed compiled SHA `758fce6dd77cba737f09468b899680816922674e` (not newly published yet) and local workspace SHA `eb71bd25bd8318caa74835c0317e613c9dff8cc8`; older local `dist/v39-build-meta.json` `d2265a...` was stale and is not live proof.
- **Existing Replit Production app secrets are PRESENT**, unchanged by this work; independently authenticated published stable webhook and runtime DB binding POSTs both returned **HTTP 200**. After owner set **only** `V39_GATE4_PREBIND_ADD_ON_PREPAID=0`, public GET `/` and `/__v39/workspace-runtime` recovered **HTTP 200**, pretrained Phase2G paid-webhook route still registered. Keep flag `0` as temporary fallback. Previously old restricted role `gate4_receiver_2026_next1` expiry `2026-10-24T10:34:11.623Z` was directly verified from PostgreSQL, making a plausible current old-add-on startup failure; NOT proven historical NEXT1 delivery cause.
- Existing NEXT2 RLS+roles owner audit: **2 roles / 4 scoped policies / seven older policies / one historical original / two earlier bindings** PASS, zero writes. Prior `--rotate-and-seal` HOLD at `PUBLISHED_OLD_KEY_PARITY` committed ZERO DB mutations and ZERO App Storage objects. **No new NEXT2 encrypted object, credential rotation, or hosted synthetic webhook proof as of this checkpoint.**
- Historical NEXT1 paid science remains `SAFETY_PASS_POSSIBLE_DELIVERY_GAP` — **46 credit delta, zero real provider-original callback rows** despite real CREATE and exact independently verified STOP. Root cause unknown. One positive synthetic would show ingestion feasibility, not provider delivery. Do not launch provider calls or treat 5-credit soft target as a hard spend cap.

## One safe REPLIT SHELL handoff command (no production changes, no paid provider)

Execute ONLY in `~/workspace`. It requires a clean tracked checkout, saves a unique **local checkpoint branch** for the prior Replit snapshot, fetches merged origin/main and switches detached to it (no force/reset, no deleting files). It verifies that both merge commits are ancestors of selected HEAD, then runs the new source-build `--verify-only` guard. **This command changes local Git checkout only; does not republish or build or call the provider or touch database.**

```bash
bash <<'GATE4_SYNC_MERGED_RELEASE_SAFE'
set -Eeuo pipefail
set +x
cd ~/workspace
ROOT="$PWD"
REVIEWED="087dc948c29d004f88eca141e1fc8e83c2844e3f"
MERGE_CURL="ecb380d91cc23ffcea8c4696aa6bd135b07bf6cb"
MERGE_BUILD="90d2e678a6a7d10b0e10b2a268dbce3f5fdae164"

test -z "$(git status --porcelain --untracked-files=no)" || {
  echo "HOLD_LOCAL_TRACKED_CHANGES_PRESERVE"; exit 2;
}
git fetch --no-tags origin refs/heads/main
git merge-base --is-ancestor "$MERGE_CURL" FETCH_HEAD
git merge-base --is-ancestor "$MERGE_BUILD" FETCH_HEAD
git merge-base --is-ancestor "$REVIEWED" FETCH_HEAD

CHECKPOINT="checkpoint/gate4-presync-$(date -u +%Y%m%dT%H%M%SZ)"
git branch "$CHECKPOINT" HEAD
echo "LOCAL_SNAPSHOT_CHECKPOINT_CREATED=$CHECKPOINT"

git switch --detach FETCH_HEAD
bash scripts/v39_gate4_reviewed_source_build_v39.sh --verify-only

echo "GATE4_MAIN_MERGED_RELEASE_LOCAL_PREFLIGHT_PASS"
echo "NEXT_STEP_NO_PROVIDER_PUBLISH_CAN_BE_REVIEWED"
GATE4_SYNC_MERGED_RELEASE_SAFE
```

If it prints `HOLD_LOCAL_TRACKED_CHANGES_PRESERVE` or `GATE4_VERIFIED_BUILD_SOURCE_HOLD`, report output. No force-reset or blind rerun/rollback. Replit checkout may have untracked files which are retained; the build guard checks relevant untracked runtime inputs and will fail safely if any exist.

**After exact local preflight PASS:** Replit `publish_app` connector may be used *only when the user asks to publish/continue to supervised publish*; it does **not** require Replit AI Agent. Keep production Gate4 add-on flag `0` during this publish. After publishing, get HTTP 200 for both public endpoints, then independently GET runtime JSON with `status=PASS`, compiled reviewed source `git_head=087dc948c29d004f88eca141e1fc8e83c2844e3f`, prepaid route true, published true, Gate4 ingress false as safe fallback. Replit publisher's general success does not prove these checks.

**Then:** one separately authorized **non-provider** `--rotate-and-seal` operation from merged/reviewed operator in isolated Git worktree, only after confirming no preexisting ciphertext/private files and current roles/policy audit. It creates one private AES-GCM config, rotates exactly two NEXT2 roles, retargets four NEXT2 policies to reviewed source; no need for ten manual Replit secrets. If HOLD after any file/object write, no automatic retry—inspect redacted stage. Following READY republish same audited build, verify actual published NEXT2 Gate4 route **positive hosted synthetic JSON HTTP 200 plus independently read back exact original SHA in PG V0071** (with updated reviewed synthetic script). This is not a genuine AeroDataBox callback. Only with a fresh separately approved bounded-risk NEXT2 paid experiment, independent protected STOP and a genuinely provider-origin V0071 match can Gate4 feasibility close. Do not claim statistically high reliability from n=1.

**Boundaries:** no Cloudflare, no Replit AI Agent, no provider CREATE/refill/replay without explicit fresh approval, keep 6+6 policy if future experiment uses retry, preserve all historical evidence, allow small model-science aggregate mismatches while requiring bytewise SHA custody.
