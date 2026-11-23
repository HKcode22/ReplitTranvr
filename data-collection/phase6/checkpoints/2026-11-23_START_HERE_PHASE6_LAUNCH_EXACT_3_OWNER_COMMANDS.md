## CURRENT UPDATE — MONDAY NOV23 10:01Z VERIFIED OWNER REPAIR SUCCESS: ONE-TIME EXPIRY PIN CORRECTED, NO REPLAY

**Earlier paragraphs below stating the accidental `0369f88` expiry pin “needs owner repair” are now HISTORICAL, superseded by authentic owner execution and independent GitHub evidence. DO NOT rerun the `6b3b2ffa…` repair or G12 one-use helper.**

- Actual owner marker: `P6_EXPIRY_TWO_ACTION_VARIABLES_MATCH_C8 paidGoChanged=false changed=1` and terminal `P6_EXPIRY_TWO_PIN_SCOPE_REPAIR_VERIFIED_NO_PAID_GO`. Exactly one stale expiry Actions repository variable was corrected to the approved target c8; the second required pin was verified at c8. **No paid GO secret/flag was updated.**
- [Full due-only retention target #45152223464](https://github.com/HKcode22/ReplitTranvr/actions/runs/45152223464) on exact approved c8 executed both **real** `primary-fids-expiry` (job 137616193834) and `phase7-expiry` (job 137616194386) to SUCCESS; none skipped. Raw FIDS originals, V0108 due private packets/indexes and P7 links/fragments were zero, 0 deletion STOPs, 0 provider calls and zero rows deleted **at the readback clock**. No populated-deletion or PITR guarantee is inferred.
- [Read-only heartbeat #45152310334](https://github.com/HKcode22/ReplitTranvr/actions/runs/45152310334), current c8, actual job 137616476852 **SUCCESS** with NO PAID/NO DB credentials. **Nuance:** the detailed JSON still reports `primaryFidsExpiry.state=NO_SCHEDULE_RUN_ON_CURRENT_MAIN` and an active **diagnostic** count of 1 because native `schedule` has not recently executed at c8. Since recent authenticated executed full backstop was observed, runner treats this warning as **nonfatal** and exits zero. Do not misreport as all native cron schedules proven.
- Next external [PRIMARY_BACKSTOP relay #45152702795](https://github.com/HKcode22/TravnrClockRelay/actions/runs/45152702795) returned `DEFER_RECENT_PRIMARY_STEP_NOT_DELETION_PROOF` after the just-completed real due-only sweep; next [ROLLING_ROOT #45153321933](https://github.com/HKcode22/TravnrClockRelay/actions/runs/45153321933) returned intended pre-GO `DEFER_OUTSIDE_OR_LATE_POLICY_WINDOW`, DIRECT_TICK=0. Neither is a failed SOURCE nor a billed observation.
- Actual approved pins unchanged: production `main=c8e065d665ccacb6d2575070e94c5500b7583044`; detached relay `main=c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed`. G1–8/G12 remain closed. **G13 still future/time-gated; G9 still disarmed; G14 paid SOURCE not observed.** No new gate, code commit to production, provider, cron, credit or policy change.
- [Same detailed technical guide — verified recovery and native-schedule caveat](2026-11-23_PHASE6_GATES_1_TO_14_TECHNICAL_GUIDE_AND_ACCIDENTAL_MAIN_AUDIT.md#verified-later-update--2026-11-23-10011008-utc-owner-expiry-sha-repair-executed-real-due-only-backstop--heartbeat-pass).

**Next operator action only at original bounded GO window:** Run the already-reviewed **Command 2 / G13** only Monday Nov23 21:50Z–strictly before 23:10Z, preferably by 22:15Z, after its fresh quota/rights/expiry/STOP checks PASS. Subsequent **Command 3 / G9** only at/after 23:45Z AND after actual G13 PASS. Do not run anything to “green” the historical native scheduler warning or replay one-use helpers. Re-evaluate if a **new** real retention due/deletion or policy incident appears.

---

## NEW 2026-11-23 09:41Z LIVE RETENTION/HEARTBEAT INCIDENT — CORRECT THE PIN BEFORE G13

**Active G11/G12 retention evidence regression, NOT a new gate and NOT fixed by rewriting code:** [main scheduled heartbeat #45149342374](https://github.com/HKcode22/ReplitTranvr/actions/runs/45149342374) FAILED with `SCHEDULE_APPROVED_MAIN_DRIFT`: current target main c8 while Actions *repository variable* `P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA` still points to accidental docs-only `0369f88`. Actual latest [full retention target #45143813850](https://github.com/HKcode22/ReplitTranvr/actions/runs/45143813850) had **both primary-FIDS and Phase7 expiry jobs SKIPPED**, so do not claim the retention system is currently green. Repo's `P7_EXPIRY_APPROVED_MAIN_SHA` is a separate required match for the full backstop and must be checked by owner. A green external relay means dispatch ACK, not that these jobs ran. **Paid GO OFF** until resolved and fresh G13 live checks pass.

A **guarded exact-two-variable owner repair** is prepared and SHA-bound on the isolated evidence branch, source blob **`6b3b2ffa497e593a285f811a72b20fe3613eae31`**: [`p6_20261123_reconcile_expiry_pins_c8_and_verify_heartbeat_no_provider.sh`](p6_20261123_reconcile_expiry_pins_c8_and_verify_heartbeat_no_provider.sh). It authenticates owner, refuses after 21:50Z or unknown SHA/config, changes only `P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA` / `P7_EXPIRY_APPROVED_MAIN_SHA` from the **exact accidental 0369** value to the approved **exact c8** at repo variable scope, readbacks both, dispatches one existing authorized full **DUE-ONLY** retention backstop (real PG16 expiry may delete legitimately due records, NO provider), verifies both named jobs/steps, then dispatches one existing **read-only nonpaid heartbeat** and checks actual heartbeat job. **Prepared only: OWNER MUST EXECUTE and supply result, this document does not certify a fix.** Do not rerun original G12, mutate GitHub paid secrets, modify main, add a cron, or force heartbeat green by changing its failure guard.

Full diagnostic and why gates took time, engineering history, code links and Day1 example failure table are in the SAME [expanded Gates1–14 technical guide](2026-11-23_PHASE6_GATES_1_TO_14_TECHNICAL_GUIDE_AND_ACCIDENTAL_MAIN_AUDIT.md#11-engineering-retrospective-why-completing-the-gates-took-so-long). The original **Monday G13 Command2 / after-GO G9 Command3 remain unchanged**. An owner helper HOLD means STOP/investigate; do NOT backdate missing PRE or treat fixed heartbeat as proof of first billable SOURCE.

---

## 2026-11-23 ~08:55Z — TRANSIENT MAIN DOCUMENTATION CHANGE ALREADY RESTORED; FULL GATES 1–14 STUDY GUIDE

**Production target main checked at the actual remote GitHub ref is still the approved `c8e065d665ccacb6d2575070e94c5500b7583044`, and relay main is still `c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed`.** Accidental historical docs-only target commit [`0369f88ba361ff8f97a352b9d438ee5bcf59af57`](https://github.com/HKcode22/ReplitTranvr/commit/0369f88ba361ff8f97a352b9d438ee5bcf59af57) added an inaccurate explainer, but is **not current main**. Do NOT force-push, revert, reset, repin to it or merge another docs-only SHA into main before today's G13. Historical workflows ran against the temporary SHA; none were proof of paid SOURCE. Documentation-only corrections are deliberately kept on this isolated branch.

**New, source-grounded learning document:** [**COMPLETE PHASE 6 TECHNICAL GUIDE — Gates 1–8 and 9–14, why/where/how code works, old candidate versus production readbacks, accidental-main forensic audit, research design and example flight, successful run receipts and Day1/Day2 salvage**](2026-11-23_PHASE6_GATES_1_TO_14_TECHNICAL_GUIDE_AND_ACCIDENTAL_MAIN_AUDIT.md). It corrects the fake five-US-hubs / exact Day1 rows or billing / 7-day PITR / guaranteed eight-prearm-attempts statements in the transient document; no API calls, DB/secret/cron changes or new gates.

**Owner action is unchanged:** G12 complete; ONLY original G13 Command 2 within Monday 1:50–strictly before 3:10 PM PST and only if its own fresh STOP/budget/rights/PG16 checks PASS. Then G9 Command 3 at/after 3:45 PM PST, only after G13 PASS. The separate G10 direct target ACK and G14 authentic paid SOURCE/individual PRE/POST still require genuine future proof. Paid GO is not implied by this educational material.

---

## TODAY'S OPERATOR DECISION & SUCCESS / DAY1 RECOVERY QUICK REFERENCE — 2026-11-23 ~08:33Z

**PRELAUNCH = CONDITIONAL TECHNICAL GO, NOT YET PAID GO.** Main `c8e065d665ccacb6d2575070e94c5500b7583044` and relay `c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed` still match; G12 authenticated 31-policy repo check [45123278530](https://github.com/HKcode22/ReplitTranvr/actions/runs/45123278530) and four protected POST actor checks [45125753815](https://github.com/HKcode22/ReplitTranvr/actions/runs/45125753815) PASS. Latest PRIMARY external forward [45137657355](https://github.com/HKcode22/TravnrClockRelay/actions/runs/45137657355) to real target [45137685153](https://github.com/HKcode22/ReplitTranvr/actions/runs/45137685153) passed both expiry jobs. Current preGO rolling [45138866138](https://github.com/HKcode22/TravnrClockRelay/actions/runs/45138866138) correctly defers with DIRECT_TICK=0 until the signed epoch. **No G13 paid GO, real SOURCE purchase, PRE or POST is proven by these green prelaunch runs.**

**Owner launch actions unchanged:** Command 2 (exact pinned blob `c15ce7bd23b60443d8c0ef3e58f90d41b5f8a517`) only Monday **1:50 PM to strictly before 3:10 PM PST**, ideally before 2:15 PM for the documented T−90 preparation boundary, after its own fresh FREE budget ≥36,740 REST units, Alert ≥1,000, rights/STOP/expiry/current SHA checks. Actual full success: `P6_G13_EXPLICIT_OWNER_GO_4_SCOPE_WRITES_ACKNOWLEDGED`. Then **Command 3** (pinned `6871236a9743b3b84f978c9e3cd9042b2aff2161`) only after G13 PASS **at or after 3:45 PM PST**; actual success: `P6_G9_DIRECT_TICK_EXISTING_EXTERNAL_LANE_ACTIVATED_AFTER_EXPLICIT_G13_GO`. Do not run either early, do not manually flip secrets/variables, and do not rerun G12.

**Expected real SUCCESS means multiple distinct receipts**, not a green workflow alone: authenticated owner G13 ledger; external DIRECT_TICK exact target ACK; target direct admission and SOURCE child; authentic provider physical GET/units billed and source original bound to normalized physical flights; individually cutoff-safe T−24/T−6/T−90 PRE with source and DB clocks; independently due POST only when available; conditional actual gate-out primary label only when genuinely paired scheduled-vs-actual gate milestones; cost/TTL/expiry/bias ledger. First real paid receipt and population/horizon counts cannot be claimed in advance.

**Day1 incident doctrine (read before launch):** A partially captured Day1 can be retained as operational/scientific *partial* data and later days may remain valid; no retroactive PRE, source-hindsight airport redraw, flight substitution, batch-date shift, duplicate paid retry, invented on-time/zero delay, or silent train/validation/test reassignment. For missed/late/expired SOURCE, use original `SOURCE_LOSS_OR_LATE_OBSERVATIONS_REVIEW_CENSORING`; a later individual flight may qualify only if its OWN source-clock cutoff is still open and Stage14 proves it. For missing PRE label that horizon `missing`/`censored`; POST before due is `not_due`; no independently attested actual gate-out means no numeric primary label. Keep all denominator/attrition fields.

**Hard stop (do not continue Days2–31 automatically):** G13 HOLD or missed <23:10Z GO deadline; ledger/physical UTC budget contradiction, unauthorized use/retention, expired original used as if current, broken signature/flight identity, unverified four-airport draw, unresolved provider billing/GET or unknown POST replay, source expiry/deletion STOP. Read-only QA statuses `HARD_LEDGER_OR_BUDGET_HOLD_NO_FURTHER_DISPATCH` and `FOUR_AIRPORT_DRAW_NOT_VERIFIED_HOLD` require independent STOP-owner review. A missed first Day1 horizon or no Day1 label alone does NOT automatically taint later valid days, but reduces effective sample and must be disclosed. A missed GO cutoff is **not salvageable under the original prospective launch authority**; shifting the month requires a new explicitly reviewed and signed prospective schedule.

**Detailed Day1 playbook and 3-layer verification matrix:** [DAY1 OPERATOR RUNBOOK — current live audit, success receipts and salvage](2026-11-23_DAY1_PHASE6_PAID_MONTH_OPERATOR_RUNBOOK_GATES_9_14.md#current-2026-11-23-day-1-live-audit-success-expectations--incident-salvage-no-added-gates). That file contains the incident-by-incident decision table, required Day1 metadata receipt fields, Day2-continuation conditions, backup/expiry constraints, and exact distinctions between green control plane, green SOURCE and scientifically usable PRE/POST. It is the operational fallback for the same 31-day signed study and does not add gates.

---

## 2026-11-23 06:41Z — G12 RECOVERY COMPLETE AND INDEPENDENTLY VERIFIED

**G12 CLOSED PASS. DO NOT RUN ANY G12 SCRIPT AGAIN.** Owner successfully executed the protected-only SHA repair; command returned `P6_G12_PROTECTED_C8_POST_FOUR_STEPS_PASS_PAID_OFF`, repository readback #45123278530, protected main run #45125753815, paidGo false. Independently inspected [actual new POST run #45125753815](https://github.com/HKcode22/ReplitTranvr/actions/runs/45125753815): workflow_dispatch on production main c8, attempt 1, entire `exact-main-post-actors-only` SUCCESS, all FOUR required admission/reviewer/publisher/storage steps SUCCESS, paid V0083 worker SKIPPED. The old failed #45123332394 stays historic only. See [G12 independent closure checkpoint](2026-11-23_G12_PROTECTED_POST_FOUR_ACTOR_INDEPENDENT_ACCEPTANCE_PASS.md).

**Next ONLY:** original Command 2 / G13 explicit paid GO in the signed Monday Nov 23 21:50Z–strictly before 23:10Z window (1:50–3:10 PM PST), preferably before 22:15Z. Do not run GO now. The pinned G13 helper checks fresh provider account, 31-day policy, newly successful protected G12 steps, retained repo/relay SHAs, environment/STOP metadata, budget and production retention. A HOLD means NO GO, not an invitation to manually override. No further PRE-GO protected SHA or code changes needed.

**After G13 actually PASS only:** original Command 3 / G9 DIRECT_TICK at/after Monday 23:45Z (3:45 PM PST). First authentic paid SOURCE receipt and downstream PRE/POST must still be audited; green clock alone is not evidence. No changes to Gates1–8, study design, or new gates.

**Earlier 'repair prepared/not executed' instructions below are historical and superseded. The original G12 Command 1 was one-use and must never be rerun.**

---

## UPDATE 2026-11-23 06:40 UTC — G12 environment shadow repair prepared, NOT executed

**This supersedes the already-attempted Command 1 below.** Installed G12 repository 31-value readback [45123278530](https://github.com/HKcode22/ReplitTranvr/actions/runs/45123278530) passed. Protected POST preflight [45123332394](https://github.com/HKcode22/ReplitTranvr/actions/runs/45123332394) failed its initial admission, before reviewer/publisher/storage tests. The original G12 17-repository-secret installer never updated the protected-environment copy of the approved POST code SHA; its timestamp predates the new current-main release. Paid GO is OFF.

Prepared bounded, pre-GO, nonpaid **owner recovery helper** Git blob **1eec51c1a58503f8e6850dc76080cf85a25e7e85**: [p6_20261123_g12_protected_post_sha_reconcile_no_provider.sh](p6_20261123_g12_protected_post_sha_reconcile_no_provider.sh). This checks the existing G12 PASS, reasserts both global paid STOP controls zero at both scopes, updates **only** the protected-environment POST-approved SHA to current main, and dispatches the original protected main actor preflight. It requires all four role steps PASS; no 31-day policy, signed science, provider, DB, cron or production-code mutation. It has NOT been owner-executed. Detailed [source and evidence checkpoint](2026-11-23_G12_PROTECTED_POST_SHA_SHADOW_RECONCILIATION_NO_GO.md).

**Run once in the owner's Replit Shell before Monday 21:50Z; on HOLD do not run GO or repeat the G12 one-use installer:**

```bash
cd ~/workspace
bash <<'P6_G12_ENV_POST_ONLY'
set -Eeuo pipefail
set +x
umask 077
REPO="HKcode22/ReplitTranvr"
BLOB="1eec51c1a58503f8e6850dc76080cf85a25e7e85"
TMP="$(mktemp --suffix=.sh "$PWD/scripts/.p6_g12_env_post_XXXXXXXX")"
trap 'rm -f "$TMP"' EXIT
gh api "repos/$REPO/git/blobs/$BLOB" --jq '.content' | base64 --decode > "$TMP"
test "$(git hash-object "$TMP")" = "$BLOB"
bash -n "$TMP"
bash "$TMP" ONLY_PROTECTED_POST_C8_SHA_RECONCILE_WITH_PAID_STOPS_ZERO
P6_G12_ENV_POST_ONLY
```

Only accept a fresh status **P6_G12_PROTECTED_C8_POST_FOUR_STEPS_PASS_PAID_OFF** with a real protectedMainPostRunId. Otherwise **G12 HOLD / Gate13 NO GO**. After PASS, the original signed Monday GO window and its fresh budget, rights, retention and four-step checks remain mandatory; DIRECT_TICK only after GO and the first source epoch.

---

# START HERE — Phase 6 31-day paid launch: exactly 3 owner commands, then autonomous

## STOP / live operator correction after first G12 attempt — 2026-11-23 06:19 UTC (Nov 22 22:19 PST)

**THIS SECTION OVERRIDES COMMAND 1'S "run now" instruction BELOW.** The owner has **already executed Command 1 at least once**. Its second invocation returned `HOLD_P6_G12_OWNER_CODE_SUCCESSOR_ALREADY_ATTEMPTED_DO_NOT_REPEAT`, which is an intentional one-use refusal. **DO NOT RUN COMMAND 1 AGAIN. Do not remove `g12-install-once.started`, create another public request, download an unrelated artifact, or repeat the 17 secret writes.**

Actual GitHub post-install evidence:
- [G12 exact installed c8 31-value readback **45123278530**](https://github.com/HKcode22/ReplitTranvr/actions/runs/45123278530) **SUCCESS**, exactly `P6_G12_C8_REPOSITORY_31_CANONICAL_AND_POST_LINKS_VERIFIED_PAID_OFF`, `allCodeBindingsCurrent=true`, `effectivePaidControlsZero=true`. New public-only marker `data-collection/phase6/evidence/p6_g12_oneuse_c8_policy_postinstall_readback.json` exists. This verifies all 31 **repository**-scope canonical policy values but **not** the protected environment effective values.
- [Actual current-main protected POST preflight **45123332394**](https://github.com/HKcode22/ReplitTranvr/actions/runs/45123332394) **FAILED**; job `exact-main-post-actors-only` failed in FIRST step **Verify exact disarmed POST actor admission**. Following reviewer/publisher/storage preflight steps **SKIPPED**. Step source on current production main tests effective `V39_PHASE6_PROCESS_ARMED=0`, `V39_PHASE6_OWNER_APPROVED=0`, `V39_P5_POST_APPROVED_CODE_SHA=GITHUB_SHA`, then `git rev-parse HEAD = GITHUB_SHA`. GitHub logs do not identify which comparison failed, so **do not assert that the problem is definitively an environment code-SHA shadow**. A subsequent cleanup step also failed due to `npx --no-install tsx` prior to `npm ci`, but that is a secondary diagnostic cleanup failure; don't fix it by changing production main or ignoring the first admission STOP.
- There is **NO completed G12 protected POST proof**. **G12/13 NO PAID GO**, even if repository readback is green. The current G13 owner GO script is designed to check actual protected POST admission and should not be executed before this is resolved.

**Next safe step** is a **metadata-only owner inventory** of the two effective paid STOP secret names and the approved POST code secret at both repository and `phase6-protected-runtime` scopes. GitHub cannot reveal secret values via REST; gather **only name, scope and updated timestamp**, not plaintext. If protected-environment shadow of `V39_P5_POST_APPROVED_CODE_SHA` exists, reconcile only that exact scope against c8 with separately reviewed owner command **while both paid controls remain OFF**, then independently dispatch one clean protected-only POST preflight. If it does not exist, investigate repo/ENV STOP effective flags without assuming cause. **Do not repeat original G12 17-secret install or create extra gates.** Missing protected acceptance is blocking until a real four-step success.

The three-command table below remains the **conceptual launch lifecycle**, but **Command 1 has already been attempted and is non-repeatable**; use the forthcoming targeted protected recovery, not this old launcher. Command 2 only inside Monday signed GO window after recovered protected PASS; Command 3 only at/after the first signed epoch after actual GO.

---


**Current authoritative user-facing launch instructions; Nov 22, 2026 10 PM PST / Nov 23 UTC.** This document supersedes the confusing historic G9–14 narrative and earlier Bash blocks. It makes no attempt to change the completed research design or completed Gates 1–8. **Paid launch is NOT running now.**

**Main:** `HKcode22/ReplitTranvr@c8e065d665ccacb6d2575070e94c5500b7583044`  
**Relay:** `HKcode22/TravnrClockRelay@c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed`  
If either SHA changes, STOP; do not repin or bypass the commands by hand. Each command downloads its exact Git blob, verifies the hash and Bash syntax, then applies its own reviewed safety conditions.

## What is automatic and what isn't?

**The 31-day collection is autonomous AFTER manual initial release authorization.** It is not designed to spend credits merely because GitHub Actions are running. The external clock already runs unattended, and the primary retention backstop has been proven working. **Three distinct manual owner actions remain:**

| Order | When | Owner action | Does it spend provider credits? |
|---|---|---|---|
| **1** | **NOW**, once | Correct the existing SOURCE-code signed policy on c8; complete repo 31-value and protected POST role proofs; paid controls remain `0` | **NO** |
| **2** | **Monday Nov 23, 1:50–3:10 PM PST** (21:50Z–strictly before 23:10Z), preferably **before 2:15 PM** | Final live free account/PG16 expiry checks, then **explicit paid GO** (Gate13), if Command 1 really passed | The command itself does no paid GET, but it authorizes the future collectors to spend within original limits |
| **3** | **Monday Nov 23, 3:45 PM PST or later** (at/after 23:45Z), only after Command 2 PASS | Activate existing `DIRECT_TICK` external recovery (Gate9); subsequent jobs are automatic | The command itself has zero paid GET; later authorized workers may spend according to signed policy |

**Do not execute all three now.** Command 2 will HOLD until its Monday GO window. Command 3 will HOLD until the first source epoch and prior GO. **If Command 1 HOLDs or does not print its final PASS, do not run Commands 2 or 3.** Do not manually flip `V39_PHASE6_PROCESS_ARMED` or `V39_PHASE6_OWNER_APPROVED` or add additional cron jobs.

## Why the previous commands were confusing

- **First G12 owner public encryption request ALREADY SUCCESSFUL**, commit `b98e02617fd1f49389197071904a38972333643e`. One valid GitHub encrypted artifact was generated automatically by [G12 run 45119501703](https://github.com/HKcode22/ReplitTranvr/actions/runs/45119501703), artifact ID `14792972040`, valid until **2026-11-24 05:43Z**. It is linked to the **FIRST** local owner-private key; its sealed content is **17 reviewed code/digest secret changes**. There is no requirement to create another public key.
- The **second identical request got HTTP 422** because the GitHub file already existed; it did not replace the first request, did not modify production, and did not launch paid collection. The second private directory is **NOT the key for the authenticated artifact**. Do not substitute or rerun.
- The older G8 private-custody directory survey printed nothing: that does **not** disprove the NEW successful G12 key and should not be treated as a launch gate.
- Old commands **`P6_MON_GO` blob `9e01e4ece4fbd56634a9ec9c0d68422671e6f410`** and **`P6_MON_RECOVERY` blob `1270e03024d44edfc7fb6757b2642a25c6cd1fa8`** are **RETIRED**. The later intermediate `b4d208e8...` and `5e89d372...` versions are also retired. Do NOT run them.

## Command 1 — NOW: complete Gate12 current-code signed authority while paid GO is OFF

This one-use helper fetches only the original **successful** encrypted G12 artifact, verifies its X25519/AES-GCM authentication against the first owner's private key and matching public request, checks all **17** exact repo-only names and **two dual-scope global STOPs**, then writes those 17 code/digest values with both effective paid STOPs first set to `0`. It triggers independent actual repository **31-value** readback and exactly one original **main-only protected POST reviewer/publisher/storage preflight**, requiring **all four actor steps** to pass. No plaintext secret is printed; no provider requests or production DB writes; the original 31 flight-day plans, study/labels/rights/caps are unchanged. It writes a local **one-use intent marker before GitHub secret mutation**; do **not** retry after uncertain HOLD.

**Owner Replit Shell — run once:**

```bash
cd ~/workspace

bash <<'P6_OWNER_G12_EXACT_ONCE'
set -Eeuo pipefail
set +x
umask 077

REPO="HKcode22/ReplitTranvr"
BLOB="c67e2bcba2c5c8bf0b8ebe4f34e2c072e2db822b"

TMP="$(mktemp --suffix=.sh "$PWD/scripts/.p6_g12_once_XXXXXXXX")"
trap 'rm -f "$TMP"' EXIT

gh api "repos/$REPO/git/blobs/$BLOB" \
  --jq '.content' | base64 --decode > "$TMP"

test "$(git hash-object "$TMP")" = "$BLOB"
bash -n "$TMP"

bash "$TMP" \
  INSTALL_ONE_AUTHENTICATED_G12_C8_LINKED_CODE_SUCCESSOR_ALL_PAID_STOPS_OFF

P6_OWNER_G12_EXACT_ONCE
```

**The ONLY full success status for Command 1:**  
`P6_G12_CURRENT_C8_31_POLICY_AND_PROTECTED_POST_ACTORS_PASS_PAID_OFF`, with `repoReadbackRunId` and `protectedMainPostRunId` (two **real GitHub Actions run IDs**, not just proposed scripts). This is an actual secret-scoped policy amendment but **not** permission to spend credits. If either protected actor job is skipped/failed or anything says `HOLD_...`, keep paid GO OFF; do not use Command 2, and do not run Command 1 blindly again. You can paste nonsecret JSON status/run IDs back into chat.

**Source-only CI, which does not execute owner secret updates:** [45121151029](https://github.com/HKcode22/ReplitTranvr/actions/runs/45121151029) and [45121421690](https://github.com/HKcode22/ReplitTranvr/actions/runs/45121421690) PASS. These validate syntax/guard sequencing; actual owner execution remains pending until you run it.

## Command 2 — MONDAY Gate13 paid GO, only after Command 1 full PASS

**Earliest:** 2026-11-23 **21:50 UTC = 1:50 PM PST**.  
**Absolute current signed GO deadline:** strictly **before 23:10 UTC = 3:10 PM PST**.  
**Prefer earlier than 22:15 UTC = 2:15 PM PST**, when the intended first-cycle **T−90 prearm** becomes due. If that PRE observation is missed, do not backdate or claim an on-time cutoff.

This one-use command independently checks real completed c8 G12 31-value and protected POST actor run steps, current code/relay SHA, provider FREE metadata/remaining ≥36,740 REST API units, zero unauthorized subscriptions, 1,000 Alert-credit protective floor, PG16 expiry/deletion STOP, retention and future clock staging. Only with explicit owner consent during the window does it set the two paid flags to `1` at both repo and protected-environment scopes, and record the authenticated owner GO in master issue #413. Its own provider paid calls are **zero**, but it authorizes the automatic future collectors. GitHub secrets are write-only; real runtime admission is still mandatory.

**Owner Replit Shell — Monday approved window ONLY:**

```bash
cd ~/workspace

bash <<'P6_OWNER_G13_MONDAY_PAID_GO'
set -Eeuo pipefail
set +x
umask 077

REPO="HKcode22/ReplitTranvr"
BLOB="c15ce7bd23b60443d8c0ef3e58f90d41b5f8a517"

TMP="$(mktemp --suffix=.sh "$PWD/scripts/.p6_g13_go_XXXXXXXX")"
trap 'rm -f "$TMP"' EXIT

gh api "repos/$REPO/git/blobs/$BLOB" \
  --jq '.content' | base64 --decode > "$TMP"

test "$(git hash-object "$TMP")" = "$BLOB"
bash -n "$TMP"

bash "$TMP" \
  OWNER_HKCODE22_APPROVES_EXACT_PHASE6_31_DAY_PAID_GO_UP_TO_36740_API_UNITS_WITH_1900_DAY_CAP_AND_1000_ALERT_FLOOR

P6_OWNER_G13_MONDAY_PAID_GO
```

**Required owner success status:** `P6_G13_EXPLICIT_OWNER_GO_4_SCOPE_WRITES_ACKNOWLEDGED`. This is still **not** a first paid SOURCE receipt. If it HOLDs or its effective protected authorization is uncertain, **do not** run Command 3; inspect the exact partial-write guard and preserve STOP.

## Command 3 — MONDAY Gate9 automatic DIRECT recovery, only after confirmed GO

**Not before 2026-11-23 23:45 UTC = 3:45 PM PST.** If Gate13 did not pass, **DO NOT RUN**. The route stays `DIRECT_VERIFY` with `TRAVNR_RELAY_DIRECT_TICK_APPROVED=0` until this time and genuine paid GO.

This command confirms the exact current installed c8 policy readbacks, real protected POST actor preflight, and authenticated Gate13 owner GO ledger. It briefly pauses **only** external rolling lane (not PRIMARY retention), changes target direct recovery from `0` to `1`, sets relay `DIRECT_TICK` with its existing signed 31-day window, verifies settings, and reenables rolling. It **does not dispatch a paid source request itself**. The already commissioned external clock then sends bounded future pulses autonomously.

**Owner Replit Shell — at/after 3:45 PM PST ONLY:**

```bash
cd ~/workspace

bash <<'P6_OWNER_G9_AFTER_GO_DIRECT'
set -Eeuo pipefail
set +x
umask 077

REPO="HKcode22/ReplitTranvr"
BLOB="6871236a9743b3b84f978c9e3cd9042b2aff2161"

TMP="$(mktemp --suffix=.sh "$PWD/scripts/.p6_g9_direct_XXXXXXXX")"
trap 'rm -f "$TMP"' EXIT

gh api "repos/$REPO/git/blobs/$BLOB" \
  --jq '.content' | base64 --decode > "$TMP"

test "$(git hash-object "$TMP")" = "$BLOB"
bash -n "$TMP"

bash "$TMP" \
  OWNER_CONFIRMS_GATE13_PAID_GO_ALREADY_APPROVED_AND_ENABLED_FOR_SIGNED_MONTH

P6_OWNER_G9_AFTER_GO_DIRECT
```

**Required success status:** `P6_G9_DIRECT_TICK_EXISTING_EXTERNAL_LANE_ACTIVATED_AFTER_EXPLICIT_G13_GO`. The first actual **external→target protected direct-wave ACK** must still be observed; a green deferred relay job or a paid flag change alone is not a complete autonomous-launch proof.

## What happens automatically after those 3 actions?

**Gate14:** Existing clock relays, independent GitHub/native/controller workflows, guarded SOURCE parent/child tasks, T−6/T−90/T−24 PRE enrollment, POST/label reviewers, V0108/full-retention expiry and budget/incident STOP monitoring continue according to the signed 31-day plan. **You do not need a manual command for every flight, every 4h window, or every day.** This is the autonomy we engineered; it is not a guarantee that every future network/cron provider slot will execute.

Verify live evidence after the first actual SOURCE:
- [Target GitHub Actions](https://github.com/HKcode22/ReplitTranvr/actions): actual protected direct tick and SOURCE/child result; only a genuine provider billing receipt counts as paid acquisition
- [Detached relay Actions](https://github.com/HKcode22/TravnrClockRelay/actions): the next external DIRECT_TICK and actual target ACK, not just a green skipped/deferred workflow
- [Master issue #413](https://github.com/HKcode22/ReplitTranvr/issues/413): record exact G13 GO, first SOURCE charge, independent PRE cutoff state, POST due status and live incident/cost observations

The external **PRIMARY_BACKSTOP retention** is already independently verified after the owner's old→current SHA repair: [relay 45118610987](https://github.com/HKcode22/TravnrClockRelay/actions/runs/45118610987) → [target 45118631787](https://github.com/HKcode22/ReplitTranvr/actions/runs/45118631787) both success; both target expiry jobs passed. No need to commission another cron or restart that repair.

## Gates 9–14 owner summary

| Gate | When/condition | Proof |
| --- | --- | --- |
| 9 | G9 recovery switch after owner GO and first SOURCE epoch | Exact relay DIRECT_TICK admission + live target ACK |
| 10 | After G9 activation | Actual protected target direct wave execution, no wrong-code/STOP rejection |
| 11 | Embedded in G13, fresh at GO | Actual FREE provider-account balance, reserved REST headroom and separate Alert floor |
| 12 | G12 **NOW** before GO, then fresh G13 retention | Actual installed c8 31-policy and protected POST four-step PASS, PG16 STOP and retention |
| 13 | Mon 21:50Z–<23:10Z only, preferably by 22:15Z | Owner explicit signed paid GO four effective scope writes and issue ledger |
| 14 | First real signed source epoch Mon 23:45Z onward | Charged SOURCE receipt, on-time/censored PRE, POST and budget + long-run retention |

**Existing G1–8 remain closed. Do not create Gate15, rerun original G8 seal, touch flight identity/timestamps/gate-out label definitions, change study calendars or provider rights, or add optional V0102/migrations/cron jobs.**

## What if any command fails?

`HOLD`, red job or missing actual target receipt means **STOP the next step**. Do not blindly rerun a one-use owner command. If the paid authorization deadline is missed, **no retroactive GO** and do not invent an on-time PRE/SOURCE record. Post the nonsecret status, job ID and scope to issue #413 or chat for diagnosis. A new prospective launch date would require a separately reviewed signed schedule; do not change the one-month dates by hand.

**CI distinctions:** Current c8 heartbeat [45115536602](https://github.com/HKcode22/ReplitTranvr/actions/runs/45115536602) and full safety CI [45115427067](https://github.com/HKcode22/ReplitTranvr/actions/runs/45115427067) are green. Historical heartbeat failures on old SHAs remain in GitHub history; their red icons don't retroactively make current main red. The detached relay's historical managed-cron evidence audit [45104276155](https://github.com/HKcode22/TravnrClockRelay/actions/runs/45104276155) failed; it is a separate clock-evidence completeness warning, **not proof of paid source spending** or a current repo-code regression. Keep monitoring actual relay→target forwarding rather than hiding the warning.

**Prepared scripts and their source-only syntax guards PASS; actual owner G12 install/GO and after-GO route activation have not yet been executed by this document.**
