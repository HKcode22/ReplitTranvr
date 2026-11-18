# Phase 5 — explicit STOP owner setup and final release ordering (2026-11-17 PST)

State: PREPARED, NOT EXECUTED IN PRODUCTION. Phase 6 remains NO-GO.
Main inspected: 6f518add10d00567a95fbcaf3650ebf608da8a60.
The existing 13 database credential names, six generated signing keys / seven aliases, V0105 commissioning, 31 day plans and the 2,180-file manifest review candidate are not repeated.

## Newly prepared operation

The adjacent p5_stage_stop_switches_once.sh initializes only four explicit STOP switch secrets, required because an absent value is not the exact literal 0 required by the inert stage workflow. It is owner-local; does not alter deployed code or start a workflow; does not upload keys, grant rights, approve science or enable collection. It checks exact current main and absent names/approval context before writes and between them. It does not overwrite existing switch names. GitHub names-only readback does not prove plaintext independently. If a write is uncertain or main/context changes, stop and inspect, never automatically replay. Coordinate against other owner sessions; GitHub provides no atomic compare-and-set across the four secrets.

Expected writes: V39_PHASE6_PROCESS_ARMED=0, P5_CD_GH_PRE_STOP=1, P5_CD_GH_PRE_ARMED=0, P5_CD_GH_PREPARE_ARMED=0. Existing primary-retention cleanup is not modified.

Exact Git blob 8046621fc88afa631356f462833f1d4eeaa100bf; SHA256 75e9b57f1f3be30e0fbd6622499029a1ff77fac6678f1dd2d62b08220a9d8dd4.
Native bash syntax PASS. Local mocked gh CLI regression: 11/11 pass (review, exact negative-only writes, existing switch, approval present, signer present, main moved before/midway, unknown write, final name readback failure, name-list failure, invalid mode). Timeout adjusted for mock subprocess startup. No production secret writes or live workflow dispatch made by this test. Owner applies once using the immutable verified blob and apply-explicit-stop-only. Keep this branch off main to preserve the reviewed main pin.

## Remaining release boundary

The previous candidate manifest is A VERIFIED REVIEW CANDIDATE, not approved release bytes. The current exporter produces scientificFreezeApproved=false, configCandidateSha256, and no affirmative source rights. Existing activation requires the approved manifest's exact raw bytes with scientificFreezeApproved=true, sourceRightsApproved=true, phase6PaidGo=false, calendarRowsSha256 and configSha256 matching stage. Its SHA and final config SHA must be rebound to the actual reviewed inputs; do not reuse the candidate digest or simply flip booleans. The actual scoped approval ledger still has 12 evidence entries and zero approvals.

Continue with existing machinery, no additional architecture:
1. Document genuine account-specific rights sufficient for the linked record-level study and analysis (36d4h15m plus analysis); resolve field retention and backup/PITR policy and independent scientific/operational/custody review. Keep actual cutoff and label qualification rules.
2. Build the genuinely accepted final configuration/manifest and exact policies, bind reviewed hashes and seven cost categories. Check exact committed calendar parity using existing exporter, not an unnecessary regeneration. Only install the approved missing release configuration and key aliases. Never treat candidate material as approval.
3. Existing phase5-exact-inert-release-stage-manual.yml: B0062 calendar-only disabled stage + exact readback, then V0093 seven-category cost stage + independent exact readback. Both separate and nonprovider. Existing scoped roles reused.
4. Existing manifest storage helper blob 751abca9d622d6a3ac49fdf37356f9af6eca436a, prior issue #413 comment 6916187787: requires exact disabled stage, genuine approved AUTH, owner session, current clean main; one insert into existing clean.adb_collection_meta, fresh readback. Its CLI/production DB behavior remains untested in this session. It is NOT a reason to add another writer.
5. Existing v39_phase6_enable_source_owner_v39.ts: separately authorized activation only after all prior evidence and actual prospective time guard. No automatically issued GO.

Fresh main Actions observations: append-only DB clock run 44227919466 and daily prep 44223749183 skipped as expected while disabled. Heartbeat run 44214172996 failed on schedule gap, not evidence of a data deletion breach. Existing scheduled primary expiry 44203569232 and sentinel 44195191237 succeeded at observation. Do not hide the schedule risk or treat all workflow history as green.
No new migrations, provider calls, purchases, collection, DB writes, email sending or activation.
