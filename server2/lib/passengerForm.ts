// Shared zod schema + helpers for the standardized airline-style passenger
// form. Used by both the guest-booking confirm endpoint and the authenticated
// /api/duffel/book-direct endpoint so the wire contract, validation rules,
// Duffel passenger mapping, and order-metadata serialization stay in sync.
import { z } from "zod";
import { ISO_3166_1_ALPHA2 } from "./isoCountries";

// Countries whose residence selection requires a state/province on the
// server too (mirrors client/src/lib/countries.ts hasSubdivisions). Kept
// intentionally narrow — extend as the product expands to more residence
// markets so server validation matches what the UI enforces.
const SUBDIVISION_COUNTRIES = new Set(["US", "CA"]);

const isoCountry = z
  .string()
  .regex(/^[A-Z]{2}$/, "Country must be a 2-letter ISO code")
  .refine((c) => ISO_3166_1_ALPHA2.has(c), "Unknown country code");

const optionalIsoCountry = z.union([
  isoCountry,
  z.literal(""),
  z.undefined(),
]).optional();

// Standard airline passenger schema. Names are split into first / middle /
// last (mapped to Duffel's given_name + family_name on submit). ISO-3166-1
// alpha-2 codes are validated as exactly two uppercase letters AND verified
// against the canonical ISO-3166-1 alpha-2 set so the API can't accept
// syntactically-valid-but-bogus codes like "ZZ" that the UI never offers.
export const passengerInputSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Last name is required"),
  bornOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth must be YYYY-MM-DD"),
  // Gender requires an explicit selection — no silent default.
  gender: z.enum(["m", "f", "x", "u"], {
    required_error: "Gender is required",
    invalid_type_error: "Gender is required",
  }),
  title: z.enum(["mr", "ms", "mrs", "miss", "dr"]).optional().default("mr"),
  residenceCountry: isoCountry,
  residenceState: z.string().optional(),
  loyaltyProgramme: z.string().optional(),
  loyaltyNumber: z.string().optional(),
  knownTravelerNumber: z.string().optional(),
  knownTravelerCountry: optionalIsoCountry,
  redressNumber: z.string().optional(),
  redressCountry: optionalIsoCountry,
  secondaryRedressNumber: z.string().optional(),
  secondaryRedressCountry: optionalIsoCountry,
  email: z.string().email().optional(),
  phone: z.string().optional(),
  passportNumber: z.string().optional(),
  passportCountry: optionalIsoCountry,
  passportExpiry: z.string().optional(),
}).superRefine((pax, ctx) => {
  // Real-calendar DOB check — the regex above only verifies shape, so
  // Feb 30 / Sep 31 etc. would slip through. Round-trip through Date and
  // also reject any future birth date.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(pax.bornOn);
  if (m) {
    const [, ys, ms, ds] = m;
    const y = Number(ys), mo = Number(ms), d = Number(ds);
    const dt = new Date(Date.UTC(y, mo - 1, d));
    const calendarOk =
      dt.getUTCFullYear() === y &&
      dt.getUTCMonth() === mo - 1 &&
      dt.getUTCDate() === d;
    if (!calendarOk || dt.getTime() >= Date.now()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["bornOn"],
        message: "Date of birth must be a real past date",
      });
    }
  }
  // Conditional residence-state: required when the residence country has
  // subdivisions in our picker. Mirrors the client UI gating so the API
  // can't accept silently-blank state for US/CA residents.
  if (SUBDIVISION_COUNTRIES.has(pax.residenceCountry) && !pax.residenceState?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["residenceState"],
      message: "State / province is required for this country",
    });
  }
  // KTN and redress numbers: if a number is supplied, the matching
  // issuing country must be supplied too (and vice versa) so airline
  // ops gets a complete pair when forwarded via Duffel order metadata.
  const pair = (
    num: string | undefined,
    country: string | undefined,
    numField: string,
    countryField: string,
    label: string,
  ) => {
    const hasNum = !!num?.trim();
    const hasCountry = !!country?.trim();
    if (hasNum && !hasCountry) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [countryField],
        message: `Issuing country is required when ${label} is provided`,
      });
    } else if (hasCountry && !hasNum) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [numField],
        message: `${label} is required when issuing country is provided`,
      });
    }
  };
  pair(pax.knownTravelerNumber, pax.knownTravelerCountry, "knownTravelerNumber", "knownTravelerCountry", "KTN");
  pair(pax.redressNumber, pax.redressCountry, "redressNumber", "redressCountry", "Redress number");
  pair(pax.secondaryRedressNumber, pax.secondaryRedressCountry, "secondaryRedressNumber", "secondaryRedressCountry", "Secondary redress number");
});

export type PassengerInput = z.infer<typeof passengerInputSchema>;

// Snapshot the full set of standard-airline fields so the concierge team
// (and any later admin tooling) can see exactly what the traveler entered.
// The same snapshot is forwarded to Duffel via order metadata (see
// buildDuffelOrderMetadata) so airline ops can surface KTN/redress/loyalty/
// residence on PNR amendments.
export interface ExtendedPassengerSnapshot {
  firstName: string;
  middleName: string | null;
  lastName: string;
  bornOn: string;
  gender: string;
  title: string | undefined;
  residenceCountry: string;
  residenceState: string | null;
  loyaltyProgramme: string | null;
  loyaltyNumber: string | null;
  knownTravelerNumber: string | null;
  knownTravelerCountry: string | null;
  redressNumber: string | null;
  redressCountry: string | null;
  secondaryRedressNumber: string | null;
  secondaryRedressCountry: string | null;
  passportNumber: string | null;
  passportCountry: string | null;
  passportExpiry: string | null;
}

export function buildExtendedPassengerSnapshot(passengers: PassengerInput[]): ExtendedPassengerSnapshot[] {
  return passengers.map((pax) => ({
    firstName: pax.firstName,
    middleName: pax.middleName ?? null,
    lastName: pax.lastName,
    bornOn: pax.bornOn,
    gender: pax.gender,
    title: pax.title,
    residenceCountry: pax.residenceCountry,
    residenceState: pax.residenceState ?? null,
    loyaltyProgramme: pax.loyaltyProgramme ?? null,
    loyaltyNumber: pax.loyaltyNumber ?? null,
    knownTravelerNumber: pax.knownTravelerNumber ?? null,
    knownTravelerCountry: pax.knownTravelerCountry || null,
    redressNumber: pax.redressNumber ?? null,
    redressCountry: pax.redressCountry || null,
    secondaryRedressNumber: pax.secondaryRedressNumber ?? null,
    secondaryRedressCountry: pax.secondaryRedressCountry || null,
    passportNumber: pax.passportNumber ?? null,
    passportCountry: pax.passportCountry ?? null,
    passportExpiry: pax.passportExpiry ?? null,
  }));
}

// Build Duffel passenger mappings from offer.passengers + form input.
// Combines first + middle into Duffel's `given_name` (Duffel has no
// middle-name field; combining is the airline-industry-standard approach so
// the ticket prints exactly as on the traveler's ID).
export function buildPassengerMappings(args: {
  offer: any;
  passengers: PassengerInput[];
  fallbackEmail: string;
  fallbackPhone: string;
}): Array<Record<string, unknown>> {
  const { offer, passengers, fallbackEmail, fallbackPhone } = args;
  return (offer.passengers || []).map((p: any, idx: number) => {
    const pax = passengers[idx] || passengers[0];
    const givenName = [pax.firstName, pax.middleName].filter((x) => x && x.trim()).join(" ");
    const mapping: Record<string, unknown> = {
      id: p.id,
      given_name: givenName,
      family_name: pax.lastName,
      born_on: pax.bornOn,
      email: pax.email || fallbackEmail,
      phone_number: pax.phone || fallbackPhone,
      gender: pax.gender || "u",
      title: pax.title || "mr",
    };
    if (offer.passenger_identity_documents_required && pax.passportNumber) {
      mapping.identity_documents = [{
        type: "passport",
        unique_identifier: pax.passportNumber,
        issuing_country_code: pax.passportCountry,
        expires_on: pax.passportExpiry,
      }];
    }
    if (pax.loyaltyProgramme && pax.loyaltyNumber) {
      const airlineIata = offer.owner?.iata_code || null;
      if (airlineIata) {
        mapping.loyalty_programme_accounts = [{
          account_number: pax.loyaltyNumber,
          airline_iata_code: airlineIata,
        }];
      }
    }
    return mapping;
  });
}

// Build a Duffel order metadata bag. Duffel requires metadata values to be
// short strings, so we serialize ALL passengers (no per-passenger truncation)
// into a single JSON string and split it across `pax_extras_<n>` keys. Duffel
// caps metadata values at ~500 chars per key but allows up to 50 keys, giving
// comfortable headroom for any practical group size.
export function buildDuffelOrderMetadata(base: {
  stripe_payment_intent_id: string;
  source: string;
  extendedPassengers: ExtendedPassengerSnapshot[];
}): Record<string, string> {
  const out: Record<string, string> = {
    stripe_payment_intent_id: base.stripe_payment_intent_id,
    source: base.source,
  };
  const compact = base.extendedPassengers.map((pax) => ({
    dob: pax.bornOn,
    gender: pax.gender,
    residence: pax.residenceCountry,
    ktn: pax.knownTravelerNumber || undefined,
    ktnCountry: pax.knownTravelerCountry || undefined,
    redress: pax.redressNumber || undefined,
    redressCountry: pax.redressCountry || undefined,
    redress2: pax.secondaryRedressNumber || undefined,
    redress2Country: pax.secondaryRedressCountry || undefined,
    loyaltyProg: pax.loyaltyProgramme || undefined,
    loyaltyNum: pax.loyaltyNumber || undefined,
  }));
  const json = JSON.stringify(compact);
  const CHUNK = 480;
  const MAX_CHUNK_KEYS = 40;
  const chunkCount = Math.ceil(json.length / CHUNK);
  const usable = Math.min(chunkCount, MAX_CHUNK_KEYS);
  for (let i = 0; i < usable; i++) {
    out[`pax_extras_${i}`] = json.slice(i * CHUNK, (i + 1) * CHUNK);
  }
  out["pax_extras_count"] = String(compact.length);
  out["pax_extras_chunks"] = String(usable);
  out["pax_extras_truncated"] = String(usable < chunkCount);
  return out;
}
