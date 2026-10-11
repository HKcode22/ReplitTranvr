# P2G YSSY Oct 11 / Oct 12 — operator decisions and remaining release gates

**Prepared:** Saturday Oct 10, 2026 PDT, evidence-only from the isolated draft investigation branch.  
**Frozen eligible class:** Sun Oct 11 **20:00 PDT**, Mon Oct 12 **03:00–05:00 UTC**, Mon Oct 12 **14:00–16:00 Australia/Sydney**. The frozen calendar says **time-eligible, execution_authorized=false**. Previous YSSY P2G22/P2G23/P2G24 failed/censored. No missed paid data is repaired or reclassified by this document.

## Read-only evidence refreshed

- Github main `dd88fb2042f4267c071e23c2d3a65ecdf83fc90d` remains unchanged; PR #27 is open/draft/unmerged.
- Last proven code before this follow-up: `42f90e02d9734609f2ee342e0bdcb9141fde86ad`, [GitHub CI #38113144926](https://github.com/HKcode22/ReplitTranvr/actions/runs/38113144926) **582/582 offline, 76/76 disposable PG, UNLOGGED crash reset**.
- Oct 10 2026 local follow-up adds nondeployable P10 account/staging evidence validator and negative tests to the investigation branch (`p10_readonly_hosted_evidence_gate_v39.ts`, matching test, CI workflow). This gate is **not resource provisioning, not a real hosted test, not independent authenticated source proof**, and it cannot authorize paid or 6+6. Its test CI must be confirmed at the exact code SHA before marking verified.
- Authenticated connected Cloudflare **GET-only** inventory today: **0 Queues, 0 Worker scripts; R2 list fails API 10042 / enable R2 via Dashboard**. No independent webhook ingress exists there.
- Replit ticket #564568 Gmail search shows no later engineering-specific root-cause email beyond Oct 10 02:39 UTC general Autoscale advice, followed by the user's private project-link response. Replit confirmed general cold-start/no-buffer risks, **not the exact P2G24 instance-change cause**.
- Existing Travnr/Almabdella alternate public deployment has a reported published build lacking physical-flight-instance-v2. GitHub cannot independently attest its published SHA, nor primary's exact deployed SHA or common scientific DB/bucket/secret/owner. It is **not an eligible standby**.
- True V3.9 parser receives original wire but existing scientific storage persists **canonical(parsed JSON)** rather than the original literal HTTP body. Actual V3.9 HTTP → disposable PostgreSQL tests prove the representation distinction; never equate both formats.
- Independent locally fsynced frontdoor preserves 128 synthetic source records over accelerated 8×15-minute bins including two virtual three-minute receiver interruptions. **Frontdoor crash/down itself still loses never-received originals; local fsync is not highly available cloud storage.**
- AeroDataBox Flight Alerts cost **per flight item per send attempt**; zero retries policy is unchanged. Historical **external 260 vs internal 259** remains unresolved, not newly attributed to Replit, SQL or a particular flight.
- Official Cloudflare [R2 onboarding](https://developers.cloudflare.com/r2/get-started/) requires an R2 subscription **checkout** before buckets may be used; Standard [free usage allocation](https://developers.cloudflare.com/r2/pricing/) is **not** an absolute $0 account-wide cost ceiling. Queue Free 24h retention cannot replace independent >=168h original source retention; [R2 bucket locks](https://developers.cloudflare.com/r2/buckets/bucket-locks/) are prospective only.

## What the human operator needs to decide (do NOT infer approval)

**Decision A — separate hosted staging:** Is the user willing to review a Cloudflare R2 subscription checkout and the actual existing account usage/payment conditions, then optionally approve a separately named **synthetic-only** Worker/R2 Standard bucket/Queue with verified nonzero-billing controls? **No permission has been given to enable billing, provision, bind real provider secrets or publish.** If the operator insists on strictly no possibility of charges, do not provision; continue offline and defer paid YSSY until a truly cost-controlled independent design exists.

**Decision B — teammate binding attestation:** Arrange with an authorized maintainer a READ-ONLY reproducible published primary and Travnr exact code/package SHA (not just editor checkout), actual physical-v2 and original-wire custody revision, and signed Boolean equality evidence for the live scientific DB, dedicated original-source bucket, callback secret binding, one subscription owner/dedup. **Never share actual secrets, raw URLs, connection strings or patient/user/flight payloads** in chat. Any future republish must be separately approved and post-republish reverified.

**Decision C — isolated full rehearsal:** Once A/B prerequisites and staging design pass, separately authorize a no-provider-credit **wall-clock 120-minute** R0–R11 fault rehearsal with a strict sender-observed ~10-second HTTP acceptance deadline, distinct sender/edge/receiver ledgers, exact raw bytes, preserved provider/source clocks and physical-flight-v2, original UTC 15min bins, retry/owner/cleanup, database UNLOGGED reset and independent 168-hour storage. No production webhook POST, no paid subscription and no automatic PR merge. **R0 PASS + safe/fail-closed R1–R11 are required, not merely locally green unit tests.**

## Hard release order and current decision

P09–P11 independently durable first-hop original wire/source UTC → P12 at-least-once replay and current SQL readback → P13 science-safe original physical-v2/full window rebuild or explicit censor after UNLOGGED loss → P14 externally authenticated sender *flight-item credit* reconciliation (260/259 still veto) → P18 exact published primary/backup parity → P15–P19 prospective 6+6 independent witness/whole-run cap/operator permission → P20 real hosted 120-minute R0–R11 tests → **new prospective paid human AUTH**.

**YSSY Oct 11 20:00 PDT paid NO-GO on current evidence.** The next weekday eligible UTC class can be evaluated after those hard gates pass; simply postponing to the next calendar slot never guarantees readiness. The user can be asked for decisions A–C, but one affirmative answer is NOT approval for all later actions. No code/document in this report authorizes live changes.
