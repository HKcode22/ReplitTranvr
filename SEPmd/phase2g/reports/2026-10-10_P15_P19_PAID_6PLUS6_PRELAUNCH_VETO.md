# Phase2G P15/P19 — paid Stage-1 6+6 prelaunch veto until independent source verifier exists

Date: Saturday October 10 2026 PDT. Isolated branch `phase2g-p2g24-github-observer-20261009`; draft PR #27, not deployed or merged. No Cloudflare; no paid provider calls, deployment, or production DB mutations.

## Real false-advertising risk corrected

The actual `scripts/v39_phase2g_stage1_logged_supervisor_v39.ts` previously accepted `V39_PHASE2G_CALLBACK_WATCHDOG_POLICY=six-plus-six-candidate` while always supplying `evidence:undefined`. The pure controller correctly **stopped by failure 3** (or sooner after uncertified recovery), but selection of the candidate value could mislead an operator into a paid two-hour run believing 6+6 was enabled. A paid run under mistaken recovery capability is unacceptable.

Now selecting `six-plus-six-candidate` explicitly throws `SUPERVISOR_REFUSED:SIX_PLUS_SIX_AUTHENTICATED_VERIFIER_NOT_DEPLOYED` **before** paid authorization guard, callback network preflight, any health/DB evidence, or child owner spawn. No synthetic signer/env flag makes that a trusted provider-origination proof. The default `legacy-three` remains in place (also not an automatically approved paid fallback). This is a **prelaunch veto**, NOT a full working 6+6 verifier; the state-machine candidate remains code-tested for future independent evidence integration.

Added direct supervisor source-order regression ensuring the veto comes before `enforcePaidGuard`, `callbackHealthy`, or `spawn` and cannot be bypassed through legacy environment test fixtures.

## Verified CI checkpoint

- Exact tested code revision `7485d02d520036dde92ce8925ef9a231c885215e`.
- [GitHub Actions #38106007805](https://github.com/HKcode22/ReplitTranvr/actions/runs/38106007805) **BOTH jobs SUCCESS**: **479/479 offline tests (47 suites) + 55/55 actual V3.9 disposable PostgreSQL16 tests**, independent real SIGKILL reconfirms UNLOGGED state loss.
- Previous run [#38105817505](https://github.com/HKcode22/ReplitTranvr/actions/runs/38105817505) **478/478+55/55** tested the real PostgreSQL uncertain-COMMIT source-retention + raw JSON duplicate-key rejection work in [P04/P11 report](2026-10-10_P04_P11_COMMIT_OUTCOME_AND_ORIGINAL_JSON_FAIL_CLOSED.md).

## Unclosed science/release requirements

- No independent complete 168h AeroDataBox original-source ingress while Replit is unavailable (no Cloudflare/other billable replacement approved), sender per-item attempts and 260/259 credit gap not independently verified.
- No prospective P13 production replay of original UTC/physical-v2 after crash with independently authenticated evidence; uncertain-COMMIT orphan objects require bounded privacy-safe cleanup.
- No qualified P15 live six-primary plus six-contingency verifier. Effective default production policy is three failures; selecting candidate **is now refused on this draft**.
- Exact public deployed Replit source SHA and hosted realistic 10s provider acknowledgment distribution unproven; two-hour hosted zero-provider-credit R0–R11 rehearsal unperformed; new bounded human paid authorization not granted.

**For Sunday Oct 11 20:00–22:00 PDT YSSY, paid 6+6 remains NO-GO**. The preventive veto should not be mischaracterized as enabling 12 checks. All P01–P20 full-release criteria remain open (15 BLOCK, 5 HIGH); several individual subissues now have verified implementations.
