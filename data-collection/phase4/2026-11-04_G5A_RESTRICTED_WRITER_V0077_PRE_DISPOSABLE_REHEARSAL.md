# Gate 5 — restricted GitHub source writer, real PostgreSQL16 synthetic end-to-end rehearsal

**Nov 4, 2026.** The owner asked for a deeper no-provider audit before **any** future WSSS paid G5A cohort is armed.

## Why previous CI was insufficient

The actual Nov4 T24 collector made 3 exact immutable V0076 reservations but persisted zero original FIDS responses, zero V0077 bindings and zero PRE. Root cause class: production restricted GitHub source writer did not have required implicit FIDS AFTER INSERT trigger privileges on `clean.population_research_membership`. This was reproduced under disposable PG16, then corrected in production by the owner's **successful** Nov4 one-time GRANT, independently verified by protected GitHub read-only run 41947550977: actual owner membership INSERT and key-column SELECT true. **This does not mean the real source pipeline is fully tested.**

Existing disposable source→PRE V0078 fixture used the PostgreSQL **schema owner** connection for both persistence and PRE. This test could therefore miss any later trigger/sequence/function/table permission mistake in the real restricted writer.

## New no-paid production-shaped rehearsal

This PR adds a new **pull_request / push only** GitHub workflow using disposable `postgres:16` on `localhost` with fake test credentials. It installs the actual current B0062 baseline plus staged V0076, V0077 and V0078 **only inside that disposable DB**. Test setup seeds one immutable synthetic V0076 T24 owner with 3 separate irreversible attempts as privileged test fixture, creates a new non-superuser writer login, and grants the **same eight direct source tables, two serial sequences, function execution and two minimal membership trigger permissions** as the production protected owner. The synthetic source's actual `v39Pool` is pointed to the restricted login, not the privileged bootstrap DB. The PRE writer is also invoked using the *restricted login*. It then asserts:

- Three synthetic FIDS responses with the same provider flight identity can persist as distinct real transactions with **V0077 original bindings** (exactly three source receipts), preserving V0078 repeat-source uniqueness.
- Before the actual synthetic cutoff, the restricted writer creates only **one** source-qualified PRE for that single physical flight.
- An independent `READ ONLY` transaction after the real synthetic cutoff confirms source and PRE parity and absence of late backfill.
- Existing non-FIDS uniqueness still rejects a duplicate. All cases use fake data and public documented synthetic names; no paid provider requests, no production DB writes, no migrations/role/secret alterations to the actual project.

The test is strictly one restricted-role **rehearsal**, not proof of actual provider HTTP status, source licensing/retention rights, production admin-role separation, actual billing, every possible anomaly, or strict scientific Gate5 PASS.

**Release hold:** Do not merge the separate future paid Nov7 workflow activation PR #394 on this test alone. Require this disposable restricted-role pass, final exact GitHub protected role/read-only security audit, new cohort schedule/manifest/time gates, and owner readiness decision. If this test fails, strengthen the code/role grant plan and rerun the **offline CI only** until scientifically necessary invariants pass. Never reset Nov4 source reservations or backfill T24.