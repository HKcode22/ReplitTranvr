/**
 * Evidence-export helper for isolated P20 localhost rehearsal (not paid YSSY).
 * Avoid scanning /tmp: obtain the run-specific directory emitted at completion,
 * then read the actual saved original receipt and compare it to stdout JSON.
 */
import fs from "node:fs";
import path from "node:path";

const [logFile, outputFile, expectedMode] = process.argv.slice(2);
if (!logFile || !outputFile ||
    !["SHORT_LOCAL_SMOKE", "ACTUAL_LOCAL_120M"].includes(expectedMode)) {
  throw new Error("P20_RECEIPT_EXPORT_USAGE");
}
const log = fs.readFileSync(logFile, "utf8");
const marker = '{\n  "schema": "v39.p20-local-wallclock-synthetic.v1",';
const pos = log.lastIndexOf(marker);
if (pos < 0) throw new Error("P20_FINAL_RESULT_NOT_IN_LOG");
const printed = JSON.parse(log.slice(pos).trim());
if (printed.schema !== "v39.p20-local-wallclock-synthetic.v1" ||
    printed.mode !== expectedMode ||
    printed.localRuntimeResult !== "PASS_LOCAL_ONLY") {
  throw new Error("P20_FINAL_RESULT_NOT_VALID");
}
const root = printed.evidenceDirectory;
if (typeof root !== "string" ||
    !/^\/tmp\/p2g-wallclock-synthetic-[A-Za-z0-9_-]+$/.test(root) ||
    !fs.existsSync(root) || !fs.lstatSync(root).isDirectory() ||
    fs.realpathSync(root) !== root) {
  throw new Error("P20_EVIDENCE_DIRECTORY_INVALID");
}
const receiptFile = path.join(root, "P20_LOCAL_ONLY_RESULT.json");
if (!fs.existsSync(receiptFile) || !fs.lstatSync(receiptFile).isFile()) {
  throw new Error("P20_ORIGINAL_RECEIPT_NOT_FOUND");
}
const raw = fs.readFileSync(receiptFile, "utf8");
const saved = JSON.parse(raw);
if (JSON.stringify(saved) !== JSON.stringify(printed)) {
  throw new Error("P20_SAVED_RECEIPT_DIFFERS_FROM_RECORDED_RESULT");
}
// Preserve original bytes rather than writing reconstructed evidence.
fs.writeFileSync(outputFile, raw, { flag: "wx" });
console.log(JSON.stringify({
  status: "P20_EXACT_ORIGINAL_RECEIPT_EXPORTED",
  mode: saved.mode,
  elapsedSeconds: saved.elapsedSeconds,
  senderAttempts: saved.syntheticSenderAttempts,
  outputFile,
  paidYssyGoAuthorized: false,
  providerCalls: 0,
}));
