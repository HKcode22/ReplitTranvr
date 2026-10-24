# Gate 4 — historical writer retirement and next-scoped writer review checkpoint

Date: 2026-10-23 Pacific (2026-10-24 UTC). Stage: REVIEW-ONLY; NOT commissioned.

## Evidence and source
- Protected first WSSS subscription was previously stopped by independent GitHub Actions run [40044881981](https://github.com/HKcode22/ReplitTranvr/actions/runs/40044881981); subsequent 3 account observations found 2037 credits and no active billables. This is historical, not a fresh live snapshot.
- The user-provided Replit Shell terminal receipt reports `GATE4_WRITER_DISABLED_AND_GRANTS_REVOKED`, role `gate4_owner_writer_20261023`, `providerRequests:0` from reviewed main `fe74ec22b7794cf4f5fb08bdf4b4b98f714b7ed4`. The command checked successful main CI [40057475119](https://github.com/HKcode22/ReplitTranvr/actions/runs/40057475119) and reviewed blob `03a70ce4e8882e98e5d99cd853421c7e376fca6f`. This is a command success report; post-commit independent production read-only verification is still required.
- The first trial created one genuine positive owned Alert subscription binding but observed no genuine paid-window V0071 original. One synthetic historic V0071 row remains evidence, not a paid delivery. Gate 4 live delivery is INCONCLUSIVE, not scientifically PASS or a demonstrated loss.
- Earlier preparation [checkpoint](2026-10-23_GATE4_SECOND_SCOPE_PREPARATION_APPROVAL_BOUNDARIES.md) and [finite closeout plan](2026-10-23_GATE4_PAID_ALERT_LIVE_DELIVERY_FINITE_CLOSEOUT_PLAN.md) remain controlling.

## New review-only correction
- Original second-writer RLS planner expected three policies, including the two historical writer policies explicitly dropped by the successfully reported retirement. This mismatch would HOLD any legitimate post-retirement scope.
- The revised pure planner requires historical writer role still exists but `rolcanlogin=false`, exact surviving `gate4_safety_select_v39` RLS policy only, one preserved prior owner binding, zero other bindings, RLS enabled, and a distinct next UUID/AUTH/receiver SHA/role; it still produces only proposed SQL, with NO database IO, credentials, provider requests, republish, STOP dispatch or spending.
- Focused negative tests refuse an enabled historical login, lingering stale writer policies, extra policies, unexpected owner rows or unsafe identifiers.
- Review branch: `research/gate4-postretirement-rls-20261023`; source commits `0873a4e0b673f47b281c398a04b505645710308a` and `8a1d4da57b2c346795f477594887af8945881adf`. CI validation required; no assertion yet of CI PASS for this branch.

## Next exact start
1. Run latest main read-only owner inventory (no secrets printed) after retirement and independently confirm old owned=1, other owned=0, old synthetic original>=1, old writer exists but login DISABLED, RLS enabled, exactly one safety reader policy. If any difference, HOLD and reconcile; never retroactively rewrite receipts.
2. Review this correction and its GitHub CI; do not merge if failing. Check independent safety reader still has SELECT and the original row remains; no direct production access was used by the connector.
3. Design actual new-role commissioning **separately** with expiring distinct password, NOINHERIT/NOBYPASSRLS, restrictive V0072 RLS, transaction readback, rollback, credential confinement. Review separate V0071 receiver scoping and published WSSS receiver compatibility; existing planner is not an executable migration.
4. New AUTH ledger, UUID, source pins, UTC start/stop, independently protected live STOP, current provider baseline and realistic soft spend/exposure threshold all need distinct owner approval. User earlier approved preparation ONLY.
5. Only after a specifically approved production change and separate final paid GO may one fresh WSSS Alert CREATE occur. Retire subsequent writer after reconciliation. No Phase4 start until Gate4 scientific disposition or explicit scope change.

**Prohibited now:** rerun old `--apply`, old `--execute-one`, old authorizations, old signed STOP/CREATE intent; no paid CREATE/DELETE/GET, unreviewed DDL, protected variable changes, Replit republish, or Phase 4 operations.
