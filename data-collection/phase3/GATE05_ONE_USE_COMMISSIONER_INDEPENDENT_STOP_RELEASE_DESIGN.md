# Gate 0.5 — one-use commissioner and independent STOP release design

**Status:** DRAFT / DESIGN REVIEW ONLY / **NO-GO for live WSSS FIDS**  
**Date:** October 20, 2026 (PDT)  
**Repository:** `HKcode22/ReplitTranvr` · draft PR **#80** · `phase3/gate05-evidence-first-20261018`  
**First protected source baseline:** `ceac25255e8ebafb39eb96ad68bb25e23e50b86b` (4/4 non-provider GitHub workflows SUCCESS at source review)  
**Change control:** This document does **not** authorize production PostgreSQL queries/writes, migrations, credentials, signer enrollment, deployment, scope activation, or paid API expenditure. All historical October 19 WSSS windows and query hashes are **canceled**.

## 1. Exactly what will be evaluated

The proposed **first** Gate0.5 paid action is a *source feasibility* comparison of two WSSS departure FIDS snapshots, `withLocation=false` and `withLocation=true`; it is **not** the full scientific/statistical Gate0.5. The proposal is capped at **4 base + 8 retry = 12 provider API units**, with **0 Alert subscription creations**. The assumption that a FIDS HTTP GET costs 2 units (therefore at most 2 base GETs + 4 retry GETs) is **NOT** account-specific billing proof: independently confirm effective tariff and whether extra charges/tiers apply before authorization. A reserved attempt may be billed even when the response is lost; never refund it optimistically.

A fresh authorization must name **one** exact WSSS event interval in the `Asia/Singapore` IANA zone, **one** separate UTC execution `startsAtUtc/expiresAtUtc` interval, two exact query fingerprints, one source commit, one pinned contract digest, one current billing cycle/reset, a maximum 12-unit budget, and one immutable unique AUTH ID and byte-SHA. The PostgreSQL scope window is at most one hour and must start within 24 hours of preparation. Do not derive a new future window by editing or reusing canceled October 19 artifacts.

## 2. Evidence authority: distinguish facts from assertions

| Evidence class | Required source | What it actually proves |
| --- | --- | --- |
| Source and tests | GitHub exact PR head SHA + complete four-workflow results | Code was validated on that SHA; **not** deployed |
| Production DB catalog | Independently authorized **read-only** TLS session to attested production DB | Actual tables, functions, grants, index definitions, active scope and attempts |
| Account tariff + rights | Owner-visible RapidAPI/AeroDataBox subscription and applicable T&Cs for that account/cycle | Effective FIDS Tier2 billing, remaining units, storage/retention/license |
| Owner signer root | Owner-established trusted public-key fingerprint **out of band**, stored with provenance | Which owner-controlled key is authorized; never infer from a self-supplied test pin |
| Exact human AUTH | Independently reviewed bytes, signer proof and **separate explicit written approval** | What single preparation/live scope and ceiling the user approved |
| Restricted LOGIN roles | Independent TLS login to production as dispatcher, safety, commissioner, each with privilege-negative tests | Identity isolation; group-role `SET LOCAL ROLE` CI test is insufficient |
| STOP operation | Separate supervisor runtime identity, heartbeat, restart/alert test and genuine committed STOP receipt | Actual termination of further reservations; no already accepted GET refund |
| Published host/source | Attested Replit published runtime commit/build and callback identity | Which code would really dispatch; draft CI is not production identity |

**No externally verified evidence above can be manufactured by a self-reporting Boolean from an offline helper.** A cryptographically valid signature generated with an ephemeral CI key does not identify the human owner. A passing SQL fixture does not attest production. No single helper has the authority to change NO-GO to GO.

## 3. Safely partition permissions and ownership

The intended actor boundary is:

- **Human owner:** separately authorizes (a) production infrastructure change, (b) commissioning/scope preparation and deployment, and (c) **paid pilot** with a precise WSSS local/UTC observation/execution window and <=12 units. Approval of (a) or (b) never implies (c).
- **One-use commissioner:** a dedicated, non-general-purpose LOGIN or independently attested one-use invocation calling narrowly scoped `SECURITY DEFINER` functionality; can only insert exactly one `PREPARED` scope plus exactly two allowlisted query rows after independent signer, tariff and cycle checks. **Cannot** activate, reserve, invoke STOP, grant roles, alter schema, delete history or issue secrets.
- **Activator (separate authorized act):** a distinct tightly scoped function may change *that exact* verified PREPARED scope to ACTIVE **only** after the user's separate live GO. Must revalidate exact immutable AUTH SHA/source/cycle/window, expiry, prepared readback, V0068 index definitions, role grants and no active conflict. Never a broad table UPDATE privilege on the app role.
- **Dispatcher:** separate short-lived LOGIN; `EXECUTE` only `clean.reserve_gate05_fids_attempt_v39`, neither STOP nor table SELECT/INSERT/UPDATE/DELETE. Must durably reserve and commit 2 units **before every physical FIDS GET**, with no legacy-budget fallback.
- **Independent safety owner:** separate short-lived LOGIN; `EXECUTE` only `clean.stop_gate05_fids_pilot_v39`; cannot reserve, activate or directly modify tables. Its process cannot rely on the dispatch process's AbortController, shared credentials, same process heartbeat or local filesystem.
- **Release/migration operator:** privileged production identity only for separately authorized DDL; never leave this owner identity in normal runtime. Must review default ACL inheritance and explicit object-level revocations rather than assuming `PUBLIC` revocation removes legacy runtime grants.

**Important existing state:** V0066/V0067 were **previously** reported verified installed in production; **never reapply**. The current V0067 `gate05_fids_commission_v39` group intentionally has **NO usable table/function grants**, and there is no implemented production commissioner/activator. V0068's unique indexes are **staged**; source existence != installation. Prior dispatch and STOP passwords expired Oct20 02:00 PDT; password expiry does not terminate pre-existing sessions.

PostgreSQL guidance: `SECURITY DEFINER` functions execute with owner privileges. Their `search_path` must exclude untrusted-writable schemas; revoke default `PUBLIC` function execution and grant to restricted identities **in the same transaction**. Keep privileged function code fully qualified and test schema ownership/CREATE grants. References:
- https://www.postgresql.org/docs/16/sql-createfunction.html
- https://www.postgresql.org/docs/16/perm-functions.html
- https://www.postgresql.org/docs/16/ddl-priv.html

## 4. Commissioning transaction: one use, atomic, no activity

**Design only; no production SQL executor is delivered here.** A future independently approved commissioner must:

1. Assert trusted signed-auth bytes and out-of-band independently approved signer key SHA; reject substituted keys or signatures.
2. Verify the owner-approved exact source/contract/cycle/Tier2 and legal retention rights, WSSS local interval/UTC bounds, 4+8=12 cap and zero Alert creates.
3. Verify the target production DB identity and V0066/V0067 function/table owners, effective grants, and the three **structurally correct** V0068 indexes (one globally open PREPARED/ACTIVE scope, globally unique AUTH ID and authorization byte SHA); abort if V0068 absent or partial.
4. Start a bounded **single transaction** under the restricted one-use commissioner, establish a session/transaction serialization guard, and inspect live/open scope inventory *inside the transaction*. A SELECT-count alone does not prevent a concurrent writer; the UNIQUE indexes must enforce the race.
5. Insert only 1 PREPARED owner row and 2 matching WSSS query hashes with fixed `false/true` location flags and zero used/reserved attempts, via pre-reviewed parameterized commands. Validate exact rows and expected SHA from the same transaction. On any mismatch, ROLLBACK.
6. COMMIT exactly once only after all checks, then perform a **separate independent read-only post-commit attestation**. A prepared scope cannot dispatch; `ACTIVE` remains false until a separately approved later step. Reuse of the AUTH ID or digest after STOP must remain impossible.
7. Revoke/expire and close the one-use credential/session, and ensure no broad runtime role has direct pilot-table privileges. Record opaque receipt IDs and evidence hashes; do not copy passwords, API keys or raw flight IDs into GitHub.

**Acceptance/failure tests on disposable PG only before any release:** competing two-session PREPARED inserts, mid-transaction failures, replay after STOP, forged signer, wrong time/cycle/source/hash, default runtime ACL inheritance, commissioner reserve/STOP/ACTIVATE denied, no scope left on any failed attempt, and historical STOPPED evidence preserved.

### Staged V0069: exact permit-bound PREPARED-only function (unapplied)

The draft now contains `migrations/staged/V0069__gate05_permit_bound_prepared_only_v39.sql` and a dedicated disposable-PG integration test. **Neither is a production release or signer authority.** The new migration creates a permit registry with an immutable AUTH ID/byte-SHA, exact WSSS cycle, scope, departure query hashes and UTC bounds. It exposes a single `SECURITY DEFINER` function `clean.prepare_gate05_permitted_scope_v39(uuid,text)` to the previously inert `gate05_fids_commission_v39` NOLOGIN role, without direct table privileges.

A trusted, separately authorized *privileged operator* must register a permit after verifying the exact externally rooted human signature, account-specific provider tariff/retention and allowed cycle. There is **no permit-minting function** for a commissioner and no automatic registration. The restricted function locks the exact permit, accepts only the pinned digest, creates one PREPARED scope and its two query hashes, and marks the permit consumed in the same transaction. A failed insert cannot consume the permit; V0068's unique partial open-slot and global AUTH/digest constraints enforce concurrency/replay. A consumed permit stays terminal even after STOP; a newly approved permit is needed for any future experiment.

This is **per-permit one-use, not proof that a login can be called only once**. Separate short-lived LOGIN issuance, revocation/termination of existing sessions, independent operator provenance and post-commit readback are still required. The function does not verify Ed25519 itself, install V0068, activate the pilot or authorize any FIDS calls. The proposed `SECURITY DEFINER` owner, absence of unintended inherited default grants (especially from the admin default ACL), approved permit creation pathway, and function definition must receive independent release scrutiny before a production change is considered.

CI integration uses `tests/phase3_gate05_permit_bound_commission_disposable_pg_v39.test.ts`, protected by the exact localhost `v39_ci` URL, `NODE_ENV=test`, GitHub Actions and missing provider key. It applies V0066–V0069 and fixtures under one transaction that always ROLLBACKs; a CI-privileged fixture *pretends* to register an authorization, and is **not** owner identity or human approval. Tests must verify absent/mismatched/consumed permits, role denial for table/STOP/reserve/activate, one PREPARED plus two query rows, globally exclusive open scope, preserved STOP history and atomic failed-scope rollback.

**Release sequencing clarification:** the initial production V0068 review/approval is separate from any future approval to install V0069 or to register a permit. Installing a function should never by itself make a permit or sign an owner authorization. Prior October 19 proposals remain canceled, and new WSSS times are to be generated only after physical operating gates are complete.

## 5. Independent STOP: real operations, not just a helper

The existing pieces are **draft-only**: `gate05SignedExpiryGuardPlan_v39.ts`, `gate05ScopedFidsStop_v39.ts`, `gate05BoundedStopRecovery_v39.ts`, and `gate05IndependentStopDbPolicy_v39.ts`. They contain signed-input preview, STOP adapters, 3-attempt bounded recovery and proposed connection limits. They DO NOT launch a process, create a separate fault domain, verify uptime, authenticate a production safety login or attest delivered alerts.

A proposed operating implementation must separately:
- Establish independently supervised **safety process liveness** and restart after termination; minimize common failure domains with the published dispatcher. A GitHub Actions scheduled workflow alone should not be counted on for sub-minute STOP deadlines.
- Independently authenticate TLS to the attested DB with the safety-only LOGIN. Bind scope/deadline to immutable signed AUTH and **durable DB truth**, not separately typed values. Never embed DB/API credentials in tracked files.
- Set bounded connection/lock/server statement/client query limits (draft review proposal: 3s/1.5s/4s/6s), and verify actual server settings per connection. A client-side query timeout does not by itself establish server cancellation/rollback or safe settlement.
- On expiry, make the terminal STOP call, verify exactly one durable STOP receipt, and independently reconcile post-commit state. **New reservations must already fail closed at the database's own `clock_timestamp() >= expires_at_utc` check**, even if the safety process is down. Previously reserved HTTP GETs may remain billable.
- On ambiguous timeout/disconnect, **never invent a successful STOP**; retry idempotently within bounded policy, record `STOP_UNCONFIRMED`, escalate through a verified alert path and continue supervisory recovery. Three calls are not a guarantee of successful delivery or independent liveness.
- Demonstrate dispatcher crash while safety process remains healthy; STOP prior to/at expiry; repeated terminal STOP; SQL lock contention; DB outage/recovery; restart after missed deadline; escalation transport outage and acknowledged alert; maximum provider reservation reconciliation. All exercises must precede live WSSS and use an approved, non-billable environment where possible.

**Critical operational hold:** A mocked `vi.fn` receipt, single-process role switch or disposable rollback-only STOP does **not** establish a live independent STOP daemon or committed production safety action.

## 6. Change/approval sequence — explicitly separate decisions

| Stage | Operator approval required? | Provider spend permitted? |
| --- | --- | --- |
| A. Draft source/negative CI tests and design review | Continue on draft PR #80 only | **NO** |
| B. Owner account/Tier2 billing/rights evidence and optional attested production READ ONLY inventory | Obtain owner consent for any requested account/production access; no write | **NO** |
| C. V0068 production migration and separately restricted commissioning/safety credentials | **New explicit production-change authorization** after exact plan/source/rollback review | **NO** |
| D. Independent process deployment, restricted-login/STOP dry-run and rollback rehearsal | **Separate deployment/commissioning authorization**; no active paid scope | **NO** |
| E. Human signed one-use PREPARED exact WSSS scope | **New exact owner AUTH**, not self-pinned | **NO** |
| F. Fresh future scoped activation and at-most-12-unit two-query feasibility attempt | **Separate explicit live/paid GO** specifying local observation and UTC execution windows, query digests and expiry | Only within **approved** cap |
| G. STOP/settlement/source-feasibility assessment, raw-data retention enforcement | Report evidence, reconcile units and quality | No automatic later pilot |

**The project is still at stages A/B, not C–F.** Passing more CI does not silently advance authority. The canceled October 19 proposed times/hashes are not recoverable scheduling options.

## 7. Minimal decision record for the next handoff

Until there is a *new* independently verified fact, state:

- `decision = NO_GO`
- `current_live_scope = NOT_AUTHORIZED`
- `production_v0068 = NOT_INDEPENDENTLY_VERIFIED_INSTALLED`
- `one_use_commissioner = NOT_OPERATIONAL`
- `independent_stop = NOT_OPERATIONAL`
- `provider_plan_tariff_retention = NOT_ACCOUNT_ATTESTED`
- `fresh_owner_signed_auth = NOT_PRESENT`
- `paid_approval_max_12 = NOT_GRANTED`
- `new_wsss_window = NOT_SELECTED`

The next true milestone is **verifiable evidence of the owner's current plan/retention rights and an approved, fully scoped commissioning/safety release candidate**. Choosing the WSSS window is intentionally last, so it cannot expire while infrastructure is being reviewed.
