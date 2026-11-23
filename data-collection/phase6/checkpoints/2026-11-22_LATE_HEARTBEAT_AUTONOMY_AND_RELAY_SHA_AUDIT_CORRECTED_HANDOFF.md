# Phase 6 live late-evening audit — autonomous workflow, heartbeat CI, stale external relay target SHA

**Audit performed:** 2026-11-23 05:08 UTC (~2026-11-22 21:08 PST), via live GitHub REST / exact workflow-job logs. **No paid GO or source calls in this audit.** Authoritative fixed G9–14 release register remains six items. Do not reopen G1–8 or widen the frozen research design.

## Actual current heads, changes and CI

- Target HEAD **`c8e065d665ccacb6d2575070e94c5500b7583044`**, relay HEAD **`c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed`**. The old owner release scripts hard-pinned target `b432eb9a5bac7bc3c4537249e75ec7df41e8727c` and are now **SUPERSEDED, DO NOT RUN**.
- GitHub `compare/b432...c8e` reports exactly **3 commits ahead**, 0 behind, only **four changed paths**: heartbeat observer, heartbeat runner, heartbeat test, and the new Gemini audit checkpoint. No original SOURCE/PRE/POST, policy, pricing, calendar, source rights, expiry scripts, or workflow source changed in this three-commit advancement. This is important because reissuing or reinstalling signed scientific packets would be unnecessary.
- Actual full current-main offline safety run [45115427067](https://github.com/HKcode22/ReplitTranvr/actions/runs/45115427067): **SUCCESS**, including full test suite and safety pipeline. Latest current-main heartbeat [45115536602](https://github.com/HKcode22/ReplitTranvr/actions/runs/45115536602): **SUCCESS**, including the real observer step. Current-main full retention target [45115450162](https://github.com/HKcode22/ReplitTranvr/actions/runs/45115450162): both `primary-fids-expiry` and `phase7-expiry` jobs **SUCCESS**, their actual output: `providerCalls=0`, `phase6PaidGo=false`, `duePackets=0`, `dueIndexes=0`, `deletedLinks=0`, `deletedFragments=0`; no evidence of charged source acquisition.
- Gemini's heartbeat code changes are real. Its exact [commit e4beeb2393](https://github.com/HKcode22/ReplitTranvr/commit/e4beeb23931c7807036ad2359c1ef1ab03501e04) changed the observer to recognize `P5 FULL RETENTION BACKSTOP CHILD` and select `primary-fids-expiry` by name rather than assuming one job. Its runner now treats `NO_SCHEDULE_RUN_ON_CURRENT_MAIN` as *nonfatal* when a current-main child has executed the primary expiry step recently. This is appropriate for distinguishing GitHub cron jitter from an actually failed expiry backstop, but **it does not assert physical deletion is verified**.
- **Gemini's written description '0 active incidents' is misleading.** The real current-main heartbeat JSON at 45115536602 still reported `status=AUTONOMOUS_GITHUB_CONTROLLERS_NEED_ATTENTION_NO_GO`, `activeNotifications.incidentCount=1`, `PRIMARY_FIDS_EXPIRY/NO_SCHEDULE_RUN_ON_CURRENT_MAIN`, and `backup.state=BACKSTOP_CHILD_STEP_RECENT_NOT_DELETION_PROOF` with `executedStepVerified=true`. Exit 0 is a *mitigated warning* not all schedules healthy, no normal source collection proof. Native scheduled runs showed long gaps (several hundred minutes) in the GitHub run-creation data. Do not promise exact 90-minute prearm or zero cohort missingness from GitHub cron alone.
- Original published [Gemini checkpoint](https://github.com/HKcode22/ReplitTranvr/blob/main/data-collection/phase6/checkpoints/2026-11-23_PHASE6_HEARTBEAT_AUTONOMOUS_WORKFLOW_AUDIT.md) records intermediary commit `e4beeb`, whereas the document commit subsequently moved current HEAD to `c8e065`. This audit uses actual live HEAD.

## Why jobs start on their own

1. **GitHub native `schedule: cron`** creates scheduled runs from `.github/workflows/*` and GitHub `push` starts offline CI. A `skipped` collection job during paid STOP OFF is a normal protective outcome, not a charged flight observation.
2. **Existing third-party external cron jobs**, one PRIMARY_BACKSTOP and one ROLLING_ROOT, periodically dispatch the isolated relay's `.github/workflows/external-clock.yml`. The relay workflow itself has **`workflow_dispatch`, `push`, `pull_request` but no `schedule`**. External wake cadence observed ~10–15 minutes. A green relay run may still deliberately defer without invoking target.
3. The PRIMARY_BACKSTOP can execute *scoped due-only production DB deletion*, even when paid GO is OFF. Such a run must not be described as 'read-only with zero database writes in every case'. This specific observed run deleted no rows because no rows were due; code permits bounded due deletion as a compliance safeguard. Provider paid requests remain absent.

## Critical newly confirmed issue — GREEN relay run did not dispatch retention

**Actual relay run [45115494140](https://github.com/HKcode22/TravnrClockRelay/actions/runs/45115494140)** at 2026-11-23 05:04Z, job `target-forward`, ended `success`, but emitted exact result:

```json
{"status":"EXTERNAL_WAKE_PREFLIGHT_DEFERRED_NO_POST","mode":"PRIMARY_BACKSTOP","reason":"HOLD_EXTERNAL_CLOCK_TARGET_MAIN_DRIFT","relayDispatches":0,"providerCallsByRelay":0,"databaseReadsByRelay":0,"databaseWritesByRelay":0,"paidAuthorityGranted":false}
```

Its live environment output explicitly had `TRAVNR_APPROVED_TARGET_MAIN_SHA=b432eb9a5bac7bc3c4537249e75ec7df41e8727c`, while target HEAD was `c8e065d665ccacb6d2575070e94c5500b7583044`. Gemini repinned target-side expiry, POST and some policy values but **did not repin the independent relay-side target SHA**. Thus green relay does NOT equal healthy external retention dispatch after the main change. Target direct rolling would be affected too. Native target primary expiry and an independent *manually dispatched* current-main full retention run passed; this does **not** repair the detached relay's future pulses.

**Narrow necessary nonpaid correction prepared, not executed:** `p6_20261122_fix_stale_external_relay_sha_no_paid_go.sh`, immutable Git blob **`378a67bf117e23e5297913444e8021c7b08ab7ac`**. It confirms authenticated owner and both exact current heads; requires an exact reviewed 3-commit/four-file diff and actual current-main full CI, heartbeat and two retention jobs PASSED; checks existing detached relay modes and no environment-variable shadow; updates **only `HKcode22/TravnrClockRelay` repo variable `TRAVNR_APPROVED_TARGET_MAIN_SHA`** from b432 to c8. Requires direct recovery remain OFF and external rolling remain `DIRECT_VERIFY`; no paid controls, source, provider, DB or cron changes; readbacks effective value, doesn't dispatch. **Owner must run once in Replit Shell, then wait for the next existing external PRIMARY_BACKSTOP relay pulse and inspect a real current-main target ACK.** If it HOLDs, do not blindly retry or bypass.

## Monday existing release commands — source revisions prepared after Gemini

Gemini intentionally changed target `P6_ROLLING_DIRECT_RECOVERY_ENABLED` to **0**, because future `SINCE=2026-11-23T23:45Z` while enabled=1 made heartbeat report `DIRECT_RECOVERY_ACTIVATION_INVALID`. This is a correct standby choice; our original G11/G13 check expected it=1 and would fail. The future after-GO G9 script must set that target variable to **1 only after actual owner GO and after pausing the external rolling lane**.

The old **b432-pinned** release blobs **`24acf96e85b10efd823556975494a6ec4cf90c75`, `9e01e4ece4fbd56634a9ec9c0d68422671e6f410`, `1270e03024d44edfc7fb6757b2642a25c6cd1fa8`** are **SUPERSEDED / DO NOT RUN**. Current corrected **evidence-branch prepared-only** Git blobs:

| Future operator purpose | Current content-addressed Git blob | When |
|---|---|---|
| G11/G12 nonpaid free-account + READ ONLY PG16/expiry, exact current main, relay pin c8 and DIRECT=0 | **`d41d63e032fb8470650f9f719d9a7481f2a2158b`** | Embedded in G13; no repeat required now |
| G13 explicit single-use owner paid GO with fresh checker and four exact repo/protected-env paid STOP scope transitions | **`b4d208e8b02f25cbc065e131cbf1f92fc95a36a4`** | Mon Nov23 21:50Z–strictly before 23:10Z; do NOT run today |
| G9 post-GO direct external recovery setup, owner G13 issue ledger verification, enable target DIRECT=1 under paused relay lane, then route direct and reenable external lane | **`5e89d372c63de784873b8214dd188b351ae34009`** | Only at/after Mon Nov23 23:45Z **after G13 GO**, not now |

All three are **prepared, not run, not live-action-proven**. The owner `gh` authenticated shell still must be used for the detached relay variable repair; GitHub read-only connector does not permit variables mutation. The recovered original G8 protected POST preflight still PASS at old main and the full code-only diff proves worker code unchanged, but GitHub secrets are write-only, so this does not constitute a complete new-head protected actor value readback. First real protected admission, SOURCE charge, PRE and POST remain future operational acceptance, not scientific artifact rework. The green heartbeat is not a paid launch certificate.

## Release disposition

- Frozen 31-day scientific program unchanged: **6,144 intended observations**, **36,740 reserved REST API units**, planned peak **1,280/day** under **1,900/day** hard cap, separate protective **1,000 Alert-credit floor**, independent V0108/full-retention already installed.
- Live paid GO **NOT ISSUED**; keep effective paid flags **0** at repository and protected environment. The Saturday/Sunday nonpaid runs show this standing guard; no evidence of paid SOURCE.
- The urgent actionable fix is **one detached relay target SHA repin**. Await a real successful next cron-driven external primary target ACK; not enough that relay GitHub job is green.
- Scheduled Monday operator GO and after-GO activation remain separate. Because native GitHub schedules show hundreds-of-minutes jitter in observations, **T−90 prearm at 22:15Z is a risk to monitor**, not something CI proves guaranteed. The existing direct route starts after the first approved SOURCE epoch and cannot retroactively prove earlier prearm.
- No new schema/provider/horizons, change to actual gate-out label protocol, duplicate cron, optional V0102 commissioning, or new G15. Reuse existing tests and paid source guards. If real owner repair HOLDs, stay fail-closed and diagnose that single scope.
