# Phase 6 production PITR recovery-control review — non-destructive Article 5.8 path

Date reviewed: 2026-11-19 (Pacific)
Status: **RECOVERY CONTROL REVIEWED; NO LIVE PRODUCTION RESTORE DRILL REQUIRED; PAID GO STILL SEPARATE**

## Observed production setting

The owner-side production database settings were previously read back as:
- Point-in-time recovery: enabled.
- Recovery window: 7 days / 168 hours.
- Scheduled backups: off.

This review does not expose a connection string, credential, payload, or provider record.

## Current platform behavior reviewed

Current Replit Database documentation states that production PITR is continuous, is enabled with a 7-day window by default, can restore to any second within the configured window, and that a production restore **replaces the live data** with the selected historical state.

Because a production restore is a live-data mutation, Travnr will not perform a destructive restore merely to prove that the control exists before Phase 6.

Reference:
https://docs.replit.com/features/data-and-storage/data-recovery

## Provider-terms basis

AeroDataBox Article 5.8 identifies routine backups and similar operational records as "Incidental copies" that may remain until ordinary rotation, provided they are not accessed or restored except for recovery, debugging, security, metering, dispute, or compliance purposes and are not pooled or reused as a source database.

Reference:
https://aerodatabox.com/terms

## Recovery-only control

The production PITR surface is accepted as an incidental recovery copy only under all of these controls:

1. PITR is not a Phase 7 training store, source archive, historical feature store, or replacement for the AeroDataBox API.
2. No routine ML/research query may read PITR history.
3. A restore may be initiated only for an actual recovery/debugging/security/compliance event.
4. Before any production restore, paid collection and source-writing automation must be stopped.
5. Restored state is treated as quarantined for source-custody purposes until the original per-record expiry/deletion reconciliation has run.
6. Any source Contents that would already be expired at the restored wall-clock time must be re-deleted/invalidated before non-recovery application use resumes.
7. The restored database must not be used to repopulate expired source Contents into Packet B or any long-lived research artifact.
8. PITR rotation remains 168 hours unless a separately reviewed change is recorded.
9. Scheduled backups remain off unless separately reviewed under the same recovery-only conditions.
10. Replica, object-store and application-log surfaces are not silently covered by this PITR determination; their own retention evidence remains separate.

## Determination

The seven-day PITR window is a recoverability surface, but under the recovery-only controls above it is not treated as active research retention. A destructive production restore drill is not necessary to establish this boundary and would create avoidable operational risk.

- reviewedRotationHours: **168**
- applicableAccountTermsAllowIncidentalBackup: **true under Article 5.8 published Terms path**
- routineMinimumNecessaryScopeVerified: **true**
- restrictedOperationalPurposeOnlyVerified: **true**
- noResearchOrTrainingReadVerified: **true**
- productionRestoreReplacesLiveDataVerified: **true**
- recoveryOnlyRestorePurposeVerified: **true**
- restoreQuarantineAndOriginalExpiryVerified: **true as an enforced procedure/control requirement**
- scheduledBackupsEnabled: **false**
- providerCalls: **0**
- databaseWrites: **0**
- phase6PaidGo: **false**

This is an engineering/compliance control review, not legal advice and not a provider-specific endorsement.
