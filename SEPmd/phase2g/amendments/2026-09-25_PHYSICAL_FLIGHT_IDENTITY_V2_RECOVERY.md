# Phase-2G prospective amendment — physical-flight identity v2 recovery

> Effective prospectively only after code/tests/migration and the matching
> machine-readable recovery artifact are frozen and hash-bound into a fresh
> Gate-2 runtime/AUTH.  
> Historical attempts remain governed by the source/contract that actually ran.  
> This amendment does not by itself authorize a provider request.

## 1. Reason for amendment

P2G13 / MMUN completed the intended two-hour provider exposure with exact
external/internal credit reconciliation, but live retained callback evidence
proved that the prepaid no-provider-ID identity persistence did not fully mirror
the normal production identity resolver.

For exact repeated scheduled legs such as VB2102 and AM501, a later callback
that added callsign/aircraft enrichment could be quarantined rather than linked
to the already-confirmed physical flight. This can distort ambiguity bounds and
tail-chain yield.

The defect is an implementation-contract failure. It is not an observed airport
yield outcome and no measured MMUN yield value is used to authorize this
correction.

## 2. Corrected identity contract

The current prospective physical-flight metric contract is:

```text
v39-physical-flight-instance-v2
```

For a no-provider-ID operator observation, session-local prepaid persistence
must apply this order:

1. exact retained scheduled-leg lookup using:
   - operating carrier;
   - operating flight number;
   - origin;
   - original destination;
   - initial service date;
   - exact scheduled gate-out UTC;
2. if exactly one resolved physical identity matches, reuse it regardless of
   later mutable enrichment such as callsign or aircraft registration;
3. more than one exact physical identity is an ambiguity and fails closed;
4. only when no exact scheduled leg exists may retained provider-record/callsign
   and nearby-schedule linkage rules decide retime linkage;
5. unresolved nearby schedule changes remain quarantined rather than guessed.

A callsign is linkage/enrichment evidence. When a public operating flight number
exists, callsign must not be part of the provisional scheduled-leg ambiguity
token because its later appearance or change must not split one exact scheduled
leg into multiple upper-bound identities.

Provider `CodeshareStatus=Unknown` remains genuinely ambiguous and is not
promoted to a confirmed physical operator leg.

## 3. Historical evidence remains immutable

The following results remain historical evidence and are not rewritten:

| Probe | ICAO | Historical result | Metric contract | v2 promotion use |
|---:|---|---|---|---|
| 2 | OMAA | completed / uncensored / MATCH | NULL | excluded |
| 9 | WSSS | completed / uncensored / MATCH | NULL | excluded |
| 10 | MMUN | full-duration provider-safe / MATCH, scientifically invalid identity metrics | v1 | excluded |

All other prior failed/censored WSSS/MMUN evidence also remains preserved under
its historical disposition.

## 4. Why WSSS and OMAA must be remeasured too

Stage-1 yield normalization uses WSSS as the primary reference and OMAA as the
frozen fallback. A v2 MMUN numerator may not be normalized against NULL-contract
reference metrics whose unique-flight/tail definitions were produced before the
corrected physical-flight implementation.

Therefore the prospective comparable recovery set is fixed before observing any
v2 outcomes:

```text
WSSS → OMAA → MMUN
```

This is contract-correction remeasurement, not outcome-driven retry.

## 5. Bounded remeasurement rule

Each of WSSS, OMAA and MMUN may receive **at most one** additional Stage-1
attempt under v2 for this recovery.

The fixed order is binding.

For each candidate:

- one v2 attempt consumes its sole contract-correction allowance regardless of
  whether it completes, fails, is censored, or encounters a provider/infrastructure
  problem;
- there is no automatic second v2 attempt;
- any further attempt requires a new explicit adjudication/amendment;
- later candidates may not be started out of order;
- an unexpected pre-existing v2 row fails closed;
- the legacy probe IDs/status/reconciliation/metric-contract values named by the
  machine-readable freeze must match exactly before recovery is selectable.

The authorization basis may not use observed P2G13/WSSS/OMAA yield scores.

## 6. Unchanged Stage-1 scientific/safety protocol

The recovery does not change:

- compact-six airport membership;
- matched weekday/time-class requirement;
- target 120-minute Stage-1 duration;
- UTC-midnight refusal;
- 500-credit protected probe-day ceiling;
- SEND-aware provider safety controls;
- exact provider/internal reconciliation required for valid completion;
- raw-before-2xx persistence;
- zero delivery retries;
- independent GitHub owner/watchdog architecture;
- exact source/runtime/DB/webhook-secret/callback binding;
- capacity gate `rows_per_hour >= 60`;
- physical-flight/tail/stability scoring formula except for the corrected v2
  identity semantics.

Every paid remeasurement requires its own fresh runtime/budget day, fresh AUTH,
fresh zero-credit callback proof and fresh paid preflight.

No weekend paid Stage-1 run is authorized. The frozen Stage-1 class remains
weekday.

## 7. Sequencing after v2 recovery

Only after the bounded WSSS → OMAA → MMUN v2 sequence is terminal may ordinary
compact-six sequencing continue to:

```text
LKPR → SKBO → YSSY
```

Promotion/ranking must use only evidence compatible with the current v2 metric
contract. Historical NULL/v1 metric rows remain available for audit, not for
mixed-contract scoring.

## 8. Required implementation evidence before first v2 paid run

At minimum:

- forward migration permits historical NULL/v1 plus prospective v2 while current
  code writes v2;
- normal and prepaid exact-schedule identity behavior are parity-tested;
- callsign enrichment leaves the scheduled-leg provisional ambiguity token
  stable;
- late aircraft enrichment remains attached to the same confirmed physical leg
  and can participate in conservative tail chaining;
- paid preflight and paid owner use one shared Stage-1 target selector;
- preflight reads `metric_contract_version` and reconstructs safe-mode
  confirmed lower/upper rates identically to owner;
- bounded recovery refuses historical-shape mismatch, out-of-order v2 evidence
  and a second v2 attempt for any recovery candidate;
- migration fresh apply + idempotent replay pass;
- schema verification, TypeScript, offline/full tests, lint, registry,
  traceability, contradiction scanner, aggregate preflight and production build
  all pass on the exact candidate HEAD;
- P2G13 provider-safe exact-session cleanup/finalization state is independently
  verified before the machine-readable recovery freeze is finalized.

No provider action is authorized by this document alone.
