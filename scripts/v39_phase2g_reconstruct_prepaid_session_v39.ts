import { createHash } from "crypto";
import { v39Pool as pool } from "../server/lib/disruption/db_v39";
import { createRequiredProviderBlobStoreV39 } from "../server/lib/disruption/replitProviderBlobStore_v39";

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function arg(name: string): string | null {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? String(process.argv[i + 1]).trim() : null;
}

function numberOrNull(value: unknown): number | null {
  const n = Number(value);
  return value !== null && value !== undefined && value !== "" && Number.isFinite(n) ? n : null;
}

function flightsFrom(body: any): any[] {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.flights)) return body.flights;
  return [];
}

function deliveryCost(body: any): number | null {
  return numberOrNull(body?.deliveryAttempt?.costCredits ?? body?.delivery?.attempt?.costCredits ?? body?.deliveryAttemptCostCredits);
}

function balanceRemaining(body: any): number | null {
  return numberOrNull(body?.balance?.creditsRemaining);
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`).join(",")}}`;
}

function runtimeFlightKey(flight: any): string | null {
  const number = stringOrNull(flight?.number);
  const providerId = stringOrNull(flight?.id);
  const depIcao = stringOrNull(flight?.departure?.airport?.icao)?.toUpperCase() ?? null;
  const arrIcao = stringOrNull(flight?.arrival?.airport?.icao)?.toUpperCase() ?? null;
  const depScheduled = stringOrNull(flight?.departure?.scheduledTime?.utc);
  const callsign = stringOrNull(flight?.callSign);
  if (!number && !providerId && !callsign) return null;
  return createHash("sha256").update(canonical({ number, providerId, depIcao, arrIcao, depScheduled, callsign })).digest("hex");
}

async function main(): Promise<void> {
  const session = arg("--session");
  const externalRaw = arg("--external-credits");
  const externalCredits = externalRaw === null ? null : Number(externalRaw);
  if (!session) throw new Error("USAGE: --session <uuid> [--external-credits <integer>]");
  if (externalCredits !== null && (!Number.isInteger(externalCredits) || externalCredits < 0)) {
    throw new Error("EXTERNAL_CREDITS_MUST_BE_NONNEGATIVE_INTEGER");
  }

  const refs = await pool.query(
    `SELECT blob_ref_id,object_name,content_sha256,content_bytes,persisted_at_utc,
            expires_at_utc,deletion_verified_at_utc,source_record_id
       FROM clean.provider_content_blob_ref
      WHERE source_kind='webhook' AND source_record_id LIKE $1
      ORDER BY persisted_at_utc,blob_ref_id`,
    [`prepaid:${session}:%`],
  );

  const store = createRequiredProviderBlobStoreV39();
  let payloads = 0;
  let totalBytes = 0;
  let totalItems = 0;
  let costCreditsPresent = 0;
  let costCreditsMissing = 0;
  let sumExplicitCostCredits = 0;
  let internalSendCredits = 0;
  let shaVerified = 0;
  let duplicateBodyHashes = 0;
  let itemCreditDisagreements = 0;
  const bodyHashes = new Set<string>();
  const balances: number[] = [];
  const payloadSummaries: Array<Record<string, unknown>> = [];
  const distinctFlightNumbers = new Set<string>();
  const distinctRuntimeFlightKeys = new Set<string>();
  const distinctAircraftRegs = new Set<string>();
  const operatorFlightNumbers = new Set<string>();
  const ambiguousFlightNumbers = new Set<string>();
  const flightsByAircraftReg = new Map<string, Set<string>>();
  let payloadsWithZeroItems = 0;
  let maxItemsInPayload = 0;

  for (const row of refs.rows) {
    if (row.deletion_verified_at_utc) {
      payloadSummaries.push({
        persistedAtUtc: new Date(row.persisted_at_utc).toISOString(),
        contentBytes: Number(row.content_bytes),
        deleted: true,
      });
      continue;
    }
    const bytes = await store.downloadBytes(String(row.object_name));
    const actualSha = sha256(bytes);
    const expectedSha = String(row.content_sha256);
    if (actualSha !== expectedSha) throw new Error(`BLOB_SHA_MISMATCH:${row.blob_ref_id}`);
    shaVerified += 1;
    const text = Buffer.from(bytes).toString("utf8");
    const body = JSON.parse(text);
    const flights = flightsFrom(body);
    const cost = deliveryCost(body);
    const bal = balanceRemaining(body);
    if (bal !== null) balances.push(bal);
    payloads += 1;
    totalBytes += bytes.byteLength;
    totalItems += flights.length;
    if (flights.length === 0) payloadsWithZeroItems += 1;
    maxItemsInPayload = Math.max(maxItemsInPayload, flights.length);
    for (const flight of flights) {
      const number = stringOrNull(flight?.number);
      const reg = stringOrNull(flight?.aircraft?.reg);
      const codeshare = flight?.codeshareStatus;
      const key = runtimeFlightKey(flight);
      if (number) distinctFlightNumbers.add(number);
      if (key) distinctRuntimeFlightKeys.add(key);
      if (reg) {
        distinctAircraftRegs.add(reg);
        if (number) {
          const set = flightsByAircraftReg.get(reg) ?? new Set<string>();
          set.add(number);
          flightsByAircraftReg.set(reg, set);
        }
      }
      if (number && (codeshare === "IsOperator" || codeshare === 1)) operatorFlightNumbers.add(number);
      if (number && (codeshare === null || codeshare === undefined || codeshare === "Unknown" || codeshare === 0)) {
        ambiguousFlightNumbers.add(number);
      }
    }
    if (bodyHashes.has(actualSha)) duplicateBodyHashes += 1;
    bodyHashes.add(actualSha);
    if (cost === null) {
      costCreditsMissing += 1;
      internalSendCredits += flights.length;
    } else {
      costCreditsPresent += 1;
      sumExplicitCostCredits += cost;
      internalSendCredits += cost;
      if (cost !== flights.length) itemCreditDisagreements += 1;
    }
    payloadSummaries.push({
      persistedAtUtc: new Date(row.persisted_at_utc).toISOString(),
      contentBytes: bytes.byteLength,
      flightItems: flights.length,
      costCredits: cost,
      balanceCreditsRemaining: bal,
      notificationIdPresent: Boolean(body?.id ?? body?.notification?.id),
      attemptSeqNo: body?.deliveryAttempt?.seqNo ?? body?.delivery?.attempt?.seqNo ?? null,
      deleted: false,
    });
  }

  const liveRefs = refs.rows.filter((r: any) => !r.deletion_verified_at_utc).length;
  let reconstructedTailChainLinks = 0;
  for (const flights of flightsByAircraftReg.values()) {
    reconstructedTailChainLinks += Math.max(flights.size - 1, 0);
  }
  const result = {
    schema: "v39.phase2g-prepaid-session-reconstruction.v1",
    providerCalled: false,
    providerMutation: false,
    databaseMutation: false,
    sessionId: session,
    metadataRefs: refs.rowCount,
    liveRefs,
    payloadsReconstructed: payloads,
    shaVerified,
    totalPersistedBytes: totalBytes,
    totalFlightItems: totalItems,
    payloadsWithZeroFlightItems: payloadsWithZeroItems,
    maxFlightItemsInOnePayload: maxItemsInPayload,
    distinctFlightNumbers: distinctFlightNumbers.size,
    distinctRuntimeFlightKeys: distinctRuntimeFlightKeys.size,
    distinctAircraftRegistrations: distinctAircraftRegs.size,
    confirmedOperatorFlightNumbers: operatorFlightNumbers.size,
    ambiguousUnknownFlightNumbers: ambiguousFlightNumbers.size,
    reconstructedTailChainLinks,
    payloadsWithExplicitCostCredits: costCreditsPresent,
    payloadsUsingItemCountFallback: costCreditsMissing,
    sumExplicitCostCredits,
    productionRuleInternalSendCredits: internalSendCredits,
    duplicateBodyHashes,
    payloadsWhereCostCreditsDiffersFromFlightItems: itemCreditDisagreements,
    firstPayloadUtc: payloadSummaries.find((x) => x.deleted === false)?.persistedAtUtc ?? null,
    lastPayloadUtc: [...payloadSummaries].reverse().find((x) => x.deleted === false)?.persistedAtUtc ?? null,
    minEmbeddedBalance: balances.length ? Math.min(...balances) : null,
    maxEmbeddedBalance: balances.length ? Math.max(...balances) : null,
    externalCredits,
    reconciliationDeltaExternalMinusInternal: externalCredits === null ? null : externalCredits - internalSendCredits,
    exactReconciliationMatch: externalCredits === null ? null : externalCredits === internalSendCredits,
    payloadSummaries,
  };

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => undefined);
  });
