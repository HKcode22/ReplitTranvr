# Phase 5 — The SOURCE login was already proved; reuse it to advance a real flight-candidate audit

**Status:** engineering/education checkpoint, 2026-11-12; one canonical Amendment E, no paid-provider or live database mutations. This corrects a repeated verification request and fixes an unrelated existing owner-only native flight audit whose SQL access role was wrong.

## What was really already completed on November 8 UTC

[GitHub Actions run #42443811669](https://github.com/HKcode22/ReplitTranvr/actions/runs/42443811669) for the **pre-existing** `phase5-source-real-github-readonly-metadata-manual.yml` workflow finished **SUCCESS**, as corroborated by its real job logs:

- `status: P5_SOURCE_GITHUB_REAL_READONLY_ROLE_VERIFIED`
- `sessionLogin: phase5_p5_source_login_20261108`
- `effectiveRole: phase5_fids_source_prod_20261107`
- `authenticatedRoleSet: true`, `readOnlyTransactionVerified: true`
- `sourceOrBudgetRowsRead: 0`, `sourceRoleChanges: 0`, `livePaidSourceActivated: false`, `phase6PaidGo: false`.

This establishes that the actual pre-existing **dedicated SOURCE login** successfully authenticated and assumed the exact group in a read-only PostgreSQL transaction **on November 8**. It was not a dummy CI simulation, and the login session test should **NOT** be repeated without evidence of a changed secret/session/role.

A second independent owner-presented read-only Neon catalog on **Nov 12** established that SOURCE has `SELECT` on all five relevant FIDS/attempt/binding/population tables whereas PREPARE has only allowed-query `SELECT`. That is documented in [the live ACL checkpoint](2026-11-12_ACTUAL_NEON_V0079_SOURCE_ROLE_CATALOG_READBACK_AND_LEAST_PRIVILEGE_FIX.md) and corrected in merged [PR #597](https://github.com/HKcode22/ReplitTranvr/pull/597).

**Software-engineering lesson:** The *login* is the credential-bound session (`session_user`). The *role* is the effective SQL privilege group (`current_user`). A catalog query `has_table_privilege(group, table,'SELECT')` demonstrates a grant but does not itself connect as that account. Both already happened independently. **V0079 original** means an actually saved provider FIDS response bound to its real reservation/request and decoded-body SHA, not another SQL migration to install. *Eligible* means same positive operating leg and T, on-time source and reviewed rights; *unexpired* means the raw object is still retained and within the governing access window. These checks protect genuine training features against wrong-leg joins, post-prediction data leakage and unavailable provider Content. Do not turn them into repeat-the-same-verification bureaucracy.

## Concrete additional production-path bug found and fixed here

An older **existing** workflow `phase5-actual-source-native-flight-candidates-readonly-manual.yml` and runner `scripts/v39_phase5_actual_source_native_flight_candidate_readonly_owner_v39.ts` tried to perform a source-original and normalized member SELECT **using the dedicated PRE worker login `phase5_p30_pre_login_20261107`**.

That code was not operationally justified by the actual Neon role matrix, and it depended on PRE writer source SELECT instead of the verified SOURCE group. **A source-specific SELECT belongs to SOURCE, not PREPARE or PRE.** This PR corrects the *existing workflow and runner* rather than introducing a fourth audit workflow or changing SQL grants:

1. The already existing SOURCE GitHub secret `V39_P5_SOURCE_DATABASE_URL` is passed to the approved manual review workflow. All PRE/PREPARE/other REST admin credentials remain blank in the workflow.
2. The runner validates that the URL's username is the previously authenticated `phase5_p5_source_login_20261108`, then connects with the **existing Stage28 dedicated-role adapter** in `group:"source"` mode.
3. The read-only transaction additionally requires `session_user=phase5_p5_source_login_20261108` **and** `current_user=phase5_fids_source_prod_20261107`, live Neon PG16, replica=false and `transaction_read_only='on'`; denies PRE, runtime-owner impersonation and role cross-use **before any original/member SQL**.
4. It still reuses the original Stage14 `P5_STAGE14_BOUND_SOURCE_SQL` and bounded existing `P5_ACTUAL_SOURCE_ALL_MEMBERS_READONLY_SQL`, reports only counts/categories and a digest, refuses empty/ambiguous original and >2500 member population instead of quietly truncating, and never generates a signed PRE packet.
5. Offline tests now verify the actual SOURCE dedicated login, rejection of PRE and owner session impersonation, rollback and destruction, source/normalized member query, and no DML/GRANT. A fully signed existing source query, independent Contents-use approval and prospective native-time/cutoff evidence are still mandatory for a **real manual** run.

This is a **real step toward one authentic source→PRE flight pilot**; it repairs an existing runner that otherwise could have failed when turned on. It is not a redundant authentication check or permission migration.

## What comes immediately after—not another SOURCE login check

Run the existing signed future-source candidate review **once** when actual independently approved source/Contents/right-to-use pins and an unexpired V0079 binding exist. Its output gives the number of qualifying operating flights and each horizon's cutoff viability **without printing identities or raw source Contents**. Use those results to select a genuine one-flight candidate and independently freeze the original Stage14 + separate T24/V0081 witness + later T6/T90 + POST packet. If there are no eligible rows, the scientific result is an honest **no candidate**; do not backfill flights or fabricate source data. This runner is STOP-default and existing workflow dispatch requires exact separate owner/right/code pins. It is not auto-armed by merging.

The original **31-day** batch-days happen in Phase6 after a paid GO. The project 50k REST ceiling and separate Alerts, the optional 4/5/6 horizon evaluation and actual gate-out label-source rights remain separate decision gates. No new migration, worker account, feature snapshot, provider call, physical label or paid GO is made in this PR. **Scientific FREEZE HOLD / Phase6 paid GO NO** until the real prospective source and other substantive requirements exist.
