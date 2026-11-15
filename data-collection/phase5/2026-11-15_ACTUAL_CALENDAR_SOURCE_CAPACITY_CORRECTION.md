# Actual first-seed SOURCE capacity correction, November 15

Original preview artifact 14156057606 independently downloaded again and raw calendar-preview.json SHA256 003885e93f3a3daa1098f648502c5a7dd3beb6e317e906ffe281760aaba763af reproduced. Exact nominal request list: 6,144 instances across 31 parent days; maximum same planned minute 8; peak fixed UTC hour 28. Current 10-minute stored dispatcher gives 4 submissions/tick, 8 active children and 15–105 minute lead. Some children occupy a slot waiting for their prospective request; one-GET attempt/budget protection stays unchanged. 

Idealized deterministic earliest-due capacity simulation (constant tick-phase offset 0–9 minutes; exact nominal request clocks; child remains active through nominal request + assumed completion tail). No delayed/missed scheduler tick, API request latency, registry availability, postcommit signer contention, quota or flight yield modeled.

| Tail | Current worst misses out of 6144 | Proposed worst misses |
|---|---:|---:|
| 0 minutes | 80 | 0 |
| 5 minutes | 80 | 0 |
| 15 minutes | 1956 | 0 |
| 25 minutes | 3096 | 16 |
| 35 minutes | 3096 | 16 |
| 60 minutes | 3832 | 80 |

Current aligned zero-offset tail 15m misses 1584. Proposed exact fixed stored profile 8 per tick, 24 globally active, 15–35m prearm lead. No extra cron or requests; original 10m parent, two-day bound, per-query unique child, authenticated signatures, current SQL/budget/STOP/replay handling untouched. Existing static read-only route stays 4/105. Capacity applied consistently in day selection, signed candidate limit and actual dispatch, under exact independently approved code SHA. Existing complete 500-workflow rolling history cap remains. Reuse old one-GET worker; no new collector, migration or roles. 

Not a guarantee of 100% capture; operation must quantify actual dispatch slip, child runtime, GitHub concurrency/quota, provider latency and native signer contention. This corrects a demonstrable capacity mismatch without expanding study budget. Candidate only pending CI and separate signed release; Phase5 FREEZE HOLD and Phase6 paid NO-GO.
