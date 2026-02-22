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
  destination: string;
  tripType: string;
  dateFrom?: string | null;
  dateTo?: string | null;
  flexibility?: string | null;
  notes?: string | null;
}): string {
  const dateInfo = context.dateFrom && context.dateTo
    ? `Travel dates: ${context.dateFrom} to ${context.dateTo}.`
    : "Travel dates are flexible.";

  return `You are a professional travel concierge assistant for Travnr, a premium travel service.

You are speaking with ${context.userName} about their upcoming trip.

TRIP DETAILS:
- Destination: ${context.destination}
- Trip type: ${context.tripType === "both" ? "Flight + Hotel" : context.tripType}
- ${dateInfo}
${context.flexibility ? `- Flexibility: ${context.flexibility}` : ""}
${context.notes ? `- Additional notes: ${context.notes}` : ""}

YOUR ROLE:
1. Greet the traveler warmly and confirm their trip details
2. Ask about their preferences (seat preference, airline preference, hotel type, budget range)
3. Discuss any special requirements (dietary needs, accessibility, loyalty programs)
4. Gather passport and travel document information if needed
5. Summarize what you've discussed and let them know you'll prepare a personalized itinerary proposal

TONE: Professional, friendly, and efficient. You represent a premium concierge service.
Keep responses concise and conversational. Ask one question at a time.
Do not make up information. If you don't know something, say you'll look into it.`;
}
