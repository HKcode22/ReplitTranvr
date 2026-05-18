// Maps IATA codes to IANA timezone strings for major US airports
const AIRPORT_TIMEZONES: Record<string, string> = {
  JFK: "America/New_York",
  LGA: "America/New_York",
  EWR: "America/New_York",
  BOS: "America/New_York",
  MIA: "America/New_York",
  ATL: "America/New_York",
  IAD: "America/New_York",
  DCA: "America/New_York",
  CLT: "America/New_York",
  PHL: "America/New_York",
  ORD: "America/Chicago",
  MDW: "America/Chicago",
  DFW: "America/Chicago",
  IAH: "America/Chicago",
  MSP: "America/Chicago",
  STL: "America/Chicago",
  MCI: "America/Chicago",
  MSY: "America/Chicago",
  DEN: "America/Denver",
  SLC: "America/Denver",
  PHX: "America/Phoenix",
  LAX: "America/Los_Angeles",
  SFO: "America/Los_Angeles",
  SEA: "America/Los_Angeles",
  SAN: "America/Los_Angeles",
  LAS: "America/Los_Angeles",
  PDX: "America/Los_Angeles",
  SJC: "America/Los_Angeles",
  OAK: "America/Los_Angeles",
  HNL: "Pacific/Honolulu",
  ANC: "America/Anchorage",
};

export function formatFlightTime(isoTime: string | null, originIata: string): string {
  if (!isoTime) return "—";
  const tz = AIRPORT_TIMEZONES[originIata] || "UTC";
  return new Date(isoTime).toLocaleString("en-US", {
    timeZone: tz,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
