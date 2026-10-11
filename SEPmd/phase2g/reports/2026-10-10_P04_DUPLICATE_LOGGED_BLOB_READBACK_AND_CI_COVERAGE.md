# Phase2G P04/P05/P09 — original Replit blob re-verification for duplicate prepaid callbacks

Date: 2026-10-10 America/Los_Angeles. Isolated investigation branch; **no publication, Replit cost-bearing API use, live DB writes or provider credits**.

## Concrete previously unprotected 2xx path

In the actual V3.9 prepaid processor `server/lib/disruption/prepaidProbeRuntime_v39.ts`, the deduplicated notification path found an existing UNLOGGED delivery row and simply incremented `callback_success_2xx` before COMMIT. It did **not re-read the original Replit object or bind the delivery to the surviving LOGGED blob-reference row**. A missing/corrupted source could be acknowledged a second time with 200, falsely implying raw-source continuity. Actual transport 200 and source custody are different claims; `callback_success_2xx` is an application commit/intended ACK counter, **not confirmed AeroDataBox receipt of 200**.

## Prospective draft-only correction

- The duplicate branch joins `clean.prepaid_probe_delivery_runtime` to `clean.provider_content_blob_ref` by its exact blob_ref UUID while holding the original session admission lock.
- Verifies original logged ref exists with matching source kind, exact session/delivery `source_record_id`, same canonical payload SHA and bytes, correct provider blob contract/storage kind, opaque blob name/ref binding, 168-hour retention and unexpired source; no new object and no extension of retained time.
- Uses the current **existing Replit object bucket** to download the original object; verifies byte count, SHA-256 and all bytes match the originally committed input. No Cloudflare/backup provider is needed for this re-verification.
- If metadata is missing/tampered or original source is missing/corrupted/unreadable: **throws, counts the callback as a failure under the original transactional savepoint and returns 5xx through the real prepaid route**. The old committed delivery and its logged evidence remain; no false second source ACK and no second object upload.
- The original production CI workflow mistakenly did **not trigger on changes to `prepaidProbeRuntime_v39.ts`**. The trigger includes that file, `providerBlobStore_v39.ts` and `replitProviderBlobStore_v39.ts`. An earlier syntactically invalid source revision and outdated test double were fixed before verification; the old offline double now returns the same LOGGED metadata as real SQL instead of mere UNLOGGED ID/hash.
- True duplicate ACK incurs a second **Replit object download under a PostgreSQL session lock**. This is a documented **P05 10-second-delivery-deadline risk** for bursts, cold starts or delayed storage. One added disposable-PG HTTP test explicitly delays readback 220ms and requires no early 200. This is a deterministic mock, not Replit P95/P99 or actual AeroDataBox sender latency.

## Regression evidence

- [Verified CI #38105116907](https://github.com/HKcode22/ReplitTranvr/actions/runs/38105116907) at source `d9641e781089524736023eb1b0c4d48a2106c04d`: **468/468 offline (46 suites), 49/49 actual V3.9 disposable PostgreSQL16 (both jobs SUCCESS)**. Four new PG tests cover healthy lost-200 retry without duplicate blob, missing original raw on actual prepaid route, corrupted object on retry, and three types of forged/missing logged blob metadata; genuine SIGKILL again confirms UNLOGGED reset and LOGGED owner-binding persistence.
- Source `a2f556ccbf2b63a769317efed40365a026ef069b` adds a fifth disposable PostgreSQL delayed-blob-read HTTP regression to test P05 ACK timing. [CI #38105227610](https://github.com/HKcode22/ReplitTranvr/actions/runs/38105227610) **must be checked for both-job success before marking that extra test verified**.

## Remaining unclosed launch blockers

This fix cannot preserve a provider webhook **never delivered to Replit at all**, independently authenticate original sender attempts, correct a 260-vs-259 external bill gap, guarantee full original wire JSON (production currently archives canonicalized JSON) or reconstruct lost UNLOGGED source timelines without signed independent evidence. No Cloudflare or new paid receiver is authorized. Actual `6+6` supervisor still supplies `evidence:undefined`, effective limit 3; exact Replit deployed source SHA remains unverified; no true hosted 120-minute zero-provider-credit rehearsal, accepted prospective amendment or fresh paid authorization exists. **Sunday Oct 11 20:00 PDT YSSY paid NO-GO pending those gates.**
