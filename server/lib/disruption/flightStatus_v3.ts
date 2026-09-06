// ============================================================
// v3 — AeroDataBox FlightNotificationContract payload validator.
// NOT a poller. Mirrors AugMLtest/PrePosFeat.md EXACTLY (the
// webhook docs): top-level { flights[], subscription, balance }.
//
// This is the validation GATE (plan §5). The webhook must still
// answer 2xx even if a payload fails here (a 4xx/5xx triggers a
// paid AeroDataBox retry) — the extractor is null-safe, so on a
// partial parse we log the errors, extract what we can, and ack.
//
// See MDplan/V3_WebhookExtractionPlan.md §8 Phase 2.
// ============================================================

import { z } from "zod";

// AeroDataBox sends enums sometimes as the numeric code (status: 2, quality: [0,1])
// and sometimes as the string name ("EnRoute", ["Basic"]). Accept both.
const enumCodeOrName = z.union([z.number().int(), z.string()]);

// ---------------------------------------------------------------------------
// Reusable leaf types
// ---------------------------------------------------------------------------

// Date-time strings arrive as ISO-8601 ("2026-08-08T14:31:00Z").
const isoUtc = z.string();

/** { utc, local } time block. Both fields are technically required by the
 *  contract, but real deliveries occasionally drop `local`, so be lenient. */
const timeBlock = z
  .object({
    utc: isoUtc,
    local: isoUtc.optional().nullable(),
  })
  .optional()
  .nullable();

const airport = z
  .object({
    icao: z.string().optional().nullable(),
    iata: z.string().optional().nullable(),
    localCode: z.string().optional().nullable(),
    name: z.string().optional().nullable(),
    shortName: z.string().optional().nullable(),
    municipalityName: z.string().optional().nullable(),
    location: z.object({ lat: z.number(), lon: z.number() }).optional().nullable(),
    countryCode: z.string().optional().nullable(),
    timeZone: z.string().optional().nullable(),
  })
  .optional()
  .nullable();

/** Departure OR arrival block (identical shape; checkInDesk is departure-only). */
const flightEndpoint = z
  .object({
    airport: airport,
    scheduledTime: timeBlock,
    revisedTime: timeBlock,
    predictedTime: timeBlock,
    runwayTime: timeBlock,
    terminal: z.string().optional().nullable(),
    checkInDesk: z.string().optional().nullable(),
    gate: z.string().optional().nullable(),
    baggageBelt: z.string().optional().nullable(),
    runway: z.string().optional().nullable(),
    quality: z.array(enumCodeOrName).optional().nullable(),
  })
  .optional()
  .nullable();

// Real deliveries use CAPITALIZED keys ({Km, Nm, Feet, Mile, Meter}); the docs
// use lowercase. Accept both by making all keys optional.
const distance = z
  .object({
    meter: z.number().optional(),
    km: z.number().optional(),
    mile: z.number().optional(),
    nm: z.number().optional(),
    feet: z.number().optional(),
    Meter: z.number().optional(),
    Km: z.number().optional(),
    Mile: z.number().optional(),
    Nm: z.number().optional(),
    Feet: z.number().optional(),
  })
  .passthrough()
  .optional()
  .nullable();

const altitude = z
  .object({
    meter: z.number().optional(),
    km: z.number().optional(),
    mile: z.number().optional(),
    nm: z.number().optional(),
    feet: z.number().optional(),
  })
  .optional()
  .nullable();

const airspeed = z
  .object({
    kt: z.number().optional(),
    kmPerHour: z.number().optional(),
    miPerHour: z.number().optional(),
    meterPerSecond: z.number().optional(),
  })
  .optional()
  .nullable();

const flightPlan = z
  .object({
    flightRules: z.string().optional().nullable(),
    flightType: z.string().optional().nullable(),
    revisionNo: z.number().int().optional().nullable(),
    status: z.string().optional().nullable(),
    route: z.string().optional().nullable(),
    altitude: z
      .object({
        requested: altitude,
        assigned: altitude,
      })
      .optional()
      .nullable(),
    airspeed: z
      .object({
        requested: airspeed,
        assigned: airspeed,
      })
      .optional()
      .nullable(),
    lastUpdatedUtc: isoUtc.optional().nullable(),
  })
  .optional()
  .nullable();

const aircraftImage = z
  .object({
    url: z.string().optional(),
    webUrl: z.string().optional().nullable(),
    author: z.string().optional().nullable(),
    title: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    license: z.string().optional().nullable(),
    htmlAttributions: z.array(z.string()).optional().nullable(),
  })
  .optional()
  .nullable();

const aircraft = z
  .object({
    reg: z.string().optional().nullable(),
    modeS: z.string().optional().nullable(),
    model: z.string().optional().nullable(),
    image: aircraftImage,
  })
  .optional()
  .nullable();

const airline = z
  .object({
    name: z.string().optional().nullable(),
    iata: z.string().optional().nullable(),
    icao: z.string().optional().nullable(),
  })
  .optional()
  .nullable();

// Live ADS-B position (POST). Required lat/lon/reportedAtUtc when present.
const liveLocation = z
  .object({
    pressureAltitude: altitude,
    altitude: altitude,
    pressure: z.object({ hPa: z.number() }).optional().nullable(),
    groundSpeed: z.object({ kt: z.number() }).optional().nullable(),
    trueTrack: z.object({ deg: z.number() }).optional().nullable(),
    vsiFpm: z.number().int().optional().nullable(),
    reportedAtUtc: isoUtc,
    lat: z.number(),
    lon: z.number(),
  })
  .optional()
  .nullable();

// ---------------------------------------------------------------------------
// Flight item
// ---------------------------------------------------------------------------

export const flightStatusV3Schema = z.object({
  notificationSummary: z.string().optional().nullable(),
  notificationRemark: z.string().optional().nullable(),
  greatCircleDistance: distance,
  departure: flightEndpoint,
  arrival: flightEndpoint,
  flightPlan: flightPlan,
  lastUpdatedUtc: isoUtc.optional().nullable(),
  number: z.string(),
  callSign: z.string().optional().nullable(),
  status: enumCodeOrName.optional().nullable(),
  codeshareStatus: enumCodeOrName.optional().nullable(),
  isCargo: z.boolean().optional().nullable(),
  aircraft: aircraft,
  airline: airline,
  location: liveLocation,
});

// ---------------------------------------------------------------------------
// Top-level notification contract
// ---------------------------------------------------------------------------

const subscriptionBlock = z
  .object({
    id: z.string().optional().nullable(),
    isActive: z.boolean().optional(),
    // Real deliveries send billingType as a NUMERIC code (not the string name).
    billingType: enumCodeOrName.optional().nullable(),
    activateBeforeUtc: isoUtc.optional().nullable(),
    expiresOnUtc: isoUtc.optional().nullable(),
    createdOnUtc: isoUtc.optional().nullable(),
    subject: z
      .object({
        type: enumCodeOrName.optional().nullable(),
        id: z.string().optional().nullable(),
      })
      .optional()
      .nullable(),
    subscriber: z
      .object({
        type: enumCodeOrName.optional().nullable(),
        id: z.string().optional().nullable(),
      })
      .optional()
      .nullable(),
    notices: z.array(z.string()).optional().nullable(),
  })
  .optional()
  .nullable();

const balanceBlock = z
  .object({
    creditsRemaining: z.number().optional().nullable(),
    lastRefilledUtc: isoUtc.optional().nullable(),
    lastDeductedUtc: isoUtc.optional().nullable(),
  })
  .optional()
  .nullable();

export const flightNotificationContractSchema = z.object({
  flights: z.array(flightStatusV3Schema),
  subscription: subscriptionBlock,
  balance: balanceBlock,
});

export type FlightStatusV3 = z.infer<typeof flightStatusV3Schema>;
export type FlightNotificationContract = z.infer<typeof flightNotificationContractSchema>;

// ---------------------------------------------------------------------------
// Status enum → code mapping (plan §5d, from PrePosFeat.md)
// ---------------------------------------------------------------------------

export const STATUS_CODE: Record<string, number> = {
  Unknown: 0,
  Expected: 1,
  EnRoute: 2,
  CheckIn: 3,
  Boarding: 4,
  GateClosed: 5,
  Departed: 6,
  Delayed: 7,
  Approaching: 8,
  Arrived: 9,
  Canceled: 10,
  Diverted: 11,
  CanceledUncertain: 12,
};

/** Statuses that imply the aircraft is/was airborne → data_stage POST. */
export const POST_STATUSES: ReadonlySet<string> = new Set([
  "Departed",
  "EnRoute",
  "Approaching",
  "Arrived",
]);
