# November 15 Pacific — actual rolling continuation rehearsal and bounded retention I/O

## Real GitHub evidence (not simulation)
Owner launched one root at 2026-11-16 01:27:33Z (Nov15 17:27 Pacific), chain 6f9778cc9fa236e02b8701a2d7e82ba0, original reviewed main 95acf95f0773bae9a904dc109f73cfbf7bb2da39, deadline 01:57:32.208Z. Main was deliberately held until the final run completed. Independent GitHub run/job logs and artifact metadata:

| Hop | Actual run | Job | Observation clocks UTC | Receipt artifact |
|---|---|---|---|---|
| 0 | 43786384018 | 133034862239 | 01:27:47.362 / 01:28:04.684 | 14190377477 |
| 1 | 43786433226 | 133035024307 | 01:28:25.529 / 01:28:42.858 | 14190262996 |
| 2 | 43786491970 | 133035216521 | 01:29:01.431 / 01:29:18.729 | 14190780927 |

All three completed success, attempt1 same exact main. Root and hop1 each emitted ONE_REHEARSAL_SUCCESSOR_ACKNOWLEDGED with exact next run ID, hop2 emitted TERMINAL_REHEARSAL_NO_MORE_DISPATCH, nextRunId null. The independent chain list contains exactly these three runs; final run updated 01:29:23Z. Total 166 read-only GitHub requests, 6 waves × 8 lanes, 2 rehearsal-only workflow dispatches, zero collection dispatches/provider calls/DB reads/DB writes. All six plans HOLD_ROLLING_WAVE_NO_DISPATCH, hypotheticalDue 0: this is an expected nonpaid observation, not proof of authorized production worker execution, no physical label, not 31-day reliability. No re-dispatch needed. Artifact metadata digests respectively 06c11e797adf0d9c1242151b653f90f6304fa673705536cf7883f560bb54b382, e0ce86a8957e8bf40b8cedf5bd758d567c50448a9afdb76fb0d1cf70cf28f232, e3d71811b508e15075041888415a003e0b55a0ba39f0ba32b6f49343bc686989; expires Nov23, save this sanitized evidence. Artifact ZIPs not independently downloaded here; hop1 and hop2 actually verified predecessor receipt as required by reviewed runtime.

#799 merged after 6/6 exact-head workflows (including actual disposable PG16 43785746889), main 1e02c5c1df486cdf684741a5750647b203c30eeb. #800 merged after 8/8 exact-head workflows, main b33c9f5c67fe935900c81a7302a51b694da1cd10. Nonoverlap verified, no role/migration/production mutation.

## Retention I/O correction
The recurring expiry worker now has bounded local object SDK wait (8s per operation default) and poisons the entire storage invocation on uncertain timeout or nonboolean presence; no false cancellation/absence. A timed-out remote delete might still complete: no SQL marker is inferred and no further storage operations in that invocation. Existing scoped deletion STOP path records actual uncertainty and independently reads it, recovery checks absence before issuing another delete. Ordinary 75s monotonic new-candidate admission budget stops only between complete candidates and reports actual backlog, not a failed deletion for normal deferral. Fixed limits not user-configurable in CLI; small timing injections only in tests. Real disposable PG16 tests use genuine existing B0062 trigger and scoped login, simulated storage late completion and independent readback; no actual storage action here. This is not a guarantee of hard process termination or SDK remote cancellation. External process timeout and actual Replit transport/login/key commissioning remain required. No automatic release or repeated old 65-object cleanup.

Important: existing declared TTL may equal the hard contract ceiling; a best-effort timer running only after declared expiry cannot mathematically guarantee deletion by that ceiling. Actual provider policy/backup terms and storage controls must determine an approved operational margin. Do not extend TTL or silently shorten existing frozen scientific access windows. No changed retention terms. Phase5 freeze HOLD/paid Phase6 NO-GO.
