# 2026-11-08 — Phase5 signed receiver incident refusal: preserve once-marker, read facts first

## Observed owner result

The owner executed PR #490 one-shot synthetic receiver launcher Git blob `e95a9d983e05d105b0cd82d5ae35fadc54d6a745`. Exact source preflight passed, but the TypeScript runner returned `REFUSED:OPEN_INCIDENTS:2:UNRELATED_OR_MULTIPLE_OPEN_INCIDENTS`, `provider_called=false`, `provider_subscription_created=false`, `alert_credits_spent=0`. The attempt marker remains in `artifacts/phase5-synthetic-signed-post-a2d75104-once.lock/`.

**Verified source behavior:** `scripts/v39_phase2g_verify_live_callback_v39.ts` checks the two unresolved `clean.adb_incident_stop` rows before sending even a wrong-secret HTTP POST, arming the disposable synthetic session, posting a signed notification, or creating a raw blob. `assessIncident30ZeroProviderSmokeV39` permits exactly one independently evidenced historical incident #30, not two. Thus the attempt **never reached a signed POST** and cannot prove raw-original-before-2xx, persistence, ACK, cleanup or scientific acceptance.

## One non-mutating owner readback

`scripts/phase5_synthetic_incident_runtime_readonly_owner.sh` uses the existing Replit `V39_DATABASE_RUNTIME_URL` with `BEGIN READ ONLY`, validates `neondb` primary, counts unresolved incident and active/settling probe rows, then prints up to 25 incident IDs, timestamps, restricted cause/kind/reason/mode and known historical-error classes. It does not print full `detail` JSON or secrets. It checks whether the old once marker exists without altering it. It makes **zero** paid/provider/POST calls, database mutations, Git changes, incident resolutions or object-store deletions.

The output will identify which historical/current safety cases require attention. There is **no authority to retry from this readback alone**. Reconcile genuine incidents using independent evidence, or if appropriate design a separately reviewed and scoped synthetic-only admission that never opens the paid Phase6 route. Never blanket-update `resolved=true`, delete a marker, erase probe18/incident30 or rerun PR #490.

## Continue the main Phase5 critical path

Finish honest source-use/retention + first-cycle target, anchor qualification, prospective 31-batch-day calendar and seven-category REST/Alert budget, unattended GitHub draw→SOURCE→three PRE/witness→POST/STOP/daily QA, and independent final scientific FREEZE. V0079–V0083 are installed; hosted V2 source PIN is independently observed. No AeroDataBox email response is needed to continue nonpaid engineering. **Phase5 scientific FREEZE HOLD; Phase6 paid GO NO.**
