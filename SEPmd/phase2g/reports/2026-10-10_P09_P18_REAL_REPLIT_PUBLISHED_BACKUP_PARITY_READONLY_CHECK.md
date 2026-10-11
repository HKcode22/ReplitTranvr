# Phase-2G P09/P18 read-only *actual published* Replit backup parity investigation

Observed October 10, 2026 PDT from linked Replit integration and source inspection. **No app update, provider call, subscription change, synthetic paid-webhook POST, database mutation, source secret readout, Replit republish, Cloudflare resource, account creation or GitHub main merge.**

## Precisely verified read-only publication status

The existing editable Replit apps:
- Primary project `@hk84164/ReplitTranvr` published status `success`, URL `https://replit-tranvr--hk84164.replit.app`, deployment ID `ce096a13-62ff-4f7a-ae6f-3bc91af601d9`.
- Teammate project `@almabdella/Travnr-Environment-Setupzip` published status `success`, URL `https://travnr.com`, deployment ID `015d7b23-dd41-4dd1-9bb9-602220a358bb`.

A publishing service status of 'success' means published, not that two apps share the same scientific schema, raw bucket, subscription owner, deployed code or network reachability during failure.

## Teammate live-code audit (reported by the connected Replit read-only Agent, NOT an operator-signed code+binding attestation)

The agent reported deployed git revision `56e1bad0861db1c68403e5b4dc8c34adf4e8325a` vs newer CURRENT CHECKOUT `7164bfb77ce53d387b9c9536b3a33341a5dec146`. The latter commit exists in the GitHub `HKcode22/ReplitTranvr` repo; the former deployed hash **was not found through this repo's GitHub commits endpoint**, so independent published-source-to-repo equality is **NOT VERIFIED**.

Reported per-feature, live-deployment-limited status:
- Prepaid `POST /api/v1/webhooks/aerodatabox/:secret/prepaid/:sessionId` route: **verified present** by runtime health + deployed code inspection.
- Webhook path-secret comparison and dedup prior-delivery mechanism: **implemented**; exact secret equality with primary not inspected/verified. Deployed version reportedly uses direct secret string comparison, rather than an independently verified constant-time deployed guard.
- Upload/exists/download/byte compare before HTTP 2xx: **reported present for the representation that is stored**. That stored object in V3.9 source is **canonicalized JSON of the parsed body**, not a byte-identical copy of the original HTTP wire payload.
- **Critical:** prepaid `physical-flight-instance-v2` identity resolver, `flight_instance_id` and versioned metric contract are **NOT PRESENT IN TEAMMATE'S PUBLISHED BUILD** according to the Replit read-only Agent, even though newer local checkout has them. This is a code/revision mismatch, not a scientific-compatible standby.
- Dedicated Replit bucket required mode: **reported configured**; exact original dedicated bucket ID equality across apps **NOT VERIFIED**. Only bucket prefix was visible.
- V39 database adapter present: **reported**, but actual same Neon/PostgreSQL scientific database binding **NOT VERIFIED**. No DB/secret identity values disclosed.
- A synthetic V39 POST without AeroDataBox might mutate LIVE scientific receiver rows, original blob storage and callback accounting; none was sent.

Primary published revision and physical-flight-v2 runtime evidence: **UNKNOWN**. Linked primary Replit ask_question returned no usable text; successful primary publish status is not exact code/bucket/owner proof. Never infer deployed main or latest GitHub branch from workspace source.

## Important source provenance distinction (verified in current GitHub draft, not assumed about deployed primary)

Current draft `server/routes_v3.ts` captures a Buffer in JSON parser's `verify` hook as `req.rawBody`, to check original JSON duplicate-keys before parse. **But the prepaid handler forwards `body:req.body` to `persistPrepaidProbeWebhookV39`; `prepaidProbeRuntime_v39.ts` constructs `rawText=canonical(input.body)`, then persists `Buffer.from(rawText)`.** That is verified canonical-body source custody, NOT exact literal original HTTP wire-byte custody. Whether frozen F.8 specifically requires byte-exact original HTTP rather than losslessly canonicalized semantic JSON requires a formal contract review; do not silently call the two equivalent.

Our experimental localhost frontdoor DOES fsync exact wire bytes; its success does not mean current live prepaid V3.9 does.

## Automated non-billable fail-closed parity gate

Added `experiments/phase2g_rehearsal/synthetic_published_backup_parity_gate_v39.ts` and `tests/phase2g_published_backup_parity_gate_v39.test.ts`, referenced by draft CI. Pure input evidence from operator attested deployed build/runtime and connection/bucket/secret equality is **required** before describing a published standby as scientifically aligned. The gate requires verified published commit, prepaid route and physical-flight-v2 presence, independently reachable endpoint, exact 168h raw storage, literal original wire archive if claiming byte-exact custody, **signed independent equality attestation** for target database, dedicated original bucket, callback secret, one owner/dedup, F.8 metric/eight bins, independent frontdoor, upstream sender ledger, real hosted 120-minute rehearsal. On any missing evidence it fails closed. Even an entirely verified hypothetical set **never authorizes paid YSSY or activates actual 6+6**; at most recommends isolated no-provider-credit hosted rehearsal.

The user-agreed proposed **6 primary +6 independently source-verified emergency health checks** reset per truly recovered outage, with cumulative whole-window loss/spend budget. This operational policy cannot substitute for missing physical-v2 in a published standby, provider sent-attempt ledger, original source custody or a frontdoor single point of failure.

## Gated next steps (no live mutation authorized here)

1. Obtain **read-only**, nonsecret exact published primary git SHA and live physical-v2 metric contract evidence. Confirm the standby source/version with an independently verifiable deployed package digest; publishing 'success' alone is insufficient.
2. Obtain zero-secret **signed cross-deployment binding challenge** using an authorized operator verifier: same scientific DB identifier (not printable connection string), same dedicated bucket identity (not printable bucket ID), same callback secret binding without revealing secret values, and one subscription owner. Do not reveal credentials or use a synthetic POST that modifies scientific database.
3. Audit original source custody contract: what counts as original paid provider JSON source vs literal wire; preserve frozen F.8, provider item identity/billed source and original bytes as required.
4. If teammate app is to be used, an explicitly permitted, built/reviewed and tested future republish would be needed, and original branch/source/secret/data parity re-attested **after** publication. No republish has occurred and no changes to teammate app were made.
5. Independently durable fixed HTTPS frontdoor and replay must be proven; local fsynced test receiver alone is not HA. Complete wall-clock hosted **two-hour zero-provider-credit R0–R11** and per-source/loss/paid-budget safety checks.
6. **Paid YSSY remains NO-GO**. Historical 260 billed vs 259 internally recorded remains UNRESOLVED.

## Evidence status clarification

The Replit Agent's code/run findings are **a read-only AI inspection**, not a cryptographically signed independent attestation; therefore label all deployment code parity conclusions preliminary until reproducible SHA/version/binding verification. Actual GitHub original source excerpts directly confirm current draft's `req.rawBody` versus `canonical(input.body)` distinction.


## Verified continuous-integration evidence for backup gate and literal original HTTP format

[**GitHub Actions #38112738722**](https://github.com/HKcode22/ReplitTranvr/actions/runs/38112738722), **exact tested source** `ef7006ff543494b05cf3dc974a4bd1d301ca29c5`: both CI jobs SUCCESS, **580/580 offline regressions in 56 suites +76/76 actual disposable V3.9 PostgreSQL16 integrations**, real database SIGKILL still confirms `UNLOGGED` state reset. Neither the root GitHub project nor public Replit deployments were modified, paid queried or republished.

12 pure off-line `tests/phase2g_published_backup_parity_gate_v39.test.ts` tests demonstrate fail closed on the actually **reported** Travnr published build's missing physical-v2, unverified revision/callback secret/database/bucket parity, source literal-wire custody not proven, frontdoor/one-subscription/replay/source ledgers absent, and no full hosted 120min rehearsal. A hypothetically fully operator-attested source pair can be considered for **an isolated no-AeroDataBox-credit hosted rehearsal**, but the gate always returns paid GO and 6+6 **false**.

One new actual V3.9 HTTP+PostgreSQL integration test provides a stronger observation than static inspection: a synthetically transmitted pretty-printed JSON body is parsed and persisted; the stored source blob is exact **canonicalized JSON with the same parsed object**, but differs from the sender's literal HTTP bytes in length/hash/content ordering. CI explicitly printed `ACTUAL_V39_ORIGINAL_WIRE_BYTE_ARCHIVE=NOT_IMPLEMENTED` and `ACTUAL_V39_CANONICAL_PARSED_JSON_BLOB=CONFIRMED`. **No provider original flight observation was modified.** This is a current draft-source behavior test, not an independent attestation of the currently deployed primary build.

Consequence: unless the original F.8 science and contractual definition expressly treats canonical JSON as sufficient original source, do not claim byte-for-byte preservation or use the current canonicalized blob as a literal signed wire receipt. Any future production change must be tested for duplicate source identity/retention, replays and historical compatibility; it was **NOT** implemented in production here.
