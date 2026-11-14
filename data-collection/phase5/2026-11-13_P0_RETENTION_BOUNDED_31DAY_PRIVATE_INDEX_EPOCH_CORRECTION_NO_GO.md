# Phase5 → Phase6 P0: retention-bounded 31-day private INDEX correction

**Checkpoint:** Nov 13 PST / Nov 14 UTC, 2026. **Source:** [Phase5 exit issue #413](https://github.com/HKcode22/ReplitTranvr/issues/413), current main `da719066c68a8744866f86e20a2ef8f86dc20b23` before this draft. **Production:** V0094 installed and independently audited in the **existing** Replit-attached `neondb`; V0095 and V0096 **not installed**. V0079–V0093 already installed. **Decision:** Phase5 scientific FREEZE **HOLD**; paid Phase6 **NO-GO**. Do not reinstall V0094 or launch paid jobs.

## Verified architectural problem—not another optional microstage

The pinned **uninstalled** V0096 schema has a **single global revision chain**, and its old publisher requires `previous.retention_not_after_utc >= new.retention_not_after_utc`. By induction, every future index expires no later than revision 1, which cannot be later than its first independent review + **seven days**. The old in-memory reader also requires all earlier SOURCE/PRE/POST private byte packets and current+prior index revisions. A 31-parent-day trial therefore could not continue past that first index's expiry without retaining old bytes, falsifying expiry or rewriting the scientific chain. This is an actual technical contradiction, not merely a conservative policy objection.

**Do not deploy** current `migrations/staged/V0096__phase6_private_signed_day_shard_index_revisions_inert_v39.sql` or its exact-hash owner installer. Their source code remains retained and the SQL Git blob pin remains unchanged, since it has never been installed. The separately installed V0094 bytes and roles are unchanged.

## Draft replacement in PR #658 (NOT production SQL)

`migrations/staged/PHASE6_DAY_SCOPED_INDEX_REPLACEMENT_CANDIDATE_NOT_FOR_INSTALL.sql` exists only to establish one testable candidate in **disposable PG16 CI**:

- One **independent** 1..31 `run_day_index` epoch; `(run_day_index,revision)` unique key, SHA linkage only to the **same study day**, not prior days. Each day may include SOURCE, paired T24/T6/T90 PRE and V0083 POST; day identity is **the signed study day**, not merely UTC midnight. Exactly one external reviewer and all 31-day calendar/treatment pins remain to be commissioned. A day may span multiple UTC dates around a flight; it still belongs to one study run-day.
- The private indexed byte rows have real `retention_not_after_utc` bounds, max 7 days from independent review and potentially less as law or Content headers require. **A database TTL column does not erase bytes** or make an expired provider record lawful.
- A minimal `signed_run_day_epoch_claim_v39` fence stores **only the run-day integer and first DB clock timestamp**, no flight identifiers, paths or provider SHA. It remains after separately approved owner deletion of expired index bytes, preventing a later genesis reissue for that same day. Its right to persist long-term still needs explicit classification. One legitimate study calendar, not reusable as a second study without separate scoped design.
- Existing reader and publisher NOLOGIN groups from V0094 are reused. Reader has SELECT only, publisher has SELECT+INSERT of private index; only the owner can physically purge old index bytes. No app/provider/worker LOGIN, token or new paid GET. An owner DELETE of a claim is blocked by immutable trigger, while expired byte cleanup is a separate reviewed operation.
- A durable 31-day **research calendar** (no private flight bodies) may be preserved if purpose/terms allow; actual per-flight provider CONTENTS/normalized rows must observe the independently approved shorter retention, backup/PITR and object store windows. Only legally qualifying aggregated/nonreconstructable derived information survives beyond Content TTL, not mislabeled flight IDs/labels.
- Existing SOURCE→Stage14/V0081 T24/T6/T90→V0083 POST operators, budget/leases/alerts/STOP, non-backfill, and UNKNOWN for missed PRE and uncertain physical labels remain authoritative. This candidate neither creates a signer nor declares scientific GO.

## Disposable tests / exact implementation boundaries

The new PR workflow installs historical **V0094+V0095 in disposable postgres:16 only**, then this candidate; tests: independent day 1/2/31 genesis, day-scoped revision SHA, wrong/cross-day SHA rejection, expired or >7-day insert refusal, no UPDATE, inability to delete claim, owner deletion of day1 index bytes followed by **day1 genesis replay refusal** while day2 remains usable, old global V0096 absent, no new role privilege. No user's real Neon URL is supplied.

**Not yet complete:** signed real reviewer version binding `runDayIndex`, exact source/flight semantic validator and full byte-hydration across the new table; independent rights/license and retention matrix including all plaintext/recoverable backups; a physically verifiable, authorized owner-only TTL cleanup and write-once claim custody; real SOURCE/PRE/POST GH day-of-use rollover under 31-day calendar; first-cycle target semantics; final independent freeze and separate bounded paid Day1 GO. Do not infer these from SQL passing its tests.

## Immediate decision

1. Wait for independent **exact-head** CI including disposable PG16 before merging this **design-candidate only** PR. A pass does not authorize installing it.
2. Only after reviewer/rights, purge and runtime compatibility, design **one replacement exact-hash owner installer** for the day-epoch alternative, not a blind V0096 replay; retain reviewed V0094 and existing role/queue architecture.
3. Keep existing Phase5 completion issue #413 as the one current launch docket, not another endless numbered stage series.
