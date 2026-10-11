# Phase 2G Stage-1 YSSY — Replit support #564568 and AeroDataBox no-retry delivery risk

**2026-10-10 | SOURCE AUDIT + ACTION REQUIRED | NO PROVIDER ACTION | NO PAID AUTHORIZATION**

## Evidence and boundaries

**Replit Support human response (Quinn, 2026-10-10T02:39:28Z, ticket #564568, Gmail message ID 1a123ae056c75e67):**
- Autoscale scales to zero when idle. Incoming HTTP requests may be held while the instance starts. If sender timeout (project assumes approximately **10s**) elapses before startup completes, the request can be dropped; **Replit has no automatic buffering/replay for the failed webhook and no retry of in-flight shutdown failures**.
- Replit Cloud current Logs viewer scopes to current *published revision*; logs from prior revisions do not appear after republish. Oct 8 original-revision logs require internal engineering access. Operator supplied publication receipts including 2026-10-09 09:37:41Z, **after** original paid failure 04:58Z.
- Reserved VM is always-on and eliminates *idle scale-to-zero cold-start* exposure, at an additional fixed monthly hosting cost. Support has **not** shown that the original failure was idle scale-to-zero versus another replacement reason.
- Engineer needed for Q1 original replacement cause, Q2 health/readiness evidence and original-revision logs. Quinn asked user to supply a **Private Join Link** by Repl Invite. This may grant project access: support calls it read-only, but **permission scope/revocation and exposure of secrets/connected data must be verified before sharing**. Do not paste a bearer join link into GitHub/public issue or logs. No link has been generated/shared by the assistant.

**Source-level confirmed contract:** On GitHub `main`, `server/lib/disruption/prepaidProbeWindow_v39.ts` calls `createSubscription("FlightByAirportIcao",icao,{url:webhookUrl,maxDeliveryRetries:0})`. `server/lib/disruption/aerodataboxLimiter_v3.ts` resolves undefined to **0** and refuses all nonzero `maxDeliveryRetries`, making it a deliberate fail-closed budget/scientific-policy choice, not an unnoticed default.

**Provider first-party guide:** [Flight Alert API new credit-based system (updated 2026-01-31)](https://aerodatabox.com/flight-alert-api-2026/) explicitly says:
- one Alert credit per flight item per attempted send **whether delivery succeeds or not**;
- credit-based webhooks have **zero delivery retries by default**;
- `maxDeliveryRetries` can be 0..2 if explicitly included on creation, and every retry also consumes credits;
- no 2xx before provider timeout or a non-2xx are failure outcomes for delivery; retry requires opting into that billing/behavior.

**Interpretation:** The platform and code create a credible *path* to an externally charged but internally unreceived item when a webhook arrives during cold-start or in-flight interruption. This is a **plausible** class for P2G22 `external=260/internal=259`; the P2G22 exact cause **is NOT established** from aggregate delivery accounting. For P2G24 supervisor triplet, the missing root readiness route and published instance replacement are possible factors; Replit engineering must supply original prior-revision logs/reason code.

## Quantified warning from existing zero-credit evidence

Independent 146m sparse observer [run #37993757772](https://github.com/HKcode22/ReplitTranvr/actions/runs/37993757772): first root GET took **5,391ms** and final GET **3,254ms**, each coincident with published `starting up user application` / `SERVER_LISTENING` in Replit logs. Those were **simple GET requests without SQL or object writes**; they do not measure valid signed prepaid POST latency. Even successful GET response after 5.4s is a safety concern if the external sender has a 10s envelope and signed POST must also await database lock + raw storage upload/readback + transaction COMMIT. Do not fabricate P99 or claim that signed POST exceeded 10s without measuring.

## Phase 2G status and exact calendar

We are **Phase 2G / Gate 2 / Stage 1**, with successful WSSS-v2, OMAA-v2, scientifically valid but capacity-failed MMUN-v2 and completed SKBO-v2 (probe 15). **YSSY remains scientifically unmeasured** after probes 16–18 failed. Early pilot deferred LKPR and made automatic Stage 2 unnecessary under that limited question. Historic rows immutable; no progression to Phase 6.

Frozen YSSY Stage-1 UTC slot **04:00 ±1 hour**, preferred start 03:00, duration 120m, both UTC and Australia/Sydney weekday, metric `v39-physical-flight-instance-v2`, >=60 rows/hour capacity gate, >=6 stability buckets, exact zero-gap reconciliation.
- NEXT eligible preferred class: **Monday Oct 12 2026 03:00–05:00 UTC** = **Sunday Oct 11 20:00–22:00 PDT** = **Monday Oct 12 14:00–16:00 AEDT**.
- Earlier **Sunday Oct 11 03:00–05:00 UTC is INVALID** (weekend UTC/Sydney).
- These are schedule windows, not approval.

## Hard retry-governance blocker

The already-frozen `artifacts/phase2g-early-pilot-yssy-p2g22-recovery-freeze-20261007.json` permits **one** recovery after P2G22/probe16 (`maximum_additional_attempts=1`) and expressly **forbids further automatic/manual retries under that freeze**. P2G23 used the recovery. P2G24 also failed, and cannot be erased from the failed history. A **new prospectively dated human-approved bounded technical retry amendment** must explicitly adjudicate probes 16–18, source/build changes and rationale, fixed statistical acceptance, how retries/budgets are bounded and how to handle independent infra failures, before any next Stage-1 provider action. No unsafe automatic workaround.

## Proposed response to support / safety review

Quinn requests Private Join Link from project Invite. Before sharing, verify access role is actually read-only, whether it grants exposure to Secrets, App Storage, database or deployment controls, whether it can be revoked and whether a platform-only historical log export can be done with account verification instead. Any link must go only in the private Replit support ticket, not GitHub. Engineering should investigate ORIGINAL instance/revision `2026-10-09 04:58:15–04:59:10Z`, pre-09:37 republish, include exact instance reason/health probes/routing POST failure. No Agent/republish/hosting plan change authorized by access request.

## No-provider-code work we can complete before Sunday

1. **Preserve evidence:** original failed probes remain `failed`, P2G24 30/30 raw object SHA matched during read-only audit, retain before earliest expiry `2026-10-16T04:02:22.780Z`; do not exfiltrate provider payloads into public GitHub.
2. **Countermeasures (without changing billing model):** Pre-established always-on durable ingress OR Reserved VM, not a new midrun callback URL. Evaluate Reserved VM cost/safety and no-scale-to-zero benefit, but confirm that server crashes/DB timeouts still need retry + queue. Another fully validated independent front door should persist/authenticate raw notifications and respond 2xx after durable store before asynchronously forwarding to the existing V3.9 processor; ensure provider signature, scope/URL bind and delivery idempotency remain intact.
3. **Test the actual signed webhook under cold start:** new disposable synthetic session with **nonempty realistic flight payload**; instrument end-to-end POST arrival→DB connection/lock→object upload/readback→delivery row→COMMIT→2xx. Use isolated environment and no AeroDataBox subscription/Alert credits. Simulate app SIGTERM/restart at before upload, after upload, after COMMIT/before reply and PostgreSQL reset; verify no double count, clear failure, and exact 2xx ACK latency budget, then tear down synthetic only.
4. **Balance and provider-send monitoring:** external settled provider cost authoritative; 2xx count alone insufficient to prove receipt of every externally billed item. The project cannot safely infer nonzero delivery gap as MATCH.
5. **Dry-run only:** verify frozen YSSY calendar/time class, updated GitHub owner source and published app exact build; independent watchdog/cleanup; old P2G23 scripts/AUTH not reused; no active paid subs, no open incident and live balance preflight later when authorized.
6. **Do not enable AeroDataBox retries as a quick fix:** `maxDeliveryRetries=1|2` changes credit consumption/reconciliation and scientific frozen probe protocol and may create duplicates or late delivery. Only examine as separately prospectively authorized alternative with new modeling and safety tests.

## Gate decision

**No paid YSSY before Sunday preparations finish.** Existing 130m/146m checks are health-only; green mocks don't certify direct signed POST cold-start durability. Full time-class compliance, fresh approval after exhausted YSSY recovery, immutable source/runtime/artifact binding and real end-to-end receiver/owner readiness are mandatory. If one missing: defer to next eligible **Tuesday Oct 13 03:00 UTC** (Monday 8 PM PDT) rather than spending credits on an unverified trial.

Refs:
- [previous Sunday Stage-1 contingency](2026-10-09_YSSY_STAGE1_SUNDAY_PDT_CONTINGENCY_AND_RETRY_GATE.md)
- [Replit cold-start correlation](2026-10-09_P2G24_REPLIT_LIFECYCLE_COLD_START_GITHUB_CORRELATION.md)
- [offline real-function fault tests](https://github.com/HKcode22/ReplitTranvr/actions/runs/38009253110)
- [issue 28](https://github.com/HKcode22/ReplitTranvr/issues/28)
