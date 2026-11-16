# November 16 — independent intermediate B0062 commissioning readback

The existing stage workflow deliberately separates B0062 calendar/disabled authority/UTC base budgets from V0093 cost-only release. The existing independent poststage reader required V0093 rows to exist. This leaves an intermediate commit (including unknown commit result) without its own exact owner readback while distinct cost/source rights approval is pending.

Extend the existing reader and owner-local CLI, not another migration, database role, collector or workflow. Both existing readback modes share exact calendar, authority, eleven Alert safety values, cycle and UTC budget checks. New intermediate mode requires zero V0093 release/category rows, zero source queries/physical attempts, distinct owner actor, primary PG16 READ ONLY transaction, and exact previously reviewed B0062 packet. It derives comparison arithmetic using the existing unsigned cost draft without asserting separate rights or cost approval. Full readback still requires separately reviewed cost hash and V0093 rows. Neither mode authenticates independent human approval or provider rights.

After an actual reviewed calendar commit (or uncertain acknowledgement), use exact clean reviewed main with existing dependencies, existing owner DATABASE_URL, no provider credentials:
```bash
env -u AERODATABOX_API_KEY -u AERODATABOX_WEBHOOK_SECRET -u RAPIDAPI_KEY \
 ADB_AUTO_COLLECT=0 V39_PHASE6_PROCESS_ARMED=0 V39_PHASE6_OWNER_APPROVED=0 \
 V39_P5_APPROVED_CODE_SHA="$(git rev-parse HEAD)" \
 node scripts/v39_phase6_inert_release_stage_manual_v39.mjs --readback-calendar \
 /private/unsigned-stage-input.json <independently-reviewed-stage-sha>
```
Expected first-seed live receipt: 31 calendar rows, one disabled auth, 47 UTC dates, zero category caps/rows and physical attempts. Never regenerate expected bytes from production, never replay an ambiguous write; if any cost or source rows exist, stop and reconcile with the corresponding later-state reader. Only actual separate reviewed source-use scope and cost approval can admit V0093; use unchanged full readback thereafter. No launch approval, actual rights or target evidence created here. #840 merged at 2f86d9a5e0e7d0b730d24e3258f776b2be18fcb2 after 6/6 CI. Original first-seed dates, design and financial allocations remain unchanged. 
