# Gate 3 App Storage platform capability checkpoint

Date reviewed: 2026-11-21 UTC  
Status: **retention custody remains OPEN. Phase 6 paid GO remains false.**

## Platform capability evidence

The current Replit App Storage documentation, under “Access and security,” states:

- Buckets are private to the project and public access prevention is enforced.
- A bucket cannot be attached across projects.
- App credentials allow object operations only.
- Bucket metadata and IAM-policy reads through `storage.buckets.get` and `getIamPolicy` are forbidden and return 403.
- App Storage does not support lifecycle rules, object versioning, or retention policies.

Source: https://docs.replit.com/features/data-and-storage/object-storage.md

The permitted owner UI observation is limited to the existing dedicated bucket binding at **Tools → Replit Cloud → App Storage → Settings**. Do not request unavailable bucket IAM or metadata reads.

## Gate 3 consequence

This platform evidence supports the project-private access boundary. It does not establish physical object deletion beyond the currently visible namespace, backend soft-delete behavior, provider retention, platform log retention, replica handling, or managed database custody.

Existing production V0107, primary and private expiry receipts, the accepted 168-hour recovery-only PITR control, and the completed visible-SQL and slot-classification observations remain the current evidence. The existing private-expiry runtime holds when a due item appears at its first read. Retention completion still needs the configured deadline and custody evidence described in the fixed eight-gate register.

No provider request, production database write, secret change, bucket change, lifecycle change, or paid GO occurred for this checkpoint.
