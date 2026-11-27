# Phase5B continuation — T102 restricted SQL and T103 uncertain cleanup (Nov26 23:44 PST)

## Evidence

- Exact production main `c2bb8e18dfcf64ea815745da59ede62f53e448bb` and #979 OPEN head `bce39a3dcc179c96101363afde628e24424488e2` at inspection; no owner completion receipt. Main in-progress listing reported 6 total, returned 5 SOURCE rows, all admitted before pause; do not infer full custody or cancellation safety from this partial listing. Previous #413 records owner pause 06:38Z and independent retention 45955647197 success. Preserve current owner process.
- #980 parent `93bb31958fc374b74fc90fb2f22ada5019a86f85` added tsx runner for actual T102 restricted PostgreSQL SQL regression after earlier fixture implementation. Exact parent CI queued/in progress at inspection. Historical 0f59f811 all 23 returned PR workflow runs successful; that is not acceptance of successor.
- Read main and follow-on AGENTS, register, #413, priority/science crosswalk, adopted freeze, Packet A/B parity, E, C+D, runtime scope and f.8 relevant binding sections. Preserve signed Day4 original first request 11:45Z Nov27 and prearm 10:15Z; Day5 only if prospectively unsigned and reviewed. No new paid scope.

## Repair and acceptance

F048 is a newly identified candidate-only defect, not an observed production incident. I108 read-only transaction cleanup previously suppressed ROLLBACK failure, then normal release could expose an uncertain connection to the pool and allow a success receipt. Unknown BEGIN also released normally. I109 changes only conditionalPreparedRead: acknowledge rollback before success; on rollback failure destroy client and throw fixed redacted HOLD, on BEGIN ambiguity destroy client, otherwise preserve original error and clean reuse. T103 tests positive, BEGIN failure, ROLLBACK failure, timeout/read errors with and without rollback failure, and exact discard/reuse counts. T102 actual PG16 fixture already tests production-shaped restricted SELECT, permission refusal, normal rollback and reuse. Neither tests actual protected credentials or production PRE.

## Science and operations

No change to original sampling, signed dates/cutoffs, 16 feature dispositions, separate purpose-bound identifiers, actual same-milestone gate-out primary and conditional schedule-revision tier, 20/5/6 chronological split, V0087 bounded leases, Packet A custody/expiry or Packet B approved derived release. No provider calls, DB writes, role grants, signatures, runtime changes, merges or paid dispatch by this commit. Exact new CI and actual independent deployment required. F017 remains repeated provider no-content with cause unknown; F005/F027 remain no demonstrated actual eligible PRE and pending conditional commissioning. Do not use a new owner command until active #979 outcome and pins are reconciled. No new gate.
