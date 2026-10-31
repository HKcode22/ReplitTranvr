# Phase4 — WSSS one-cohort three-horizon prospective FIDS refresh (30–31 October 2026)

**Binding:** Plan `data-collection/plans/V3.9_DataCollectPlan_f.8.md` §§5.1–5.4, 6, 16–17; Implementation Log `data-collection/implementation/V3.9_IMPLEMENTATION_LOG.md` §1.9. Existing decision rules unchanged. Owner approves bounded paid use and requires prompt progress, explicit tolerable missingness, no vendor-reply dependency, no manual timed Replit commands. This is **Gate5 source-cohort measurement**, not an amended target or Phase6 authorization.

## Real evidence already measured
- PR #275 merged at `3e80ed1e046546b5cf15265c4072fd428b611384`, four checks PASS; [paid GitHub run #41066341220](https://github.com/HKcode22/ReplitTranvr/actions/runs/41066341220) returned **one AeroDataBox WSSS FIDS GET; exactly 2 API units debited; 24 normalized WSSS population rows, 24 inserted; fetch-decoded original and canonical JSONB envelope checksum readback verified**. Future service window **2026-10-31 17:00–18:00 UTC**; first candidate T−24h cutoff = 2026-10-30 17:00 UTC. **No retries/Alert creates**.
- PR #276 merged at `fe0e494cd823e53c9ff55ef5f29d264c38b8e5ae`; [protected population census #41068073080](https://github.com/HKcode22/ReplitTranvr/actions/runs/41068073080) succeeded: 3 unexpired query receipts, 55 WSSS primary-role population observations, of which **24 strict source-consistent** and **31 older rows with <=1ms clock-precision differences reconcilable in PostgreSQL**. Raw WSSS original readback sampled 1 new source with both SHA checks verified; 0 integrity rejects. Total original source flight records 55, 16 provider-marked operator and 22 marketing, but **0 independently confirmed scheduled-commercial operating legs** and **0 PRE snapshots**. These are missing/unverified strata, **not proof of an empty airport**.

## Precisely bounded three same-cohort reads

GitHub default-branch finite `schedule` triggers three UTC source receipts for the **same** WSSS Departure FIDS service interval 2026-10-31 17:00–18:00 UTC. Cron choices avoid the top of the hour and precede the **earliest** candidate per-flight cutoff by approximately 53 minutes:

| Candidate horizon | Scheduled provider GET (UTC) | Earliest candidate cutoff (UTC) |
|---|---|---|
| T−24h | 2026-10-30 16:07 | 2026-10-30 17:00 |
| T−6h | 2026-10-31 10:07 | 2026-10-31 11:00 |
| T−90m | 2026-10-31 14:37 | 2026-10-31 15:30 |

**Per slot:** at most one paid Tier2 Airport-FIDS GET (expected **2 API units**), no retry on ambiguous charge, unchanged WSSS scope filters, pre-paid DB INSERT permission+immutability+retention trigger, live budget floor, public contract and future-cutoff checks. Maximum **three physical requests, expected six API units total**. GitHub schedule delays are possible; if execution is later than 15 minutes before that slot's earliest cutoff (or an event is repeated/unauthorized/after the 2026 expiry), fail before paid GET, report missing observation, **never backfill** an earlier cutoff. No open-ended yearly billing: runner's Nov 1 2026 deadline refuses any later cron invocation.

Each successful GET atomically persists original decoded body and population members, checks decoded byte and envelope SHA on readback, then runs the **separate preexisting protected read-only Gate5 census** under a repeatable-read transaction. It reports source observations, cutoff timing, missing/ambiguous scope, snapshot absence and unverified actual target honestly. The repository and protected GitHub environment own all timing; no Cloudflare, Replit shell, manual start timing, or unsafe subscription creation. A failed supplemental read-only audit does not falsely negate an already physically successful billable fetch; inspect independent steps.

## Scientific interpretation

This is a finite **candidate schedule field** T−24/T−6/T−90 source-acquisition experiment, not an independently certified provider-native selected T or actual-only runway target; provider email is supplementary and **not a blocking prerequisite for collecting these observations**. As-of timestamps are from real durable available_at and never backfilled from future revisions. Scope unknown, absent snapshots, missing labels, and incomplete webhook joins remain separately measured, not forced into certified core or perfect coverage. No claim that 55 observations are 55 unique physical flights. The Plan's Gate5 full independent population/horizon/snapshot/capture/outcome funnel and target acceptance remain incomplete; Phase5 final FREEZE and Phase6 collection must not be represented as accomplished by this small pilot.

Next after each scheduled run: record source queries, actual charge, original SHA readback, source-clock precision and candidate denominators in issue #200 or the running implementation evidence. For any missed slot, record the missed fraction/censor rather than manually rewriting the experimental past. Keep next step focused on independent population-capture and horizon snapshot counts.
