# Phase 5 remaining-items closeout and Nov 22 release rebind review

**Date:** 2026-11-19 UTC  
**Status:** successor review record; paid Phase 6 remains STOP/NO-GO.  
**Scope:** exact source-use decision, source-to-PRE/POST label validation, backup/PITR lifecycle, final authorization, fresh scheduler epoch, and Day-1 readback.

This record is intentionally on the isolated successor branch
\`work/phase6-policy-aligned-successor-20261119\`. It does not alter the frozen
predecessor, main, the production database, secrets, scheduler variables, or
the approval ledger.

## 1. Immutable predecessor and proposed date

The original Phase 5/Phase 6 package remains preserved byte-for-byte:

- predecessor main: \`88a065458537aa5e1a0055dec82b7bf81b0c00eb\`;
- archive: \`archive/phase6-original-frozen-88a06545\`;
- manifest SHA-256: \`bd14ff3e558b975a889741380da807644ca9d3573a23e2416986ee6f71e1e41f\`;
- config SHA-256: \`9cb7f3dcb2ee0d857f585fe8433a8dc2b7ac7bb3e3ad384a469c13530856642c\`;
- calendar SHA-256: \`7125264304fe658028d54eb95b5e18b243a1d66100c9d1620d0d93c419c7077c\`;
- geometry: 31 planned days, 6,144 templates, 37,388 reserved REST units;
- horizons: T-24h, T-6h, T-90m; PRE/POST separation remains intact.

The current main calendar is still the Nov 21 service-start plan. Its first Day-1
source request is scheduled for **2026-11-19 23:45:00Z**, with the previously
reviewed strict authorization cutoff at **2026-11-19 23:10:00Z**. That window
must not be treated as available merely because the code exists.

The deterministic successor candidate is a **+24-hour review rebind**:

| Item | Current main plan | Review-only candidate |
| --- | --- | --- |
| Day-1 service start | 2026-11-21 00:00Z | 2026-11-22 00:00Z |
| first Day-1 source request | 2026-11-19 23:45Z | 2026-11-20 23:45Z |
| strict authorization cutoff | 2026-11-19 23:10Z | 2026-11-20 23:10Z |
| Day-31 service start | 2026-12-24 00:00Z | 2026-12-25 00:00Z |
| templates/day | 192 | 192 |
| total planned templates | 6,144 | 6,144 |
| reserved REST units | 37,388 | 37,388 |

The rebind helper and tests shift every UTC schedule field exactly one whole day,
while preserving query keys, slots, horizons, draw type, counts, cost
arithmetic, and review metadata. It is not wired into production and does not
create authorization. Main has not been shifted.

## 2. Exact AeroDataBox permitted-use decision

The official AeroDataBox Terms define API-returned data broadly: copies,
extracts, reformattings, compilations, and identifiable portions remain
“Contents.” The current published rule permits caching only for the immediate
operational purpose, requires deletion when that purpose is fulfilled, and
sets the maximum at the greater of seven calendar days, a response
\`Cache-Control: max-age\`, an explicitly longer Plan Term, a legal term, or
the specifically listed Article 5.8 categories.

The same Terms define a Derived Work narrowly: independent non-trivial
processing from multiple observations or substantial independent data, original
analysis/computed values, and no reasonable ability to identify or reconstruct
an individual Contents record. The Terms exclude the ordinary caching rule for
a qualifying Derived Work, but that does not automatically make a copied
per-flight row, exact timestamp, route, carrier, label, hash, or normalized
provider record a Derived Work.

The project decision is therefore:

| Data/use | Successor disposition |
| --- | --- |
| Raw FIDS/provider response, request/response envelope, provider IDs, source linkage | short-lived source custody; project-controlled 24-hour maximum; hard clear |
| Exact source-linked route, airport, carrier, schedule/revision, timestamp, PRE, POST, or outcome row | scientifically preserved as a candidate input, but **not approved for long-term retention** by internal documentation |
| Airport/airline/aircraft reference identifiers | may be considered only for the narrow Article 5.8 identifying/linking/retrieval purpose; a compiled substitute for the service is not approved |
| Non-reconstructable aggregate/statistical/model output | candidate Derived Work; requires field-level transformation record and independent review before writer enablement |
| Six-week/31-day exact per-flight source archive | **not approved** on the current evidence |
| Backup/PITR copy containing expired source content | unresolved until the recovery-surface deletion/restore behavior is evidenced |

This is not an attempt to override the provider. It is the exact conservative
decision that lets engineering continue without falsely recording
\`sourceRightsApproved=true\`. The existing approval ledger correctly remains
at 28 evidence entries and **zero approvals**.

A follow-up email draft remains in the existing Gmail thread and asks for the
account-specific answer covering: legacy RapidAPI Ultra terms, linked
per-flight PRE/POST retention, exact timestamps/routes/carriers, Derived Work
outputs, and database backup/PITR copies. A fresh search on 2026-11-19 found
sent messages and the draft but no AeroDataBox reply.

## 3. Source-to-PRE/POST and label validation

The engineering contract preserves all required scientific fields, including
route, airport, carrier, schedule, timestamps, PRE, POST, gate-out,
wheels-off, wheels-on, gate-in, cancellation, diversion, and censoring state.
The successor does not delete or ban them.

What is still absent is **real prospective evidence**:

- an authentic paid source observation;
- a source-bound PRE record at the declared cutoff;
- a source-bound POST/physical observation;
- an independently attested outcome/label;
- reconciliation proving the same operating leg was used without leakage;
- an expiry/readback receipt for the source linkage.

The read-only diagnostic found no recent collection batches, webhook receipts,
semantic events, outcomes, or source reservations. Therefore no synthetic test
or planning document can close this item. The existing offline and disposable
database tests prove safety behavior only; they do not prove label validity.

## 4. Backup and PITR lifecycle

Observed owner-side state:

- Replit-attached external Neon database;
- point-in-time recovery shown enabled with a seven-day window;
- scheduled backups shown **Off**;
- no restore drill performed;
- no evidence that every provider/object/log/backup surface applies the same
  source expiry and purge behavior.

Consequently, the database has a useful recovery control but the backup
lifecycle is not certified for this source-use plan. A PITR window is not proof
that restored provider-linked bytes are deleted at the project expiry boundary.

Before paid activation, the owner-side backup decision must record one of these
two safe outcomes:

1. a provider-compatible backup policy plus a tested restore/reaper procedure
   that deletes/quarantines expired source custody before any research read; or
2. a deliberate no-backup/short-recovery configuration for provider-linked
   source custody, with independent project metadata and approved derived
   artifacts handled under their own lifecycle.

Do not blindly turn on scheduled backups: that could create an additional
retention surface before its provider compatibility is known. The existing
PITR observation is retained as evidence, but it is not a completed restore
certification.

## 5. Final authorization, fresh scheduler epoch, and Day-1 readback

These are separate runtime gates and remain intentionally uncreated:

- approval-ledger approvals: **0**;
- source-rights approval: **false**;
- authorization enabled: **false**;
- paid GO: **false**;
- provider calls: **0**;
- production database writes: **0**;
- current direct scheduler epoch: expired by design;
- Day-1 readback: pending because no paid Day-1 run has occurred.

After the rights, recovery-surface, and real-label gates pass, the owner can
create a new signed release record bound to:

1. the exact successor manifest/config/calendar hashes;
2. the exact field disposition and derived-release contract;
3. the backup/PITR evidence and expiry procedure;
4. the real PRE/POST/label receipt;
5. the fresh scheduler epoch and strict cutoff;
6. the owner approval ledger entry.

Only then may an unattended workflow be enabled. The first Day-1 readback
must reconcile the expected 192 templates across four slots and three horizons,
the observed schedule/cutoff times, provider attempt/result counters, source
expiry receipts, database writes, and backup/recovery evidence. A successful
prearm clock test alone is not that readback.

## 6. Closeout disposition

Engineering that can be safely completed without source use is now represented
on this successor branch:

- policy-aligned field inventory and retention contract;
- derived Phase 7 release contract and rejection tests;
- deterministic +24-hour schedule rebind helper and tests;
- this cross-workstream closeout record.

The original frozen package is preserved. The soonest honest activation target
is the **Nov 22 service-start candidate**, subject to the exact gates above.
The current state is not “Phase 6 ready to run”; it is “Phase 5 engineering
successor prepared, with external-rights, backup/recovery, real-label, and
fresh-runtime evidence still required.” No Replit shell command can manufacture
those missing facts, and no paid provider call should be started until they are
real and recorded.
