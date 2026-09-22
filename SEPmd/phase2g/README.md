# Phase 2G — Canonical Index and Timeline

> Last organized: 2026-09-21 19:26 PDT / 2026-09-22 02:26 UTC
> Branch: `phase2g-weekend-hardening-20260918`
> Purpose: one place to find the current Phase-2G truth without moving or deleting historical files immediately before a paid run.

## Canonical hierarchy

### Baseline protocol
- `SEPmd/V3.9_DataCollectPlan_f.8.md` — immutable original V3.9-f.8 baseline.
- `SEPmd/V3.9_IMPLEMENTATION_LOG.md` — historical implementation record.
- `artifacts/preprobe-reference-freeze-record.json` — immutable original 12-candidate preprobe freeze.
- Original preprobe file SHA-256: `b9113c26d7ec02e4abf036ec3c00837f36c5e741aa08b642d46868ace7ff1870`.

### Current Phase-2G amendment
- `SEPmd/phase2g/amendments/2026-09-21_COMPACT6_RECONCILIATION_AMENDMENT.md`
- `artifacts/phase2g-compact6-amendment-freeze-20260921.json`
- Compact-6 amendment file SHA-256: `09092f8d4896af4bbea11fd13d177417aa8cb92538e0cebff5e5301f3e1c4500`.
- This is an additive amendment. It does not rewrite the original preprobe artifact.

### P2G06 WSSS failure/forensics
- `SEPmd/V3.9_PHASE2G_P2G06_PLAIN_ENGLISH_FAILURE_REPORT_AND_COMPACT6_DECISION_20260921.md`
- `SEPmd/phase2g/reports/2026-09-21_P2G06_WSSS_RECONSTRUCTION.md`
- Reconstruction tool: `scripts/v39_phase2g_reconstruct_prepaid_session_v39.ts`

### Tuesday readiness
- `SEPmd/phase2g/runbooks/2026-09-22_WSSS_VALIDATION_READINESS.md`

## Current compact Stage-1 candidate set

The original 12-candidate preprobe remains immutable. The effective Stage-1 execution subset is:

1. WSSS — Asia-Pacific
2. OMAA — Gulf/Africa
3. MMUN — North America
4. LKPR — Europe
5. SKBO — South America
6. YSSY — Oceania

The subset comes only from the already-frozen pre-outcome shortlist.

## Current experiment status

| Attempt | Airport | Result | Interpretation |
|---:|---|---|---|
| 1 | WSSS | failed, censored, UNRESOLVED | infrastructure-invalid |
| 2 | OMAA | completed, MATCH | valid historical Stage-1 evidence |
| 3 | MMUN | failed, censored, UNRESOLVED | infrastructure-invalid |
| 4 | WSSS | failed, full-duration, MISMATCH | P2G06 accounting gate under old exact-equality rule |

P2G06 remains historically failed. It is never rewritten to PASS.

## P2G06 reconstructed facts

- Runtime session: `e45ef007-6129-4b95-bd29-80a1d700be6e`
- Persisted callback payloads: 36
- Payload SHA verification: 36/36
- First persisted payload: 2026-09-21 11:02:10.494 UTC
- Last persisted payload: 2026-09-21 12:55:26.309 UTC
- Total persisted bytes: 282,218
- Total flight items: 219
- Explicit provider costCredits total: 219
- Payloads using item-count fallback: 0
- Payloads with costCredits != flight-item count: 0
- Distinct flight numbers: 128
- Distinct reconstructed runtime flight identities: 134
- Distinct aircraft registrations: 93
- Reconstructed tail-chain links: 3
- Provider external spend: 220 Alert credits
- Received internal accounting: 219 credits
- Delivery/accounting gap: 1 credit
- Delivery completeness: 219/220 = 99.5454%

This proves WSSS collected substantial data. P2G06 failed the old exact-equality accounting acceptance gate; it did not fail because the two-hour collection was empty or because Replit died.

## Prospective reconciliation rule

The original Plan already states that settled provider balance delta is authoritative and the received callback ledger can be incomplete because AeroDataBox bills on SEND.

For post-amendment Stage-1/2 anchor probes:
- external settled spend is the authoritative accounting value;
- exact equality with zero cost/item disagreement => `MATCH`, the only completed/promotion-valid state under the current freeze;
- a positive provider-send/received-callback gap => `DELIVERY_GAP`, preserved durably but terminal/non-scoreable;
- internal > external => hard `MISMATCH`;
- costCredits/item disagreement => hard `MISMATCH`;
- unresolved settlement => hard failure;
- safety-smoke/canary and Stage-1/2 completion all remain exact-match.

A prior draft used a 0.99 completeness threshold after P2G06. That was removed before paid use because the pre-P2G06 Plan requires any nonzero production tolerance to be independently measured/frozen and not calibrated from the failed one-credit run.

P2G06 itself is excluded from final scoring and is not retroactively reclassified.

## Repository organization policy

No historical files are being moved to the `trash` branch immediately before the Tuesday run. Moving files can break script paths, evidence references, and hashes.

For now:
- this index identifies canonical/current material;
- old files remain intact as historical evidence;
- after Tuesday's validation run is safely closed, obsolete duplicates can be moved/archived in one deliberate cleanup commit.

## Tuesday objective

One and only one post-fix WSSS validation run may occur under the compact-6 amendment.

If that run succeeds, normal compact sequencing proceeds. The next unresolved compact candidate is then MMUN under its already-recorded bounded infrastructure-invalid rerun allowance.

If the WSSS validation fails, no automatic fourth WSSS attempt is allowed.
