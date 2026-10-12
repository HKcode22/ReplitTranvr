# P25 YSSY: Operator authorization to PREPARE a bounded attempt (not launch authorization)

**Operator message:** October 11, 2026 approximately 18:32 America/Los_Angeles: the user explicitly answered **"yes i do approve"** to the question **"Do you approve preparing one new YSSY 120-minute attempt with a maximum exposure of 500 Alert credits, a protected floor of 1,000, and no automatic retry?"**

**Consent scope:** Preparation of one prospective 120-minute YSSY attempt only, with a **potential** cap of 500 AeroDataBox Alert credits, a 1,000-credit protected account floor, and no automatic retry. The user also reported adding Replit production environment keys `V39_PREPAID_FAILED_SOURCE_JOURNAL_APPROVED`, `V39_PREPAID_SOURCE_PENDING_INTENT_APPROVED`, and `V39_PREPAID_SOURCE_OUTSIDE_SESSION_LOCK_APPROVED` with intended values `1`; their actual published effect requires independent `prepaid_source_custody_ready=true` verification.

**Not approved by that message:** immediate paid provider subscription creation, account charge, modification of the existing failed/censored probe18 science, incident30 closure without evidence, source-original deletion, forced DB migrations, or exemption from exact runtime-bound AUTH. This evidence is a human preparation decision, not a source-verified `AuthRecord` and not the separate machine-validated `PROJECT_LEAD_APPROVED_ONE_RECOVERY` frozen scientific receipt.

## Evidence gained (not conflated with launch)
- Reviewed main release SHA `89c3b170e56c89dc79df61dfaddbe94116280923` publicly claimed by Replit exact GET, current `prepaid_source_custody_ready=false` before the new secret-triggered republish.
- The operator verified 30/30 P2G24 original blobs in the dedicated callback bucket by SHA-256 and byte length. Original metadata expires starting Oct 16, 2026. General application bucket 0/30 readable.
- The operator independently ran a read-only SQL structural check of V0064: LOGGED table, exact columns, constraints, immutability trigger and 168-hour retention all PASS, 0 active/settling probes, 0 runtime sessions, **1 unresolved incident**, 30 original refs.
- Last operator balance 2,287 Alert credits, 0 billable active subscriptions, 60,000 remaining REST units at Oct 12 00:33 UTC. This is a dated check, not a guarantee at future paid start.
- The actual hosted signed, nonempty callback POST, 8-second external ACK and durable original-identity readback have not been proven yet.
- The existing P25 project lead receipt `artifacts/phase2g-p25-yssy-prospective-project-lead-approval-20261011.json` remains `DRAFT_NOT_APPROVED`. The frozen `artifacts/phase2g-early-pilot-yssy-p25-recovery-freeze-20261011.json` **does not exist** on reviewed main; no new source-bound Gate2 runtime/Auth hash exists.
- A true 120-minute public-hosted, isolated sender->receiver->storage fault rehearsal has not been executed; smaller simulations, real PG SIGKILL tests and GET-only health watches do not substitute.

## Bounded one-shot operator decision sequence
1. Verify published new flag readiness `prepaid_source_custody_ready=true` at exact released head without leaking secrets. If false, fail closed; inspect actual published secret scope and rebuild.
2. Run one purpose-limited synthetic signed public POST with wrong-secret rejection, nonempty physical-v2 item, original SHA+bytes proof, 8-second threshold and **exact disposable session** cleanup only; preserve the historical 30 originals.
3. Independently adjudicate incident30: provider deletion currently verified in historical record and zero active subscription observed; missing UNLOGGED runtime and no cleanup journal are **not** proof of runtime cleanup. No blanket deletion or unreviewed incident `resolved=true`.
4. Review prospective P25 scientific amendment and a project-lead approval receipt. Keep historical failed probes16/17/18 immutable, no imputed provider sends, no yield-driven discretionary retry or automatic subsequent attempt. Freeze exact source SHA and UTC window.
5. Prepare separate human-approved, SHA-bound provider AuthRecord and runtime/Gate2 controls only **after** hard gates. Run actual paid preflight; only the explicit `PASS_READY_FOR_PAID_STAGE1` state at the approved time supports a future paid action.
6. If a mandatory scientific gate such as the full 120-minute public hosted rehearsal is not met, **do not claim F.8 compliant full science**. A descriptive received-only exploratory study requires a separately reviewed, documented scope amendment and cannot silently replace the original run requirements.

**Decision:** `PREPARATION_APPROVED`; `SCIENTIFIC_PROSPECTIVE_APPROVAL=NOT_YET`; `PAID_AUTHORIZATION=NOT_YET`; `PAID_PROVIDER_MUTATION=HOLD`.

This note does not alter the frozen F.8 implementation log, P2G23 consent, project-lead source file, or existing provider/scientific records.

## Oct 11 ~18:35 PDT production republish check pending

The user added the three requested custody-setting **names** in Replit Secrets (values hidden in screenshots) and confirmed completion. The connected Replit publishing API was invoked again; the same published Replit app advanced through building/running/promoting and reported `success`. The actual live public value `prepaid_source_custody_ready` is **not yet independently evidenced after this republish**, and no live signed nonempty callback POST or 8-second ACK was performed. The operator was given a read-only public GET one-liner to verify the deployed flags. This append does not authorize a new provider subscription, source deletion, incident closure, scientific promotion, or any conditional gate waiver.
