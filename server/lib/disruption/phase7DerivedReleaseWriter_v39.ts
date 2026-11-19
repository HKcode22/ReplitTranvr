import { randomUUID } from "node:crypto";
import {
  createPhase7DerivedReleasePacket,
  hashPhase7DerivedReleasePacket,
  serializePhase7DerivedReleasePacket,
  type Phase7DerivedReleasePacket,
} from "./phase6DerivedTrainingReleasePacket_v39";
import {
  PHASE6_DERIVED_RELEASE_NEVER_AUTHORIZES_PAID_GO,
  type Phase6ReleaseHorizon,
  type Phase7DerivedReleaseContract,
  type Phase7DerivedReleaseCensoring,
  type Phase7ReleaseSplit,
} from "./phase6DerivedTrainingReleaseContract_v39";

/**
 * Input accepted by the Phase 7 writer after an independently reviewed
 * transformation has removed source identity and exact source values.
 *
 * This is intentionally not a provider-row interface. A caller cannot pass a
 * flight number, timestamp, route, response, or source linkage and hope that
 * the writer will strip it later; exact keys are checked before a UUID is
 * generated or a packet is created.
 */
export interface Phase7ApprovedDerivedInput {
  horizon: Phase6ReleaseHorizon;
  cohortBucket: number;
  split: Phase7ReleaseSplit;
  featureBuckets: Record<string, number | null>;
  labelBuckets: Record<string, number | null>;
  missingness: Record<string, boolean>;
  qualityFlags: number;
  censoring: Phase7DerivedReleaseCensoring;
}

export interface Phase7DerivedReleaseSink {
  put(key: string, bytes: string): Promise<void> | void;
}

export interface Phase7DerivedReleaseWriteReceipt {
  schema: "v39.phase7.derived-release-write-receipt.v1";
  packetId: string;
  packetSha256: string;
  rowCount: number;
  sinkKey?: string;
  sourceArchive: false;
  sourceRightsApproved: false;
  authorizationEnabled: false;
  phase6PaidGo: false;
}

const INPUT_KEYS = [
  "horizon", "cohortBucket", "split", "featureBuckets", "labelBuckets",
  "missingness", "qualityFlags", "censoring",
] as const;
const SAFE_SINK_KEY = /^phase7\/derived\/v[0-9a-z_-]{1,40}\/packet-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.json$/i;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

function assertApprovedInput(value: unknown, index: number): asserts value is Phase7ApprovedDerivedInput {
  if (!isPlainRecord(value) || !exactKeys(value, INPUT_KEYS)) {
    throw new Error(`PHASE7_DERIVED_WRITER_REJECTED:input-${index}-must-be-exact-approved-derived-shape`);
  }
}

/**
 * Build a packet from already-approved bucketed values. This function is
 * deliberately synchronous and side-effect free: it does not read a source
 * table, call a provider, change retention, or enable Phase 6.
 */
export function buildPhase7DerivedReleasePacket(
  contract: Phase7DerivedReleaseContract,
  inputs: readonly Phase7ApprovedDerivedInput[],
  packetId = randomUUID(),
): Phase7DerivedReleasePacket {
  if (!Array.isArray(inputs) || inputs.length === 0) {
    throw new Error("PHASE7_DERIVED_WRITER_REJECTED:no-approved-derived-inputs");
  }
  const rows = inputs.map((input, index) => {
    assertApprovedInput(input, index);
    return {
      releaseRowId: randomUUID(),
      horizon: input.horizon,
      cohortBucket: input.cohortBucket,
      split: input.split,
      featureBuckets: { ...input.featureBuckets },
      labelBuckets: { ...input.labelBuckets },
      missingness: { ...input.missingness },
      qualityFlags: input.qualityFlags,
      censoring: input.censoring,
    };
  });
  return createPhase7DerivedReleasePacket(contract, rows, packetId);
}

/**
 * Emit only canonical derived packet bytes to an explicitly supplied sink.
 * The sink key is packet-local and contains no provider or study identity.
 * Persistence remains caller-owned and this helper never writes the source
 * database or any retention/authorization table.
 */
export async function writePhase7DerivedReleasePacket(
  contract: Phase7DerivedReleaseContract,
  inputs: readonly Phase7ApprovedDerivedInput[],
  sink: Phase7DerivedReleaseSink,
  packetId = randomUUID(),
): Promise<Phase7DerivedReleaseWriteReceipt> {
  const packet = buildPhase7DerivedReleasePacket(contract, inputs, packetId);
  const bytes = serializePhase7DerivedReleasePacket(contract, packet);
  const sinkKey = `phase7/derived/${contract.version}/packet-${packet.packetId}.json`;
  if (!SAFE_SINK_KEY.test(sinkKey)) throw new Error("PHASE7_DERIVED_WRITER_REJECTED:unsafe-sink-key");
  await sink.put(sinkKey, bytes);
  return {
    schema: "v39.phase7.derived-release-write-receipt.v1",
    packetId: packet.packetId,
    packetSha256: hashPhase7DerivedReleasePacket(packet),
    rowCount: packet.rows.length,
    sinkKey,
    ...PHASE6_DERIVED_RELEASE_NEVER_AUTHORIZES_PAID_GO,
    sourceArchive: false,
  };
}

