# Phase 4 Gate 5 — Nov 2 T−6h silence, bounded body timeout repair (review branch; not active deployment)

**Observation boundary:** 2026-11-02 approximately 03:20 PST. Binding authority remains `data-collection/plans/V3.9_DataCollectPlan_f.8.md` §§5–7, 10.2, 16–17; the original `data-collection/implementation/V3.9_IMPLEMENTATION_LOG.md` is hash-locked and unchanged. This is an additive incident handoff, not a new scientific protocol or paid authorization.

## Proven GitHub facts

- Real paid source-only/nonretained Nov 2 WSSS T−6h recovery: [GitHub Actions run #41402736335](https://github.com/HKcode22/ReplitTranvr/actions/runs/41402736335), `owner-t6` job `125137897353`, source step in progress. Owner's independently pasted prearm log proves job started at `2026-11-02T06:53:06Z`, own prearm verified `06:53:26.022Z`; manifest digest `aa9a9be29cf9778d3fcaef7b7f08a482d6a5307623453515d7022c62da723136`.
- T−6h planned physical GETs `2026-11-02T10:30Z`, `11:00Z`, `11:30Z` (02:30/03:00/03:30 PST), latest admissible start +15min. GitHub live steps alone do **not** prove any paid GET occurred; an in-progress GitHub job log fetch returned `404 BlobNotFound`. Real provider attempts, per-slot outcomes, and billing are UNKNOWN until independent receipts.
- Separate [free one-time account diagnostic #41434219025](https://github.com/HKcode22/ReplitTranvr/actions/runs/41434219025), launched by merged PR #331, completed SUCCESS with HTTP 200, 910 ms, provider Date and valid quota headers, at least 100 REST units remaining at `11:07:22Z`. This proves a *separate* free endpoint response was available then; not that T−6h's original free check or its paid FIDS GETs completed.
- Historical T−24h 3/3 successful FIDS source queries/6 measured REST units remain immutable; not reproducible by re-running after its cutoff.
- Separate original T−90m schedule remains `17 11 2 11 *` (11:17Z Nov 2). A missed event cannot be inferred before 11:17Z or during the documented grace; reviewed [draft PR #330](https://github.com/HKcode22/ReplitTranvr/pull/330) is **standby only**. Original scheduled or queued owner must take precedence; no standby merge absent independent non-duplication proof after 11:27Z.

## Reproduced by static code inspection: unbounded free balance BODY wait

In current production `server/lib/disruption/aerodataboxLimiter_v3.ts`, `fetchWithAdbTimeout` creates a 15s timer only around `await fetch(...)` until HTTP headers, then clears that timer; the separate `getBalanceEvidenceStrict()` later calls `readJsonOrNull(resp)`. If headers arrive but the body stalls, this original path can block a source slot past its cutoff and possibly the rest of the one-process horizon. That is a confirmed structural timeout *vulnerability*; **not verified as the actual live T−6h hang** without the completed log or process telemetry.

[Draft PR #332](https://github.com/HKcode22/ReplitTranvr/pull/332) fixes that specific path: create a caller-owned `AbortSignal.timeout(15000)` and pass it through the free `throttledFetch` so the signal remains active during the body read. This review branch also classifies a signal-aborted body as `BALANCE_UNAVAILABLE: transport failure` and emits a redacted nonpaid diagnostic. Existing `readJsonOrNull` suppresses a body read exception; this explicit test ensures a timeout isn't mislabeled as just malformed JSON. The bound permits existing free read-only retry policy but makes no new paid FIDS attempt, source backfill, subscription or database write.

- Fix is on **draft, unmerged code**; original T−6h job pinned to prior SHA and is not cured retroactively.
- Preserve existing T−90m event while its original scheduled job may still exist. Do not merge source/runtime edits midcampaign unless a separately reviewed risk decision justifies changing new job SHA. Tests/CI and GitHub merge status are separate evidence.
- Live paid script intentionally logs only aggregate counters, no flight records, IDs, raw bodies, database or per-flight timestamps; this does not implement scientific Gate 5.
- The next cohort should avoid opaque multi-hour single script steps: expose a distinct bounded GitHub step or completed evidence receipt per pre-frozen physical slot, with immutable attempt identity and unknown-on-transport status. Never put credentials in logs or add provider replays.

## Actual Gate 5 redo work remains

A true new prospective Gate 5 must freeze an independent reviewed cohort with enough lead for all three horizons, licensed original/source-content custody with technical+legal expiry, first independently proven provider-native `selected_t_milestone`, confirmed operating-leg denominator, versioned as-of PRE persistence, reconciled inside/outside callbacks, actual-only wheels-off label semantics, and independent postflight cohort-scoped read-only audit. See [issue #293](https://github.com/HKcode22/ReplitTranvr/issues/293) and [issue #200](https://github.com/HKcode22/ReplitTranvr/issues/200). An ephemeral nine-GET source inventory is valuable but *cannot* make those missing prerequisites PASS. Unknown/unobserved remains null; do not substitute zero.

**Safety status:** Strict scientific Gate 5 HOLD; Phase 5 FREEZE HOLD; Phase 6 NO-GO. No current paid duplicate, manual timed Replit operation or source regeneration authorized by this checkpoint. Branch-only engineering repair; test and inspect before merge.
