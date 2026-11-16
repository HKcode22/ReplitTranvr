# Nov 16 — actual timing completed; exact commissioning readback

## Existing prearmed clock experiment finished

Owner dispatched #835 after six successful CI checks. [Run 43832469501](https://github.com/HKcode22/ReplitTranvr/actions/runs/43832469501), exact main bb7b6d12f194cdf4c4379be41d2cab5ecc84934a, root created 08:35:31Z. Both predeclared waves finished with all eight successful independent GitHub job logs:

| Wave/slot | Job ID | Root-to-ready ms | Release slip ms |
|---|---:|---:|---:|
| 1/1 | 133180843973 | 43522 | 7 |
| 1/2 | 133180844012 | 70132 | 5 |
| 1/3 | 133180843608 | 42182 | 3 |
| 1/4 | 133180844213 | 39115 | 5 |
| 2/1 | 133180844160 | 44625 | 5 |
| 2/2 | 133180844227 | 41399 | 3 |
| 2/3 | 133180843857 | 38114 | 6 |
| 2/4 | 133180844088 | 38454 | 5 |

All statuses OBSERVED_READY_AND_TIMELY_NO_PROVIDER. Wave targets 08:50:30Z and 09:05:30Z, no target adjustment. Eight runners started together, own disposable PG16s, maximum DB clock read 2ms per runner, provider calls zero and production DB writes zero per receipt. This closes this specific timing rehearsal; no rerun. It does not certify cron availability, production DB, paid provider latency, child dispatch throughput or month-long SLA. #836 budget correction six exact-head CI passed, merged bc4cba7437bf3b6f6cd4cb75e13f21da1786c8b6. Original 31-day seed/REST caps preserved; actual joint budget review still needed.

## Existing commissioning path completed at source level

Independent #619 poststage auditor already compares the 31 calendar rows, cycle/day REST cap and seven-category rows. It previously did not compare the persisted Alert safety values, daily hard cap and schema version against B0062's actual insert. Extend that existing auditor to compare all eleven frozen safety fields plus 1900 daily cap, singleton, v39 marker; reject NULL as a numeric zero; require readback actor distinct from both writers. No new tables, roles, provider or production mutations. Extend the existing V0093 disposable PG16 test to exercise altered Alert cap, NULL tolerance, changed marker, distinct actor and readback-owner admission.

Existing manual stage entry point now has an owner-local readback mode; it operates only after both actual stages commit, with original canonical stage packet and independently reviewed SHA values. In an exact reviewed detached main checkout with already installed dependencies, use:
```bash
env -u AERODATABOX_API_KEY -u AERODATABOX_WEBHOOK_SECRET -u RAPIDAPI_KEY \
 ADB_AUTO_COLLECT=0 V39_PHASE6_PROCESS_ARMED=0 V39_PHASE6_OWNER_APPROVED=0 \
 V39_P5_APPROVED_CODE_SHA="$(git rev-parse HEAD)" \
 node scripts/v39_phase6_inert_release_stage_manual_v39.mjs --readback \
 /private/unsigned-stage-input.json <independently-reviewed-stage-sha> <independently-reviewed-cost-sha>
```
Use existing owner DATABASE_URL only; exact remote main before/after; requires live neondb TLS and owner-side separate actor; fresh read-only transaction and no provider credentials. This is a comparison, not a signature or rights verification. No actual stage rows or live readback in this patch. Do not run against empty production or regenerate input to fit live DB. Expected 31/47/329 for this actual first seed. If code changes after staging, the exact main binding intentionally holds; review the staged identity instead of overwriting.

## Separate activation boundary

B0062 deliberately writes disabled authorization with schema_version v39. Older paid Alert starter scripts/v39_phase6_start_owner_v39.ts expects 0047 and a live safety heartbeat; legacy safety watchdog reads only enabled authorization. Do not invoke that older starter as substitute for exact C+D release, change schema_version to please it, or run generic UPDATE enabled=true. Review exact current source and Alert route dependencies and establish explicit activation/STOP sequence before any paid collection. Actual source use/retention and physical actual-only gate-out label remain unresolved. No new autonomous controller or optional V0102. Current Phase5 scientific freeze HOLD; paid Phase6 NO-GO.
