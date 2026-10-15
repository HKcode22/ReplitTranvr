# Phase 2G Physical-Flight Identity Metric Correction

Date: 2026-09-25

## Status

This amendment records a prospective scientific correction to the V3.9 Phase-2G prepaid Stage-1/Stage-2 metric implementation.

The experiment protocol requires distinct physical flight instances, bounded unresolved identity, and compatible verified tail-chain links. The legacy prepaid implementation instead used flight-number/runtime-key proxies for portions of Stage-1 scientific metrics.

## Correction

All new prepaid probes after this amendment use metric contract:

`v39-physical-flight-instance-v1`

The corrected implementation:

- resolves confirmed operating records to canonical physical `flight_instance_id`;
- does not count marketing codeshares as separate physical legs;
- preserves unresolved identity through lower/upper bounds;
- deduplicates repeated updates to the same physical flight;
- computes first observations from canonical physical identities;
- computes tail-chain links only from confirmed compatible physical legs with stable verified registration and the frozen six-hour turnaround rule.

## Historical evidence

Existing completed WSSS and OMAA probes are preserved exactly as historical operational evidence.

Their `metric_contract_version` remains `NULL`.

They MUST NOT be backfilled with the corrected metric version and MUST NOT be mixed with `v39-physical-flight-instance-v1` evidence for Stage-2 promotion or corrected anchor-yield normalization.

Their transient provider payloads were purpose-deleted under the frozen retention/cleanup protocol, so corrected physical-flight metrics cannot be reconstructed exactly from those historical runs.

## MMUN

Historical MMUN probe 3 remains an infrastructure-invalid attempt:

- status: failed
- duration censored: true
- reconciliation: UNRESOLVED
- stop reason: `supervisor_child_exit_after_runtime_reset_recovered`

The frozen Stage-1 rerun rule therefore permits exactly one controlled MMUN rerun.

That rerun must use `v39-physical-flight-instance-v1`.

## Promotion safety

Stage-1/Stage-2 promotion now fails closed unless evidence carries the corrected metric contract.

Stage 2 remains blocked until scientifically comparable corrected Stage-1 evidence satisfies the frozen promotion protocol.

No historical probe row is deleted, rewritten, or reclassified by this amendment.
