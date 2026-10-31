# Phase 4 Gate 5 — independent persisted FIDS decoded-body readback verifier

Date: 2026-10-30 PDT. Binding: [Plan f.8](../plans/V3.9_DataCollectPlan_f.8.md) §§4.3,5,5.1,6,16–17 and [Implementation Log](../implementation/V3.9_IMPLEMENTATION_LOG.md) §§1.9,2.22. This continues the actual PR #268 FIDS source-body capture, PR #269 fail-closed scope, and PR #270 effective cutoff clocks. PR #270 merged to main `3023b7a550b87b0c0313d08380352fcea71ca5d9` with exact-head four CI checks PASS; the separate postmerge safety run must be checked independently.

## Problem closed in code, not yet live

The FIDS gateway now persists a fetch-decoded original provider-response body as base64 and SHA inside `clean.fids_query_response.raw_payload`. The implementation already verifies these bytes **before writing**. Until now, Phase 4 had no separate **post-storage readback** to distinguish actual restored decoded-body evidence from a wrapper that merely claims it was stored. Without a second read and SHA check, preserved provider payload custody remained a prospective write-path claim rather than an empirically verified retention/readback claim.

The new `phase4Gate5DecodedFidsReadback_v39.ts` introduces one bounded, parameterized read-only SELECT from **unexpired** `fids_query_response` rows, with an explicit as-of timestamp and airport scope; max four inspected receipts (SQL fetches five to detect incomplete samples). In memory, it validates the existing two custody flags, evidence schema/representation/length/canonical base64/SHA-256/UTF-8 JSON, requires the requested direction arrays, and compares decoded source arrays against the JSONB-persisted reconstructed arrays using semantic deep equality. This last point matters because PostgreSQL JSONB is permitted to reorder object keys without changing their meaning; the decoded **body bytes** still retain their exact byte order and hash.

Only aggregate counts/status leave the evaluator: passed, legacy missing-body, rejected integrity, total inspected and more rows beyond bounded sample. No flight identifiers, decoded bodies, hashes, base64 content or query IDs are returned. The SQL is scoped read-only and excludes expired provider content. No provider API request, paid Alert create, source mutation, DB writer, migration, timed Replit shell or Cloudflare is involved.

## Explicit limits

- New offline tests use a mock provider fetch and atomic persistence injection to cover the **exact current producer-to-readback shape**. They are **not evidence that real retained FIDS rows have passed a deployed database readback**. No production DB connection has been made in this PR.
- This checks locally preserved *fetch-decoded body bytes*; it does **not** prove original compressed HTTP wire bytes, cryptographically signed server origin, provider-side first-availability clock, the complete original FIDS population, or exact AeroDataBox per-flight scheduled passenger scope.
- The outer `response_hash` was generated over the original JavaScript wrapper serialization before PostgreSQL JSONB canonicalized keys. The readback validates the **format and presence** of the persisted outer hash, **not a false reconstruction** of its original JSON string. It reports `persistedWrapperHashRecomputed:false`.
- One bounded sample is not a census. Expired/missing source yields unmeasurable, not source coverage zero, and maliciously changed bytes get an explicit integrity HOLD.
- Strict Gate 5 remains HOLD; external source-semantics issue [#200](https://github.com/HKcode22/ReplitTranvr/issues/200) remains unresolved (provider-native selected T and truly actual, not estimated, runway label). Phase 5 final FREEZE and Phase 6 authorized spend remain NO-GO.

## Next evidence step

After CI and merge, the controlled owner may separately run a **production read-only repeatable-read transaction** to evaluate retained prospective FIDS rows before expiry, with runtime connection and retention rights verified. This implementation deliberately does NOT place raw production database access inside public GitHub Actions and does not request a human timed shell command. Any such real readback must record only aggregate metadata and its query scope/checkpoint; it cannot certify downstream target semantics.
