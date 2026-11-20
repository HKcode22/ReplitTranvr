# Nov 20 — actual storage commissioning and bounded recovery decision

## Owner receipt (actual production, supplied in conversation)
```json
{"status":"P7_INERT_SCHEMA_COMMITTED_AWAIT_SEPARATE_OWNER_READBACK","schemaRoleCount":6,"tables":4,"functions":7,"empty":true,"publicGrants":0,"loginRoles":0,"providerCalls":0,"authorizationEnabled":false,"phase6PaidGo":false}
{"status":"P7_INERT_SCHEMA_INDEPENDENT_READBACK_NO_GO","schemaRoleCount":6,"tables":4,"functions":7,"empty":true,"publicGrants":0,"loginRoles":0,"providerCalls":0,"databaseWrites":0,"phase6PaidGo":false}
```
Storage installation complete; do not repeat. Installed immutable candidate e91536badf97fdf6302fc3db52c1e9e864dfb6c0 had 36/36 CI success. This is not source authorization or live preservation proof.

## Actual changes this session
- PR #925 ba892cd3036cf06e8e103635bbcf2a38670ee067: exclude only source-audit-confirmed ambiguous identity groups from POST preservation, retain the denominator and verify all eligible groups. Unknown outcomes, invalid signatures and write failures remain hard holds. POST and durable-bundle tests passed; latest full suite must finish.
- PR #922 03673f006b549cb1de7872f81dc1940e4a469f15: detached owner helper adds a narrowly scoped expiry-only commissioning step for the two existing NOLOGIN roles. No new signer, no collection arming, no deletion, no schedule enable. Owner execution/readback remains pending. Dedicated helper CI passed; general offline CI pending at checkpoint.
- Found a real relay incompatibility: existing TravnrClockRelay b3a775b4ec7213af796bb8c727b69c3d0feb8bb7 verifies exactly one primary expiry job. Combined candidate currently adds a second job. Proposed isolation of research expiry into its own workflow was not applied because the edit was blocked. Do not merge or repin until the actual compatibility issue is resolved. Do not execute obsolete adoption helpers.

## Recovery, not restart
Existing f.8 section 8.7 and four-HUB amendment permit bounded missingness. Missed/known-failed windows stay recorded, never retrospectively backfill PRE; incomplete crossover pairs are excluded from the paired contrast, not necessarily from the observational dataset. Unknown paid reservation/commit, duplicate charge risk, rights/expiry failure, corrupt evidence or exhausted budget require scoped reconciliation before resume. No claim that automatic production resume is proven. Existing outage accounting and restart custody remain useful. Do not add a new schema to count the same events.

Worst aligned contiguous outage arithmetic using actual day31 envelope, 6144 request opportunities, exact planned-to-hard 60s dispatch window (900s lead less persist and safety margin).
| Outage | Blocked opportunities | Remaining opportunities | Remaining % |
|---|---:|---:|---:|
| 1h |32|6112|99.48|
| 6h |152|5992|97.53|
| 24h |320|5824|94.79|
| 48h |576|5568|90.63|

One entire parent day 3 or 17 = 192 opportunities; 5952 remain. These are design opportunities, not observed flights, coverage or model quality. Test T-6 worst-case 6h/24h/48h outages block 96/128/192 of 384 opportunities, so report split-specific attrition and uncertainty even when global coverage looks high.

## Earlier fallback: prospective Monday Nov 23, 15:45 PST SOURCE
No actual restage or authorization in this checkpoint. Preserve today's Nov20 schedule until decision. Sunday Nov22 uniform +2 is also a geometrically feasible earlier fallback candidate. Monday +3 days except parent days 5,6,7 move one additional day. First service Nov25 00Z. Final service Dec27 04Z, tail Dec29 04Z. All 31 parent days, 6144 opportunities, four slots, shapes, pair IDs, airport assignments, treatment assignment, 20/5/6 splits, within-pair weekday matching and known repeated-airport >=24h end-to-start washout retained. Exactly one weekend pair remains. **Changes:** pair1 changes weekend to weekday in both periods; pair4 changes weekday to weekend in both periods. This is a substantive prospective revision, not a claim of identical original calendar assignment. Requires exact review before first observations, existing disabled-state comparison and recomputed calendar/config/cost/policy hashes. Original random treatment assignment must not be redrawn using outcomes. Do not silently reuse current one-day-only restage writer. 37 charge dates; same 36740 total and 1280 peak allocation. Candidate geometry only, not actual capacity or quota sufficiency; recompute reset-boundary budget and review holiday effects.
Candidate 31 starts UTC:
1. 2026-11-25T00:00:00Z
2. 2026-11-26T04:00:00Z
3. 2026-11-27T08:00:00Z
4. 2026-11-28T12:00:00Z
5. 2026-11-30T16:00:00Z
6. 2026-12-01T20:00:00Z
7. 2026-12-02T00:00:00Z
8. 2026-12-03T04:00:00Z
9. 2026-12-04T08:00:00Z
10. 2026-12-05T12:00:00Z
11. 2026-12-07T16:00:00Z
12. 2026-12-08T20:00:00Z
13. 2026-12-09T00:00:00Z
14. 2026-12-10T04:00:00Z
15. 2026-12-11T08:00:00Z
16. 2026-12-12T12:00:00Z
17. 2026-12-13T16:00:00Z
18. 2026-12-14T20:00:00Z
19. 2026-12-15T00:00:00Z
20. 2026-12-16T04:00:00Z
21. 2026-12-17T08:00:00Z
22. 2026-12-18T12:00:00Z
23. 2026-12-19T16:00:00Z
24. 2026-12-20T20:00:00Z
25. 2026-12-21T00:00:00Z
26. 2026-12-22T04:00:00Z
27. 2026-12-23T08:00:00Z
28. 2026-12-24T12:00:00Z
29. 2026-12-25T16:00:00Z
30. 2026-12-26T20:00:00Z
31. 2026-12-27T00:00:00Z

## Rights and remaining critical path
Existing #904 bounded published-terms determination remains applicable. Legacy RapidAPI Team Ultra ($32 owner-reported; 60k entitlement, 50k operating ceiling) is already known; do not repeat account discovery. Current terms effective Nov7 for existing subscribers (https://aerodatabox.com/2026-09-terms-update and https://aerodatabox.com/terms). No substantive support reply as of current thread read. Do not mistake permission for bounded collection for permission to keep exact linked provider records throughout study and evaluation. Extended-cache entitlement could simplify retention; current published RapidAPI Mega is a different paid plan; no purchase or plan change made. Verify written scope, ongoing subscription conditions, actual price, training/evaluation purpose before relying on it. Preserve canonical features and Amendment E target; no fabricated independent evidence or proxy gate-out labels.
Remaining: genuine PRE evidence path / protected field proof; POST independent review producer and runtime consumer (currently unconfigured); expiry actors, actual scheduler and independent readback; relay compatibility and exact adoption; final six recovered policy inputs assembled against genuine release evidence (not recollect inputs); SOURCE authorization/readback; no-paid autonomous rehearsal. Do not add gates unrelated to these dependencies. Paid GO remains false. No provider calls or production mutations by this continuation beyond supplied owner storage receipt.
