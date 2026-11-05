# Phase 4 Gate 5 — Nov 6 09Z WSSS T−24h canceled owner, exact zero-spend recovery

**Incident (observed live):** Wed November 4, 2026, 21:10–21:39 PST (Thu Nov 5, 05:10–05:39 UTC). The user manually canceled GitHub [run 41972339194](https://github.com/HKcode22/ReplitTranvr/actions/runs/41972339194), job 127063231967, on SHA `a509e336d50afd69e497595c6820c5b053693a5e`. GitHub job-log download independently confirmed `G5A_GITHUB_OWNER_PREARMED_V0076_ACTIVE`, three planned source slots, zero paid source attempts **at 05:11 UTC**, then `The operation was canceled` at 05:39 UTC. **Log zero at prearm is not proof that the live production ledger still has zero reservations**; read database independently before any handoff.

**The GitHub main red-X misunderstanding:** PR #401 fixed a genuine old foreign-budget veto, independently tested on PostgreSQL. PRs #402/#403 corrected separate disposable-PG16 push-event CI assertions; postmerge push PG16 #41973250688 and V3.9 Safety #41973250700 completed SUCCESS. The canceled runner had checked out an older SHA only because Actions pin the code at job start. It did not fail due to that old SHA; cancellation interrupted a running ACTIVE owner. A newer commit is not grounds to erase existing immutable owner.

**Frozen cohort:** `WSSS_G5A_20261106_0900Z`, manifest SHA-256 `7fe022a475447a082e1ccddd3805a5ad554f03885401afb22ee283a2a1b90aed`. Wed PST eligible prospective T−24h prearm closes 23:30 PST (Nov 5 07:30Z). First three physical T−24h slots Thu Nov5 **00:30,01:00,01:30 PST** (08:30,09:00,09:30Z). Source 3×3 plus POST max 12 distinct physical GETs, each 2 internal REST units, 24-unit cohort ceiling. No posthoc freeze change, fee refunds, retroactive PRE, source replay or duplicate GET.

## One-time engineering repair (PR #404, not evidence of release)

Code on [PR #404](https://github.com/HKcode22/ReplitTranvr/pull/404) introduces **one narrowly scoped delegation** from this exact completed CANCELLED original owner to a new GitHub-attested T−24h runner, without changing the original V0076 row or ledger. Its admission verifies:

1. The immutable canceled original GitHub run, job ID, main branch, exact pinned SHA, event, attempt, chronology and `cancelled` conclusion, **finished before** the first paid source slot.
2. A verified different real GitHub runner whose actual job start is within the frozen prospective prearm window.
3. Original production V0076 ACTIVE owner, three exact planned query digests/ordinals/cutoffs, the previously stored original run authorization hash and start timestamp.
4. **Zero** production V0076 physical reservations, every `last_reserved_attempt=0`, **zero** already reserved units, and 24-unit ceiling. No inferred refund or reset.
5. A dedicated PostgreSQL **session advisory lock** `(76,60906)` to prevent simultaneous delegated backup jobs; after idle connection replacement, the delegate must reacquire it or stop without spending.

The original V0076 source owner ID is retained for existing immutable reservation/V0077 SQL custody, while both the **original canceled run and the actual new delegate run** are explicitly logged in the recovered execution. Independent scientific auditing must preserve and verify the two-run delegation chain; never misstate the original canceled GitHub runner as the one physically issuing future HTTP requests.

**Recovery not yet proven:** PR CI passing is necessary, not sufficient. A read-only production ledger check must prove the exact zero-spend preconditions; if any evidence is missing, STOP and classify the earlier T−24h path incomplete, rather than weakening checks or dispatching repeatedly. PR #404 was merged to main as `77f7b6e28db1288f88bbc17cd1ded4ffdaadeb76` after **5/5 exact-head CI success** (including V3.9 full offline safety); no paid job was dispatched by the merge itself. Do not start a new job if the production readback is HOLD, an existing delegate is active, or any required GitHub proof is missing. GitHub `workflow_dispatch` is available only to a merged reviewed main workflow, not as a way to bypass a failed check.

## Current scientific verdict

**G5A Gate 5 = HOLD**, not PASS. This canceled run produced a genuine V0076 prearm but no confirmed durable FIDS original+V0077 binding or prospective PRE. T−6h, T−90m, POST, webhook inside/outside/unresolved, denominator/unknown rates, actual provider billing and final independent audit are pending. An authentic incomplete horizon remains `UNOBSERVED`, never a fabricated negative. The amended target is provider-reported schedule revision, *not* actual wheels-off; original strict actual runway-label target remains unverified.

Authority: [binding original Plan f.8](../plans/V3.9_DataCollectPlan_f.8.md) §§5/6/16/17, [Implementation Log](../implementation/V3.9_IMPLEMENTATION_LOG.md) §1.9, [G5A prospective amendment](2026-11-03_G5A_PROSPECTIVE_PROVIDER_OBSERVABLE_PROTOCOL_AMENDMENT.md), [owner no-perfection directive](2026-11-03_OWNER_DIRECTIVE_NO_PERFECTION_LOOP_FAST_SCIENTIFIC_GATE5_CLOSURE.md), and [live incident / outcomes issue #293](https://github.com/HKcode22/ReplitTranvr/issues/293).

**Do not reinstall V0076–V0078, repeat role grants, or resurrect earlier Nov5/Nov7 paid jobs. No new source attempt until exact ledger and GitHub proof permit a reviewed continuation.**
