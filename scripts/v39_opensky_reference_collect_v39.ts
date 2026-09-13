/**
 * OFFLINE/RESEARCH-REFERENCE ONLY.
 *
 * Resumable OpenSky /flights/all collector for a fixed 365/366-day reference.
 * It is not imported by the app server, scheduler, watchdog, or Phase-6 runtime.
 * Raw flight responses are never persisted: every 2h result is immediately
 * reduced to route/operator-proxy counts plus a response SHA-256.
 *
 * Required environment variables (never print them):
 *   OPENSKY_CLIENT_ID
 *   OPENSKY_CLIENT_SECRET
 *   V39_OPENSKY_NONPROFIT_RESEARCH_ACK=1
 *
 * Example:
 *   npm run v39:traffic:opensky:collect -- --start=2025-09-12 --end-exclusive=2026-09-12 --checkpoint=.private/opensky-v39-reference.json
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import {
  applyOpenSkyChunkV39,
  createOpenSkyObservedReferenceWorkV39,
  finalizeOpenSkyObservedReferenceV39,
  validateOpenSkyObservedReferenceWorkV39,
  type OpenSkyFlightV39,
  type OpenSkyObservedReferenceWorkV39,
} from "../server/lib/disruption/openSkyObservedReference_v39";

const TOKEN_URL = "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token";
const FLIGHTS_URL = "https://opensky-network.org/api/flights/all";
const DEFAULT_MAX_CALLS = 900; // 3,600/4, leaving 400 of a standard 4,000-credit flights bucket.

function argValue(argv: readonly string[], name: string): string | null {
  const prefix = `--${name}=`;
  return argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function utcDay(value: string, label: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`OPENSKY_${label.toUpperCase()}_DATE_INVALID`);
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime())) throw new Error(`OPENSKY_${label.toUpperCase()}_DATE_INVALID`);
  return date;
}

function atomicWrite(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.tmp`;
  writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  renameSync(temp, path);
}

function loadOrCreate(argv: readonly string[], checkpointPath: string): OpenSkyObservedReferenceWorkV39 {
  if (existsSync(checkpointPath)) {
    const work = JSON.parse(readFileSync(checkpointPath, "utf8")) as OpenSkyObservedReferenceWorkV39;
    validateOpenSkyObservedReferenceWorkV39(work);
    return work;
  }
  const start = argValue(argv, "start");
  const end = argValue(argv, "end-exclusive");
  if (!start || !end) throw new Error("OPENSKY_START_AND_END_EXCLUSIVE_REQUIRED_FOR_NEW_CHECKPOINT");
  return createOpenSkyObservedReferenceWorkV39(utcDay(start, "start"), utcDay(end, "end"));
}

async function getToken(clientId: string, clientSecret: string): Promise<string> {
  const body = new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret });
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) throw new Error(`OPENSKY_OAUTH_FAILED:${response.status}`);
  const json = await response.json() as { access_token?: string };
  if (!json.access_token) throw new Error("OPENSKY_OAUTH_TOKEN_MISSING");
  return json.access_token;
}

async function fetchChunk(token: string, begin: number, end: number): Promise<Response> {
  const url = new URL(FLIGHTS_URL);
  url.searchParams.set("begin", String(begin));
  url.searchParams.set("end", String(end));
  return fetch(url, { headers: { authorization: `Bearer ${token}`, accept: "application/json" } });
}

function parseMaxCalls(argv: readonly string[]): number {
  const raw = argValue(argv, "max-calls");
  if (!raw) return DEFAULT_MAX_CALLS;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 950) throw new Error("OPENSKY_MAX_CALLS_MUST_BE_1_TO_950");
  return value;
}

export async function main(argv = process.argv.slice(2)): Promise<number> {
  try {
    if (process.env.V39_OPENSKY_NONPROFIT_RESEARCH_ACK !== "1") {
      throw new Error("OPENSKY_RESEARCH_ACK_REQUIRED: set V39_OPENSKY_NONPROFIT_RESEARCH_ACK=1 only for the approved non-profit research/education reference task");
    }
    const clientId = process.env.OPENSKY_CLIENT_ID;
    const clientSecret = process.env.OPENSKY_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error("OPENSKY_OAUTH_CLIENT_CREDENTIALS_MISSING");

    const checkpointArg = argValue(argv, "checkpoint") ?? ".private/opensky-v39-reference.json";
    const checkpointPath = resolve(process.cwd(), checkpointArg);
    const work = loadOrCreate(argv, checkpointPath);
    const finalBefore = finalizeOpenSkyObservedReferenceV39(work);
    if (finalBefore.complete) {
      console.log(JSON.stringify({ status: "COMPLETE", checkpoint: checkpointArg, ...finalBefore }, null, 2));
      return 0;
    }

    const maxCalls = parseMaxCalls(argv);
    let token = await getToken(clientId, clientSecret);
    let calls = 0;
    const endExclusive = Math.floor(Date.parse(work.reference_period_end_exclusive_utc) / 1000);

    while (work.next_begin_unix < endExclusive && calls < maxCalls) {
      const begin = work.next_begin_unix;
      const end = Math.min(begin + work.chunk_seconds, endExclusive);
      let response = await fetchChunk(token, begin, end);
      if (response.status === 401) {
        token = await getToken(clientId, clientSecret);
        response = await fetchChunk(token, begin, end);
      }
      calls += 1;

      if (response.status === 429) {
        atomicWrite(checkpointPath, work);
        const retry = response.headers.get("x-rate-limit-retry-after-seconds");
        console.log(JSON.stringify({
          status: "PAUSED_QUOTA",
          checkpoint: checkpointArg,
          completed_chunks: work.completed_chunks,
          expected_chunks: work.expected_chunks,
          retry_after_seconds: retry ? Number(retry) : null,
        }, null, 2));
        return 0;
      }

      const text = await response.text();
      if (response.status !== 200 && response.status !== 404) {
        atomicWrite(checkpointPath, work);
        throw new Error(`OPENSKY_FLIGHTS_HTTP_FAILED:${response.status}`);
      }
      let flights: OpenSkyFlightV39[] = [];
      if (response.status === 200) {
        let parsed: unknown;
        try { parsed = JSON.parse(text); } catch { throw new Error("OPENSKY_FLIGHTS_RESPONSE_NOT_JSON"); }
        if (!Array.isArray(parsed)) throw new Error("OPENSKY_FLIGHTS_RESPONSE_NOT_ARRAY");
        flights = parsed as OpenSkyFlightV39[];
      }

      applyOpenSkyChunkV39({ work, beginUnix: begin, endUnix: end, httpStatus: response.status, responseBodyText: text, flights });
      atomicWrite(checkpointPath, work);
    }

    const final = finalizeOpenSkyObservedReferenceV39(work);
    console.log(JSON.stringify({
      status: final.complete ? "COMPLETE" : "PAUSED_CALL_BUDGET",
      checkpoint: checkpointArg,
      calls_this_invocation: calls,
      completed_chunks: work.completed_chunks,
      expected_chunks: work.expected_chunks,
      remaining_chunks: work.expected_chunks - work.completed_chunks,
      ...final,
    }, null, 2));
    return 0;
  } catch (error: any) {
    console.error(String(error?.message ?? error));
    return 1;
  }
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  void main().then((code) => { process.exitCode = code; });
}
