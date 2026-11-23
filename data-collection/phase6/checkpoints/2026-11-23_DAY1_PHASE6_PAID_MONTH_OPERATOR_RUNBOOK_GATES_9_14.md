# Phase 6 paid 31-day launch: one authoritative owner Day 1 operator runbook (Gates 9–14)

**Date:** Nov 22, 2026 PST / Nov 23 UTC. **Only six fixed operational gates, 9–14. No new gates. No repeat of completed G1–8.** This is the single day-1 command reference. Never reuse older chat Bash blocks or the superseded `b432...` release blobs.

## Immediately actionable status, including newly detected HOLD

**Current target production main:** `c8e065d665ccacb6d2575070e94c5500b7583044`. **Clock relay main:** `c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed`.

- **COMPLETED** owner repair: `P6_DETACHED_RELAY_TARGET_MAIN_SHA_REPAIRED_NO_PAID_GO`, from old `b432...` to current `c8e...`, provider 0, DB writes 0, cron writes 0. **Do not rerun** the old repair helper.
- **REAL nonpaid code-binding HOLD as of [GitHub run 45117949987](https://github.com/HKcode22/ReplitTranvr/actions/runs/45117949987):** exact repo-secret-scope verification shows policy canonical and SHA256 **PASS**, 31 day plans **PASS**, paid controls off **PASS**, independent POST code SHA **PASS**, but **`policyApprovedCodeMatchesMain=false` and `repoSourceCodePinMatchesMain=false`**. The run's GitHub conclusion is `success` because it is a diagnostic probe that deliberately reports HOLD in JSON, **not** authorization to proceed. **G13 paid GO must stay STOP/OFF until this existing signed-authority code-binding incompatibility is remediated with an exact source-preserving, independently reviewed policy successor and a new positive readback.**
- More than one original secret is affected: the existing authenticated G8 decoder explicitly checks SIX linked reviewed-main fields in stable-source trust, daily review + nested later review, signing, transport, and native POST policies, with **cross-policy SHA256 references** in transport and Phase7 POST preservation. Do **not** blindly change a single SHA or reissue 31 flight-day plans. Use original owner-private authenticated X25519 envelope as source, preserving every original science/budget/rights/field identity, then calculate and validate **all** affected linked policy digests and canonical static 31-value digest against reviewed changes. This is within existing G12/G13, **not a new gate**. No private values/keys should be published to GitHub, logs, or chat.
- **Await real post-repair PRIMARY_BACKSTOP relay→target ACK**. The earlier external run [45117022659](https://github.com/HKcode22/TravnrClockRelay/actions/runs/45117022659) started before owner repair and carried old target SHA. The later ROLLING_ROOT [45117973868](https://github.com/HKcode22/TravnrClockRelay/actions/runs/45117973868) shows **new** c8 target SHA and safe `DEFER_OUTSIDE_OR_LATE_POLICY_WINDOW` (expected before first source), proving propagation of new pin, not actual retention forwarding. Confirm a **later PRIMARY_BACKSTOP** emits `TARGET_ACK_AND_RUN_IDENTITY_VERIFIED_NOT_COLLECTION_PROOF` with exact new SHA and inspect the corresponding target run's two required expiry job outcomes. A green relay alone is insufficient.
- Current-main full offline safety [45115427067](https://github.com/HKcode22/ReplitTranvr/actions/runs/45115427067), full dual expiry [45115450162](https://github.com/HKcode22/ReplitTranvr/actions/runs/45115450162), and heartbeat [45115536602](https://github.com/HKcode22/ReplitTranvr/actions/runs/45115536602) PASS. Heartbeat output still records **one mitigated native-schedule warning**. The separate [managed cron audit 45104276155](https://github.com/HKcode22/TravnrClockRelay/actions/runs/45104276155) FAIL records HTTP-ACK-only and one exact identity HOLD, **not proof that schedules met an SLA**. Do not force-green it by weakening identity checks.

**Current overall decision: NO PAID GO until the sealed source policy and current main SHA are independently reconciled and final safety checks PASS.** The fixed Monday start may need to remain STOP if these conditions are not met; missing an approved epoch is preferable to collecting under a broken or unlicensed admission chain.

## Frozen science, budget, dates (do not alter)

- Study: **31 days**, **6,144** scheduled SOURCE opportunities, **36,740 REST API units reserved**, planned peak **1,280/day**, hard ceiling **1,900/day**; separate Alert-credit protected floor **1,000**.
- PRE/outcomes: original f.8 + Amendments A/B/C/D1/D2/E, T−6 continuous actual gate-out delay primary, T−90 update, T−24 comparator, separate after-takeoff arrival outcome. No proxy runway delay substitution or timestamp/flight/airport/carrier identity deletion.
- First signed SOURCE: **Monday Nov 23 2026 at 23:45 UTC / 15:45 PST**. Global signed tail: **Dec 29 04:00 UTC**. Explicit owner GO window **Nov 23 21:50Z through strictly before 23:10Z (1:50 to 3:10 PM PST)**. Intended T−90 prearm observation **22:15Z (2:15 PM PST)**. Clock latency and PRE delivery are **not guaranteed** by an Actions green icon.

## Exact Gates 9–14: when actually due

| Gate | Present status | Required acceptance, NOT more engineering |
| --- | --- | --- |
| **9 external recovery clock** | Future mode staged; target SHA variable repaired by owner; latest rolling pulse c8 safely deferred | Real later primary ACK first; **after paid GO and at/after 23:45Z** switch previously staged relay `DIRECT_VERIFY`/0 to bounded `DIRECT_TICK`/1; actual external→protected tick ACK |
| **10 target direct admission** | Existing controller and protected approval staged; target direct flag deliberately 0 before GO | After G13 actual GO, guarded G9 command changes target direct flag to 1; protected direct job actually executes, or safe scope HOLD is escalated |
| **11 entitlement and budget** | Prior three-FREE-GET account snapshot PASS (59,968 REST units, 1,830 separate Alert credits, zero billable subscriptions) | Fresh GO-time FREE-only account, budget/1,000-floor, spend and subscription check |
| **12 rights, retention, source authority, PITR/STOP** | Bounded rights/V0108/full-retention/PITR recovery-only accepted; **current signed code binding now HOLD** | Reconcile ALL unchanged science-policy SHA-linked fields to current authorized code, independent readback PASS; fresh PG16 owner READ ONLY expiry, incident STOP, no unreviewed backup/restore |
| **13 explicit paid GO** | NOT issued; two paid controls 0 at both repo and protected env | Only authenticated owner after all preGO checks, in defined 21:50–<23:10Z window, via one-use audited command; no GO if signed code binding HOLD |
| **14 actual first SOURCE/monthly continuity** | NOT DUE, no paid FIDS receipt | After launch, verify real provider charged units and exact signed PRE original, first SOURCE, POST/label, no duplicates, hard caps, retention receipts; this cannot be proven before real data arrives |

**G1–8 engineering closure is historic evidence at the reviewed older release, not permission to bypass a newly observed GitHub code-binding mismatch.** Do not recreate schemas, 31 day plans, paid Alert subscriptions, cron jobs, or old X25519 seal requests.

## Exact owner steps BEFORE Monday GO (only nonpaid)

**A — Existing owner repair has already succeeded. Do NOT rerun SHA repair.** Watch next primary relay→target ACK through GitHub:

- [Clock relay Actions](https://github.com/HKcode22/TravnrClockRelay/actions/workflows/external-clock.yml)
- [Target retention Actions](https://github.com/HKcode22/ReplitTranvr/actions/workflows/phase5-primary-fids-expiry-no-provider.yml)
- [Signed policy readback 45117949987: fail-closed](https://github.com/HKcode22/ReplitTranvr/actions/runs/45117949987)

Optional nonmutating Replit Shell check:

```bash
cd ~/workspace
gh run list -R HKcode22/TravnrClockRelay \
  --workflow external-clock.yml --limit 12 \
  --json databaseId,displayTitle,createdAt,conclusion \
  --jq '.[] | [.databaseId,.displayTitle,.createdAt,.conclusion] | @tsv'
# Pick a NEW PRIMARY_BACKSTOP run (after the SHA repair), not ROLLING_ROOT.
# Read its real forwarding log without creating another pulse:
# gh run view <RUN_ID> -R HKcode22/TravnrClockRelay --log
```

**B — Preserve/review original private custody before any source-policy change.** The original Gate8 owned encrypted material lives in owner directory matching `$HOME/.travnr-g8-seal-*` and contains `owner-private.pem`, `request.json` and `artifact/p6-g8-owner-sealed-policy-successor.json`. Do not expose them. If needed, use only a name-and-permission observation:

```bash
cd ~/workspace
bash <<'P6_PRIVATE_CUSTODY_NAMES_ONLY'
set -Eeuo pipefail
set +x
for d in "$HOME"/.travnr-g8-seal-*; do
  [[ -d "$d" && ! -L "$d" ]] || continue
  [[ -f "$d/owner-private.pem" && -f "$d/request.json" &&
    -f "$d/artifact/p6-g8-owner-sealed-policy-successor.json" ]] || continue
  printf 'P6_OWNER_G8_ORIGINAL_ENCRYPTED_CUSTODY_PRESENT permissions=%s keyPermissions=%s usedMarker=%s\n' \
    "$(stat -c %a "$d")" "$(stat -c %a "$d/owner-private.pem")" \
    "$([[ -e "$d/g8-resume-once.started" ]] && echo yes || echo no)"
done
P6_PRIVATE_CUSTODY_NAMES_ONLY
```

**Important:** This proves only local original custody availability, not a correct new signed successor. It performs zero provider, database, secret, or cron operations. **NEVER rerun the old G8 `--apply` or original seal**; its old static digest is not current-authority approval.

**C — Current signed-policy reconciliation remains a STOP.** The safe remedy must reuse owner authenticated original secret values or a reviewed existing release mechanism, change only code SHA-linked authorizations necessary for the exact three-commit heartbeat-only revision, recompute canonical inter-policy digests (without altering any scientifically relevant file), perform independently reviewed dry verification, update only the documented existing repository secret names under global paid STOP0, and obtain a **fresh repository-only complete 31-value and protected actor no-provider PASS**. No value is available to ChatGPT from GitHub secrets (write-only). Do not fabricate a pass.

## Monday Day 1 sequence — conditional; do not run paid commands while source-policy HOLD

**Preflight at 21:50 UTC (1:50 PM PST)**: check latest target/relay SHA, real new primary backstop target ACK and job outcome, existing code-binding PASS, no deletion stop, sufficient FREE REST and independent Alert-credit floor, owner budget/rights. If any evidence stale/missing/failed: **NO GO**. Preserve both global paid controls 0 at repo and environment. The already prepared G11/G12 nonpaid checker at Git blob `d41d63e032fb8470650f9f719d9a7481f2a2158b` is automatically invoked inside the recorded G13 helper, but it **does not independently resolve the known signed-policy mismatch**.

**Gate13 paid GO slot: 21:50Z through strictly before 23:10Z.** Previously prepared owner GO source blob `b4d208e8b02f25cbc065e131cbf1f92fc95a36a4` is **RETIRED/ON HOLD** until a successor has an independently checked approved code SHA and the owner GO helper itself is re-reviewed to enforce that proof. **Do not run the old b432-pinned owner GO `9e01e4...` or the c8-pinned pre-mismatch version `b4d208...` today or Monday while HOLD**. No manually setting paid secrets to 1 without approved exact-mode GO workflow. **The exact final executable GO hash will be recorded here only after the positive signed policy readback.** Do not improvise a replacement from chat or copy other developer's command.

**T−90 observation: 22:15Z (2:15 PM PST)**: check actual PRE arm result. A schedule created/skipped/green does not itself prove flight PRE was recorded before cutoff. If missing, label the cohort unavailable/missing under the existing scientific protocol; do not backfill as an on-time PRE. No unapproved paid retry.

**Gate9 after-GO activation slot: at/after 23:45Z (3:45 PM PST)**: only after G13 actually succeeded on exact current SHA, enable target direct recovery and external relay route via the audited one-time script. The existing prepared source blob is `5e89d372c63de784873b8214dd188b351ae34009`, **conditionally reserved**; do not run it if G13 is not proven or code binding remains HOLD. It first pauses **only** the external rolling lane (not primary retention), switches target direct flag from 0→1 after owner GO, reviews target history/clock, sets relay `DIRECT_TICK` with exact signed bounds, and enables external rolling last. Do not activate it early. A relay success without a target protected admission is not proof.

**Gate14 after first actual SOURCE:** record exact run/UTC/flight cohort and charged API units, link a verified provider receipt to signed plan, PRE cutoff/outcome/censored state, independent reviewer, actual POST or later due semantics, no duplicate physical GET, plus primary and private expiry receipts. Continue daily by original capped budget and stop criteria. If first SOURCE did not execute, state **NOT STARTED** rather than claiming paid-month success.

## Safe STOP and no-blind-retry conditions

Stay STOP if any of: source signed SHA/policy trust mismatch; actual main SHA drift or detached relay target pin mismatch; missing protected worker admission; insufficient 36,740 remaining REST units or Alert floor breached; unauthorized subscription/provider; deletion/retention STOP, due source contents unexpired or unknown backups; CI red on current exact main (not historical runs); target actor scheduled but not actually executed; unknown ACK/duplicate attempt; missed signed PRE cutoff; budget daily hard cap risk; provider rights/retention terms changed; owner explicit GO absent or outside GO window. Never assume a green workflow proves flight data.

On partial/unknown owner secret writes, retain paid STOP OFF and do not rerun the one-time owner release command. Use the exact failed step/run ID to reconcile. A missed Monday start means **NO GO / revised prospective launch requires independently reviewed new authorization**, not silently backdating source captures.

## Continuous monitoring and housekeeping

The existing cron-job.org pair is **PRIMARY_BACKSTOP 8890475** and **ROLLING_ROOT 8890476**. No new cron jobs or provider accounts. Existing hourly launch watch is advisory and not a substitute for signed runtime checks.

The older standalone [managed clock audit 45104276155](https://github.com/HKcode22/TravnrClockRelay/actions/runs/45104276155) ended red with HTTP-ACK-only observations and `HOLD_CRON_MANAGER_RUN_IDENTITY`; do not disable this audit just to get a green icon. Normal relay pulse status, target ACK and real target dual-job execution must be evaluated separately. Built-in GitHub cron jitter remains real (several-hour recorded historical gaps); the external clock is required but is not itself a timing guarantee.

Use issue [#413](https://github.com/HKcode22/ReplitTranvr/issues/413) and the [late heartbeat and SHA audit](2026-11-22_LATE_HEARTBEAT_AUTONOMY_AND_RELAY_SHA_AUDIT_CORRECTED_HANDOFF.md). **Keep exact G9–14; no added gate**. This runbook intentionally prioritizes safe missingness over illegal or unbound paid data.
