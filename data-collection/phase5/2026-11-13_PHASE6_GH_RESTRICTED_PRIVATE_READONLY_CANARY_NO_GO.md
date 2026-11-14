# Phase 6 — Real GitHub private PG16 index/registry READ ONLY canary (NO GO)

**Engineering checkpoint, November 13, 2026 PST / November 14 UTC.** This is a code-only, STOP-default step toward *actual* restricted GitHub Actions private data access, not a live execution report or scientific freeze certification.

## Exact gap resolved at the code boundary

Already merged #640/#650/#651/#652/#653/#654/#655 cover the existing signed V0094/V0095/V0096 index/registry and private SOURCE, later-PRE, POST admission bridges. They were exercised with *synthetic* data and disposable PG16, **not** with the production Replit-attached Neon `neondb`. A recurring GitHub child still cannot read the actual signed private packets or use them in the original Phase5 SOURCE/PRE/POST workers.

The new candidate `scripts/v39_phase6_private_index_github_readonly_canary_v39.mjs` is the **first actual GitHub-hosted restricted PG16 input gate**, deliberately **READ ONLY, not automatically scheduled**. It invokes the **existing** `hydrateP6SignedIndexAndFullRegistryHandoffsReadOnly` from `phase6PrivateSignedIndexRegistryInMemoryHandoff_v39.mjs` with a separately commissioned dedicated reader login. The imported verifier enforces external Ed25519 reviewer fingerprint/signature, immutable approved SHA/version/calendar/rights/release/code pins, PG16 `neondb`, dedicated `phase6_private_frozen_reader_v39` NOLOGIN effective role, actual read-only transactions, exact private index current+prior and all bounded private SOURCE/PRE/POST registry byte digests, DB clock and retention deadlines.

New GH workflow `.github/workflows/phase6-restricted-live-index-registry-readonly-canary-no-provider.yml` uses separate paths:
- Pull requests run **synthetic tests only** with **all production secrets and paid GO disabled**. Zero live DB/provider contact.
- Manual `workflow_dispatch` **only on reviewed main** and with exact `VERIFY_RESTRICTED_PRIVATE_INDEX_READONLY_NO_PAID` input, uniquely main-SHA pinned, separate canary approval, signed input and dedicated restricted URL. It cannot run accidentally on `schedule` or a pull request. This is a *future* diagnostic after one-time commissioning, not a normal daily operation.
- The canary uses `P6_PRIVATE_READER_DATABASE_URL` (NEW scoped GH secret; **not** existing Replit `DATABASE_URL`, PRE, SOURCE, other REST, application login or separate Neon plugin). Requires a URL username of `phase6_private_reader_login_...`, database `neondb`, `sslmode=require`; `SET ROLE phase6_private_frozen_reader_v39` then the already-proven restricted verifier. No owner/superuser session and no SQL INSERT/UPDATE/DELETE/DDL/COMMIT.
- The signed private index review and immutable SHA pins are **independently provided**, never generated/approved by this code. Secrets: `P6_PRIVATE_INDEX_CANARY_OWNER_APPROVED` = 1, `P6_PRIVATE_INDEX_CANARY_MAIN_SHA` exact reviewed main SHA, `P6_PRIVATE_READER_DATABASE_URL`, `P6_PRIVATE_INDEX_REVIEW_PINS_BASE64`, `P6_PRIVATE_INDEX_REVIEW_WIRE_BASE64`, `P6_PRIVATE_INDEX_REVIEWER_PUBLIC_KEY_PEM_BASE64`. These are environment key **names only**; no real values are in the public repo or this document. A signed review is cryptographic evidence of approved bytes, NOT independent proof of lawful AeroDataBox Contents use or provider authorization.
- The result is **only redacted SHA/count/PG-clock/status metadata**. Private packet paths, contents, study flights, database URLs, review signatures and passwords are not logged, materialized to public checkout, uploaded to Actions artifacts, or copied to caches. No GitHub token/provider key is passed. The default run remains HOLD if any approval/role/database table/current signed index is missing.

## Tests and boundaries

`tests/phase6_private_index_github_readonly_canary_v39.test.mjs` covers strict main/manual-only identity, wrong/duplicate run SHA, source/app/REST/owner credential refusal, disabling SSL, missing independent review pins, safe redaction, exact dedicated SET ROLE, one invocation of existing signed verifier, connection closure and no claimed paid outcome. This CI is synthetic; disposable PG16 index+registry integration already exists in `phase6-private-index-registry-inmemory-pg16-no-provider.yml`.

**No user shell/installation is requested by this PR.** Actual production commissioning must separately inspect the *existing* `neondb` and, only once with reviewed owner action, install V0094→V0095→V0096 if absent; create a dedicated reader LOGIN membership and GH secret; publish real externally signed approved future index and packet rows. Never replay V0079–V0093 or create another DB. The last real owner read-only audit (2026-11-14 01:53Z) found V0094 absent; that snapshot is historical, not a new observation.

## Next after this candidate

1. Real owner one-time `neondb` schema+roles/keys and actual signed future index/registries under purpose/retention review, then **one** restricted GH read-only diagnostic.
2. Wire actual restricted **SOURCE query packet** under same job to the existing #653 private pair and original SOURCE child, preserving real GH run identity, physical-budget reservation and no retry.
3. Wire T24 and existing signed T6/T90 #654 Stage14 worker and POST #655 V0083 with real PRE/POST source original, independent history, clock, row identity, rollback/unknown-commit quarantine, and partial missingness.
4. 31-day unattended controller/stop/throughput, target/label provenance, retention and backup/PITR expiry, authentic signed B0062 population. Distinct **Phase5 scientific FREEZE HOLD** and **Phase6 paid NO-GO** until genuinely verified. Conditional Nov20 readiness, no daily Replit operator requirement.

**Code-only output does not grant GO. No paid API, alert, new database, live SQL or migration in this candidate.**
