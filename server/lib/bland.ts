const BLAND_API_BASE = "https://api.bland.ai/v1";

function getApiKey(): string {
  const key = process.env.BLAND_AI_API_KEY;
  if (!key) throw new Error("BLAND_AI_API_KEY is not configured");
  return key;
}

async function blandRequest(method: string, path: string, body?: any): Promise<any> {
  const url = `${BLAND_API_BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      "authorization": getApiKey(),
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.message || data?.error || `Bland AI error: ${res.status}`;
    throw new Error(msg);
  }
  return data;
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

  const data = await blandRequest("POST", "/calls", payload);
  return {
    callId: data.call_id,
    status: data.status || "queued",
  };
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
  notes?: string | null;
}): string {
  return `You are a professional travel concierge assistant for Travnr, a premium travel service.

You are speaking with ${context.userName}.
${context.notes ? `They have the following notes: ${context.notes}` : ""}

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
- You MUST get the specific airport name or airport code for both the origin and destination. Do not accept just a city name — always follow up to confirm the exact airport. For example, if someone says "New York", ask whether they mean JFK, LaGuardia (LGA), or Newark (EWR). If someone says "Chicago", ask whether they mean O'Hare (ORD) or Midway (MDW).
- Make sure to confirm the destination airport, origin airport, dates, number of travelers, and cabin class before ending the call.
- When summarizing at the end, always include the full airport name and its three-letter code (e.g. "St. Louis Lambert International, STL") for both origin and destination.
- At the end, summarize all the details back to the traveler for confirmation.`;
}
