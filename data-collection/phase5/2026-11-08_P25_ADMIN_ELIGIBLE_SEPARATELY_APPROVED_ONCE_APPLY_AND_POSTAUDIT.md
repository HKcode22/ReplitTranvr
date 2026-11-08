# 2026-11-08 — P25 exact administrative cleanup: eligible, but NOT yet applied

## Verified owner dry-run, November 8, 2026, 13:20:19.061 UTC

The owner executed merged PR #494 one-line `--dry-run` loader from exact Git blob `512beea2e63cc14e2f5395387564c53be7f01027`. **Real result `DRY_RUN_ELIGIBLE_OPERATOR_APPROVAL_REQUIRED`, blockers `[]`.** The native provider strict LIST returned **0 active** and **0 billable active** subscriptions. Exact unresolved incidents **31 and 32** fingerprinted against historical timestamps at full millisecond precision, each linked to YSSY probe19. The single globally OPEN budget is exact `P2G-S1-20261013-03` with cap500. Probe19 remains `failed/DELIVERY_GAP` with **231 external billed, 229 received, gap 2**. All 58 original metadata references carry verified deletion tombstone timestamps, 0 untombstoned. **SQL mutations 0, provider mutations 0, raw object mutations 0; no webhook POST.** Existing PR #490 synthetic signed POST once marker preserved.

**Dry-run eligibility is not execution or owner approval.** As of this readback, production incidents 31 and 32 remain unresolved and exact P25 budget remains OPEN. This outcome does not resolve the two-credit missingness, rehabilitate the failed historical probe, or attest any Phase5/Phase6 release gate. The original signed synthetic POST was still never reached.

## Reviewed implementation of a future *separately approved* administrative update

The already-reviewed `scripts/v39_p25_incidents31_32_budget_exact_admin_disposition_v39.ts` and pure `server/lib/disruption/phase2gP25PairedAdministrativeCloseout_v39.ts` implement a narrow three-row metadata action, **only when explicitly executed with `--apply`**. The SQL uses a single transaction, advisory budget lock, exact incident identities, strict provider native LIST, 58 tombstones, zero active probes/runtime, and rechecks unchanged 231/229/2. It writes only:
1. `clean.adb_incident_stop` id 31: administrative `resolved=true` + annotation, **not** a claim scientific correctness.
2. `clean.adb_incident_stop` id 32: same administrative completion scope.
3. `clean.adb_probe_budget_day` exact `P2G-S1-20261013-03`: state CLOSED and closedAt timestamp.

It cannot change probe19 `failed/DELIVERY_GAP`, provider subscription inventory, raw storage, Phase5 PRE/POST, model outputs, Phase6 GO or the old PR #490 marker.

The new `scripts/phase5_p25_exact_admin_apply_reviewed_once_owner.sh` is an **at-most-one-attempt wrapper**, reviewed on GitHub but **NOT authorized to run** by this checkpoint. In addition to the existing runner's approval token, it requires a distinct explicit operator confirmation for this exact two-incidents+one-budget action, validates the immutable local Replit HEAD/ancestor and Git-blobs for existing database/provider code and the reviewed runner/helper, preserves local repo/worktree, refuses missing original PR #490 synthetic attempt marker, refuses a prior administrative attempt marker, and stages only uniquely created temporary TS source files. Immediately before `--apply`, it creates `artifacts/phase5-p25-exact-31-32-budget-admin-apply-once.lock/` and a limited manifest. **Never remove or reset the marker.** A timeout, error, crash, missing response or output after creation is **ambiguous**; rerun is forbidden until independently reconciled. All owner actions should be separated by an explicit authorization from the user naming the production SQL mutation.

The independent `scripts/phase5_p25_admin_after_apply_independent_readonly_owner.sh` is **READ ONLY**. It can be run after any ambiguous or reported apply to verify incident IDs31/32 have scoped administrative resolved annotations, the one exact budget CLOSED, original failed/DELIVERY_GAP 231/229/2 unchanged, 58 reference tombstones, global open incident/budget counts 0, and an attempt marker present. Its PASS is **administrative metadata only**, never historical scientific PASS, signed HTTP webhook proof, provider rights or Phase6 paid GO. It reads neither native provider subscriptions nor original provider raw object bytes.

### Operator decision explicitly outstanding

The existing user permissions for bounded paid flight data collection do not substitute for a **named authorization to alter three historical production administrative records**. The assistant must ask for or receive explicit consent to resolve **incidents #31 and #32 administratively and close only the historical P25 budget** before supplying an executable apply command. The script may be merged and tested without that authorization, but **must not execute in Replit or any connector** until such consent is given. After approval, use the exact reviewed one-line Git blob launcher only once and independently audit the resulting database, never auto-rerun.

## Keep Phase5 work moving

The archival P25 issue is separate from the remaining genuine Phase5 scientific gates: lawful bounded source purpose/retention, qualified anchors, frozen signed 31 batch-day f.8 calendar and seven-category REST/Alert budgets, autonomous GitHub early draw→FIDS SOURCE→T−24/T−6/T−90 PRE plus independent witness→POST/STOP→daily audit, independent signed FREEZE, then **separate** paid Phase6 GO. V0079–V0083 already installed; do not rerun migrations. No need to wait for AeroDataBox account emails or repeat historical paid cohorts.
