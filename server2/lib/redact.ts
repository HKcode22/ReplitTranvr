// Centralized PII redaction for server-side logs.
//
// The request logger and webhook handlers occasionally need to dump structured
// payloads for debugging. We never want raw traveler PII (emails, phone
// numbers, names, DOB, passport numbers, addresses) or auth material (tokens,
// secrets, passwords) to land in stdout/log aggregators. Run anything before
// logging through `redact()` (deep walk over an object) or `maskEmail` /
// `maskPhone` for individual scalars.
//
// Policy:
//   - Sensitive scalar values are replaced with a short masked form so we can
//     still tell two distinct values apart in logs without leaking them.
//   - Long free-form text fields known to contain PII (transcripts, summaries,
//     recording URLs) are replaced with a length marker.
//   - The walker is depth-limited to avoid pathological objects.

const SENSITIVE_KEYS = new Set<string>([
  // contact / identity
  "email", "emails", "to", "recipient", "recipients", "callbackemail",
  "phone", "phonenumber", "phone_number", "mobile", "msisdn", "from", "caller",
  "name", "fullname", "full_name", "firstname", "first_name", "lastname",
  "last_name", "given_name", "family_name", "displayname", "display_name",
  "callbackname",
  // identity documents
  "passportnumber", "passport_number", "passport",
  "dateofbirth", "date_of_birth", "dob", "birthdate", "birth_date",
  // address
  "address", "address1", "address2", "street", "city", "postalcode",
  "postal_code", "zip", "zipcode",
  // auth / secrets
  "password", "newpassword", "currentpassword", "token", "tokens", "secret",
  "apikey", "api_key", "authorization", "auth", "sessionid", "session_id",
  "verificationtoken", "verification_token", "resettoken", "reset_token",
  // call / transcript content
  "transcript", "concatenated_transcript", "transcriptjson", "summary",
  "recording_url", "recordingurl",
]);

const TEXT_BLOB_KEYS = new Set<string>([
  "transcript", "concatenated_transcript", "transcriptjson", "summary",
]);

function maskScalar(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value !== "string") return "[redacted]";
  const s = value;
  if (!s) return s;
  if (s.includes("@")) {
    const [u, d] = s.split("@");
    const head = u ? u.slice(0, 1) : "";
    return `${head}***@${d || "***"}`;
  }
  if (/^\+?\d[\d\s().-]{4,}$/.test(s)) {
    const digits = s.replace(/\D/g, "");
    return `***${digits.slice(-4)}`;
  }
  if (s.length <= 4) return "***";
  return `${s.slice(0, 2)}***${s.slice(-2)}`;
}

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[truncated]";
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const lk = k.toLowerCase();
      if (TEXT_BLOB_KEYS.has(lk)) {
        const len = typeof v === "string" ? v.length : (v == null ? 0 : -1);
        out[k] = `[redacted text length=${len}]`;
      } else if (SENSITIVE_KEYS.has(lk)) {
        out[k] = maskScalar(v);
      } else {
        out[k] = redact(v, depth + 1);
      }
    }
    return out;
  }
  return value;
}

export function redactJSON(value: unknown): string {
  try {
    return JSON.stringify(redact(value));
  } catch {
    return "[unserializable]";
  }
}

export function maskEmail(s: string | null | undefined): string {
  if (!s) return "—";
  return String(maskScalar(s));
}

export function maskPhone(s: string | null | undefined): string {
  if (!s) return "—";
  return String(maskScalar(s));
}

// Mask a token / link secret so logs still correlate the same token across
// lines (first 6 chars hashed with the rest) but the full value can't be
// lifted from logs and used to take over the link.
export function maskToken(s: string | null | undefined): string {
  if (!s) return "—";
  const str = String(s);
  if (str.length <= 8) return "***";
  return `${str.slice(0, 6)}…(${str.length})`;
}
