# P18 — Actual published primary vs Travnr GET health, claimed exact revisions and source comparison

**Date:** 2026-10-11 UTC (operator Replit Shell, GET-only; actual timestamp not printed in this response). **Evidence class:** operator-pasted public live GET responses plus connected GitHub read-only source validation. **No published changes, mutations, provider calls or webhook POSTs**. Primary object-integrity P02 30/30 PASS [record](2026-10-11_P02_REAL_YSSY_ORIGINAL_30_BLOBS_SHA256_READBACK_OPERATOR_EVIDENCE.md).

## Exact operator-observed HTTP behavior

User ran a `node --input-type=module` bounded **GET-only** read of `/__v39/workspace-runtime` at the two existing published endpoints. Source GET endpoints are public status diagnostics; no URLs containing webhook secrets were accessed. Both returned the schema `v39.phase2f-workspace-runtime.v1`.

| | PRIMARY | TRAVNR_BACKUP |
| --- | --- | --- |
| Published origin | `https://replit-tranvr--hk84164.replit.app` | `https://travnr.com` |
| HTTP | **200** | **200** |
| Response latency | **177 ms** | **169 ms** |
| Runtime status | **PASS** | **PASS** |
| Claimed git SHA | `5de44ba66d59c26d9e5ef3b339b7f729ca2f3653` | `56e1bad0861db1c68403e5b4dc8c34adf4e8325a` |
| Route owner | `server/phase2gCallbackOnly.ts+server/routes_v3.ts` | `server/index.ts+server/routes_v3.ts` |
| Prepaid route registered | true | true |
| Reported raw retention | 168h | 168h |
| Published deployment flag | true | true |
| Owner mode | `replit-published-deployment` | `replit-published-deployment` |
| Durability class | **autoscale** | **autoscale** |

**Interpretation**: both pre-existing published HTTP endpoints successfully handled one GET **at that moment**, and disclosed coherent self-reported configuration. This is NOT proof of idle cold-start reliability, a 10-second incoming real provider POST, source persistence, raw wire identity, source sender credits, common science DB/bucket/callback secret, or automatic provider failover. Both are Replit Autoscale and subject to potentially correlated scaling incidents. A receiver configured to send one immutable `webhookUrl` does NOT redirect its originals to a healthy backup origin without a separate approved independent routing layer; an accessible standby alone is not failover.

## Code-level source verified or not verified

### Primary — reported SHA is a real GitHub source commit

Connected GitHub GET verified commit `5de44ba66d59c26d9e5ef3b339b7f729ca2f3653` exists, subject `ci(phase2g): syntax-check updated owner supervisor excluded from project tsc`.

At **that exact source ref**:
- `server/phase2gCallbackOnly.ts` is present and imports actual `server/routes_v3.ts` with the allowlisted prepaid callback route.
- `server/lib/disruption/flightInstanceCanonical_v3.ts` contains the `Identity-v2` physical operated leg resolver.
- `server/lib/disruption/prepaidProbeRuntime_v39.ts` uses `resolveWebhookFlightIdentity` and `createPrepaidSessionIdentityPersistenceV39` on received prepaid items.
- `server/lib/disruption/prepaidProbeMetricContract_v39.ts` defines `PREPAID_PROBE_METRIC_CONTRACT_V39 = "v39-physical-flight-instance-v2"`. This source evidence corrects a possible OVERBROAD interpretation that the primary is necessarily missing physical-v2. A runtime-claimed SHA is **not cryptographic attestation that these exact bytes are in the running deployment**, so full published code parity remains **UNVERIFIED**.
- Exact source `scripts/v39_phase2g_stage1_logged_supervisor_v39.ts` has `CALLBACK_POLL_MS = 15_000` and `CALLBACK_CONSECUTIVE_FAILURE_LIMIT = 3`. **No later 6+6 candidate integrated in that reported release**. As it is a GitHub-owner supervisor source, even source parity of a published receiver alone does NOT establish which separate GitHub Actions owner actually runs.
- The later investigation branch includes additional callback-origin source safeguards, telemetry, crash/duplicate corruption fixes and pure 6+6 gate that are **NOT demonstrated to be present in this older published SHA**.
- The health route obtains `git_head` from a valid 40hex **`V39_DEPLOYED_GIT_HEAD` environment value if set** or from `git rev-parse HEAD`. Thus even matching a real GitHub commit only proves the *health claim* corresponds to a known revision, not a signed immutable deployment container digest. Do NOT log any secret values when verifying.

### Travnr — live claimed SHA not found in this GitHub repository

Exact backup `56e1bad0861db1c68403e5b4dc8c34adf4e8325a` returned GitHub `No commit found` for `HKcode22/ReplitTranvr` and `fetch_file` at that ref also returned 404. This does NOT mathematically prove no other repository or local unpushed source exists; it DOES prevent this repository alone from authenticating that running backup source. Earlier connected Replit Agent **read-only** inspection reported Travnr published revision differs from a newer local checkout `7164bfb77ce53d387b9c9536b3a33341a5dec146` and its currently published build **lacks physical-flight-instance-v2**. That report is not a signed direct code artifact. Therefore label Travnr **SCIENTIFIC_BACKUP_NOT_VERIFIED / NO-GO FOR PAID FAILOVER**, not safe or compatible.

## Consequences for user-approved scientifically flexible 6+6

- The agreed 6 primary + 6 contingent checks at nominal 15s / 180s maximum *per truly recovered outage*, with a frozen whole-run cumulative risk and paid-credit ceiling, remain a **future prospective** policy. A GET at a healthy endpoint is never proof of lost or safely preserved AeroDataBox original provider flight items.
- The original F.8 plan requires immutable raw JSON/envelope/body/hash, source and processing provenance, provider item/source identity, and exact credit reconciliation. **It does not by itself establish that every valid semantic JSON serialization must be byte-for-byte the wire body**; do not introduce a new byte-exact requirement as a categorical rejection of scientifically valid received-only data without a defined original contract. Nonetheless currently stored canonical parsed JSON is NOT a literal original wire archive and may not suffice to prove exact upstream attempt identity. This requires separate source-contract adjudication, not retrospective source invention.
- Earlier confirmed 30/30 historic P2G24 SHA/byte readback establishes the saved *representation's integrity*, not independent upstream sender attempts. Historic YSSY P2G24 remains failed/censored/UNRESOLVED. Historical external billed `260` vs internal `259` may involve attempted billable items vs locally persisted deliveries and must NOT be silently declared exactly one physically missed flight.
- Do not republish Travnr without the teammate/owner's permitted deployment review and cost constraints; do not send synthetic POSTs into production route, copy callback secret, create duplicate AeroDataBox subscriptions or let a 6+6 operator monitor extend a provider billing risk without real source witness.

## Next safe investigation

1. Operator needs no more initial GET checks: both published GETs are already measured. Remaining P18 checks: independently signed code/binding parity for primary/backup (if they are to serve real traffic), correct physical-v2 for backup, and proof of independent original-source first hop with safe retry-free replay.
2. An isolated temporary Replit development URL currently differs from published deployment and had previously returned 502; it should not be used for a real AeroDataBox source until a completely separate synthetic-only fixture route, storage and detached permissions are proven, not by trial POSTs to normal prepaid path.
3. P09 and P14 remain truly missing first-hop original source ledger and independent provider item cost. P20 real hosted, non-paid 120-minute R0–R11 remains unexecuted; a one-off 200/177ms status cannot close it.
4. Obtain controlled **read-only** original provider attempt and credit evidence where legitimately accessible, or explicitly preserve unknown missingness and only describe valid actually received physical flight items in an ethically/statistically bounded observational subset. Freeze any revised exploratory result criteria prospectively, distinct from F.8 complete probe.
5. Preserve paid **NO-GO** for Sunday 2026-10-11 20:00 PDT / Monday 2026-10-12 03:00 UTC until true evidence closes blockers. GitHub draft-only changes do not republish existing Replit Autoscale deployments.

**Evidence:** Operator actual public GET output; GitHub exact SHA source reads; F.8 protocol §§5/6/21; [P01–P20 tracker](2026-10-10_P01_P20_SUNDAY_YSSY_RELEASE_LEDGER_AND_ZERO_CREDIT_COMMANDS.md), [per-incident 6+6 scientific observed-subset decision](../decisions/2026-10-11_YSSY_6PLUS6_SCIENTIFIC_MISSINGNESS_DECISION_RECORD.md). No new provider credits, storage mutation, database mutation, Replit publication/Cloudflare resource or main merge.
