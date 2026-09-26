/**
 * V3.9-f.8 §9.1 physical-flight Stage-1/2 metric contract.
 *
 * Legacy prepaid probes created before this contract remain preserved as
 * historical evidence, but they must not be mixed with physical-flight
 * metrics for Stage-2 promotion or yield-reference normalization.
 */
export const PREPAID_PROBE_METRIC_CONTRACT_V39 =
  "v39-physical-flight-instance-v2" as const;
