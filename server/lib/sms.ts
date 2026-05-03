// =============================================================================
// Twilio SMS delivery — gated infrastructure (A2P 10DLC pending).
// -----------------------------------------------------------------------------
// SMS sending is OFF by default. Flipping `SMS_ENABLED=true` AND providing
// Twilio creds (`TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN`, plus either
// `TWILIO_MESSAGING_SERVICE_SID` or `TWILIO_FROM_NUMBER`) is the entire
// activation step once A2P approval lands. `SMS_DRY_RUN=true` (default) keeps
// every send as a logged no-op even when fully configured, so operators can
// rehearse the live path without billing or carrier exposure.
//
// TODO(SMS_CONSENT): the current `shared/schema.ts` has no SMS consent / opt-in
// / communication-preferences column. Before A2P launch we MUST:
//   (a) add a website/app opt-in surface that captures explicit SMS consent
//       (checkbox + visible disclosure of message types, frequency, "Msg & data
//       rates may apply", and a link to STOP/HELP behavior),
//   (b) add a consent column to the relevant table (likely `users` or
//       `traveler_profiles`) recording timestamp + source of consent, and
//   (c) wire `sendSms` to refuse delivery when consent is absent.
// Until that work ships, the implicit basis for the proposal-ready SMS is
// "the caller dialed Travnr (or asked us to call back) AND provided their
// phone number specifically to receive trip options" — service-related,
// transactional, single message tied directly to that interaction. This is
// acceptable for transactional A2P traffic but is NOT sufficient for any
// future marketing/promotional SMS, which must wait for explicit opt-in.
//
// STOP / HELP handling: Twilio's Messaging Service handles `STOP`, `STOPALL`,
// `UNSUBSCRIBE`, `CANCEL`, `END`, `QUIT`, and `HELP` automatically at the
// Messaging Service layer once an A2P-registered campaign is attached. Twilio
// replies with the standard opt-out / help confirmation and blocks further
// outbound messages to opted-out numbers — our code is not in that loop. If
// later we want to mirror opt-outs into our own DB or send a custom HELP
// reply, that's a separate follow-up that requires a `POST /api/twilio/inbound`
// endpoint with Twilio signature verification.
// =============================================================================

import { normalizePhoneE164 } from "./phone";

export interface SendSmsResult {
  sent: boolean;
  skipped: boolean;
  dryRun: boolean;
  providerMessageId: string | null;
  reason: string | null;
}

export interface SendSmsArgs {
  to: string | null | undefined;
  body: string;
  dedupeKey?: string;
}

function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  if (phone.length <= 6) return phone.replace(/.(?=.{2})/g, "*");
  const head = phone.slice(0, 2);
  const tail = phone.slice(-4);
  const middle = "*".repeat(Math.max(0, phone.length - head.length - tail.length));
  return `${head}${middle}${tail}`;
}

let twilioClient: any = null;
let twilioInitTried = false;
let missingCredsLogged = false;

function getTwilioClient(): any | null {
  if (twilioInitTried) return twilioClient;
  twilioInitTried = true;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  try {
    // Lazy require so the SDK is never even constructed unless SMS is enabled
    // AND creds are present.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const twilio = require("twilio");
    twilioClient = twilio(sid, token);
    return twilioClient;
  } catch (e: any) {
    console.error("[sms] failed to construct Twilio client:", e?.message || e);
    return null;
  }
}

export async function sendSms(args: SendSmsArgs): Promise<SendSmsResult> {
  const { to, body } = args;
  const enabled = process.env.SMS_ENABLED === "true";
  const dryRun = process.env.SMS_DRY_RUN !== "false"; // default on
  const bodyLength = body.length;

  if (!enabled) {
    console.log(`[sms] disabled to=${maskPhone(typeof to === "string" ? to : null)} body_length=${bodyLength}`);
    return { sent: false, skipped: true, dryRun: false, providerMessageId: null, reason: "disabled" };
  }

  if (!to || typeof to !== "string") {
    console.log(`[sms] skipped reason=invalid_phone (no recipient)`);
    return { sent: false, skipped: true, dryRun: false, providerMessageId: null, reason: "invalid_phone" };
  }
  const normalized = normalizePhoneE164(to);
  if (!normalized) {
    console.log(`[sms] skipped reason=invalid_phone raw=${maskPhone(to)}`);
    return { sent: false, skipped: true, dryRun: false, providerMessageId: null, reason: "invalid_phone" };
  }
  const masked = maskPhone(normalized);

  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID || null;
  const fromNumber = process.env.TWILIO_FROM_NUMBER || null;
  const accountSid = process.env.TWILIO_ACCOUNT_SID || null;
  const authToken = process.env.TWILIO_AUTH_TOKEN || null;

  // Force dry-run when creds are missing even if SMS_ENABLED=true, rather
  // than crash the call site. Logged once per process to keep the noise low.
  const credsMissing = !accountSid || !authToken || (!messagingServiceSid && !fromNumber);
  const effectiveDryRun = dryRun || credsMissing;
  if (credsMissing && !missingCredsLogged) {
    missingCredsLogged = true;
    console.warn(
      `[sms] missing_credentials forcing_dry_run account_sid=${accountSid ? "set" : "missing"} auth_token=${authToken ? "set" : "missing"} messaging_service_sid=${messagingServiceSid ? "set" : "missing"} from_number=${fromNumber ? "set" : "missing"}`,
    );
  }

  if (effectiveDryRun) {
    console.log(`[sms] dry_run to=${masked} body_length=${bodyLength}`);
    return {
      sent: false,
      skipped: true,
      dryRun: true,
      providerMessageId: null,
      reason: credsMissing ? "dry_run_missing_creds" : "dry_run",
    };
  }

  const client = getTwilioClient();
  if (!client) {
    console.warn(`[sms] skipped reason=client_unavailable to=${masked}`);
    return { sent: false, skipped: true, dryRun: false, providerMessageId: null, reason: "client_unavailable" };
  }

  console.log(`[sms] sending to=${masked} body_length=${bodyLength} via=${messagingServiceSid ? "messaging_service" : "from_number"}`);
  try {
    const params: Record<string, string> = { to: normalized, body };
    if (messagingServiceSid) {
      params.messagingServiceSid = messagingServiceSid;
    } else if (fromNumber) {
      params.from = fromNumber;
    }
    const result = await client.messages.create(params);
    const providerMessageId = result?.sid || null;
    console.log(`[sms] sent to=${masked} provider_message_id=${providerMessageId} status=${result?.status || "unknown"}`);
    return { sent: true, skipped: false, dryRun: false, providerMessageId, reason: null };
  } catch (e: any) {
    // Never throw — SMS failure must not block email or proposal save.
    console.error(`[sms] send_failed to=${masked} error=${e?.message || e}`);
    return { sent: false, skipped: true, dryRun: false, providerMessageId: null, reason: "send_failed" };
  }
}

// Exported for the dev-only admin dry-run endpoint and any future log helpers.
export { maskPhone };
