# ONLY READ THIS — Phase 6 current operator guide

**Updated Monday November 23, 2026, 4:35 PM PST (Nov24 00:35Z).** All times below are California PST, including Mountain House, Tracy and San José. This is the current guide. Earlier command blocks were corrupted by a documentation edit and are removed from this version; historical revisions are retained in Git history, not to be executed.

## 1. What to do now

**No additional write command is currently validated.** If the shell is showing a continuation prompt `>` after the old broken command, press Ctrl+C. Do not repeat provider-key recovery or Command C, G13, G9, G12, budget repair or early draw.

- G13 and G9 completed; rolling relay paused after [failed DIRECT_TICK 45293307564](https://github.com/HKcode22/ReplitTranvr/actions/runs/45293307564). Independent primary retention remains enabled.
- Owner restored budget flag and early-draw approval. [Day2 draw 45295746205](https://github.com/HKcode22/ReplitTranvr/actions/runs/45295746205/job/138115547586) committed four airports.
- Owner read-only census 4:22:46 PM PST: correct primary neondb, source attempts 0, other REST reservations 0, unresolved stops 0, Day1 draw rows 0, Day2 draw rows 4.
- Owner restored original Replit AeroDataBox key in existing protected Actions environment at 4:31:34 PM. Do not repeat. It is not a new credential or a paid receipt.
- **Command C completed**: two existing nonpaid actor approvals installed at 4:34:57–58 PM PST; [actual run 45298328334](https://github.com/HKcode22/ReplitTranvr/actions/runs/45298328334/job/138124278446) passed all protected runtime steps, including policy, signer and restricted DB-clock selection. Actual receipt `NO_ELIGIBLE_UNPUBLISHED_FUTURE_DAY_NO_WRITE`, eligible 0, missing draw 0, too late 0, already indexed 0, provider calls 0, dispatches 0. Day2 was about 27h away; code excludes days beyond signed maximum lookahead. Exact private lookahead not read. Owner enabled native nonpaid schedule and returned `P6_NONPAID_PREPARATION_SCHEDULE_ENABLED_PAID_ROLLING_STILL_PAUSED`. This is successful nonpaid admission, not a prepared Day2 or paid GO.
- Original code, rights, budget, policies and database roles remain commissioned. Missing metadata names are not necessarily missing underlying approvals; never bulk-set optional/legacy/conflicting flags.

## 2. Exact signed FIDS windows

| Study day | Horizon | California PST request window | Planned templates |
| --- | --- | --- | ---: |
| 1 | T-24h | Mon Nov23 3:45–7:30 PM | 64 |
| 1 | T-6h | Tue Nov24 9:45 AM–1:30 PM | 64 |
| 1 | T-90m | Tue Nov24 2:15–6 PM | 64 |
| 2 | T-24h | Tue Nov24 7:45–11:30 PM | 64 |
| 2 | T-6h | Wed Nov25 1:45–5:30 PM | 64 |
| 2 | T-90m | Wed Nov25 6:15–10 PM | 64 |

Each Day1 horizon has 16 departure FIDS templates per airport slot (HUB/MID_A/MID_B/REGIONAL), 64 total, 2 units per attempt, one maximum attempt per template. These are planned calls, not flights, bills, or successful snapshots. Day1 original slots OMAA, OMSJ, SPJC, KDEC remain fixed; no outcome-informed redraw. Day1 service Nov24 4–8 PM PST, Day2 service starts Nov25 8 PM PST. Source records can establish prospective schedule/flight identity and available preflight features. Separate verified PRE and actual-only POST evidence are required for Amendment E; no inferred gate-out labels from FIDS estimates.

**Day1 currently blocked at all horizons**: no committed Day1 draw, no signed daily genesis before the first planned request, rolling paused. Some T24 scheduled slots have elapsed and others are still future at this observation. Do not assert all T24 are already missed or any later slots can execute on existing authorization. Existing whole-day preparation will not select Day1 after its first-request deadline; separate reviewed prospective exception is not implemented. Original runtime binding explicitly left standaloneNoT24ProtocolSha256 null; no forced T6/T90 standalone admission. Never backdate. Day2 independently drawn but preparation not yet published.

## 3. Owner schedule

| When | What YOU do |
| --- | --- |
| Monday now | No additional write command; do not repeat completed recovery. |
| Tonight | No T6/T90 Day1 requests are scheduled tonight; remaining T24 blocked. No paid command authorized. |
| Tuesday 8 AM PST | Optional short read-only status command below; if no Day1 recovery receipt, do not expect T6 to collect. |
| Tuesday 9:45 AM–1:30 PM / 2:15–6 PM | Day1 T6/T90 only if separately reviewed, prospectively admitted recovery is verified; otherwise count missed honestly. |
| Tuesday before 4:45 PM | Conservative Day2 prep verification boundary (3h before first SOURCE; actual signed minimum 15–180 min). Nonpaid schedule is enabled, but GitHub scheduling is not guaranteed. |
| Tuesday 7:45 PM | First planned Day2 SOURCE; paid controller still requires reconciliation and verified activation. |
| Wednesday onward | No recurring owner shell commands approved. Unattended collection not yet proved. |

There is no verified timed paid-reactivation command to run tomorrow yet. Do not use stale commands from earlier guide revisions. No new gates or migrations.

### Optional read-only status command, anytime (no secret values, provider calls, dispatch or writes)

~~~bash
cd ~/workspace
set +x
TZ=America/Los_Angeles date '+%Y-%m-%d %I:%M:%S %p %Z'
gh variable get P6_NONPAID_SOURCE_SCHEDULE_ENABLED -R HKcode22/ReplitTranvr
gh variable get TRAVNR_RELAY_ROLLING_ENABLED -R HKcode22/TravnrClockRelay
gh variable get TRAVNR_RELAY_PRIMARY_ENABLED -R HKcode22/TravnrClockRelay
gh run list -R HKcode22/ReplitTranvr --workflow phase6-nonpaid-source-day-prepare-publish.yml --limit 8
gh run list -R HKcode22/ReplitTranvr --limit 12
~~~

Paste output if needed. No raw secrets, source payloads, private packet bytes or DB URLs.

## 4. Remaining engineering incident work

1. Reconcile exact current-mode SOURCE/PRE/POST and controller configuration against original reviewed approvals; do not re-create original signed policies.
2. Observe genuine Day2 nonpaid scheduled preparation/publication before deadline. Successful no-due-work is not a published index.
3. Implement and review Day1 remaining-horizon exception with original airports, original cutoff windows, actual DB clock, explicit missing denominators and no replay; if impossible, record honest missingness and protect subsequent study days.
4. Reconcile exact failed direct run and downstream history, with no dispatch/charge/overlap evidence; prospective approved successor only, no silent epoch reset or blind rerun. Keep retention active.
5. Verify actual paid SOURCE physical attempt, bound authentic original, actual provider charge, normalized flights, per-horizon cutoff-safe PRE, due POST and actual-only gate-out qualification. Gate14 not yet proved.

Production main c8e065d665ccacb6d2575070e94c5500b7583044; relay c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed. No production change from this guide.

## 5. Evidence and history

- [Day1 signed plan](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-01.json) / [Day2 signed plan](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-02.json)
- [Actual Day2 nonpaid receipt](https://github.com/HKcode22/ReplitTranvr/actions/runs/45298328334/job/138124278446)
- [Original runtime binding review](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/evidence/2026-11-22_PHASE6_RUNTIME_BINDING_OWNER_DELEGATED_SCOPE_REVIEW.md)
- [Original uncorrupted morning guide (historical only, DO NOT EXECUTE)](https://github.com/HKcode22/ReplitTranvr/blob/77e9babc42018e5bd4eabb46bb4b3f90f86992de/data-collection/phase6/checkpoints/2026-11-23_ONLY_READ_THIS_PHASE6_PAID_LAUNCH_AND_LIVE_DATA_GUIDE.md)
- [Completed Day2 command source (DO NOT REPEAT)](p6_20261123_day2_existing_nonpaid_prepare_owner.sh)
- [Incident checkpoint](2026-11-23_DAY1_LAUNCH_INCIDENT_ROOT_CAUSES_AND_PROSPECTIVE_RECOVERY.md)
- [Master issue #413](https://github.com/HKcode22/ReplitTranvr/issues/413)

**Hard rule:** any unresolved charge/dispatch, rights, expiry, signature, cutoff, role or budget STOP requires reconciliation. No manual paid override, no made-up timestamps or outcomes. Existing hourly launch watch is monitoring only.
