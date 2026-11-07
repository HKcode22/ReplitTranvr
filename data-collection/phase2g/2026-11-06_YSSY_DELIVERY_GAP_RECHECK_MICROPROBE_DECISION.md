# Phase 2G / YSSY — delivery-gap forensics and smallest useful new test

**Owner:** historical YSSY receiver reliability and Phase2G issue #28. This document is NOT Phase 5 work and does not reopen a full YSSY pilot or authorize subscriptions automatically. It remains linked to the Phase 5 receiver-risk register.

## Verified existing evidence
- Paid YSSY P2G23/P2G24 had callback health incidents. P25 historically had nonzero provider SEND billing minus received originals, including incident #31 / a two-credit differential. A billing gap is NOT automatically two missing physical flights.
- Earlier paid webhooks used clean.prepaid_probe_session_runtime, prepaid_probe_delivery_runtime, prepaid_probe_item_runtime (UNLOGGED) and logged clean.provider_content_blob_ref plus Replit App Storage originals. The user's Nov6 11-table audit instead showed 0 all-time in generic raw_delivery/adb_ingest_events/flight_events and 1,574 flight_population rows. It DID NOT query prepaid tables. Historical original SHA success remains real; expired provider Contents are not to be reopened.
- [Published Replit identity Actions #42334527900](https://github.com/HKcode22/ReplitTranvr/actions/runs/42334527900) returned HOLD_PUBLISHED_SOURCE_DIFFERS_FROM_TESTED_RELEASE with public SHA 84b7f1565d0402facc8c3b9aacedc599eb6e2af1; HTTP 200 and custody flags do not equal release admission.
- [PR #412](https://github.com/HKcode22/ReplitTranvr/pull/412) merged to main SHA 068051026be6c1d4877142d757a0f9a27464ee89 after 5/5 offline checks. It fixes secretless callback fallback before Phase6 CREATE but has NOT been shown deployed on published Replit.

## Immediate nonpaid investigation

1. Run the [read-only legacy prepaid metadata inventory](audits/yssy-legacy-prepaid-storage-readonly.mjs) once, pinned to its reviewed Git blob. Report prepaid UNLOGGED runtime, logged original-ref expiry/deletion, generic receiver count. A zero after restart cannot reconstruct historical SEND billing.
2. Read-only public receiver exact Git SHA/flags/revision. Verify real published callback route against reviewed release and same intended DB/Storage, and independent raw-before-2xx behavior. No blind republish.
3. Authenticated no-charge provider subscription inventory and settled credits BEFORE any new CREATE. Preserve original incidents, do not retry unknown CREATE, do not publish secret URL.
4. Verify provider and optional ADS-B source rights and retention separately from user's paid authorization.

## Optional one-flight paid experiment (not a 120-minute airport pilot)

**Hypothesis:** when provider conclusively SENDs a notification for a frozen one-flight subject, the exact published authorized receiver persistently stores a hash-bound original and accounts for the SEND/credit, even if receiver/DB restarts. Separate no-send, failed HTTP, lost DB raw and identity quarantine.

- Use FlightByNumber for one future selected operating candidate with frozen service date and provider source rights, at most one new subscription, no unknown-state retry, no airport-wide YSSY alert. One T−90m true prospective FIDS baseline and one POST only if needed to test the identity path; GHA-only owners with clocks, budgets and STOP.
- Billing is on provider SEND, not HTTP ACK. Even one subscription is not an absolute bounded charge; independent settled-credit and actual active LIST + DELETE/STOP checks precede release. No SEND means inconclusive callback test, not a successful zero-gap observation. One independent observation cannot estimate general failure probability.
- Record CREATE ACK/LIST, real SEND/credits, receiver 2xx, durable raw hash, source identity matched/quarantined, credit settlement, STOP/DELETE, orphan/incident and censoring. No retroactive reclassification of P2G23/P2G24/P25.
- **Paid release = HOLD** until exact published receiver, custody, rights, active-plan/budget/STOP and independent admission all pass. Owner authorizes considering a paid microtest but this is not approval to bypass provider source or safety checks.

Closeout belongs in [Phase2G issue #28](https://github.com/HKcode22/ReplitTranvr/issues/28). Phase5 inherits only a short documented receiver-risk/Go-NoGo dependency, not these experiments. No provider calls in this document.
