# Phase 2G Prospective Hardening — Runtime/AUTH Protected-Source Binding

**Frozen before:** MMUN-v2 corrected-contract Stage-1 paid run  
**Date:** 2026-09-30  
**Effect on scientific scoring:** none  
**Effect on candidate order:** none  
**Effect on provider budget:** none  
**Purpose:** cryptographically bind newly approved paid runs to the exact protected executable source while still permitting evidence-only runtime/AUTH commits after the source freeze.

## Finding

Paid execution already required an explicit workflow `expected_head` and live Replit runtime HEAD check. The Gate-2 runtime/AUTH, however, did not independently bind the protected executable source.

An initial hardening attempt bound `sourceGitHead` directly and required it to equal the eventual execution commit. That is self-referential: creating and committing the runtime/AUTH necessarily creates a descendant commit. The design was corrected before any MMUN runtime or AUTH was created.

This issue does not affect prior accepted WSSS-v2 or OMAA-v2 evidence.

## Corrected source-freeze contract

Every newly generated Gate-2 runtime uses:

```text
version = v39-gate2-runtime-2
sourceGitHead = <exact commit at runtime freeze>
sourceProtectedTreeSha256 = SHA256(git ls-tree -r sourceGitHead -- protected paths)
```

Protected paths are:

```text
server
scripts
migrations
tests
.github/workflows
```

The fingerprint hashes Git's tracked blob/object listing and path names for those protected areas. Files under `artifacts/` and `SEPmd/` may subsequently be committed as evidence without changing the protected-source fingerprint.

## AUTH binding

The Stage-1 AUTH scope includes both:

```text
source_git_head=<source freeze commit>
source_protected_tree_sha256=<protected source fingerprint>
```

Because the runtime bytes are SHA-256 locked, and the AUTH bytes/scope are independently SHA-256 approved, the protected source fingerprint is transitively bound to human authorization.

## Paid preflight

Before any paid mutation, the paid preflight requires:

1. the checked-out execution commit equals workflow `expected_head`;
2. the runtime source commit is an ancestor of the execution commit;
3. the protected-source fingerprint recomputed at the runtime source commit equals the runtime's frozen fingerprint;
4. the protected-source fingerprint recomputed at the final execution commit equals the same frozen fingerprint;
5. the protected working tree is clean, including `.github/workflows`;
6. all existing candidate, budget, callback, provider, time-class, reconciliation, and authorization checks still pass.

Therefore evidence-only descendant commits are allowed, while any change to executable source, migrations, tests, or workflow definitions after runtime freeze causes paid preflight refusal.

## Live callback binding

The final execution commit can include the runtime/AUTH evidence files. The same-app callback safety chain still independently requires the live Replit managed runtime to report that **final execution commit** exactly through the zero-credit binding and paid preflight.

The effective chain is:

```text
runtime source commit
  -> protected-source fingerprint
  -> runtime SHA
  -> AUTH scope + AUTH SHA
  -> evidence-only descendant execution commit
  -> same protected-source fingerprint
  -> GitHub checkout exact execution commit
  -> live Replit runtime exact execution commit
```

## Backward compatibility

Historical `v39-gate2-runtime-1` artifacts remain readable as historical evidence. Newly paid Phase-2G runs must use a v2 runtime containing both source bindings.

## MMUN-v2 rule

MMUN runtime/AUTH must be created only after this corrected hardening passes the targeted and full offline suites.

After the MMUN runtime is frozen, only evidence/documentation/artifact commits outside the protected paths may occur under that authorization chain. Any protected-source change requires a new runtime, new runtime SHA, new AUTH bytes/SHA, renewed approval, and fresh final callback binding before paid execution.
