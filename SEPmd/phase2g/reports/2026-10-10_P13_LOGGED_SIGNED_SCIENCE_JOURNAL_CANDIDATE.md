# Phase 2G P13 — Synthetic durable scientific flight journal: evidence vs actual recovery

**2026-10-10; draft review checkpoint; test-only.** This is not a prospective authorized data schema, paid replay operation, science acceptance rule, production DDL, subscription recovery, owner change or approved YSSY re-run.

## Background and exact risk

[Prior P09–P13 bridge report](2026-10-10_P09_P13_EDGE_RECEIPT_CHECKPOINT_AND_ACTUAL_SQL_LOSS_GATES.md) proved that a synthetic edge receipt (original full wire, SHA-256, first edge UTC and "processed" marker) may remain intact while a real disposable V3.9 PostgreSQL instance loses the UNLOGGED paid session/delivery/item runtime. A retransmitted Queue message may be acknowledged as already processed but does **not** recreate scientific items. An R2 processed marker by itself is neither present-day durable SQL truth nor proof of scientific 120-minute window continuity. [Prior fully green CI](https://github.com/HKcode22/ReplitTranvr/actions/runs/38089930398): 301 offline cases and 37 actual local PostgreSQL integration cases.

## New P13 test-only development

- Source `experiments/phase2g_rehearsal/disposable_logged_science_recovery_journal_v39.ts` provides a **LOGGED PostgreSQL synthetic science witness** holding test-only signed metadata, including frozen session/provider subscription/owner hash, 120-minute UTC interval, logical attempt key, original wire SHA, first-edge UTC, hypothetical attempt cost, and every sample flight's original item SHA, physical-v2 flight instance, airline/flight/route/service date and operator/quarantine resolution.
- **Signing is explicit fixture HMAC over a deterministic ordered projection**. Duplicate logical source attempts are idempotent only with exactly matching original frame. A changed flight number/identity, owner fingerprint, source SHA or original first UTC cannot silently overwrite the durable record.
- Write helper `writeSyntheticLoggedScienceJournalV39` rejects real DB/provider secrets, accepts only a localhost `/p2g_stage1_fixture` database with `P2G_DISPOSABLE_POSTGRES=YES`, checks local fixture original-wire readback SHA, writes `ON CONFLICT DO NOTHING`, then reads original LOGGED record back and verifies its HMAC and exact identity. It never performs production schema operations.
- Read-only reviewer `reviewSyntheticLoggedScienceJournalV39` verifies frozen owner/session/attempt binding, source readback SHA, complete item-key/physical-v2 comparisons and 8 original elapsed-source buckets **without any SQL restore or live route changes**. The returned flags **always** include `scientificallyCertified=false`, `paidRunAuthorized=false`, `automaticReplayAuthorized=false`.
- Actual V3.9 disposable PostgreSQL integration fixture creates the only synthetic LOGGED journal table locally, posts an `IsOperator` YSSY physical-leg notification through the actual V3.9 HTTP parser/processor and stores a signed journal witness. It exercises a duplicate, changed signed flight identity, missing original wire bytes, a disposable UNLOGGED session/delivery/item reset, preserved LOGGED journal readback, missing runtime-row detection, wrong owner hash, and journal tampering.
- The current signed synthetic owner/science record **is constructed after local SQL ingestion**. It therefore does not constitute an independent live capture before first upstream ACK; the test's `firstEdgeReceivedUtc` is an explicitly synthetic time, not a proven live Replit source timestamp. The local test signing key is not independent of the origin. We **do not** declare the missing source/accounting gate closed.

## Experimental proof boundaries

**Can prove locally:** signed test-owned metadata survives deletion of volatile science rows, can be read back and matched against stored synthetic raw wire hash, and can expose missing identity-level flight observations and contradictions. A durable metadata witness containing every synthetic physical item is a plausible *reconstruction input*.

**Cannot yet prove:** real AeroDataBox sender attempts/charge ledger and billable gap reconciliation, trusted source/edge UTC against Replit cold start, a genuinely independent immutable outside-of-DB flight-source inventory, complete eight 15-minute intervals from the frozen 120-minute session, correct sampling/censoring post-restore, real 168-hour raw-object storage, owner epoch and clean single subscription, or actual restore/replay into V3.9 after a PostgreSQL SIGKILL. Reconstructing/overwriting the live scientific DB from unapproved fixture material is forbidden.

## What must close next before live P13

1. Independently durable original source full bytes and sender-attempt identities, before any provider-facing 2xx, with readback and immutability in a separate failure domain.
2. A real approved owner+session+subscription+receiver/DB-epoch-scoped journal transaction protocol ensuring a trusted source event and every exact physical-v2 item are recorded atomically or recoverably without a false committed signal.
3. A **fresh disposable PostgreSQL** reconstruct-and-compare rehearsal using frozen signed external sender/owner witnesses for **all eight** 15-minute source buckets and the full 120-minute exposure. Validate post-crash original timing, no duplicate physical flight or credit, and no fabricated missing event after restore. Test provider 260/259 unknown-gap explicitly.
4. Independent provenance verification and a proposed science amendment covering altered stop policy 6+6, owner lease/cost/quotas, historical censorship, and final terminal scientific adjudication.
5. Live published-equivalent isolated 120-minute wall-clock R0–R11 demonstration with zero real AeroDataBox traffic, protected account limits and explicit staging authorization. Replit ticket #564568 remains a separate unresolved platform proof dependency.

## CI verification

New test and source committed on investigation branch. Record exact CI run and result only after **all jobs complete**. Existing live supervisor: 15s poll, 3 consecutive failures; proposed 6 primary + 6 backup only tested in an isolated candidate; AeroDataBox `maxDeliveryRetries=0`. PR #27 remains draft, none merged/deployed.

**YSSY Stage-1 paid status: NO-GO** for Sunday Oct 11 at 8 PM PDT absent all hard gates and an explicitly approved prospective bounded paid retry. A passing synthetic journal only advances the evidence foundation.
