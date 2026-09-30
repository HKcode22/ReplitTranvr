# Phase 2G Prospective Hardening — Runtime/AUTH Source-HEAD Binding

**Frozen before:** MMUN-v2 corrected-contract Stage-1 paid run  
**Date:** 2026-09-30  
**Effect on scientific scoring:** none  
**Effect on candidate order:** none  
**Effect on provider budget:** none  
**Purpose:** bind the exact executable source commit into newly generated Gate-2 runtime evidence and therefore into the approved Stage-1 AUTH scope.

## Finding

Before this hardening, paid execution still checked an explicit workflow `expected_head` and checked the live callback runtime HEAD, but the Gate-2 runtime JSON and Stage-1 AUTH scope did not themselves contain the exact Git commit.

That meant source provenance depended on an operator-supplied workflow input remaining consistent with the separately approved runtime/AUTH.

This did not invalidate prior accepted WSSS-v2 or OMAA-v2 runs because their execution commits are independently recorded with complete terminal evidence. It is nevertheless a prospective authorization/provenance weakness worth closing before MMUN-v2.

## New contract

Every newly generated Gate-2 runtime is now:

```text
version = v39-gate2-runtime-2
sourceGitHead = <exact 40-hex git rev-parse HEAD>
```

The runtime bytes are SHA-256 locked as before, so the source HEAD is transitively bound into the runtime file SHA and Gate-2 binding evidence.

The Stage-1 authorization scope also includes:

```text
source_git_head=<exact runtime-bound commit>
```

Therefore human approval of the exact AUTH SHA approves a scope that explicitly names the executable source commit.

## Paid preflight

The paid preflight now refuses when:

```text
runtime_source_git_head_missing
```

or:

```text
runtime_source_git_head_mismatch:<runtime-head>
```

unless the runtime-bound source HEAD exactly equals workflow `expected_head`.

The existing GitHub workflow still checks out that exact `expected_head`, and same-app callback contingency still requires the live Replit runtime to report that same HEAD.

The effective chain is therefore:

```text
approved AUTH SHA
 -> runtime file SHA
 -> runtime sourceGitHead
 -> workflow expected_head
 -> GitHub checkout HEAD
 -> live Replit callback HEAD
```

before provider mutation.

## Backward compatibility

Historical `v39-gate2-runtime-1` artifacts remain readable. Their Stage-1 AUTH scope remains unchanged when `sourceGitHead` is absent.

They are historical evidence only and cannot pass the newly hardened paid preflight for a new paid run because the preflight requires a runtime-bound source HEAD.

## MMUN-v2 rule

Create MMUN runtime and AUTH only after this hardening is synced and the static suite passes.

After MMUN runtime creation, no executable-source change may be used under that AUTH. A code change requires a newly generated runtime, new runtime SHA, new AUTH bytes/SHA, and renewed exact approval before paid execution.
