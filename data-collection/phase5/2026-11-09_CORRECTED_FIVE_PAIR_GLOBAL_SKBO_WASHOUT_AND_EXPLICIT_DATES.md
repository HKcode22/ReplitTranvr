# Phase 5 — real corrected five-pair SKBO cross-pair washout defect

**Prepared:** 2026-11-09 UTC. **Scope:** independently reviewed source-backed *offline calendar correctness*, not Phase5 science FREEZE, released UTC dates or paid Phase6 GO.

## Specific evidence / why the existing calendar design is wrong

The actual owner production corrected sample, archived in PR #503, SHA-256 f5112a9ca432d9d3fede96a9805030d68e05ced5a19d029aa896805746c21592, includes **SKBO twice**: pair 4 HUB and pair 5 HUB. This is allowable in a four-HUB, five-crossover experiment, **but only when repeated-airport washout is at least 24h from the previous window END to the next START, irrespective of which crossover pair owns the two windows**.

The original six-slot weekly calendar template plus the frozen region/calendar-seed treatment-order draft gives:

- **Run 4:** SKBO pair-4 period-1, up-to-6h from Thursday 12:00 to 18:00 UTC.
- **Run 5:** SKBO pair-5 period-1, up-to-6h from Friday 16:00 to 22:00 UTC.
- **Actual rest interval: 22 hours**, not 24. Example Nov 26 / Nov 27 dates are from a **synthetic 2026-11-23 test start**, *not* a Phase6 live calendar.

Old experimentCalendarSolver_v39.ts validated each pair against its own second period but did not detect different pairs repeating the same airport. That allowed an incorrect mathematical SAT in the real corrected pair sample while no live run or provider traffic occurred. This is a **prospective hard design constraint**, not model outcome optimization, airport substitution or a flaw in the frozen B0062 airport selection.

## Narrow engineering fix

1. The offline calendar validator now walks every **known paired airport occurrence across all 31 run days**, computing the planned latest END from the actual service-window geometry: 4h, 2×2h with 60-minute excluded gap (5h wall clock), and up-to-6h (6h maximum). If an ICAO is reused under 24h after its most recent known END, return UNSAT with run numbers, airport and repeated-airport-specific reason. Also reject overlapping or nonchronological parent service windows.
2. A full 31-entry **reviewedRunDatesByIndex** ISO UTC date override is now available. It refuses partial, duplicated, impossible or pre-start dates. No automatic shift is performed: external reviewers must provide *all* candidate dates explicitly, after checking weekday/time class, source availability and credit math. A mathematical SAT does not create an independent Phase5 freeze, source-use rights or Phase6 activation.
3. Regression tests load the actual corrected owner JSON, check its exact SHA, show the 22-hour SKBO failure and show a safe **widely spaced synthetic date fixture** can pass without changing airports, seeds, treatments or any production database record. Prior three/four/five-anchor solver regression fixtures use explicit **synthetic** spaced dates, not its hidden unsafe date defaults.
4. Ordinary future airports are adaptive and **not selected yet**; the known-pair-only static check cannot certify their washout. Real early-draw scheduling must recheck prior selected airports using database-backed planned ends.

The unchanged real candidate groups are:
1. OMAA / OMSJ / SPJC / KDEC
2. WSSS / SBFL / TJSJ / LSZB
3. YSSY / KBUF / LFQQ / NZNP
4. SKBO / EBAW / NZNS / RJNK
5. SKBO / YBUD / RKTU / FAKM

## Next release-critical tasks

Provide a **real feasible 31-parent-batch-day calendar** (not necessarily consecutive dates), with five within-pair weekday/time-class/airport replays, fixed 24h END-to-START washout across **all** known pair sites, six UTC rotations, complete source horizon grid, actual provider FIDS service-range bounds and seven-category *physical UTC charge-day* REST budget. Reconcile seasonal/zero-passenger schedule and source evidence uniformly across all sites without cherry-picking new airports. Independently verify GitHub SOURCE producer→raw original→three cutoff-safe PRE→POST/receiver/STOP and lawful Contents retention; vendor email replies are not prerequisites for offline implementation, but unproved rights are not a release PASS. Only one independent Phase5 science FREEZE verdict and separate paid GO may activate Phase6.

**Boundaries:** no provider HTTP, credit spend, production database writes or signed study dates; historical five-HUB Gate2 and YSSY P25 scientific failure not rewritten. Do not rerun historical P25 work, V0079–V0083 installation, four-HUB census, 48 shortlist or original five-pair draw. Source checkpoints: Phase5 README, PR #503 real corrected evidence, PR #504 public seasonal screen, issue #416, Plan f.8 §8.7.

**Review correction from CI:** The solver hashes the JSON serialization of its seed string, not the plain string. This makes **pair4 and pair5 alternative-first**, so the violating 22h span is **period 1 run4→run5**, not their second periods run10→run11. The initial review wording was corrected before merge; negative tests enforce the actual hash implementation. Fictional MID_A/MID_B codes in unit tests remain permitted only in the pure mathematical solver, while real B0062 membership/ICAO validity must be checked separately before a signed run.
