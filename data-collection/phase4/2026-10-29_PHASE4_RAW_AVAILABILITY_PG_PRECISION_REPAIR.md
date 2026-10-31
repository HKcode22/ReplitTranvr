# Phase 4 — repair future FIDS availability timestamp custody (2026-10-29)

**Binding:** Plan V3.9-f.8 §§5.1, 6.1, 7.1, 16–17 and Implementation Log §§1.9, 2.22. Additive checkpoint; does not change original evidence or freeze status.

Two prior successful GitHub protected read-only audits recorded 31 latest WSSS normalized population source observations across two retained raw FIDS query receipts, candidate as-of observations 15/31 at scheduled−24h, 31/31 scheduled−6h/90m, zero matching PRE snapshot rows and no independently certified flight denominators.

[Run #40885420902](https://github.com/HKcode22/ReplitTranvr/actions/runs/40885420902) isolated **31/31 population member availability timestamps earlier than their matching raw FIDS receipt**, zero response-SHA mismatches, zero after-audit timestamps, all 31 with differences <=1 second. This is consistent with PostgreSQL microsecond -> JavaScript Date millisecond precision loss in the original writer: raw `INSERT ... GREATEST($10,now()) RETURNING available_at` sends its returned value through the Node `pg` date parser before using that JavaScript value to insert member `available_at`. The single-second bound alone does NOT prove that is the explanation: a new source-only read audit subdivides <=1 millisecond vs (1 millisecond,1 second].

**Code repair for future writes only:**
- Keep raw and member insertion in one transaction; preserve raw response SHA, original query ID and original UTC clocks.
- Replace the member `available_at` VALUES placeholder with a correlated in-transaction read `(SELECT GREATEST($28::timestamptz,q.available_at) FROM clean.fids_query_response q WHERE q.population_query_id=$19::uuid)`. The full-precision raw-receipt timestamp is read from the database itself, not rounded through a JS Date and copied back. A missing matching original receipt yields NULL and the NOT NULL member availability constraint refuses persistence, instead of silently accepting a pre-raw member.
- No historical row corrections, backdated availability or automatic Gate5 PASS. Source-early records remain quarantined under `beforeCandidateScheduleWithSourceIntegrity`; preexisting generic observations still reported for diagnosis.
- Add source SQL-value regression assertions and exact original query-ID binding. The existing protected GitHub main-only read-only audit reruns for the updated source cutoff module, with no new paid API request or SQL DML.

**Outstanding scientific gates:** immutable real FIDS request metadata and source rights; confirmed operating/cargo/private/scheduled-service scope; physical-leg identity + retime across as-of snapshots; verified first provider-native selected T/actual wheels-off targets and independent same-cohort captured/outside-population denominator. The owner approved bounded paid research, but Phase5 final freeze and Phase6 cannot start until Gate5 and all predecessors PASS under the frozen Plan.

No Replit shell required to run this GitHub-only diagnostic. The source-code write fix only takes effect for a future FIDS writer running the reviewed commit; verify the actual application/runtime deployed SHA before relying on it.
