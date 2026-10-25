# Gate 4 — preserve the approved 6+6 health watchdog; do not turn it into billed AeroDataBox retries
**Date:** 2026-10-24 | **Status:** Reviewed source-and-policy proposal. **Not activated in a paid Gate 4 trial.**

## Correction to the most recent Gate 4 plan

The owner reaffirmed on 2026-10-24: "we agreed to keep the max deliveries to be 6+6 not 0 ... some delay is acceptable under scientific measurements". The earlier 2026-10-10/11 agreement was specifically **six primary callback-health checks plus six conditional backup checks at 15-second cadence**, at most 12 observations / ~180 seconds. It was **not 12 billable provider webhook delivery retries**. This does not mean the owner's tolerance is wrong: short transient callback outages can be monitored through 6+6 rather than the legacy over-eager three-strike stop. Small flight-count aggregate mismatches may be scientifically tolerable with transparent provenance; missing raw V0071 originals or unidentified paid provider IDs may not be fabricated.

The existing **Phase2G P15 paid supervisor** and **Gate3 callback supervisor** already implement `six-plus-six` in `scripts/v39_phase2g_stage1_watchdog_6plus6_policy_v39.ts` and `server/lib/disruption/gate3CallbackSixPlusSix_v39.ts`. The former carries:
- 6 primary observations, then 6 conditional contingency observations; one observation per 15 seconds;
- maximum 12 consecutive transient failures / absolute 180-second wall clock, whole-run cumulative 180-second outage envelope and bounded episodes;
- transient 5xx/timeout/network errors receive bounded grace; **hard source-contract, identity, security, budget, unresolved provenance and ownership failures do not**;
- recovery requires two full healthy checks; a green GET proves health, **not** that every paid sender attempt produced a stored original; scientific source and cost reconciliation remain independent.

**AeroDataBox's credit-based webhook CREATE body `maxDeliveryRetries` is a DIFFERENT knob.** [Official Flight Alert guide, last updated Jan 31, 2026](https://aerodatabox.com/flight-alert-api-2026/): **allowed 0 to 2**, default zero, extra attempts cost the same Alert credits as initial SEND. Its value cannot be 6+6 or 12. Do **not** silently convert the owner's health tolerance into a `maxDeliveryRetries: 2` paid-provider setting either: it changes cost/exposure and would require separate explicit informed approval. Existing paid Gate4 preparation keeps `maxDeliveryRetries: 0`, pending per-scope cost approval.

## Gate 4 STOP and health are deliberately separate

- Gate4 independent protected STOP `.github/workflows/phase3-gate4-live-exact-stop-candidate.yml` and `scripts/v39_gate4_actions_live_stop_v39.ts` polls **provider LIST/balance and V0072 ownership every ~5s**. It immediately requests exact-owned STOP at the approved UTC deadline, soft credit threshold, protected balance floor, or an unrelated active billable entity. On unknown/unowned subscription or unsafe ownership it fails with incident/rescue, not a guessed DELETE.
- **Do NOT wait 3 minutes when money/ownership is unsafe.** The 6+6 budget only applies to recoverable *callback-health observations*, not billable-provider safety and not a permission to run after a scientific source gap has been independently established.
- The newly added `server/lib/disruption/gate4CallbackHealthSixPlusSix_v39.ts` is an explicit **PURE prospective Gate4 callback-observer policy** reusing the identical reviewed Phase2G 6+6 controller, with tests for 6+6, two-green recovery, hard source stop, separation of provider retries, and immediate 5-credit STOP. **It is not currently wired to the live GitHub STOP worker, so do not claim Gate4 6+6 is deployed.** A separate, reviewed Gate4 actual observer integration and a specific paid trial authorization are still required.

## Real current evidence and next steps

- Published Gate4 reviewed source `087dc948c29d004f88eca141e1fc8e83c2844e3f` was read-only verified healthy, exact source, published and prepaid route, Gate4 ingress registered: 5/5.
- Actual owner one-shot synthetic NEXT2 POST to production returned HTTP **200**, V0071 raw original bytes and SHA256 independent readonly PG **PASS**, but `nonProviderSynthetic=true`, `providerQualifiedOriginal=false`: authenticated hosted ingestion engineering PASS, **not** genuine AeroDataBox SEND.
- Genuine historical paid NEXT1 WSSS Alert produced a 46-credit account delta with zero genuine V0071 originals despite exact-ID STOP. Its delivery failure cause is unknown; 46 credits are NOT 46 necessarily different POSTs.
- Latest account = **1991** Alert credits, **59996** API units, **0** active subscriptions; WSSS FlightSchedules **OK**, FlightLiveUpdates **OK**, AdsbUpdates **OKPartial**.
- Previous reserve floor 2000 already breached. A hypothetical owner-approved 1900 reserve yields 91 credits headroom, **NOT hard spending cap**. No new floor/soft target or paid CREATE has been approved.
- **NEXT** finish review+CI of this source-only policy, then scope a distinct new paid receiver + V0072 owned-ID binder and actually ARMED independent STOP with 5-second cost checks plus an explicitly integrated **6+6 callback observer**. No change to published receiver SHA/secrets solely to adopt this policy, no leftover role rotation, no repeating the synthetic test. One new credit-based paid trial must receive separate owner approval covering potential burst overshoot. No provider calls in this source-only change.

**The design goal:** scientifically tolerant *health observation* without weakening exact-byte raw custody, signed scope/positive subscription ID, credit exposure control, or independent STOP.
