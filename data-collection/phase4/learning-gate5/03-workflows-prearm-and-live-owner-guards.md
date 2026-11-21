# 03 — GitHub workflow YAML, prearming, and the ACTIVE owner

## File 1: the workflow is a launcher, not the collector

Open `.github/workflows/phase4-gate5-g5a-nov06-1400z-real-wsss-prospective-owner.yml`. It tells GitHub **which machine and code to run**. The main algorithm is elsewhere: `scripts/v39_phase4_gate5_g5a_nov06_1400z_real_wsss_horizon_owner.ts`.

### Block A: how a run is requested

```yaml
workflow_dispatch:
  inputs:
    horizon:
      required: true
      type: choice
      options:
        - T-24h
        - T-6h
        - T-90m
schedule:
  - cron: "50 10 6 11 *"
  - cron: "5 11 6 11 *"
```

Excerpt: the real file contains additional cron values. A *manual* `workflow_dispatch` with `horizon=T-90m` runs the T90 owner. A cron requests a launch, but GitHub may deliver it late, so the script still demands **actual** job-start proof.

The workflow also has `pull_request` and `push` triggers. Those intentionally run `offline-integrity` tests with secrets cleared. A green offline run is **not** proof paid data was collected.

### Block B: select the correct job

The YAML contains four jobs: `offline-integrity`, `owner-t24`, `owner-t6`, `owner-t90`. Only the one matching the triggering event/horizon runs. When the GitHub page shows `owner-t24: skipped` during a T90 run, that's normally correct.

Representative configuration:

```yaml
owner-t90:
  name: owner-t90
  runs-on: ubuntu-latest
  timeout-minutes: 340
  environment: phase2g-paid
  env:
    P4_G5_G5A_HORIZON: T-90m
    ADB_AUTO_COLLECT: "0"
    V39_PHASE6_PROCESS_ARMED: "0"
```

The paid environment exposes a scoped provider key and source-owner database URL, but **does not enable generic auto-collection or Phase 6**. These variables are not an invitation to execute the script from Replit.

### Block C: create the runtime

```bash
npm ci --include=dev --no-audit --no-fund
node --import tsx scripts/v39_phase4_gate5_g5a_nov06_1400z_real_wsss_horizon_owner.ts
```

`npm ci` installs lockfile-pinned dependencies in the GitHub runner. `tsx` loads a TypeScript file for Node. The code does not contact AeroDataBox merely because Node starts; it first runs authentication, timing and DB checks.

## File 2: prove a real timely GitHub runner

Open owner script `assertG5AOwnerRunContextV39`. It checks the exact repository, main ref, revision, one-shot run attempt, job identity, workflow path, event type, reviewed paid intent, disabled general automation, and presence of scoped secrets. This is a **fail-closed allowlist**, not a generic source script.

```ts
if (
  e.GITHUB_ACTIONS !== "true" ||
  e.GITHUB_REPOSITORY !== REPO ||
  e.GITHUB_REF !== "refs/heads/main" ||
  e.GITHUB_SHA !== checkout ||
  e.GITHUB_RUN_ATTEMPT !== "1" ||
  e.GITHUB_JOB !== j.job
) hold("GITHUB_CONTEXT_OR_SECRET");
```

This is a trimmed excerpt. In particular, the owner also checks the environment's scheduled or manually reviewed horizon. `hold(...)` throws and stops an unverified attempt.

Next, `proveRealGithubOwnerJob` actually queries GitHub's REST API to verify its own run/job is currently `in_progress`. It checks real timestamps:

```ts
jobStarted <= prearmDeadline
run.head_sha === sha40
job.name === e.GITHUB_JOB
```

These are illustrative predicates from a longer condition. Why the second API lookup? Because anyone could set local environment variables—**they are not independent proof** that GitHub started a real runner on time.

## File 3: turn a future plan into durable PREPARED and ACTIVE database ownership

Open `phase4Gate5DurablePreparedOwner_v39.ts` and `phase4Gate5OwnerActiveTransition_v39.ts`. Think of the first as inserting a *reservation for an owner*, and the second as granting the owner permission to run its fixed timetable. Neither step itself spends provider credits.

The activation function begins a transaction:

```sql
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE READ WRITE;
SELECT pg_advisory_xact_lock(76,41);
SELECT state, manifest_sha256, horizon, github_run_id
FROM clean.phase4_g5_fids_physical_owner_v39
WHERE owner_digest=$1 AND manifest_sha256=$2
FOR UPDATE;
```

Simplified excerpt; see exact code for extra selected columns. `SERIALIZABLE` asks PostgreSQL to enforce a serializable concurrent transaction. `pg_advisory_xact_lock` coordinates work; `FOR UPDATE` locks the selected owner row while it is checked. This prevents concurrent backup GitHub runners from both believing they own the same horizon.

### What does PREPARED → ACTIVE actually certify?

```sql
UPDATE clean.phase4_g5_fids_physical_owner_v39
SET state='ACTIVE'
WHERE owner_digest=$1
  AND manifest_sha256=$2
  AND state='PREPARED'
  AND clock_timestamp()<=verified_prearm_deadline_utc
RETURNING owner_digest;
```

Simplified selection, not verbatim full query: actual code also checks GitHub run and authorization identity. It establishes **the owner is registered and timely**. It does **not** prove a source request, provider rights, normalized flight identities or PRE snapshots exist yet. Thus:

```text
G5A_GITHUB_OWNER_PREARMED_V0076_ACTIVE
≠ AERODATABOX_GET_SUCCEEDED
≠ TWELVE_PRE_PERSISTED
≠ SCIENTIFIC_GATE5_PASS
```

## Why backup GitHub crons do not multiply paid calls

The source owner reads `phase4_g5_fids_physical_owner_v39`. If another job owns the same owner digest, it suppresses the duplicate. A `Set` in JavaScript wouldn't be enough; each separate GitHub runner has a separate memory space. Persistent PostgreSQL uniqueness plus transactions are what matter across machines.

A prior cancelled T24 owner had a tightly guarded zero-spend delegation path. That's an exceptional recovery, not the normal T90 behavior. Do not generalize it to arbitrary "rerun after failure".

## Follow the call graph without hopping around

```text
YAML owner-t90
  -> node --import tsx ...horizon_owner.ts
      -> assertG5AOwnerRunContextV39
      -> proveRealGithubOwnerJob
      -> parseFrozenManifest
      -> prepareP4Gate5PhysicalOwnerV39
      -> stageP4G5PreparedOwnerDbOnlyV39
      -> activateP4G5PreparedOwnerDbOnlyV39
      -> wait for physical source slot
      -> (next lesson: paid reservation and FIDS)
```

## Exercise

Why does an actual GitHub job started 10 minutes *after* the prearm deadline have to stop even if the correct source code and API key are present? Why is the DB owner row more reliable than a local `let alreadyRunning=true` variable? What is the difference between `completed/success` and a scientific acceptance verdict?
