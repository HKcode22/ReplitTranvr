# Post-freeze T−24h one-time GitHub-token operational dispatcher — November 4, 2026

## Reason

The owner explicitly requested ChatGPT to initiate the repaired T−24h collection without another manual GitHub UI button and authorized the paid experiment. The GitHub connector in this session has no `workflow_dispatch` write action (and no cancel-run action), so the already-permitted GitHub `create_file`/PR/merge actions are used to install a **single-use, no-provider GitHub Actions relay**, and GitHub's built-in, ephemeral scoped `GITHUB_TOKEN` performs the real `workflow_dispatch` call. GitHub publicly documents `workflow_dispatch` as an exception to the normal suppression of workflows triggered by GITHUB_TOKEN. This is a GitHub-only timed operation; no Replit Agent, Cloudflare, local timers or pasted API key.

## Exact contract

Relay file: `.github/workflows/phase4-gate5-g5a-t24-one-shot-reviewed-relay-20261104.yml`.

- The relay is enabled only by a one-time `push` to `main` that creates/changes this exact workflow file. It does not run on PRs, schedules or normal pushes to source code. Single GitHub concurrency group, first-attempt-only, GitHub repository/ref checks.
- A new GitHub runner must start before **2026-11-04T12:20:00Z**, ten minutes before target's true 12:30Z T24 prearm eligibility deadline. GitHub main HEAD must match the relay's triggering commit, and original T24 source-owner workflow must remain enabled.
- The originally failed run `41810504164` must be `completed/failure`, and previously recovered successor run `41813236781` must be `completed/cancelled` at the exact previously reviewed SHA. The successor's `owner-t24` job must also be `completed/cancelled`. Browser cancel-request banners do not suffice.
- If any subsequent T24/T6/T90 real `workflow_dispatch` or `schedule` target run has appeared, the relay skips dispatch. This is a separate early safety guard; the target still independently verifies V0076 immutable original owner, zero paid reservations, zero reserved units, matching 3 frozen source slots, original reviewed authorization and new genuine GitHub runner start. Both levels must pass.
- The relay has **no provider key, database secret, source persistence or provider call code**. Its minimum token scopes are `actions: write` for dispatch and `contents: read` for verifying the `main` HEAD; GitHub provides the ephemeral token. It submits exactly `{"ref":"main","inputs":{"horizon":"T-24h"}}` through the official REST workflow dispatch endpoint. GitHub may reject this if policy restricts Actions write; such a failure is **HOLD**, never bypassed with another token or expanded privileges.
- The relay MUST print only operational status, never secrets or raw flight content. Target's unchanged provider, source custody, PRE, strict one-request V0076 and provenance safeguards retain all authority.
- After dispatch, the genuine target run, the original immutable DB owner and the first real FIDS source/PRE must be independently audited. The relay's success proves only dispatch acceptance, not API availability, source preservation or scientific PASS.

## Scientific transparency

This is a **post-freeze, post-cancellation operational workaround** and modifies GitHub infrastructure on `main` after the frozen G5A assignment. It does not change original cohort IDs, source times, outcomes, manifest bytes/hash, protocol, API budget or provider rights, but must not be represented as the original prefreeze scheduler working. The user requested the least manual intervention. Remove the temporary relay after source dispatch and preserve this audit note and the GitHub run IDs.

**GitHub evidence preceding relay:** genuine first owner failed after PostgreSQL 57P01, successor successfully verified original zero-reservation DB handoff but experienced repeated Neon idle 57P01, owner requested cancellation, GitHub verified cancelled run. PR #386 implemented bounded read-only heartbeat, error-event detection and strict completed/cancelled successor attestation, exact-head six CI checks passed and merged as `16a3866b56959855d6714ee228d35d841b2a4693`. First prospective physical FIDS source remains **13:30Z (05:30 PST)**; no retrospective source backfill is permitted.
