# P14 — original sender → authenticated edge → internal delivery: synthetic three-leg evidence attribution and exact flight-item arithmetic

**Status 2026-10-11 UTC: implemented and undergoing GitHub Actions in isolated investigation PR #27. This is an offline fixture model, not AeroDataBox-signed sender evidence and not a published paid receiver fix.**

## Why this matters

The real historical P2G22 incident showed *external AeroDataBox billable flight-item credits 260 versus internal 259*; the identity/source of the one-credit difference remains unproven. A lost POST before Replit, an acknowledged object never committed to the scientific tables, delayed SQL or a per-notification cost mismatch may all create apparently similar aggregate numbers. **One webhook POST can contain multiple flight items**; therefore `attempts`, `flight items`, `internal scientific rows` and `billable credits` cannot be interchanged. The user and assistant agreed to permit scientifically interpretable, explicitly scoped verified *received-only* descriptive results where unknown upstream missingness is acknowledged, rather than treating every brief gap as automatic mathematical invalidation. But one cannot presume an unknown upstream census is zero or fabricated.

Existing `experiments/phase2g_rehearsal/signed_attempt_reconciliation_v39.ts` uses **two DIFFERENT HMAC keys** for synthetic provider sender manifests versus experimental edge wire+canonical SHA receipts, and compares them against internal synthetic DB delivery identities. Source signer is an emulator; it does **not** cryptographically authenticate real AeroDataBox sender events or their billable credit ledger, and the current original public Replit URL does not integrate this independent first-hop receiver. This remains distinct from stored P2G24 original object integrity 30/30 (proven for saved objects, not upstream completeness).

## Substantive code changes

Reconciliation now distinguishes:

- `senderAttemptsNotVerifiedAtEdge` and `senderCreditsNotVerifiedAtEdge`: attempts/FLIGHT ITEM credits in the independently **synthetic signed sender manifest** that lack an exact signed edge receipt matching attempted notification ID/attempt number, provider attempt/generated UTC, original-wire SHA, canonical SHA, and cost, inside the frozen original window. These are **not** automatically asserted to have been irretrievably lost at the real provider/host.
- `senderMatchedEdgeAttemptsMissingInternal` and `senderMatchedEdgeCreditsMissingInternal`: authentic synthetic sender-to-edge matches whose attempt keys do not appear among committed internal delivery records. The source was proven at the synthetic edge but not its science DB.
- `senderMatchedEdgeAttemptCount`: signed sender attempts matched to edge data on all exact identity/source/cost fields and UTC window.
- `fullyCorroboratedAttemptCount` and `fullyCorroboratedFlightItemCredits`: signed sender + edge + internal record exact **canonical SHA, object readback SHA, preserved original edge UTC and per-attempt item credit amount**. It is an **evidence-level agreement count**, not physical-flight-v2 science completion, a cryptographically signed actual provider bill, or sender timely ACK.
- `internalAttemptsWithoutMatchingSenderAndEdge` and `internalCreditsWithoutMatchingSenderAndEdge`: stored internal records whose attempt keys lack exact sender-correlated edge receipts; prevent falsely treating an orphan record as reliable flight provenance.

The eight elapsed UTC bins now count only **sender-correlated authentic synthetic edge receipts inside the frozen original window**, not unrelated or conflicting signed edge messages. Orphan data produce explicit errors instead of artificially inflating sample coverage. Sender cost/edge cost/internal cost sums now use **BigInt exact accumulation**, and throw `SYNTHETIC_BILLED_CREDIT_TOTAL_UNSAFE_INTEGER` if any total exceeds `Number.MAX_SAFE_INTEGER`; no silent inaccurate floating-point rounding. This is a math-integrity rule, NOT a blanket zero-missingness requirement. Individual attempts require nonnegative safe integer flight-item credits, and duplicate original relay events remain idempotent.

## Regression cases, including the actual 260/259 numerical pattern (SYNTHETIC ONLY)

- Independent synthetic sender **260**, edge only **259**, internal **259**: `senderCreditsNotVerifiedAtEdge=1`, `senderMatchedEdgeCreditsMissingInternal=0`. Cannot infer the original POST reached Replit.
- Sender **260**, edge **260**, internal **259**: `senderCreditsNotVerifiedAtEdge=0`, `senderMatchedEdgeCreditsMissingInternal=1`. Sender/edge received but internal delivery evidence missing.
- Correct attempt keys everywhere but **one wrong per-item credit amount**: attempt-count and matched-edge counts can agree while `fullyCorroboratedFlightItemCredits` is lower and an error is raised. This distinguishes *wrong credit data* from a missing attempt.
- **One notice with five flights is one attempt/five billable flight items**; if its internal record is missing, the model reports five missing internal credits, not one. This is important for airport-wide V3.9 notifications.
- Independent edge message not in sender ledger: excluded from source time bins, flagged as unrelated, cannot produce a false apparent coverage pass.
- Excessively large (individually safe) source credit items whose totals exceed safe JS integer precision: fail closed rather than round.

All diagnostic fields remain **aggregate counters only**, without raw provider content, original notification IDs, webhook secrets, provider subscription tokens, or per-flight PII. User's 6+6 policy remains prospective and does not turn synthetic evidence into original provider sender attestation.

## Actual remaining P14/host release blocks

This code **does not** supply real provider sender-attempt log authentication, accurate real billed item-by-item totals, or an immutable independently available webhook first hop. Replit Autoscale returning HTTP 200 to a GET is not durable original POST ingestion proof; another Replit URL cannot automatically receive an original AeroDataBox webhook pinned to the first URL. Real P2G22 260 external /259 internal root cause therefore **remains UNKNOWN**. The original run is still failed/censored as historically documented. A conditionally scientifically useful received subset must clearly state measured flight-items and missingness limitations, avoiding unsupported fleet/airport-complete inference.

**Next real step**: obtain legally and technically available authoritative provider attempt/item-level billing witness, compare exact send UTC/cost and body/source IDs to the verified local original archived bytes and actual database receipt status, and preserve unknown attempted-not-received counts if provider data do not exist. Independently attest deployed receiver/owner/immutable POST source first-hop if paid Stage-1 is to resume. Do not authorize Replit republish, main merge, paid alerts, Cloudflare or another two-hour Shell test by interpreting green synthetic math tests as published success.

Links: [P01–P20 tracker](2026-10-10_P01_P20_SUNDAY_YSSY_RELEASE_LEDGER_AND_ZERO_CREDIT_COMMANDS.md), [joint user/assistant missingness and 6+6 policy](../decisions/2026-10-11_YSSY_6PLUS6_SCIENTIFIC_MISSINGNESS_DECISION_RECORD.md), [P13 atomic quarantined physical-v2 fixture replay](2026-10-11_P13_ATOMIC_QUARANTINED_REAL_PHYSICAL_V2_FIXTURE_REHYDRATION.md), [PR #27](https://github.com/HKcode22/ReplitTranvr/pull/27).

CI at tested source SHA `365d77f32bbea23ee9e702a10a819238bf3d37b3`: [GitHub Actions #38119017240](https://github.com/HKcode22/ReplitTranvr/actions/runs/38119017240) was in progress at document creation; verify status before claiming all tests passed.
