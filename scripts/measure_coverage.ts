// Phase 2B — Gate 1 coverage (Plan §§4, 17 step 10; Log §1.7.2, §2.20).
//
// Thin wrapper over the gate1Coverage_v39 production owner. Uses the pinned
// FREE health/coverage endpoints only: no FIDS, no refill, no subscription
// mutation, no probe. Writes artifacts/gate1-coverage.json.
//
// Usage:
//   npm run v39:gate1:coverage -- --auth AUTH-YYYYMMDD-G1 \
//     --auth-file <record.json> --evidence-id GATE-1-YYYYMMDD-001
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";
import { listFeedAirports, type FeedService } from "../server/lib/disruption/aerodataboxLimiter_v3";
import { allCatalogAirports } from "../server/lib/disruption/adbAirportCatalog_v3";
import {
  buildGate1CoverageArtifact,
  COVERAGE_SERVICES,
  GATE1_PHASE_GATE,
  serializeGate1Artifact,
  type CoverageService,
  type Gate1CoverageArtifact,
} from "../server/lib/disruption/gate1Coverage_v39";
import { parseArgs, verifyAuthFile } from "./v39_paid_guard_v39";

export interface Gate1CoverageReader {
  listFeedAirports(service: FeedService): Promise<string[] | null>;
  catalogIcaos(): string[];
  providerPin(): string;
}

type AuthVerifier = (authFile: string, phaseGate: string, auth: string) => boolean;

export async function runGate1Coverage(
  argv: string[],
  reader: Gate1CoverageReader = {
    listFeedAirports,
    catalogIcaos: allCatalogAirports,
    providerPin: () => "aerodatabox.p.rapidapi.com/health:v1",
  },
  authorize: AuthVerifier = (file, phaseGate, auth) => {
    const checked = verifyAuthFile(file, phaseGate);
    return !("error" in checked) && checked.verdict.verified && checked.record.authorizationId === auth;
  },
  writeArtifact: (text: string) => void = (text) => {
    mkdirSync(join(process.cwd(), "artifacts"), { recursive: true });
    writeFileSync(join(process.cwd(), "artifacts", "gate1-coverage.json"), text);
  },
): Promise<Gate1CoverageArtifact> {
  const { auth, authFile, evidenceId } = parseArgs(argv);
  if (!auth || !/^AUTH-\d{8}-[A-Z0-9]+$/.test(auth)) throw new Error("REFUSED: valid --auth is required");
  if (!authFile) throw new Error("REFUSED: --auth-file is required");
  if (!evidenceId || !/^GATE-1-\d{8}-[A-Z0-9]+$/.test(evidenceId)) throw new Error("REFUSED: valid --evidence-id is required");

  // Authorization is established before touching the provider.
  if (!authorize(authFile, GATE1_PHASE_GATE, auth)) throw new Error("REFUSED: AUTH verification failed");

  const feeds = {} as Record<CoverageService, { airports: string[] } | null>;
  for (const service of COVERAGE_SERVICES) {
    const airports = await reader.listFeedAirports(service);
    feeds[service] = airports ? { airports } : null;
  }
  const artifact = buildGate1CoverageArtifact(
    {
      feeds,
      catalogIcaos: reader.catalogIcaos(),
      fetchedAtUtc: new Date().toISOString(),
      providerPin: reader.providerPin(),
    },
    { evidenceId, authorizationId: auth },
  );
  if (artifact.status !== "PASS") throw new Error(`BLOCKED: Gate-1 coverage unavailable (${artifact.reasons.join(",")})`);
  writeArtifact(serializeGate1Artifact(artifact));
  return artifact;
}

export async function main(argv = process.argv.slice(2)): Promise<number> {
  try {
    const artifact = await runGate1Coverage(argv);
    process.stdout.write(serializeGate1Artifact(artifact));
    return 0;
  } catch (error: any) {
    const message = String(error?.message ?? error);
    console.error(message.startsWith("REFUSED:") || message.startsWith("BLOCKED:") ? message : "BLOCKED: Gate-1 coverage could not be established");
    return 2;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main().then((code) => { process.exitCode = code; });
