# Phase-2G Binding Supplement — Compact-6 and Reconciliation Amendment

> Frozen prospectively after the diagnostic P2G06 run and before any subsequent paid Stage-1 attempt.
> This supplement does not rewrite historical attempts and does not alter the immutable original 12-candidate preprobe file.

## 1. Why an amendment is required

P2G06 exposed two facts:

1. the original exact-12 calendar is unnecessarily costly for the project timeline;
2. the implementation required exact external/internal credit equality even though V3.9 §3.2/§3.3 already recognizes that AeroDataBox bills on SEND and that a billed send can be absent from the received callback ledger.

P2G06 is treated as diagnostic/pilot evidence and is excluded from final scoring.

## 2. Effective Stage-1 subset

The original preprobe shortlist remains immutable.

The effective compact subset is selected only from that pre-outcome shortlist:

| Order | ICAO | Frozen macro-region |
|---:|---|---|
| 1 | WSSS | Asia-Pacific |
| 2 | OMAA | Gulf/Africa |
| 3 | MMUN | North America |
| 4 | LKPR | Europe |
| 5 | SKBO | South America |
| 6 | YSSY | Oceania |

This gives one representative per frozen macro-region and preserves the predetermined WSSS/OMAA reference roles.

## 3. WSSS validation rerun

Historical WSSS attempt 4 remains:
- failed;
- full-duration;
- MISMATCH;
- stop reason `external_internal_credit_mismatch`.

The reconstruction proves 220 external credits and 219 received credits.

Exactly **one** additional post-fix WSSS validation attempt is permitted.

Rationale: the historical failure exposed an instrumentation/acceptance-rule defect that has now been made explicit.

After that one validation attempt, no additional WSSS retry is automatically authorized.

## 4. Prospective accounting semantics

For subsequent Stage-1/2 anchor probes:

```text
C_external = settled provider balance delta
C_internal = sum of received deliveryAttempt.costCredits,
             falling back to notification item count only when explicit cost is absent
delivery_gap = C_external - C_internal
delivery_completeness = C_internal / C_external
```

### MATCH
- settled;
- `C_external == C_internal`;
- zero cost/item disagreements.

### DELIVERY_GAP
A positive `C_external - C_internal` with zero explicit cost/item disagreement is preserved as its own diagnostic state so the exact SEND-versus-received gap is not lost.

Under the current frozen rule, **DELIVERY_GAP is terminal and non-scoreable**. It does not authorize a completed/promotion-valid anchor probe. The acceptance floor remains exact (`delivery_completeness = 1.0`).

Any future nonzero production tolerance must be measured and frozen in a separate pre-outcome amendment. It may not be calibrated from P2G06 or from the Tuesday WSSS validation result.

### MISMATCH
Any of:
- `C_internal > C_external`;
- any explicit cost/item disagreement;
- other contradictory settled accounting.

### UNRESOLVED
Authoritative provider settlement cannot be established.

## 5. Metric handling for a DELIVERY_GAP

A DELIVERY_GAP does **not** produce promotion-valid yield metrics under the current exact-match rule.

The durable reconciliation receipt still records:
- authoritative external settled spend;
- internal received credits;
- exact delivery gap and completeness;
- callback request/success/failure counters;
- delivery/item/cost diagnostics;
- settlement reads, duration, cleanup, and stop reason.

This preserves the operational evidence needed to diagnose SEND-versus-delivery loss without converting missing provider deliveries into scored observations.

## 6. Safety smoke remains strict

The compact anchor tolerance does not weaken the safety-smoke/canary rule.

Safety smoke continues to require exact reconciliation.

## 7. Stage 2 changes

Five automatic four-hour confirmations are no longer mandatory.

Stage 2 becomes conditional confirmation only.

Trigger confirmation if:
1. fewer than five valid compact Stage-1 candidates exist;
2. a candidate fails the 60 rows/hour capacity gate;
3. final-five membership is not invariant under recorded identity bounds;
4. WSSS and OMAA are both invalid as yield reference;
5. fifth-versus-sixth membership is not robust.

If none triggers, the result must be labeled:
`compact Stage-1-selected anchor pool`.

It must not be called the original V3.9 Stage-2-confirmed anchor pool.

## 8. Binding artifact

Machine-readable amendment:
`artifacts/phase2g-compact6-amendment-freeze-20260921.json`

SHA-256:
`09092f8d4896af4bbea11fd13d177417aa8cb92538e0cebff5e5301f3e1c4500`

A Tuesday runtime must contain this amendment SHA, and the AUTH scope must contain the runtime-bound amendment SHA.

## 9. Provider billing source

AeroDataBox current Flight Alert documentation:
https://aerodatabox.com/flight-alert-api-2026/

Relevant provider behavior:
- one credit per flight item in a notification;
- charge occurs on SEND;
- failed delivery can still be charged;
- credit-based subscription creation is free;
- balance/list/delete are free;
- retries are disabled by default for credit-based subscriptions unless requested.

## 10. Anti-bias rules

- P2G06 remains historical failed evidence.
- P2G06 is excluded from final scoring.
- Candidate six were selected from the pre-outcome frozen shortlist.
- No additional WSSS retries beyond the one post-fix validation.
- No nonzero reconciliation tolerance is inferred from P2G06.
- Under this corrected freeze, only exact MATCH is completion/promotion-valid; DELIVERY_GAP remains diagnostic and terminal.
