import sgMail from "@sendgrid/mail";
import { eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import {
  flightTravelers as tFlightTravelers,
  type AgencyAccount,
  type FlightTraveler,
  type MonitoredFlight,
} from "@shared/schema";
import type { AlternativeOption } from "./alternativeFinder";
import type { RiskScoreResult } from "./riskScorer";
import type { FlightStatusResult } from "./flightStatus";
import { sendSms } from "../sms";

const BRAND_BLUE = "#2d7abf";
const TEXT_DARK = "#1a1a2e";
const DANGER_RED = "#dc2626";
const WARNING_AMBER = "#f59e0b";

function escapeHtml(s: string): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!),
  );
}

function brandHeader(): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
      <tr>
        <td align="center" style="padding:0 0 24px;">
          <h1 style="color:${BRAND_BLUE};font-size:28px;margin:0;letter-spacing:-0.5px;font-family:'Helvetica Neue',Arial,sans-serif;">Travnr</h1>
        </td>
      </tr>
    </table>`;
}

function brandFooterFor(agencyName: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
      <tr>
        <td align="center" style="padding:16px 0 0;color:#999;font-size:12px;font-family:'Helvetica Neue',Arial,sans-serif;">
          This alert was sent by Travnr on behalf of ${escapeHtml(agencyName)}.<br/>
          Travnr &middot; hello@travnr.com
        </td>
      </tr>
    </table>`;
}

function ctaButton(href: string, label: string, color: string = BRAND_BLUE): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;display:inline-block;margin:0 6px 6px 0;">
      <tr>
        <td align="center" style="padding:0;">
          <a href="${href}" style="background-color:${color};color:#ffffff;padding:10px 20px;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;display:inline-block;font-family:'Helvetica Neue',Arial,sans-serif;">${escapeHtml(label)}</a>
        </td>
      </tr>
    </table>`;
}

function getBaseUrl(): string {
  if (process.env.APP_BASE_URL) return String(process.env.APP_BASE_URL).replace(/\/$/, "");
  return "https://travnr.com";
}

function disruptionReason(risk: RiskScoreResult | null | undefined, _flight: MonitoredFlight): string {
  if (risk?.cancelled) return "flight cancelled";
  if (risk?.score && risk.score >= 80) return "significant delay";
  return "high delay risk";
}

function buildWhyText(risk: RiskScoreResult | null | undefined, flight: MonitoredFlight): string {
  if (!risk) {
    return `Our monitoring system flagged your flight ${escapeHtml(flight.flightNumber)} as at risk of disruption.`;
  }
  const parts: Array<{ label: string; points: number }> = [
    { label: `aircraft inbound delay`, points: risk.signals.inboundAircraftDelay },
    { label: `weather at ${flight.originIata}`, points: risk.signals.originWeather },
    { label: `weather at ${flight.destinationIata}`, points: risk.signals.destinationWeather },
    { label: `time of day`, points: risk.signals.timeOfDayRisk },
    { label: `historical late-day risk`, points: risk.signals.historicalRisk },
  ];
  parts.sort((a, b) => b.points - a.points);
  const top = parts.slice(0, 2).filter((p) => p.points > 0);

  const phrases: string[] = [];
  if (risk.cancelled) {
    phrases.push(`Your flight ${escapeHtml(flight.flightNumber)} has been cancelled.`);
  }
  if (risk.flightStatus && risk.flightStatus.inboundDelayMinutes > 0) {
    phrases.push(
      `The aircraft operating your flight is currently delayed by ${risk.flightStatus.inboundDelayMinutes} minutes on its inbound leg.`,
    );
  }
  if (risk.originWeather && risk.originWeather.hasThunderstorm) {
    phrases.push(`A thunderstorm system is affecting ${flight.originIata}.`);
  } else if (risk.originWeather && (risk.originWeather.flightCategory === "IFR" || risk.originWeather.flightCategory === "LIFR")) {
    phrases.push(`Low visibility / low ceiling conditions are affecting ${flight.originIata}.`);
  }
  if (risk.destinationWeather && risk.destinationWeather.hasThunderstorm) {
    phrases.push(`A thunderstorm system is affecting ${flight.destinationIata}.`);
  }

  if (phrases.length === 0 && top.length > 0) {
    phrases.push(
      `Our top risk signals right now are ${top.map((p) => p.label).join(" and ")}.`,
    );
  }
  if (phrases.length === 0) {
    phrases.push(
      `Our monitoring system has flagged a high probability of disruption on your flight.`,
    );
  }
  return phrases.join(" ");
}

function tierBadge(tier: string): string {
  const isGreen = tier === "green";
  const color = isGreen ? "#10b981" : "#f59e0b";
  const label = isGreen ? "Low Risk" : "Moderate Risk";
  return `
    <span style="display:inline-block;padding:4px 10px;background:${color}1a;color:${color};border-radius:999px;font-size:12px;font-weight:600;">
      <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:6px;vertical-align:middle;"></span>${label}
    </span>`;
}

function altCard(
  alt: AlternativeOption,
  flight: MonitoredFlight,
  travelerSelectionToken: string | null,
  baseUrl: string,
): string {
  const travelerQs = travelerSelectionToken
    ? `?t=${encodeURIComponent(travelerSelectionToken)}`
    : "";
  const selectUrl = `${baseUrl}/api/disruption/select/${encodeURIComponent(alt.selectionToken)}${travelerQs}`;
  const detailUrl = travelerSelectionToken
    ? `${baseUrl}/disruption/${encodeURIComponent(travelerSelectionToken)}?highlight=${encodeURIComponent(alt.selectionToken)}`
    : `${baseUrl}/disruption/confirmed?flight=${encodeURIComponent(flight.flightNumber)}`;
  const stopsLabel = alt.stops === 0 ? "Nonstop" : `${alt.stops} stop${alt.stops > 1 ? "s" : ""}`;
  const durationLabel =
    alt.durationMinutes && Number.isFinite(alt.durationMinutes)
      ? `${Math.floor(alt.durationMinutes / 60)}h ${alt.durationMinutes % 60}m`
      : "—";

  return `
    <div style="border:1px solid #e5e7eb;border-radius:10px;padding:18px 20px;margin-bottom:14px;background:#ffffff;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div style="font-size:15px;color:${TEXT_DARK};font-weight:600;">${escapeHtml(alt.carrierName || alt.carrierIata)} ${escapeHtml(alt.flightNumber)}</div>
        <div>${tierBadge(alt.riskTier)}</div>
      </div>
      <div style="font-size:14px;color:#374151;line-height:1.6;">
        <strong>${escapeHtml(alt.departureTime)}</strong> &rarr; <strong>${escapeHtml(alt.arrivalTime)}</strong><br/>
        <span style="color:#6b7280;">${escapeHtml(durationLabel)} &middot; ${escapeHtml(stopsLabel)} &middot; ${escapeHtml(alt.price)}</span>
      </div>
      <div style="margin-top:14px;">
        ${ctaButton(selectUrl, "Select this flight", "#10b981")}
        ${ctaButton(detailUrl, "View details", "#6b7280")}
      </div>
    </div>`;
}

function buildTravelerEmailHtml(
  flight: MonitoredFlight,
  travelersForEmail: FlightTraveler[],
  alternatives: AlternativeOption[],
  agency: AgencyAccount,
  risk: RiskScoreResult | null | undefined,
): { subject: string; html: string } {
  const baseUrl = getBaseUrl();
  const reason = disruptionReason(risk, flight);
  const subject = `Action needed: Flight ${flight.flightNumber} on ${flight.departureDate} — ${reason}`;
  const statusLabel = risk?.cancelled ? "has been cancelled" : `is at ${reason}`;
  const why = buildWhyText(risk, flight);

  // The shared inbox sees one email; the CTAs each carry an individual
  // traveler's selectionToken so we know who clicked. Use the first traveler's
  // token for the "Keep my original" link (the first one to click locks it in
  // for everyone on the booking).
  const primaryToken = travelersForEmail[0]?.selectionToken || null;
  const keepUrl = primaryToken
    ? `${baseUrl}/api/disruption/keep/${encodeURIComponent(primaryToken)}`
    : `${baseUrl}/disruption/confirmed?kept=true&flight=${encodeURIComponent(flight.flightNumber)}`;

  const altsBlock = alternatives.length > 0
    ? `
      <h3 style="font-size:16px;color:${TEXT_DARK};margin:24px 0 12px;">Here ${alternatives.length === 1 ? "is" : "are"} ${alternatives.length} alternative flight${alternatives.length === 1 ? "" : "s"} we found — all confirmed low disruption risk:</h3>
      ${alternatives.map((a) => altCard(a, flight, primaryToken, baseUrl)).join("")}
    `
    : `
      <div style="border:1px dashed #d1d5db;border-radius:8px;padding:14px 16px;color:#6b7280;font-size:14px;margin:18px 0;">
        We could not find a low-risk alternative right now. Your travel agent <strong>${escapeHtml(agency.name)}</strong> has been notified and will reach out to you directly.
      </div>
    `;

  const greeting = travelersForEmail.length === 1
    ? `Hi ${escapeHtml(travelersForEmail[0].travelerName)},`
    : `Hi ${travelersForEmail.map((t) => escapeHtml(t.travelerName)).join(", ")},`;

  const html = `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 20px;background:#f9fafb;">
      ${brandHeader()}
      <div style="background:${DANGER_RED};color:#ffffff;padding:18px 20px;border-radius:10px 10px 0 0;">
        <div style="font-size:18px;font-weight:700;">Flight ${escapeHtml(flight.flightNumber)} from ${escapeHtml(flight.originIata)} to ${escapeHtml(flight.destinationIata)} on ${escapeHtml(flight.departureDate)} ${escapeHtml(statusLabel)}.</div>
      </div>
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 10px 10px;">
        <p style="color:${TEXT_DARK};font-size:15px;margin:0 0 14px;">${greeting}</p>
        <h2 style="font-size:18px;color:${TEXT_DARK};margin:0 0 10px;">What's happening</h2>
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 12px;">${escapeHtml(why)}</p>
        ${altsBlock}
        <div style="margin:20px 0 8px;padding:14px 16px;border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb;">
          <div style="color:${TEXT_DARK};font-size:14px;margin-bottom:8px;">Prefer to keep your original flight?</div>
          ${ctaButton(keepUrl, "Keep my original flight →", BRAND_BLUE)}
        </div>
        <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:18px 0 0;">
          Your travel agent <strong>${escapeHtml(agency.name)}</strong> will handle the rebooking if you select an alternative. You will not be charged anything extra.
        </p>
      </div>
      ${brandFooterFor(agency.name)}
    </div>`;

  return { subject, html };
}

function buildAgencyEmailHtml(
  flight: MonitoredFlight,
  traveler: FlightTraveler,
  selected: AlternativeOption,
  agency: AgencyAccount,
): { subject: string; html: string } {
  const subject = `${traveler.travelerName} selected an alternative for ${flight.flightNumber}`;
  const baseUrl = getBaseUrl();
  const resolveUrl = `${baseUrl}/agency/dashboard`;

  const html = `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:620px;margin:0 auto;padding:32px 20px;">
      ${brandHeader()}
      <h2 style="font-size:20px;color:${TEXT_DARK};margin:0 0 12px;">A traveler selected an alternative flight</h2>
      <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 18px;">
        <strong>${escapeHtml(traveler.travelerName)}</strong> selected a new flight for your monitored booking. Please complete the rebooking with the airline.
      </p>

      <table style="width:100%;border-collapse:collapse;font-size:14px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:18px;">
        <tr>
          <td style="padding:14px 18px;background:#f9fafb;color:#6b7280;width:40%;border-bottom:1px solid #e5e7eb;">Original flight</td>
          <td style="padding:14px 18px;color:${TEXT_DARK};border-bottom:1px solid #e5e7eb;"><strong>${escapeHtml(flight.flightNumber)}</strong> · ${escapeHtml(flight.originIata)} → ${escapeHtml(flight.destinationIata)} · ${escapeHtml(flight.departureDate)}</td>
        </tr>
        <tr>
          <td style="padding:14px 18px;background:#f9fafb;color:#6b7280;border-bottom:1px solid #e5e7eb;">Selected alternative</td>
          <td style="padding:14px 18px;color:${TEXT_DARK};border-bottom:1px solid #e5e7eb;">
            <strong>${escapeHtml(selected.carrierName || selected.carrierIata)} ${escapeHtml(selected.flightNumber)}</strong><br/>
            ${escapeHtml(selected.departureTime)} → ${escapeHtml(selected.arrivalTime)}<br/>
            <span style="color:#6b7280;">${escapeHtml(selected.price)} &middot; ${selected.stops === 0 ? "Nonstop" : `${selected.stops} stop${selected.stops > 1 ? "s" : ""}`}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 18px;background:#f9fafb;color:#6b7280;">Traveler</td>
          <td style="padding:14px 18px;color:${TEXT_DARK};">
            ${escapeHtml(traveler.travelerName)}<br/>
            ${escapeHtml(traveler.travelerEmail)}${traveler.travelerPhone ? `<br/>${escapeHtml(traveler.travelerPhone)}` : ""}
          </td>
        </tr>
      </table>

      ${ctaButton(resolveUrl, "Open dashboard", BRAND_BLUE)}

      <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:24px 0 0;">
        The Travnr Disruption System
      </p>
    </div>`;

  return { subject, html };
}

const ADMIN_FROM = process.env.SENDGRID_FROM_EMAIL || "hello@travnr.com";

let sendgridConfigured = false;
function ensureSendgrid(): boolean {
  if (sendgridConfigured) return true;
  const key = process.env.SENDGRID_API_KEY;
  if (!key) return false;
  try {
    sgMail.setApiKey(key);
    sendgridConfigured = true;
    return true;
  } catch (err: any) {
    console.warn("[alertSender] failed to configure SendGrid:", err?.message || err);
    return false;
  }
}

export async function sendTravelerAlert(
  flight: MonitoredFlight,
  travelers: FlightTraveler[],
  alternatives: AlternativeOption[],
  agency: AgencyAccount,
  risk?: RiskScoreResult | null,
): Promise<void> {
  if (travelers.length === 0) {
    console.warn(`[alertSender] no travelers to alert for flight_id=${flight.id}`);
    return;
  }

  // Group travelers by lowercased email so one inbox gets one email even if a
  // booking lists the same address twice with different display names.
  const byEmail = new Map<string, FlightTraveler[]>();
  for (const t of travelers) {
    const key = t.travelerEmail.trim().toLowerCase();
    const list = byEmail.get(key) || [];
    list.push(t);
    byEmail.set(key, list);
  }

  const sgReady = ensureSendgrid();
  const successfullyAlertedIds: number[] = [];

  for (const group of Array.from(byEmail.values())) {
    const { subject, html } = buildTravelerEmailHtml(flight, group, alternatives, agency, risk);
    const recipient = group[0].travelerEmail;

    if (!sgReady) {
      console.warn(
        `[alertSender] SENDGRID_API_KEY missing — would have sent traveler alert to ${recipient} (${group.length} traveler${group.length > 1 ? "s" : ""})`,
      );
    } else {
      try {
        await sgMail.send({
          to: recipient,
          from: { email: ADMIN_FROM, name: `Travnr for ${agency.name}` },
          subject,
          html,
        });
        console.log(
          `[alertSender] traveler alert sent flight_id=${flight.id} email=${recipient} count=${group.length}`,
        );
        for (const t of group) successfullyAlertedIds.push(t.id);
      } catch (err: any) {
        console.error("[alertSender] traveler email send failed:", err?.message || err);
        continue;
      }
    }

    // SMS goes per-traveler (one phone per row) regardless of email grouping.
    if (process.env.SMS_ENABLED === "true") {
      for (const t of group) {
        if (!t.travelerPhone) continue;
        const smsBody = `Travnr alert for ${agency.name}: Your flight ${flight.flightNumber} on ${flight.departureDate} is at risk. Check your email for alternatives.`;
        try {
          await sendSms({ to: t.travelerPhone, body: smsBody });
        } catch (err: any) {
          console.warn("[alertSender] traveler SMS failed:", err?.message || err);
        }
      }
    }
  }

  if (successfullyAlertedIds.length > 0) {
    await db
      .update(tFlightTravelers)
      .set({ alertSentAt: new Date() })
      .where(inArray(tFlightTravelers.id, successfullyAlertedIds));
  }
}

// ===========================================================================
// CONFIRMATION ALERT
// Fires AFTER AeroDataBox confirms an actual delay/cancellation. This is
// independent of the predictive risk-score alert (sendTravelerAlert), and
// both can fire for the same booking — the predictive one first when risk
// crosses red, the confirmation one once the disruption is real.
// ===========================================================================

function formatRevisedDeparture(raw: string | null | undefined): string {
  if (!raw) return "the original time";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  try {
    return d.toLocaleString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZoneName: "short",
    });
  } catch {
    return raw;
  }
}

function buildConfirmationTravelerEmail(
  flight: MonitoredFlight,
  travelersForEmail: FlightTraveler[],
  flightStatus: FlightStatusResult | null,
  agency: AgencyAccount,
): { subject: string; html: string } {
  const cancelled = !!flightStatus?.cancelled;
  const delayMins = Math.max(0, Number(flightStatus?.delayMinutes || 0));
  const greeting = travelersForEmail.length === 1
    ? `Hi ${escapeHtml(travelersForEmail[0].travelerName)},`
    : `Hi ${travelersForEmail.map((t) => escapeHtml(t.travelerName)).join(", ")},`;

  let subject: string;
  let bannerColor: string;
  let bannerText: string;
  let body: string;

  if (cancelled) {
    subject = `Your flight ${flight.flightNumber} has been cancelled`;
    bannerColor = DANGER_RED;
    bannerText = `Your flight ${escapeHtml(flight.flightNumber)} from ${escapeHtml(flight.originIata)} to ${escapeHtml(flight.destinationIata)} has been cancelled by the airline.`;
    body = `Your travel agent <strong>${escapeHtml(agency.name)}</strong> has been notified and is working on alternatives for you. You do not need to call the airline — your agent will handle the rebooking.`;
  } else {
    subject = `Your flight ${flight.flightNumber} is delayed — ${delayMins} minutes`;
    bannerColor = WARNING_AMBER;
    bannerText = `Your flight ${escapeHtml(flight.flightNumber)} is currently delayed by ${delayMins} minutes.`;
    const revised = escapeHtml(formatRevisedDeparture(flightStatus?.departureTime || null));
    body = `Your updated departure time is approximately <strong>${revised}</strong>. Your travel agent <strong>${escapeHtml(agency.name)}</strong> has been notified.`;
    if (delayMins >= 60) {
      body += `<br/><br/>If you would like to explore alternative flights, reply to this email or contact your travel agent directly.`;
    }
  }

  const html = `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 20px;background:#f9fafb;">
      ${brandHeader()}
      <div style="background:${bannerColor};color:#ffffff;padding:18px 20px;border-radius:10px 10px 0 0;">
        <div style="font-size:18px;font-weight:700;">${bannerText}</div>
      </div>
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 10px 10px;">
        <p style="color:${TEXT_DARK};font-size:15px;margin:0 0 14px;">${greeting}</p>
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0;">${body}</p>
      </div>
      ${brandFooterFor(agency.name)}
    </div>`;

  return { subject, html };
}

function buildConfirmationAgencyEmail(
  flight: MonitoredFlight,
  travelers: FlightTraveler[],
  flightStatus: FlightStatusResult | null,
  agency: AgencyAccount,
): { subject: string; html: string } {
  const cancelled = !!flightStatus?.cancelled;
  const delayMins = Math.max(0, Number(flightStatus?.delayMinutes || 0));
  const statusLabel = cancelled ? "cancelled" : `delayed ${delayMins}min`;
  const subject = `Confirmed disruption — ${flight.flightNumber} ${statusLabel}`;
  const baseUrl = getBaseUrl();
  const resolveUrl = `${baseUrl}/agency/dashboard`;

  const travelerRows = travelers
    .map((t) => `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;color:${TEXT_DARK};font-size:14px;">
          <strong>${escapeHtml(t.travelerName)}</strong><br/>
          <span style="color:#6b7280;">${escapeHtml(t.travelerEmail)}${t.travelerPhone ? ` &middot; ${escapeHtml(t.travelerPhone)}` : ""}</span>
        </td>
      </tr>`)
    .join("");

  const statusBanner = cancelled
    ? `<div style="background:${DANGER_RED};color:#ffffff;padding:14px 18px;border-radius:8px;font-weight:600;font-size:15px;margin-bottom:18px;">Cancelled by airline</div>`
    : `<div style="background:${WARNING_AMBER};color:#ffffff;padding:14px 18px;border-radius:8px;font-weight:600;font-size:15px;margin-bottom:18px;">Delayed ${delayMins} minutes</div>`;

  const html = `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:620px;margin:0 auto;padding:32px 20px;">
      ${brandHeader()}
      <h2 style="font-size:20px;color:${TEXT_DARK};margin:0 0 12px;">Confirmed disruption on a monitored flight</h2>
      <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 18px;">
        AeroDataBox has confirmed the following disruption on flight <strong>${escapeHtml(flight.flightNumber)}</strong>.
      </p>
      ${statusBanner}
      <table style="width:100%;border-collapse:collapse;font-size:14px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:18px;">
        <tr>
          <td style="padding:14px 18px;background:#f9fafb;color:#6b7280;width:40%;border-bottom:1px solid #e5e7eb;">Flight</td>
          <td style="padding:14px 18px;color:${TEXT_DARK};border-bottom:1px solid #e5e7eb;"><strong>${escapeHtml(flight.flightNumber)}</strong> · ${escapeHtml(flight.originIata)} → ${escapeHtml(flight.destinationIata)} · ${escapeHtml(flight.departureDate)}</td>
        </tr>
        <tr>
          <td style="padding:14px 18px;background:#f9fafb;color:#6b7280;border-bottom:1px solid #e5e7eb;">Status</td>
          <td style="padding:14px 18px;color:${TEXT_DARK};border-bottom:1px solid #e5e7eb;">${escapeHtml(flightStatus?.status || "Unknown")}${flightStatus?.departureTime ? `<br/><span style="color:#6b7280;">Revised dep: ${escapeHtml(formatRevisedDeparture(flightStatus.departureTime))}</span>` : ""}</td>
        </tr>
        <tr>
          <td style="padding:14px 18px;background:#f9fafb;color:#6b7280;vertical-align:top;">Affected travelers</td>
          <td style="padding:0;color:${TEXT_DARK};">
            <table style="width:100%;border-collapse:collapse;">${travelerRows}</table>
          </td>
        </tr>
      </table>
      ${ctaButton(resolveUrl, "Mark as resolved", BRAND_BLUE)}
      <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:24px 0 0;">
        The Travnr Disruption System
      </p>
    </div>`;

  return { subject, html };
}

export async function sendConfirmationAlert(
  flight: MonitoredFlight,
  travelers: FlightTraveler[],
  flightStatus: FlightStatusResult | null,
  agency: AgencyAccount,
): Promise<void> {
  if (travelers.length === 0) {
    console.warn(`[alertSender] confirmation: no travelers for flight_id=${flight.id}`);
    return;
  }

  const byEmail = new Map<string, FlightTraveler[]>();
  for (const t of travelers) {
    const key = t.travelerEmail.trim().toLowerCase();
    const list = byEmail.get(key) || [];
    list.push(t);
    byEmail.set(key, list);
  }

  const sgReady = ensureSendgrid();
  const successfullyAlertedIds: number[] = [];

  for (const group of Array.from(byEmail.values())) {
    const { subject, html } = buildConfirmationTravelerEmail(flight, group, flightStatus, agency);
    const recipient = group[0].travelerEmail;

    if (!sgReady) {
      console.warn(
        `[alertSender] confirmation: SENDGRID_API_KEY missing — would have sent to ${recipient} (${group.length})`,
      );
    } else {
      try {
        await sgMail.send({
          to: recipient,
          from: { email: ADMIN_FROM, name: `Travnr for ${agency.name}` },
          subject,
          html,
        });
        console.log(
          `[alertSender] confirmation traveler alert sent flight_id=${flight.id} email=${recipient} count=${group.length}`,
        );
        for (const t of group) successfullyAlertedIds.push(t.id);
      } catch (err: any) {
        console.error("[alertSender] confirmation traveler send failed:", err?.message || err);
        continue;
      }
    }

    if (process.env.SMS_ENABLED === "true") {
      const status = flightStatus?.cancelled
        ? `cancelled`
        : `delayed ${Math.max(0, Number(flightStatus?.delayMinutes || 0))} min`;
      for (const t of group) {
        if (!t.travelerPhone) continue;
        const smsBody = `Travnr: Your flight ${flight.flightNumber} on ${flight.departureDate} is ${status}. ${agency.name} has been notified.`;
        try {
          await sendSms({ to: t.travelerPhone, body: smsBody });
        } catch (err: any) {
          console.warn("[alertSender] confirmation SMS failed:", err?.message || err);
        }
      }
    }
  }

  if (successfullyAlertedIds.length > 0) {
    await db
      .update(tFlightTravelers)
      .set({ confirmationAlertSentAt: new Date() })
      .where(inArray(tFlightTravelers.id, successfullyAlertedIds));
  }

  // Agency notification
  if (sgReady) {
    try {
      const { subject, html } = buildConfirmationAgencyEmail(flight, travelers, flightStatus, agency);
      await sgMail.send({
        to: agency.contactEmail,
        from: { email: ADMIN_FROM, name: "Travnr Disruption System" },
        subject,
        html,
      });
      console.log(
        `[alertSender] confirmation agency alert sent flight_id=${flight.id} agency=${agency.contactEmail}`,
      );
    } catch (err: any) {
      console.error("[alertSender] confirmation agency send failed:", err?.message || err);
    }
  } else {
    console.warn(
      `[alertSender] confirmation: SENDGRID_API_KEY missing — would have notified agency ${agency.contactEmail}`,
    );
  }
}

export async function sendAgencyNotification(
  flight: MonitoredFlight,
  traveler: FlightTraveler,
  selectedOption: AlternativeOption,
  agency: AgencyAccount,
): Promise<void> {
  if (!ensureSendgrid()) {
    console.warn(
      `[alertSender] SENDGRID_API_KEY missing — would have notified agency ${agency.contactEmail}`,
    );
    return;
  }
  const { subject, html } = buildAgencyEmailHtml(flight, traveler, selectedOption, agency);
  try {
    await sgMail.send({
      to: agency.contactEmail,
      from: { email: ADMIN_FROM, name: "Travnr Disruption System" },
      subject,
      html,
    });
    console.log(
      `[alertSender] agency notification sent flight_id=${flight.id} agency=${agency.contactEmail}`,
    );
  } catch (err: any) {
    console.error("[alertSender] agency email send failed:", err?.message || err);
  }
}
