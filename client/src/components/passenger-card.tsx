import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CountryCombobox } from "@/components/country-combobox";
import { STATES_BY_COUNTRY } from "@/lib/countries";
import {
  type PassengerForm,
  type PassengerErrors,
  validatePassenger,
  MONTHS,
  DAYS,
  YEARS,
  SELECT_CLASS,
} from "@/lib/passenger-form";

function RequiredDot() {
  return <span className="text-red-500 ml-0.5" aria-hidden>•</span>;
}

// PassengerCard renders the standard airline-style passenger form. Layout
// mirrors the AA reference: required-field legend at the top, a 3-column
// First/Middle/Last row, Month/Day/Year DOB selects, a Gender + Country row
// with a State select that enables only when the country has subdivisions, a
// loyalty row, and a collapsible "Secure traveler information" section for
// KTN + redress (with an "Add secondary redress number" affordance). The
// passport section is only rendered when Duffel marks the offer as
// identity-document-required.
export function PassengerCard({
  idx,
  passenger,
  passportRequired,
  showAllErrors,
  accentColor = "#2d7abf",
  onChange,
}: {
  idx: number;
  passenger: PassengerForm;
  passportRequired: boolean;
  showAllErrors: boolean;
  accentColor?: string;
  onChange: (updater: (prev: PassengerForm) => PassengerForm) => void;
}) {
  const errors = validatePassenger(passenger, passportRequired);
  // Auto-open the secure traveler section whenever a pair-validation error
  // exists in it AND the user has attempted submit (showAllErrors), so the
  // user can immediately see the inline message instead of only the toast.
  const hasSecureError = !!(errors.knownTraveler || errors.redress || errors.secondaryRedress);
  const [secureOpen, setSecureOpen] = useState(false);
  useEffect(() => {
    if (showAllErrors && hasSecureError) setSecureOpen(true);
  }, [showAllErrors, hasSecureError]);
  const [showSecondaryRedress, setShowSecondaryRedress] = useState(
    !!passenger.secondaryRedressNumber,
  );
  // Errors are only surfaced inline when a field has been touched (reduces
  // noise on first render) OR when the parent passes showAllErrors=true after
  // a submit attempt — in which case every required-field error is revealed
  // across every passenger card at once.
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const touch = (k: string) => setTouched((t) => (t[k] ? t : { ...t, [k]: true }));
  const showError = (k: keyof PassengerErrors) => (touched[k] || showAllErrors) && !!errors[k];

  const set = <K extends keyof PassengerForm>(key: K, value: PassengerForm[K]) => {
    onChange((prev) => ({ ...prev, [key]: value }));
  };

  const states = passenger.residenceCountry
    ? STATES_BY_COUNTRY[passenger.residenceCountry] || []
    : [];
  const stateEnabled = states.length > 0;

  const errorClass = (key: keyof PassengerErrors) =>
    showError(key) ? "border-red-400 focus-visible:ring-red-400" : "";

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-base font-semibold text-gray-900">Passenger {idx + 1}</h3>
        <span className="text-xs text-gray-500">
          <RequiredDot /> required
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Enter name as printed on government-issued photo ID.
      </p>

      {/* Name row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div>
          <Label htmlFor={`p-${idx}-first`}>
            First name<RequiredDot />
          </Label>
          <Input
            id={`p-${idx}-first`}
            value={passenger.firstName}
            onChange={(e) => set("firstName", e.target.value)}
            onBlur={() => touch("firstName")}
            className={errorClass("firstName")}
            data-testid={`input-pax-first-${idx}`}
            autoComplete="given-name"
          />
          {showError("firstName") && (
            <p className="text-xs text-red-600 mt-1">{errors.firstName}</p>
          )}
        </div>
        <div>
          <Label htmlFor={`p-${idx}-middle`}>Middle name (optional)</Label>
          <Input
            id={`p-${idx}-middle`}
            value={passenger.middleName || ""}
            onChange={(e) => set("middleName", e.target.value)}
            data-testid={`input-pax-middle-${idx}`}
            autoComplete="additional-name"
          />
        </div>
        <div>
          <Label htmlFor={`p-${idx}-last`}>
            Last name<RequiredDot />
          </Label>
          <Input
            id={`p-${idx}-last`}
            value={passenger.lastName}
            onChange={(e) => set("lastName", e.target.value)}
            onBlur={() => touch("lastName")}
            className={errorClass("lastName")}
            data-testid={`input-pax-last-${idx}`}
            autoComplete="family-name"
          />
          {showError("lastName") && (
            <p className="text-xs text-red-600 mt-1">{errors.lastName}</p>
          )}
        </div>
      </div>

      {/* Date of birth — Month / Day / Year selects (AA reference) */}
      <div className="mb-4">
        <Label>
          Date of birth<RequiredDot />
        </Label>
        <div className="grid grid-cols-3 gap-3 mt-1">
          <select
            aria-label="Birth month"
            className={`${SELECT_CLASS} ${showError("bornOn") ? "border-red-400" : ""}`}
            value={passenger.dobMonth}
            onChange={(e) => set("dobMonth", e.target.value)}
            onBlur={() => touch("bornOn")}
            data-testid={`select-pax-dob-month-${idx}`}
          >
            <option value="">Month</option>
            {MONTHS.map((m) => (
              <option key={m.v} value={m.v}>{m.n}</option>
            ))}
          </select>
          <select
            aria-label="Birth day"
            className={`${SELECT_CLASS} ${showError("bornOn") ? "border-red-400" : ""}`}
            value={passenger.dobDay}
            onChange={(e) => set("dobDay", e.target.value)}
            onBlur={() => touch("bornOn")}
            data-testid={`select-pax-dob-day-${idx}`}
          >
            <option value="">Day</option>
            {DAYS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select
            aria-label="Birth year"
            className={`${SELECT_CLASS} ${showError("bornOn") ? "border-red-400" : ""}`}
            value={passenger.dobYear}
            onChange={(e) => set("dobYear", e.target.value)}
            onBlur={() => touch("bornOn")}
            data-testid={`select-pax-dob-year-${idx}`}
          >
            <option value="">Year</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        {showError("bornOn") && (
          <p className="text-xs text-red-600 mt-1">{errors.bornOn}</p>
        )}
      </div>

      {/* Gender + Title */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          <Label htmlFor={`p-${idx}-gender`}>
            Gender<RequiredDot />
          </Label>
          <select
            id={`p-${idx}-gender`}
            className={`${SELECT_CLASS} ${errorClass("gender")}`}
            value={passenger.gender}
            onChange={(e) => set("gender", e.target.value as PassengerForm["gender"])}
            onBlur={() => touch("gender")}
            data-testid={`select-pax-gender-${idx}`}
          >
            <option value="">Select gender</option>
            <option value="m">Male</option>
            <option value="f">Female</option>
            <option value="x">Non-binary / X</option>
            <option value="u">Prefer not to say</option>
          </select>
          {showError("gender") && (
            <p className="text-xs text-red-600 mt-1">{errors.gender}</p>
          )}
        </div>
        <div>
          <Label htmlFor={`p-${idx}-title`}>Title</Label>
          <select
            id={`p-${idx}-title`}
            className={SELECT_CLASS}
            value={passenger.title}
            onChange={(e) => set("title", e.target.value as PassengerForm["title"])}
            data-testid={`select-pax-title-${idx}`}
          >
            <option value="mr">Mr</option>
            <option value="ms">Ms</option>
            <option value="mrs">Mrs</option>
            <option value="miss">Miss</option>
            <option value="dr">Dr</option>
          </select>
        </div>
      </div>

      {/* Country / region of residence + State */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          <Label htmlFor={`p-${idx}-residence-country`}>
            Country / region of residence<RequiredDot />
          </Label>
          <CountryCombobox
            value={passenger.residenceCountry}
            onChange={(code) => {
              touch("residenceCountry");
              onChange((prev) => ({
                ...prev,
                residenceCountry: code,
                residenceState: "",
              }));
            }}
            ariaLabel="Country or region of residence"
            testId={`select-pax-residence-country-${idx}`}
            hasError={showError("residenceCountry")}
          />
          {showError("residenceCountry") && (
            <p className="text-xs text-red-600 mt-1">{errors.residenceCountry}</p>
          )}
        </div>
        <div>
          <Label htmlFor={`p-${idx}-residence-state`}>
            State / province{stateEnabled && <RequiredDot />}
          </Label>
          <select
            id={`p-${idx}-residence-state`}
            className={`${SELECT_CLASS} ${errorClass("residenceState")}`}
            value={passenger.residenceState || ""}
            onChange={(e) => set("residenceState", e.target.value)}
            onBlur={() => touch("residenceState")}
            disabled={!stateEnabled}
            data-testid={`select-pax-residence-state-${idx}`}
          >
            <option value="">{stateEnabled ? "Select a state / province" : "—"}</option>
            {states.map((s) => (
              <option key={s.code} value={s.code}>{s.name}</option>
            ))}
          </select>
          {showError("residenceState") && (
            <p className="text-xs text-red-600 mt-1">{errors.residenceState}</p>
          )}
        </div>
      </div>

      {/* Loyalty programme (optional) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          <Label htmlFor={`p-${idx}-loyalty-prog`}>Loyalty program (optional)</Label>
          <Input
            id={`p-${idx}-loyalty-prog`}
            value={passenger.loyaltyProgramme || ""}
            onChange={(e) => set("loyaltyProgramme", e.target.value)}
            placeholder="e.g. AAdvantage"
            data-testid={`input-pax-loyalty-prog-${idx}`}
          />
        </div>
        <div>
          <Label htmlFor={`p-${idx}-loyalty-num`}>Loyalty number (optional)</Label>
          <Input
            id={`p-${idx}-loyalty-num`}
            value={passenger.loyaltyNumber || ""}
            onChange={(e) => set("loyaltyNumber", e.target.value)}
            data-testid={`input-pax-loyalty-num-${idx}`}
          />
        </div>
      </div>

      {/* Secure traveler information (collapsible) */}
      <div className="border-t border-gray-200 pt-3">
        <button
          type="button"
          onClick={() => setSecureOpen((v) => !v)}
          className="text-sm font-medium text-gray-800 hover:text-gray-900 focus:outline-none"
          data-testid={`button-pax-secure-toggle-${idx}`}
          aria-expanded={secureOpen}
        >
          {secureOpen ? "− " : "+ "}Secure traveler information (optional)
        </button>
        {secureOpen && (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor={`p-${idx}-ktn`}>Known Traveler Number (KTN)</Label>
                <Input
                  id={`p-${idx}-ktn`}
                  value={passenger.knownTravelerNumber || ""}
                  onChange={(e) => set("knownTravelerNumber", e.target.value)}
                  data-testid={`input-pax-ktn-${idx}`}
                />
              </div>
              <div>
                <Label htmlFor={`p-${idx}-ktn-country`}>KTN issuing country</Label>
                <CountryCombobox
                  value={passenger.knownTravelerCountry || ""}
                  onChange={(code) => set("knownTravelerCountry", code)}
                  ariaLabel="KTN issuing country"
                  testId={`select-pax-ktn-country-${idx}`}
                  hasError={showAllErrors && !!errors.knownTraveler}
                />
              </div>
            </div>
            {showAllErrors && errors.knownTraveler && (
              <p className="text-xs text-red-600" data-testid={`error-pax-ktn-${idx}`}>{errors.knownTraveler}</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor={`p-${idx}-redress`}>Redress number</Label>
                <Input
                  id={`p-${idx}-redress`}
                  value={passenger.redressNumber || ""}
                  onChange={(e) => set("redressNumber", e.target.value)}
                  data-testid={`input-pax-redress-${idx}`}
                />
              </div>
              <div>
                <Label htmlFor={`p-${idx}-redress-country`}>Redress issuing country</Label>
                <CountryCombobox
                  value={passenger.redressCountry || ""}
                  onChange={(code) => set("redressCountry", code)}
                  ariaLabel="Redress issuing country"
                  testId={`select-pax-redress-country-${idx}`}
                  hasError={showAllErrors && !!errors.redress}
                />
              </div>
            </div>
            {showAllErrors && errors.redress && (
              <p className="text-xs text-red-600" data-testid={`error-pax-redress-${idx}`}>{errors.redress}</p>
            )}
            {!showSecondaryRedress ? (
              <button
                type="button"
                onClick={() => setShowSecondaryRedress(true)}
                className="text-sm font-medium hover:underline focus:outline-none"
                style={{ color: accentColor }}
                data-testid={`button-pax-add-secondary-redress-${idx}`}
              >
                + Add secondary redress number
              </button>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor={`p-${idx}-redress2`}>Secondary redress number</Label>
                  <Input
                    id={`p-${idx}-redress2`}
                    value={passenger.secondaryRedressNumber || ""}
                    onChange={(e) => set("secondaryRedressNumber", e.target.value)}
                    data-testid={`input-pax-redress2-${idx}`}
                  />
                </div>
                <div>
                  <Label htmlFor={`p-${idx}-redress2-country`}>Issuing country</Label>
                  <CountryCombobox
                    value={passenger.secondaryRedressCountry || ""}
                    onChange={(code) => set("secondaryRedressCountry", code)}
                    ariaLabel="Secondary redress issuing country"
                    testId={`select-pax-redress2-country-${idx}`}
                    hasError={showAllErrors && !!errors.secondaryRedress}
                  />
                </div>
              </div>
            )}
            {showAllErrors && errors.secondaryRedress && (
              <p className="text-xs text-red-600" data-testid={`error-pax-redress2-${idx}`}>{errors.secondaryRedress}</p>
            )}
          </div>
        )}
      </div>

      {/* Passport section — only when Duffel marks the offer as identity-doc-required */}
      {passportRequired && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <p className="text-xs font-medium text-gray-700 mb-2">
            This flight requires passport details for every passenger.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label htmlFor={`p-${idx}-passport-num`}>
                Passport number<RequiredDot />
              </Label>
              <Input
                id={`p-${idx}-passport-num`}
                value={passenger.passportNumber || ""}
                onChange={(e) => set("passportNumber", e.target.value)}
                onBlur={() => touch("passport")}
                className={errorClass("passport")}
                data-testid={`input-pax-passport-num-${idx}`}
              />
            </div>
            <div>
              <Label htmlFor={`p-${idx}-passport-country`}>
                Issuing country<RequiredDot />
              </Label>
              <CountryCombobox
                value={passenger.passportCountry || ""}
                onChange={(code) => {
                  touch("passport");
                  set("passportCountry", code);
                }}
                ariaLabel="Passport issuing country"
                testId={`select-pax-passport-country-${idx}`}
                hasError={showError("passport")}
              />
            </div>
            <div>
              <Label htmlFor={`p-${idx}-passport-expiry`}>
                Expiry date<RequiredDot />
              </Label>
              <Input
                id={`p-${idx}-passport-expiry`}
                type="date"
                value={passenger.passportExpiry || ""}
                onChange={(e) => set("passportExpiry", e.target.value)}
                onBlur={() => touch("passport")}
                className={errorClass("passport")}
                data-testid={`input-pax-passport-expiry-${idx}`}
              />
            </div>
          </div>
          {showError("passport") && (
            <p className="text-xs text-red-600 mt-2">{errors.passport}</p>
          )}
        </div>
      )}
    </div>
  );
}
