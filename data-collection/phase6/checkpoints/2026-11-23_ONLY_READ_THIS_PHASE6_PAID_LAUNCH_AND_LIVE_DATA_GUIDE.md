# ONLY READ THIS — Phase 6 owner instructions (current first)

**UPDATED Monday November 23, 2026, 4:22 PM California PST (November 24 00:22 UTC).** Mountain House, Tracy and San José use the same clock. This dated section supersedes ALL older instructions below. Older commands are retained for audit only, NOT for execution.

## Current decision: incident open; paid owner GO recorded, autonomous collection NOT operational

- G13 and G9 completed; do not rerun. DIRECT_TICK [45293307564](https://github.com/HKcode22/ReplitTranvr/actions/runs/45293307564) failed before dispatch; the separate rolling relay is paused (0), primary retention remains enabled (1).
- Budget flag restored in repository and protected environment. Original signed budget 36,740 units; 1,900/day cap; 1,000 Alert floor. Early-draw approval restored. Actual [Day 2 draw 45295746205](https://github.com/HKcode22/ReplitTranvr/actions/runs/45295746205/job/138115547586) committed four airports, zero provider calls.
- **Owner bulk census COMPLETED** at 4:22:46 PM PST (00:22:46Z). Marker: `P6_OWNER_BULK_METADATA_AND_READONLY_CENSUS_COMPLETE_NOT_GO`. Correct primary neondb, read-only; Day1 draw=0, Day2 draw=4, SOURCE attempts=0, other REST reservations=0, unresolved STOPs=0 for checked scope. 98 repository secret names, 9 protected environment secret names. Required direct secret names present; effective values not proven. Do not rerun this census just because it was previously requested.
- **New confirmed operational blockers:** the owner census shows missing active-route variables for SOURCE stored dispatch, POST parent/producer, daily prepare, PRE enrollment, T24 witness, later PRE and watchdog. Several corresponding required approvals are absent. Both paid child jobs reference an absent `AERODATABOX_API_KEY` Actions secret; restore only from the owner's existing authenticated provider credential, never paste into chat/logs. Some other absent references are deliberately optional/legacy/conflicting and MUST NOT be populated blindly. Repository secret capacity is near 100; plan verified scope placement rather than adding every name. This is a commissioning/configuration incident, not proof the provider or database failed.

## What YOU need to do — newest instructions

| Local California time | Owner action |
|---|---|
| **Now, Monday Nov 23** | Bulk audit already completed. **No additional reviewed write command is available yet.** Do not rerun G13, G9, either flag repair, or the early draw. Keep rolling relay paused; leave primary retention enabled. |
| **Before sleeping tonight** | Reopen the TOP of this guide and check the latest ChatGPT/issue #413 recovery update. If a new dated, reviewed owner command is posted, run it once and paste only sanitized result. If none is posted, there is no approved new command to execute; collection remains unverified. |
| **Tuesday Nov 24, ideally by 8 AM (before 9:45 AM)** | Reopen this guide. Check whether the Day1 remaining-horizon exception and configuration recovery have actually been deployed and verified; if not, request urgent review. Optional read-only status command below. Do NOT dispatch paid GETs manually. |
| **Tuesday 9:45 AM–1:30 PM** | Day1 T−6 primary SOURCE window, conditional on valid preparation and admission. Observe actual receipt; no retrospective acquisition. |
| **Tuesday 2:15–6 PM** | Day1 T−90 update window, conditional on valid preparation and admission. Check SOURCE and PRE evidence, not merely green workflow. |
| **Tuesday evening** | Day1 service window 4–8 PM PST; Day2 draw already exists, but signed daily preparation must still be verified before its first SOURCE window. Check Day2 readiness independently even if Day1 cannot be recovered. |
| **Wednesday Nov 25 onward** | No standing manual paid commands authorized or intended. Once autonomy is demonstrated, check receipts daily when practical. Until then, inspect the latest dated guide and do not assume unattended collection is working. |

### Optional owner status check (read-only; no provider, no dispatch)
Run only if fresh status is useful. Paste sanitized result, not secret values.
~~~bash
cd ~/workspace
set +x
TZ=America/Los_Angeles date '+%Y-%m-%d %I:%M:%S %p %Z'
gh variable get TRAVNR_RELAY_ROLLING_ENABLED -R HKcode22/TravnrClockRelay
gh variable get TRAVNR_RELAY_PRIMARY_ENABLED -R HKcode22/TravnrClockRelay
gh run list -R HKcode22/ReplitTranvr --limit 15 --json databaseId,displayTitle,status,conclusion,createdAt
gh run list -R HKcode22/TravnrClockRelay --limit 10 --json databaseId,displayTitle,status,conclusion,createdAt
~~~

## Engineering work remaining (NOT owner commands)
1. Resolve current-mode missing flags/variables against actual workflow predicates, original signed authorization and existing credentials; separate intentional conflicts/legacy from required. Check effective values privately, not name-only. Preserve scope and STOP semantics.
2. Protect Day2 with genuine nonpaid signed preparation and publication before deadline; do not wait for Day1 recovery to protect Day2.
3. Day1 exception: fixed OMAA, OMSJ, SPJC, KDEC; original schedule; actual late registration time; still-future T−6/T−90 and any genuinely eligible T−24 only; retain missing denominators, no backdating. Existing whole-day prearm blocks this until reviewed successor is implemented. No executable exception deployed as of this update.
4. Reconcile failed DIRECT_TICK and complete no-dispatch/charge/overlap evidence; reviewed prospective recovery, no blind rerun or silent epoch reset. Restore rolling only after verified runtime admission and downstream readiness.
5. Verify actual paid SOURCE bound original and qualified cutoff-safe PRE/POST; then declare autonomy operational. No new gates or reopening completed Gates1–8/G12.

Evidence: [incident checkpoint](2026-11-23_DAY1_LAUNCH_INCIDENT_ROOT_CAUSES_AND_PROSPECTIVE_RECOVERY.md), [Day2 receipt and dependency inventory](2026-11-23_DAY2_DRAW_RECEIPT_AND_RUNTIME_DEPENDENCY_INVENTORY.md), [owner census script](2026-11-23_owner_bulk_runtime_metadata_census.cjs), [master issue #413](https://github.com/HKcode22/ReplitTranvr/issues/413). Do not publish private credentials or raw signed packets.

---

# HISTORICAL ORIGINAL GUIDE — DO NOT EXECUTE OLD LAUNCH COMMANDS

**The following original morning timetable and Commands A/B are retained solely as historical evidence. They have been superseded by the dated current instructions above. G13/G9 are already completed.**

# ONLY READ THIS — Monday Nov 23 Phase 6 paid-month launch & live-data guide

**Owner:** HKcode22 · **Local timezone:** Pacific Standard Time (PST, UTC−08:00). Mountain House, Tracy and San José use the SAME local clock.  
**Scope:** The existing signed 31-day Phase 6 experiment in HKcode22/ReplitTranvr. This file is an operator guide, not a new gate, new permission, or change to the study.  
**Prepared from live GitHub at about 3:03 AM PST, Nov 23, 2026.** Read fresh logs at the time you act.

## FIRST: are we GO?

**CONDITIONAL TECHNICAL GO to ATTEMPT the scheduled launch, NOT an unconditional paid GO.** Do not buy data or authorize the month before the fresh Gate 13 checks pass inside the exact window.

- Target production main must be **c8e065d665ccacb6d2575070e94c5500b7583044**.
- External relay main must be **c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed**.
- Gates 1–8 and Gate 12 were already completed. Do **NOT** rerun G12, the one-use installer, the expiry pin repair, G8, migrations, or an additional cron installer.
- The recent expiry pin issue was fixed by the owner. Real full expiry #45152223464 and the heartbeat #45152310334 succeeded. **New live evidence:** native scheduled expiry [#45157544951](https://github.com/HKcode22/ReplitTranvr/actions/runs/45157544951) on c8 at 2:35 AM PST succeeded with BOTH primary-FIDS and Phase7 expiry steps actually executed. Later full external-forwarded retention [#45159601869](https://github.com/HKcode22/ReplitTranvr/actions/runs/45159601869) also executed both jobs successfully. This is better than relying on yesterday's heartbeat, but does not prove future populated-record deletion or never-miss scheduling.
- The latest seen pre-GO Phase 6 private-later enrollment [#45160007426](https://github.com/HKcode22/ReplitTranvr/actions/runs/45160007426) was **SKIPPED**, expected while paid GO is off. A green/deferred rolling relay is not a charged SOURCE.
- Exact original Gates 13 and 9 owner commands below were taken from the current [START HERE approved runbook](https://github.com/HKcode22/ReplitTranvr/blob/phase6/20261122-g8-502-readback-evidence/data-collection/phase6/checkpoints/2026-11-23_START_HERE_PHASE6_LAUNCH_EXACT_3_OWNER_COMMANDS.md).
- **Still unproven:** today's live AeroDataBox account balance and permissions at GO, Gate 13 owner authorization, Gate 9 DIRECT_TICK after GO, first protected target SOURCE, real provider bill/original, cutoff-safe PRE, due POST and continuous actual gate-out label. No one can promise 31 flawless days in advance.

**Hard rule:** If a required command prints HOLD, reports a failed required step, misses the signed GO window, or reveals an unresolved provider charge, signing, rights, budget or retention STOP: **do not continue to the next paid step**. Send the nonsecret output for review; do not override or blindly retry.

## Your entire Monday timetable — local California time

| When (PST) | What YOU do | What must happen / what NOT to do |
| --- | --- | --- |
| **Now, around 3 AM, before sleep** | Nothing else required. Optionally run the READ-ONLY preflight below and paste the output; save this guide. | **Do not run Gate 13 or Gate 9, reinstall G12, change main, edit secrets, or buy provider credits.** Existing repair is complete. |
| **After waking, before 1:40 PM** | Open this file, check time and GitHub current pinned SHAs; review the latest expiry/relay jobs using the read-only command below. | The production SHAs must still match. The next real current-main full expiry/backstop must execute required jobs, not merely produce a green skipped shell. Any new real due/deletion/rights/budget issue is a HOLD. |
| **1:40–1:50 PM** | Open the existing authenticated Replit Shell in ~/workspace; verify gh authentication and clock. Have this file ready. | Do not start Gate 13 before 1:50 PM. Do not log provider keys, signed source contents, private packets or DB URLs. |
| **1:50–2:15 PM (preferred)** | Run **COMMAND A / G13** below once, only after the fresh checks it performs are acceptable. | Exact accepted terminal marker: **P6_G13_EXPLICIT_OWNER_GO_4_SCOPE_WRITES_ACKNOWLEDGED**. It tests free provider balance **at least 36,740 REST units**, **at least 1,000 Alert credits**, rights, STOP, current SHA, 31 policy, protected POST and V0108 retention. No marker or HOLD = NO GO. |
| **2:15 PM–strictly BEFORE 3:10 PM** | If not yet run, G13 can only be attempted within its original signed window and only with clean prerequisites. Save the result and paste sanitized output. | At **3:10 PM or later**, do NOT run G13 under the expired authority. Do not silently shift study dates or hand-enable paid flags. |
| **3:10–3:45 PM** | Confirm G13 succeeded; observe current GitHub histories only. | Do NOT force an early SOURCE GET, an early DIRECT_TICK or a premature PRE. First source epoch is **3:45 PM**. |
| **3:45 PM or later, ONLY after genuine G13 PASS** | Run **COMMAND B / G9** below once, then check external→target forwarding. | Exact accepted marker: **P6_G9_DIRECT_TICK_EXISTING_EXTERNAL_LANE_ACTIVATED_AFTER_EXPLICIT_G13_GO**. Its success alone is not a paid SOURCE. |
| **Around 4:00 PM, 4:30 PM and later that evening** | Read the relay, target, SOURCE child and DB metadata as described below. Paste run IDs and sanitized aggregate receipts. | Distinguish no dispatch, accepted dispatch, successful target, billed physical GET, stored original, normalized flights, PRE, POST, and true labels. No made-up counts. |
| **Next morning / each study day** | Review budget/incident/expiry and missingness summaries when practical. | Authorized automation is intended to run without your Mac on. Still check failures; a system-level STOP must halt further spending, not be bypassed. |

### READ-ONLY CHECK — now or after waking

Paste in the Replit Shell. This changes no secrets, makes no provider calls and dispatches no workflow.

~~~bash
cd ~/workspace
set +x
printf 'CALIFORNIA: '; TZ=America/Los_Angeles date '+%Y-%m-%d %I:%M:%S %p %Z'
printf 'UTC:        '; date -u '+%Y-%m-%d %H:%M:%S UTC'
gh auth status --hostname github.com
printf '\nTARGET MAIN:\n'
gh api repos/HKcode22/ReplitTranvr/git/ref/heads/main --jq '.object.sha'
printf '\nRELAY MAIN:\n'
gh api repos/HKcode22/TravnrClockRelay/git/ref/heads/main --jq '.object.sha'
printf '\nRECENT TARGET RUNS:\n'
gh run list --repo HKcode22/ReplitTranvr --limit 12 --json databaseId,name,createdAt,conclusion,headSha
printf '\nRECENT RELAY RUNS:\n'
gh run list --repo HKcode22/TravnrClockRelay --limit 10 --json databaseId,name,createdAt,conclusion,headSha
printf '\nNATIVE EXPIRY JOBS:\n'
gh run view 45157544951 --repo HKcode22/ReplitTranvr --json jobs,conclusion
~~~

**Paste back:** local and UTC time, target SHA, relay SHA, recent run list and expiry jobs. **Do not paste** GH authentication tokens or environment variables. Historical red jobs or intentional pre-GO skips are not automatically a new blocker; investigate any fresh current-main regression.

### COMMAND A — exact Gate 13 signed paid-month owner GO

**Only Monday Nov 23 from 1:50 PM PST to STRICTLY BEFORE 3:10 PM PST. Prefer 1:50–2:15 PM.** This authorizes the existing signed budget; it does not itself prove an AeroDataBox charge. Run once; do not repeat after uncertain partial-write/HOLD.

~~~bash
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
~~~

**Accept only:** P6_G13_EXPLICIT_OWNER_GO_4_SCOPE_WRITES_ACKNOWLEDGED, with verifiable authenticated scope/ledger evidence. **Any HOLD / partial scope / red required live check / missing marker = STOP**. Paste full **sanitized** status + run IDs into ChatGPT before continuing. Do not expose secrets.

### COMMAND B — exact Gate 9 external DIRECT_TICK recovery switch

**Only at/after 3:45 PM PST AND ONLY if Command A genuinely PASSED.** It enables an existing guarded automatic relay route. This command itself is not a provider GET.

~~~bash
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
~~~

**Accept only:** P6_G9_DIRECT_TICK_EXISTING_EXTERNAL_LANE_ACTIVATED_AFTER_EXPLICIT_G13_GO. Then look for a **new** actual external ROLLING_ROOT→target DIRECT_TICK ACK and the **target job**. If no real target job appears, do not claim autonomy proved or send an unapproved direct provider retry.

## How to SEE results live — which screen and what means what

The production data database is the **existing Neon PostgreSQL 16 database named neondb**, not a replacement database. GitHub Actions show **jobs and sanitized receipts**; Neon shows **durable private source, queue, budget and PRE data**. Replit Shell is for authenticated owner operations and optional read-only inspection; do **not** depend on keeping the browser/terminal open for every automatic worker.

| What you want to see | GitHub / Neon location | What healthy evidence looks like |
| --- | --- | --- |
| **External timer works** | [TravnrClockRelay Actions](https://github.com/HKcode22/TravnrClockRelay/actions), especially ROLLING_ROOT and PRIMARY_BACKSTOP | Correct c5 relay, approved target c8, new target ACK **with target run ID**, not just a green deferred pulse |
| **Protected worker actually ran** | [ReplitTranvr Actions](https://github.com/HKcode22/ReplitTranvr/actions), workflow **Phase6 direct existing-worker recovery** or **Phase6 initial bounded rolling controller session** | Correct c8, actual protected admission steps, existing bounded SOURCE parent/child ACK; not STOP/skipped |
| **FIDS SOURCE queries scheduled** | Neon: **clean.phase5_fids_allowed_query_v39**, **clean.adb_sampling_draw**, **clean.adb_phase6_calendar_day** | Signed selected **run_day_index**, four distinct HUB/MID_A/MID_B/REGIONAL slots, query horizon and its genuine dispatch/cutoff |
| **A physical billable FIDS request was reserved** | **clean.phase5_fids_physical_attempt_v39** and **clean.phase5_fids_utc_charge_budget_v39** | Exact bounded physical attempt and UTC-day reserved units. Reservation is NOT proof the provider actually billed or returned data |
| **Real provider response/original received** | **clean.phase5_fids_original_binding_v39**, **clean.fids_query_response**, SOURCE child job/physical GET settlement ledger | A bound original + response digest + independent provider usage/charge. A missing original after uncertain network timeout is a reconciliation incident, not “free” |
| **Actual flights normalized** | **clean.flight_population** and per-source original binding | Confirmed operating legs linked to authentic original; number of flights need not equal query count |
| **T−24 / T−6 / T−90 PRE** | **clean.phase5_cd_pre_task_v39**, **clean.flight_snapshots**, **Phase6 restartable private PRE enrollment** / Stage14 source-clock checks | Per **horizon** task states and original same-leg proof. VERIFIED_ON_TIME and individual cutoff checks matter; late cannot become on-time |
| **Private signed day packets** | **phase6_private.frozen_native_packet_v39**, **phase6_private.signed_run_day_index_revision_v39**, **phase6_private.signed_run_day_epoch_claim_v39** | Signed approved day/index, lawful TTL; don't expose private packet bytes in logs or chat |
| **POST and actual outcome labels** | **Phase5 one signed future POST v0083** protected reviewer/publisher/storage steps; reviewed private outcome evidence and its DB-linked metadata | Only when due. A real actual gate-out paired with scheduled gate-out may qualify. Revised/estimated/runway times alone do **not** qualify; unknown/not_due/censored is not zero delay |
| **Cost and STOPs** | **clean.phase5_fids_cycle_budget_v39**, **clean.phase5_fids_day_budget_v39**, **clean.phase5_fids_utc_charge_budget_v39**, **clean.adb_incident_stop**, Phase6 safety watchdog | Actual physical UTC-day charge and other reserved categories under **1,900/day**, month signed ceiling, Alert floor and no unresolved hard STOP |
| **Retention/expiry** | [Phase5 primary FIDS expiry workflow](https://github.com/HKcode22/ReplitTranvr/actions/workflows/phase5-primary-fids-expiry-no-provider.yml) and full backstop child, **clean.provider_content_blob_ref**, V0108 PG status | **Both** primary-fids-expiry and phase7-expiry step SUCCESS; due rows/deletion STOP reconciled. Empty sweep ≠ populated deletion/PITR guarantee |
| **Tests/probes/canaries** | Workflow name contains **offline**, **NO PROVIDER**, **callback health**, **canary**, **probe**, **READ ONLY** | These check only the exact advertised layer. A green zero-provider test is not a bill, FIDS row, valid T−6 snapshot or real POST |

For SOURCE/flight evidence, always compare **planned queries → actual physical attempts → provider responses → bound originals → normalized flight legs → per-horizon verified PRE → due qualified POST**. Count both the numerator **and denominator**. T−24h/T−6h/T−90m are prediction deadlines relative to an individual flight's frozen scheduled T; they are not three independent airports or guaranteed three samples per flight.

### Optional: safe, aggregate SQL to read in Neon SQL Editor

Use **the existing neondb** and a read-only/restricted auditor identity. These SELECTs return **counts only**, no raw provider contents or flight identities. Some identities may lack permission for a table; a permission error is not permission to weaken production grants. The first table lists estimates; the next queries count actual rows where available. These are **cumulative** unless a specific day/time filter is shown.

~~~sql
BEGIN READ ONLY;
SET LOCAL statement_timeout = '10s';

SELECT current_database() AS database_name, current_user AS role_name,
       clock_timestamp() AS database_clock_utc;

SELECT schemaname, relname, n_live_tup AS estimated_rows
FROM pg_stat_user_tables
WHERE (schemaname = 'clean' AND
       relname IN ('phase5_fids_allowed_query_v39',
                   'phase5_fids_physical_attempt_v39',
                   'phase5_fids_original_binding_v39',
                   'fids_query_response',
                   'flight_population','flight_snapshots',
                   'phase5_cd_pre_task_v39','adb_incident_stop',
                   'phase5_fids_utc_charge_budget_v39'))
   OR (schemaname = 'phase6_private' AND
       relname IN ('frozen_native_packet_v39',
                   'signed_run_day_index_revision_v39'))
ORDER BY schemaname, relname;

SELECT horizon, state, COUNT(*) AS tasks
FROM clean.phase5_cd_pre_task_v39
GROUP BY horizon, state
ORDER BY horizon, state;

SELECT run_day_index, horizon, state, COUNT(*) AS signed_query_rows
FROM clean.phase5_fids_allowed_query_v39
WHERE run_day_index = 1
GROUP BY run_day_index, horizon, state
ORDER BY horizon, state;

SELECT horizon, COUNT(*) AS newly_created_pre_snapshots
FROM clean.flight_snapshots
WHERE created_at >= TIMESTAMPTZ '2026-11-23 23:45:00+00'
  AND prediction_state = 'PRE_DEPARTURE'
GROUP BY horizon
ORDER BY horizon;

SELECT cause, COUNT(*) AS unresolved_incidents
FROM clean.adb_incident_stop
WHERE NOT resolved
GROUP BY cause
ORDER BY cause;

COMMIT;
~~~

**Do not interpret a PRE snapshot count as scientifically qualified PRE.** The independent Stage14 check must also prove correct flight, original provider availability, exact signed T, source expiry/rights, and cutoff. The first SOURCE may be later than 3:45 PM, may return zero flights, or may have no qualified POST yet. A missing PRE before it is due is **not_due**, not a failure.

### Fast GitHub metadata-only monitoring after Gate 9

~~~bash
cd ~/workspace
set +x
gh run list --repo HKcode22/TravnrClockRelay --limit 15 --json databaseId,name,createdAt,status,conclusion,headSha
gh run list --repo HKcode22/ReplitTranvr --limit 25 --json databaseId,name,createdAt,status,conclusion,headSha
~~~

For an exact run number shown above, inspect its JOBS (not only the parent conclusion):

~~~bash
gh run view RUN_ID --repo HKcode22/ReplitTranvr --json jobs,conclusion
~~~

**Replace RUN_ID with a real numeric ID** before running; this is an inspection command, not a dispatch. You can open that run in GitHub → Actions → Jobs → Step logs. Never paste a DB URL, token, full source payload, private packet, or flight identity into a public GitHub comment.

## The 6+6 callback question — what was replaced and what remains

**The old “6+6 callback health” is a historical Phase 3 Gate 4 NEXT2/NEXT3 health-observation workflow. It is not the main Phase 6 SOURCE/PRE/POST control plane or a reason to run twelve callback probes before today's GO.**

The inspected **current c8 workflows** use: GitHub Actions + external rolling/PRIMARY relay; separate **restricted Neon PostgreSQL credentials** such as V39_P5_SOURCE_DATABASE_URL, P6_PRIVATE_READER_DATABASE_URL and P5_V39_PREPARE_DATABASE_URL; durable DB queue/lease; and private same-runner reviewer/publisher/socket handoffs. Generic DATABASE_URL is intentionally blank in several protected GH jobs while the **specific scoped DB secret** is supplied. Direct DB authorization, not a Replit HTTP callback carrying private packets through public Actions, is the primary signed data path.

**Important caveat:** the repository still contains the Replit callback-only service and a **protected AeroDataBox webhook destination guard** for webhook use cases. Not every optional callback/webhook function has been eliminated. Current no-provider preflight success **does not certify** future external webhook delivery, network uptime or the absence of a Replit callback error during a later genuine paid run. Do not try to “fix” that by disabling webhook authentication or changing the signed runtime today.

## What if something is missing while you are away?

The planned **external cron-job.org wake-ups**, detached GitHub relay, bounded chained workers and durable PostgreSQL queue/leases are designed so your **computer and this chat need not stay open**. They are also designed to refuse or STOP certain unsafe actions. They are **not** a mathematical guarantee of punctuality or 100% capture. GitHub-native scheduling has shown historical delays; the independent backstop reduces that risk, not eliminates it.

- **A few missed, cutoff-late or provider-empty SOURCE/PRE results:** preserve the true timestamps, record missingness and keep valid independently qualified flight/horizon pairs. Do **not** backfill a past prediction cutoff or quietly redraw airports.
- **POST not due / actual gate-out unknown:** record not_due or unknown/censored. Never invent zero-minute delay or use an estimate as actual.
- **Ambiguous charge, duplicate GET, broken signatures, wrong SHA, rights/TTL, hard budget, provider usage or deletion STOP:** halt affected collection and reconcile before any retry. This may block later study days.
- **A green relay with no actual protected target receipt:** verify dispatch ACK and target run ID. It proves only the timer layer.
- **A missed G13 deadline:** no retroactive paid GO, no hand-edit of study dates. New launch authority would need a separately reviewed **prospective** schedule.

**Your monitoring obligation:** review receipts when possible, especially after the first epoch and the following morning. You do **not** need to run a manual command every four hours or stay awake all 31 days. But neither ChatGPT nor a success icon can guarantee rescue of a missing past observation. A serious shared STOP needs owner review.

## Exactly what to paste back to ChatGPT (no secrets)

1. **Before launch:** read-only command output: date/time, both SHAs, latest current-main expiry/relay jobs, any new real STOP or skipped execution. Redact tokens.
2. **After Gate 13:** entire **sanitized terminal output**, success/HOLD marker, authenticated run IDs and ledger status. Do not run Gate 9 on anything other than a verified G13 PASS.
3. **After Gate 9:** sanitized marker, relay run ID, target run ID, actual target job and child results.
4. **After the first SOURCE:** sanitized aggregates: physical attempts, billed/settled REST units, originals bound, normalized physical flights, T−24/T−6/T−90 planned/qualified/missed/not_due counts, POST due/qualified/censored, unresolved STOP, TTL/expiry status. Use UNKNOWN rather than fabricated zero.

**Assistant's remaining work after receiving your outputs:** independently check the exact run/job receipts and authorized source/budget/rights/retention state, distinguish a recoverable bounded missing observation from a shared STOP, and advise the next safe step. This guide **does not** authorize anyone to override a live STOP.

## Authoritative original sources — for verification, not a competing instruction set

- [Current START HERE — exact owner command sources](https://github.com/HKcode22/ReplitTranvr/blob/phase6/20261122-g8-502-readback-evidence/data-collection/phase6/checkpoints/2026-11-23_START_HERE_PHASE6_LAUNCH_EXACT_3_OWNER_COMMANDS.md)
- [Full Day 1 operations / salvage classification](https://github.com/HKcode22/ReplitTranvr/blob/phase6/20261122-g8-502-readback-evidence/data-collection/phase6/checkpoints/2026-11-23_DAY1_PHASE6_PAID_MONTH_OPERATOR_RUNBOOK_GATES_9_14.md)
- [Technical guide: full Gates 1–14, code and architecture](https://github.com/HKcode22/ReplitTranvr/blob/phase6/20261122-g8-502-readback-evidence/data-collection/phase6/checkpoints/2026-11-23_PHASE6_GATES_1_TO_14_TECHNICAL_GUIDE_AND_ACCIDENTAL_MAIN_AUDIT.md)
- [Master issue #413](https://github.com/HKcode22/ReplitTranvr/issues/413)

**Do not merge this or other documentation into SHA-pinned production main before the launch. This file is on the isolated evidence/documentation branch only.**
