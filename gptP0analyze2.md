I re-checked the **new GitHub push**, the newest Run Report, and the binding Implementation Log.

The repository has improved substantially, but my verdict is still:

> **NO-GO for Phase 1 right now.**
>
> **Phase 0 is still not fully closed.**
>
> This is no longer a methodology/research problem. The V3.9 scientific design remains strong. The remaining problems are **production wiring, safety enforcement, and closure-evidence contradictions**.

The newest GitHub HEAD I see is now:

`8a2f424c1f4013e6b0d41412605636b76dc77fba`

That is one commit newer than `ddbb379a...`.

Your new report does contain RUN-20260908-003 and RUN-20260908-004, which attempted to address exactly the problems from my last review.  The fixes to the canary, OOOI aliases, paid-command mappings, evaluation guard, persistence writers, counters, and tail/route logic are genuine improvements. 

But I found several things that still prevent Phase-0 closure.

## Current verdict

| Area                                 | Current verdict                         |
| ------------------------------------ | --------------------------------------- |
| Scientific V3.9 design               | ✅ **Strong / keep it**                  |
| Tests/typecheck/lint/build           | ✅ Very good                             |
| Phase-0 helper/module implementation | ✅ Mostly complete                       |
| Production wiring                    | ❌ **Still incomplete**                  |
| Paid safety/refusal architecture     | ❌ **Still incomplete**                  |
| Phase-0 aggregate preflight          | ❌ **Cannot currently PASS as coded**    |
| Current-HEAD evidence closure        | ❌ **Not established for `8a2f424c...`** |
| **Start Phase 1?**                   | 🔴 **NO-GO**                            |

I would put Phase 0 at roughly **85–90%**, rather than the ~60–70% state it was in before the latest fixes.

---

# 1. CRITICAL — the collection controller still does not use shared settlement

This was one of the primary findings from my previous audit.

Your report says it was fixed:

> controller uses `reconcileSpend(tol=0)` and a new budget-day helper. 

But the actual current controller still does this in `stopBatch()`:

1. deletes subscriptions;
2. calls **one** `getBalance()`;
3. immediately calculates the balance delta;
4. calls `reconcileSpend()`.

It does **not** call `runSettlement()`.

So you changed:

`tol=3 → tol=0`

but you did **not** finish:

`single balance read → ≥3 stable balance reads`.

The binding Log explicitly requires:

> at least three consecutive equal reads, change resets stability, timeout → `SETTLEMENT_UNRESOLVED`, and **the same service must be used by smoke/probe/canary/controller/gates**.

The current controller is therefore still violating Phase 0K.

### Severity

**P0 — CRITICAL**

### Required fix

`stopBatch()` must use the same `runSettlement()` path the canary now uses:

```text
delete/inactivate owned subscriptions
        ↓
runSettlement(...)
        ↓
B_stable
        ↓
C_external = B_before - B_stable
        ↓
immutable internal SEND accounting
        ↓
reconcile
        ↓
PASS / MISMATCH / SETTLEMENT_UNRESOLVED
```

Your own newest report actually acknowledges this remains:

> “settlement adoption into controller/probe paths” is still remaining. 

That alone means I cannot call Phase 0 complete.

---

# 2. CRITICAL — the production controller still uses UTC-day accounting

The new controller added:

```ts
budgetDayIdForBatch(batchSeq)
```

which is good.

But the actual **admission and watchdog logic does not use it**.

`startBatchInner()` still calculates:

```text
creditsUsedTodayUtc()
dailyRemaining
dailyCreditCap
"Wait for the next UTC day"
```

And the watchdog still says:

```text
one auto-started batch per UTC day
today's actual spend
waiting for the next UTC day
```

The current source still uses the old UTC-day logic in the actual enforcement path.

Your V3.9 rule is:

```text
budget_day_id = run_day_index / owning parent experiment day

NOT:
YYYY-MM-DD UTC
```

The helper being present isn't enough if production admission continues calling `creditsUsedTodayUtc()`.

### Severity

**P0 — CRITICAL**

### Required fix

Replace the actual admission/watchdog arithmetic with the immutable experiment budget-day ledger.

`creditsUsedTodayUtc()` can remain only as a diagnostic if useful; it cannot be authoritative V3.9 admission logic.

---

# 3. CRITICAL — watchdog can still delete foreign subscriptions

This is especially important.

Current `cleanupOrphanSubscriptions()` does this:

```ts
for (const s of subs) {
    if (keep.has(s.id)) continue;
    await deleteSubscription(s.id);
}
```

Meaning:

> anything AeroDataBox returns that is not attached to the current active batch gets deleted.

And the watchdog invokes this when nothing is active:

```ts
await cleanupOrphanSubscriptions();
await maybeAutoStartNextBatch();
```

Worse, `registerV3Routes()` starts the watchdog automatically during application startup.

Therefore:

### Even when `ADB_AUTO_COLLECT=0`

the watchdog can still perform a provider mutation:

```text
list subscriptions
↓
no active experimental batch
↓
delete subscriptions it doesn't recognize
```

Your binding Log explicitly forbids loose/broad cleanup and requires **zero outbound provider mutation** during pre-Phase-6 startup/refusal cases.

This could potentially delete a legitimate unrelated AeroDataBox subscription.

### Severity

**P0 — CRITICAL**

### Required behavior

Foreign subscription:

```text
detect
↓
record
↓
REFUSE / BLOCK
↓
human/owned cleanup procedure
```

not:

```text
detect
↓
delete automatically
```

Only a positively proven experiment-owned subscription should ever be deleted automatically.

---

# 4. CRITICAL — direct HTTP routes can bypass the Phase-6/AUTH state machine

This is a new important finding from the deeper pass.

The collection path now has:

```ts
if (!isPhase6Ready()) REFUSE
```

Good.

But the direct management route:

```text
POST /api/v1/subscriptions/webhook
```

still directly invokes:

```ts
createSubscription(...)
```

without checking:

* `PHASE6_READY`
* manifest
* experiment phase
* exact AUTH
* budget reservation
* predecessor gates

 

Even more consequential, this route:

```text
POST /api/v1/subscriptions/balance/refill
```

can still directly call:

```ts
refillBalance(credits)
```

without the separate refill AUTH your plan requires. 

And arbitrary subscription deletion is exposed through:

```text
DELETE /api/v1/subscriptions/webhook/:id
```

again without the V3.9 experiment authorization state machine. 

Your Log explicitly says:

> “Manual/admin routes cannot bypass the canonical authorization/state machine.”

Currently they can.

### Severity

**P0 — CRITICAL**

These endpoints need to either:

* be completely disabled for experimental/provider mutation during PREP, or
* go through the same exact authorization/admission service.

---

# 5. CRITICAL — raw-item persistence can STILL silently fail

This one is subtle.

Your report says this was fixed:

> item persistence failure now returns 5xx. 

And `routes_v3.ts` now has a nice-looking:

```ts
try {
    await persistRawDeliveryItems(...)
} catch {
    return 500
}
```



But the function being called currently does this internally:

```ts
export async function persistRawDeliveryItems(...) {
    try {
        ...
    } catch (err) {
        console.error(...)
        return 0;
    }
}
```

It **swallows its own exception** and returns `0`.

Therefore the route's `catch` never runs.

The real behavior is still:

```text
raw item INSERT fails
↓
persistRawDeliveryItems catches it
↓
returns 0
↓
routes_v3 thinks call succeeded
↓
continues semantic processing
↓
can eventually send 200
```

That violates the exact raw-before-2xx safety requirement.

This also means your structural source-order test did not catch the actual failure semantics. Your newest report itself correctly describes that structural test as weaker than runtime integration. 

### Severity

**P0 — CRITICAL**

### Fix

`persistRawDeliveryItems()` should **throw on persistence failure**, or return a typed failure result that the caller is required to refuse.

Do not silently return `0`.

---

# 6. MAJOR — anchor probe is still the old implementation

The AUTH wrapper was a good improvement.

But once the wrapper eventually allows execution, it delegates to the old `anchor_probe.ts`.

That underlying script still uses:

```ts
creditsUsedTodayUtc()
```

and explicitly says its probe cap is per UTC day. 

After a probe it still does:

```ts
await sleep(10_000);
const balAfter = await getBalance();
```

which is the old fixed wait + single read approach. 

It also still contains:

```text
--cleanup --force
```

and when `--force` is used it deletes untracked active credit subscriptions. 

Your Log explicitly says the current probe must use:

* immutable probe budget day;
* 500 cumulative cap;
* shared settlement;
* exact accounting;
* ownership-aware cleanup;
* complete bucket stability;
* ambiguity bounds;
* censoring;
* rank-invariance evidence.

The current `anchor_probe.ts` is still visibly the legacy implementation.

### Severity

**P0/P1 — MAJOR, becoming CRITICAL before the first paid probe**

You don't need to run the probe in Phase 0, but the **production runner must be implemented correctly before Phase 0 is declared finished**.

---

# 7. MAJOR — AUTH guard is safe, but not actually implemented yet

The wrapper now calls:

```ts
enforcePaidGuard(...)
```

Good.

But `enforcePaidGuard()` currently does:

```ts
if malformed:
    exit(2)

then:

console.error("no verified AUTH record ...")
process.exit(2)
```

for **every** syntactically valid AUTH too.

There is no:

```text
lookup AUTH record
verify hash
verify phase/gate
verify expiry
verify airport/window
verify budgets
verify predecessor evidence
return success
```

So the wrappers cannot ever transition from:

```text
REFUSE
```

to:

```text
AUTHORIZED EXECUTION
```

without another code change.

The Stage-1 wrapper even says:

> “If the guard ever passes…”

but currently the guard has no code path that can pass.

### Severity

**P1 — MAJOR**

Safe is good, but Phase 0 needs the authorization machinery **implemented**, not merely “refuse everything until we code it later.”

---

# 8. MAJOR — aggregate preflight currently cannot pass

The updated preflight now correctly includes:

```text
security:verify
```

But the current security verifier contains:

```ts
{
    name: "real-terms-verified",
    pass: false
}
```

unconditionally.

Therefore:

```text
npm run v39:security:verify
→ exit 1
```

which means:

```text
npm run v39:preflight
→ FAIL
```

every time.

So the Run Report's idea that aggregate preflight is green cannot be true for the **current code as written**.

This is partly a design separation problem:

* Phase 0 should verify **security/retention machinery**.
* Phase 2 prerequisite P verifies **actual provider Terms/legal rights**.

Those need separate statuses.

The current script mixes them together and consequently makes Phase-0 aggregate preflight impossible to pass.

### Severity

**P1 — MAJOR closure blocker**

---

# 9. MAJOR — current HEAD is not the HEAD in the closure report

RUN-20260908-004 reports:

```text
git_inspected_commit:
ddbb379a91dc58639bf92e5a7dc1e10803af41d9
```



But GitHub `main` now contains:

```text
8a2f424c1f4013e6b0d41412605636b76dc77fba
```

The new commit contains the actual fixes.

The binding Phase-0Q rule explicitly requires closure on:

> **one current HEAD/schema/config**, with current HEAD/worktree/schema/config/artifact hashes recorded.

So even after fixing the items above, you need one final clean closure report against exactly:

```text
8a2f424c...
```

or whatever the final repair commit becomes.

### Severity

**P1 — MAJOR procedural/evidence blocker**

Easy to fix, but mandatory.

---

# 10. The report itself still tells us Phase 0 isn't actually complete

RUN-004 says:

> “Remaining: DB persistence execution, 0D join wiring, settlement adoption into controller/probe paths, provider fetchers…” 

Those are not all “Gate-future values.”

Some are explicitly Phase-0 production wiring.

Your binding Log requires:

```text
PHASE 0
→ implement and production-wire R1–R7
→ implement and production-wire S1–S5
```

and Phase 0Q only closes after the full matrix is complete.

So I disagree with the report's present conclusion that:

```text
0A–0Q complete
```

while those production-wiring items remain.

---

# What got fixed correctly

A lot of my previous findings **were genuinely corrected**, so I don't want to understate the progress.

These now look substantially better:

* ✅ paid V3.9 command mappings are no longer direct legacy aliases;
* ✅ Gate-3 canary now uses `runSettlement()`;
* ✅ canary tolerance is `0`;
* ✅ canary TDZ `sub?.id` bug was removed;
* ✅ `PHASE6_READY` now protects `startBatch()`;
* ✅ stale f.6 manifest call was disabled;
* ✅ OOOI guessed fields were nulled;
* ✅ evaluation guard now exists;
* ✅ 340 tests reported green;
* ✅ typecheck = 0;
* ✅ lint = 0 errors;
* ✅ build = 0;
* ✅ snapshot/outcome persistence functions exist;
* ✅ PRE counters and scope logic exist;
* ✅ route/tail identity helpers were added.

Those were real improvements. 

So the latest work was definitely productive.

---

# My ranking now

I would grade it like this:

| Dimension                               | Before last fixes |           Now |
| --------------------------------------- | ----------------: | ------------: |
| Scientific design                       |                 A |         **A** |
| Offline module implementation           |                B+ |        **A−** |
| Unit-test coverage                      |                A− |         **A** |
| Production safety wiring                |                C+ |        **B−** |
| Accounting/settlement production wiring |                 C |     **C+/B−** |
| Phase-0 evidence closure                |                C+ |        **B−** |
| Ready for Phase 1                       |                 ❌ | **❌ not yet** |

The remaining defects are much more localized now.

I count approximately:

* **5 clear P0/critical blockers**
* **4 P1/major closure blockers**
* no reason to redesign the scientific plan.

---

# Exact repair list before you bring it back again

I would give your coding agent this sequence:

1. **Fix raw-item persistence failure propagation** — item write failure must reach the route and prevent 2xx.
2. **Fix controller settlement** — use `runSettlement()` after stop; no single balance read.
3. **Replace production UTC-day admission/soft-stop arithmetic with immutable `budget_day_id`.**
4. **Remove watchdog broad deletion.** Only delete positively owned subscriptions; foreign = REFUSE.
5. **Gate all management mutations** — subscription create/delete/refill must go through the experiment authorization/state machine.
6. **Finish `anchor_probe.ts`** — shared settlement, immutable probe budget day, no `--force`, correct censoring/stability/accounting/evidence.
7. **Implement real AUTH-record verification** so the paid guard has a legitimate success path.
8. **Separate Phase-0 security machinery from Phase-2 Terms verification** so aggregate Phase-0 preflight can truthfully pass while real provider rights remain pending for prerequisite P.
9. Finish the report-admitted **0D join/persistence production wiring** that the Log assigns to Phase 0.
10. Commit everything, ensure clean worktree, then run the **entire Phase-0Q suite on that final exact commit** and generate a new single closure report with exact SHA/schema/config/hashes.

Then stop and bring that report back.

If those ten things are genuinely closed, I would expect the next review to be the actual **GO into Phase 1 / Gate 0**.

For now: **do not start Phase 1 yet.** The project is much closer, but starting Gate 0 while the binding Phase-0 contract still has these production-path gaps would repeat the exact kind of premature PASS we designed the checkpoint to prevent.
