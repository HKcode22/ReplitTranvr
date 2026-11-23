# 2026-11-23 — emergency exact-main restoration after accidental documentation commit

**Status: RESTORED, independently read back. No paid GO granted, no provider calls authorized by this repair, and no signed policy/secret modifications.**

## Incident and exact evidence

- Before incident, the Phase 6 signed/reviewed production main SHA was `c8e065d665ccacb6d2575070e94c5500b7583044`. The approved relay main was `c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed`.
- Accidental `main` advance at 2026-11-23T08:47:45Z to `0369f88ba361ff8f97a352b9d438ee5bcf59af57`, single commit `docs(phase6): comprehensive Gates 1-8 explainer and Day 1 operations manual`, whose only changed file (140 additions) was `data-collection/phase6/checkpoints/2026-11-23_PHASE6_GATES_1_THROUGH_8_EXPLAINER_AND_OPERATIONS_MANUAL.md`. Compare original c8 ... 0369: status ahead, ahead_by=1, behind_by=0, total_commits=1; changed file count exactly one.
- This documentation-only SHA change is nevertheless a **signed-source release blocker** because fixed Gate 13 launcher and protected workers pin exact production code SHA c8. Do NOT repin policy or manually enable paid flags for such a change.
- Before restoring main, preserved full accidental commit and its documentation on **independent branch** `phase6/20261123-preserved-accidental-docs-main-0369f88` at exact SHA `0369f88ba361ff8f97a352b9d438ee5bcf59af57`.
- Moved `refs/heads/main` to `c8e065d665ccacb6d2575070e94c5500b7583044` with an explicit compare-and-swap `expected_sha=0369f88ba361ff8f97a352b9d438ee5bcf59af57` and `force=true`, **not** an unguarded destructive reset. GitHub action returned `success=true`.
- Independent live ref readback confirms target main exactly c8, preserved branch exactly 0369, relay main exactly c5.

## Safety and scope

- **G12 stays CLOSED PASS**: canonical 31-value repository readback [45123278530](https://github.com/HKcode22/ReplitTranvr/actions/runs/45123278530), protected four POST actors [45125753815](https://github.com/HKcode22/ReplitTranvr/actions/runs/45125753815). Neither installer nor environment repair was repeated.
- Incident window created no changes to main code, workflows, data contract, source retention/rights policy, protected secrets, linked digest metadata, quotas or cron. No new provider or DB writes were issued by the GitHub ref change; readbacks and checkpoint writes used repository control-plane only.
- Nonpaid `Phase6 autonomous GitHub controller heartbeat` [45141643784](https://github.com/HKcode22/ReplitTranvr/actions/runs/45141643784) ran on temporary docs SHA and succeeded; retention backstop [45141542474](https://github.com/HKcode22/ReplitTranvr/actions/runs/45141542474) also succeeded on temporary docs SHA. These are historical runs, not signed paid SOURCE authority. The accidental SHA's full offline safety run [45141520441](https://github.com/HKcode22/ReplitTranvr/actions/runs/45141520441) was still in progress at restoration readback; do not treat it as current-main CI.
- Exact restored current-main push CI was newly triggered ([45142434670](https://github.com/HKcode22/ReplitTranvr/actions/runs/45142434670) full offline safety and [45142434549](https://github.com/HKcode22/ReplitTranvr/actions/runs/45142434549) private-data guard) and initially in progress. Inspect their final conclusions before claiming latest post-restoration CI PASS. Previously existing exact-c8 complete safety [45115427067](https://github.com/HKcode22/ReplitTranvr/actions/runs/45115427067) PASS remains valid for the same exact main tree.
- G13 paid GO is still pending the original signed Monday 21:50Z to strictly before 23:10Z owner action. G9 DIRECT_TICK only after G13 and at/after 23:45Z. No acceleration, no backdating, no extra gate.

## Prevent recurrence

Publish new checkpoints to branch `phase6/20261122-g8-502-readback-evidence` or a reviewed PR, **not directly to production main** during the exact-SHA-pinned 31-day run. Before any `git push`, inspect target `git branch --show-current`, `git status`, and remote main. Do not use `git push --force` without compare-and-swap and known exact one-commit change; do not rerun this restoration if main has since advanced.

**Owner intervention after this repair: no manual GitHub command necessary.** Continue to verify fresh Gate 13 predicates at permitted launch time; abort if any new SHA drift or real production safety hold occurs.