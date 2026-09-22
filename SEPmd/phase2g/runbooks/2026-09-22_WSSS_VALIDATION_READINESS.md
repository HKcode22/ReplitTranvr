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
- [ ] delivery gap increases ambiguity upper bound
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
- [ ] managed Replit Project restarted once on final HEAD
- [ ] runtime health PASS and exact HEAD
- [ ] public callback synthetic verification PASS
- [ ] zero open incidents
- [ ] zero active probes
- [ ] zero transient probe runtime rows
- [ ] zero live stale P2G06 raw blobs
- [ ] zero active foreign billable subscriptions
- [ ] provider balance has sufficient headroom

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

## Tuesday prospective acceptance states

### MATCH
External settled credits equal received internal credits exactly.

### DELIVERY_GAP
May complete only when:
- external > internal;
- received/external >= 0.99;
- explicit cost/item disagreements = 0;
- settlement resolved;
- callback/provider ownership guards pass;
- cleanup verified.

The provider external total remains the denominator.

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
