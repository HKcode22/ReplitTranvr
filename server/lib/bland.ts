import { createHmac } from "crypto";

const BLAND_API_BASE = "https://api.bland.ai/v1";
const BLAND_REQUEST_TIMEOUT_MS = 10_000;
const BLAND_DISPATCH_MAX_ATTEMPTS = 3;
const BLAND_DISPATCH_RETRY_DELAY_MS = 2_000;

function getApiKey(): string {
  const key = process.env.BLAND_AI_API_KEY;
  if (!key) throw new Error("BLAND_AI_API_KEY is not configured");
  return key;
}

export function getWebhookSecret(): string {
  const explicit = process.env.BLAND_WEBHOOK_SECRET;
  if (explicit) return explicit;
  const apiKey = process.env.BLAND_AI_API_KEY;
  if (!apiKey) return "";
  return createHmac("sha256", apiKey).update("travnr:bland:webhook").digest("hex");
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function blandRequest(method: string, path: string, body?: any): Promise<any> {
  const url = `${BLAND_API_BASE}${path}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), BLAND_REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method,
      headers: {
        "authorization": getApiKey(),
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.message || data?.error || `Bland AI error: ${res.status}`;
      throw new Error(msg);
    }
    return data;
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error(`Bland AI request timed out after ${BLAND_REQUEST_TIMEOUT_MS / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export interface DispatchCallOptions {
  phoneNumber: string;
  task: string;
  webhookUrl: string;
  dynamicDataUrl?: string;
  dynamicDataHeaders?: Record<string, string>;
  transferPhoneNumber?: string;
  voice?: string;
  language?: string;
  maxDuration?: number;
  record?: boolean;
  waitForGreeting?: boolean;
  metadata?: Record<string, any>;
}

export async function dispatchCall(opts: DispatchCallOptions): Promise<{ callId: string; status: string }> {
  const payload: any = {
    phone_number: opts.phoneNumber,
    from: "+14159148074",
    task: opts.task,
    webhook: opts.webhookUrl,
    webhook_events: ["call.ended"],
    voice: opts.voice || "mason",
    language: opts.language || "eng",
    max_duration: Math.min(opts.maxDuration || 10, 10),
    record: opts.record !== false,
    wait_for_greeting: opts.waitForGreeting !== false,
    model: "enhanced",
    noise_cancellation: true,
    interruption_threshold: 100,
    endpoint_sensitivity: 0.5,
    end_call_after_speech: true,
    end_call_phrases: ["GOODBYE", "Safe travels", "have a great trip"],
  };

  if (opts.dynamicDataUrl) {
    payload.dynamic_data = [{
      url: opts.dynamicDataUrl,
      method: "POST",
      headers: opts.dynamicDataHeaders || {},
      cache: false,
      response_data: [
        { name: "traveler_info", data: "$.traveler_info", context: "Traveler information: {{traveler_info}}" },
        { name: "booking_info", data: "$.booking_info", context: "Booking information: {{booking_info}}" },
        { name: "proposal_info", data: "$.proposal_info", context: "Proposal information: {{proposal_info}}" },
        { name: "email_info", data: "$.email_info", context: "Traveler email on file: {{email_info}}" },
      ],
    }];
  }

  if (opts.transferPhoneNumber) {
    payload.transfer_phone_number = opts.transferPhoneNumber;
  }

  if (opts.metadata) {
    payload.metadata = opts.metadata;
  }

  let lastErr: any = null;
  for (let attempt = 1; attempt <= BLAND_DISPATCH_MAX_ATTEMPTS; attempt++) {
    try {
      const data = await blandRequest("POST", "/calls", payload);
      return {
        callId: data.call_id,
        status: data.status || "queued",
      };
    } catch (err: any) {
      lastErr = err;
      console.warn(`Bland dispatch attempt ${attempt} failed:`, err?.message || err);
      if (attempt < BLAND_DISPATCH_MAX_ATTEMPTS) {
        await sleep(BLAND_DISPATCH_RETRY_DELAY_MS);
      }
    }
  }
  throw lastErr || new Error("Bland AI dispatch failed");
}

export async function getCallDetails(callId: string): Promise<any> {
  return blandRequest("GET", `/calls/${callId}`);
}

export async function stopCall(callId: string): Promise<any> {
  return blandRequest("POST", `/calls/${callId}/stop`);
}

export async function getCallRecording(callId: string): Promise<any> {
  return blandRequest("GET", `/calls/${callId}/recording`);
}

export interface BlandCallSummary {
  call_id?: string;
  to?: string;
  from?: string;
  status?: string;
  call_length?: number;
  created_at?: string;
  ended_at?: string;
  completed?: boolean;
  metadata?: Record<string, unknown> | null;
}

export interface BlandCallsListResponse {
  calls: BlandCallSummary[];
  total_count?: number;
}

export async function listCalls(limit: number = 50): Promise<BlandCallsListResponse> {
  const data = await blandRequest("GET", `/calls?limit=${encodeURIComponent(String(limit))}`);
  const calls = Array.isArray(data?.calls) ? (data.calls as BlandCallSummary[]) : [];
  const total_count = typeof data?.total_count === "number" ? data.total_count : undefined;
  return { calls, total_count };
}

export function isConfigured(): boolean {
  return !!process.env.BLAND_AI_API_KEY;
}

export function buildTravelConciergePrompt(context: {
  userName: string;
  destination?: string | null;
  tripType?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  flexibility?: string | null;
  timeWindow?: string | null;
  notes?: string | null;
  email?: string | null;
}): string {
  const knownLines: string[] = [];
  if (context.destination) knownLines.push(`- Destination: ${context.destination}`);
  if (context.dateFrom) knownLines.push(`- Departure date: ${context.dateFrom}`);
  if (context.dateTo) knownLines.push(`- Return date: ${context.dateTo}`);
  if (context.flexibility) knownLines.push(`- Date flexibility: ${context.flexibility}`);
  if (context.timeWindow) knownLines.push(`- Preferred time window: ${context.timeWindow}`);
  if (context.notes) knownLines.push(`- Notes: ${context.notes}`);
  if (context.email) knownLines.push(`- Email on file: ${context.email}`);

  const knownBlock = knownLines.length > 0
    ? `\nKNOWN INFORMATION FROM THE REQUEST:\n${knownLines.join("\n")}\nUse this as a starting point. Briefly confirm what's relevant instead of re-asking, and fill in anything still missing.\n`
    : "";

  const haveEmail = !!context.email;
  const emailStep = haveEmail
    ? ""
    : `5. Ask once for the best email address to send their flight options to. Read it back to confirm spelling.\n`;
  const closingStepNum = haveEmail ? 5 : 6;

  return `You are a professional travel concierge assistant for Travnr, a premium travel service.

You are speaking with ${context.userName}.
${knownBlock}
YOUR ROLE — keep this conversation FAST and EASY. The goal is to learn just enough to send 3 great flight options by email. Most travelers want to be off the phone in under two minutes.

1. Greet the traveler warmly by name and ask where they'd like to fly.
2. Confirm the destination city. For unambiguous cities (one major airport), do not ask which airport — just go with it. For multi-airport cities, name the most common airport up front and offer the alternative once. Examples:
   - Chicago → "Got it, I'll plan on O'Hare unless you'd prefer Midway."
   - New York / NYC → "Got it, I'll plan on JFK unless you'd prefer LaGuardia or Newark."
   - Los Angeles / LA → "Got it, LAX it is — let me know if you'd prefer Burbank or Long Beach."
   - Washington DC → "Got it, Reagan National — or would Dulles work better?"
   - Houston → "Got it, IAH unless you'd prefer Hobby."
   For genuinely ambiguous city names like "Springfield" or "Portland" (which exist in multiple states/countries), ask which state or country.
3. Ask where they're departing from. Same rules as above — assume the obvious airport for single-airport cities, offer one alternative for multi-airport cities, and only ask for clarification when truly ambiguous.
4. Ask about their travel dates — departure and (if it's a round trip) return. If they're flexible, that's fine.
${emailStep}${closingStepNum}. Recap the trip in one sentence ("So that's [origin] to [destination], departing [date], returning [date]"), then say this exact closing line: "Perfect — you'll have your options in your inbox within a minute. Talk soon." Then end the call immediately.

IMPORTANT RULES:
- Ask ONE question at a time. Do not stack questions.
- Be professional, friendly, and conversational. Keep every response short.
- If "previous_proposal_info" indicates prior options exist (anything other than "No prior options to revisit"), briefly acknowledge it after your greeting and offer to revisit those before starting fresh — for example: "I see we sent you some options for [route] earlier — did you want to revisit those or plan something new?" Otherwise, proceed normally.
- Default to 1 traveler, economy class, and flexible departure times. Do NOT ask about number of travelers, cabin class, budget, seat preference, airline preference, frequent flyer programs, dietary needs, or any extras unless the traveler brings them up. If they do, just note it.
- For destination and origin, do not grill the traveler about specific airports. Use the assume-and-offer pattern above. Single-airport cities get no airport question at all.
- Do not invent information. If you don't know something, say you'll look into it.
- After your spoken closing line, say the word GOODBYE and stop speaking immediately. Do not wait for the user to respond.

POST-CALL STRUCTURED SUMMARY (REQUIRED):
After your spoken summary to the traveler, you MUST emit a single machine-readable block exactly matching the format below, on its own lines, with no extra commentary inside the tags. Use null for anything truly unknown. Use the confirmed three-letter IATA airport codes (not city names). Dates must be in YYYY-MM-DD format. Cabin class must be one of: economy, premium_economy, business, first. Budget is a number in USD with no currency symbol or commas. For the email field, if I gave you an email above in KNOWN INFORMATION, echo that exact value; otherwise use the email the traveler gave you during the call.

<TRAVEL_DETAILS>
{
  "origin_iata": "STL",
  "origin_airport_name": "St. Louis Lambert International",
  "destination_iata": "LAX",
  "destination_airport_name": "Los Angeles International",
  "departure_date": "2026-05-12",
  "return_date": "2026-05-19",
  "passengers": 1,
  "cabin_class": "economy",
  "budget_usd": null,
  "email": "traveler@example.com"
}
</TRAVEL_DETAILS>

This block is parsed by an automated system and must always be present at the very end of the call summary, even if some fields are null.`;
}
