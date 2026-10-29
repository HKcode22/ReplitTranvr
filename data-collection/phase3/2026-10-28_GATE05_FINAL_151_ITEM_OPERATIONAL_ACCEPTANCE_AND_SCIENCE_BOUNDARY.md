# Gate 0.5 — October 28 WSSS 60-minute paid pilot: operational acceptance and scientific boundary

**Decision recorded 2026-10-28 Pacific, after successful live FREE postrun audit.** This is the finite, evidence-based **qualified operational closeout**, not a change to the original frozen V3.9 f.8 §16 scientific acceptance criteria.

## Authoritative identity and production evidence

- Exact WSSS science owner UUID: `618582a3-ea3f-4a10-a756-c974c472af3c`; GitHub paid source: `5e2be8d7e79375e40facd573c3a3ae57fdb98e40`; published receiver source `84b7f1565d0402facc8c3b9aacedc599eb6e2af1`.
- Planned observation interval: **2026-10-29 03:45–04:45 UTC**, equivalent to **October 28, 8:45–9:45 PM Pacific**. The CREATE occurred at 03:45:06Z; it was not evidence of 60 full minutes of pre/post observations per physical flight.
- [Paid one-use GitHub controller #40809300136](https://github.com/HKcode22/ReplitTranvr/actions/runs/40809300136): completed **SUCCESS**, exactly one successful CREATE and exact owner/subscription binding after authenticated independent STOP arming.
- [Independent retry6 STOP #40809393874](https://github.com/HKcode22/ReplitTranvr/actions/runs/40809393874): completed **SUCCESS**, terminal evidence `STOP_PROVIDER_EXACT_INACTIVE`, `reason=TIME_STOP` at **04:45:11 UTC**, first provider credit net debit **151**; exact owned subscription no longer active; no blind paid restart.
- [Read-only production owner and custody audit #40821045269](https://github.com/HKcode22/ReplitTranvr/actions/runs/40821045269): completed **SUCCESS**, exact source/UUID/auth/ticket verified in production PostgreSQL. V0075 LOGGED **28** received-delivery metadata records with **151** notification items **inside the interval**, **zero** logged source-ref SHA/identity mismatches, **zero** logged items timestamped after stop. Latest two FREE balance observations were stable at **1,830 Alert credits** from pre-create baseline **1,981**, net **151**; **59,980 REST units** left; **zero** active provider subscriptions, no provider foreign active IDs. Audit performed **zero paid provider operations and zero DB writes**.
- **Important owner closeout discrepancy:** the exact V0074 database owner was still **`ACTIVE`**, with `dbFinalizationProven=false`, after provider verified exact ID inactive. Do not create a second paid subscription to fix this. Only a distinct reviewed, one-shot DB-only exact-owned `ACTIVE → STOPPED` transition with free provider and authenticated STOP evidence may clear it. No such update has been verified.
- **Source custody limitation:** the V0075 journal preserves metadata, item counts and hashes, **not the original provider bytes** or physical operating-leg keys. UNLOGGED runtime delivery and item rows both showed **0** at the audit. The actual original bytes in dedicated Replit App Storage were **not independently retrieved and hash-verified** by the audit. The source code permits a default 168-hour prepaid raw retention with optional shorter settings; the *actual* stored reference expiry and provider/legal retention policy must be checked before attempting lawful source recovery. Do not promise bytes remain available, bypass expiry or export raw flight data to public GitHub.

## Frozen f.8 §16 acceptance matrix

| Binding criterion | Observed evidence | Verdict |
| --- | --- | --- |
| One airport, pinned short window, separate safety STOP | WSSS, original frozen 60-minute interval, independently protected STOP completed | **PASS operational** |
| Notification items at least 100 | 151 in-window V0075 LOGGED items across 28 deliveries | **PASS count only** |
| At least 50 verified unique *operating physical flights* | UNLOGGED item rows 0; V0075 count journal cannot recover physical identities | **NOT VERIFIED** |
| At least 20 verified completed operating flights | No independently verified final operating-leg classification | **NOT VERIFIED** |
| At least 30 verified airborne operating flights | No independently verified airborne operating-leg census | **NOT VERIFIED** |
| At least 100 independently usable airborne points | No authenticated physical-flight movement chain or source-valid point census | **NOT VERIFIED** |
| Original raw bytes, receiver clocks, HTTP 2xx ACK / latency | Source-ref metadata matches; source bytes and upstream ACK proof not independently read | **PARTIAL / UNKNOWN** |
| PRE same-flight T−24h / T−6h / T−90m and as-of leakage guard | Earlier candidate source probes are different cohorts, not this same paid-hour cohort | **NOT ESTABLISHED** |
| Verified scheduled wheels-off and *actual* wheels-off primary target | Official provider `scheduledTime` is not independently runway-scheduled; `runwayTime` may be estimated OR actual without per-value proof ([source issue #200](https://github.com/HKcode22/ReplitTranvr/issues/200)) | **SOURCE SEMANTICS BLOCKED** |
| Freeze P95 terminal grace and trajectory cadence from valid sample | Source-time, distinct operating physical-leg and actual terminal-event evidence unavailable | **NOT CERTIFIED** |

**Exact research interpretation:** `151 notification items != 151 independent operating flights`; 28 envelopes are delivery records, not unique flights. `zero logged blob-ref mismatch` is NOT identical to `original bytes independently SHA-verified`. Provider credit difference is a current stable *net observed account debit*, not a promise there will be no delayed billing adjustment. A full scheduled hour does not imply all target-specific measurements were available for an entire hour.

## Final acceptance and progression

```text
GATE05_ONE_HOUR_WSSS_LIVE_PAID_CONTROL=PASS
GATE05_INDEPENDENT_TIME_STOP_AND_ACCOUNT_INACTIVE=PASS
GATE05_LOGGED_RECEIVED_NOTIFICATION_ITEM_COUNT=151_OF_100_PASS
GATE05_LOGGED_SOURCE_REFERENCE_METADATA_INTEGRITY=PASS
GATE05_RAW_BYTES_AND_PHYSICAL_IDENTITY_RECOVERY=PENDING_SOURCE_CHECK
GATE05_EXACT_LOGGED_OWNER_DB_TERMINALIZATION=PENDING_DB_ONLY
GATE05_ORIGINAL_F8_16_STRICT_SCIENCE=NOT_PASS_SEMANTICS_BLOCKED
GATE05_RESEARCH_DIAGNOSTIC_CLOSEOUT=QUALIFIED_COMPLETE
PHASE4_OFFLINE_ENGINEERING=GO
PHASE4_6_NEW_PAID_DATA_COLLECTION=NO_GO_WITHOUT_SEPARATE_SCIENCE_AND_FINANCIAL_ADMISSION
GATE05_REPEAT_IDENTICAL_PAID_ONE_HOUR=NOT_JUSTIFIED_BY_CURRENT_EVIDENCE
```

**Next work, no new payment:** (1) safely close the immutable exact DB owner without provider mutation only after separate reviewed one-use safety proofs; (2) inspect original raw bytes only within actual lawful retention through the authenticated, isolated Replit App Storage path and record aggregate verified identities/flight-state counts; (3) resolve/replace *only through explicit scientific protocol change* the unsupported scheduled-vs-actual runway-delay estimand, then complete the prior-cohort clock/same-flight as-of validation if that target remains selected. The provider/source ambiguity is a mathematical identifiability blocker, not a transient 2–3-minute missingness gap.

**Do not** rerun the consumed one-use CREATE, mark the original f.8 as strict PASS, fabricate 50 distinct flights from 151 webhook items, run an unreviewed DB UPDATE, extend expiry without authority, republish Replit unnecessarily or deploy a paid Phase 4/6 scale-up based on this operational result alone.

**Continuity:** [postrun audit PR #247](https://github.com/HKcode22/ReplitTranvr/pull/247), [issue #173](https://github.com/HKcode22/ReplitTranvr/issues/173), [source issue #200](https://github.com/HKcode22/ReplitTranvr/issues/200), original controlling [V3.9 plan f.8 §16](../plans/V3.9_DataCollectPlan_f.8.md), and [earlier qualified analysis](2026-10-27_GATE05_PRAGMATIC_QUALIFIED_CLOSEOUT_YSSY_GO.md).
