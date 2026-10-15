# GitHub Actions Secret-Reveal Workflow — Security Closeout

> Date: 2026-09-23
> Classification: credential-exposure risk / infrastructure security
> GitHub Actions run: `35865747688`
> Source commit that introduced the workflow: `3907bdebf1173475f72f71228433337825360f81`
> Workflow removed from `main`: yes

## Finding

A workflow named `Reveal Environment Secrets` was added to the repository and manually dispatched.
Its commands attempted to print both `AERODATABOX_API_KEY` and `AERODATABOX_WEBHOOK_SECRET` with characters separated by spaces.

Separating characters can defeat ordinary exact-value log masking. No secret value is recorded in this document and the run logs
must not be copied into project evidence.

## Immediate containment

- The workflow file was removed from `main`.
- Do not recreate or rerun any workflow that prints, transforms for display, spaces, slices, hashes-for-display, or otherwise reveals secret values.
- Delete Actions run `35865747688` and its logs where possible.
- Treat both referenced credentials as potentially exposed even if the repository is private.

## Required credential rotation before Thursday

1. Rotate/reissue the AeroDataBox API key through the provider/subscription channel that issued it.
2. Generate a fresh high-entropy webhook secret rather than merely correcting the previously used value.
3. Update Replit and the GitHub `phase2g-paid` environment with the new values.
4. Never place the values in shell output, Markdown, Git commits, Actions output, screenshots, or chat.
5. Verify the new webhook secret only through the zero-credit cross-environment binding workflow.
6. Verify the API key only through provider read-only balance/subscription checks.
7. Keep provider mutation disabled until all readiness gates pass.

## Scientific impact

This is a credential-security issue, not scientific evidence. It does not change the P2G10 classification:
P2G10 remains infrastructure-invalid because its paid callback secret did not match the Replit receiver secret.

## Launch restriction

No Thursday paid run should be authorized while either potentially exposed credential remains unrotated.
