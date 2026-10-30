# Phase 4 Gate 5 — JSONB-stable FIDS source-envelope integrity

Date: 2026-10-30 PDT. Binding [Plan f.8](../plans/V3.9_DataCollectPlan_f.8.md) §§5,5.1,6,16–17 and [Implementation Log](../implementation/V3.9_IMPLEMENTATION_LOG.md) §§1.9/2.22. This directly follows merged PRs #268 (original fetch-decoded FIDS body), #269 (unknown scope/missing arrays), #270 (source clock precision), and #271 (bounded retained decoded-body readback). PR #271 **postmerge offline safety PASS** [run #41051064440](https://github.com/HKcode22/ReplitTranvr/actions/runs/41051064440); baseline main `0bb6cb437f9d90fa973b85a38ba964f985f5162a`.

## Identified evidence gap

The existing `fids_query_response.response_hash` binds the pre-write JavaScript `JSON.stringify(rawPayload)`. That is deliberate and must not be retroactively reinterpreted, but PostgreSQL `jsonb` is allowed to reorder object keys. Re-serializing restored raw JSONB using default JavaScript object order therefore cannot independently validate the old outer hash. PR #271 verified authentic **stored fetch-decoded source body** SHA and equality to normalized departure/arrival records, but did not verify the rest of the stored envelope—application request filters, source clocks, flags—against an independently reproducible post-read representation.

## Prospective additive repair

For **future FIDS writes only**, `fidsEnvelopeCanonical_v39.ts` computes SHA-256 over all other JSON-serializable raw envelope fields after recursively sorting object keys, preserving array order and JSON value semantics. The new envelope fields are `canonicalEnvelopeHashSchema=v39.fids-envelope-canonical-sha256.v1` and `canonicalEnvelopeSha256`. The existing `response_hash` stays SHA over the complete write-time JSON wrapper (including the new envelope hash) to preserve historic join/lineage contract; neither hash is silently changed in historical rows or redefined. This is an application-level consistency checksum stored **in the same record**, **not an independent immutable signature or proof of provider authenticity**.

The read-only retained-source readback rechecks the new envelope checksum before any success classification; an invalid/missing-one-field pair rejects the row, while truly historical records without both fields remain `legacy_no_canonical_hash`. Reporting separately counts `bodyAndEnvelopeShaVerified`, `bodyWithoutEnvelopeHash`, and body-unverified legacy rows. Tests cover producer→readback, JSONB object key reorder, tampered query filter without changing original source bytes, partial/malformed new checksum, and unchanged historical meaning. The source-body SHA and decoded arrays remain separately verified.

## Scientific and operational disposition

No FIDS or Flight Status provider request, paid Alert, new credit, migration, DB write against real runtime, cron, subscription, Cloudflare or Replit shell is performed by this code-only PR. The new envelope hash can certify reproducible **local stored-envelope consistency**, not original compressed HTTP wire bytes, remote signed source, completeness of paid provider delivery, per-flight scheduled-passenger scope, verified scheduled milestone T, or actual-versus-estimated runway target. Original scientifically required Gate5 **HOLD**; final Phase5 FREEZE and Phase6 **NO-GO** until source semantics issue [#200](https://github.com/HKcode22/ReplitTranvr/issues/200) is resolved or an explicit versioned owner-approved scientific alternative is designed. Production readback of actual future FIDS rows is still a separate gated step, not claimed by offline CI.

## Acceptance and handoff

Require exact reviewed PR head, targeted tests, full offline safety, real PG16, public-get guard success; then merge and verify postmerge action. No retroactive backfill. Document which records were written before versus after the hash change; never interpret missing hash as zero population or secretly treat it as invalid legacy content.
