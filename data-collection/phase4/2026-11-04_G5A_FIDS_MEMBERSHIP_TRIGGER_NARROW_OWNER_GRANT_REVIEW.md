# Gate 5 — reviewed narrow writer fix for FIDS membership trigger

**November 4, 2026. Prepared source; NOT installed by this PR.** This is a correction to the restricted GitHub source-writer's database privileges, not a flight-data collection, subscription change, V0076/V0077/V0078 migration, SQL backfill, response replay or scientific Gate5 verdict.

## Why it is needed

The real Nov4 T24 owner made three irreversible V0076 reservations and produced zero V0077 originals or PRE. Its pre-PR388 log redacted all downstream errors. B0062's `clean.flight_population` FIDS AFTER INSERT `trg_flight_population_research_membership` runs `clean.ensure_population_research_membership()` as invoker and attempts an insert into `clean.population_research_membership ... ON CONFLICT(population_member_id) DO NOTHING`. The dedicated owner role was initially provisioned with just eight direct tables and omitted this trigger dependency.

The isolated PG16 no-provider proof PR #390 reproduced **SQLSTATE 42501** and 0/0 saved rows with no membership privilege, then 42501 under INSERT-only, then an actual saved normalized row and one membership row with **INSERT ON clean.population_research_membership + SELECT(population_member_id) ON clean.population_research_membership**, without table-wide SELECT/UPDATE/DELETE. This shows a minimum viable privilege path in disposable B0062 only. The independent exact protected GitHub role audit PR #389 is responsible for verifying whether this defect is live in production. Do not infer provider responses or billing from the test.

## Installation discipline — separate owner operation only

The reviewed `scripts/v39_phase4_gate5_membership_owner_narrow_grant_once.ts` accepts only (1) an explicitly operator-supplied reviewed MAIN SHA matching local checkout; (2) `P4_G5_MEMBERSHIP_OWNER_GRANT_INTENT=ONE_REVIEWED_G5A_MEMBERSHIP_INSERT_AND_KEY_SELECT`; (3) `ADB_AUTO_COLLECT=0` and `V39_PHASE6_PROCESS_ARMED=0`; (4) separate privileged and restricted-runtime DB URLs, verified same database; (5) exact **existing** `p4_g5_g5a_owner_20261103` restricted unexpired role, existing B0062 invoker trigger, existing no membership privileges and ability to INSERT population. An exact one-shot `SERIALIZABLE` transaction with advisory lock grants exactly two privileges and verifies table-wide SELECT/UPDATE/DELETE remain false. An ambiguous COMMIT refuses any blind retry. No new role, password, GitHub secret, generalized GRANT or automatic database write from CI. Existing V0076 paid reservations and raw response records are untouched.

**Owner action only if:** protected GitHub real-role READ ONLY diagnostic confirms missing membership INSERT/key-column SELECT, exact PR passes CI and is merged, and a matching SHA-pinned Replit command is provided. Otherwise it remains inert.

## Scientific consequence

Fixing the trigger cannot retroactively save the three failed original responses; T24 cutoffs already elapsed. Thursday Nov5 noon audit of that cohort remains INSUFFICIENT/HOLD. A new, prospectively frozen full-three-horizon WSSS cohort can be considered after read-only production ACL and no-provider PG16 success. Existing Friday Nov6 PST / Nov7 UTC replacement proposed first source Thu Nov5 17:30 PST and Fri Nov6 21:12 PST audit, but its GitHub activation must be separately reviewed before the true prearm deadline. No Cloudflare or Replit timed collection, no unmeasured scientific PASS, no provider email wait.