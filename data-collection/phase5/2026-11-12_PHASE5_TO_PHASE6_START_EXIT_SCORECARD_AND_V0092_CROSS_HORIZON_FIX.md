# Phase 5 → Phase 6 — actual finish-line scorecard, Nov 12, 2026

**Source:** HKcode22/ReplitTranvr main + owner's private Replit Shell confirmation (V0091), not an independently rerun live database query.

## What is COMPLETE in real production, and must NOT be installed again

- **V0087**: real PostgreSQL16 durable flight×horizon queue; empty at last owner readback.
- **V0088/V0089**: real Stage14 same-transaction registered-PRE guard + restricted NOLOGIN function owner, legacy trigger preserved.
- **V0090**: four existing PRE queue claim/start/ACK/reap functions commissioned to NOLOGIN owner; old PRE group execute-only.
- **V0091**: **owner verified LIVE** `V0091_SOURCE_BOUND_PREPARE_ONLY_FUNCTION_COMMISSIONED_INERT`: PREPARE-only source-bound registrar under `phase5_cd_source_registration_owner_v39`, reused `phase5_fids_prepare_prod_20261107`, direct queue INSERT denied, queue 0 tasks, no flight snapshots, no paid/provider calls, no GH worker scheduled.
- GitHub **PR #579**: STOP-default original Stage14 signed T6/T90 GH control.
- GitHub **PR #581**: one canonical V0091 signed source registration and code-lineage/Stage17 digest; duplicate #582 closed.
- GitHub **PR #583**: bounded real PostgreSQL-clock early lookahead, preserving true three-minute Stage14 cutoff and honest missedness.
- GitHub **PR #585**: merged source-bound T−24h queue → original Stage14 PRE COMMIT → independent V0081 witness COMMIT → ACK, STOP-default/manual; overlapping #584 closed without merging.

## One new correctness blocker identified and fixed in this branch (V0092)

**Issue:** The inherited `clean.phase5_cd_claim_due_v39(owner,limit,lease)` ignores **horizon and frozen packet**. If both the T24 worker and T6/T90 worker start near similar cutoffs, either can take a lease belonging to the other, reject it as unlisted, and miss a valid prospective PRE.

**Implementation:** incremental **V0092** adds `clean.phase5_cd_claim_signed_roster_v39(packet_sha256s[],horizons[],owner,limit,lease)` on the **existing V0087 table** under the **existing V0090 NOLOGIN function owner**. It validates up to 96 exact signed SHA256 packet hashes, allowed horizons and bounds; claims only rows both selected by independently reviewed roster and within the true DB-clock due window, using `FOR UPDATE SKIP LOCKED`. A unique (packet hash,horizon) index prevents one frozen packet from referring to two distinct flight tasks under the same horizon. Its SQL removes the old **unscoped** claim EXECUTE grant from PRE and grants the scoped function to the existing PRE group only. No new database LOGIN, paid provider, table, PRE writer or task enrollment. Both existing T24 and T6/T90 GH workers call the new function.

**Release warning:** this is currently **PR code/CI only**, not yet installed in owner's Neon. The new workflow tests mixed T24/T6 due tasks and their old cross-claim failure mode in disposable PostgreSQL16, restricted SET-only PRE group, duplicate packet uniqueness, and no provider. Do not operate mixed GH workers until the **exact-head V0092 CI** and independently reviewed one-time owner commissioning have passed. The old signed Stage14 write safety is otherwise preserved.

## What actually remains before the 31-batch-day Phase 6 GO?

| Exit requirement | Current evidence | True remaining operation |
| --- | --- | --- |
| **A. Coherent scientific first-cycle target** | Canonical Amendment E candidate: T−6h continuous departure delay minutes, T−90m update, T−24h comparator; limited FIDS origin/dest saved in CI, weather/historical code reusable | Decide the actual physical timing/label semantics, baseline, calibration and missing-label policy; wheels-off via free ADSB.lol must not be called gate-out. Optional extra features can be missing. |
| **B. One authentic future source→PRE→POST chain** | Live V0087–V0091; signed GH source registrar; bounded later PRE and manual T24+V0081 witness code; prior Phase4 real FIDS POST/receiver | Future licensed original, signed freeze roster, prospectively register ≥1 true operating flight, on-time V0081 T24 witness and T6/T90 where due, generic future POST/receiver and unknown-ACK audit; demonstrate independent end-to-end evidence. No existing new-cohort queue rows yet. |
| **C. Affordable unattended operation** | Separate 50K project ceiling/observed legacy 60K provider allowance, prior V0082 seven REST categories, 31 parent batch-day design, limited 5-min GH tick + 8-min DB clock prearm | Resolve V0092 packet contention; unattended T24 scheduling (not just manual); daily early draw/source/POST continuations, bounded STOP/watchdog, budget/Alert, GitHub failure/late/missingness accountability, owner visibility. |
| **D. Independent limited release** | CI safety, source/license and role gates constructed | Independent **source Contents/ML rights + retention/use** acceptance and bounded pilot freeze, then a **separate** paid Phase6 GO. A SHA/secret/billing entitlement alone is not a license. |

**Important relaxation already agreed:** one missed horizon, sparse route, missing optional weather/ADS-B, late source, canceled flight or sparse POST is documented **missingness**, not automatic rejection of the entire 31-day study. Never backfill a PRE, fabricate prior issue times, bypass billable REST authorizations or drop exposed days based on outcomes. The 31-day run **starts in Phase6**, it is not required to close Phase5.

### Calendar estimate (goals, not guarantees)

**Nov 13 Friday:** credible engineering checkpoint for V0092, T24 automation, POST/receiver plan, real source selection. **Nov 20 Friday:** reasonable *conditional* target for the first short real prospective pilot and Phase5 independent readiness verdict if authentic source, rights, label and automated STOP gates are verified. A small further slip into the following week is more credible than asserting Phase6 GO today. **If retention/ML source rights, physical label or provider-ready POST remain unresolved, Phase6 cannot be responsibly dated yet.** Once started, the one-month experiment has **31 parent batch-days / up to 128 active collection hours** (26×4h, 3 split 2h+2h, 2 up-to-6h) and 34 distinct active segments; these need not be 31 consecutive local calendar days.

Do not open more planning stages merely to add checklists. Prioritize **V0092 scope fix → T24 unattended scheduler → future POST/reconciliation/STOP → one genuine prospective pilot → independent bounded approval**. Keep One Amendment E; no second airborne service paid. **Phase5 science FREEZE HOLD / Phase6 paid GO NO** until signed.
