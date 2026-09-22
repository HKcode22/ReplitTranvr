# Tuesday 2026-09-22 — WSSS Validation Readiness Runbook

> Target Stage-1 start class: weekday, 12:00 UTC ±1 hour.
> Tuesday allowed start window: 11:00–13:00 UTC = 04:00–06:00 PDT.
> Preferred start: approximately 11:00 UTC / 04:00 PDT.
> This is a validation run under the compact-6 amendment, not a replay of P2G06.

## Hard NO-GO until every item below is complete

### Code/evidence
- [ ] migration 0058 applied
- [ ] append-only Phase-2G reconciliation evidence table exists
- [ ] callback request/success/failure counters available
- [ ] evidence persisted before transient cleanup
- [ ] true mismatch cleans exact-session raw objects only after evidence write
- [ ] external settled spend used as Stage-1 yield denominator
- [ ] any positive delivery gap is durably recorded and terminal before scoring
- [ ] compact-6 owner sequencing active
- [ ] exactly one post-P2G06 WSSS validation run allowed
- [ ] compact amendment SHA bound into runtime and AUTH scope
- [ ] new tests PASS
- [ ] previous Phase-2G regression tests PASS
- [ ] `npx tsc --noEmit` PASS

### Historical P2G06 closure
- [ ] reconstruction evidence recorded in GitHub
- [ ] P2G06 raw blobs exact-session cleaned and deletion-verified
- [ ] P2G06 budget day terminally adjudicated
- [ ] reconciliation incident formally resolved only after reconstruction/cleanup
- [ ] historical probe row remains failed/MISMATCH

### Final runtime
- [ ] local branch at exact intended final Git HEAD
- [ ] protected source tree clean
- [ ] workspace server started on final HEAD using an explicitly labeled owner mode: preferred `replit-managed-project`; if the Replit Run UI is unavailable, guarded fallback `phase2g-detached-npm-run-dev`
- [ ] runtime health PASS, exact HEAD, and truthful `runtime_owner_mode` contract
- [ ] public callback synthetic verification PASS
- [ ] zero open incidents
- [ ] zero active probes
- [ ] zero transient probe runtime rows
- [ ] zero live stale P2G06 raw blobs
- [ ] zero active foreign billable subscriptions
- [ ] provider balance has sufficient headroom

### Workspace-server ownership correction

The final readiness audit found that the health route previously hard-coded `managed_replit_workflow=true`, even when the temporary Tuesday helper had restored the same `npm run dev` command in a detached shell because the Replit UI exposed no Stop/Run control. That wording was semantically inaccurate.

The corrected contract now requires an explicit owner label:
- `replit-managed-project` — only when the `.replit` Project workflow sets the owner-mode environment variable;
- `phase2g-detached-npm-run-dev` — guarded fallback when the UI workflow control is unavailable.

An unlabeled/manual server fails the workspace health contract. The fallback does not weaken paid safety: preflight, final launcher, and supervisor watchdog all require the explicit owner contract, exact Git HEAD, exact callback JSON contract, and public callback reachability. The detached fallback is not claimed to have Replit workflow auto-restart semantics; loss of callback still triggers the Stage-1 supervisor's fail-closed callback watchdog and exact-session recovery.
### Frozen fresh Tuesday identifiers

The guarded helper now prepares the fresh validation chain with:
- runtime/budget ID: `P2G-S1-20260922-06`;
- AUTH ID: `AUTH-20260922-P2G07`;
- AUTH start: `2026-09-22T11:00:00Z` (04:00 PDT);
- AUTH expiry: `2026-09-22T15:00:00Z`;
- Stage-1 reservation: 450 Alert credits;
- frozen unsettled-burst margin: 50 Alert credits;
- AUTH ceiling: 500 Alert credits;
- `min_stability_buckets=6`;
- expected Stage-1 candidate: WSSS.

The helper has no paid-launch mode. AUTH approval still requires explicit review of the generated artifact SHA, and the final provider-read preflight refuses to run more than 30 minutes before AUTH start.

### Fresh Tuesday authorization
- [ ] new budget-day ID
- [ ] fresh runtime artifact; never reuse P2G06 runtime
- [ ] runtime includes compact amendment SHA
- [ ] fresh AUTH; never reuse P2G06 AUTH
- [ ] AUTH starts no earlier than 11:00 UTC
- [ ] AUTH covers 120-minute target + cleanup buffer
- [ ] fresh paid preflight
- [ ] preflight status exactly `PASS_READY_FOR_PAID_STAGE1`
- [ ] blockers=[]
- [ ] owner next candidate exactly WSSS

## Optional overnight guarded execution

If the operator needs to sleep, `scripts/v39_phase2g_overnight_wsss_guard_v39.sh` may be explicitly armed before the window. It is an execution convenience around the same frozen runtime/AUTH/preflight/launcher contracts; it does not alter the scientific protocol.

Binding overnight safety behavior:
- explicit final Git HEAD must be supplied and match at arm time and again before preflight/launch;
- early and final preflights are provider read-only;
- paid launch is permitted only on an exact fresh `PASS_READY_FOR_PAID_STAGE1`, empty blockers, WSSS next-candidate binding, exact callback contract, exact artifact hashes, and current source tree;
- at most one paid launch is attempted;
- there is no automatic paid retry under any failure state;
- after launch, the existing persistent supervisor remains authoritative for callback watchdog/fail-closed recovery;
- the overnight guard performs read-only health checks and records `BLOCKED_DO_NOT_RELAUNCH` on uncertainty;
- the guard refuses to launch at or after `2026-09-22T12:55:00Z`, preserving the 120-minute target plus 5-minute cleanup buffer before AUTH expiry.
## Tuesday prospective acceptance states

### MATCH
External settled credits equal received internal credits exactly, with zero explicit cost/item disagreements. Under the current frozen rule, this is the only reconciliation state eligible for a completed/scored probe.

### DELIVERY_GAP
A positive settled external-minus-received gap is preserved as its own durable diagnostic state rather than hidden inside a generic mismatch. Under the current frozen rule it is **terminal and non-scoreable** even when provider SEND billing plausibly explains it.

- persist external spend, internal received credits, exact gap, completeness, callback counters, and settlement evidence;
- perform exact-session cleanup only after the durable receipt exists;
- mark the probe failed/non-promotion-valid;
- do not auto-relaunch WSSS.

Any future nonzero production tolerance would require a separate, pre-outcome MEASURE → FREEZE amendment and may not be calibrated from P2G06 or Tuesday's validation result.

### MISMATCH / UNRESOLVED
Fail closed. Do not auto-relaunch WSSS.

## After WSSS

If WSSS completes:
- preserve reconciliation evidence;
- verify cleanup;
- close the Tuesday budget day;
- record final WSSS metrics;
- compact sequencing then moves past WSSS/OMAA toward MMUN.

If WSSS fails:
- no automatic fourth WSSS run;
- preserve exact diagnostic evidence;
- stop and adjudicate before any MMUN launch.


## P2G07 provider-502 recovery freeze — 2026-09-22

P2G07/probe 5 failed before the 120-minute target because the provider returned HTTP 502 during the live balance-read/delete path. The exact subscription remained active after the child exited until an exact-ID operator deletion was verified. P2G07 remains failed/UNRESOLVED and is excluded from scoring.

A separate prospective recovery supplement is now frozen at:
`SEPmd/phase2g/amendments/2026-09-22_P2G07_PROVIDER502_RECOVERY_AMENDMENT.md`

Machine-readable binding:
`artifacts/phase2g-compact6-p2g07-provider502-recovery-freeze-20260922.json`

Exactly one recovery WSSS attempt is permitted only after P2G07 reconstruction, raw cleanup, incident/budget adjudication, hardened-source tests, a fresh runtime/budget `P2G-S1-20260922-07`, and fresh AUTH `AUTH-20260922-P2G08`. No outcome/yield metric from P2G07 is a reason for the retry. The scientific target, time class, reconciliation rule, and credit ceiling remain unchanged.
