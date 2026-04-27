export function normalizePhoneE164(input: string | null | undefined): string | null {
  if (!input) return null;
  const cleaned = String(input).replace(/[\s\-().]/g, "");
  if (!cleaned) return null;
  if (cleaned.startsWith("+")) {
    const digits = cleaned.slice(1);
    if (!/^\d+$/.test(digits) || digits.length < 7 || digits.length > 15) return null;
    return cleaned;
  }
  if (!/^\d+$/.test(cleaned)) return null;
  if (cleaned.length === 10) return `+1${cleaned}`;
  if (cleaned.length === 11 && cleaned.startsWith("1")) return `+${cleaned}`;
  if (cleaned.length >= 7 && cleaned.length <= 15) return `+${cleaned}`;
  return null;
}
