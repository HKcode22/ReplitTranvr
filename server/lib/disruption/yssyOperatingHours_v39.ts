import { createHash } from "crypto";
import { readFileSync } from "fs";
import type { ProbeTimeClassConfig } from "./probeExecution_v39";

export const PHASE2G_YSSY_LOCAL_OPERATING_HOURS_PROTOCOL_ARTIFACT_PATH =
  "artifacts/phase2g-yssy-local-operating-hours-protocol-freeze-20261003.json";

export interface Phase2gYssyOperatingHoursProtocolV39 {
  schema: "v39.phase2g-yssy-local-operating-hours-protocol.v1";
  status: "FROZEN_PROSPECTIVE_NO_PAID_AUTHORIZATION";
  frozen_at_utc: string;
  target_icao: "YSSY";
  outcome_data_used_to_choose_protocol: false;
  yssy_paid_outcomes_observed_before_freeze: false;
  parent_scope_file: string;
  parent_scope_sha256: string;
  timezone: "Australia/Sydney";
  curfew: {
    start_local: "23:00";
    end_local: "06:00";
    legal_time_basis: string;
    official_department_source: string;
    legislation_source: string;
  };
  dst_reference: {
    nsw_daylight_saving_2026_starts_local: string;
    official_source: string;
  };
  phase6_utc_slot_basis_hours: [0, 4, 8, 12, 16, 20];
  selection_rule: string;
  selected_stage1_utc_slot_hour: 4;
  eligible_start_tolerance_hours: 1;
  target_minutes: 120;
  preferred_start_utc_hhmm: "03:00";
  preferred_window_utc: "03:00-05:00";
  preferred_window_local_aest: "13:00-15:00";
  preferred_window_local_aedt: "14:00-16:00";
  full_eligible_class_local_aest: "13:00-17:00";
  full_eligible_class_local_aedt: "14:00-18:00";
  minimum_curfew_boundary_buffer_minutes_across_aest_aedt_and_full_eligible_class: 300;
  utc_midnight_crossing_for_full_eligible_class: false;
  weekday_rule: {
    local_weekday_required: true;
    utc_weekday_required: true;
    reason: string;
  };
  unchanged_controls: {
    metric_contract_version: "v39-physical-flight-instance-v2";
    capacity_gate_rows_per_hour: 60;
    min_stability_buckets: 6;
    exact_reconciliation_required: true;
    external_settled_spend_authoritative: true;
    delivery_completeness_required: 1;
    stage1_reservation_credits: 450;
    unsettled_burst_margin_credits: 50;
    protected_residual_floor_credits: 1000;
    max_alert_credits: 500;
    deferred_exact_session_cleanup: true;
    independent_github_watchdog: true;
    outcome_driven_stop_forbidden: true;
    automatic_retry_for_yssy: false;
  };
  execution_authorized: false;
  requires_machine_implementation_before_authorization: true;
  requires_full_offline_safety_before_authorization: true;
  requires_fresh_runtime_budget_auth: true;
  requires_fresh_callback_and_runtime_binding: true;
  superseded_identifiers_must_not_be_reused: {
    authorization_id: "AUTH-20261002-P2G19";
    probe_budget_day_id: "P2G-S1-20261002-18";
  };
  next_step: string;
}

function sha256(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

function normalizeSha(value: string): string {
  const out = String(value ?? "").trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(out)) {
    throw new Error("REFUSED_YSSY_PROTOCOL_SHA_INVALID");
  }
  return out;
}

export function loadYssyOperatingHoursProtocolV39(input: {
  expectedSha256: string;
  path?: string;
}): {
  protocol: Phase2gYssyOperatingHoursProtocolV39;
  fileSha256: string;
  path: string;
} {
  const expected = normalizeSha(input.expectedSha256);
  const file =
    input.path ??
    PHASE2G_YSSY_LOCAL_OPERATING_HOURS_PROTOCOL_ARTIFACT_PATH;
  const raw = readFileSync(file, "utf8");
  const actual = sha256(raw);
  if (actual !== expected) {
    throw new Error(
      `REFUSED_YSSY_PROTOCOL_HASH_MISMATCH:expected=${expected}:actual=${actual}`,
    );
  }

  const p = JSON.parse(raw) as Phase2gYssyOperatingHoursProtocolV39;
  if (
    p.schema !== "v39.phase2g-yssy-local-operating-hours-protocol.v1" ||
    p.status !== "FROZEN_PROSPECTIVE_NO_PAID_AUTHORIZATION" ||
    p.target_icao !== "YSSY" ||
    p.outcome_data_used_to_choose_protocol !== false ||
    p.yssy_paid_outcomes_observed_before_freeze !== false ||
    p.parent_scope_sha256 !==
      "3f9d4a55d5cc933726bb045c735935fa90cda85b9e972c745ca9c93feb39932b" ||
    p.timezone !== "Australia/Sydney" ||
    p.curfew?.start_local !== "23:00" ||
    p.curfew?.end_local !== "06:00" ||
    JSON.stringify(p.phase6_utc_slot_basis_hours) !==
      JSON.stringify([0, 4, 8, 12, 16, 20]) ||
    p.selected_stage1_utc_slot_hour !== 4 ||
    p.eligible_start_tolerance_hours !== 1 ||
    p.target_minutes !== 120 ||
    p.minimum_curfew_boundary_buffer_minutes_across_aest_aedt_and_full_eligible_class !==
      300 ||
    p.utc_midnight_crossing_for_full_eligible_class !== false ||
    p.weekday_rule?.local_weekday_required !== true ||
    p.weekday_rule?.utc_weekday_required !== true ||
    p.unchanged_controls?.metric_contract_version !==
      "v39-physical-flight-instance-v2" ||
    p.unchanged_controls?.capacity_gate_rows_per_hour !== 60 ||
    p.unchanged_controls?.min_stability_buckets !== 6 ||
    p.unchanged_controls?.exact_reconciliation_required !== true ||
    p.unchanged_controls?.delivery_completeness_required !== 1 ||
    p.unchanged_controls?.stage1_reservation_credits !== 450 ||
    p.unchanged_controls?.unsettled_burst_margin_credits !== 50 ||
    p.unchanged_controls?.protected_residual_floor_credits !== 1000 ||
    p.unchanged_controls?.max_alert_credits !== 500 ||
    p.unchanged_controls?.outcome_driven_stop_forbidden !== true ||
    p.unchanged_controls?.automatic_retry_for_yssy !== false ||
    p.execution_authorized !== false ||
    p.requires_machine_implementation_before_authorization !== true ||
    p.requires_full_offline_safety_before_authorization !== true ||
    p.requires_fresh_runtime_budget_auth !== true ||
    p.requires_fresh_callback_and_runtime_binding !== true ||
    p.superseded_identifiers_must_not_be_reused?.authorization_id !==
      "AUTH-20261002-P2G19" ||
    p.superseded_identifiers_must_not_be_reused?.probe_budget_day_id !==
      "P2G-S1-20261002-18"
  ) {
    throw new Error("REFUSED_YSSY_PROTOCOL_CONTRACT_INVALID");
  }

  return { protocol: p, fileSha256: actual, path: file };
}

export type ProbeWeekdayClassV39 = "weekday" | "weekend";

function utcWeekdayClass(date: Date): ProbeWeekdayClassV39 {
  const d = date.getUTCDay();
  return d === 0 || d === 6 ? "weekend" : "weekday";
}

export function weekdayClassInTimeZoneV39(
  date: Date,
  timeZone: string,
): ProbeWeekdayClassV39 {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(date);
  return weekday === "Sat" || weekday === "Sun" ? "weekend" : "weekday";
}

function circularHourDistance(a: number, b: number): number {
  const d = Math.abs(a - b);
  return Math.min(d, 24 - d);
}

function localClockMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const hour = Number(parts.find((x) => x.type === "hour")?.value);
  const minute = Number(parts.find((x) => x.type === "minute")?.value);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    throw new Error("REFUSED_YSSY_LOCAL_TIME_UNAVAILABLE");
  }
  return hour * 60 + minute;
}

function inCurfew(minutes: number): boolean {
  return minutes >= 23 * 60 || minutes < 6 * 60;
}

export function yssyStage1TimeClassV39(
  protocol: Phase2gYssyOperatingHoursProtocolV39,
  base: ProbeTimeClassConfig,
): ProbeTimeClassConfig {
  return {
    ...base,
    stage1UtcSlotHour: protocol.selected_stage1_utc_slot_hour,
    stage1WeekdayClass: "weekday",
  };
}

export function yssyStage1TimeClassStatusV39(
  now: Date,
  protocol: Phase2gYssyOperatingHoursProtocolV39,
): {
  eligible: boolean;
  utcWeekdayClass: ProbeWeekdayClassV39;
  localWeekdayClass: ProbeWeekdayClassV39;
  utcSlotDistanceHours: number;
  utcSlotEligible: boolean;
  localWeekdayEligible: boolean;
  utcWeekdayEligible: boolean;
  targetWindowOutsideCurfew: boolean;
} {
  const utcClass = utcWeekdayClass(now);
  const localClass = weekdayClassInTimeZoneV39(now, protocol.timezone);
  const hour =
    now.getUTCHours() +
    now.getUTCMinutes() / 60 +
    now.getUTCSeconds() / 3600;
  const distance = circularHourDistance(
    hour,
    protocol.selected_stage1_utc_slot_hour,
  );
  const utcSlotEligible =
    distance <= protocol.eligible_start_tolerance_hours;

  const samples: Date[] = [];
  for (
    let minutes = 0;
    minutes <= protocol.target_minutes;
    minutes += 15
  ) {
    samples.push(new Date(now.getTime() + minutes * 60_000));
  }

  const targetWindowOutsideCurfew = samples.every(
    (x) => !inCurfew(localClockMinutes(x, protocol.timezone)),
  );
  const localWeekdayEligible = samples.every(
    (x) =>
      weekdayClassInTimeZoneV39(x, protocol.timezone) === "weekday",
  );
  const utcWeekdayEligible = utcClass === "weekday";

  return {
    eligible:
      utcWeekdayEligible &&
      localWeekdayEligible &&
      utcSlotEligible &&
      targetWindowOutsideCurfew,
    utcWeekdayClass: utcClass,
    localWeekdayClass: localClass,
    utcSlotDistanceHours: distance,
    utcSlotEligible,
    localWeekdayEligible,
    utcWeekdayEligible,
    targetWindowOutsideCurfew,
  };
}

export function assertYssyStage1StartV39(
  now: Date,
  protocol: Phase2gYssyOperatingHoursProtocolV39,
): void {
  const s = yssyStage1TimeClassStatusV39(now, protocol);
  if (!s.eligible) {
    throw new Error(
      `REFUSED_YSSY_LOCAL_TIME_CLASS:utc_weekday=${s.utcWeekdayClass}:local_weekday=${s.localWeekdayClass}:slot_distance=${s.utcSlotDistanceHours.toFixed(3)}:outside_curfew=${s.targetWindowOutsideCurfew}`,
    );
  }
}
