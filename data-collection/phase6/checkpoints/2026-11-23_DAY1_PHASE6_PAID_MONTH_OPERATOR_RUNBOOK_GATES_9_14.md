# Phase 6 paid 31-day launch: one authoritative owner Day 1 operator runbook (Gates 9–14)

## CURRENT 2026-11-23 DAY 1 LIVE AUDIT, SUCCESS EXPECTATIONS & INCIDENT SALVAGE (no added gates)

**Verified 2026-11-23 ~08:33 UTC (00:33 PST): CONDITIONAL TECHNICAL READINESS, NOT PAID GO.** The owner must not infer `paidGo=true` or a real billed SOURCE from the passing no-provider proofs. This section supersedes older contradictory/NO-GO wording below for the current G12 state; the older material is audit history, not a command to rerun.

### 1. What is actually verified before authorizing anything

- Target `HKcode22/ReplitTranvr` current main exactly `c8e065d665ccacb6d2575070e94c5500b7583044`; relay `HKcode22/TravnrClockRelay` main exactly `c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed`.
- G12 original signed **31-value repository** policy readback [45123278530](https://github.com/HKcode22/ReplitTranvr/actions/runs/45123278530) PASS. New current-main **protected four-role** POST preflight [45125753815](https://github.com/HKcode22/ReplitTranvr/actions/runs/45125753815) PASS: disarmed admission, independent reviewer, restricted publisher/deadline, independent storage; paid POST job SKIPPED. G12 CLOSED; do not repeat any G12 script.
- External PRIMARY_BACKSTOP relay [45137657355](https://github.com/HKcode22/TravnrClockRelay/actions/runs/45137657355) acknowledged actual target retention run [45137685153](https://github.com/HKcode22/ReplitTranvr/actions/runs/45137685153), whose **two** due-only expiry jobs completed SUCCESS; this proves current forwarding and a successful bounded sweep, **not** future deletion or provider acquisition. Latest pre-GO rolling relay [45138866138](https://github.com/HKcode22/TravnrClockRelay/actions/runs/45138866138) logged `DEFER_OUTSIDE_OR_LATE_POLICY_WINDOW` with `TRAVNR_RELAY_DIRECT_TICK_APPROVED=0`; this is the expected disarmed mode before the signed first epoch, not a recovery failure.
- Original G13 owner GO Git blob `c15ce7bd23b60443d8c0ef3e58f90d41b5f8a517` and G9 after-GO route Git blob `6871236a9743b3b84f978c9e3cd9042b2aff2161` inspected; code has explicit window, SHA pins, original G12 success predicates, fresh provider-account/PG16 checks and STOP/rollback attempts. **Static source audit cannot attest the future account balance, runtime admission, clock punctuality, successful populated restore, or first paid provider receipt.**
- Historic source- or label-quality concerns do not disappear: a real paired, independently attested **actual gate-out** versus scheduled gate-out is not established merely by `scheduledTime`, `revisedTime`, `runwayTime` or Live fields; keep Amendment E continuous minutes primary **conditional on real evidence**, never manufacture zero-delay labels. Source-shaped identity and timestamps remain necessary in short-lived private operational custody; the separate long-lived derived model packet remains subject to field/backup/rights classification.

### 2. Today's one-time actions and what a SUCCESS should look like

| Checkpoint (all PST Nov 23, 2026) | Required authentic positive evidence | NOT evidence by itself |
| --- | --- | --- |
| 1:50 PM to **strictly before 3:10 PM**; preferably by 2:15 PM | Owner runs **existing Command 2 only once** in [START HERE](2026-11-23_START_HERE_PHASE6_LAUNCH_EXACT_3_OWNER_COMMANDS.md). Actual output `P6_G13_EXPLICIT_OWNER_GO_4_SCOPE_WRITES_ACKNOWLEDGED`; authenticated issue #413 GO ledger, current SHA, fresh account ≥36,740 REST units, Alert balance ≥1,000, zero unauthorized subscriptions, existing V0108 expiry/deletion STOP checks and four paired repo/protected STOP writes acknowledged | A preview, an earlier 31-value readback, or a fresh run whose time/budget/rights conditions HOLD |
| 2:15 PM first-cycle T−90 preparation boundary | Confirm due first-cycle prospective reviews/enrollment are actually on-time **where applicable**; record any not yet due/missed/late against each flight's own prediction cutoff | One green SOURCE/clock workflow; a later snapshot mislabeled T−90 |
| 3:45 PM or later, **only after G13 PASS** | Owner runs existing **Command 3**; expected `P6_G9_DIRECT_TICK_EXISTING_EXTERNAL_LANE_ACTIVATED_AFTER_EXPLICIT_G13_GO`, then a new external DIRECT_TICK relay run with **exact target ACK**, target direct-tick execution/admission and independently visible child outcome | `DIRECT_VERIFY` deferred run, success of a no-provider relay alone, or flipping one variable without the complete guarded result |
| Signed first SOURCE epoch 3:45 PM onward (23:45Z) | A genuine existing signed-source parent/child history, exact approved day/airport/slot and source scope; **provider physical GET and bill/usage receipt**, accepted raw-first original binding and normalized operating-flight population with request/response timestamps, canonical hash and independent database/ledger reconciliation | Any workflow icon, mere run ID, stale preparation or zero-provider clock ACK |
| During due T−24h / T−6h / T−90m flight windows | Independent source-bound, same-operating-leg PRE row, frozen scheduled-departure anchor, **source available_at and committed DB clock before the specific horizon cutoff**, witnessed original provenance and deduplication; track each horizon separately | Late source reclassified as PRE; post-event feature leakage; inferred on-time from an aggregate row count |
| Only when POST/outcome becomes genuinely due | Authentic reviewed POST original + same-leg PRE linkage and outcome evidence tier; actual gate-out minutes only from qualifying paired gate-out milestones, otherwise `missing`/`censored`/`not_due`; distinct arrival ETA task. Independent publisher/storage and expiry lifecycle evidence | No POST on the first evening automatically treated as failure; estimated/runway times passed off as actual gate-out |
| Close of each physical UTC charge day and each signed study day | Exact budget spent/reserved/settled versus 1,900/day and 36,740 planned, 1,000 Alert floor, four-slot draw and physical GET/response/PRE/POST denominators, missingness/censoring by horizon, source lifetime/expiry, sanitized incident ledger, explicit continue/STOP disposition for the next day | 100% coverage claim, all green Actions, no errors in one selected log, or automatic conversion of unknown to a negative target |

**No invented performance minimum:** Exact first-day eligible flights, valid T−6/T−90/T−24 count, actual provider charge or gate-out-label coverage are not known until authentic data exists. Log all numerators **and denominators**, not a fabricated completion percentage. Treat successful signed control-plane commissioning and scientifically usable observations as two separate questions. Optional ADS-B/weather gaps do not automatically block valid source-bound PRE.

### 3. If Day 1 goes wrong — classify, quarantine, and protect later days

| Actual failure | Day 1 handling / what may still be salvaged | Effect on Days 2–31 |
| --- | --- | --- |
| **G13 HOLD / missed authorization before 23:10Z** | No paid Day 1 authority. Do not flip STOP flags, backdate GO, replay once-only owner command, or claim the originally missed first cycle. A different future launch date requires independent **new signed prospective window**; do not silently shift the frozen design | Future paid days cannot simply start under an invalid or expired original GO; resolve signed authority before collecting |
| **G13 PASS but G9 delayed, external DIRECT_TICK deferred or child never ACKs** | Preserve original scheduled clock, exact run IDs and relay/target admission logs. Signed first slot may be missed; only independently authorized **future, still-open** source windows can proceed under existing schedule/budget. Do not invent a callback, replay uncertain POST or manually flood ticks | Future days can stay valid after normal exact clock admission is restored and no shared hard STOP exists; explicitly measure scheduling selection bias |
| **A few SOURCE requests missed, original absent, late, expired, or a network error with settled no-charge status** | Existing metadata read-only Day1 classifier may return `SOURCE_LOSS_OR_LATE_OBSERVATIONS_REVIEW_CENSORING`; preserve missed/late/expired denominators and genuine available originals. A late query may still support a *different flight* whose OWN horizon cutoff has not passed, but only Stage14 per-flight proof can authorize it | A bounded Day 1 gap need not taint unaffected flights or later approved days; retain Day1 incomplete rather than replace it with cherry-picked flights |
| **Unknown GET/POST acknowledgment, ambiguous bill, duplicate or retry exposure** | **HOLD the affected physical request/budget unit and reconcile provider usage, actual original binding, queue lease and GitHub ACK history before any new attempt**. Do not blind retry a paid GET/POST or double-count; source-original absence is not proof no charge occurred | Continue only independently settled separate partitions/days if existing ledger and safety gates permit; shared unresolved cost STOP blocks downstream spend |
| **PRE writer/queue/reviewer late or unavailable** | Use only PRE proven before that specific frozen cutoff and same operating flight. Late PRE is **missing/censored for that horizon**, never backfilled. T−24 comparator may be absent while T−6/T−90 remain usable **if independently cutoff-safe**. No post-event leakage | Other horizon-flight pairs and later days remain independently eligible; report missingness by horizon and root cause |
| **POST not due / delayed / no qualifying actual gate-out** | Mark `not_due` until the proper review time; then `missing`/`censored`/`invalid` where applicable. Do not infer no delay, zero minutes, on-time or negative outcome. Preserve separate reported-status and physical/departure evidence tiers. Day1 operational/source/PRE evidence may still be useful without a validated primary label | Other days remain valid, but lack of qualified actual gate-out labels limits effective primary sample size and must be reported, not hidden |
| **Four-airport draw absent, altered design, cross-day duplicate flight, conflicting identity, or malformed signed index** | Existing QA returns `FOUR_AIRPORT_DRAW_NOT_VERIFIED_HOLD` or a hard integrity refusal. No new hindsight airport draw, no substituted flight, no wrong-day reuse or child revision fallback | Isolate affected day/partition; may not continue if signed day-integrity or shared authority is unresolved |
| **Daily/project hard budget exceeded, unresolved ledger contradiction, source rights/TTL/backup rule violation, incomplete protected deletion or source-custody failure** | Existing QA returns `HARD_LEDGER_OR_BUDGET_HOLD_NO_FURTHER_DISPATCH`, or separate rights/retention STOP. Preserve minimal permitted non-source audit evidence, enforce owner STOP, reconcile/expire before any further acquisition; no extra unit purchase as an automatic bypass | **Shared hard STOP blocks further collection across days until independently resolved.** Safety/rights supersede coverage goals |
| **Long outage or no qualifying Day1 PRE/labels** | Day1 may be control-plane/operational evidence only, NOT a scientifically usable labeled primary training day. Report actual 0 eligible and reasons, don't erase the calendar day or silently move its train/validation/test allocation | Valid later days are not inherently corrupted; smaller/biased effective sample must be measured and model evaluation disclosed |

### 4. Existing safeguards (not automatic authority to backfill)

- C+D architecture: bounded parent/child GitHub execution and PostgreSQL lease/claim; only reconcile an uncertain prior ACK before replay decisions. A new controller root is not evidence the previous attempted POST was unpaid. Preserve observed external→target IDs, original response hashes, source clocks and protected STOP state, with sensitive values redacted.
- [Existing Day1 source safety code on main](https://github.com/HKcode22/ReplitTranvr/blob/main/server/lib/disruption/phase5DaySourceQualityReadonly_v39.ts) has the exact dispositions `SOURCE_LOSS_OR_LATE_OBSERVATIONS_REVIEW_CENSORING`, `SOURCE_ATTEMPTS_NOT_MATURE_NO_OUTCOME_INFERENCE`, `DESCRIPTIVE_SOURCE_PROGRESS_NOT_SCIENCE_PASS`, `FOUR_AIRPORT_DRAW_NOT_VERIFIED_HOLD`, `HARD_LEDGER_OR_BUDGET_HOLD_NO_FURTHER_DISPATCH`. It is descriptive/read-only, not an independent authorization for continuing paid collection. Check the original selected day/manifest, physical GET, bound originals, not-yet-due, missed, cutoff-late, expired, candidate PRE/clock, and cost partition counts. Actual PRE qualification still requires original Stage14 per-flight proof.
- Durable partial-source recovery is **same approved identity/review**, not a redraw: [SOURCE restart protocol](https://github.com/HKcode22/ReplitTranvr/blob/main/data-collection/phase5/2026-11-15_SOURCE_RESTART_RECOVERY_NO_NEW_SCHEMA.md) permits fresh re-attestation of existing approved packet only under independently authorized exact recovery, rejects changed bytes, expired request, wrong key or missing constituent. A verified empty current-day selected shard can be deferred while another authentically signed selected day proceeds; an ACL/signature failure is NOT an empty-day defer. These are engineering recovery semantics, not blanket production permission.
- Latest retentions demonstrate live due-only sweeps but not a tested ability to restore expired source bytes, backups/PITR or future populated deletion. Backup restoration is bounded by legal source TTL, original signatures, exact timestamps and the approved storage profile. Never copy provider originals to long-lived GitHub logs/artifacts/backups to rescue Day1.
- **Day2 autonomy is conditional**, not a promise to continue regardless of Day1: require valid next signed day/roster, remaining budgets, no unresolved shared STOP, lawful retention, independent queue/provider reconciliation and current same-code protected scope. Keep original time-based train/validation/test assignments and stratification unchanged. Record the Day1 loss mechanism for missing-not-at-random/bias analysis; do not redraw, retrospectively relabel or hide attrition.

### 5. Minimal Day1 audit receipt expected in master issue #413 (without secrets or source rows)

Use an owner/auditor-authenticated, sanitized factual receipt containing these fields (do not fabricate zeros for not-yet-observed quantities): `utcAsOf`, `runDayIndex`, `signedManifestSha256`, `mainSha`, `relaySha`, `gate13OwnerGoUtc`/status, `gate9DirectActivateUtc`/status, `externalRelayRunId`, `targetDirectRunId`, `sourceParentRunId`, `sourceChildRunIds`, `providerPhysicalGetAttempts`, `providerBilledUnits`, `providerOriginalsBound`, `normalizedPhysicalFlights`, `eligiblePreByHorizon`, `onTimeCommittedPreByHorizon`, `lateOrMissingPreByHorizon`, `postDue`, `postObserved`, `actualGateOutPairedLabelCount`, `labelUnknownOrCensored`, `missingnessByAirportAndHorizon`, `budgetAvailable`, `dailyReservedOrSpent`, `pendingReconciliation`, `expiryDue`, `expiryStopped`, `nextDayIndependentDisposition`, `incidentLinks`. Keep `unknown`, `not_due`, `zero_confirmed` separate. Do not publish flight IDs, raw response, signed private packet, database URLs or API keys.

**Operator-success interpretation:** (A) GREEN CONTROL PLANE = owner GO + direct relay ACK + target execution + observed guarded SOURCE workers; (B) GREEN SOURCE = authentic bill/original/normalized provenance and no broken budget; (C) SCIENTIFICALLY USABLE = each independently validated cutoff-safe PRE and eligible genuine outcome evidence, with honest missingness. These are three distinct layers, not one green Actions icon.

**No new Gates 15+, no change to Amendment E, no new provider plan, extra credits, migrations or altered original 31 study days.** Follow exact owner launch commands only from [START HERE](2026-11-23_START_HERE_PHASE6_LAUNCH_EXACT_3_OWNER_COMMANDS.md).

---


## **SUPERSEDED OWNER INSTRUCTIONS — USE THE SHORT 3-COMMAND RUNBOOK ABOVE THIS HISTORY**

**2026-11-23 06:02Z correction:** The operator has already SUCCESSFULLY created the single G12 owner public request commit `b98e02617fd1f49389197071904a38972333643e`. [Actual encrypted G12 run 45119501703](https://github.com/HKcode22/ReplitTranvr/actions/runs/45119501703) completed SUCCESS and preserved artifact `14792972040`, expiring Nov24 05:43Z. A SECOND accidental attempt received HTTP 422 `sha wasn't supplied` because it tried to create the exact same request file; it did **NOT** override the first request. **Never run either G12 public-key-request command again; the second local key directory is not authorized recipient.**

**The only current owner launch instructions are in [START HERE — EXACT 3 OWNER COMMANDS](2026-11-23_START_HERE_PHASE6_LAUNCH_EXACT_3_OWNER_COMMANDS.md).** They include (1) NOW authenticated first-key G12 code-only installation + independent 31-value and production protected POST acceptance, (2) Monday 21:50–strictly before 23:10Z explicit owner paid GO only after the exact G12 PASS, and (3) after Mon23 23:45Z paid-GO-gated direct relay activation. **Do not use outdated command hashes elsewhere in this older checkpoint.**

The verified c8 external PRIMARY_BACKSTOP has now forwarded and completed twice: [45118610987](https://github.com/HKcode22/TravnrClockRelay/actions/runs/45118610987) → [45118631787](https://github.com/HKcode22/ReplitTranvr/actions/runs/45118631787), then [45120142743](https://github.com/HKcode22/TravnrClockRelay/actions/runs/45120142743) → [45120165103](https://github.com/HKcode22/ReplitTranvr/actions/runs/45120165103), both target jobs successful. Heartbeat earlier on current main PASS; historical failures remain history, managed-cron evidence audit separate. No paid GO issued. GitHub [owner source-only scripts CI 45121421690](https://github.com/HKcode22/ReplitTranvr/actions/runs/45121421690) PASS. Source-only syntax tests are not a substitute for owner/runtime acceptance.

---


## Next necessary owner action — original G8-style encrypted c8 successor, fresh public request only

**Preparation now complete, but NOT issued/applied.** The authenticated in-memory original+proposed strict validator [45118733902](https://github.com/HKcode22/ReplitTranvr/actions/runs/45118733902) passed, preserving all 31 day plans. A new owner-only one-use X25519 public request launcher, source Git blob **`7cde993c034f00b3b7bad56e2f227355449bddcd`**, was created on the isolated evidence branch. It pins current target main c8, relay c5, actual strict validator proof, the exact branch-only new no-provider sealing workflow (`8136212fc420a0ea290a8975da6c9c6e87f78a2b`) and full validator-backed builder (`6ee66e47b0db5dc3120713485d41c7df3b6418fe`). The resulting public request is a NEW G12 request and does **not** repeat, overwrite or regenerate the original G8 one-use artifact.

Run **exactly once in owner Replit Shell when ready**, before the future Monday paid GO attempt:

```bash
cd ~/workspace

bash <<'P6_G12_NEW_OWNER_C8_PUBLIC_REQUEST_ONLY'
set -Eeuo pipefail
set +x
umask 077
REPO="HKcode22/ReplitTranvr"
BLOB="7cde993c034f00b3b7bad56e2f227355449bddcd"
TMP="$(mktemp --suffix=.sh "$PWD/scripts/.p6_g12_public_XXXXXXXX")"
trap 'rm -f "$TMP"' EXIT
gh api "repos/$REPO/git/blobs/$BLOB"   --jq '.content' | base64 --decode > "$TMP"
test "$(git hash-object "$TMP")" = "$BLOB"
bash -n "$TMP"
bash "$TMP" CREATE_ONE_FRESH_G12_OWNER_PUBLIC_KEY_ONLY_AFTER_FULL_VALIDATOR_NO_PAID_GO
P6_G12_NEW_OWNER_C8_PUBLIC_REQUEST_ONLY
```

**Expected owner output:** `P6_G12_FRESH_OWNER_PUBLIC_ENCRYPTION_REQUEST_COMMITTED_ONLY_NO_PAID_GO` and a private directory path matching `$HOME/.travnr-g12-seal-*`. Preserve that directory, `owner-private.pem` and `request.json` privately. Do not paste the private key, environment variables or encrypted artifact to ChatGPT, GitHub code, or a public issue; only paste the short JSON status and request commit SHA. The public-key-only GitHub commit triggers the branch no-provider action **`P6 G12 owner sealed exact c8 source code successor (NO PROVIDER)`**. That action uses the exact original full policy validator again, then places **only** AES-GCM encrypted policy successor values in a short-lived owner-only Actions artifact; it makes **no secret updates, provider calls, DB mutations, cron writes, GO or production-main commit**. If the run fails, do not issue another public request blindly. Owner must retrieve and review actual run first.

**Do NOT run the old G8 decrypt/apply command or any G13 paid GO yet.** Once the fresh encrypted successor job actually succeeds, the next separate owner-authenticated step is an exact one-use decryption/full-digest verify-and-install of only the reviewed existing policy/code SHA names under dual-scope paid STOP0, then repository 31-value and original main protected actor revalidation. That owner install command is intentionally **not** supplied until its exact ciphertext receipt, changed name/scope inventory and new SHA256 link set have been independently checked. No plaintext public policies, reissued flight-day plan, changed research label or credential dump is acceptable.

---


**Date:** Nov 22, 2026 PST / Nov 23 UTC. **Only six fixed operational gates, 9–14. No new gates. No repeat of completed G1–8.** This is the single day-1 command reference. Never reuse older chat Bash blocks or the superseded `b432...` release blobs.

## LIVE EVIDENCE UPDATE — external PRIMARY backstop restored, full strict successor validator PASSED

**Updated 2026-11-23 05:36Z:**

- After the owner's successful exact relay-target SHA repair, the **actual independent externally triggered** [relay PRIMARY_BACKSTOP run 45118610987](https://github.com/HKcode22/TravnrClockRelay/actions/runs/45118610987) logged `TRAVNR_APPROVED_TARGET_MAIN_SHA=c8e065...`, emitted `TARGET_ACK_AND_RUN_IDENTITY_VERIFIED_NOT_COLLECTION_PROOF`, and acknowledged **exact target run 45118631787**. [Target run 45118631787](https://github.com/HKcode22/ReplitTranvr/actions/runs/45118631787) is **completed SUCCESS on c8 main**, with both `primary-fids-expiry` and `phase7-expiry` jobs SUCCESS. **Gate9 independent PRIMARY retention backstop restored — no need for owner to repeat or make another cron job.** This proves execution, **not** future populated deletion or paid collection.
- Full previous-approved and proposed current-source policy **strict original validator** [run 45118733902](https://github.com/HKcode22/ReplitTranvr/actions/runs/45118733902) on isolated evidence branch is **SUCCESS**. Actual in-memory receipt `P6_C8_FULL_ORIGINAL_AND_SUCCESSOR_VALIDATOR_PASS_ONLY_NO_GO`, `historical31DigestExact=true`, `originalAndCurrentFullValidatorPassed=true`, `expectedSecretChanges=11`, `originalDayPlanSha256sUnchanged=true`, `unchangedScientificBudgetAndRightsFieldsEnforcedByFullValidator=true`, `repoSecretsNeverModified=true`, `providerCalls=0`, `databaseWrites=0`, `sourceSuccessorNotSignedOrInstalled=true`. It reuses the immutable pinned original G8 full policy validator, not an invented relaxed rule. Its **11** refers to inner policy and POST linked values; any already-mixed outer code SHA secret pins must also be reconciled in the final reviewed successor before paid GO. A validation candidate is not the authorized installed secret bundle.
- The actual installed repository code binding [45117949987](https://github.com/HKcode22/ReplitTranvr/actions/runs/45117949987) still **FAILS** for current c8 SOURCE; until owner-authenticated successor installation + independent full readback, **G12/G13 NO GO** remains enforced. The conditional G13/G9 scripts from the older pre-mismatch handoff are not safe to run.

The existing cron audit historical failure is separately recorded. No paid/DB/secret mutation or main SHA change occurred in either audit.

---

## Additional nonpaid candidate proof — pure source-preserving SHA-link delta (not GO)

Actual [GitHub evidence run 45118463769](https://github.com/HKcode22/ReplitTranvr/actions/runs/45118463769) **completed SUCCESS**, using actual existing repository secrets strictly in runner memory with provider/DB/secret writes all zero. It checked existing canonical Base64 and SHA256 links and computed an *unapplied* proposed successor from `b432...` to `c8e...`. **Exactly six approved/reviewed-code leaves and three cross-policy hash-reference leaves would change**; all 31 existing signed day-plan SHA256 values and all policy schema names are **unchanged**; every other original field was deep-compared unchanged. Receipt `P6_POLICY_SUCCESSOR_PURE_METADATA_REVIEW_CANDIDATE_PASS_NOT_APPROVED`. This strongly narrows the repair but **does not certify cryptographic signer authority, full 31-value policy bundle, environment scope, code/rights approvals or safe installation**. Existing mismatch run 45117949987 remains an active G12/G13 **NO GO** until independent full policy validator and new protected readback PASS.

Prior original Gate8 protected secret successor machinery is documented in [Gate8 existing-envelope checkpoint](2026-11-22_GATE8_BRANCH_PROTECTED_ENV_ADMISSION_STOP_MAIN_POST_ONLY_RECOVERY_NO_GO.md): the pinned pure validator and owner-private X25519 authenticated custody were used before. The frozen G8 code explicitly identifies six old code fields and linked daily/signing/native POST SHA256 propagation. The intended narrow remedy must reuse its **full original-and-successor validator**, not treat this structural delta as the final signer-approved release. No raw key or policy value was printed by the new in-memory audit.

---

## Immediately actionable status, including newly detected HOLD

**Current target production main:** `c8e065d665ccacb6d2575070e94c5500b7583044`. **Clock relay main:** `c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed`.

- **COMPLETED** owner repair: `P6_DETACHED_RELAY_TARGET_MAIN_SHA_REPAIRED_NO_PAID_GO`, from old `b432...` to current `c8e...`, provider 0, DB writes 0, cron writes 0. **Do not rerun** the old repair helper.
- **REAL nonpaid code-binding HOLD as of [GitHub run 45117949987](https://github.com/HKcode22/ReplitTranvr/actions/runs/45117949987):** exact repo-secret-scope verification shows policy canonical and SHA256 **PASS**, 31 day plans **PASS**, paid controls off **PASS**, independent POST code SHA **PASS**, but **`policyApprovedCodeMatchesMain=false` and `repoSourceCodePinMatchesMain=false`**. The run's GitHub conclusion is `success` because it is a diagnostic probe that deliberately reports HOLD in JSON, **not** authorization to proceed. **G13 paid GO must stay STOP/OFF until this existing signed-authority code-binding incompatibility is remediated with an exact source-preserving, independently reviewed policy successor and a new positive readback.**
- More than one original secret is affected: the existing authenticated G8 decoder explicitly checks SIX linked reviewed-main fields in stable-source trust, daily review + nested later review, signing, transport, and native POST policies, with **cross-policy SHA256 references** in transport and Phase7 POST preservation. Do **not** blindly change a single SHA or reissue 31 flight-day plans. Use original owner-private authenticated X25519 envelope as source, preserving every original science/budget/rights/field identity, then calculate and validate **all** affected linked policy digests and canonical static 31-value digest against reviewed changes. This is within existing G12/G13, **not a new gate**. No private values/keys should be published to GitHub, logs, or chat.
- **Await real post-repair PRIMARY_BACKSTOP relay→target ACK**. The earlier external run [45117022659](https://github.com/HKcode22/TravnrClockRelay/actions/runs/45117022659) started before owner repair and carried old target SHA. The later ROLLING_ROOT [45117973868](https://github.com/HKcode22/TravnrClockRelay/actions/runs/45117973868) shows **new** c8 target SHA and safe `DEFER_OUTSIDE_OR_LATE_POLICY_WINDOW` (expected before first source), proving propagation of new pin, not actual retention forwarding. Confirm a **later PRIMARY_BACKSTOP** emits `TARGET_ACK_AND_RUN_IDENTITY_VERIFIED_NOT_COLLECTION_PROOF` with exact new SHA and inspect the corresponding target run's two required expiry job outcomes. A green relay alone is insufficient.
- Current-main full offline safety [45115427067](https://github.com/HKcode22/ReplitTranvr/actions/runs/45115427067), full dual expiry [45115450162](https://github.com/HKcode22/ReplitTranvr/actions/runs/45115450162), and heartbeat [45115536602](https://github.com/HKcode22/ReplitTranvr/actions/runs/45115536602) PASS. Heartbeat output still records **one mitigated native-schedule warning**. The separate [managed cron audit 45104276155](https://github.com/HKcode22/TravnrClockRelay/actions/runs/45104276155) FAIL records HTTP-ACK-only and one exact identity HOLD, **not proof that schedules met an SLA**. Do not force-green it by weakening identity checks.

**Current overall decision: NO PAID GO until the sealed source policy and current main SHA are independently reconciled and final safety checks PASS.** The fixed Monday start may need to remain STOP if these conditions are not met; missing an approved epoch is preferable to collecting under a broken or unlicensed admission chain.

## Frozen science, budget, dates (do not alter)

- Study: **31 days**, **6,144** scheduled SOURCE opportunities, **36,740 REST API units reserved**, planned peak **1,280/day**, hard ceiling **1,900/day**; separate Alert-credit protected floor **1,000**.
- PRE/outcomes: original f.8 + Amendments A/B/C/D1/D2/E, T−6 continuous actual gate-out delay primary, T−90 update, T−24 comparator, separate after-takeoff arrival outcome. No proxy runway delay substitution or timestamp/flight/airport/carrier identity deletion.
- First signed SOURCE: **Monday Nov 23 2026 at 23:45 UTC / 15:45 PST**. Global signed tail: **Dec 29 04:00 UTC**. Explicit owner GO window **Nov 23 21:50Z through strictly before 23:10Z (1:50 to 3:10 PM PST)**. Intended T−90 prearm observation **22:15Z (2:15 PM PST)**. Clock latency and PRE delivery are **not guaranteed** by an Actions green icon.

## Exact Gates 9–14: when actually due

| Gate | Present status | Required acceptance, NOT more engineering |
| --- | --- | --- |
| **9 external recovery clock** | Future mode staged; target SHA variable repaired by owner; latest rolling pulse c8 safely deferred | Real later primary ACK first; **after paid GO and at/after 23:45Z** switch previously staged relay `DIRECT_VERIFY`/0 to bounded `DIRECT_TICK`/1; actual external→protected tick ACK |
| **10 target direct admission** | Existing controller and protected approval staged; target direct flag deliberately 0 before GO | After G13 actual GO, guarded G9 command changes target direct flag to 1; protected direct job actually executes, or safe scope HOLD is escalated |
| **11 entitlement and budget** | Prior three-FREE-GET account snapshot PASS (59,968 REST units, 1,830 separate Alert credits, zero billable subscriptions) | Fresh GO-time FREE-only account, budget/1,000-floor, spend and subscription check |
| **12 rights, retention, source authority, PITR/STOP** | Bounded rights/V0108/full-retention/PITR recovery-only accepted; **current signed code binding now HOLD** | Reconcile ALL unchanged science-policy SHA-linked fields to current authorized code, independent readback PASS; fresh PG16 owner READ ONLY expiry, incident STOP, no unreviewed backup/restore |
| **13 explicit paid GO** | NOT issued; two paid controls 0 at both repo and protected env | Only authenticated owner after all preGO checks, in defined 21:50–<23:10Z window, via one-use audited command; no GO if signed code binding HOLD |
| **14 actual first SOURCE/monthly continuity** | NOT DUE, no paid FIDS receipt | After launch, verify real provider charged units and exact signed PRE original, first SOURCE, POST/label, no duplicates, hard caps, retention receipts; this cannot be proven before real data arrives |

**G1–8 engineering closure is historic evidence at the reviewed older release, not permission to bypass a newly observed GitHub code-binding mismatch.** Do not recreate schemas, 31 day plans, paid Alert subscriptions, cron jobs, or old X25519 seal requests.

## Exact owner steps BEFORE Monday GO (only nonpaid)

**A — Existing owner repair has already succeeded. Do NOT rerun SHA repair.** Watch next primary relay→target ACK through GitHub:

- [Clock relay Actions](https://github.com/HKcode22/TravnrClockRelay/actions/workflows/external-clock.yml)
- [Target retention Actions](https://github.com/HKcode22/ReplitTranvr/actions/workflows/phase5-primary-fids-expiry-no-provider.yml)
- [Signed policy readback 45117949987: fail-closed](https://github.com/HKcode22/ReplitTranvr/actions/runs/45117949987)

Optional nonmutating Replit Shell check:

```bash
cd ~/workspace
gh run list -R HKcode22/TravnrClockRelay \
  --workflow external-clock.yml --limit 12 \
  --json databaseId,displayTitle,createdAt,conclusion \
  --jq '.[] | [.databaseId,.displayTitle,.createdAt,.conclusion] | @tsv'
# Pick a NEW PRIMARY_BACKSTOP run (after the SHA repair), not ROLLING_ROOT.
# Read its real forwarding log without creating another pulse:
# gh run view <RUN_ID> -R HKcode22/TravnrClockRelay --log
```

**B — Preserve/review original private custody before any source-policy change.** The original Gate8 owned encrypted material lives in owner directory matching `$HOME/.travnr-g8-seal-*` and contains `owner-private.pem`, `request.json` and `artifact/p6-g8-owner-sealed-policy-successor.json`. Do not expose them. If needed, use only a name-and-permission observation:

```bash
cd ~/workspace
bash <<'P6_PRIVATE_CUSTODY_NAMES_ONLY'
set -Eeuo pipefail
set +x
for d in "$HOME"/.travnr-g8-seal-*; do
  [[ -d "$d" && ! -L "$d" ]] || continue
  [[ -f "$d/owner-private.pem" && -f "$d/request.json" &&
    -f "$d/artifact/p6-g8-owner-sealed-policy-successor.json" ]] || continue
  printf 'P6_OWNER_G8_ORIGINAL_ENCRYPTED_CUSTODY_PRESENT permissions=%s keyPermissions=%s usedMarker=%s\n' \
    "$(stat -c %a "$d")" "$(stat -c %a "$d/owner-private.pem")" \
    "$([[ -e "$d/g8-resume-once.started" ]] && echo yes || echo no)"
done
P6_PRIVATE_CUSTODY_NAMES_ONLY
```

**Important:** This proves only local original custody availability, not a correct new signed successor. It performs zero provider, database, secret, or cron operations. **NEVER rerun the old G8 `--apply` or original seal**; its old static digest is not current-authority approval.

**C — Current signed-policy reconciliation remains a STOP.** The safe remedy must reuse owner authenticated original secret values or a reviewed existing release mechanism, change only code SHA-linked authorizations necessary for the exact three-commit heartbeat-only revision, recompute canonical inter-policy digests (without altering any scientifically relevant file), perform independently reviewed dry verification, update only the documented existing repository secret names under global paid STOP0, and obtain a **fresh repository-only complete 31-value and protected actor no-provider PASS**. No value is available to ChatGPT from GitHub secrets (write-only). Do not fabricate a pass.

## Monday Day 1 sequence — conditional; do not run paid commands while source-policy HOLD

**Preflight at 21:50 UTC (1:50 PM PST)**: check latest target/relay SHA, real new primary backstop target ACK and job outcome, existing code-binding PASS, no deletion stop, sufficient FREE REST and independent Alert-credit floor, owner budget/rights. If any evidence stale/missing/failed: **NO GO**. Preserve both global paid controls 0 at repo and environment. The already prepared G11/G12 nonpaid checker at Git blob `d41d63e032fb8470650f9f719d9a7481f2a2158b` is automatically invoked inside the recorded G13 helper, but it **does not independently resolve the known signed-policy mismatch**.

**Gate13 paid GO slot: 21:50Z through strictly before 23:10Z.** Previously prepared owner GO source blob `b4d208e8b02f25cbc065e131cbf1f92fc95a36a4` is **RETIRED/ON HOLD** until a successor has an independently checked approved code SHA and the owner GO helper itself is re-reviewed to enforce that proof. **Do not run the old b432-pinned owner GO `9e01e4...` or the c8-pinned pre-mismatch version `b4d208...` today or Monday while HOLD**. No manually setting paid secrets to 1 without approved exact-mode GO workflow. **The exact final executable GO hash will be recorded here only after the positive signed policy readback.** Do not improvise a replacement from chat or copy other developer's command.

**T−90 observation: 22:15Z (2:15 PM PST)**: check actual PRE arm result. A schedule created/skipped/green does not itself prove flight PRE was recorded before cutoff. If missing, label the cohort unavailable/missing under the existing scientific protocol; do not backfill as an on-time PRE. No unapproved paid retry.

**Gate9 after-GO activation slot: at/after 23:45Z (3:45 PM PST)**: only after G13 actually succeeded on exact current SHA, enable target direct recovery and external relay route via the audited one-time script. The existing prepared source blob is `5e89d372c63de784873b8214dd188b351ae34009`, **conditionally reserved**; do not run it if G13 is not proven or code binding remains HOLD. It first pauses **only** the external rolling lane (not primary retention), switches target direct flag from 0→1 after owner GO, reviews target history/clock, sets relay `DIRECT_TICK` with exact signed bounds, and enables external rolling last. Do not activate it early. A relay success without a target protected admission is not proof.

**Gate14 after first actual SOURCE:** record exact run/UTC/flight cohort and charged API units, link a verified provider receipt to signed plan, PRE cutoff/outcome/censored state, independent reviewer, actual POST or later due semantics, no duplicate physical GET, plus primary and private expiry receipts. Continue daily by original capped budget and stop criteria. If first SOURCE did not execute, state **NOT STARTED** rather than claiming paid-month success.

## Safe STOP and no-blind-retry conditions

Stay STOP if any of: source signed SHA/policy trust mismatch; actual main SHA drift or detached relay target pin mismatch; missing protected worker admission; insufficient 36,740 remaining REST units or Alert floor breached; unauthorized subscription/provider; deletion/retention STOP, due source contents unexpired or unknown backups; CI red on current exact main (not historical runs); target actor scheduled but not actually executed; unknown ACK/duplicate attempt; missed signed PRE cutoff; budget daily hard cap risk; provider rights/retention terms changed; owner explicit GO absent or outside GO window. Never assume a green workflow proves flight data.

On partial/unknown owner secret writes, retain paid STOP OFF and do not rerun the one-time owner release command. Use the exact failed step/run ID to reconcile. A missed Monday start means **NO GO / revised prospective launch requires independently reviewed new authorization**, not silently backdating source captures.

## Continuous monitoring and housekeeping

The existing cron-job.org pair is **PRIMARY_BACKSTOP 8890475** and **ROLLING_ROOT 8890476**. No new cron jobs or provider accounts. Existing hourly launch watch is advisory and not a substitute for signed runtime checks.

The older standalone [managed clock audit 45104276155](https://github.com/HKcode22/TravnrClockRelay/actions/runs/45104276155) ended red with HTTP-ACK-only observations and `HOLD_CRON_MANAGER_RUN_IDENTITY`; do not disable this audit just to get a green icon. Normal relay pulse status, target ACK and real target dual-job execution must be evaluated separately. Built-in GitHub cron jitter remains real (several-hour recorded historical gaps); the external clock is required but is not itself a timing guarantee.

Use issue [#413](https://github.com/HKcode22/ReplitTranvr/issues/413) and the [late heartbeat and SHA audit](2026-11-22_LATE_HEARTBEAT_AUTONOMY_AND_RELAY_SHA_AUDIT_CORRECTED_HANDOFF.md). **Keep exact G9–14; no added gate**. This runbook intentionally prioritizes safe missingness over illegal or unbound paid data.
