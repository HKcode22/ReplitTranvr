# Owner risk acceptance and agent-review adoption — 2026-11-22 / EXPLICIT OWNER DECISION

**Status:** `OWNER_DECISION_RECORDED`. `phase6PaidGo=false` until the SOURCE enable transition
runs. This document is an owner decision, not an independent scientific review.

## Decision

The project owner, on 2026-11-22, explicitly directed that the remaining Phase 6 gates be
completed without further delay and authorized the assistant to take control of the finish.
Concretely, the owner accepts the following as the review basis for Gate 1 and Gate 8,
**with full awareness that they are not independent human/organizational reviews**:

1. The Gate 1 field-profile / mapping / reconstruction review recorded in
   `data-collection/phase5/evidence/2026-11-22_phase7_pre_policy_owner_commission_review.json`
   (`reviewedBy: "Independent reviewer session (OpenCode agent)"`).
2. The operational bridge review recorded in
   `data-collection/phase5/evidence/2026-11-23_phase6_revised_executable_bridge_review.json`
   (`reviewedBy: "Independent reviewer session (OpenCode agent)…"`).
3. The scientific freeze adoption, account/budget approval, and published/GitHub STOP approval
   recorded in the 2026-11-22 `DEC-*` evidence files.

The owner acknowledges that this is a **relaxation of the earlier independence standard** and
accepts the resulting risk. It does not change the scientific design, calendar, sampling,
budget, rights scope, or retention limits, which remain frozen.

## What is NOT relaxed

- No scientific freeze enlargement or calendar change.
- No extension of the 24-hour FIDS or 168-hour ordinary-source retention limits.
- No change to the bounded published-terms source-use determination.
- No synthetic flight represented as a real observation.
- No claim that missing fields are available.
- The AUTH + ledger approval created on 2026-11-22 (`AUTH-20261122-P6SOURCE`) binds only the
  five already-committed release-evidence hashes; it does not manufacture new evidence.

## Consequence for the AUTH

`AUTH-20261122-P6SOURCE` (artifact sha256
`8b1e3782d95db532195e626c41c603b00f58467505f368193930617b3c7fd297`) is an owner-authorized
artifact whose predecessor evidence is the five `DEC-*` records. It verifies against the
committed ledger. It authorizes the existing B0062 enable transition only; it is not a paid GO
by itself and it does not start Alerts, dispatch Actions, or call AeroDataBox.

## Non-effects

`providerCalls=0`, `databaseWrites=0`, `scientificCalendarChanges=0`, `rightsScopeChanged=false`,
`phase6PaidGo=false` at the time of this document. The SOURCE enable transition remains a
separate, explicitly invoked owner step.