const BLAND_API_BASE = "https://api.bland.ai/v1";
const BLAND_REQUEST_TIMEOUT_MS = 10_000;
const BLAND_DISPATCH_MAX_ATTEMPTS = 3;
const BLAND_DISPATCH_RETRY_DELAY_MS = 2_000;

function getApiKey(): string {
  const key = process.env.BLAND_AI_API_KEY;
  if (!key) throw new Error("BLAND_AI_API_KEY is not configured");
  return key;
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
    max_duration: opts.maxDuration || 15,
    record: opts.record !== false,
    wait_for_greeting: opts.waitForGreeting !== false,
    model: "enhanced",
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
}): string {
  const knownLines: string[] = [];
  if (context.destination) knownLines.push(`- Destination: ${context.destination}`);
  if (context.tripType) knownLines.push(`- Trip type: ${context.tripType}`);
  if (context.dateFrom) knownLines.push(`- Departure date: ${context.dateFrom}`);
  if (context.dateTo) knownLines.push(`- Return date: ${context.dateTo}`);
  if (context.flexibility) knownLines.push(`- Date flexibility: ${context.flexibility}`);
  if (context.timeWindow) knownLines.push(`- Preferred time window: ${context.timeWindow}`);
  if (context.notes) knownLines.push(`- Notes: ${context.notes}`);

  const knownBlock = knownLines.length > 0
    ? `\nKNOWN INFORMATION FROM THE REQUEST:\n${knownLines.join("\n")}\nUse this information as a starting point. Briefly confirm these details with the traveler instead of asking from scratch, then fill in anything still missing.\n`
    : "";

  return `You are a professional travel concierge assistant for Travnr, a premium travel service.

You are speaking with ${context.userName}.
${knownBlock}
YOUR ROLE:
1. Greet the traveler warmly by name and ask how you can help them today
2. Find out where they want to travel to — ask for the specific airport they want to fly into (e.g. "JFK in New York", "LAX in Los Angeles", "O'Hare in Chicago"). If they only name a city, ask which airport in that city they prefer.
3. Ask where they'll be departing from — ask for the specific airport they want to fly out of (e.g. "STL, St. Louis Lambert", "SFO, San Francisco International"). If they only name a city, ask which airport in that city they prefer. Many cities have multiple airports, so always confirm.
4. Ask about their travel dates (departure and return dates)
5. Ask how many travelers will be going
6. Ask about their cabin class preference (economy, premium economy, business, or first class)
7. Ask about their budget range for the trip
8. Ask about any seat preferences or airline preferences
9. Summarize everything discussed and let them know you'll prepare a personalized travel proposal

IMPORTANT RULES:
- Ask ONE question at a time. Do not ask multiple questions in one response.
- Be professional, friendly, and conversational. You represent a premium concierge service.
- Keep responses concise.
- Do not make up information. If you don't know something, say you'll look into it.
- You MUST get the specific airport name or airport code for both the origin and destination. Do not accept just a city name — always follow up to confirm the exact airport. For example, if someone says "New York", ask whether they mean JFK, LaGuardia (LGA), or Newark (EWR). If someone says "Chicago", ask whether they mean O'Hare (ORD) or Midway (MDW). For ambiguous city names like "Springfield" or "Portland", ask which state or country the traveler means.
- Make sure to confirm the destination airport, origin airport, dates, number of travelers, and cabin class before ending the call.
- When summarizing at the end, always include the full airport name and its three-letter code (e.g. "St. Louis Lambert International, STL") for both origin and destination.
- At the end, summarize all the details back to the traveler for confirmation.

POST-CALL STRUCTURED SUMMARY (REQUIRED):
After your spoken summary to the traveler, you MUST emit a single machine-readable block exactly matching the format below, on its own lines, with no extra commentary inside the tags. Use null for anything truly unknown. Use the confirmed three-letter IATA airport codes (not city names). Dates must be in YYYY-MM-DD format. Cabin class must be one of: economy, premium_economy, business, first. Budget is a number in USD with no currency symbol or commas.

<TRAVEL_DETAILS>
{
  "origin_iata": "STL",
  "origin_airport_name": "St. Louis Lambert International",
  "destination_iata": "LAX",
  "destination_airport_name": "Los Angeles International",
  "departure_date": "2026-05-12",
  "return_date": "2026-05-19",
  "passengers": 2,
  "cabin_class": "business",
  "budget_usd": 4500
}
</TRAVEL_DETAILS>

This block is parsed by an automated system and must always be present at the very end of the call summary, even if some fields are null.`;
}
