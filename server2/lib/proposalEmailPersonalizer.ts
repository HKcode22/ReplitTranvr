import Anthropic from "@anthropic-ai/sdk";

// Personalizes the guest-proposal email subject + intro paragraph using
// Claude. Strict guardrails: only the structured trip facts we already
// extracted are sent to the model; the model is forbidden from inventing
// prices, carriers or facts not in the input. We enforce a hard latency
// budget (default 1.5s) and silently fall back to deterministic copy if
// anything goes wrong.

const ANTHROPIC_MODEL = "claude-sonnet-4-5";
const DEFAULT_LATENCY_BUDGET_MS = 1500;
const MAX_SUBJECT_CHARS = 90;
const MAX_INTRO_CHARS = 280;
const MAX_INTRO_SENTENCES = 2;

export type PersonalizationVariant = "llm" | "fallback";

export interface PersonalizationCopy {
  subject: string;
  intro: string;
  variant: PersonalizationVariant;
  reason?: string; // why fallback was used (for logs / debugging)
  latencyMs?: number;
  model?: string;
}

export interface ProposalPersonalizationFacts {
  originIata: string;
  originName?: string | null;
  destinationIata: string;
  destinationName?: string | null;
  departureDate: string;
  returnDate?: string | null;
  passengers: number;
  cabinClass?: string | null;
  options: Array<{
    label: string; // "Best Price" | "Best Value" | "Fastest"
    carrierName?: string | null;
    totalAmount: string | number;
    totalCurrency: string;
    stops: number;
    totalDurationMinutes: number;
  }>;
  travelerFirstName?: string | null;
  statedPreferences?: string | null;
}

const SYSTEM_PROMPT =
  "You are a friendly travel concierge writing the opening of a flight-options email for a guest. You only see structured facts the team already extracted from the call. Never invent prices, carriers, dates, or details that are not in the input. Keep tone warm but concise — one or two sentences max. Respond ONLY with valid JSON, no markdown.";

let cachedClient: Anthropic | null = null;
function getClient(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  if (!cachedClient) cachedClient = new Anthropic({ apiKey: key });
  return cachedClient;
}

export function isProposalPersonalizationEnabled(): boolean {
  // Default ON — explicit "0" / "false" / "off" disables.
  const raw = (process.env.PROPOSAL_EMAIL_LLM_PERSONALIZATION ?? "").toLowerCase().trim();
  if (raw === "0" || raw === "false" || raw === "off" || raw === "no") return false;
  return true;
}

export function isProposalPersonalizationConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

// ------------- Deterministic fallback (existing copy) -------------

function fallbackSubject(facts: ProposalPersonalizationFacts): string {
  return `Your flight options — ${facts.originIata} to ${facts.destinationIata}`;
}

function fallbackIntro(facts: ProposalPersonalizationFacts): string {
  const originLabel = facts.originName
    ? `${facts.originName} (${facts.originIata})`
    : facts.originIata;
  const destLabel = facts.destinationName
    ? `${facts.destinationName} (${facts.destinationIata})`
    : facts.destinationIata;
  return `Based on our call, here are three options for ${originLabel} → ${destLabel}.`;
}

export function getFallbackCopy(facts: ProposalPersonalizationFacts): PersonalizationCopy {
  return {
    subject: fallbackSubject(facts),
    intro: fallbackIntro(facts),
    variant: "fallback",
    reason: "deterministic_default",
  };
}

// ------------- Guardrails -------------

function countSentences(s: string): number {
  // Treat ., !, ? followed by space or EOL as a sentence boundary. Avoids
  // tripping on decimals like "$1,200.00" because those have no following
  // space. Final punctuation also counts as one sentence.
  const trimmed = s.trim();
  if (!trimmed) return 0;
  const matches = trimmed.match(/[.!?](\s|$)/g);
  const count = matches ? matches.length : 0;
  // If there's text but no terminator, still count as one sentence.
  return count > 0 ? count : 1;
}

const ALLOWED_CURRENCY_TOKENS = ["USD", "EUR", "GBP", "$", "€", "£"];

function containsForbiddenPriceMention(text: string, allowedAmounts: string[]): string | null {
  // Reject any number that looks like a price (currency symbol + digits, or
  // digits + currency code, or "$1,234"). We allow it only if the exact
  // numeric token appears in our input options.
  const candidates = text.match(/(\$|€|£)\s?\d[\d,]*(?:\.\d{1,2})?|\b\d{2,}(?:[.,]\d{1,2})?\s?(?:USD|EUR|GBP)\b/gi);
  if (!candidates) return null;
  const allowedNumeric = new Set(
    allowedAmounts.flatMap((a) => {
      const s = String(a);
      const num = s.replace(/[^0-9.]/g, "");
      const intPart = num.split(".")[0];
      const out = [num, intPart];
      // Add common comma-formatted versions of the integer part.
      if (intPart && intPart.length > 3) {
        out.push(Number(intPart).toLocaleString("en-US"));
      }
      return out.filter(Boolean);
    }),
  );
  for (const cand of candidates) {
    const numeric = cand.replace(/[^0-9.,]/g, "").replace(/,/g, "");
    const intPart = numeric.split(".")[0];
    if (!allowedNumeric.has(numeric) && !allowedNumeric.has(intPart)) {
      return cand;
    }
  }
  return null;
}

// Curated list of carrier brand names + IATA codes. Used to detect carrier
// mentions even when the brand doesn't end in Airlines/Airways/Air. The list
// favors recall over precision — every match is then checked against the
// allowed carriers from this specific proposal, so false positives only
// trigger a fallback (never a wrong subject going out).
const KNOWN_CARRIER_TOKENS = [
  "american", "delta", "united", "southwest", "jetblue", "alaska", "spirit",
  "frontier", "hawaiian", "allegiant", "sun country", "breeze",
  "british airways", "british", "air france", "klm", "lufthansa", "swiss",
  "iberia", "tap", "tap air portugal", "ryanair", "easyjet", "wizz",
  "norwegian", "sas", "scandinavian", "finnair", "aegean", "icelandair",
  "turkish", "emirates", "qatar", "etihad", "saudia", "el al",
  "air canada", "westjet", "porter", "aeromexico", "volaris", "viva",
  "latam", "avianca", "copa", "azul", "gol",
  "qantas", "virgin australia", "virgin atlantic", "air new zealand",
  "ana", "all nippon", "jal", "japan airlines", "korean air", "asiana",
  "china eastern", "china southern", "air china", "cathay", "cathay pacific",
  "singapore airlines", "singapore", "thai", "malaysia airlines", "garuda",
  "philippine airlines", "vietnam airlines", "air india", "indigo", "vistara",
  "ethiopian", "kenya airways", "south african airways",
];

function containsForbiddenCarrier(text: string, allowedCarriers: string[]): string | null {
  // Two-pass detection so Claude can't slip in a carrier with an
  // unconventional suffix (e.g. "Delta", "JetBlue", "Emirates"):
  //   1. Generic suffix sweep (Airlines / Airways / Air).
  //   2. Substring check against KNOWN_CARRIER_TOKENS.
  // Either match must appear in the proposal's allowlist or we reject.
  const lower = text.toLowerCase();
  const allowed = new Set(allowedCarriers.filter(Boolean).map((c) => c!.toLowerCase()));
  const allowedHaystack = Array.from(allowed).join(" | ");

  const suffixMatches = text.match(/\b([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)*\s(?:Airlines|Airways|Air))\b/g);
  if (suffixMatches) {
    for (const m of suffixMatches) {
      if (!allowed.has(m.toLowerCase())) return m;
    }
  }

  for (const token of KNOWN_CARRIER_TOKENS) {
    // Word-boundary check so "delta" inside "deltas" doesn't trip.
    const re = new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (re.test(lower)) {
      // Allowed if any allowed carrier contains this token (e.g. allowed
      // "American Airlines" covers a "American" mention).
      if (!allowedHaystack.includes(token)) return token;
    }
  }

  return null;
}

function validateCopy(
  subject: string,
  intro: string,
  facts: ProposalPersonalizationFacts,
): { ok: true } | { ok: false; reason: string } {
  if (!subject || !intro) return { ok: false, reason: "empty_field" };
  if (subject.length > MAX_SUBJECT_CHARS) {
    return { ok: false, reason: `subject_too_long_${subject.length}` };
  }
  if (intro.length > MAX_INTRO_CHARS) {
    return { ok: false, reason: `intro_too_long_${intro.length}` };
  }
  if (countSentences(intro) > MAX_INTRO_SENTENCES) {
    return { ok: false, reason: "intro_too_many_sentences" };
  }
  const allowedAmounts = facts.options.map((o) => String(o.totalAmount));
  const allowedCarriers = facts.options.map((o) => o.carrierName || "").filter(Boolean) as string[];
  const combined = `${subject}\n${intro}`;
  const badPrice = containsForbiddenPriceMention(combined, allowedAmounts);
  if (badPrice) return { ok: false, reason: `invented_price:${badPrice}` };
  const badCarrier = containsForbiddenCarrier(combined, allowedCarriers);
  if (badCarrier) return { ok: false, reason: `invented_carrier:${badCarrier}` };
  // Reject any HTML — this string goes straight into the email body.
  if (/[<>]/.test(combined)) return { ok: false, reason: "html_chars" };
  return { ok: true };
}

// ------------- Prompt + parsing -------------

function buildUserPrompt(facts: ProposalPersonalizationFacts): string {
  const route = facts.originName
    ? `${facts.originName} (${facts.originIata}) → ${facts.destinationName || facts.destinationIata} (${facts.destinationIata})`
    : `${facts.originIata} → ${facts.destinationIata}`;
  const dateLine = facts.returnDate
    ? `${facts.departureDate} returning ${facts.returnDate}`
    : `${facts.departureDate} (one-way)`;
  return [
    "TRIP FACTS (the only facts you may use):",
    `- Route: ${route}`,
    `- Dates: ${dateLine}`,
    `- Travelers: ${facts.passengers}`,
    facts.cabinClass ? `- Cabin: ${facts.cabinClass}` : null,
    facts.travelerFirstName ? `- Traveler first name: ${facts.travelerFirstName}` : null,
    facts.statedPreferences ? `- Stated preferences: ${facts.statedPreferences}` : null,
    "",
    "Three options we'll show in the email body (do NOT mention prices or carriers in your output — they're already in the cards below):",
    ...facts.options.map(
      (o) =>
        `- ${o.label}: ${o.carrierName || "carrier TBD"}, ${o.stops === 0 ? "nonstop" : `${o.stops} stop${o.stops === 1 ? "" : "s"}`}, ${Math.round(o.totalDurationMinutes / 60)}h total`,
    ),
    "",
    "Write a personalized email subject line and a short intro paragraph for this guest.",
    "Rules:",
    `- subject: max ${MAX_SUBJECT_CHARS} chars, must include the route or destination so the inbox preview is useful.`,
    `- intro: at most ${MAX_INTRO_SENTENCES} sentences, max ${MAX_INTRO_CHARS} chars, plain text only (no HTML, no markdown).`,
    "- Do NOT mention specific prices, carriers, flight numbers, baggage, or refund policies — the cards beneath already show that.",
    "- Do NOT invent any fact not in the trip facts above.",
    "- If the traveler's first name is provided, you may greet them by name.",
    "- Tone: warm, concise, concierge-quality. Avoid clichés like 'exciting journey'.",
    "",
    "Respond with this exact JSON shape, nothing else:",
    '{ "subject": "...", "intro": "..." }',
  ]
    .filter(Boolean)
    .join("\n");
}

function parseClaudeJson(raw: string): { subject: string; intro: string } | null {
  if (!raw) return null;
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;
  const subject = typeof obj.subject === "string" ? obj.subject.trim() : "";
  const intro = typeof obj.intro === "string" ? obj.intro.trim() : "";
  if (!subject || !intro) return null;
  return { subject, intro };
}

// ------------- Main entry point -------------

export async function personalizeProposalEmail(
  facts: ProposalPersonalizationFacts,
  opts: { latencyBudgetMs?: number; logTag?: string } = {},
): Promise<PersonalizationCopy> {
  const tag = opts.logTag || "guest-proposal";
  const fallback = getFallbackCopy(facts);

  if (!isProposalPersonalizationEnabled()) {
    fallback.reason = "flag_disabled";
    return fallback;
  }
  const client = getClient();
  if (!client) {
    fallback.reason = "anthropic_not_configured";
    return fallback;
  }
  if (!facts.options || facts.options.length === 0) {
    fallback.reason = "no_options";
    return fallback;
  }

  const budget = opts.latencyBudgetMs ?? DEFAULT_LATENCY_BUDGET_MS;
  const start = Date.now();
  let timer: NodeJS.Timeout | null = null;

  try {
    // The Anthropic SDK accepts AbortSignal via its requestOptions parameter.
    const controller = new AbortController();
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new Error("personalization_timeout"));
      }, budget);
    });

    const apiPromise = client.messages.create(
      {
        model: ANTHROPIC_MODEL,
        max_tokens: 256,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserPrompt(facts) }],
      },
      { signal: controller.signal },
    );

    const resp = await Promise.race([apiPromise, timeoutPromise]);
    if (timer) clearTimeout(timer);

    const textBlock = resp.content.find(
      (b): b is Extract<typeof b, { type: "text" }> => b.type === "text",
    );
    const parsed = parseClaudeJson(textBlock?.text ?? "");
    if (!parsed) {
      console.warn(`[${tag}] personalization parse_failed elapsed_ms=${Date.now() - start}`);
      return { ...fallback, reason: "parse_failed", latencyMs: Date.now() - start };
    }

    const validation = validateCopy(parsed.subject, parsed.intro, facts);
    if (!validation.ok) {
      console.warn(
        `[${tag}] personalization rejected reason=${validation.reason} elapsed_ms=${Date.now() - start}`,
      );
      return { ...fallback, reason: `rejected:${validation.reason}`, latencyMs: Date.now() - start };
    }

    const elapsed = Date.now() - start;
    console.log(
      `[${tag}] personalization variant=llm elapsed_ms=${elapsed} subject_len=${parsed.subject.length} intro_len=${parsed.intro.length}`,
    );
    return {
      subject: parsed.subject,
      intro: parsed.intro,
      variant: "llm",
      latencyMs: elapsed,
      model: ANTHROPIC_MODEL,
    };
  } catch (err: unknown) {
    if (timer) clearTimeout(timer);
    const elapsed = Date.now() - start;
    const msg = err instanceof Error ? err.message : String(err);
    const reason = msg === "personalization_timeout" ? "timeout" : `error:${msg.slice(0, 80)}`;
    console.warn(`[${tag}] personalization fallback reason=${reason} elapsed_ms=${elapsed}`);
    return { ...fallback, reason, latencyMs: elapsed };
  }
}
