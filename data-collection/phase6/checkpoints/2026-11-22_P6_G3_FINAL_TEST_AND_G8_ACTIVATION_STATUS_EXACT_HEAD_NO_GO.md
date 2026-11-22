# Phase 6 — Gate 3 exact target/relay CI complete; Gate 8 paid GO not granted

**Observed:** 2026-11-22 UTC. **Scope:** fixed eight gates only. This is an evidence checkpoint, not a new gate, production deployment, owner permission request, paid request, or assertion of future retention SLAs.

## Fixed gate register

| Gate | State at this checkpoint | Do not replay |
| --- | --- | --- |
| G1 independent PRE | CLOSED under prior bounded commissioning and honest conditional measurement acceptance | No actor/secret re-creation |
| G2 independent POST | CLOSED for actual-only/censored conditional Amendment E, not numerical label-yield certification | No substitute revised/runway/ADS-B gate-out labels |
| G3 retention | OPEN: precise metadata/source distinction regression GREEN; coordinated deployment and source-bearing terminal-disposition/physical deadline guarantee not proven | No arbitrary early DELETE or hard-deadline waiver |
| G4 reviewed main | CLOSED at prior production main `fe3fef5dbddc3577d585f778385677979031cd64`; successor requires its own exact review/repin | No stage/authorization replay |
| G5 calendar/budget | CLOSED: 31 days; 6,144 opportunities; 36,740 units; maximum 1,280 per UTC day | No new schedule/sampling geometry |
| G6 protected policy | CLOSED for prior exact main; successor runtime bind is release deployment, not re-opening commissioning | No key rotation |
| G7 autonomous scheduling | CLOSED at prior bounded nonpaid acceptance; external cron jobs/renewal commissioned | No cron commissioning replay |
| G8 paid | SOURCE transition and independent readback completed in prior actual owner receipt (2026-11-22T06:11Z); **separate paid GO remains OPEN** | No SOURCE repeat or implicit paid authorization |

## Executed candidate work and actual verification

1. **Target** [PR #963](https://github.com/HKcode22/ReplitTranvr/pull/963), exact code head `c60851bc29259b340f8bd4a082cad37612fa7b05`, **10/10 PR-triggered workflows completed successfully** including [actual disposable PostgreSQL 16 P5 POST suite 45002539868](https://github.com/HKcode22/ReplitTranvr/actions/runs/45002539868) and [full V3.9 Offline Safety 45002539836](https://github.com/HKcode22/ReplitTranvr/actions/runs/45002539836). Both are code/CI verification, not live production function installation. New `phase7_private_signed_review_transport_v39.test.ts` regression authenticates restricted reader/publisher/expiry actors in disposable PG16; five genuinely due neighboring records are deleted while future-signed source-bearing `SOURCE_QUERY_PACKET` and non-null source-bearing signed POST review remain byte-identical, and restricted source-deadline pressure is counted without exposing payloads. Two hard-due records at the same locked sweep cutoff yield `hardDueAtSweep:2` and are **not** allowed to masquerade as on-time source deletion.
2. **Relay** [PR #25](https://github.com/HKcode22/TravnrClockRelay/pull/25), exact new test head `9fbde4c0ffc1bde28e809b575b83530ff93738bd`, [CI workflow 45004203068](https://github.com/HKcode22/TravnrClockRelay/actions/runs/45004203068) **SUCCESS**. Original relay correction accepts only independently verified *metadata-only* populated cleanup with zero hard due at the sweep cutoff, matching aggregate counts and clock/commit receipts. The added regression tests a second legitimate short-lived metadata row becoming due between first census and locked sweep: success is allowed when `packets>before.duePackets` **only** alongside zero `hardDueAtSweep`, independent committed readback and zero residual; forged nonzero hard due, counts, or unverified batch are refused.
3. Both PRs remain **DRAFT, OPEN, UNMERGED**. Existing main SHA and production policies, chronology, cron credentials, SOURCE enabled state and paid flags were not changed in these code/test/checkpoint reviews.

## Existing lawful retention margin — do not inflate

The Nov 22 bounded retention decision documents five existing 96-hour private policy **maxima** versus ordinary 168-hour published provider Contents cap: *up to* a nominal 72h gap for fresh content. It is not proof of actual per-object acquisition clock, all packet deadlines, or a provider-wide stronger caching plan. V0107 primary FIDS is separately designed at 23h eligibility versus 24h hard; recovery-only PITR 168h and historic 65/65 absence have earlier owner evidence. Shorter signed packet `retention_not_after_utc` and inherited source age still control. V0108's private packet/index sweep is **due-only**; successful on-time cleanup cannot be inferred from a sweep performed at or after the same signed cutoff. Neither code CI nor bounded source-use rights approve arbitrary early deletion of still-live PRE/POST, changing Amendment E, or source reuse after a signed expiry.

## Remaining two-gate execution, without expansion

- **Gate 3 source-bearing early retirement:** obtain a trustworthy per-object identity-bound original lawful cap and final-consumer/epoch settlement (or explicit independent review establishing that the specific content is project-generated non-provider metadata with proven bounded form). Delete only when all active PRE/POST/index/replay uses are finished, with positive execution margin before the applicable *hard* retention cap. If actual expiry arrives first, preserve STOP/quarantine and no paid continuation. Do not infer terminal disposition from a field named `kind` or from the 96h global maximum. Exercise populated PostgreSQL and adversarial unknown/late/foreign/head cases. Existing metadata-only success and protected relay tests need not be repeated.
- **Gate 3 coordinated release:** review exact target and relay candidates as a pair; merge and repin only after remaining source-bearing policy is defensibly resolved. Verify exact-main body/role/ACL, target-to-relay receipts and any lawful production populated readback. Prior protected owner configuration applies to its old SHA and cannot silently attest new main.
- **Gate 8:** after Gate 3 release, perform distinct scoped paid GO and `rollingPaidPolicyUntilPresent` fix through the existing paid activation path. The actual SOURCE transition and cron renewal commissioning must **not** run again. Initial paid provider calls/first flight receipt are post-GO observational evidence only, not authorization.

**Disposition:** 6 fixed gates closed; G3 OPEN, G8 paid GO OPEN. Exact new target and relay CI green, no test failures. No new paid call, production DB write/delete, source enable, cron mutation, PR merge or policy edit in this continuation.
