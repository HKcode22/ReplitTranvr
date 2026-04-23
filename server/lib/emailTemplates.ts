export type RenderedEmail = { subject: string; html: string };

const BRAND_BLUE = "#2d7abf";
const TEXT_DARK = "#1a1a2e";

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function brandHeader(): string {
  return `
    <div style="text-align:center;margin-bottom:24px;">
      <h1 style="color:${BRAND_BLUE};font-size:28px;margin:0;letter-spacing:-0.5px;">Travnr</h1>
    </div>`;
}

function brandFooter(): string {
  return `<p style="color:#999;font-size:12px;margin-top:16px;text-align:center;">Travnr &middot; hello@travnr.com</p>`;
}

// ==================== Verification ====================

export interface VerificationEmailInput {
  verifyUrl: string;
}

export function buildVerificationEmail(input: VerificationEmailInput): RenderedEmail {
  const { verifyUrl } = input;
  return {
    subject: "Verify your Travnr email",
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        ${brandHeader()}
        <h2 style="font-size: 22px; color: ${TEXT_DARK}; margin-bottom: 16px;">Verify your email</h2>
        <p style="color: #555; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
          Thanks for signing up for Travnr! Click the button below to verify your email address and get started.
        </p>
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${verifyUrl}" style="background-color: ${BRAND_BLUE}; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">Verify My Email</a>
        </div>
        <p style="color: #999; font-size: 13px; line-height: 1.5;">
          If you didn't create a Travnr account, you can safely ignore this email.
        </p>
        ${brandFooter()}
      </div>
    `,
  };
}

// ==================== Password Reset ====================

export interface PasswordResetEmailInput {
  resetUrl: string;
}

export function buildPasswordResetEmail(input: PasswordResetEmailInput): RenderedEmail {
  const { resetUrl } = input;
  return {
    subject: "Reset your Travnr password",
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        ${brandHeader()}
        <h2 style="font-size: 22px; color: ${TEXT_DARK}; margin-bottom: 16px;">Reset your password</h2>
        <p style="color: #555; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
          We received a request to reset your password. Click the button below to choose a new password. This link will expire in 1 hour.
        </p>
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${resetUrl}" style="background-color: ${BRAND_BLUE}; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">Reset My Password</a>
        </div>
        <p style="color: #999; font-size: 13px; line-height: 1.5;">
          If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
        </p>
        ${brandFooter()}
      </div>
    `,
  };
}

// ==================== Account Creation After Call ====================

export interface AccountCreationEmailInput {
  name: string;
  signUpUrl: string;
}

export function buildAccountCreationEmail(input: AccountCreationEmailInput): RenderedEmail {
  const { name, signUpUrl } = input;
  return {
    subject: "Your Travnr concierge call is complete — create your account",
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        ${brandHeader()}
        <h2 style="font-size: 22px; color: ${TEXT_DARK}; margin-bottom: 16px;">Thanks for chatting with us${name ? `, ${escapeHtml(name)}` : ""}!</h2>
        <p style="color: #555; font-size: 15px; line-height: 1.6; margin-bottom: 16px;">
          Your concierge call has been completed. We're putting together a personalized travel proposal based on our conversation.
        </p>
        <p style="color: #555; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
          Create your free Travnr account to view your call results, travel proposals, and manage future bookings — all in one place.
        </p>
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${signUpUrl}" style="background-color: ${BRAND_BLUE}; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">Create My Account</a>
        </div>
        <p style="color: #999; font-size: 13px; line-height: 1.5;">
          If you didn't request a concierge call from Travnr, you can safely ignore this email.
        </p>
        ${brandFooter()}
      </div>
    `,
  };
}

// ==================== Booking Failure Alert (Admin) ====================

export interface BookingFailureAlertInput {
  endpoint: string;
  userId?: string;
  userEmail?: string;
  stripePaymentIntentId?: string | null;
  offerId?: string;
  proposalId?: number | null;
  errorMessages: string[];
  timestamp?: string;
}

export function buildBookingFailureAlertEmail(input: BookingFailureAlertInput): RenderedEmail {
  const { endpoint, userId, userEmail, stripePaymentIntentId, offerId, proposalId, errorMessages } = input;
  const timestamp = input.timestamp || new Date().toISOString();
  const errorList = errorMessages.length > 0
    ? errorMessages.map((m) => `<li>${escapeHtml(m)}</li>`).join("")
    : "<li>(no error details)</li>";

  return {
    subject: `[ACTION REQUIRED] Duffel booking failed — ${userEmail || userId || "unknown user"}`,
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px;">
        <div style="background: #dc2626; color: white; padding: 16px 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0; font-size: 18px;">Duffel Booking Failure Alert</h2>
          <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.85;">${escapeHtml(timestamp)}</p>
        </div>
        <div style="border: 1px solid #e5e7eb; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 6px 0; color: #6b7280; width: 160px;">Endpoint</td><td style="padding: 6px 0; font-family: monospace;">${escapeHtml(endpoint)}</td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">User ID</td><td style="padding: 6px 0; font-family: monospace;">${escapeHtml(userId || "—")}</td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">User Email</td><td style="padding: 6px 0;">${escapeHtml(userEmail || "—")}</td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">Stripe PI</td><td style="padding: 6px 0; font-family: monospace;">${escapeHtml(stripePaymentIntentId || "—")}</td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">Duffel Offer ID</td><td style="padding: 6px 0; font-family: monospace;">${escapeHtml(offerId || "—")}</td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">Proposal ID</td><td style="padding: 6px 0;">${proposalId ?? "—"}</td></tr>
          </table>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
          <h3 style="font-size: 14px; color: #dc2626; margin: 0 0 8px;">Error Details</h3>
          <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #1f2937; line-height: 1.7;">${errorList}</ul>
          ${stripePaymentIntentId ? `<div style="margin-top: 16px; padding: 12px; background: #fef3c7; border-radius: 6px; font-size: 13px; color: #92400e;"><strong>Note:</strong> Stripe payment was charged (PI: ${escapeHtml(stripePaymentIntentId)}). Customer may need to be refunded if booking cannot be completed.</div>` : ""}
        </div>
      </div>
    `,
  };
}

// ==================== Manual Booking Admin Alert ====================

export interface ManualBookingAdminAlertInput {
  endpoint: string;
  userId: string;
  userEmail?: string;
  paymentId: number;
  stripePaymentIntentId?: string | null;
  offerId?: string;
  proposalId?: number | null;
  amount: string;
  currency: string;
  timestamp?: string;
}

export function buildManualBookingAdminAlertEmail(input: ManualBookingAdminAlertInput): RenderedEmail {
  const { endpoint, userId, userEmail, paymentId, stripePaymentIntentId, offerId, proposalId, amount, currency } = input;
  const timestamp = input.timestamp || new Date().toISOString();
  return {
    subject: `[MANUAL BOOKING] ${currency.toUpperCase()} ${amount} — ${userEmail || userId}`,
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px;">
        <div style="background: #b45309; color: white; padding: 16px 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0; font-size: 18px;">Manual Booking Required — Duffel Balance Insufficient</h2>
          <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.85;">${escapeHtml(timestamp)}</p>
        </div>
        <div style="border: 1px solid #e5e7eb; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 14px; color: #1f2937;">A customer payment was successfully captured but the Duffel balance is insufficient to complete the booking automatically. Please log into the admin dashboard to complete this booking manually.</p>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 6px 0; color: #6b7280; width: 160px;">Endpoint</td><td style="padding: 6px 0; font-family: monospace;">${escapeHtml(endpoint)}</td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">Payment ID</td><td style="padding: 6px 0; font-family: monospace;">${paymentId}</td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">User</td><td style="padding: 6px 0;">${escapeHtml(userEmail || userId)}</td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">Amount Charged</td><td style="padding: 6px 0;"><strong>${currency.toUpperCase()} ${escapeHtml(amount)}</strong></td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">Stripe PI</td><td style="padding: 6px 0; font-family: monospace;">${escapeHtml(stripePaymentIntentId || "—")}</td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">Duffel Offer ID</td><td style="padding: 6px 0; font-family: monospace;">${escapeHtml(offerId || "—")}</td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">Proposal ID</td><td style="padding: 6px 0;">${proposalId ?? "—"}</td></tr>
          </table>
        </div>
      </div>
    `,
  };
}

// ==================== Booking Confirmation (Duffel) ====================

export interface BookingConfirmationSlice {
  origin?: { iata?: string; city?: string; name?: string };
  destination?: { iata?: string; city?: string; name?: string };
  departingAt?: string;
  arrivingAt?: string;
  carrierName?: string | null;
  carrierIata?: string | null;
  flightNumber?: string | null;
}

export interface BookingConfirmationEmailInput {
  firstName?: string;
  bookingReference: string;
  amount: string | number;
  currency: string;
  cabinClass?: string | null;
  slices?: BookingConfirmationSlice[];
  passengers?: Array<{ given_name?: string; family_name?: string }>;
  dashboardUrl: string;
}

export function buildBookingConfirmationEmail(input: BookingConfirmationEmailInput): RenderedEmail {
  const slices = input.slices || [];
  const firstSlice = slices[0];
  const lastSlice = slices[slices.length - 1] || firstSlice;
  const routeLabel = firstSlice
    ? `${firstSlice.origin?.iata || firstSlice.origin?.city || ""} → ${(slices.length > 1 ? lastSlice?.destination?.iata || lastSlice?.destination?.city : firstSlice.destination?.iata || firstSlice.destination?.city) || ""}`
    : "your trip";
  const dateLabel = firstSlice?.departingAt
    ? new Date(firstSlice.departingAt).toLocaleDateString([], { dateStyle: "long" } as Intl.DateTimeFormatOptions)
    : "your selected date";

  const slicesHtml = slices.map((s) => {
    const dep = s.departingAt ? new Date(s.departingAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "—";
    const arr = s.arrivingAt ? new Date(s.arrivingAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "—";
    const flightLabel = [s.carrierIata, s.flightNumber].filter(Boolean).join("");
    const carrier = s.carrierName ? `${s.carrierName}${flightLabel ? ` · Flight ${flightLabel}` : ""}` : (flightLabel ? `Flight ${flightLabel}` : "");
    return `
      <tr>
        <td style="padding:10px 0;color:${TEXT_DARK};border-bottom:1px solid #f1f1f4;">
          <strong>${escapeHtml(s.origin?.iata || "")} ${escapeHtml(s.origin?.city || s.origin?.name || "")}</strong>
          → <strong>${escapeHtml(s.destination?.iata || "")} ${escapeHtml(s.destination?.city || s.destination?.name || "")}</strong><br/>
          ${carrier ? `<span style="color:${TEXT_DARK};font-size:13px;">${escapeHtml(carrier)}</span><br/>` : ""}
          <span style="color:#6b7280;font-size:13px;">Depart: ${escapeHtml(dep)}<br/>Arrive: ${escapeHtml(arr)}</span>
        </td>
      </tr>`;
  }).join("");

  const paxList = (input.passengers || []).map(p =>
    `<li>${escapeHtml([p.given_name, p.family_name].filter(Boolean).join(" "))}</li>`
  ).join("");

  return {
    subject: `Your booking is confirmed — ${routeLabel} on ${dateLabel}`,
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 20px;">
        ${brandHeader()}
        <h2 style="font-size:20px;color:${TEXT_DARK};margin:0 0 12px;">Your booking is confirmed${input.firstName ? `, ${escapeHtml(input.firstName)}` : ""}!</h2>
        <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 16px;">
          We've reserved <strong>${escapeHtml(routeLabel)}</strong> on <strong>${escapeHtml(dateLabel)}</strong>. Your booking reference is <strong>${escapeHtml(input.bookingReference)}</strong>.
        </p>
        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px 18px;margin-bottom:18px;">
          <h3 style="margin:0 0 8px;font-size:14px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">Itinerary</h3>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">${slicesHtml}</table>
          ${input.cabinClass ? `<p style="margin:10px 0 0;font-size:13px;color:#6b7280;">Cabin: <span style="color:${TEXT_DARK};text-transform:capitalize;">${escapeHtml(String(input.cabinClass).replace(/_/g, " "))}</span></p>` : ""}
        </div>
        ${paxList ? `<div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px 18px;margin-bottom:18px;"><h3 style="margin:0 0 8px;font-size:14px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">Passengers</h3><ul style="margin:0;padding-left:20px;color:${TEXT_DARK};">${paxList}</ul></div>` : ""}
        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px 18px;margin-bottom:18px;">
          <h3 style="margin:0 0 8px;font-size:14px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">Total Charged</h3>
          <p style="margin:0;font-size:18px;font-weight:600;color:${TEXT_DARK};">${Number(input.amount).toLocaleString()} ${(input.currency || "USD").toUpperCase()}</p>
        </div>
        <div style="text-align:center;margin:24px 0;">
          <a href="${input.dashboardUrl}" style="display:inline-block;background:${BRAND_BLUE};color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">View on your dashboard</a>
        </div>
        <p style="color:#555;font-size:14px;line-height:1.6;">
          Need to make a change? Reply to this email and we'll take care of it.
        </p>
        <p style="color:${TEXT_DARK};font-size:14px;line-height:1.6;margin-top:24px;">Safe travels,<br/>The Travnr team</p>
        ${brandFooter()}
      </div>
    `,
  };
}

// ==================== Manual Booking Confirmation (NEW) ====================

export interface ManualBookingPassenger {
  given_name?: string;
  family_name?: string;
  name?: string;
}

export interface ManualBookingSlice {
  origin?: string;
  destination?: string;
  departingAt?: string;
  arrivingAt?: string;
  carrier?: string | null;
  flightNumber?: string | null;
}

export interface ManualBookingConfirmationInput {
  firstName?: string;
  bookingReference: string;
  amount: string | number;
  currency: string;
  passengers?: ManualBookingPassenger[];
  slices?: ManualBookingSlice[];
  airlineName?: string | null;
  notes?: string | null;
  dashboardUrl: string;
}

function formatPassengerName(p: ManualBookingPassenger): string {
  const composed = [p.given_name, p.family_name].filter(Boolean).join(" ").trim();
  return composed || (p.name || "").trim();
}

export function buildManualBookingConfirmationEmail(input: ManualBookingConfirmationInput): RenderedEmail {
  const slices = input.slices || [];
  const firstSlice = slices[0];
  const lastSlice = slices[slices.length - 1] || firstSlice;
  const routeLabel = firstSlice
    ? `${firstSlice.origin || ""} → ${(slices.length > 1 ? lastSlice?.destination : firstSlice.destination) || ""}`.trim()
    : "your trip";
  const dateLabel = firstSlice?.departingAt
    ? new Date(firstSlice.departingAt).toLocaleDateString([], { dateStyle: "long" } as Intl.DateTimeFormatOptions)
    : "your selected date";

  const passengerNames = (input.passengers || [])
    .map(formatPassengerName)
    .filter((n) => n.length > 0);
  const passengerCount = passengerNames.length || (input.passengers || []).length || 1;
  const passengerListLabel = passengerNames.length > 0
    ? passengerNames.join(", ")
    : `${passengerCount} traveler${passengerCount === 1 ? "" : "s"}`;

  const amountFormatted = `${(input.currency || "USD").toUpperCase()} ${Number(input.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const airlineLine = input.airlineName ? `<div style="color:#6b7280;font-size:13px;margin-top:4px;">${escapeHtml(input.airlineName)}</div>` : "";

  const subject = `Your flight is confirmed — ${input.bookingReference}`;

  const html = `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
      <div style="background:${TEXT_DARK};padding:32px 24px;text-align:center;border-radius:12px 12px 0 0;">
        <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">Travnr</h1>
        <p style="margin:6px 0 0;color:#a5b4cf;font-size:13px;letter-spacing:1.2px;text-transform:uppercase;">Personal Travel Concierge</p>
      </div>

      <div style="padding:0 24px;">
        <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;padding:18px 20px;margin:24px 0;display:flex;align-items:center;gap:12px;">
          <div style="width:36px;height:36px;border-radius:50%;background:#10b981;color:white;display:inline-flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;line-height:1;">&#10003;</div>
          <div>
            <div style="color:#065f46;font-weight:600;font-size:15px;">Booking confirmed</div>
            <div style="color:#047857;font-size:13px;margin-top:2px;">Your flight is locked in. Details below.</div>
          </div>
        </div>

        <h2 style="font-size:22px;color:${TEXT_DARK};margin:0 0 12px;">You're all set${input.firstName ? `, ${escapeHtml(input.firstName)}` : ""}!</h2>
        <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 24px;">
          Your concierge has confirmed your flight from <strong>${escapeHtml(routeLabel)}</strong> on <strong>${escapeHtml(dateLabel)}</strong>. Keep this email for your records — you'll need the booking reference at check-in.
        </p>

        <div style="border:1px solid #e5e7eb;border-radius:10px;padding:20px;margin-bottom:24px;background:#fafafa;">
          <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px;">Booking Reference</div>
          <div style="font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:28px;font-weight:700;color:${TEXT_DARK};letter-spacing:2px;">${escapeHtml(input.bookingReference)}</div>
          ${airlineLine}
        </div>

        <table style="width:100%;border-collapse:collapse;font-size:14px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:24px;">
          <tr>
            <td style="padding:14px 18px;color:#6b7280;background:#f9fafb;width:40%;border-bottom:1px solid #e5e7eb;">Trip</td>
            <td style="padding:14px 18px;color:${TEXT_DARK};font-weight:600;border-bottom:1px solid #e5e7eb;">${escapeHtml(routeLabel)}</td>
          </tr>
          <tr>
            <td style="padding:14px 18px;color:#6b7280;background:#f9fafb;border-bottom:1px solid #e5e7eb;">Departure</td>
            <td style="padding:14px 18px;color:${TEXT_DARK};border-bottom:1px solid #e5e7eb;">${escapeHtml(dateLabel)}</td>
          </tr>
          <tr>
            <td style="padding:14px 18px;color:#6b7280;background:#f9fafb;border-bottom:1px solid #e5e7eb;">Passengers</td>
            <td style="padding:14px 18px;color:${TEXT_DARK};border-bottom:1px solid #e5e7eb;">${escapeHtml(passengerListLabel)}</td>
          </tr>
          <tr>
            <td style="padding:14px 18px;color:#6b7280;background:#f9fafb;">Amount Paid</td>
            <td style="padding:14px 18px;color:${TEXT_DARK};font-weight:600;">${escapeHtml(amountFormatted)}</td>
          </tr>
        </table>

        <div style="border:1px solid #dbeafe;background:#eff6ff;border-radius:10px;padding:18px 20px;margin-bottom:24px;">
          <h3 style="margin:0 0 10px;font-size:14px;color:#1e40af;text-transform:uppercase;letter-spacing:.5px;">What to do next</h3>
          <ul style="margin:0;padding-left:20px;color:#1e3a8a;font-size:14px;line-height:1.7;">
            <li>Save your booking reference — you'll need it at the airport.</li>
            <li>Check in with the airline 24 hours before departure.</li>
            <li>Arrive at the airport at least 2 hours before a domestic flight, 3 for international.</li>
            <li>Need to change anything? Just reply to this email and your concierge will handle it.</li>
          </ul>
        </div>

        ${input.notes ? `<div style="border:1px dashed #d1d5db;border-radius:8px;padding:14px 16px;margin-bottom:24px;color:#374151;font-size:13px;line-height:1.6;"><strong style="color:${TEXT_DARK};">Note from your concierge:</strong> ${escapeHtml(input.notes)}</div>` : ""}

        <div style="text-align:center;margin:24px 0;">
          <a href="${input.dashboardUrl}" style="display:inline-block;background:${BRAND_BLUE};color:white;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;">View in your dashboard</a>
        </div>

        <p style="color:${TEXT_DARK};font-size:14px;line-height:1.6;margin:24px 0 8px;">Safe travels,<br/>The Travnr team</p>
      </div>

      <div style="padding:20px 24px;border-top:1px solid #e5e7eb;margin-top:8px;text-align:center;">
        <p style="color:#9ca3af;font-size:12px;margin:0;">Travnr &middot; hello@travnr.com</p>
      </div>
    </div>
  `;

  return { subject, html };
}

// ==================== Refund Request (Admin + User) ====================

export interface RefundRequestInput {
  user: { email: string; firstName?: string; lastName?: string };
  payment: { id: number; amount: string | number; currency: string; duffelBookingRef?: string | null; duffelOrderId?: string | null };
  reason: string;
}

export function buildRefundRequestAdminEmail(input: RefundRequestInput): RenderedEmail {
  const { user, payment, reason } = input;
  const amountLine = `${Number(payment.amount).toLocaleString()} ${(payment.currency || "USD").toUpperCase()}`;
  const safeReason = escapeHtml(reason || "");

  return {
    subject: `Refund request — ${user.email} — ${amountLine}`,
    html: `
      <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 20px;">
        <div style="background:#f59e0b;color:white;padding:16px 20px;border-radius:8px 8px 0 0;">
          <h2 style="margin:0;font-size:18px;">Refund Request</h2>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:none;padding:20px;border-radius:0 0 8px 8px;">
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr><td style="padding:6px 0;color:#6b7280;width:160px;">Customer</td><td>${escapeHtml([user.firstName, user.lastName].filter(Boolean).join(" "))} (${escapeHtml(user.email)})</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;">Payment ID</td><td>#${payment.id}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;">Amount</td><td>${amountLine}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;">Booking Ref</td><td style="font-family:monospace;">${escapeHtml(payment.duffelBookingRef || "—")}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;">Duffel Order ID</td><td style="font-family:monospace;">${escapeHtml(payment.duffelOrderId || "—")}</td></tr>
          </table>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />
          <h3 style="font-size:14px;color:${TEXT_DARK};margin:0 0 8px;">Reason</h3>
          <p style="margin:0;font-size:14px;color:#1f2937;line-height:1.6;white-space:pre-wrap;">${safeReason || "(none provided)"}</p>
        </div>
      </div>
    `,
  };
}

export function buildRefundRequestCustomerEmail(input: RefundRequestInput): RenderedEmail {
  const { user, payment } = input;
  const amountLine = `${Number(payment.amount).toLocaleString()} ${(payment.currency || "USD").toUpperCase()}`;

  return {
    subject: "We received your refund request",
    html: `
      <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 20px;">
        ${brandHeader()}
        <h2 style="font-size:20px;color:${TEXT_DARK};margin:0 0 12px;">We received your refund request</h2>
        <p style="color:#555;font-size:15px;line-height:1.6;">
          Thanks${user.firstName ? `, ${escapeHtml(user.firstName)}` : ""}. Your refund request for booking
          ${payment.duffelBookingRef ? `<strong>${escapeHtml(payment.duffelBookingRef)}</strong>` : `payment #${payment.id}`}
          (${amountLine}) has been received. A member of our team will reply within one business day.
        </p>
        ${brandFooter()}
      </div>
    `,
  };
}

// ==================== Sample Data + Catalog (for admin preview/test) ====================

export type EmailTypeId =
  | "verification"
  | "passwordReset"
  | "accountCreation"
  | "bookingFailureAlert"
  | "manualBookingConfirmation"
  | "bookingConfirmation"
  | "manualBookingAdminAlert"
  | "refundRequestAdmin"
  | "refundRequestCustomer";

export interface EmailCatalogEntry {
  id: EmailTypeId;
  name: string;
  description: string;
  audience: "Customer" | "Admin";
}

export const EMAIL_CATALOG: EmailCatalogEntry[] = [
  {
    id: "manualBookingConfirmation",
    name: "Manual Booking Confirmation",
    description: "Sent to the customer after an admin records a manual booking reference.",
    audience: "Customer",
  },
  {
    id: "verification",
    name: "Email Verification",
    description: "Sent on signup to verify the user's email address.",
    audience: "Customer",
  },
  {
    id: "passwordReset",
    name: "Password Reset",
    description: "Sent when the user requests a password reset link.",
    audience: "Customer",
  },
  {
    id: "accountCreation",
    name: "Account Creation After Call",
    description: "Sent after a public callback request finishes a concierge call.",
    audience: "Customer",
  },
  {
    id: "bookingFailureAlert",
    name: "Booking Failure Alert",
    description: "Internal alert sent to admins when a Duffel booking fails after Stripe charge.",
    audience: "Admin",
  },
  {
    id: "bookingConfirmation",
    name: "Booking Confirmation (Duffel)",
    description: "Sent to the customer after a Duffel booking is automatically completed.",
    audience: "Customer",
  },
  {
    id: "manualBookingAdminAlert",
    name: "Manual Booking Required (Admin)",
    description: "Internal alert sent to admins when payment is captured but Duffel balance is insufficient.",
    audience: "Admin",
  },
  {
    id: "refundRequestAdmin",
    name: "Refund Request (Admin)",
    description: "Internal alert sent to admins when a customer requests a refund.",
    audience: "Admin",
  },
  {
    id: "refundRequestCustomer",
    name: "Refund Request Acknowledgement",
    description: "Sent to the customer confirming their refund request has been received.",
    audience: "Customer",
  },
];

const SAMPLE_REFUND_REQUEST: RefundRequestInput = {
  user: { email: "mahid@example.com", firstName: "Mahid", lastName: "Abdulkarim" },
  payment: { id: 1234, amount: "342.00", currency: "USD", duffelBookingRef: "TRAVNR", duffelOrderId: "ord_sampleXYZ" },
  reason: "Trip cancelled due to schedule conflict. Please refund the full amount.",
};

const SAMPLE_BOOKING_CONFIRMATION_DATA: Omit<BookingConfirmationEmailInput, "dashboardUrl"> = {
  firstName: "Mahid",
  bookingReference: "TRAVNR",
  amount: "342.00",
  currency: "USD",
  cabinClass: "economy",
  passengers: [{ given_name: "Mahid", family_name: "Abdulkarim" }],
  slices: [{
    origin: { iata: "STL", city: "St. Louis", name: "St. Louis Lambert International" },
    destination: { iata: "JFK", city: "New York", name: "John F. Kennedy International" },
    departingAt: "2026-05-15T08:30:00.000Z",
    arrivingAt: "2026-05-15T13:05:00.000Z",
    carrierName: "American Airlines",
    carrierIata: "AA",
    flightNumber: "1234",
  }],
};

export function buildSampleEmail(type: EmailTypeId, baseUrl: string): RenderedEmail {
  const sampleToken = "sample-token-1234";
  switch (type) {
    case "verification":
      return buildVerificationEmail({ verifyUrl: `${baseUrl}/api/auth/verify?token=${sampleToken}` });
    case "passwordReset":
      return buildPasswordResetEmail({ resetUrl: `${baseUrl}/reset-password?token=${sampleToken}` });
    case "accountCreation":
      return buildAccountCreationEmail({
        name: "Mahid",
        signUpUrl: `${baseUrl}/auth?email=${encodeURIComponent("mahid@example.com")}`,
      });
    case "bookingFailureAlert":
      return buildBookingFailureAlertEmail({
        endpoint: "/api/duffel/book-direct",
        userId: "user-sample-uuid",
        userEmail: "mahid@example.com",
        stripePaymentIntentId: "pi_sample123ABC",
        offerId: "off_sampleXYZ",
        proposalId: 42,
        errorMessages: ["Sample error: Offer is no longer available", "Sample error: Selected price changed"],
        timestamp: "2026-05-15T12:34:56.000Z",
      });
    case "manualBookingConfirmation":
      return buildManualBookingConfirmationEmail({
        firstName: "Mahid",
        bookingReference: "TRAVNR",
        amount: "342.00",
        currency: "USD",
        airlineName: "American Airlines",
        passengers: [{ given_name: "Mahid", family_name: "Abdulkarim" }],
        slices: [{
          origin: "STL",
          destination: "JFK",
          departingAt: "2026-05-15T08:30:00.000Z",
          arrivingAt: "2026-05-15T13:05:00.000Z",
          carrier: "American Airlines",
          flightNumber: "AA1234",
        }],
        notes: "Window seat reserved per your preference.",
        dashboardUrl: `${baseUrl}/trips`,
      });
    case "bookingConfirmation":
      return buildBookingConfirmationEmail({
        ...SAMPLE_BOOKING_CONFIRMATION_DATA,
        dashboardUrl: `${baseUrl}/calendar`,
      });
    case "manualBookingAdminAlert":
      return buildManualBookingAdminAlertEmail({
        endpoint: "/api/duffel/book-direct",
        userId: "user-sample-uuid",
        userEmail: "mahid@example.com",
        paymentId: 1234,
        stripePaymentIntentId: "pi_sample123ABC",
        offerId: "off_sampleXYZ",
        proposalId: 42,
        amount: "342.00",
        currency: "USD",
        timestamp: "2026-05-15T12:34:56.000Z",
      });
    case "refundRequestAdmin":
      return buildRefundRequestAdminEmail(SAMPLE_REFUND_REQUEST);
    case "refundRequestCustomer":
      return buildRefundRequestCustomerEmail(SAMPLE_REFUND_REQUEST);
  }
}
