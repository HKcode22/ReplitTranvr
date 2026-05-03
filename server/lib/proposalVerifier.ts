import Anthropic from "@anthropic-ai/sdk";

export type CorrectedDetails = {
  origin_iata: string | null;
  destination_iata: string | null;
  departure_date: string | null;
  return_date: string | null;
  passengers: number | null;
  cabin_class: string | null;
  budget_usd: number | null;
  airline_preference: string | null;
};

export type VerificationResult = {
  verified: boolean;
  confidence: number;
  issues: string[];
  corrected_details: CorrectedDetails;
  summary: string;
};

export type ParsedDetails = {
  origin: string | null;
  destination: string | null;
  departureDate: string | null;
  returnDate: string | null;
  passengers: number;
  cabinClass: string;
  budget: number | null;
  // Captured by Bland's post-call analysis pass when the traveler volunteers
  // a time-of-day preference or other offhand preferences. Both stay null
  // when nothing was volunteered. The Claude verifier does not currently
  // round-trip these fields, so they are passed through from the parser
  // unchanged.
  timePreference?: string | null;
  notes?: string | null;
  sources?: Record<string, string>;
};

export type ProposalSnapshotItem = {
  description?: string | null;
  priceEstimate?: string | null;
  duffelOfferData?: any;
};

export type ProposalSnapshot = {
  proposalId: number;
  origin: string | null;
  destination: string | null;
  departureDate: string | null;
  returnDate: string | null;
  passengers: number;
  cabinClass: string;
  airline: string | null;
  priceLow: string | null;
  priceHigh: string | null;
  items: ProposalSnapshotItem[];
};

const ANTHROPIC_MODEL = "claude-sonnet-4-5";
const MAX_TRANSCRIPT_CHARS = 30_000;
const SYSTEM_PROMPT =
  "You are a quality assurance agent for Travnr, an AI travel concierge. Your job is to verify that a generated travel proposal matches exactly what the customer requested during their call. You will receive the full call transcript and the details of the generated proposal. Check every detail carefully. Respond only in valid JSON with no markdown, no extra text, nothing outside the JSON object.";

let cachedClient: Anthropic | null = null;
function getClient(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  if (!cachedClient) {
    cachedClient = new Anthropic({ apiKey: key });
  }
  return cachedClient;
}

export function buildProposalSnapshot(
  proposalId: number,
  parsedDetails: ParsedDetails,
  resolvedOriginIata: string | null,
  resolvedDestinationIata: string | null,
  finalDepartureDate: string | null,
  finalReturnDate: string | null,
  items: ProposalSnapshotItem[],
): ProposalSnapshot {
  let priceLow: string | null = null;
  let priceHigh: string | null = null;
  let airline: string | null = null;
  for (const it of items) {
    const p = parseFloat(it.priceEstimate ?? "");
    if (Number.isFinite(p)) {
      const ps = p.toFixed(2);
      if (priceLow === null || p < parseFloat(priceLow)) priceLow = ps;
      if (priceHigh === null || p > parseFloat(priceHigh)) priceHigh = ps;
    }
    if (!airline) {
      const carrier =
        it.duffelOfferData?.slices?.[0]?.segments?.[0]?.carrier?.name ||
        it.duffelOfferData?.owner?.name;
      if (carrier) airline = String(carrier);
    }
  }
  return {
    proposalId,
    origin: resolvedOriginIata ?? parsedDetails.origin,
    destination: resolvedDestinationIata ?? parsedDetails.destination,
    departureDate: finalDepartureDate ?? parsedDetails.departureDate,
    returnDate: finalReturnDate ?? parsedDetails.returnDate,
    passengers: parsedDetails.passengers,
    cabinClass: parsedDetails.cabinClass,
    airline,
    priceLow,
    priceHigh,
    items,
  };
}

function buildUserPrompt(
  transcript: string,
  parsedDetails: ParsedDetails,
  snapshot: ProposalSnapshot,
): string {
  const trimmedTranscript =
    transcript.length > MAX_TRANSCRIPT_CHARS
      ? transcript.slice(0, MAX_TRANSCRIPT_CHARS) + "\n…[transcript truncated]…"
      : transcript;
  const priceRange =
    snapshot.priceLow && snapshot.priceHigh
      ? snapshot.priceLow === snapshot.priceHigh
        ? `$${snapshot.priceLow}`
        : `$${snapshot.priceLow} – $${snapshot.priceHigh}`
      : "(no price)";
  return [
    "CALL TRANSCRIPT:",
    "----------------",
    trimmedTranscript || "(no transcript available)",
    "",
    "PROPOSAL DETAILS (what we generated and are about to send the customer):",
    `- origin IATA: ${snapshot.origin ?? "(none)"}`,
    `- destination IATA: ${snapshot.destination ?? "(none)"}`,
    `- departure date: ${snapshot.departureDate ?? "(none)"}`,
    `- return date: ${snapshot.returnDate ?? "(none)"}`,
    `- passengers: ${snapshot.passengers}`,
    `- cabin class: ${snapshot.cabinClass}`,
    `- airline (top option): ${snapshot.airline ?? "(none)"}`,
    `- price range: ${priceRange}`,
    "",
    "PARSED DETAILS (what our parser extracted from the transcript):",
    `- origin: ${parsedDetails.origin ?? "(none)"}`,
    `- destination: ${parsedDetails.destination ?? "(none)"}`,
    `- departure date: ${parsedDetails.departureDate ?? "(none)"}`,
    `- return date: ${parsedDetails.returnDate ?? "(none)"}`,
    `- passengers: ${parsedDetails.passengers}`,
    `- cabin class: ${parsedDetails.cabinClass}`,
    `- budget: ${parsedDetails.budget ?? "(none)"}`,
    "",
    "Verify each field against the transcript. Always populate corrected_details with what you believe the correct values should be based on the transcript, even when verified is true (so we have a second source of truth).",
    "",
    "Respond with this exact JSON structure and nothing else:",
    "{",
    '  "verified": true,',
    '  "confidence": 0.95,',
    '  "issues": [],',
    '  "corrected_details": {',
    '    "origin_iata": "ORD",',
    '    "destination_iata": "DEN",',
    '    "departure_date": "2026-05-27",',
    '    "return_date": null,',
    '    "passengers": 1,',
    '    "cabin_class": "economy",',
    '    "budget_usd": null,',
    '    "airline_preference": "Frontier"',
    "  },",
    '  "summary": "Proposal matches transcript"',
    "}",
  ].join("\n");
}

function parseClaudeJson(raw: string): VerificationResult | null {
  if (!raw) return null;
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  const slice = text.slice(start, end + 1);
  let parsed: any;
  try {
    parsed = JSON.parse(slice);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  if (typeof parsed.verified !== "boolean") return null;
  if (typeof parsed.confidence !== "number") return null;
  if (!parsed.corrected_details || typeof parsed.corrected_details !== "object") return null;
  const cd = parsed.corrected_details;
  const corrected: CorrectedDetails = {
    origin_iata: typeof cd.origin_iata === "string" ? cd.origin_iata : null,
    destination_iata: typeof cd.destination_iata === "string" ? cd.destination_iata : null,
    departure_date: typeof cd.departure_date === "string" ? cd.departure_date : null,
    return_date: typeof cd.return_date === "string" ? cd.return_date : null,
    passengers:
      typeof cd.passengers === "number" && Number.isFinite(cd.passengers) ? cd.passengers : null,
    cabin_class: typeof cd.cabin_class === "string" ? cd.cabin_class : null,
    budget_usd:
      typeof cd.budget_usd === "number" && Number.isFinite(cd.budget_usd) ? cd.budget_usd : null,
    airline_preference: typeof cd.airline_preference === "string" ? cd.airline_preference : null,
  };
  return {
    verified: parsed.verified,
    confidence: parsed.confidence,
    issues: Array.isArray(parsed.issues) ? parsed.issues.filter((i: any) => typeof i === "string") : [],
    corrected_details: corrected,
    summary: typeof parsed.summary === "string" ? parsed.summary : "",
  };
}

export async function verifyProposalAgainstTranscript(
  transcript: string | null,
  parsedDetails: ParsedDetails,
  snapshot: ProposalSnapshot,
): Promise<VerificationResult | null> {
  const client = getClient();
  if (!client) {
    return null;
  }
  if (!transcript || !transcript.trim()) {
    console.log(
      `[claude-verify] proposal=${snapshot.proposalId} skipped — empty transcript`,
    );
    return null;
  }
  try {
    const userPrompt = buildUserPrompt(transcript, parsedDetails, snapshot);
    const resp = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });
    const textBlock = (resp.content || []).find((b: any) => b.type === "text") as
      | { type: "text"; text: string }
      | undefined;
    const raw = textBlock?.text ?? "";
    const result = parseClaudeJson(raw);
    if (!result) {
      console.warn(
        `[claude-verify] proposal=${snapshot.proposalId} could not parse Claude response: ${raw.slice(0, 200)}`,
      );
      return null;
    }
    console.log(
      `[claude-verify] proposal=${snapshot.proposalId} verified=${result.verified} confidence=${result.confidence} issues=${result.issues.length}`,
    );
    return result;
  } catch (err: any) {
    console.warn(
      `[claude-verify] proposal=${snapshot.proposalId} Anthropic API error:`,
      err?.message || err,
    );
    return null;
  }
}

// ---------------------------------------------------------------------------
// Pick-quality verifier (separate from the request-match verifier above).
//
// The transcript verifier asks "did we search for the right trip?". This one
// asks "given the offers Duffel returned, did we label the right three?".
// It is intentionally narrow: it does not look at the transcript, it does
// not re-check the route, it just sanity-checks Best Price / Best Value /
// Fastest against the full offer pool. The deterministic picker rules
// (Best Value dominance guard, Fastest nonstop preference) already enforce
// the floor; this is the safety net for edge cases the picker missed.
// ---------------------------------------------------------------------------

export type OfferSummary = {
  id: string;
  carrier: string;
  price: number;
  currency: string;
  duration_minutes: number;
  stops: number;
};

export type PickSummary = OfferSummary & {
  label: "Best Price" | "Best Value" | "Fastest";
};

export type PickVerification = {
  ok: boolean;
  issues: string[];
  should_regenerate: boolean;
  // IDs of offers Claude believes the picker should exclude on a re-run
  // (e.g. an AA fare it labelled Best Price when a cheaper UA fare exists
  // in the pool). Empty when ok=true OR when Claude can't pinpoint a
  // specific offender.
  exclude_offer_ids: string[];
};

const PICK_SYSTEM_PROMPT =
  "You are a quality assurance agent for a flight proposal pipeline. You will receive three picks (Best Price, Best Value, Fastest) and a summary of the full offer pool they were selected from. Decide whether each pick is correct given the pool. Respond only in valid JSON, no markdown, no extra text.";

function buildPickPrompt(picks: PickSummary[], pool: OfferSummary[]): string {
  const fmtOffer = (o: OfferSummary) =>
    `id=${o.id} carrier=${o.carrier} price=${o.price.toFixed(2)} ${o.currency} duration_min=${o.duration_minutes} stops=${o.stops}`;
  const picksBlock = picks.map((p) => `- [${p.label}] ${fmtOffer(p)}`).join("\n");
  const poolBlock = pool.map((o) => `- ${fmtOffer(o)}`).join("\n");
  return [
    "PICKS (the three labelled options we are about to email the customer):",
    picksBlock || "(no picks)",
    "",
    "OFFER POOL (every offer Duffel returned for this search, sorted by price):",
    poolBlock || "(empty pool)",
    "",
    "Rules to enforce:",
    '1. "Best Price" must be the strictly cheapest offer in the pool by `price`. Ties on price are fine; a non-tied cheaper offer existing in the pool is NOT.',
    '2. "Fastest" must have the shortest `duration_minutes` of any pick — and if any nonstop (`stops=0`) exists in the pool, the Fastest pick MUST be a nonstop.',
    '3. "Best Value" must NOT be strictly worse than the Best Price pick on BOTH price AND duration (i.e. price >= BestPrice.price AND duration_minutes >= BestPrice.duration_minutes). It can be more expensive only if it is also faster, or longer only if it is also cheaper.',
    "",
    'Set should_regenerate=true if any rule above is violated. Populate exclude_offer_ids with the IDs of the picked offers that violate a rule (so the picker can re-run with them removed). If everything looks fine, set ok=true and leave issues+exclude_offer_ids empty.',
    "",
    "Respond with this exact JSON structure and nothing else:",
    "{",
    '  "ok": true,',
    '  "issues": [],',
    '  "should_regenerate": false,',
    '  "exclude_offer_ids": []',
    "}",
  ].join("\n");
}

function parsePickJson(raw: string): PickVerification | null {
  if (!raw) return null;
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  let parsed: any;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  if (typeof parsed.ok !== "boolean") return null;
  if (typeof parsed.should_regenerate !== "boolean") return null;
  return {
    ok: parsed.ok,
    should_regenerate: parsed.should_regenerate,
    issues: Array.isArray(parsed.issues)
      ? parsed.issues.filter((i: any) => typeof i === "string")
      : [],
    exclude_offer_ids: Array.isArray(parsed.exclude_offer_ids)
      ? parsed.exclude_offer_ids
          .map((x: any) => (typeof x === "string" ? x : typeof x === "number" ? String(x) : null))
          .filter((x: string | null): x is string => x !== null && x.length > 0)
      : [],
  };
}

export async function verifyProposalPicks(args: {
  picks: PickSummary[];
  pool: OfferSummary[];
  logTag: string;
}): Promise<PickVerification | null> {
  const client = getClient();
  if (!client) return null;
  if (!args.picks || args.picks.length === 0) return null;
  try {
    const resp = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 600,
      system: PICK_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildPickPrompt(args.picks, args.pool) }],
    });
    const textBlock = (resp.content || []).find((b: any) => b.type === "text") as
      | { type: "text"; text: string }
      | undefined;
    const parsed = parsePickJson(textBlock?.text ?? "");
    if (!parsed) {
      console.warn(`${args.logTag} pick-verify could not parse Claude response`);
      return null;
    }
    return parsed;
  } catch (err: any) {
    console.warn(`${args.logTag} pick-verify Anthropic error:`, err?.message || err);
    return null;
  }
}

const ALLOWED_CABINS = new Set(["economy", "premium_economy", "business", "first"]);

export function correctedDetailsToParsed(
  corrected: CorrectedDetails,
  fallback: ParsedDetails,
): ParsedDetails {
  const origin =
    corrected.origin_iata && corrected.origin_iata.trim()
      ? corrected.origin_iata.trim().toUpperCase()
      : fallback.origin;
  const destination =
    corrected.destination_iata && corrected.destination_iata.trim()
      ? corrected.destination_iata.trim().toUpperCase()
      : fallback.destination;
  const departureDate =
    corrected.departure_date && corrected.departure_date.trim()
      ? corrected.departure_date.trim()
      : fallback.departureDate;
  const returnDate =
    corrected.return_date && corrected.return_date.trim()
      ? corrected.return_date.trim()
      : fallback.returnDate;
  const passengers =
    corrected.passengers && corrected.passengers >= 1
      ? Math.floor(corrected.passengers)
      : fallback.passengers;
  const cabinRaw = (corrected.cabin_class || "").toLowerCase().replace(/\s+/g, "_");
  const cabinClass = ALLOWED_CABINS.has(cabinRaw) ? cabinRaw : fallback.cabinClass;
  const budget =
    corrected.budget_usd && Number.isFinite(corrected.budget_usd)
      ? corrected.budget_usd
      : fallback.budget;
  const sources: Record<string, string> = {
    origin: "claude_verifier",
    destination: "claude_verifier",
    departureDate: "claude_verifier",
    returnDate: "claude_verifier",
    cabinClass: "claude_verifier",
    passengers: "claude_verifier",
    budget: "claude_verifier",
  };
  // The Claude verifier does not produce time_preference / notes today, so
  // pass them through from the parser fallback unchanged.
  return {
    origin,
    destination,
    departureDate,
    returnDate,
    passengers,
    cabinClass,
    budget,
    timePreference: fallback.timePreference ?? null,
    notes: fallback.notes ?? null,
    sources,
  };
}

function diffFields(a: ParsedDetails, b: ParsedDetails): string[] {
  const keys: (keyof ParsedDetails)[] = [
    "origin",
    "destination",
    "departureDate",
    "returnDate",
    "passengers",
    "cabinClass",
    "budget",
  ];
  const diffs: string[] = [];
  for (const k of keys) {
    if (String(a[k] ?? "") !== String(b[k] ?? "")) {
      diffs.push(`${k}: ${JSON.stringify(a[k])} → ${JSON.stringify(b[k])}`);
    }
  }
  return diffs;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type FixAndRegenerateArgs = {
  callRequestId: number;
  userId: string;
  oldProposalId: number;
  correctedDetails: CorrectedDetails;
  parsedDetails: ParsedDetails;
  verificationResult: VerificationResult;
  callSummary: string | null;
  callTranscript: string | null;
  userName: string;
  userEmail: string | null;
  regenerate: (overrideDetails: ParsedDetails) => Promise<number | null>;
  deleteOldProposal: () => Promise<void>;
  sendInternalEmail: (subject: string, html: string) => Promise<void>;
};

export async function fixAndRegenerateProposal(
  args: FixAndRegenerateArgs,
): Promise<{ newProposalId: number | null }> {
  const overrideDetails = correctedDetailsToParsed(args.correctedDetails, args.parsedDetails);
  const diffs = diffFields(args.parsedDetails, overrideDetails);

  console.log(
    `[claude-verify] AUTO-CORRECTION callRequest=${args.callRequestId} oldProposal=${args.oldProposalId} verified=${args.verificationResult.verified} confidence=${args.verificationResult.confidence} diffs=[${diffs.join("; ")}] issues=${JSON.stringify(args.verificationResult.issues)}`,
  );

  try {
    await args.deleteOldProposal();
  } catch (err: any) {
    console.error(
      `[claude-verify] failed to delete old proposal ${args.oldProposalId}:`,
      err?.message || err,
    );
  }

  let newProposalId: number | null = null;
  try {
    newProposalId = await args.regenerate(overrideDetails);
  } catch (err: any) {
    console.error(
      `[claude-verify] regenerate failed for callRequest=${args.callRequestId}:`,
      err?.message || err,
    );
  }

  const subject = `Auto-Correction Applied — ${args.userName}`;
  const issuesHtml = args.verificationResult.issues.length
    ? `<ul>${args.verificationResult.issues.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`
    : "<p><em>(no issues listed)</em></p>";
  const diffsHtml = diffs.length
    ? `<ul>${diffs.map((d) => `<li><code>${escapeHtml(d)}</code></li>`).join("")}</ul>`
    : "<p><em>(no field diffs — verifier flagged but corrected_details matched parsed details)</em></p>";
  const transcriptHtml = args.callTranscript
    ? `<pre style="white-space:pre-wrap;font-family:ui-monospace,monospace;font-size:12px;background:#f4f4f5;padding:12px;border-radius:6px;">${escapeHtml(
        args.callTranscript.length > 8000
          ? args.callTranscript.slice(0, 8000) + "\n…[transcript truncated]…"
          : args.callTranscript,
      )}</pre>`
    : "<p><em>(no transcript)</em></p>";
  const html = `
    <h2>Auto-correction applied to a Travnr proposal</h2>
    <p>Claude flagged a mismatch between the call transcript and the generated proposal. The original proposal was deleted and a corrected one was generated using Claude's <code>corrected_details</code>. The customer was not notified about the correction.</p>
    <table cellpadding="6" style="border-collapse:collapse;">
      <tr><td><strong>User</strong></td><td>${escapeHtml(args.userName)} ${args.userEmail ? `&lt;${escapeHtml(args.userEmail)}&gt;` : ""}</td></tr>
      <tr><td><strong>Call request</strong></td><td>${args.callRequestId}</td></tr>
      <tr><td><strong>Original proposal id</strong></td><td>${args.oldProposalId} (deleted)</td></tr>
      <tr><td><strong>New proposal id</strong></td><td>${newProposalId ?? "(regeneration failed)"}</td></tr>
      <tr><td><strong>verified</strong></td><td>${args.verificationResult.verified}</td></tr>
      <tr><td><strong>confidence</strong></td><td>${args.verificationResult.confidence}</td></tr>
      <tr><td><strong>summary</strong></td><td>${escapeHtml(args.verificationResult.summary)}</td></tr>
    </table>
    <h3>Issues raised by Claude</h3>
    ${issuesHtml}
    <h3>Field changes (parsed → corrected)</h3>
    ${diffsHtml}
    <h3>Parsed details (before)</h3>
    <pre style="font-family:ui-monospace,monospace;font-size:12px;">${escapeHtml(JSON.stringify(args.parsedDetails, null, 2))}</pre>
    <h3>Corrected details (after, raw from Claude)</h3>
    <pre style="font-family:ui-monospace,monospace;font-size:12px;">${escapeHtml(JSON.stringify(args.correctedDetails, null, 2))}</pre>
    <h3>Call transcript</h3>
    ${transcriptHtml}
  `;

  try {
    await args.sendInternalEmail(subject, html);
  } catch (err: any) {
    console.error(
      `[claude-verify] failed to send admin alert email for callRequest=${args.callRequestId}:`,
      err?.message || err,
    );
  }

  return { newProposalId };
}
