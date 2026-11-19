import { createHash, randomUUID } from "node:crypto";
import {
  PHASE6_DERIVED_RELEASE_NEVER_AUTHORIZES_PAID_GO,
  validatePhase7DerivedReleaseContract,
  validatePhase7DerivedReleaseRow,
  type Phase7DerivedReleaseContract,
  type Phase7DerivedReleaseRow,
} from "./phase6DerivedTrainingReleaseContract_v39";

export const PHASE7_DERIVED_RELEASE_PACKET_SCHEMA = "v39.phase6.phase7-derived-release-packet.v1" as const;
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_ROWS = 100_000;

export interface Phase7DerivedReleasePacket {
  schema: typeof PHASE7_DERIVED_RELEASE_PACKET_SCHEMA;
  packetId: string;
  contractVersion: string;
  featureDictionarySha256: string;
  rows: readonly Phase7DerivedReleaseRow[];
}

export interface Phase7DerivedReleasePacketVerdict {
  pass: boolean;
  failures: string[];
  rowCount: number;
  packetSha256?: string;
}

function canonical(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${canonical(record[key])}`).join(",")}}`;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const keys = [...expected].sort();
  return actual.length === keys.length && actual.every((key, index) => key === keys[index]);
}

/** Generate a fresh packet row ID; no provider identity is accepted here. */
export function newPhase7ReleaseRowId(): string {
  return randomUUID();
}

/**
 * Create a packet only after validating every row. This is the second product
 * beside source custody: it is a derived release candidate, not a duplicate
 * source archive and not a collector or database writer.
 */
export function createPhase7DerivedReleasePacket(
  contract: Phase7DerivedReleaseContract,
  rows: readonly Phase7DerivedReleaseRow[],
  packetId = randomUUID(),
): Phase7DerivedReleasePacket {
  const packet: Phase7DerivedReleasePacket = {
    schema: PHASE7_DERIVED_RELEASE_PACKET_SCHEMA,
    packetId,
    contractVersion: contract.version,
    featureDictionarySha256: contract.featureDictionarySha256,
    rows: [...rows],
  };
  const verdict = validatePhase7DerivedReleasePacket(contract, packet);
  if (!verdict.pass) throw new Error(`PHASE7_DERIVED_RELEASE_PACKET_REJECTED:${verdict.failures.slice(0, 8).join(",")}`);
  return Object.freeze(packet);
}

/** Validate the packet boundary and protected grouped split assignment. */
export function validatePhase7DerivedReleasePacket(
  contract: Phase7DerivedReleaseContract,
  packet: Phase7DerivedReleasePacket,
): Phase7DerivedReleasePacketVerdict {
  const failures = [...validatePhase7DerivedReleaseContract(contract).failures];
  const rows = isPlainRecord(packet) && Array.isArray(packet.rows) ? packet.rows : [];
  if (!isPlainRecord(packet)) failures.push("packet-not-object");
  else if (!exactKeys(packet as Record<string, unknown>, ["schema", "packetId", "contractVersion", "featureDictionarySha256", "rows"])) failures.push("packet-extra-or-missing-keys");
  if (!isPlainRecord(packet) || packet.schema !== PHASE7_DERIVED_RELEASE_PACKET_SCHEMA) failures.push("packet-schema-invalid");
  if (!isPlainRecord(packet) || typeof packet.packetId !== "string" || !UUID_V4.test(packet.packetId)) failures.push("packet-id-not-random-uuid-v4");
  if (!isPlainRecord(packet) || packet.contractVersion !== contract.version) failures.push("packet-contract-version-mismatch");
  if (!isPlainRecord(packet) || packet.featureDictionarySha256 !== contract.featureDictionarySha256) failures.push("packet-feature-dictionary-mismatch");
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > MAX_ROWS) failures.push("packet-row-count-invalid");

  const ids = new Set<string>();
  const cohortSplits = new Map<number, string>();
  rows.forEach((row, index) => {
    const rowVerdict = validatePhase7DerivedReleaseRow(contract, row);
    for (const failure of rowVerdict.failures) failures.push(`row[${index}]:${failure}`);
    if (isPlainRecord(row)) {
      if (typeof row.releaseRowId === "string") {
        if (ids.has(row.releaseRowId)) failures.push(`duplicate-release-row-id:${row.releaseRowId}`);
        ids.add(row.releaseRowId);
      }
      if (typeof row.cohortBucket === "number" && typeof row.split === "string") {
        const prior = cohortSplits.get(row.cohortBucket);
        if (prior && prior !== row.split) failures.push(`cohort-crosses-split:${row.cohortBucket}`);
        else cohortSplits.set(row.cohortBucket, row.split);
      }
    }
  });

  const base: Phase7DerivedReleasePacketVerdict = {
    pass: failures.length === 0,
    failures: [...new Set(failures)].sort(),
    rowCount: rows.length,
  };
  if (base.pass) base.packetSha256 = hashPhase7DerivedReleasePacket(packet);
  return base;
}

/** Stable bytes make the packet reproducible without retaining source bytes. */
export function serializePhase7DerivedReleasePacket(
  contract: Phase7DerivedReleaseContract,
  packet: Phase7DerivedReleasePacket,
): string {
  const verdict = validatePhase7DerivedReleasePacket(contract, packet);
  if (!verdict.pass) throw new Error(`PHASE7_DERIVED_RELEASE_PACKET_NOT_SERIALIZABLE:${verdict.failures.slice(0, 8).join(",")}`);
  return canonical(packet);
}

export function hashPhase7DerivedReleasePacket(packet: Phase7DerivedReleasePacket): string {
  return createHash("sha256").update(canonical(packet), "utf8").digest("hex");
}

/** This packet never changes any source-retention or activation decision. */
export const PHASE7_DERIVED_PACKET_NO_SOURCE_ARCHIVE_OR_PAID_GO = Object.freeze({
  sourceArchive: false as const,
  sourceRetentionExtension: false as const,
  sourceRightsApproved: PHASE6_DERIVED_RELEASE_NEVER_AUTHORIZES_PAID_GO.sourceRightsApproved,
  authorizationEnabled: PHASE6_DERIVED_RELEASE_NEVER_AUTHORIZES_PAID_GO.authorizationEnabled,
  phase6PaidGo: PHASE6_DERIVED_RELEASE_NEVER_AUTHORIZES_PAID_GO.phase6PaidGo,
});
