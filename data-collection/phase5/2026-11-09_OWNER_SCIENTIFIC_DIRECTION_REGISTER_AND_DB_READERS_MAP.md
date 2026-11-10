# Owner scientific-direction register and database reader's map — November 9, 2026

**Status: DOCUMENTATION / OWNER DISCUSSION ONLY.** This file is on the separate `docs/owner-phase5-target-clarity-20261109` branch, not on `main`. It records questions, alternatives, concrete explanations and an owner-notification checklist. **It is not a change to the binding f.8 plan, an accepted amendment, a migration, a scientific FREEZE, or Phase 6 paid GO.** No production job should treat this document as an authorization flag.

## 1. What the project originally intended

The binding [V3.9 f.8 plan](../plans/V3.9_DataCollectPlan_f.8.md) includes **two separate prediction states**:

- **PRE-DEPARTURE:** at each legitimate T−24h, T−6h and T−90m cutoff, estimate physical departure-delay minutes (original first-cycle primary), plus arrival disruption and cancellation/diversion risks where valid labels exist.
- **AIRBORNE / POST:** once physical airborne evidence is established, predict landing ETA, remaining flight time, arrival delays and risk of severe delay/diversion. This is a separate prediction state, not a later timestamp inserted into the same PRE feature row.
- **Phase 7** trains and evaluates models against appropriately sourced labels. The original first-cycle experiment compares XGBoost versus persistence for actual physical departure-delay minutes using MAE. This is not equivalent to binary 15-minute schedule revision.

**A source field describing an estimate is not a verified actual wheels-off event.** For illustration only: `scheduled=10:00`, `provider-updated scheduled=10:30`, `estimated takeoff=10:45`, `actual observed wheels-off=10:52` are FOUR different facts. Do not infer the fourth from the first three.

The full original product vision is *not* silently canceled by a draft first-cycle amendment; additional models require independent identity, outcome and time-of-availability evidence.

## 2. Why the prediction target question cannot simply wait until Phase 6 ends

**Owner preference recorded for review:** Preserve the original vision and competing prediction targets; focus Phase 5 on scientifically sound, reusable collection and Phase 6 on obtaining genuine prospective data, not polishing arbitrary new stages. Decide which algorithms work best only during Phase 7, using predeclared train/validation/test rules. Notify the owner before any material change to goals, primary label, population, budget, calendar, model evaluation or provider-use interpretation.

**Scientific constraint:** The research must define **before future outcome collection** what a source field means, which eligible flights are in the population, which label is primary, how missingness/unknown is handled and which timestamps count. Changing the official headline endpoint after examining outcomes creates outcome selection/reporting bias. The **model architecture/hyperparameters** can be chosen later using training/validation evidence, with the final test protected. The project need not make every conceivable target primary.

**Decision still required before Phase 5 FREEZE:**
1. Keep original **physical actual departure-delay minutes** as first-cycle primary, with a genuinely verified actual-only label requirement (and possible insufficient coverage, hence honest HOLD); **or**
2. Explicitly adopt the [draft provider schedule-revision Amendment D](../plans/V3.9_DataCollectPlan_f.8_Amendment_D_20261107_Prospective_Schedule_Revision_Primary.md) as the **first-cycle primary**: binary `abs(latest provider scheduledTime by W=T+2h - latest scheduledTime known by C=T−6h) >= 15 minutes`; measure **provider report changes**, not actual flight delays. Other previously planned risks / physical labels and airborne ETA may remain separately named secondary, exploratory or deferred analyses, subject to their own data-validity rules.
3. A different design may be proposed prospectively but must be specified and reviewed **before** viewing its future outcomes. Don't secretly combine mutually different estimands or score schedule-change probabilities as actual flight-delay accuracy.

This document **does not make that choice** or represent the owner's agreement to Amendment D.

### Existing amendments with overlapping names

| Document | Actual scope | Boundary |
| --- | --- | --- |
| [Gate 5 A](../plans/V3.9_f.8_Gate5_Expedited_Collection_Amendment_A_20261102.md) | Expedited provider-observable collection proposal | Corrected by B where it replaced the original target or acceptance |
| [Gate 5 B](../plans/V3.9_f.8_Gate5_Amendment_B_20261102_Restore_Scientific_Acceptance.md) | Restored strict historical scientific Gate 5 boundary | Historical HOLD cannot retroactively be labeled PASS |
| [Amendment C](../plans/V3.9_DataCollectPlan_f.8_Amendment_C_20261107_Segmented_Source_Coverage.md) | Source timing/coverage for 4h, split 2×2h and up-to-6h windows, UTC REST budgeting | Does not decide the ML target |
| [Amendment D — schedule-revision](../plans/V3.9_DataCollectPlan_f.8_Amendment_D_20261107_Prospective_Schedule_Revision_Primary.md) | DRAFT alternative first-cycle outcome and metric | Not an approved physical-delay label or silent protocol replacement |
| [Amendment D — four HUBs](../plans/V3.9_DataCollectPlan_f.8_Amendment_D_20261108_Four_HUB_Prospective_Scope.md) | SEPARATE prospective sampling-scope proposal for WSSS/OMAA/SKBO/YSSY | Same letter 'D' unfortunately reused for a different subject; don't conflate them |

**Documentation issue:** Two different "D" documents exist. They must be cited by *full filename and scope* until the scientific owners resolve naming; do not pretend they are one approval.

## 3. Plain-English meaning of potential model labels

- **Provider-observable schedule revision:** two authentic, comparable provider `scheduledTime` versions for the same unambiguous scheduled service differ. This does **not** establish actual gate-out or actual wheels-off delay.
- **Provider-reported cancellation:** an actual source status explicitly reports cancellation. No callback / missing source is UNKNOWN, not 'not canceled'.
- **Provider-reported diversion:** an actual source status explicitly reports diversion; physical route outcome may demand further verification.
- **Physical gate-out / wheels-off delay:** a real actual-event timestamp (not 'estimated' or 'revised') with a valid operating-leg join, measured against an explicitly defined schedule reference.
- **Airborne ETA:** an independently identified airborne flight and time-available location/movement evidence, then appropriately verified arrival event. FIDS schedule data alone is insufficient.
- **PRE:** a prediction state frozen from information that *actually became available* no later than that flight's prediction cutoff. **POST:** later observation and outcome only, not a source of retrospective PRE features.

For the Nov 6 Phase 4 WSSS pilot, [the owner guide](2026-11-09_WHAT_THE_FLIGHT_RECORDS_MEAN_AND_PHASE5_EXACT_FINISH_LIST.md) reports 9 PRE FIDS originals, 12 **conditional scheduled-service composite keys** (not 12 confirmed physical movements), 36 on-time PRE observations, 3 POST originals, and 36 schedule-version comparisons. Those do not certify actual wheels-off labels.

## 4. The database inventory already exists — DO NOT RECREATE IT

The detailed existing [database atlas](PHASE5_DATABASE_ATLAS_SQL_TABLES_AND_RELATIONSHIPS_20261108.md) lists all **76 B0062 baseline tables (48 in `clean`, 28 in `public`)** and separately enumerates V0076–V0083 source/custody additions, with sample columns and relationships. The [SQL teaching lab](PHASE5_SQL_JOIN_DATABASE_LAB_FOR_READERS_20261108.md) has read-only examples for schemas, JOINs, grouping and source-to-PRE links. These describe schema/code, **not proof of every current live table**, including earlier V0066–V0075 or independently managed objects.

Phase-labelled navigation (tables are reused across phases; a phase is **not** one SQL schema):
- **Phase 2 / 2G sampling and provider delivery:** `clean.adb_sampling_frame`, `clean.adb_sampling_frame_registry`, `clean.adb_anchor_probe`, `clean.adb_collection_batches`, `clean.raw_delivery`, `clean.raw_delivery_item`.
- **Phase 3 paid Alert / webhooks and safety:** `clean.adb_collection_subs`, `clean.adb_incident_stop`, `clean.flight_events`, `clean.webhook_flight_identity`, `clean.webhook_identity_resolution`.
- **Phase 4 FIDS/PRE/POST:** `clean.fids_query_response`, `clean.flight_population`, `clean.flight_snapshots`, `clean.flight_outcomes`, V0076/V0077 source reservations/binding.
- **Phase 5 / future Phase 6 release:** `clean.adb_phase6_calendar_day`, `clean.adb_sampling_draw`, `clean.adb_phase6_authorization`, `clean.phase5_fids_allowed_query_v39`, `clean.phase5_fids_physical_attempt_v39`, `clean.phase5_fids_original_binding_v39`, `clean.phase5_t24_postcommit_witness_v39`, phase5 budgets / partitions / source prearm. These are planning, authorization, future observation and audit tables, not 16 new model datasets.

**Time-qualified live evidence:** The [Nov 9 owner inventory](2026-11-08_LIVE_EMPTY_PHASE5_COLD_START_AND_TRUE_RELEASE_ORDER.md) at 13:42 UTC observed all **16 scoped new tables present**, seven expected NOLOGIN groups present, **zero rows in each of those 16 at that moment**, Phase6 authorization disabled. It did not query every historical table or establish that the *entire* PostgreSQL database was empty. The older atlas' V0082/V0083 installation comments predate this later evidence; prefer the timestamped live inventory for installation state. To claim a literally complete **current live catalog**, execute a separate authorized, read-only `pg_catalog` or `information_schema.tables` inventory; don't infer it from schema sources or claim it has been run here.

## 5. What reading the database looks like in TypeScript

An illustrative READ-ONLY query, mirroring the `pg` client pattern in [the actual PRE writer](../../server/lib/disruption/phase5V0079SingleBoundFlightPreWriter_v39.ts):

~~~ts
const result = await client.query(
  'SELECT flight_instance_id, horizon, prediction_cutoff_utc FROM clean.flight_snapshots WHERE horizon = $1 LIMIT 3',
  ['T-24h']
);
const rows = result.rows; // JavaScript array: [{flight_instance_id: '...', horizon: 'T-24h', prediction_cutoff_utc: ...}, ...]
for (const row of rows) console.log(row.flight_instance_id, row.horizon);
~~~

`client.query` sends SQL to PostgreSQL, not an array to search through. PostgreSQL performs the selection; `result.rows` is an **array of JavaScript objects** returned to the program. The values shown above are placeholders; the code is educational and is NOT a live query or a statement about current row counts. `$1` is a bound parameter, used instead of concatenating user input into SQL. Actual source code uses `.rows` throughout, e.g. the strict Phase5 single-flight PRE writer.

## 6. What seven NOLOGIN groups and GitHub workers do

PostgreSQL enforces its own permission system because application code can have bugs or be compromised. A **LOGIN role** authenticates to the database using a properly held secret; a **NOLOGIN role** is an assignable permission group and cannot directly log in.

In the real [Stage31 handshake](2026-11-07_STAGE31_REAL_GITHUB_NONPAID_WORKERS_READONLY_HANDSHAKE.md), dedicated GitHub Actions worker credentials connect with a restricted LOGIN, check membership, then issue `SET ROLE` to one approved NOLOGIN group. `session_user` stays the authenticated login; `current_user` reflects the active role used by SQL privilege checks.

Roles have separate purposes: preparing approved queries/budgets, reading original/provider source and invoking limited reservation functions, inserting **new** PRE snapshots, and independently witnessing already committed T24 PRE. A source collector should not silently modify witness data; a witness should not create the PRE it verifies; an app server should not acquire provider-spending privileges. `SELECT` means read, `INSERT` add, `UPDATE` modify, `DELETE` remove; `EXECUTE` can authorize an exact guarded database function. Immutable evidence typically denies UPDATE/DELETE.

There are **seven installed NOLOGIN groups in the latest scoped inventory**, not necessarily seven autonomous bots. Some worker identities/permissions and groups represent separate responsibilities or configuration layers. Actual successful login is not equivalent to final science FREEZE, full unattended collector, or paid activation.

## 7. Owner-facing material change notification checklist

**Owner approval required before a material scientific protocol changes status.** Every future proposal should record in an easy-to-read checkpoint:
1. **Current binding rule** and exact source-file section.
2. **Proposed difference** and whether it changes scientific question, target label, eligible population, endpoints, PRE/POST evidence, split, model metric, bias/uncertainty, retention, total cost, paid scope, or timeline.
3. **Why** the change is necessary; alternatives, including reusing existing Phase2–4 components or accepting explicit missingness.
4. **Consequences:** what this makes possible, what it no longer permits us to claim, what remains unverified, and whether any new real payment is involved.
5. **Owner decision:** PROPOSED / UNDER_REVIEW / ACCEPTED / REJECTED / SUPERSEDED with date, person/review artifact and links. **No invented approval.**
6. **Execution boundary:** only after the decision is properly incorporated into the normative plan and independently reviewed release manifest may the approved Phase6 owner use it.

**Existing concrete decision items to show the owner, not auto-resolve:**
- First-cycle actual physical-departure MAE vs provider schedule-revision binary/Brier endpoint.
- Four-HUB design vs historical five-HUB gate, with corrected population/generalizability claim.
- Amendment C exact source refresh/segmented-window/budget constraints and source-use/retention.
- Signed real 31 batch-days and budget calendar before paid Phase6 GO, versus first true Day1 source originals and witnesses **after** GO.
- Optional PRE cancellation/diversion and airborne ETA targets as separately scoped, support-dependent modeling objectives.

This branch is a read-only explanatory decision register, **not** a mechanism for automatically notifying other assistant conversations. To make these requirements operational across ongoing engineering, the owner can review and explicitly approve a PR or link this branch to that workstream; do not merge into main or change workflows without explicit review.

**No paid GET, database writes, migration, secrets access, GitHub Actions dispatch, PR merge, or branch-main changes were authorized or performed by this documentation.**
