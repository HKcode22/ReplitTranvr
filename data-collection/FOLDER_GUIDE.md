# Folder Guide — scientific reports are not raw machine evidence

This map explains the **existing physical folder structure**, not a scientific data deletion or reclassification.

| Folder | Purpose | Read it when |
|---|---|---|
| [`plans/`](plans/README.md) | Scientific V3.9 Plan and older plan references | Defining the experiment |
| [`implementation/`](implementation/README.md) | Original V3.9 Log | Implementing or reviewing progress |
| [`phase2g/`](phase2g/README.md) | **Human-written** Phase 2G reports, runbooks, incidents and amendments | Understanding what happened |
| [`evidence/ledgers/`](evidence/README.md) | Original pilot/run ledgers | Verifying historical decisions |
| [`evidence/original-artifacts/`](evidence/ARTIFACTS_START_HERE.md) | **352 machine-record files**: Phase 2F (180), Phase 2G (150), DB baseline (7), other/preprobe (15) | Recovering frozen receipts by index |
| [`authorizations/`](authorizations/README.md) | 32 old signed AUTH JSON artifacts | Auditing historical approvals, never for authorization reuse |
| [`history/`](history/zero-byte-audit-stubs/V3.9_Final_Document_Safety_Audit_2026-09-02.md) | One 0-byte historic audit placeholder | Historical existence only |
| [`../docs/history/`](../docs/history/README.md) | Older app, screenshots and unrelated prior project documentation | Understanding older application history |
| [`analysis/`](analysis/README.md) | Offline standalone research calculations | Reproducing non-production arithmetic |

## Why Phase 2G appears twice

`data-collection/phase2g/` stores **documents written to explain methods and decisions**; `data-collection/evidence/original-artifacts/phase2g/` stores **machine-generated receipts and freeze artifacts**. They share a phase, not necessarily duplicate content. The evidence `other/` name preserves a historical machine-artifact bucket; [the actual categorized index](evidence/artifact-index/other.md) is more useful than browsing filenames directly.

## Why not delete authorization records?

Together the **32 original JSON authorization files occupy roughly 31 KiB**. Their dates, scope and original cryptographic identity can matter when reconstructing past operations and failed trials. None currently authorizes a new paid operation merely by existing on GitHub.

## Why preserve the zero-byte stub?

[`V3.9_Final_Document_Safety_Audit_2026-09-02.md`](history/zero-byte-audit-stubs/V3.9_Final_Document_Safety_Audit_2026-09-02.md) is **empty**, Git blob `e69de29bb2d1d6434b8b29ae775ad8c2e48c5391`; it **does not** contain or prove a completed audit. It is part of the earlier 108-source preservation mapping. Keeping the original in place costs zero content bytes and avoids silently invalidating path-based evidence checks.

**YSSY P25** remains **231 provider-billed / 229 received, failed/DELIVERY_GAP**. Navigation or mathematical screening never reverses that outcome.

[Study Hub](STUDY_HUB.md) · [Original artifact catalog](evidence/artifacts-catalog.csv)
