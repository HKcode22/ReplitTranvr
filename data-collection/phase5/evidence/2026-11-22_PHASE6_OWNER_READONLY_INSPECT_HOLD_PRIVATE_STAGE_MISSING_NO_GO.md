# Phase 6 — owner read-only inspection HOLD: private stage package absent

**Disposition:** HOLD / NO GO. This receipt records an owner-run read-only preflight stop. It does
not authorize stage installation, policy application, SOURCE enablement, provider access, paid
collection, or any database write.

**Observed current main:** 3481b4ee77ae06cb2ed7933ad30c9d8b39e6f3f3.

## Actual owner output

The disposable-clone command completed its public checks and stopped at:

    STOP: private Monday stage directory is missing.

The command therefore did not invoke the policy verifier or open the database. At this stop:

    providerCalls=0
    databaseReads=0
    databaseWrites=0
    phase6PaidGo=false

## Exact missing private input

The verifier requires an owner-local directory under HOME whose name begins
.travnr-phase6-monday-, with restrictive ownership and permissions, containing the genuine
reviewed files:

- new-stage-input.json
- new-manifest.json
- new-config.json
- new-external.json
- new-timing.json

The public committed stage-input file
data-collection/phase5/planning/phase6-monday-stage-input-795ace55.json is not a substitute for
the private reviewed package. Do not create placeholders, copy candidate review files into these
names, or infer the missing bytes from hashes.

## Next safe action

Owner may inspect for an existing package without changing the worktree:

~~~bash
find "$HOME" -maxdepth 3 -type d -name 'travnr-phase6-monday-*' -print
find "$HOME" -maxdepth 5 -type f \( \
  -name 'new-stage-input.json' -o \
  -name 'new-manifest.json' -o \
  -name 'new-config.json' -o \
  -name 'new-external.json' -o \
  -name 'new-timing.json' \
\) -print
~~~

If those searches are empty, the reviewed private package is genuinely unavailable. Do not run
--apply-reviewed, stage installation, SOURCE enablement, provider calls, or paid collection to
work around this HOLD. Phase 6 remains safely disabled until the genuine reviewed inputs exist and
the read-only inspection produces a truthful receipt.
