# P2G10 WSSS — GitHub/Replit Webhook Secret Mismatch

> Date: 2026-09-23
> Classification: infrastructure-invalid / excluded from scientific Stage-1 evidence
> Probe: 8
> ICAO: WSSS
> Budget day: `P2G-S1-20260923-09`
> AUTH: `AUTH-20260923-P2G10`
> GitHub Actions run: `35855206481`

## Summary

P2G10 created the intended WSSS `FlightByAirportIcao` credit-based subscription and bound it to runtime session
`c7826b30-47ef-453a-86a6-dd853ce2a6f8`, but no provider callback was accepted by the Replit receiver.

The live subscription had the correct development callback host, the correct prepaid path shape, and the exact runtime-session UUID.
A hash-only comparison proved that the webhook secret embedded in the provider subscription URL did **not** match the
`AERODATABOX_WEBHOOK_SECRET` expected by the running Replit service.

The operator subsequently confirmed a one-character omission in the GitHub Actions environment secret.

No secret value is recorded in this document.

## Evidence

- GitHub paid gate: PASS at exact source HEAD `308c636e091328ea9827973592a17525ce1e5c11`.
- Probe 8 entered `probing`; runtime session entered `active`; provider subscription was bound.
- Subscription subject: `FlightByAirportIcao/WSSS`.
- Callback host: correct same-app `.replit.dev` origin.
- Callback path/session: correct; runtime session matched.
- Secret binding check: `secret_match=false`.
- Replit runtime health remained `PASS` at the expected source HEAD.
- Callback counters remained zero:
  - requests seen: 0
  - successful 2xx: 0
  - callback failures after authentication: 0
  - persisted deliveries: 0
  - persisted items: 0
  - live raw-content blobs: 0
- Provider balance before launch: 2162 credits.
- Provider balance after fail-closed recovery verification: 2093 credits.
- Observed provider-account delta: 69 credits.
- Recovery result:
  - `RECOVERY_COMPLETED_FAIL_CLOSED`
  - provider delete attempted: true
  - provider delete verified: true
  - runtime cleanup verified: true
  - probe marked failed: true
  - incident opened: true
- Post-recovery provider state: 0 active billable subscriptions.
- GitHub Actions run `35855206481` was cancelled after provider deletion was verified; owner and watchdog ended cancelled.

## Root cause

The immediate operational root cause was cross-environment configuration drift:

`GitHub phase2g-paid AERODATABOX_WEBHOOK_SECRET != Replit AERODATABOX_WEBHOOK_SECRET`.

Because the provider callback URL was constructed by the GitHub-owned paid owner, the provider used the GitHub value.
The Replit receiver authenticates the URL secret against its own environment value and rejects a mismatch with HTTP 404
before prepaid persistence begins. Provider notification attempts could therefore consume Alert credits while all
accepted-callback and payload counters remained zero.

## Safeguard gap

The prospective zero-credit callback proof tested the Replit secret against the Replit callback receiver, while the paid
GitHub gate only checked that its required provider/API configuration existed. It did not prove that the GitHub webhook
secret was the same secret accepted by the live Replit receiver.

That missing cross-environment binding check allowed the paid owner to create a subscription with a mismatched callback secret.

## Corrective action required before any later paid attempt

1. Treat P2G10 as infrastructure-invalid and exclude it from scientific WSSS evidence.
2. Maintain zero active billable subscriptions before any new authorization.
3. Add a zero-provider, zero-credit live endpoint that authenticates the webhook secret without creating a probe session or payload.
4. Make the GitHub gate call that endpoint with the GitHub environment secret and fail before paid preflight/provider creation on mismatch.
5. Cover the GitHub/Replit binding with regression tests.
6. Use a fresh prospective runtime/budget/AUTH and explicit rerun authorization; never reuse P2G10.
7. Re-run the fresh callback/runtime verification after syncing the exact Thursday source HEAD.
8. A published deployment is not required while the frozen same-app development callback contingency is explicitly selected and all of its exact runtime checks pass.

## Scientific disposition

P2G10 is **not** evidence of zero WSSS traffic or zero AeroDataBox notifications. Provider-account credits decreased while
the Replit application accepted zero callbacks. The attempt is therefore an infrastructure-invalid delivery/authentication
failure and must remain excluded from Stage-1 scoring and promotion.
