/**
 * One-off backfill: generate Claude one-line summaries for any recently
 * completed bland_calls row that has a transcript but no cached aiSummary.
 *
 * Run with:
 *   npx tsx scripts/backfill-call-summaries.ts            # default limit=100
 *   LIMIT=50 npx tsx scripts/backfill-call-summaries.ts   # custom limit
 *
 * Safe to re-run: rows that already have a cached aiSummary are skipped.
 * Rows where Claude returns null (empty transcript, API error) are also
 * skipped — they'll fall back to the raw extracted fields in the admin UI.
 */
import "dotenv/config";
import { storage } from "../server/storage";
import {
  summarizeCall,
  pickStoredSummary,
  mergeSummaryIntoVariables,
  isCallSummaryAvailable,
} from "../server/lib/callSummary";

function extractAnalysisFromVariables(variables: unknown): unknown {
  if (!variables || typeof variables !== "object") return null;
  const v = (variables as { __analysis?: unknown }).__analysis;
  return v && typeof v === "object" && !Array.isArray(v) ? v : null;
}

async function main() {
  if (!isCallSummaryAvailable()) {
    console.error("ANTHROPIC_API_KEY is not set — cannot backfill summaries.");
    process.exit(1);
  }
  const limit = parseInt(process.env.LIMIT || "100", 10);
  const rows = await storage.getRecentCompletedBlandCalls(Number.isFinite(limit) ? limit : 100);
  console.log(`[backfill] scanning ${rows.length} completed bland_calls (limit=${limit})`);

  let generated = 0;
  let skippedExisting = 0;
  let skippedNoTranscript = 0;
  let skippedClaudeFail = 0;

  for (const row of rows) {
    if (pickStoredSummary(row.variables)) {
      skippedExisting++;
      continue;
    }
    if (!row.transcript || !row.transcript.trim()) {
      skippedNoTranscript++;
      continue;
    }
    const summary = await summarizeCall({
      transcript: row.transcript,
      summary: row.summary,
      analysis: extractAnalysisFromVariables(row.variables),
      blandCallId: row.blandCallId,
    });
    if (!summary) {
      skippedClaudeFail++;
      continue;
    }
    const merged = mergeSummaryIntoVariables(row.variables, summary);
    await storage.updateBlandCall(row.id, { variables: merged });
    generated++;
    // Light throttle so we don't spike Anthropic ratelimits on big backlogs.
    await new Promise((r) => setTimeout(r, 250));
  }

  console.log(
    `[backfill] done — generated=${generated} skipped_existing=${skippedExisting} skipped_no_transcript=${skippedNoTranscript} skipped_claude_fail=${skippedClaudeFail}`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("[backfill] fatal:", err);
  process.exit(1);
});
