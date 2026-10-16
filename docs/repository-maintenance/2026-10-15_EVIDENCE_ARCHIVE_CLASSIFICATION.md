# Evidence and archive classification — October 15, 2026 (draft tree)

This **read-only metadata assessment** uses Git tree `4a4e8f8a962240fcb89325d877d142179f8afc3c` (untruncated). The original bytes were **not opened, rewritten, deleted, or reclassified**.

## Original machine-generated evidence

| Group | Files | Git tree blob bytes | Retention disposition |
|---|---:|---:|---|
| `database-baseline/` | 7 | 2,935,143 | Preserve original evidence; browse by index |
| `other/` | 15 | 274,285 | Preserve original evidence; browse by index |
| `phase2f/` | 180 | 197,993 | Preserve original evidence; browse by index |
| `phase2g/` | 150 | 413,357 | Preserve original evidence; browse by index |
| **Total** | **352** | **3,820,778** | **Retain** |

- Human explanations, incident reports, and amendments belong under [Phase 2G documents](../../data-collection/phase2g/README.md); **machine receipts** belong under [original artifacts](../../data-collection/evidence/ARTIFACTS_START_HERE.md). Similar names and matching bytes do not establish scientific interchangeability.
- [Original artifacts catalog](../../data-collection/evidence/artifacts-catalog.csv) and [full 460-source move record](manifests/2026-10-15_WAVEB_ACTUAL_460_BLOB_RELOCATION.csv) preserve provenance. The second link is relative to `docs/repository-maintenance/`, not this report folder.
- **32 signed historical authorization JSONs**, stored in `data-collection/authorizations/`, remain intact. Their presence or age does not authorize a new paid run.

## ZIP files — preserved, not adjudicated as duplicates

| Path | Size (bytes) | Original Git blob SHA |
|---|---:|---|
| `docs/history/legacy-replit-attachments/travnr-project_1771519817145.zip` | 584,612 | `05a72519f63510d24b15e078d086af6656468dae` |
| `docs/history/unreviewed-archives/zipFile.zip` | 34,226,449 | `114bdc2df7b78ffa36d4d4ad310b9b870075183d` |

These ZIP archives were not extracted, content-audited, malware-scanned, checked for personal data, or certified obsolete. The larger original historical root ZIP is expensive in Git terms but simple deletion would retain past commits; defer any storage-removal decision pending forensic review and backup policy.

## Empty historical placeholder

- `data-collection/history/zero-byte-audit-stubs/V3.9_Final_Document_Safety_Audit_2026-09-02.md`: **0 bytes**, Git SHA `e69de29bb2d1d6434b8b29ae775ad8c2e48c5391`, **placeholder only — not a completed safety audit**.

Preserve rather than erase the provenance mapping solely for aesthetic reasons. Its absence could break exact source inventory while saving no payload bytes.

## Recommended next actions

1. Continue using small [Study Hub](../../data-collection/STUDY_HUB.md) and [Folder Guide](../../data-collection/FOLDER_GUIDE.md) navigation to hide the operational complexity from a casual reader.
2. Independently review potentially obsolete ZIP contents in a controlled environment before proposing new Git storage layouts. Do not execute or publish unreviewed archive contents.
3. Check branch inventory in [branch retention audit](inventories/2026-10-15_BRANCH_RETENTION_AUDIT_SUMMARY.md), with separate operator approval for any deletion.
4. Never rewrite P25 history; retained YSSY P25 is **231 provider-billed / 229 received, FAILED/DELIVERY_GAP**. PR #36 scientific gate changes and published Replit parity are separate from folder cleanup.

**No provider spend, production deployment, Replit Agent, SQL or object store mutations.**
