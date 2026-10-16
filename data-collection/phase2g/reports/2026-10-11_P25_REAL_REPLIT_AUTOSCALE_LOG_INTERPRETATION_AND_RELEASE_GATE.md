# YSSY P25 — Replit published Autoscale lifecycle logs and launch implication

**Date:** 2026-10-11. **Evidence supplied:** Replit Cloud published deployment console export `Pasted text(20261011-215421).txt` (not a server access log or webhook receipt). Companion `Pasted markdown (2)(10).md` repeats older lifecycle logs from Oct9–11, not an independent observation. **DO NOT treat timestamps as time-zone-verified.**

## Actual observed lifecycle facts, not root-cause assumptions

- The October 11 text excerpt contains **four** explicit `starting up user application` events (09:27:03, 10:05:20, 10:42:44 and 14:16:54 by displayed log timestamp).
- Each start contains a burst of root-path health-check errors: initially TCP `connection refused` on the mapped proxy, then approximately **nine 500 healthcheck messages per observed startup** (36 in this excerpt). The application subsequently logged `V39_CALLBACK_ONLY_SERVER_LISTENING` **about 1.15s, 2.10s, 2.03s and 1.40s** after those starts (timestamps as displayed).
- At least **five** explicit `system: received signal terminated` lines occur in the excerpt (09:24:28, 09:56:48, 10:20:28, 11:03:18, 14:31:58), followed by `signal: terminated` in the deployment run command.
- Readiness logs repeatedly confirm **BOOT_MIGRATIONS=DISABLED**, **STRIPE_STARTUP=DISABLED**, **AUTO_COLLECTION=false**, and the callback-only server listening. These do **not** establish original-source preservation or any physical-v2 SQL accounting.
- The intervals between a recorded termination and the next recorded startup were approximately 155s, 511s, 1336s and 11616s. **These are NOT measured service downtime**: Autoscale might intentionally scale to zero while no HTTP requests arrive, and the excerpt does not contain independent request timestamps or sender deliveries.

## Interpretation / scientific limits

This evidence demonstrates **repeated deployment process lifecycle changes** and a measurable *first-listen startup window*. It does **NOT** identify whether shutdowns were normal Autoscale recycling, host health management, manual publish, application crash or external connection failure. There are no provider callback request IDs, sender attempts, outside-before-app HTTP receipt timing, paid credits, original blob SHA, or per-flight completeness evidence. Consequently **it does not prove the exact cause of the YSSY P2G24 delivery gap** and is not an independent signed original-source verifier for 6+6.

A short GET after the process starts can succeed even if an earlier webhook was dropped by the hosting platform. 6+6 GET polls cannot reconstruct missing sender attempts, nor can the revised receiver persist bytes that never reached the process. Neither repeated 500s *during startup* nor the later `signal: terminated` events by themselves justify automatically marking WSSS/OMAA/SKBO previously matched v2 runs invalid; only run-specific missingness/reconciliation evidence could.

## Minimal YSSY release action (not additional perfection work)

1. **Review/merge focused PR #29 and publish the exact reviewed source**, *not* giant investigative PR #27; use the new independent read-only GitHub Action public GET claim to prove the published SHA before paid admission.
2. **One bounded original-canonical nonempty, signed synthetic POST** to the *actual published receiver*, with a truly disposable isolated session, verified persisted blob SHA/readback and timing within actual sender-ACK budget; do not use production provider data or infer sender completeness from a GET.
3. **Read-only authoritative live PG migration inventory**, current provider Alert-credit balance, zero active subscriptions, orphan/incident owner cleanup. Apply V0064 and source custody feature flags only through a reviewed release plan; do not enable every flag blindly.
4. **Human-reviewed one-shot P25 amendment** and fresh exact runtime/AUTH if this is an official 120-minute v2 remeasurement. Existing P2G22/23 attempts were consumed; the committed P25 draft is intentionally unapproved.
5. **Run classification after completion** must be based on actual 120-minute, physical-v2 identity, original-source, 15-minute bins, external billed-vs-internal credit and zero-gap evidence. Retain any mismatch as censored; no provider or system can promise future scientific PASS.

**Status at this report:** independent published exact source parity has not been shown; P25 amendment not approved; real paid 6+6 still refuses unsigned source witness; no provider calls or paid mutations were performed for this report.
