// Shared types, helpers, constants, and validation for the standardized
// airline-style passenger form. Used by both the guest-booking page
// (/book/:optionToken) and the authenticated flight-search → checkout flow,
// so any change to the form contract only has to happen in one place.
import { hasSubdivisions } from "./countries";

export interface PassengerForm {
  firstName: string;
  middleName?: string;
  lastName: string;
  // Date of birth captured as separate Month / Day / Year selects (AA-style)
  // and composed to YYYY-MM-DD on submit.
  dobMonth: string;
  dobDay: string;
  dobYear: string;
  gender: "" | "m" | "f" | "x" | "u";
  title: "mr" | "ms" | "mrs" | "miss" | "dr";
  residenceCountry: string;
  residenceState?: string;
  loyaltyProgramme?: string;
  loyaltyNumber?: string;
  knownTravelerNumber?: string;
  knownTravelerCountry?: string;
  redressNumber?: string;
  redressCountry?: string;
  secondaryRedressNumber?: string;
  secondaryRedressCountry?: string;
  passportNumber?: string;
  passportCountry?: string;
  passportExpiry?: string;
}

export interface PassengerErrors {
  firstName?: string;
  lastName?: string;
  bornOn?: string;
  gender?: string;
  residenceCountry?: string;
  residenceState?: string;
  knownTraveler?: string;
  redress?: string;
  secondaryRedress?: string;
  passport?: string;
}

// Compose YYYY-MM-DD from the three DOB selects, zero-padding month/day.
// Returns "" if any part is missing so the validator can flag it.
export function composeBornOn(p: PassengerForm): string {
  if (!p.dobYear || !p.dobMonth || !p.dobDay) return "";
  const mm = String(p.dobMonth).padStart(2, "0");
  const dd = String(p.dobDay).padStart(2, "0");
  return `${p.dobYear}-${mm}-${dd}`;
}

// Real-calendar validation for the composed YYYY-MM-DD. Returns true only if
// the date round-trips through Date (e.g. Feb 30 fails) AND is in the past.
export function isValidBornOn(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [y, m, d] = iso.split("-").map((s) => parseInt(s, 10));
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) return false;
  return dt.getTime() < Date.now();
}

// Decompose YYYY-MM-DD back into the three DOB selects (used when seeding
// passenger forms from saved profile / TravelerProfile records).
export function decomposeBornOn(iso: string | null | undefined): { dobYear: string; dobMonth: string; dobDay: string } {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return { dobYear: "", dobMonth: "", dobDay: "" };
  }
  const [y, m, d] = iso.split("-");
  return { dobYear: y, dobMonth: String(parseInt(m, 10)), dobDay: String(parseInt(d, 10)) };
}

export const MONTHS = [
  { v: "1", n: "January" }, { v: "2", n: "February" }, { v: "3", n: "March" },
  { v: "4", n: "April" }, { v: "5", n: "May" }, { v: "6", n: "June" },
  { v: "7", n: "July" }, { v: "8", n: "August" }, { v: "9", n: "September" },
  { v: "10", n: "October" }, { v: "11", n: "November" }, { v: "12", n: "December" },
];

// 1..31 — we don't disable invalid combinations (e.g. Feb 30) because the
// server-side schema and Duffel both reject malformed dates with a clearer
// error than juggling per-month day counts here.
export const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1));

// Year range covers infants born this year through 120-year-old travelers
// (broader than any practical airline ticketing case). Real-calendar +
// past-date validity is enforced separately via isValidBornOn() so we don't
// need to gate Feb 30 / future dates here.
const CURRENT_YEAR = new Date().getFullYear();
export const YEARS = Array.from({ length: 121 }, (_, i) => String(CURRENT_YEAR - i));

// Tailwind class for a native select styled like shadcn Input.
export const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export function emptyPassenger(): PassengerForm {
  return {
    firstName: "",
    middleName: "",
    lastName: "",
    dobMonth: "",
    dobDay: "",
    dobYear: "",
    gender: "",
    title: "mr",
    residenceCountry: "",
    residenceState: "",
    loyaltyProgramme: "",
    loyaltyNumber: "",
    knownTravelerNumber: "",
    knownTravelerCountry: "",
    redressNumber: "",
    redressCountry: "",
    secondaryRedressNumber: "",
    secondaryRedressCountry: "",
  };
}

export function validatePassenger(p: PassengerForm, passportRequired: boolean): PassengerErrors {
  const errs: PassengerErrors = {};
  if (!p.firstName.trim()) errs.firstName = "First name is required";
  if (!p.lastName.trim()) errs.lastName = "Last name is required";
  const dob = composeBornOn(p);
  if (!dob) errs.bornOn = "Date of birth is required";
  else if (!isValidBornOn(dob)) errs.bornOn = "Please enter a valid date of birth";
  if (!p.gender) errs.gender = "Gender is required";
  if (!p.residenceCountry) errs.residenceCountry = "Country / region is required";
  if (hasSubdivisions(p.residenceCountry) && !p.residenceState) {
    errs.residenceState = "State / province is required";
  }
  // KTN / redress pair validation — mirrors the server's superRefine so users
  // can't pass client checks, complete payment, then hit a 400. If a number is
  // present, the issuing country must be too (and vice versa).
  const pair = (
    num: string | undefined,
    country: string | undefined,
    label: string,
  ): string | undefined => {
    const hasNum = !!num?.trim();
    const hasCountry = !!country?.trim();
    if (hasNum && !hasCountry) return `Issuing country is required when ${label} is provided`;
    if (hasCountry && !hasNum) return `${label} is required when issuing country is provided`;
    return undefined;
  };
  const ktnErr = pair(p.knownTravelerNumber, p.knownTravelerCountry, "KTN");
  if (ktnErr) errs.knownTraveler = ktnErr;
  const redressErr = pair(p.redressNumber, p.redressCountry, "Redress number");
  if (redressErr) errs.redress = redressErr;
  const redress2Err = pair(p.secondaryRedressNumber, p.secondaryRedressCountry, "Secondary redress number");
  if (redress2Err) errs.secondaryRedress = redress2Err;
  if (passportRequired) {
    if (!p.passportNumber || !p.passportCountry || !p.passportExpiry) {
      errs.passport = "Passport details are required for this trip";
    }
  }
  return errs;
}

// Serialize a PassengerForm to the wire shape the server's confirm/book
// endpoints expect. Trims strings and only includes optional keys when
// non-empty so the JSON body stays compact.
export function serializePassenger(p: PassengerForm): Record<string, unknown> {
  return {
    firstName: p.firstName.trim(),
    ...(p.middleName?.trim() ? { middleName: p.middleName.trim() } : {}),
    lastName: p.lastName.trim(),
    bornOn: composeBornOn(p),
    gender: p.gender,
    title: p.title,
    residenceCountry: p.residenceCountry,
    ...(p.residenceState ? { residenceState: p.residenceState } : {}),
    ...(p.loyaltyProgramme?.trim() ? { loyaltyProgramme: p.loyaltyProgramme.trim() } : {}),
    ...(p.loyaltyNumber?.trim() ? { loyaltyNumber: p.loyaltyNumber.trim() } : {}),
    ...(p.knownTravelerNumber?.trim() ? { knownTravelerNumber: p.knownTravelerNumber.trim() } : {}),
    ...(p.knownTravelerCountry ? { knownTravelerCountry: p.knownTravelerCountry } : {}),
    ...(p.redressNumber?.trim() ? { redressNumber: p.redressNumber.trim() } : {}),
    ...(p.redressCountry ? { redressCountry: p.redressCountry } : {}),
    ...(p.secondaryRedressNumber?.trim() ? { secondaryRedressNumber: p.secondaryRedressNumber.trim() } : {}),
    ...(p.secondaryRedressCountry ? { secondaryRedressCountry: p.secondaryRedressCountry } : {}),
    ...(p.passportNumber ? { passportNumber: p.passportNumber } : {}),
    ...(p.passportCountry ? { passportCountry: p.passportCountry } : {}),
    ...(p.passportExpiry ? { passportExpiry: p.passportExpiry } : {}),
  };
}
