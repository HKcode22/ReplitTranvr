# November 12 — one Amendment E: first-cycle actual gate-out label contract (pure, evidence-tiered)

**Release:** standalone mathematical/scientific CODE and synthetic regression only, NOT an adopted primary actual label, legal Contents license, source retrieval, live POST observation, Phase5 FREEZE or paid Phase6 GO. Owner wants bounded missingness and one canonical Amendment E: do not create E2/E3/F/G in response to this work.

## Existing foundation reused (not redesigned)

- Canonical [Amendment E traveler predictions](2026-11-11_AMENDMENT_E_CANONICAL_TRAVELER_PREDICTIONS_C_D_FREE_ADSB.md) proposes T−6h continuous **actual gate-out delay minutes** as first-cycle **conditional** leading primary, T−90m update, T−24h comparator and separate after-takeoff arrival ETA.
- Existing [Gate05 runway delay assessor](../../server/lib/disruption/gate05RunwayDelayLabelAudit_v39.ts) handles a DIFFERENT actual **wheels-off vs scheduled runway** target. Existing [ADSB.lol proxy calibration](2026-11-09_ADSBLOL_PHYSICAL_DEPARTURE_LABEL_ERROR_RESEARCH_PROTOCOL.md) has bounded source/identity/measurement-error research. Neither should be renamed gate-out.
- Existing Stage14 source-bound PRE stores original selected provider-native T, issue/cutoff, originally received FIDS source and separately time-fenced route features. Existing V0087–V0092 source/work queues, V0081 independent T24 witness, V0083 future POST and C+D GitHub workers remain the only actual collector paths.

## Incremental implementation

`server/lib/disruption/phase5AmendmentEGateOutDelayLabel_v39.ts` adds pure `assessP5AmendmentEGateOutDelayCandidate`. It enforces:

1. Exactly the original immutable native selected T, strictly canonical UTC and correct `T−24h`, `T−6h` or `T−90m` cutoff. A PRE issuance after own cutoff, or the original first source arriving after the forecast was issued, is refused. Real POST outcomes never become retroactive PRE features.
2. Only an externally attested **scheduled gate-out** milestone paired with externally attested **ACTUAL_GATE_OUT** on one independently matched operating leg is even a numerical continuous gate-out candidate. `(actual gate-out − originally scheduled gate-out) / 60,000` yields signed minutes (negative early departures are valid). A general FIDS scheduled departure is NOT automatically a scheduled off-block/gate event; a frozen hash cannot attest physical semantics itself.
3. Provider reported `ACTUAL_WHEELS_OFF`, ADSB.lol takeoff proxy, generic estimated runway/revised schedule and unverified actual-only status yield **no gate-out numeric label**; existing runway/proxy modules remain separate. A confirmed cancellation is **not** a zero-minute operated delay, and an absent physical outcome is PENDING or CENSORED after grace. Bounded missingness is recorded at the individual flight, not a reason to invalidate the entire planned study.
4. A physical departure claimed earlier than an issued PRE forecast is marked not prospective for that forecast, not a retrospectively valid model comparison. T90 and T24 can use the same original native T and outcome as separate already-issued updates/comparators only where their own source cutoff was valid.
5. Output is expressly **CANDIDATE** only; `physicalMilestoneIndependentlyCertifiedByThisFunction=false`, `originalSourceUseRightsCertifiedByThisFunction=false`, `authorizedForModelTrainingOrPrimaryHeadline=false`, `phase5ScientificFreezePassed=false`, `phase6PaidGo=false` always. It requires independent source evidence review and signed adoption before use for modeling, and performs NO API, database writes, GET, POST, webhook, Alert or training.

The focused tests use only synthetic timestamps and include same-milestone +42 and −15 minute examples, wrong wheels-off/ADSB milestones, early sources/forecast leakage, T90/T24 cutoff parity, actual before issue, independent identity/semantics refusal, cancellation, unknown/pending and contradictory event metadata. **No synthetic outputs are measured aircraft accuracy.**

## Real next steps and honest limits

- The authorized actual future SOURCE original→[existing #555 candidate audit](2026-11-10_REAL_SOURCE_POSTCOMMIT_NATIVE_FLIGHT_CANDIDATE_AUDIT_CHECKPOINT.md)→[#558 review dossier](2026-11-10_ACTUAL_SOURCE_TO_UNSIGNED_PRE_REVIEW_DOSSIER_CHECKPOINT.md)→[#559 later review packet completion](2026-11-10_INDEPENDENT_SOURCE_DOSSIER_TO_REVIEW_READY_LATER_PRE_PACKET_CHECKPOINT.md)→V0091 signed packet→Stage14→V0081 witness→POST/STOP remains the actual technical workflow. This pure label function **does not replace any portion**.
- We still need independently authenticated real provider **actual gate-out** semantics and corresponding originally scheduled gate-out baseline. If only a schedule revision, generic FIDS `departure.scheduledTime.utc`, or ADSB.lol physical wheels-off proxy is available, the preferred primary is **not automatically constructible**. Don't falsely promote one event to another or claim model accuracy.
- Open [source-use/retention issue #300](https://github.com/HKcode22/ReplitTranvr/issues/300) remains material; a user's paid authorization/60,000-unit observed quota or source SHA does not establish a 31-day ML Contents license. Preserve qualified derived aggregates only under actual rights. No need to wait for provider email to complete unrelated offline engineering.
- One real approved future-flight source, POST label observability, retained/removed sources, daily 50K internal REST ceiling, Alert credit STOP, matched denominators and independent Phase5 science decision remain pending. T−6h is still **candidate**, not frozen; do not claim paid Phase6 GO.

**Status:** owner-confirmed V0087–V0092 live INERT, PR #587 T24 scheduled code merged, PR #588 watchdog code merged, PR #589 T24 source-roster hash fix merged. No new task or paid GET in this code work. Nov13 interim and Nov20 conditional readiness targets are not promises. No Cloudflare/Replit AI Agent/second paid airborne source.
