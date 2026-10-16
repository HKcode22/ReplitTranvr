# Thursday Phase-2G Recovery Readiness — P2G11 Preparation

> Date prepared: 2026-09-23
> Intended run window: Thursday 2026-09-24, frozen weekday Stage-1 slot
> Status: PREPARATION ONLY — NOT A PAID AUTHORIZATION
> Candidate: WSSS, subject to a new explicit rerun authorization
> Scientific protocol: unchanged

## Purpose

This document prepares the infrastructure correction required after P2G10 was invalidated by a GitHub/Replit webhook-secret mismatch.
It does not authorize a provider subscription and does not create an automatic WSSS retry.

## P2G10 disposition prerequisite

Before any Thursday authorization:

- probe 8 remains failed/excluded;
- P2G10 is not scientific WSSS evidence;
- the exact P2G10 incident is adjudicated;
- budget day `P2G-S1-20260923-09` is closed;
- active billable subscriptions are exactly zero;
- the P2G10 runtime session is fully cleaned.

## Mandatory Thursday infrastructure gates

1. **Exact source**
   - Replit workspace and GitHub Actions must use the same final Thursday Git HEAD.
   - Protected source must be clean.
   - Offline safety CI for that exact HEAD must pass.

2. **Same-app callback contingency**
   - Published deployment access is not required.
   - The callback may use the exact live `.replit.dev` origin under the already-frozen
     `same-app-development-contingency`.
   - Replit must be owned by the normal managed Project workflow, not a detached/local paid owner.
   - Runtime health must report PASS, the exact Git HEAD, prepaid route registered, 168h retention,
     provider mutation false, managed workflow true, and published deployment false.

3. **Fresh Replit callback proof**
   - Run the existing zero-credit end-to-end callback verifier after the final Thursday source is live.
   - Provider calls: zero.
   - Provider mutations: zero.
   - Alert credits: zero.
   - Do not commit the generated callback receipt after generation.

4. **Cross-environment callback configuration proof**
   - Run `Phase2G Zero-Credit Callback Binding` from GitHub against the exact live Replit origin.
   - The workflow must prove both: (a) the GitHub `phase2g-paid` webhook secret is accepted by the live Replit receiver, and (b) GitHub and Replit hold the exact same `V39_DATABASE_RUNTIME_URL`, using a challenge/HMAC proof that never prints the database URL.
   - This check must consume zero provider calls, zero provider mutations, zero database mutations, and zero Alert credits.
   - Either mismatch blocks the run before provider creation.

5. **Paid gate recheck**
   - The paid GitHub gate repeats both the GitHub/Replit runtime-DB binding check and webhook-secret binding check before its provider-read-only preflight.
   - The GitHub paid owner repeats both bindings immediately before starting the provider-owning supervisor.
   - Failure at any binding check is terminal for that dispatch and must not create a provider subscription.

6. **Live fail-fast protection**
   - Any callback persistence failure triggers exact recovery.
   - While the same-app development contingency is active, the GitHub-owned supervisor revalidates the prepaid callback route, the exact live Replit Git HEAD/managed-runtime contract, the GitHub→Replit webhook-secret binding, and the runtime-database binding every 15 seconds. Three consecutive failed live-binding checks terminate the paid owner and invoke exact recovery. These checks make zero AeroDataBox provider calls/mutations, zero database mutations, and spend zero Alert credits.
   - A positive provider-spend signal with **zero callback requests observed** across three consecutive provider balance polls triggers exact recovery. A temporary external-vs-internal credit gap after callbacks have begun is **not** an early-stop signal; it is adjudicated only by the frozen terminal reconciliation rule.
   - The independent watchdog remains incapable of creating a provider subscription.
   - The existing hard credit ceiling remains unchanged.

7. **URL-safe callback construction**
   - Provider callback construction must URL-encode the webhook-secret path segment before subscription creation so a fresh high-entropy secret cannot break the callback URL through reserved URL characters.

8. **Fresh paid evidence**
   - Use a new Thursday runtime artifact, new budget-day ID, and new AUTH artifact.
   - Do not reuse P2G10 runtime, budget day, callback receipt, preflight receipt, or AUTH.
   - The new AUTH must explicitly permit exactly one WSSS recovery attempt and preserve the no-automatic-retry rule.

## Republish constraint

A Replit published deployment is **not required** for this Thursday recovery path while the same-app development contingency is selected.
The Thursday run is allowed to use the exact live Replit development origin if every contingency/runtime/callback/secret-binding gate above passes.

If a published deployment becomes available before launch, switching callback modes requires a fresh prospective runtime/callback verification and AUTH binding; do not silently substitute it.

## Security requirement

Any secret that has appeared in an Actions log must be treated as compromised and rotated before Thursday.
After rotation, update the corresponding Replit/GitHub secret stores and rerun all zero-credit binding checks.
Never print, space out, hash-for-display, or otherwise reveal secret values in CI logs.

## Launch prohibition

This preparation document does not authorize paid execution.
Thursday paid execution remains prohibited until all prerequisites are green and a fresh exact AUTH is approved.
