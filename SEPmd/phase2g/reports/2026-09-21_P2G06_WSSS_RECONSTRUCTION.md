# P2G06 WSSS — Exact Reconstruction Report

> Recorded: 2026-09-21 PDT / 2026-09-22 UTC
> Historical run: `AUTH-20260921-P2G06`
> Budget day: `P2G-S1-20260921-05`
> Historical probe row: `probe_id=4`
> Runtime session: `e45ef007-6129-4b95-bd29-80a1d700be6e`

## Conclusion

P2G06 was a real two-hour WSSS collection, not an empty or crashed run.

The surviving raw-object evidence reconstructs 36 SHA-verified AeroDataBox webhook payloads containing 219 flight items. Every persisted payload exposed an explicit provider `deliveryAttempt.costCredits`, and the sum of those provider-reported costs is also 219. No persisted payload had a cost/item disagreement.

The AeroDataBox account balance decreased by 220 Alert credits over the isolated WSSS exposure.

Therefore the final reconstructed accounting is:

```text
external provider SEND spend = 220
received persisted payload spend = 219
gap = 1
delivery completeness = 219 / 220 = 99.5454%
```

This narrows the P2G06 failure from a generic "reconciliation mismatch" to exactly **one billed flight-notification credit not represented in the 36 persisted callbacks**.

## Raw callback evidence

- payloads: 36
- SHA-verified: 36
- bytes: 282,218
- first persisted: 2026-09-21 11:02:10.494 UTC
- last persisted: 2026-09-21 12:55:26.309 UTC
- live/raw-object metadata existed after failure, allowing reconstruction

## Scientific content reconstructed

- total flight items: 219
- distinct flight numbers: 128
- distinct reconstructed runtime flight identities: 134
- distinct aircraft registrations: 93
- reconstructed tail-chain links: 3
- payloads with explicit costCredits: 36
- payloads using fallback item count: 0
- payloads where costCredits differed from contained flight count: 0
- explicit costCredits sum: 219
- production-rule internal credits: 219

So 36 payloads was not "36 flights"; several payloads contained multiple flights.

## What the one-credit gap means

AeroDataBox documents the credit-based Flight Alert system as billing when a notification is **sent**. Cost is one credit per flight item. A send can be billed even when delivery to the webhook fails, times out, or receives a non-2xx response. Credit-based subscriptions default to no retries unless retries are explicitly requested.

Provider reference:
https://aerodatabox.com/flight-alert-api-2026/

P2G06 used `maxDeliveryRetries=0`.

The observed pattern is therefore consistent with one billed flight item whose delivery did not become one of the 36 persisted callback payloads. That is the leading explanation, but P2G06 did not have durable callback request/failure counters, so the historical run cannot prove the exact network/HTTP reason for the missing send.

## What did NOT cause P2G06

Evidence does not support:
- two-hour Replit server disappearance;
- supervisor death;
- callback route ownership drift;
- zero WSSS data;
- parser cost/item disagreement in the 36 received payloads;
- retry multiplication inside the 36 persisted deliveries.

## Why the old implementation failed the run

The old live-window acceptance rule required:

```text
externalCredits === internalSendCredits
```

P2G06 produced 220 versus 219, so it returned:
- `status=failed`
- `reconciliation_status=MISMATCH`
- `stop_reason=external_internal_credit_mismatch`

That was consistent with the then-running code.

However, the original V3.9 Plan already states that external settled provider spend is authoritative and warns that the internal received ledger can be incomplete because SEND billing may occur without successful receipt.

The implementation was therefore stricter than the accounting semantics described by the Plan.

## Historical integrity

P2G06 remains failed under the rule that existed when it ran.

The project does not rewrite its historical status.

The reconstruction is used to:
1. understand the failure;
2. design prospective instrumentation;
3. authorize one post-fix WSSS validation run;
4. exclude P2G06 from final compact-6 scoring.

## Required prospective protections

Before the next paid run:
- durable append-only reconciliation evidence before cleanup;
- callback request/success/failure counters;
- exact external/internal/gap recording;
- cost/item disagreement counter;
- external settled spend as yield denominator;
- missing billed items added to the ambiguity upper bound;
- mismatch/unresolved evidence written before exact-session raw cleanup;
- no unlimited WSSS retries.

## Retention

Once this reconstruction and safe aggregate evidence are preserved, the 36 P2G06 raw provider objects should be deleted through the exact-session cleanup path and deletion verification should be recorded. Raw provider content should not be retained merely for convenience.
