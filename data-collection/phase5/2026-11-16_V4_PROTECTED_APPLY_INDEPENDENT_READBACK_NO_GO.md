# November 16 — independently read back the already-staged V4 protected expiry run

Owner receipt (supplied in chat) reports environment reviewer HKcode22, main-only deployment policy, administrative bypass disabled and four exact environment secret names confirmed. Existing distinct APPLY token reused. The staged run is [43830010248](https://github.com/HKcode22/ReplitTranvr/actions/runs/43830010248), verified predecessor [43817297081](https://github.com/HKcode22/ReplitTranvr/actions/runs/43817297081). GitHub job readback independently showed protected-one-batch waiting and prior actual-verify-only successful with both required steps successful. Main verified as e108ef81d3598632fbce5f81a87fd73b48313b61. Do not dispatch another run or change main during execution. No production approval or mutation is implied.

The owner must use the configured protected environment review. Upon terminal state, the new owner-local **GET-only** reader authenticates the exact recorded run, attempt, workflow, commit, previous verify run, successful job and required steps, exact artifact name/id, archive digest and bounded single ZIP entry, stable metadata and aggregate semantic receipt. It reuses the existing 10-object apply validator. Pending, failed or inaccessible proof is NOT authority to retry. A cleared receipt means only the reported due-at-cutoff scope was cleared, not independent IAM/backup certification; remaining backlog requires independent reconciliation, never automatic replay. This reader reports its own zero write/delete counts with the historical apply counters separately under applyReported. It grants no recurring expiry or provider authorization.

Owner readback command from the reviewed checkout containing this candidate, after tests and approval of this reader (no production DB credentials or runtime access used):
```bash
node scripts/v39_phase5_expiry_apply_receipt_readonly_v39.mjs \
  43830010248 e108ef81d3598632fbce5f81a87fd73b48313b61 \
  43817297081 20dc5a31a58ebc85aacf22a7e6164510dedc3b6a \
  bfbfcdc15035995b8d2ed7f4befa1db74d71b7ac
```

No secret changes, new migration, new workflow, republish, paid action or main mutation as part of this candidate. The existing offline expiry contract CI gains real ZIP fixture tests. Candidate CI not yet established at document creation. Scientific freeze remains HOLD; Phase 6 paid NO-GO. The separately preserved first-seed evidence and its eight missing external review fields are unchanged. PR #832 is already merged; see main's November 15 progress and independent first-seed reconciliation files rather than reinstalling or duplicating C+D.
