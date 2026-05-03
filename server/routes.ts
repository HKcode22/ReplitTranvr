import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { randomBytes, randomUUID } from "crypto";
import sgMail from "@sendgrid/mail";
import { z } from "zod";
import { Duffel } from "@duffel/api";
import * as bland from "./lib/bland";
import { normalizePhoneE164 } from "./lib/phone";
import { sendSms, maskPhone } from "./lib/sms";
import { buildGuestProposalSms } from "./lib/smsTemplates";
import { getUncachableStripeClient, getStripePublishableKey } from "./lib/stripeClient";
import {
  verifyProposalAgainstTranscript,
  fixAndRegenerateProposal,
  buildProposalSnapshot,
  type ParsedDetails as VerifierParsedDetails,
} from "./lib/proposalVerifier";
import {
  buildVerificationEmail,
  buildPasswordResetEmail,
  buildAccountCreationEmail,
  buildBookingFailureAlertEmail,
  buildManualBookingAdminAlertEmail,
  buildBookingConfirmationEmail,
  buildManualBookingConfirmationEmail,
  buildRefundRequestAdminEmail,
  buildRefundRequestCustomerEmail,
  buildGuestProposalEmail,
  buildGuestBookingConfirmationEmail,
  buildGuestBookingHoldingEmail,
  buildSampleEmail,
  EMAIL_CATALOG,
  type EmailTypeId,
  type ManualBookingPassenger,
  type ManualBookingSlice,
  type GuestProposalEmailOption,
} from "./lib/emailTemplates";
import type { GuestProposalData, GuestProposalOption } from "@shared/schema";
import { getHotelProvider, getAllProviderInfo } from "./lib/hotels";
import { HotelProviderNotConfiguredError } from "./lib/hotels/types";
import { rankHotels } from "./lib/hotels/rank";
import { runHotelSearchForCall } from "./lib/hotels/runHotelSearch";
import {
  authIpLimiter,
  loginEmailLimiter,
  forgotPasswordEmailLimiter,
  callbackLimiter,
  guestBookingLimiter,
  genericApiLimiter,
} from "./lib/rateLimit";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const CONVENIENCE_FEE_PERCENT = 5;

function applyConvenienceFee(originalCents: number): { originalCents: number; feeCents: number; totalCents: number } {
  const totalCents = Math.ceil(originalCents * (1 + CONVENIENCE_FEE_PERCENT / 100));
  const feeCents = totalCents - originalCents;
  return { originalCents, feeCents, totalCents };
}

type PromoValidationResult =
  | { ok: false; reason: string }
  | { ok: true; promoId: number; code: string; overrideAmountCents: number; forceManual: boolean };

async function validatePromoCodeForUser(
  rawCode: string | undefined | null,
  userEmail: string | null | undefined,
): Promise<PromoValidationResult> {
  const GENERIC_INVALID = "Promo code is not valid";
  if (!rawCode || typeof rawCode !== "string" || !rawCode.trim()) {
    return { ok: false, reason: GENERIC_INVALID };
  }
  const promo = await storage.getPromoCodeByCode(rawCode);
  if (!promo) return { ok: false, reason: GENERIC_INVALID };
  if (!promo.active) return { ok: false, reason: GENERIC_INVALID };
  if (promo.expiresAt && new Date(promo.expiresAt).getTime() < Date.now()) {
    return { ok: false, reason: GENERIC_INVALID };
  }
  if (promo.maxUses != null && promo.usedCount >= promo.maxUses) {
    return { ok: false, reason: GENERIC_INVALID };
  }
  if (promo.adminOnly && !isAdminEmail(userEmail)) {
    console.warn(`[promo] non-admin user ${userEmail || "?"} attempted admin-only code ${promo.code}`);
    return { ok: false, reason: GENERIC_INVALID };
  }
  if (!Number.isFinite(promo.overrideAmountCents) || promo.overrideAmountCents < 50) {
    return { ok: false, reason: GENERIC_INVALID };
  }
  return {
    ok: true,
    promoId: promo.id,
    code: promo.code,
    overrideAmountCents: promo.overrideAmountCents,
    forceManual: promo.forceManual,
  };
}

function getBaseUrl(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  if (host) return `${proto}://${host}`;
  if (process.env.REPLIT_DEV_DOMAIN) return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  return `http://localhost:${process.env.PORT || 5000}`;
}

async function sendVerificationEmail(email: string, token: string, baseUrl: string) {
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || "hello@travnr.com";
  const { subject, html } = buildVerificationEmail({ verifyUrl: `${baseUrl}/api/auth/verify?token=${token}` });
  try {
    await sgMail.send({ to: email, from: { email: fromEmail, name: "Travnr" }, subject, html });
  } catch (error) {
    console.error("SendGrid error:", error);
  }
}

async function sendPasswordResetEmail(email: string, token: string, baseUrl: string) {
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || "hello@travnr.com";
  const { subject, html } = buildPasswordResetEmail({ resetUrl: `${baseUrl}/reset-password?token=${token}` });
  try {
    await sgMail.send({ to: email, from: { email: fromEmail, name: "Travnr" }, subject, html });
  } catch (error) {
    console.error("SendGrid password reset email error:", error);
  }
}

async function sendAccountCreationEmail(email: string, name: string, callbackRequestId: number, baseUrl: string) {
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || "hello@travnr.com";
  const { subject, html } = buildAccountCreationEmail({
    name,
    signUpUrl: `${baseUrl}/auth?email=${encodeURIComponent(email)}`,
  });
  try {
    await sgMail.send({ to: email, from: { email: fromEmail, name: "Travnr" }, subject, html });
    console.log(`Account creation email sent to ${email} for callback request ${callbackRequestId}`);
  } catch (error) {
    console.error("SendGrid account creation email error:", error);
  }
}

const ADMIN_ALERT_EMAILS = ["hello@travnr.com", "almabdella@gmail.com", "mahidbma@gmail.com"];

async function sendBookingFailureAlert(context: {
  endpoint: string;
  userId?: string;
  userEmail?: string;
  stripePaymentIntentId?: string | null;
  offerId?: string;
  proposalId?: number | null;
  error: any;
}) {
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || "hello@travnr.com";
  const { endpoint, userId, userEmail, stripePaymentIntentId, offerId, proposalId, error } = context;

  const duffelErrors: Array<{ title?: string; message?: string; code?: string; type?: string }> | undefined = error?.errors;
  const errorMessages = duffelErrors
    ? duffelErrors.map((e) =>
        `${e.title || "Error"}: ${e.message || ""}${e.code ? ` (code: ${e.code})` : ""}${e.type ? ` [type: ${e.type}]` : ""}`
      )
    : [error?.message || String(error)];

  const { subject, html } = buildBookingFailureAlertEmail({
    endpoint, userId, userEmail, stripePaymentIntentId, offerId, proposalId, errorMessages,
  });

  try {
    await sgMail.send({
      to: ADMIN_ALERT_EMAILS,
      from: { email: fromEmail, name: "Travnr Alerts" },
      subject,
      html,
    });
  } catch (mailErr) {
    console.error("Failed to send booking failure alert email:", mailErr);
  }
}

const ADMIN_EMAIL_DOMAIN = "@travnr.com";

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  return lower.endsWith(ADMIN_EMAIL_DOMAIN) || ADMIN_ALERT_EMAILS.map((e) => e.toLowerCase()).includes(lower);
}

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) return res.status(401).json({ message: "Unauthorized" });
  const u = await storage.getUser(req.session.userId);
  if (!u || !isAdminEmail(u.email)) return res.status(403).json({ message: "Admin access required" });
  next();
}

async function getDuffelBalance(): Promise<{ available: number; currency: string } | null> {
  const token = process.env.DUFFEL_API_TOKEN;
  if (!token) return null;
  try {
    const r = await fetch("https://api.duffel.com/air/balance", {
      headers: { Authorization: `Bearer ${token}`, "Duffel-Version": "v2", Accept: "application/json" },
    });
    if (!r.ok) return null;
    const j: any = await r.json();
    const data = j?.data || j;
    const amountStr = data?.available_balance?.amount ?? data?.amount ?? null;
    const currency = data?.available_balance?.currency ?? data?.currency ?? "USD";
    if (amountStr == null) return null;
    const available = parseFloat(String(amountStr));
    if (Number.isNaN(available)) return null;
    return { available, currency };
  } catch (e) {
    console.error("[Duffel] Balance check failed:", e);
    return null;
  }
}

async function isDuffelBalanceSufficient(amount: number, currency: string): Promise<boolean> {
  const bal = await getDuffelBalance();
  if (!bal) return true; // Unknown — don't divert
  if (bal.currency.toUpperCase() !== currency.toUpperCase()) return true; // Can't compare
  return bal.available >= amount;
}

async function sendInternalEmail(subject: string, html: string): Promise<void> {
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || "hello@travnr.com";
  try {
    await sgMail.send({
      to: ADMIN_ALERT_EMAILS,
      from: { email: fromEmail, name: "Travnr Alerts" },
      subject,
      html,
    });
  } catch (mailErr) {
    console.error("Failed to send internal alert email:", mailErr);
  }
}

async function sendManualBookingAdminAlert(context: {
  endpoint: string;
  userId: string;
  userEmail?: string;
  paymentId: number;
  stripePaymentIntentId?: string | null;
  offerId?: string;
  proposalId?: number | null;
  amount: string;
  currency: string;
}) {
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || "hello@travnr.com";
  const { subject, html } = buildManualBookingAdminAlertEmail(context);
  try {
    await sgMail.send({
      to: ADMIN_ALERT_EMAILS,
      from: { email: fromEmail, name: "Travnr Alerts" },
      subject,
      html,
    });
  } catch (mailErr) {
    console.error("Failed to send manual booking alert email:", mailErr);
  }
}

// Build a Duffel-order-shaped object from manualBookingDetails so the
// existing trip card UI can render manually-completed bookings without
// any branching. Slice/segment fields mirror the Duffel order schema.
function synthesizeOrderFromManualDetails(details: unknown): any {
  if (!details || typeof details !== "object") return null;
  const d = details as {
    slices?: Array<{
      origin?: string;
      destination?: string;
      departingAt?: string;
      arrivingAt?: string;
      carrier?: string;
      flightNumber?: string;
    }>;
    passengers?: Array<{
      given_name?: string;
      family_name?: string;
      title?: string;
      type?: string;
    }>;
  };
  const slices = (d.slices || []).map((s) => ({
    segments: [
      {
        origin: { iata_code: s.origin || "", city_name: s.origin || "" },
        destination: { iata_code: s.destination || "", city_name: s.destination || "" },
        departing_at: s.departingAt,
        arriving_at: s.arrivingAt,
        marketing_carrier: { name: s.carrier || "Airline", logo_symbol_url: null },
        marketing_carrier_flight_number: s.flightNumber || "",
        passengers: [],
      },
    ],
  }));
  const passengers = (d.passengers || []).map((p) => ({
    given_name: p.given_name || "",
    family_name: p.family_name || "",
    title: p.title || "",
    type: p.type || "adult",
  }));
  return { slices, passengers, conditions: null };
}

async function createManualBookingFallback(args: {
  userId: string;
  userEmail?: string;
  proposalId: number | null;
  proposalTitle?: string | null;
  offerId: string;
  fullOffer: any;
  passengerMappings: any[];
  paidPiAmountCents: number | null;
  stripePaymentIntentId: string | null;
  endpoint: string;
}) {
  const { userId, userEmail, proposalId, proposalTitle, offerId, fullOffer, passengerMappings, paidPiAmountCents, stripePaymentIntentId, endpoint } = args;
  const flightAmountCents = Math.round(parseFloat(fullOffer.total_amount) * 100);
  const fallbackTotalCents = applyConvenienceFee(flightAmountCents).totalCents;
  const chargedTotalCents = paidPiAmountCents ?? fallbackTotalCents;
  const chargedTotalAmount = (chargedTotalCents / 100).toFixed(2);
  const currency = (fullOffer.total_currency || "usd").toLowerCase();

  const sliceSummary = (fullOffer.slices || []).map((s: any) => ({
    origin: s.origin?.iata_code,
    destination: s.destination?.iata_code,
    departingAt: s.segments?.[0]?.departing_at,
    arrivingAt: s.segments?.[s.segments.length - 1]?.arriving_at,
    carrier: s.segments?.[0]?.marketing_carrier?.name,
    flightNumber: s.segments?.[0]?.marketing_carrier_flight_number,
  }));
  const routeSummary = sliceSummary
    .map((s: any) => `${s.origin || "?"} → ${s.destination || "?"}`)
    .join(" / ");

  const payment = await storage.createPayment({
    userId,
    proposalId: proposalId ?? null,
    stripePaymentIntentId: stripePaymentIntentId ?? null,
    duffelOrderId: null,
    duffelBookingRef: null,
    amount: chargedTotalAmount,
    currency,
    status: "pending_manual",
    manualBookingDetails: {
      reason: "duffel_balance_insufficient",
      offerId,
      totalAmount: fullOffer.total_amount,
      currency: fullOffer.total_currency,
      slices: sliceSummary,
      passengers: passengerMappings,
      routeSummary: routeSummary || null,
      proposalTitle: proposalTitle ?? null,
      capturedAt: new Date().toISOString(),
    },
  });

  await storage.createNotification({
    userId,
    type: "manual_booking_pending",
    title: "Booking received — being processed",
    body: "Your payment was received. Our concierge team is finalizing your booking and will email you shortly with your confirmation.",
    linkUrl: "/billing",
  });

  await sendManualBookingAdminAlert({
    endpoint,
    userId,
    userEmail,
    paymentId: payment.id,
    stripePaymentIntentId,
    offerId,
    proposalId: proposalId ?? null,
    amount: chargedTotalAmount,
    currency,
  });

  return payment;
}

export interface BaggageAllowance {
  type: string;
  quantity: number;
  weightValue?: number | null;
  weightUnit?: string | null;
}

export interface FareCondition {
  allowed: boolean | null;
  penaltyAmount: string | null;
  penaltyCurrency: string | null;
  description: string;
}

export interface OfferEnrichment {
  cabinClass: string | null;
  fareBrand: string | null;
  baggage: BaggageAllowance[];
  baggageSummary: string;
  seatSelection: {
    available: boolean | null;
    feeAmount: string | null;
    feeCurrency: string | null;
    description: string;
  };
  conditions: {
    changeBeforeDeparture: FareCondition;
    refundBeforeDeparture: FareCondition;
    refundable: boolean | null;
  };
  fareConditionsText: string[];
  paymentRequirements: {
    requiresInstantPayment: boolean | null;
    paymentRequiredBy: string | null;
  } | null;
  owner: { name: string | null; iata: string | null } | null;
}

function describeCondition(c: any, label: string): FareCondition {
  if (!c) return { allowed: null, penaltyAmount: null, penaltyCurrency: null, description: `${label}: subject to airline policy` };
  if (c.allowed === false) return { allowed: false, penaltyAmount: null, penaltyCurrency: null, description: `${label}: not allowed` };
  if (c.allowed === true) {
    const fee = c.penalty_amount ? ` for a fee of ${c.penalty_amount} ${c.penalty_currency || ""}` : " with no fee";
    return { allowed: true, penaltyAmount: c.penalty_amount || null, penaltyCurrency: c.penalty_currency || null, description: `${label}: allowed${fee}` };
  }
  return { allowed: null, penaltyAmount: null, penaltyCurrency: null, description: `${label}: subject to airline policy` };
}

function enrichOfferDetails(offer: any): OfferEnrichment | null {
  if (!offer) return null;
  const firstSlice = offer.slices?.[0];
  const firstSeg = firstSlice?.segments?.[0];
  const firstPax = firstSeg?.passengers?.[0];

  const baggage: BaggageAllowance[] = [];
  if (Array.isArray(firstPax?.baggages)) {
    for (const b of firstPax.baggages) {
      baggage.push({
        type: b.type || "bag",
        quantity: b.quantity ?? 0,
        weightValue: b.weight_value ?? null,
        weightUnit: b.weight_unit ?? null,
      });
    }
  }
  const baggageSummary = baggage.length
    ? baggage.map(b => {
        const wt = b.weightValue ? ` up to ${b.weightValue}${b.weightUnit || "kg"}` : "";
        return `${b.quantity}× ${b.type.replace(/_/g, " ")}${wt}`;
      }).join(", ")
    : "See airline policy";

  const seatService = Array.isArray(offer.available_services)
    ? offer.available_services.find((s: any) => s.type === "seat")
    : null;
  const seatSelection = {
    available: seatService ? true : (offer.available_services ? false : null),
    feeAmount: seatService?.total_amount || null,
    feeCurrency: seatService?.total_currency || null,
    description: seatService
      ? `Seat selection available${seatService.total_amount ? ` from ${seatService.total_amount} ${seatService.total_currency || ""}` : ""}`
      : (offer.available_services ? "Seat selection not offered for this fare" : "Seat selection details available at check-in"),
  };

  const change = describeCondition(offer.conditions?.change_before_departure, "Changes before departure");
  const refund = describeCondition(offer.conditions?.refund_before_departure, "Refunds before departure");

  const fareConditionsText: string[] = [];
  fareConditionsText.push(change.description);
  fareConditionsText.push(refund.description);
  fareConditionsText.push(seatSelection.description);
  fareConditionsText.push(`Baggage: ${baggageSummary}`);

  return {
    cabinClass: firstPax?.cabin_class_marketing_name || firstPax?.cabin_class || null,
    fareBrand: firstPax?.fare_basis_code || null,
    baggage,
    baggageSummary,
    seatSelection,
    conditions: {
      changeBeforeDeparture: change,
      refundBeforeDeparture: refund,
      refundable: refund.allowed,
    },
    fareConditionsText,
    paymentRequirements: offer.payment_requirements ? {
      requiresInstantPayment: offer.payment_requirements.requires_instant_payment ?? null,
      paymentRequiredBy: offer.payment_requirements.payment_required_by ?? null,
    } : null,
    owner: offer.owner ? { name: offer.owner.name || null, iata: offer.owner.iata_code || null } : null,
  };
}

async function sendBookingConfirmationEmail(toEmail: string, data: {
  firstName?: string;
  bookingReference: string;
  amount: string | number;
  currency: string;
  cabinClass?: string | null;
  slices?: Array<{
    origin?: { iata?: string; city?: string; name?: string };
    destination?: { iata?: string; city?: string; name?: string };
    departingAt?: string;
    arrivingAt?: string;
    carrierName?: string | null;
    carrierIata?: string | null;
    flightNumber?: string | null;
  }>;
  passengers?: Array<{ given_name?: string; family_name?: string }>;
}) {
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || "hello@travnr.com";
  const dashboardUrl = `${process.env.APP_BASE_URL || "https://travnr.com"}/calendar`;
  const { subject, html } = buildBookingConfirmationEmail({ ...data, dashboardUrl });
  try {
    await sgMail.send({ to: toEmail, from: { email: fromEmail, name: "Travnr" }, subject, html });
  } catch (err) {
    console.error("Failed to send booking confirmation email:", err);
  }
}

function parseDurationToMinutes(d: string | null | undefined): number {
  if (!d) return 0;
  const m = d.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return 0;
  const hours = parseInt(m[1] || "0", 10);
  const mins = parseInt(m[2] || "0", 10);
  return hours * 60 + mins;
}

function offerStops(offer: any): number {
  let n = 0;
  for (const s of offer.slices || []) {
    n += Math.max(0, (s.segments?.length ?? 1) - 1);
  }
  return n;
}

function offerTotalDurationMinutes(offer: any): number {
  let mins = 0;
  for (const s of offer.slices || []) {
    mins += parseDurationToMinutes(s.duration);
  }
  return mins;
}

// Dedup key for an offer: outbound first segment's carrier + flight number +
// departing-at. Duffel returns the same physical flight at multiple fares,
// and we don't want three near-identical cards in one email. If any field is
// missing, fall back to offer.id so unrelated offers can't collapse together.
function offerFlightSignature(offer: any): string {
  const seg = offer?.slices?.[0]?.segments?.[0];
  if (!seg) return `id:${offer?.id || "unknown"}`;
  const carrier = seg.marketing_carrier?.iata_code || seg.marketing_carrier?.name || null;
  const flightNum = seg.marketing_carrier_flight_number || null;
  const dep = seg.departing_at || null;
  if (!carrier || !flightNum || !dep) return `id:${offer?.id || "unknown"}`;
  return `${carrier}${flightNum}|${dep}`;
}

function offerOutboundCarrier(offer: any): string {
  const seg = offer?.slices?.[0]?.segments?.[0];
  return seg?.marketing_carrier?.iata_code || seg?.marketing_carrier?.name || "??";
}

// Departure-time bucket. Duffel's `departing_at` is local time (no offset).
function offerOutboundDepartureBucket(offer: any): "morning" | "afternoon" | "evening" | "unknown" {
  const dep = offer?.slices?.[0]?.segments?.[0]?.departing_at;
  const m = dep ? String(dep).match(/T(\d{2}):/) : null;
  if (!m) return "unknown";
  const h = parseInt(m[1], 10);
  if (Number.isNaN(h)) return "unknown";
  return h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
}

// Longest layover (minutes) across every slice. Currently unused by the
// picker but kept as a general-purpose helper — distinct from
// `offerTotalLayoverMinutes` below, which sums every layover.
function offerLongestLayoverMinutes(offer: any): number {
  let longestMs = 0;
  for (const slice of offer?.slices || []) {
    const segs = slice.segments || [];
    for (let i = 1; i < segs.length; i++) {
      const arr = Date.parse(segs[i - 1]?.arriving_at);
      const dep = Date.parse(segs[i]?.departing_at);
      if (Number.isNaN(arr) || Number.isNaN(dep)) continue;
      const gap = dep - arr;
      if (gap > longestMs) longestMs = gap;
    }
  }
  return Math.round(longestMs / 60000);
}

// Total layover time (minutes) summed across every stop on every slice.
// Used by the Best Value rule to enforce a 4-hour total-layover ceiling
// regardless of how that wait is distributed across the trip. Distinct
// from `offerLongestLayoverMinutes` (which returns only the largest gap).
function offerTotalLayoverMinutes(offer: any): number {
  let totalMs = 0;
  for (const slice of offer?.slices || []) {
    const segs = slice.segments || [];
    for (let i = 1; i < segs.length; i++) {
      const arr = Date.parse(segs[i - 1]?.arriving_at);
      const dep = Date.parse(segs[i]?.departing_at);
      if (Number.isNaN(arr) || Number.isNaN(dep)) continue;
      const gap = dep - arr;
      if (gap > 0) totalMs += gap;
    }
  }
  return Math.round(totalMs / 60000);
}

// Best Value rule: per spec, exclude any offer whose total layover across
// all stops exceeds 4 hours. Captured as a constant so the threshold is
// auditable in one place.
const VALUE_MAX_TOTAL_LAYOVER_MIN = 240;

// Best Value scoring per spec: price (in the offer's currency, NOT cents)
// plus half the total door-to-door duration in minutes. The 0.5 weight is
// part of the spec — do not adjust without product approval.
function offerValueScore(offer: any): number {
  return parseFloat(offer.total_amount) + offerTotalDurationMinutes(offer) * 0.5;
}

function pickThreeOffers(offers: any[]): Array<{ offer: any; label: "Best Price" | "Best Value" | "Fastest" }> {
  if (!offers || offers.length === 0) return [];

  // Best Price sort: lowest total_amount, ties broken by shortest duration,
  // then by stable offer id for deterministic output.
  const sortedByPrice = [...offers].sort((a, b) => {
    const pa = parseFloat(a.total_amount);
    const pb = parseFloat(b.total_amount);
    if (pa !== pb) return pa - pb;
    const da = offerTotalDurationMinutes(a);
    const db = offerTotalDurationMinutes(b);
    if (da !== db) return da - db;
    return String(a.id).localeCompare(String(b.id));
  });

  // Best Value sort: lowest `price + duration * 0.5` score, after excluding
  // any offer whose TOTAL layover across all stops exceeds 4 hours. Ties
  // broken by stable offer id. If the layover filter wipes the pool out,
  // we'll fall back to sortedByPrice when picking below (per spec).
  const sortedByValue = offers
    .filter((o) => offerTotalLayoverMinutes(o) <= VALUE_MAX_TOTAL_LAYOVER_MIN)
    .sort((a, b) => {
      const sa = offerValueScore(a);
      const sb = offerValueScore(b);
      if (sa !== sb) return sa - sb;
      return String(a.id).localeCompare(String(b.id));
    });

  // Fastest sort: shortest total door-to-door duration (first departure to
  // last arrival, including layovers). Ties broken by cheapest, then id.
  const sortedByDuration = [...offers].sort((a, b) => {
    const da = offerTotalDurationMinutes(a);
    const db = offerTotalDurationMinutes(b);
    if (da !== db) return da - db;
    const pa = parseFloat(a.total_amount);
    const pb = parseFloat(b.total_amount);
    if (pa !== pb) return pa - pb;
    return String(a.id).localeCompare(String(b.id));
  });

  // Walk a category-sorted list for the next pick whose flight signature is
  // not already taken. Per the new spec, signature distinctness IS the only
  // distinctness rule — different flight number AND departure time. There
  // is no secondary differentiator (carrier/time-bucket/layover). Same
  // airline appearing in multiple options is allowed.
  function nextDistinct(list: any[], takenSigs: Set<string>): any | null {
    for (const o of list) {
      if (!takenSigs.has(offerFlightSignature(o))) return o;
    }
    return null;
  }

  const picks: Array<{ offer: any; label: "Best Price" | "Best Value" | "Fastest" }> = [];
  const takenSigs = new Set<string>();

  // Best Price: cheapest, no constraints — seeds the pick set.
  const bestPrice = sortedByPrice[0];
  picks.push({ offer: bestPrice, label: "Best Price" });
  takenSigs.add(offerFlightSignature(bestPrice));

  // Best Value: lowest value score within the layover-filtered pool that is
  // a different physical flight from Best Price. Fall back to the price-
  // sorted list ONLY if the value pool has no distinct candidate at all
  // (so we still emit three labels when possible).
  const bestValue =
    nextDistinct(sortedByValue, takenSigs) ??
    nextDistinct(sortedByPrice, takenSigs);
  if (bestValue) {
    picks.push({ offer: bestValue, label: "Best Value" });
    takenSigs.add(offerFlightSignature(bestValue));
  }

  // Fastest: shortest total door-to-door that is a different physical
  // flight from BOTH Best Price and Best Value. Same fallback rule.
  const fastest =
    nextDistinct(sortedByDuration, takenSigs) ??
    nextDistinct(sortedByPrice, takenSigs);
  if (fastest) {
    picks.push({ offer: fastest, label: "Fastest" });
    takenSigs.add(offerFlightSignature(fastest));
  }

  // Always emit exactly three labelled options. If fewer than three signature-
  // distinct flights exist in the input pool, repeat Best Price for the
  // remaining label(s) — preserves today's "always three options" guarantee.
  const labelOrder: Array<"Best Price" | "Best Value" | "Fastest"> = [
    "Best Price",
    "Best Value",
    "Fastest",
  ];
  while (picks.length < 3) {
    picks.push({ offer: bestPrice, label: labelOrder[picks.length] });
  }
  return picks.slice(0, 3);
}

function offerToGuestOption(
  offer: any,
  label: "Best Price" | "Best Value" | "Fastest",
): GuestProposalOption {
  const slices = (offer.slices || []).map((s: any) => {
    const segments = (s.segments || []).map((seg: any) => ({
      carrierName: seg.marketing_carrier?.name ?? null,
      carrierIata: seg.marketing_carrier?.iata_code ?? null,
      flightNumber: seg.marketing_carrier_flight_number ?? null,
      departingAt: seg.departing_at ?? null,
      arrivingAt: seg.arriving_at ?? null,
      origin: { iata: seg.origin?.iata_code ?? null, name: seg.origin?.name ?? null },
      destination: { iata: seg.destination?.iata_code ?? null, name: seg.destination?.name ?? null },
    }));
    return {
      origin: {
        iata: s.origin?.iata_code ?? null,
        city: s.origin?.city_name ?? null,
        name: s.origin?.name ?? null,
      },
      destination: {
        iata: s.destination?.iata_code ?? null,
        city: s.destination?.city_name ?? null,
        name: s.destination?.name ?? null,
      },
      departingAt: segments[0]?.departingAt ?? null,
      arrivingAt: segments[segments.length - 1]?.arrivingAt ?? null,
      durationMinutes: parseDurationToMinutes(s.duration),
      stops: Math.max(0, segments.length - 1),
      segments,
    };
  });

  // Best-effort baggage summary, sourced from the first segment's first
  // passenger's baggages array (Duffel's standard shape).
  let baggage: string | null = null;
  try {
    const firstSeg = (offer.slices?.[0]?.segments?.[0]?.passengers?.[0]?.baggages || []) as Array<{
      type?: string;
      quantity?: number;
    }>;
    const counts: Record<string, number> = {};
    for (const b of firstSeg) {
      const k = (b.type || "").toLowerCase();
      if (!k) continue;
      counts[k] = (counts[k] || 0) + (typeof b.quantity === "number" ? b.quantity : 0);
    }
    const parts: string[] = [];
    if (counts["carry_on"]) parts.push(`${counts["carry_on"]} carry-on`);
    if (counts["checked"]) parts.push(`${counts["checked"]} checked`);
    if (parts.length === 0 && Object.keys(counts).length > 0) {
      // Unknown bag types — surface raw counts.
      for (const [k, v] of Object.entries(counts)) parts.push(`${v} ${k.replace(/_/g, " ")}`);
    }
    baggage = parts.length ? parts.join(", ") : null;
  } catch {
    baggage = null;
  }

  // Best-effort cancellation/change policy, sourced from offer.conditions.
  // Duffel exposes `refund_before_departure.allowed` and
  // `change_before_departure.allowed` (each may be null when unknown).
  const conds = offer.conditions || {};
  const refundable: boolean | null =
    conds.refund_before_departure && typeof conds.refund_before_departure.allowed === "boolean"
      ? conds.refund_before_departure.allowed
      : null;
  const changeable: boolean | null =
    conds.change_before_departure && typeof conds.change_before_departure.allowed === "boolean"
      ? conds.change_before_departure.allowed
      : null;

  return {
    token: randomUUID(),
    label,
    duffelOfferId: offer.id,
    totalAmount: String(offer.total_amount),
    totalCurrency: String(offer.total_currency || "USD"),
    totalDurationMinutes: offerTotalDurationMinutes(offer),
    stops: offerStops(offer),
    carrierName: offer.owner?.name ?? null,
    carrierIata: offer.owner?.iata_code ?? null,
    carrierLogo: offer.owner?.logo_symbol_url || offer.owner?.logo_lockup_url || null,
    slices,
    baggage,
    refundable,
    changeable,
  };
}

function buildGuestProposalDataFromOffers(args: {
  offers: any[];
  originIata: string;
  originName?: string | null;
  destinationIata: string;
  destinationName?: string | null;
  departureDate: string;
  returnDate?: string | null;
  passengers: number;
  cabinClass: string;
}): GuestProposalData {
  const picks = pickThreeOffers(args.offers);
  const options: GuestProposalOption[] = picks.map((p) => offerToGuestOption(p.offer, p.label));
  return {
    originIata: args.originIata,
    originName: args.originName ?? null,
    destinationIata: args.destinationIata,
    destinationName: args.destinationName ?? null,
    departureDate: args.departureDate,
    returnDate: args.returnDate ?? null,
    passengers: args.passengers,
    cabinClass: args.cabinClass,
    options,
  };
}

async function sendGuestProposalEmail(toEmail: string, data: {
  baseUrl: string;
  originIata: string;
  originName?: string | null;
  destinationIata: string;
  destinationName?: string | null;
  departureDate: string;
  returnDate?: string | null;
  passengers: number;
  options: GuestProposalEmailOption[];
}): Promise<void> {
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || "hello@travnr.com";
  const { subject, html } = buildGuestProposalEmail(data);
  try {
    await sgMail.send({ to: toEmail, from: { email: fromEmail, name: "Travnr" }, subject, html });
    console.log(`[guest-proposal] email sent to ${toEmail} with ${data.options.length} options`);
  } catch (err) {
    console.error("[guest-proposal] email send failed:", err);
  }
}

async function sendRefundRequestEmails(args: {
  user: { email: string; firstName?: string; lastName?: string };
  payment: { id: number; amount: string | number; currency: string; duffelBookingRef?: string | null; duffelOrderId?: string | null };
  reason: string;
}) {
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || "hello@travnr.com";
  const { user } = args;
  const adminEmail = buildRefundRequestAdminEmail(args);
  const userEmail = buildRefundRequestCustomerEmail(args);

  try {
    await sgMail.send({
      to: ["hello@travnr.com"],
      from: { email: fromEmail, name: "Travnr Refunds" },
      replyTo: user.email,
      subject: adminEmail.subject,
      html: adminEmail.html,
    });
  } catch (err) {
    console.error("Failed to send refund admin email:", err);
  }
  try {
    await sgMail.send({
      to: user.email,
      from: { email: fromEmail, name: "Travnr" },
      subject: userEmail.subject,
      html: userEmail.html,
    });
  } catch (err) {
    console.error("Failed to send refund customer email:", err);
  }
}

async function createCalendarEntriesFromOrder(args: {
  userId: string;
  paymentId: number;
  proposalId?: number | null;
  orderData: any;
}) {
  const { userId, paymentId, proposalId, orderData } = args;
  const slices = orderData?.slices || [];
  const bookingRef = orderData?.booking_reference || "";
  for (let i = 0; i < slices.length; i++) {
    const slice = slices[i];
    const firstSeg = slice?.segments?.[0];
    const lastSeg = slice?.segments?.[slice.segments.length - 1];
    const dateStr = (firstSeg?.departing_at || "").substring(0, 10);
    if (!dateStr) continue;
    const origCity = slice?.origin?.city_name || slice?.origin?.iata_code || "";
    const destCity = slice?.destination?.city_name || slice?.destination?.iata_code || "";
    const carrierName = firstSeg?.marketing_carrier?.name || firstSeg?.operating_carrier?.name || "";
    const entryType = slices.length > 1 && i === slices.length - 1 ? "return" : (i === 0 ? "departure" : "leg");
    const label =
      entryType === "return"
        ? `Return flight from ${origCity} to ${destCity}`
        : `${carrierName ? `${carrierName} flight` : "Flight"} to ${destCity}`;
    try {
      await storage.createCalendarEntry({
        userId,
        paymentId,
        proposalId: proposalId ?? null,
        entryType,
        date: dateStr,
        label,
        details: {
          bookingRef,
          departingAt: firstSeg?.departing_at || null,
          arrivingAt: lastSeg?.arriving_at || null,
          origin: origCity,
          destination: destCity,
          carrier: carrierName || null,
          flightNumber: firstSeg?.marketing_carrier_flight_number || null,
        },
      });
    } catch (err) {
      console.error("Failed to create calendar entry:", err);
    }
  }
}

function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.session?.userId) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const PgSession = connectPgSimple(session);

  app.use(
    session({
      store: new PgSession({
        pool: pool as any,
        tableName: "sessions",
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET!,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      },
    })
  );

  const registerSchema = z.object({
    email: z.string().email("Invalid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    phone: z.string().min(1, "Phone number is required").refine(
      (v) => normalizePhoneE164(v) !== null,
      { message: "Please enter a valid phone number" },
    ),
    // Optional claim token from guest booking confirmation email — promotes
    // the placeholder user instead of rejecting as duplicate.
    claimToken: z.string().min(8).optional(),
  });

  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });

  const callRequestBodySchema = z.object({
    phone: z.string().optional().default(""),
    notes: z.string().optional().default(""),
  });

  const callbackBodySchema = z.object({
    name: z.string().optional().default(""),
    phone: z.string().min(1, "Phone is required"),
    email: z.string().email("Invalid email"),
  });

  // Generic /api fallback limiter — applied first so the per-route stricter
  // limiters below still get the final say (rate-limit shortcut on first hit).
  app.use("/api", genericApiLimiter);

  // AUTH ROUTES
  app.post("/api/auth/register", authIpLimiter, async (req: Request, res: Response) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid input" });
      }
      const { email, password, firstName, lastName, phone, claimToken } = parsed.data;
      const normalizedPhone = normalizePhoneE164(phone)!; // schema guarantees non-null
      const existing = await storage.getUserByEmail(email);
      if (existing) {
        // Only allow promoting an unverified placeholder when the caller can
        // present that user's verificationToken (mailed only to that address).
        // Otherwise reject — knowing the email alone must NOT be enough to
        // overwrite credentials, even on an unverified account.
        const canClaim =
          !existing.emailVerified &&
          claimToken &&
          existing.verificationToken &&
          claimToken === existing.verificationToken;
        if (!canClaim) {
          return res.status(400).json({ message: "Email already registered" });
        }
      }

      // Phone uniqueness check: reject if any OTHER user already owns this
      // normalized phone on their traveler profile. The DB-level unique
      // partial index is the ultimate guard (covers concurrent signups);
      // this lookup just gives a clean 400 for the common case.
      const phoneOwnerUserId = await storage.getUserIdByTravelerProfilePhone(normalizedPhone);
      if (phoneOwnerUserId && phoneOwnerUserId !== existing?.id) {
        return res.status(400).json({ message: "Phone number already registered" });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const verificationToken = randomBytes(32).toString("hex");

      // Either promote the existing placeholder (proven via claimToken) or
      // create a brand new user.
      let user;
      try {
        if (existing) {
          const updated = await storage.updateUser(existing.id, {
            password: hashedPassword,
            firstName,
            lastName,
            verificationToken,
          });
          user = updated || existing;
          // Promote/refresh phone on the placeholder's profile too. If the
          // placeholder already owned this phone the upsert is a no-op; if
          // it owned a different phone, we replace it with the one the user
          // just confirmed at signup.
          await storage.upsertProfile(user.id, {
            name: [firstName, lastName].filter(Boolean).join(" ") || null,
            phone: normalizedPhone,
          });
        } else {
          user = await storage.createUser({
            email,
            password: hashedPassword,
            firstName,
            lastName,
            verificationToken,
          });
          // Phone is stored on the traveler profile, not users.
          await storage.upsertProfile(user.id, {
            name: [firstName, lastName].filter(Boolean).join(" ") || null,
            phone: normalizedPhone,
          });
        }
      } catch (err: any) {
        // Postgres unique_violation — fired by the partial unique index on
        // traveler_profiles.phone when two signups race past the lookup
        // above. Surface the same friendly error.
        const code = err?.code || err?.cause?.code;
        const constraint = err?.constraint || err?.cause?.constraint || "";
        if (code === "23505" && (constraint.includes("phone") || /traveler_profiles_phone/.test(String(err?.message || "")))) {
          return res.status(400).json({ message: "Phone number already registered" });
        }
        throw err;
      }
      await sendVerificationEmail(email, verificationToken, getBaseUrl(req));

      const callbackReqs = await storage.getCallbackRequestsByEmail(email);
      if (callbackReqs.length > 0) {
        const cb = callbackReqs[0];
        if (cb.phone) {
          // Best-effort: only overwrite the profile phone if the callback
          // phone normalizes to the same E.164 the user just registered
          // with. Otherwise we'd risk hitting the unique-phone index for
          // an unrelated stale callback row.
          const cbNormalized = normalizePhoneE164(cb.phone);
          if (cbNormalized && cbNormalized === normalizedPhone) {
            await storage.upsertProfile(user.id, {
              name: `${firstName} ${lastName}`,
              phone: cbNormalized,
            }).catch((e) => console.warn("[register] callback phone upsert failed:", e?.message || e));
          }
        }

        if (cb.status === "completed" && cb.transcript) {
          try {
            const callRequest = await storage.createCallRequest({
              userId: user.id,
              phone: cb.phone,
              destination: "",
              tripType: "flight",
            });
            await storage.updateCallRequest(callRequest.id, { status: "completed" });

            await storage.createBlandCall({
              callRequestId: callRequest.id,
              userId: user.id,
              phoneNumber: cb.phone,
              blandCallId: cb.blandCallId || undefined,
              status: "completed",
              transcript: cb.transcript,
              summary: cb.summary || undefined,
              recordingUrl: cb.recordingUrl || undefined,
            });

            generateProposalFromCall(callRequest.id, user.id, cb.summary || null, cb.transcript || null).catch((err: any) => {
              console.error("Proposal generation for callback user failed:", err);
            });
          } catch (err) {
            console.error("Failed to link callback call data to new user:", err);
          }
        }

        await storage.createNotification({
          userId: user.id,
          type: "welcome",
          title: "Welcome to Travnr!",
          body: "Your concierge call results have been linked to your account. Check your call history and proposals.",
          linkUrl: "/call-history",
        });
      }

      const { password: _, verificationToken: __, ...safeUser } = user;
      return res.json({ ...safeUser, needsVerification: true });
    } catch (error: any) {
      console.error("Register error:", error);
      return res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", authIpLimiter, loginEmailLimiter, async (req: Request, res: Response) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      const { email, password } = parsed.data;
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      if (!user.emailVerified) {
        return res.status(403).json({ message: "Please verify your email before logging in" });
      }
      req.session.userId = user.id;
      const { password: _, verificationToken: __, ...safeUser } = user;
      return res.json({ ...safeUser, isAdmin: isAdminEmail(user.email) });
    } catch (error: any) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      res.clearCookie("connect.sid");
      return res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/user", async (req: Request, res: Response) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    const { password: _, verificationToken: __, ...safeUser } = user;
    return res.json({ ...safeUser, isAdmin: isAdminEmail(user.email) });
  });

  app.get("/api/auth/verify", async (req: Request, res: Response) => {
    try {
      const token = req.query.token as string;
      if (!token) return res.redirect("/auth?verifyError=missing");
      const user = await storage.getUserByVerificationToken(token);
      if (!user) return res.redirect("/auth?verifyError=invalid");
      await storage.updateUser(user.id, { emailVerified: true, verificationToken: null });
      return res.redirect("/auth?verified=true");
    } catch (error) {
      console.error("Email verification error:", error);
      return res.redirect("/auth?verifyError=server");
    }
  });

  app.post("/api/auth/resend-verification", authIpLimiter, async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });
    const user = await storage.getUserByEmail(email);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.emailVerified) return res.status(400).json({ message: "Email already verified" });
    const newToken = randomBytes(32).toString("hex");
    await storage.updateUser(user.id, { verificationToken: newToken });
    await sendVerificationEmail(email, newToken, getBaseUrl(req));
    return res.json({ message: "Verification email sent" });
  });

  app.post("/api/auth/forgot-password", authIpLimiter, forgotPasswordEmailLimiter, async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: "Email is required" });
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.json({ message: "If an account with that email exists, we've sent a password reset link." });
      }
      const resetToken = randomBytes(32).toString("hex");
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000);
      await storage.updateUser(user.id, {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      });
      await sendPasswordResetEmail(email, resetToken, getBaseUrl(req));
      return res.json({ message: "If an account with that email exists, we've sent a password reset link." });
    } catch (error) {
      console.error("Forgot password error:", error);
      return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/auth/reset-password", authIpLimiter, async (req: Request, res: Response) => {
    try {
      const { token, password } = req.body;
      if (!token || !password) return res.status(400).json({ message: "Token and new password are required" });
      if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });
      const user = await storage.getUserByResetToken(token);
      if (!user) return res.status(400).json({ message: "Invalid or expired reset link. Please request a new one." });
      if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
        return res.status(400).json({ message: "This reset link has expired. Please request a new one." });
      }
      const hashedPassword = await bcrypt.hash(password, 12);
      await storage.updateUser(user.id, {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      });
      return res.json({ message: "Password has been reset successfully. You can now log in." });
    } catch (error) {
      console.error("Reset password error:", error);
      return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  // PROFILE
  app.get("/api/profile", isAuthenticated, async (req: Request, res: Response) => {
    const profile = await storage.getProfile(req.session.userId!);
    if (!profile) return res.status(404).json({ message: "No profile found" });
    return res.json(profile);
  });

  app.post("/api/profile", isAuthenticated, async (req: Request, res: Response) => {
    const profile = await storage.upsertProfile(req.session.userId!, req.body);
    if (profile?.phone) {
      const owner = await storage.getUser(req.session.userId!).catch(() => null);
      if (owner?.email) {
        await storage.upsertPhoneEmailMap(profile.phone, owner.email).catch((e) =>
          console.warn("[phone-email-map] upsert from profile failed:", e?.message || e)
        );
      }
    }
    return res.json(profile);
  });

  // CALL REQUESTS
  app.get("/api/call-requests", isAuthenticated, async (req: Request, res: Response) => {
    const requests = await storage.getCallRequests(req.session.userId!);
    return res.json(requests);
  });

  app.post("/api/call-requests", isAuthenticated, async (req: Request, res: Response) => {
    const parsed = callRequestBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid input" });
    }
    let phone = parsed.data.phone || "";
    if (!phone) {
      const userProfile = await storage.getTravelerProfile(req.session.userId!);
      if (userProfile?.phone) {
        phone = userProfile.phone;
      }
    }
    phone = phone.replace(/\s+/g, "");
    if (phone && !phone.startsWith("+")) {
      phone = `+${phone}`;
    }
    const cr = await storage.createCallRequest({
      ...parsed.data,
      tripType: "flight",
      destination: "",
      phone,
      userId: req.session.userId!,
    });
    await storage.createNotification({
      userId: req.session.userId!,
      type: "call_request",
      title: "Call request submitted",
      body: "Your call request has been submitted.",
      linkUrl: "/call-history",
    });

    if (bland.isConfigured() && cr.phone) {
      const user = await storage.getUser(req.session.userId!);
      if (user) {
        let blandCall: any = null;
        try {
          const baseUrl = getBaseUrl(req);
          console.log(`Dispatching Bland AI call for user ${user.id}, phone: ${cr.phone}`);
          const task = bland.buildTravelConciergePrompt({
            userName: `${user.firstName} ${user.lastName}`,
            destination: cr.destination,
            tripType: cr.tripType,
            dateFrom: cr.dateFrom,
            dateTo: cr.dateTo,
            flexibility: cr.flexibility,
            timeWindow: cr.timeWindow,
            notes: cr.notes,
            email: user.email || null,
          });

          blandCall = await storage.createBlandCall({
            callRequestId: cr.id,
            userId: user.id,
            phoneNumber: cr.phone,
            status: "queued",
          });

          const result = await bland.dispatchCall({
            phoneNumber: cr.phone,
            task,
            webhookUrl: `${baseUrl}/api/bland/webhook`,
            dynamicDataUrl: `${baseUrl}/api/bland/dynamic-data`,
            dynamicDataHeaders: { "x-bland-secret": bland.getWebhookSecret() },
            metadata: {
              callRequestId: cr.id,
              userId: user.id,
              blandCallDbId: blandCall.id,
            },
            record: true,
          });

          await storage.updateBlandCall(blandCall.id, {
            blandCallId: result.callId,
            status: "queued",
          });
          await storage.updateCallRequest(cr.id, { status: "scheduled" });
          console.log(`Bland AI call dispatched: ${result.callId} for call request ${cr.id}`);
        } catch (err: any) {
          console.error("Bland AI auto-dispatch error:", err.message || err);
          if (blandCall) {
            await storage.updateBlandCall(blandCall.id, {
              status: "failed",
              errorMessage: err?.message || String(err),
            }).catch(() => {});
          }
          await storage.updateCallRequest(cr.id, { status: "cancelled" }).catch(() => {});
          await storage.createNotification({
            userId: user.id,
            type: "call_status",
            title: "Call could not be placed",
            body: "We were unable to dispatch your concierge call. Please try again from Call History.",
            linkUrl: "/call-history",
          }).catch(() => {});
        }
      }
    }

    return res.json(cr);
  });

  // PROPOSALS
  const createProposalSchema = z.object({
    title: z.string().min(1, "Title is required"),
    summary: z.string().optional().nullable(),
    callRequestId: z.number().optional().nullable(),
    items: z.array(z.object({
      type: z.enum(["flight", "hotel", "other"]),
      description: z.string().min(1),
      priceEstimate: z.union([z.string(), z.number()]).transform(v => String(v)),
      duffelOfferId: z.string().optional().nullable(),
      duffelOfferData: z.any().optional().nullable(),
    })).min(1, "At least one item is required"),
  });

  app.post("/api/proposals", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const parsed = createProposalSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid proposal data" });
      }
      const { title, summary, items, callRequestId } = parsed.data;

      let totalEstimate = 0;
      for (const item of items) {
        totalEstimate += parseFloat(item.priceEstimate) || 0;
      }

      const proposal = await storage.createProposal({
        userId: req.session.userId!,
        callRequestId: callRequestId || null,
        title,
        summary: summary || null,
        totalEstimate: totalEstimate.toFixed(2),
        status: "sent",
      });

      for (const item of items) {
        await storage.createProposalItem({
          proposalId: proposal.id,
          type: item.type,
          description: item.description,
          priceEstimate: parseFloat(item.priceEstimate).toFixed(2),
          duffelOfferId: item.duffelOfferId || null,
          duffelOfferData: item.duffelOfferData || null,
        });
      }

      await storage.createNotification({
        userId: req.session.userId!,
        type: "proposal_received",
        title: "New travel proposal",
        body: `Your proposal "${title}" is ready for review.`,
        linkUrl: `/proposals/${proposal.id}`,
      });

      const createdItems = await storage.getProposalItems(proposal.id);
      return res.json({ ...proposal, items: createdItems, payments: [] });
    } catch (err: any) {
      console.error("Create proposal error:", err);
      return res.status(500).json({ message: err.message || "Failed to create proposal" });
    }
  });

  app.get("/api/proposals", isAuthenticated, async (req: Request, res: Response) => {
    const proposals = await storage.getProposals(req.session.userId!);
    return res.json(proposals);
  });

  app.get("/api/proposals/:id", isAuthenticated, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const proposal = await storage.getProposal(id);
    if (!proposal || proposal.userId !== req.session.userId!) {
      return res.status(404).json({ message: "Proposal not found" });
    }
    const items = await storage.getProposalItems(id);
    const proposalPayments = await storage.getPaymentsByProposal(id);
    const callRequest = proposal.callRequestId
      ? await storage.getCallRequest(proposal.callRequestId)
      : null;
    return res.json({ ...proposal, items, payments: proposalPayments, callRequest });
  });

  app.post("/api/proposals/:id/approve", isAuthenticated, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const proposal = await storage.getProposal(id);
    if (!proposal || proposal.userId !== req.session.userId!) {
      return res.status(404).json({ message: "Proposal not found" });
    }
    if (proposal.status !== "sent") {
      return res.status(400).json({ message: "Proposal cannot be approved" });
    }
    const updated = await storage.updateProposal(id, { status: "approved" });
    await storage.createNotification({
      userId: req.session.userId!,
      type: "proposal_approved",
      title: "Proposal approved",
      body: `You approved "${proposal.title}".`,
      linkUrl: `/proposals/${id}`,
    });
    return res.json(updated);
  });

  app.post("/api/proposals/:id/pay", isAuthenticated, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const proposal = await storage.getProposal(id);
    if (!proposal || proposal.userId !== req.session.userId!) {
      return res.status(404).json({ message: "Proposal not found" });
    }
    if (proposal.status !== "approved") {
      return res.status(400).json({ message: "Proposal must be approved before payment" });
    }
    const payment = await storage.createPayment({
      userId: req.session.userId!,
      proposalId: id,
      stripeCheckoutSessionId: `cs_demo_${Date.now()}`,
      stripePaymentIntentId: `pi_demo_${Date.now()}`,
      amount: proposal.totalEstimate,
      currency: "usd",
      status: "paid",
    });
    await storage.createNotification({
      userId: req.session.userId!,
      type: "payment_confirmed",
      title: "Payment confirmed",
      body: `Payment of $${Number(proposal.totalEstimate).toLocaleString()} for "${proposal.title}" was successful.`,
      linkUrl: `/proposals/${id}`,
    });
    return res.json(payment);
  });

  // NOTIFICATIONS
  app.get("/api/notifications", isAuthenticated, async (req: Request, res: Response) => {
    const notifs = await storage.getNotifications(req.session.userId!);
    return res.json(notifs);
  });

  app.post("/api/notifications/read-all", isAuthenticated, async (req: Request, res: Response) => {
    await storage.markAllNotificationsRead(req.session.userId!);
    return res.json({ message: "All marked as read" });
  });

  app.post("/api/notifications/:id/read", isAuthenticated, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const notif = await storage.getNotification(id);
    if (!notif || notif.userId !== req.session.userId!) {
      return res.status(404).json({ message: "Notification not found" });
    }
    await storage.markNotificationRead(id);
    return res.json({ message: "Marked as read" });
  });

  // PAYMENTS
  app.get("/api/payments", isAuthenticated, async (req: Request, res: Response) => {
    const pymts = await storage.getPayments(req.session.userId!);
    return res.json(pymts);
  });

  // Recovery endpoint: look up a booking by Stripe payment intent ID
  // Used when the client loses connection mid-booking to check if the booking was actually saved
  app.get("/api/payments/by-intent/:intentId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { intentId } = req.params;
      if (!intentId) return res.status(400).json({ message: "Missing intentId" });
      const payment = await storage.getPaymentByStripeIntentId(intentId);
      if (!payment || payment.userId !== req.session.userId!) {
        return res.status(404).json({ message: "No booking found for this payment" });
      }
      return res.json({ payment, bookingReference: payment.duffelBookingRef, orderId: payment.duffelOrderId });
    } catch (err: any) {
      return res.status(500).json({ message: err.message || "Failed to check booking" });
    }
  });

  // REFUND REQUESTS
  app.post("/api/payments/:id/refund-request", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const reason = (req.body?.reason || "").toString().slice(0, 2000);
      const payment = await storage.getPayment(id);
      if (!payment || payment.userId !== req.session.userId!) {
        return res.status(404).json({ message: "Payment not found" });
      }
      if (payment.status !== "paid") {
        return res.status(400).json({ message: "Only paid bookings can be refunded" });
      }
      if (payment.refundStatus === "requested" || payment.refundStatus === "approved") {
        return res.status(400).json({ message: "A refund has already been requested for this booking" });
      }

      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ message: "User not found" });

      const updated = await storage.updatePayment(id, {
        refundStatus: "requested",
        refundRequestedAt: new Date(),
        refundReason: reason || null,
      });

      await storage.createNotification({
        userId: req.session.userId!,
        type: "refund_requested",
        title: "Refund request received",
        body: `Your refund request for booking ${payment.duffelBookingRef || `#${payment.id}`} was submitted. We'll be in touch shortly.`,
        linkUrl: `/billing`,
      });

      sendRefundRequestEmails({
        user: { email: user.email, firstName: user.firstName, lastName: user.lastName },
        payment: {
          id: payment.id,
          amount: payment.amount,
          currency: payment.currency,
          duffelBookingRef: payment.duffelBookingRef,
          duffelOrderId: payment.duffelOrderId,
        },
        reason,
      }).catch((e) => console.error("refund email error:", e));

      return res.json({ payment: updated });
    } catch (err: any) {
      console.error("Refund request error:", err);
      return res.status(500).json({ message: err.message || "Failed to submit refund request" });
    }
  });

  // CALENDAR ENTRIES
  app.get("/api/calendar-entries", isAuthenticated, async (req: Request, res: Response) => {
    const entries = await storage.getCalendarEntries(req.session.userId!);
    return res.json(entries);
  });

  // TRIPS (booked flights with Duffel order details)
  app.get("/api/trips", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const pymts = await storage.getPayments(req.session.userId!);
      const bookedPayments = pymts.filter(p =>
        p.status === "paid" && (p.duffelOrderId || p.manualBookingDetails)
      );

      const trips = await Promise.all(
        bookedPayments.map(async (payment) => {
          const isManual = !payment.duffelOrderId && !!payment.manualBookingDetails;
          let orderData: any = null;

          if (payment.duffelOrderId && duffel) {
            try {
              const order = await duffel.orders.get(payment.duffelOrderId);
              orderData = order.data;
            } catch (err: any) {
              console.warn(`Failed to fetch Duffel order ${payment.duffelOrderId}:`, err.message);
            }
          } else if (isManual) {
            orderData = synthesizeOrderFromManualDetails(payment.manualBookingDetails);
          }

          let manual: { routeSummary: string | null; passengerCount: number; departingAt: string | null } | null = null;
          if (isManual && payment.manualBookingDetails && typeof payment.manualBookingDetails === "object") {
            const d = payment.manualBookingDetails as {
              slices?: Array<{ origin?: string; destination?: string; departingAt?: string }>;
              passengers?: unknown[];
              routeSummary?: string | null;
            };
            const derived = (d.slices || [])
              .map((s) => `${s.origin || "?"} → ${s.destination || "?"}`)
              .join(" / ");
            manual = {
              routeSummary: (d.routeSummary && d.routeSummary.trim()) || derived || null,
              passengerCount: Array.isArray(d.passengers) ? d.passengers.length : 0,
              departingAt: d.slices?.[0]?.departingAt || null,
            };
          }

          return {
            id: payment.id,
            bookingReference: payment.duffelBookingRef,
            duffelOrderId: payment.duffelOrderId,
            amount: payment.amount,
            currency: payment.currency,
            status: payment.status,
            bookedAt: payment.createdAt,
            proposalId: payment.proposalId,
            isManual,
            manual,
            order: orderData,
          };
        })
      );

      return res.json(trips);
    } catch (err: any) {
      console.error("Error fetching trips:", err);
      return res.status(500).json({ message: "Failed to fetch trips" });
    }
  });

  // SAVED CARDS
  app.get("/api/saved-cards", isAuthenticated, async (req: Request, res: Response) => {
    const cards = await storage.getSavedCards(req.session.userId!);
    return res.json(cards);
  });

  app.post("/api/saved-cards", isAuthenticated, async (req: Request, res: Response) => {
    const { cardBrand, lastFour, expiryMonth, expiryYear, cardholderName, isDefault } = req.body;
    if (!lastFour || !expiryMonth || !expiryYear || !cardholderName) {
      return res.status(400).json({ message: "Card details are required" });
    }
    const card = await storage.createSavedCard({
      userId: req.session.userId!,
      cardBrand: cardBrand || "visa",
      lastFour,
      expiryMonth,
      expiryYear,
      cardholderName,
      isDefault: isDefault ?? true,
    });
    return res.json(card);
  });

  app.delete("/api/saved-cards/:id", isAuthenticated, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    await storage.deleteSavedCard(id, req.session.userId!);
    return res.json({ message: "Card removed" });
  });

  app.post("/api/saved-cards/:id/default", isAuthenticated, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    await storage.setDefaultCard(id, req.session.userId!);
    return res.json({ message: "Default card updated" });
  });

  // DUFFEL FLIGHT SEARCH & BOOKING
  const duffelToken = process.env.DUFFEL_API_TOKEN;
  const duffel = duffelToken
    ? new Duffel({ token: duffelToken })
    : null;
  const isTestMode = duffelToken?.startsWith("duffel_test_") ?? false;
  if (duffel) {
    console.log(`[Duffel] Initialized (testMode=${isTestMode})`);
  } else {
    console.error("[Duffel] DUFFEL_API_TOKEN is NOT set — flight search and booking will be disabled and post-call proposals will fall back to placeholder content");
  }

  app.get("/api/duffel/config", isAuthenticated, async (_req: Request, res: Response) => {
    return res.json({ testMode: isTestMode });
  });

  app.get("/api/duffel/places", isAuthenticated, async (req: Request, res: Response) => {
    if (!duffel) return res.status(503).json({ message: "Duffel is not configured" });
    try {
      const query = req.query.query as string;
      if (!query || query.length < 2) {
        return res.json({ places: [] });
      }
      const response = await duffel.suggestions.list({ query });
      const places = (response.data || []).map((place: any) => ({
        id: place.id,
        iataCode: place.iata_code,
        name: place.name,
        cityName: place.city_name || place.city?.name,
        countryName: place.country_name,
        type: place.type,
        icaoCode: place.icao_code,
        latitude: place.latitude,
        longitude: place.longitude,
      }));
      return res.json({ places });
    } catch (err: any) {
      console.error("Duffel places error:", err?.errors || err);
      return res.status(500).json({ message: "Failed to search airports" });
    }
  });

  app.post("/api/promo/validate", isAuthenticated, async (req: Request, res: Response) => {
    const { code } = req.body || {};
    const user = await storage.getUser(req.session.userId!);
    const result = await validatePromoCodeForUser(code, user?.email);
    if (!result.ok) {
      return res.status(400).json({ valid: false, message: result.reason });
    }
    return res.json({
      valid: true,
      code: result.code,
      overrideAmountCents: result.overrideAmountCents,
      forceManual: result.forceManual,
    });
  });

  app.post("/api/stripe/create-flight-payment-intent", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { amount, currency, offerId, proposalId, itemId, promoCode } = req.body;
      if (!amount || !currency) return res.status(400).json({ message: "Amount and currency are required" });

      const serverAmount = parseFloat(String(amount));
      if (!serverAmount || serverAmount <= 0) return res.status(400).json({ message: "Invalid amount" });

      const user = await storage.getUser(req.session.userId!);
      let promoMeta: { code: string; promoId: number; forceManual: boolean } | null = null;
      let amountInCents = Math.round(serverAmount * 100);

      if (promoCode) {
        const promo = await validatePromoCodeForUser(String(promoCode), user?.email);
        if (!promo.ok) {
          return res.status(400).json({ message: `Promo code rejected: ${promo.reason}` });
        }
        amountInCents = promo.overrideAmountCents;
        promoMeta = { code: promo.code, promoId: promo.promoId, forceManual: promo.forceManual };
      }

      const stripe = await getUncachableStripeClient();
      const fee = promoMeta
        ? { originalCents: amountInCents, feeCents: 0, totalCents: amountInCents }
        : applyConvenienceFee(amountInCents);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: fee.totalCents,
        currency: String(currency).toLowerCase(),
        automatic_payment_methods: { enabled: true },
        metadata: {
          userId: req.session.userId!,
          type: "flight_booking",
          original_amount: String(fee.originalCents),
          convenience_fee: String(fee.feeCents),
          convenience_fee_percent: promoMeta ? "0" : String(CONVENIENCE_FEE_PERCENT),
          ...(offerId ? { offerId } : {}),
          ...(proposalId ? { proposalId: String(proposalId) } : {}),
          ...(itemId ? { itemId: String(itemId) } : {}),
          ...(promoMeta ? {
            promoCode: promoMeta.code,
            promoId: String(promoMeta.promoId),
            promoForceManual: promoMeta.forceManual ? "1" : "0",
          } : {}),
        },
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        promoApplied: promoMeta ? { code: promoMeta.code, forceManual: promoMeta.forceManual, chargedAmountCents: fee.totalCents } : null,
      });
    } catch (err: any) {
      console.error("Stripe flight PaymentIntent error:", err);
      res.status(500).json({ message: err.message || "Failed to create payment" });
    }
  });

  app.post("/api/duffel/book-direct", isAuthenticated, async (req: Request, res: Response) => {
    if (!duffel) return res.status(503).json({ message: "Duffel is not configured" });
    try {
      const { offerId, passengers, stripePaymentIntentId, useBalance } = req.body;
      if (!offerId) return res.status(400).json({ message: "Offer ID is required" });

      if (useBalance && !isTestMode) {
        return res.status(400).json({ message: "Balance payment is only available in test mode" });
      }
      if (!useBalance && !stripePaymentIntentId) return res.status(400).json({ message: "Payment method is required" });
      if (!passengers || !Array.isArray(passengers) || passengers.length === 0) {
        return res.status(400).json({ message: "Passenger details are required" });
      }

      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ message: "User not found" });

      let offer: any;
      try {
        offer = await duffel.offers.get(offerId);
      } catch (offerErr: any) {
        const offerErrMsg = offerErr?.errors?.[0]?.message || "";
        if (offerErrMsg.toLowerCase().includes("does not exist") || offerErr?.status === 404) {
          return res.status(400).json({ message: "This flight offer is no longer available. Please go back and search for flights again." });
        }
        throw offerErr;
      }
      const fullOffer = offer.data as any;

      let paidPiAmountCents: number | null = null;
      let appliedPromo: { id: number; code: string; forceManual: boolean } | null = null;
      if (stripePaymentIntentId) {
        const stripe = await getUncachableStripeClient();
        const pi = await stripe.paymentIntents.retrieve(stripePaymentIntentId);
        if (pi.status !== "succeeded") {
          return res.status(400).json({ message: "Payment not confirmed. Please complete payment first." });
        }
        if (pi.metadata?.userId !== req.session.userId!) {
          return res.status(403).json({ message: "Payment does not belong to this user" });
        }
        const piPromoCode = pi.metadata?.promoCode || null;
        if (piPromoCode) {
          const promo = await validatePromoCodeForUser(piPromoCode, user.email);
          if (promo.ok) {
            appliedPromo = { id: promo.promoId, code: promo.code, forceManual: promo.forceManual };
          } else {
            console.warn("[promo] PI metadata promo no longer valid:", piPromoCode, promo.reason);
          }
        }
        if (!appliedPromo) {
          const expectedCents = Math.round(parseFloat(fullOffer.total_amount) * 100);
          const expectedTotalCents = applyConvenienceFee(expectedCents).totalCents;
          if (pi.amount < expectedTotalCents) {
            return res.status(400).json({ message: "Payment amount is insufficient for this flight" });
          }
        }
        if (pi.currency !== fullOffer.total_currency.toLowerCase()) {
          return res.status(400).json({ message: "Payment currency does not match the flight currency" });
        }
        paidPiAmountCents = pi.amount;
      }

      // Idempotency: if this PaymentIntent was already processed, return the existing booking/fallback
      if (stripePaymentIntentId) {
        const existing = await storage.getPaymentByStripeIntentId(stripePaymentIntentId);
        if (existing) {
          if (existing.status === "pending_manual") {
            return res.json({
              status: "pending_manual",
              booking: { payment: existing, bookingReference: null, orderId: null },
              message: "Payment received. Our concierge team will finalize your booking and email you shortly.",
            });
          }
          return res.json({
            booking: {
              payment: existing,
              bookingReference: existing.duffelBookingRef,
              orderId: existing.duffelOrderId,
            },
          });
        }
      }

      if (fullOffer.expires_at && new Date(fullOffer.expires_at) < new Date()) {
        return res.status(400).json({ message: "This flight offer has expired. Please search again for current availability." });
      }

      if (fullOffer.passenger_identity_documents_required) {
        return res.status(400).json({ message: "This flight requires passenger identity documents (passport/ID), which are not yet supported. Please choose a different flight." });
      }

      const passengerMappings = (fullOffer.passengers || []).map((p: any, idx: number) => {
        const pax = passengers[idx] || passengers[0];
        if (!pax?.bornOn || !pax?.phone || !pax?.title || !pax?.gender) {
          throw new Error(`Complete details required for passenger ${idx + 1} (date of birth, phone, title, gender)`);
        }
        return {
          id: p.id,
          given_name: pax.givenName || user.firstName,
          family_name: pax.familyName || user.lastName,
          born_on: pax.bornOn,
          email: user.email,
          phone_number: pax.phone,
          title: pax.title,
          gender: pax.gender,
        };
      });

      if (user.email) {
        for (const pax of passengers) {
          if (pax?.phone) {
            await storage.upsertPhoneEmailMap(pax.phone, user.email).catch((e) =>
              console.warn("[phone-email-map] upsert from book-direct failed:", e?.message || e)
            );
          }
        }
      }

      // Atomically consume one promo slot BEFORE we touch Duffel or write a fallback row.
      // If maxUses has just been reached by a concurrent request, abort cleanly.
      if (appliedPromo) {
        const consumed = await storage.incrementPromoUsage(appliedPromo.id);
        if (!consumed) {
          return res.status(409).json({ message: "Promo code is no longer available (fully redeemed)." });
        }
      }

      const balanceOk = await isDuffelBalanceSufficient(parseFloat(fullOffer.total_amount), fullOffer.total_currency);
      // Force pending-manual when an admin promo with forceManual is in effect, or when balance is insufficient.
      const forceManualByPromo = !!(appliedPromo?.forceManual);
      // Only divert to manual fallback when the customer has paid via Stripe
      // (useBalance/test-mode flows have no captured payment to back the fallback).
      if ((forceManualByPromo || !balanceOk) && stripePaymentIntentId && paidPiAmountCents != null) {
        const payment = await createManualBookingFallback({
          userId: req.session.userId!,
          userEmail: user.email,
          proposalId: null,
          proposalTitle: null,
          offerId,
          fullOffer,
          passengerMappings,
          paidPiAmountCents,
          stripePaymentIntentId: stripePaymentIntentId || null,
          endpoint: "POST /api/duffel/book-direct",
        });
        if (appliedPromo) {
          await storage.updatePayment(payment.id, { appliedPromoCode: appliedPromo.code }).catch((e) => console.warn("[promo] stamp failed:", e));
        }
        return res.json({
          status: "pending_manual",
          booking: { payment, bookingReference: null, orderId: null },
          message: "Payment received. Our concierge team will finalize your booking and email you shortly.",
        });
      }

      const order = await duffel.orders.create({
        selected_offers: [offerId],
        passengers: passengerMappings,
        type: "instant",
        payments: [{
          type: "balance" as const,
          amount: fullOffer.total_amount,
          currency: fullOffer.total_currency,
        }],
        ...(stripePaymentIntentId ? { metadata: { stripe_payment_intent_id: stripePaymentIntentId } } : {}),
      } as any);

      const orderData = order.data as any;

      const flightAmountStr = orderData.total_amount || fullOffer.total_amount;
      const flightAmountCents = Math.round(parseFloat(flightAmountStr) * 100);
      const fallbackTotalCents = applyConvenienceFee(flightAmountCents).totalCents;
      const chargedTotalCents = paidPiAmountCents ?? fallbackTotalCents;
      const chargedTotalAmount = (chargedTotalCents / 100).toFixed(2);

      const payment = await storage.createPayment({
        userId: req.session.userId!,
        proposalId: null,
        stripePaymentIntentId: stripePaymentIntentId || null,
        duffelOrderId: orderData.id,
        duffelBookingRef: orderData.booking_reference,
        amount: chargedTotalAmount,
        currency: (orderData.total_currency || "usd").toLowerCase(),
        status: "paid",
        appliedPromoCode: appliedPromo?.code ?? null,
      });

      await storage.createNotification({
        userId: req.session.userId!,
        type: "payment_confirmed",
        title: "Flight booked!",
        body: `Your flight has been booked. Booking reference: ${orderData.booking_reference}`,
        linkUrl: `/billing`,
      });

      await createCalendarEntriesFromOrder({
        userId: req.session.userId!,
        paymentId: payment.id,
        proposalId: null,
        orderData,
      });

      sendBookingConfirmationEmail(user.email, {
        firstName: user.firstName,
        bookingReference: orderData.booking_reference,
        amount: orderData.total_amount || fullOffer.total_amount,
        currency: orderData.total_currency || fullOffer.total_currency || "usd",
        cabinClass: fullOffer.slices?.[0]?.segments?.[0]?.passengers?.[0]?.cabin_class_marketing_name
          || fullOffer.slices?.[0]?.segments?.[0]?.passengers?.[0]?.cabin_class
          || null,
        slices: (orderData.slices || []).map((s: any) => ({
          origin: { iata: s.origin?.iata_code, city: s.origin?.city_name, name: s.origin?.name },
          destination: { iata: s.destination?.iata_code, city: s.destination?.city_name, name: s.destination?.name },
          departingAt: s.segments?.[0]?.departing_at,
          arrivingAt: s.segments?.[s.segments.length - 1]?.arriving_at,
          carrierName: s.segments?.[0]?.marketing_carrier?.name || null,
          carrierIata: s.segments?.[0]?.marketing_carrier?.iata_code || null,
          flightNumber: s.segments?.[0]?.marketing_carrier_flight_number || null,
        })),
        passengers: orderData.passengers,
      }).catch((e) => console.error("booking email error:", e));

      return res.json({
        booking: {
          payment,
          bookingReference: orderData.booking_reference,
          orderId: orderData.id,
        },
      });
    } catch (err: any) {
      console.error("Duffel direct booking error:", err?.errors || err);
      const duffelErr = err?.errors?.[0];
      const errMessage = duffelErr
        ? `${duffelErr.title ? duffelErr.title + ": " : ""}${duffelErr.message || "Booking failed"}${duffelErr.code ? ` (${duffelErr.code})` : ""}`
        : err.message || "Booking failed";
      const { offerId, stripePaymentIntentId } = req.body;
      const alertUser = await storage.getUser(req.session.userId!).catch(() => null);
      await sendBookingFailureAlert({
        endpoint: "POST /api/duffel/book-direct",
        userId: req.session.userId,
        userEmail: alertUser?.email,
        stripePaymentIntentId: stripePaymentIntentId || null,
        offerId,
        proposalId: null,
        error: err,
      });
      return res.status(500).json({ message: errMessage });
    }
  });

  app.post("/api/duffel/search", isAuthenticated, async (req: Request, res: Response) => {
    if (!duffel) return res.status(503).json({ message: "Duffel is not configured" });
    try {
      const { origin, destination, departureDate, returnDate, passengers, cabinClass } = req.body;
      if (!origin || !destination || !departureDate) {
        return res.status(400).json({ message: "Origin, destination, and departure date are required" });
      }

      const slices: any[] = [{ origin, destination, departure_date: departureDate }];
      if (returnDate) {
        slices.push({ origin: destination, destination: origin, departure_date: returnDate });
      }

      const passengerList = passengers || [{ type: "adult" as const }];

      const offerRequest = await duffel.offerRequests.create({
        slices,
        passengers: passengerList,
        cabin_class: cabinClass || "economy",
        return_offers: true,
      });

      const offers = (offerRequest.data as any).offers || [];
      const simplified = offers.slice(0, 20).map((offer: any) => ({
        id: offer.id,
        totalAmount: offer.total_amount,
        totalCurrency: offer.total_currency,
        expiresAt: offer.expires_at,
        owner: offer.owner,
        slices: offer.slices?.map((slice: any) => ({
          id: slice.id,
          duration: slice.duration,
          origin: { iata: slice.origin?.iata_code, name: slice.origin?.name, city: slice.origin?.city_name },
          destination: { iata: slice.destination?.iata_code, name: slice.destination?.name, city: slice.destination?.city_name },
          segments: slice.segments?.map((seg: any) => ({
            id: seg.id,
            departingAt: seg.departing_at,
            arrivingAt: seg.arriving_at,
            origin: { iata: seg.origin?.iata_code, name: seg.origin?.name },
            destination: { iata: seg.destination?.iata_code, name: seg.destination?.name },
            carrier: {
              name: seg.marketing_carrier?.name,
              iata: seg.marketing_carrier?.iata_code,
              logoUrl: seg.marketing_carrier?.logo_symbol_url || seg.marketing_carrier?.logo_lockup_url,
            },
            flightNumber: seg.marketing_carrier_flight_number,
            aircraft: seg.aircraft?.name,
            cabinClass: seg.passengers?.[0]?.cabin_class_marketing_name || seg.passengers?.[0]?.cabin_class,
            baggages: seg.passengers?.[0]?.baggages,
          })),
        })),
        passengers: offer.passengers,
        passengerIdentityDocumentsRequired: offer.passenger_identity_documents_required ?? false,
        enrichment: enrichOfferDetails(offer),
      }));

      return res.json({ offers: simplified });
    } catch (err: any) {
      console.error("Duffel search error:", err?.errors || err);
      return res.status(500).json({ message: err?.errors?.[0]?.message || "Flight search failed" });
    }
  });

  app.get("/api/duffel/offers/:offerId", isAuthenticated, async (req: Request, res: Response) => {
    if (!duffel) return res.status(503).json({ message: "Duffel is not configured" });
    try {
      const offer = await duffel.offers.get(req.params.offerId);
      return res.json(offer.data);
    } catch (err: any) {
      console.error("Duffel offer fetch error:", err?.errors || err);
      return res.status(500).json({ message: err?.errors?.[0]?.message || "Failed to fetch offer" });
    }
  });

  app.post("/api/duffel/search-for-passengers", isAuthenticated, async (req: Request, res: Response) => {
    if (!duffel) return res.status(503).json({ message: "Duffel is not configured" });
    try {
      const { origin, destination, departureDate, returnDate, cabinClass, passengerCount } = req.body;
      if (!origin || !destination || !departureDate || !passengerCount) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      const count = Math.max(1, Math.min(9, parseInt(passengerCount)));
      const slices: any[] = [{ origin, destination, departure_date: departureDate }];
      if (returnDate) slices.push({ origin: destination, destination: origin, departure_date: returnDate });
      const passengerList = Array.from({ length: count }, () => ({ type: "adult" as const }));
      const offerRequest = await duffel.offerRequests.create({
        slices,
        passengers: passengerList,
        cabin_class: cabinClass || "economy",
        return_offers: true,
      });
      const offers = ((offerRequest.data as any).offers || []).sort(
        (a: any, b: any) => parseFloat(a.total_amount) - parseFloat(b.total_amount)
      );
      if (offers.length === 0) {
        return res.status(404).json({ message: "No flights available for that passenger count" });
      }
      const best = offers[0];
      const simplified = {
        id: best.id,
        totalAmount: best.total_amount,
        totalCurrency: best.total_currency,
        expiresAt: best.expires_at,
        owner: best.owner,
        slices: best.slices?.map((slice: any) => ({
          id: slice.id,
          duration: slice.duration,
          origin: { iata: slice.origin?.iata_code, name: slice.origin?.name, city: slice.origin?.city_name },
          destination: { iata: slice.destination?.iata_code, name: slice.destination?.name, city: slice.destination?.city_name },
          segments: slice.segments?.map((seg: any) => ({
            id: seg.id,
            departingAt: seg.departing_at,
            arrivingAt: seg.arriving_at,
            origin: { iata: seg.origin?.iata_code, name: seg.origin?.name },
            destination: { iata: seg.destination?.iata_code, name: seg.destination?.name },
            carrier: {
              name: seg.marketing_carrier?.name,
              iata: seg.marketing_carrier?.iata_code,
              logoUrl: seg.marketing_carrier?.logo_symbol_url || seg.marketing_carrier?.logo_lockup_url,
            },
            flightNumber: seg.marketing_carrier_flight_number,
            aircraft: seg.aircraft?.name,
            cabinClass: seg.passengers?.[0]?.cabin_class_marketing_name || seg.passengers?.[0]?.cabin_class,
            baggages: seg.passengers?.[0]?.baggages,
          })),
        })),
        passengers: best.passengers,
        enrichment: enrichOfferDetails(best),
      };
      return res.json({ offer: simplified });
    } catch (err: any) {
      console.error("Duffel search-for-passengers error:", err?.errors || err);
      return res.status(500).json({ message: err?.errors?.[0]?.message || "Flight search failed" });
    }
  });

  app.post("/api/proposals/:proposalId/items/:itemId/refresh-flight", isAuthenticated, async (req: Request, res: Response) => {
    if (!duffel) return res.status(503).json({ message: "Duffel is not configured" });
    try {
      const proposalId = parseInt(req.params.proposalId);
      const itemId = parseInt(req.params.itemId);

      const proposal = await storage.getProposal(proposalId);
      if (!proposal || proposal.userId !== req.session.userId!) {
        return res.status(404).json({ message: "Proposal not found" });
      }

      const items = await storage.getProposalItems(proposalId);
      const item = items.find((i) => i.id === itemId);
      if (!item) return res.status(404).json({ message: "Item not found" });

      const { origin, destination, departureDate, returnDate, cabinClass, passengerCount } = req.body;
      if (!origin || !destination || !departureDate || !cabinClass) {
        return res.status(400).json({ message: "origin, destination, departureDate, and cabinClass are required" });
      }

      const count = Math.max(1, Math.min(9, parseInt(passengerCount) || 1));
      const slices: any[] = [{ origin, destination, departure_date: departureDate }];
      if (returnDate) slices.push({ origin: destination, destination: origin, departure_date: returnDate });
      const passengerList = Array.from({ length: count }, () => ({ type: "adult" as const }));

      const offerRequest = await duffel.offerRequests.create({
        slices,
        passengers: passengerList,
        cabin_class: cabinClass as any,
        return_offers: true,
      });

      const offers = ((offerRequest.data as any).offers || []).sort(
        (a: any, b: any) => parseFloat(a.total_amount) - parseFloat(b.total_amount)
      );

      if (offers.length === 0) {
        return res.status(404).json({ message: "No flights found for those preferences. Try different dates or cabin class." });
      }

      const best = offers[0];
      const cabinLabels: Record<string, string> = { economy: "Economy", premium_economy: "Premium Economy", business: "Business", first: "First Class" };
      const cabinLabel = cabinLabels[cabinClass] || cabinClass;
      const simplified = {
        id: best.id,
        totalAmount: best.total_amount,
        totalCurrency: best.total_currency,
        expiresAt: best.expires_at,
        owner: best.owner,
        slices: best.slices?.map((slice: any) => ({
          id: slice.id,
          duration: slice.duration,
          origin: { iata: slice.origin?.iata_code, name: slice.origin?.name, city: slice.origin?.city_name },
          destination: { iata: slice.destination?.iata_code, name: slice.destination?.name, city: slice.destination?.city_name },
          segments: slice.segments?.map((seg: any) => ({
            id: seg.id,
            departingAt: seg.departing_at,
            arrivingAt: seg.arriving_at,
            origin: { iata: seg.origin?.iata_code, name: seg.origin?.name },
            destination: { iata: seg.destination?.iata_code, name: seg.destination?.name },
            carrier: {
              name: seg.marketing_carrier?.name,
              iata: seg.marketing_carrier?.iata_code,
              logoUrl: seg.marketing_carrier?.logo_symbol_url || seg.marketing_carrier?.logo_lockup_url,
            },
            flightNumber: seg.marketing_carrier_flight_number,
            aircraft: seg.aircraft?.name,
            cabinClass: seg.passengers?.[0]?.cabin_class_marketing_name || seg.passengers?.[0]?.cabin_class,
            baggages: seg.passengers?.[0]?.baggages,
          })),
        })),
        passengers: best.passengers,
        passengerIdentityDocumentsRequired: best.passenger_identity_documents_required ?? false,
        searchParams: { origin, destination, departureDate, returnDate: returnDate || null, cabinClass, passengers: count },
      };

      const routeSummary = `${origin} to ${destination}`;
      await storage.updateProposalItem(itemId, {
        duffelOfferId: best.id,
        duffelOfferData: simplified,
        priceEstimate: best.total_amount,
        description: `${cabinLabel} Flight: ${routeSummary}`,
      });

      return res.json({ offer: simplified });
    } catch (err: any) {
      console.error("Duffel refresh-flight error:", err?.errors || err);
      return res.status(500).json({ message: err?.errors?.[0]?.message || "Flight search failed" });
    }
  });

  app.post("/api/proposals/:id/book-duffel", isAuthenticated, async (req: Request, res: Response) => {
    if (!duffel) return res.status(503).json({ message: "Duffel is not configured" });
    const proposalId = parseInt(req.params.id);
    const proposal = await storage.getProposal(proposalId);
    if (!proposal || proposal.userId !== req.session.userId!) {
      return res.status(404).json({ message: "Proposal not found" });
    }
    if (proposal.status !== "approved" && proposal.status !== "sent") {
      return res.status(400).json({ message: "Proposal cannot be booked in its current state" });
    }

    try {
      const items = await storage.getProposalItems(proposalId);
      const flightItems = items.filter((i) => i.duffelOfferId && i.duffelOfferData);

      if (flightItems.length === 0) {
        return res.status(400).json({ message: "No Duffel flight offers attached to this proposal" });
      }

      // Implicit approval: booking a specific flight is itself the approval action.
      // Promote `sent` proposals to `approved` here so the user doesn't need a separate click.
      if (proposal.status === "sent") {
        await storage.updateProposal(proposalId, { status: "approved" });
        await storage.createNotification({
          userId: req.session.userId!,
          type: "proposal_approved",
          title: "Proposal approved",
          body: `You approved "${proposal.title}".`,
          linkUrl: `/proposals/${proposalId}`,
        });
      }

      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const { passengers, stripePaymentIntentId, itemId, useBalance, overrideOfferId, overrideOfferData } = req.body;

      if (useBalance && !isTestMode) {
        return res.status(400).json({ message: "Balance payment is only available in test mode" });
      }
      if (!stripePaymentIntentId && !useBalance) {
        return res.status(400).json({ message: "Payment method is required" });
      }

      if (!passengers || !Array.isArray(passengers) || passengers.length === 0) {
        return res.status(400).json({ message: "Passenger details are required" });
      }

      const selectedItem = itemId
        ? flightItems.find(i => i.id === itemId)
        : flightItems[0];

      if (!selectedItem) {
        return res.status(400).json({ message: "Selected flight offer not found" });
      }

      const effectiveOfferId = overrideOfferId || selectedItem.duffelOfferId!;

      // Fetch the live offer from Duffel to get current price and validity.
      // The stored offerData can be stale; Duffel would reject orders with wrong amounts.
      let liveOffer: any;
      try {
        liveOffer = await duffel.offers.get(effectiveOfferId);
      } catch (offerErr: any) {
        const offerErrMsg = offerErr?.errors?.[0]?.message || "";
        if (offerErrMsg.toLowerCase().includes("does not exist") || offerErr?.status === 404) {
          return res.status(400).json({ message: "This flight offer is no longer available. Please go back and search for flights again." });
        }
        throw offerErr;
      }
      const fullOffer = liveOffer.data as any;

      if (fullOffer.expires_at && new Date(fullOffer.expires_at) < new Date()) {
        return res.status(400).json({ message: "This flight offer has expired. Please search again for current availability." });
      }

      if (fullOffer.passenger_identity_documents_required) {
        return res.status(400).json({ message: "This flight requires passenger identity documents (passport/ID), which are not yet supported. Please choose a different flight." });
      }

      const expectedPassengerCount = fullOffer.passengers?.length || 1;

      if (passengers.length !== expectedPassengerCount) {
        return res.status(400).json({
          message: `Expected ${expectedPassengerCount} passenger(s) but received ${passengers.length}`,
        });
      }

      const offerPassengerIds = fullOffer.passengers?.map((p: any) => p.id) || [];
      const passengerMappings = passengers.map((p: any, idx: number) => ({
        id: offerPassengerIds[idx] || undefined,
        given_name: p.givenName,
        family_name: p.familyName,
        born_on: p.bornOn,
        email: user.email,
        phone_number: p.phone,
        title: p.title,
        gender: p.gender,
      }));

      if (user.email) {
        for (const p of passengers) {
          if (p?.phone) {
            await storage.upsertPhoneEmailMap(p.phone, user.email).catch((e) =>
              console.warn("[phone-email-map] upsert from proposal book-duffel failed:", e?.message || e)
            );
          }
        }
      }

      const amount = fullOffer.total_amount;
      const currency = fullOffer.total_currency;

      let paidPiAmountCents: number | null = null;
      let appliedPromo: { id: number; code: string; forceManual: boolean } | null = null;
      if (stripePaymentIntentId) {
        const stripe = await getUncachableStripeClient();
        const pi = await stripe.paymentIntents.retrieve(stripePaymentIntentId);
        if (pi.status !== "succeeded") {
          return res.status(400).json({ message: "Payment not confirmed. Please complete payment first." });
        }
        if (pi.metadata?.userId !== req.session.userId!) {
          return res.status(403).json({ message: "Payment does not belong to this user" });
        }
        const piPromoCode = pi.metadata?.promoCode || null;
        if (piPromoCode) {
          const promo = await validatePromoCodeForUser(piPromoCode, user.email);
          if (promo.ok) {
            appliedPromo = { id: promo.promoId, code: promo.code, forceManual: promo.forceManual };
          } else {
            console.warn("[promo] PI metadata promo no longer valid:", piPromoCode, promo.reason);
          }
        }
        if (!appliedPromo) {
          const expectedCents = Math.round(parseFloat(amount) * 100);
          const expectedTotalCents = applyConvenienceFee(expectedCents).totalCents;
          if (pi.amount < expectedTotalCents) {
            return res.status(400).json({ message: "Payment amount is insufficient for this flight" });
          }
        }
        if (pi.currency !== currency.toLowerCase()) {
          return res.status(400).json({ message: "Payment currency does not match the flight currency" });
        }
        paidPiAmountCents = pi.amount;
      }

      // Idempotency: if this PaymentIntent was already processed, return the existing booking/fallback
      if (stripePaymentIntentId) {
        const existing = await storage.getPaymentByStripeIntentId(stripePaymentIntentId);
        if (existing) {
          if (existing.status === "pending_manual") {
            return res.json({
              status: "pending_manual",
              bookings: [{ payment: existing, bookingReference: null, orderId: null }],
              message: "Payment received. Our concierge team will finalize your booking and email you shortly.",
            });
          }
          return res.json({
            bookings: [{
              payment: existing,
              bookingReference: existing.duffelBookingRef,
              orderId: existing.duffelOrderId,
            }],
          });
        }
      }

      // Atomically consume one promo slot BEFORE we touch Duffel or write a fallback row.
      if (appliedPromo) {
        const consumed = await storage.incrementPromoUsage(appliedPromo.id);
        if (!consumed) {
          return res.status(409).json({ message: "Promo code is no longer available (fully redeemed)." });
        }
      }

      const balanceOk = await isDuffelBalanceSufficient(parseFloat(String(amount)), String(currency));
      // Force pending-manual when an admin promo with forceManual is in effect, or when balance is insufficient.
      const forceManualByPromo = !!(appliedPromo?.forceManual);
      // Only divert to manual fallback when the customer has paid via Stripe
      // (useBalance/test-mode flows have no captured payment to back the fallback).
      if ((forceManualByPromo || !balanceOk) && stripePaymentIntentId && paidPiAmountCents != null) {
        const payment = await createManualBookingFallback({
          userId: req.session.userId!,
          userEmail: user.email,
          proposalId,
          proposalTitle: proposal.title,
          offerId: effectiveOfferId,
          fullOffer,
          passengerMappings,
          paidPiAmountCents,
          stripePaymentIntentId: stripePaymentIntentId || null,
          endpoint: `POST /api/proposals/${proposalId}/book-duffel`,
        });
        if (appliedPromo) {
          await storage.updatePayment(payment.id, { appliedPromoCode: appliedPromo.code }).catch((e) => console.warn("[promo] stamp failed:", e));
        }
        return res.json({
          status: "pending_manual",
          bookings: [{ payment, bookingReference: null, orderId: null }],
          message: "Payment received. Our concierge team will finalize your booking and email you shortly.",
        });
      }

      const order = await duffel.orders.create({
        selected_offers: [effectiveOfferId],
        passengers: passengerMappings,
        type: "instant",
        payments: [{
          type: "balance" as const,
          amount: String(amount),
          currency,
        }],
        ...(stripePaymentIntentId ? { metadata: { stripe_payment_intent_id: stripePaymentIntentId } } : {}),
      } as any);

      const orderData = order.data as any;

      const flightAmountStr = orderData.total_amount || selectedItem.priceEstimate;
      const flightAmountCents = Math.round(parseFloat(String(flightAmountStr)) * 100);
      const fallbackTotalCents = applyConvenienceFee(flightAmountCents).totalCents;
      const chargedTotalCents = paidPiAmountCents ?? fallbackTotalCents;
      const chargedTotalAmount = (chargedTotalCents / 100).toFixed(2);

      const payment = await storage.createPayment({
        userId: req.session.userId!,
        proposalId,
        stripePaymentIntentId: stripePaymentIntentId || null,
        duffelOrderId: orderData.id,
        duffelBookingRef: orderData.booking_reference,
        amount: chargedTotalAmount,
        currency: (orderData.total_currency || "usd").toLowerCase(),
        status: "paid",
        appliedPromoCode: appliedPromo?.code ?? null,
      });

      const result = {
        payment,
        bookingReference: orderData.booking_reference,
        orderId: orderData.id,
      };

      await storage.updateProposal(proposalId, { status: "approved" });

      await storage.createNotification({
        userId: req.session.userId!,
        type: "payment_confirmed",
        title: "Flight booked!",
        body: `Your flight for "${proposal.title}" has been booked. Reference: ${result.bookingReference}`,
        linkUrl: `/proposals/${proposalId}`,
      });

      await createCalendarEntriesFromOrder({
        userId: req.session.userId!,
        paymentId: payment.id,
        proposalId,
        orderData,
      });

      sendBookingConfirmationEmail(user.email, {
        firstName: user.firstName,
        bookingReference: orderData.booking_reference,
        amount: orderData.total_amount || amount,
        currency: orderData.total_currency || currency || "usd",
        cabinClass: orderData.slices?.[0]?.segments?.[0]?.passengers?.[0]?.cabin_class_marketing_name
          || orderData.slices?.[0]?.segments?.[0]?.passengers?.[0]?.cabin_class
          || null,
        slices: (orderData.slices || []).map((s: any) => ({
          origin: { iata: s.origin?.iata_code, city: s.origin?.city_name, name: s.origin?.name },
          destination: { iata: s.destination?.iata_code, city: s.destination?.city_name, name: s.destination?.name },
          departingAt: s.segments?.[0]?.departing_at,
          arrivingAt: s.segments?.[s.segments.length - 1]?.arriving_at,
          carrierName: s.segments?.[0]?.marketing_carrier?.name || null,
          carrierIata: s.segments?.[0]?.marketing_carrier?.iata_code || null,
          flightNumber: s.segments?.[0]?.marketing_carrier_flight_number || null,
        })),
        passengers: orderData.passengers,
      }).catch((e) => console.error("booking email error:", e));

      return res.json({ bookings: [result] });
    } catch (err: any) {
      console.error("Duffel booking error:", err?.errors || err);
      const duffelErr = err?.errors?.[0];
      const errMessage = duffelErr
        ? `${duffelErr.title ? duffelErr.title + ": " : ""}${duffelErr.message || "Booking failed"}${duffelErr.code ? ` (${duffelErr.code})` : ""}`
        : err.message || "Booking failed";
      const alertUser = await storage.getUser(req.session.userId!).catch(() => null);
      await sendBookingFailureAlert({
        endpoint: `POST /api/proposals/${proposalId}/book-duffel`,
        userId: req.session.userId,
        userEmail: alertUser?.email,
        stripePaymentIntentId: req.body.stripePaymentIntentId || null,
        offerId: req.body.overrideOfferId || undefined,
        proposalId,
        error: err,
      });
      return res.status(500).json({ message: errMessage });
    }
  });

  // ==================== ADMIN ====================

  app.get("/api/admin/stats", isAuthenticated, requireAdmin, async (_req: Request, res: Response) => {
    const stats = await storage.adminGetStats();
    // Live Duffel balance via shared helper. The @duffel/api SDK does not
    // expose a Balance resource, so this is a direct HTTP call to /air/balance.
    // Returns null on any failure so the admin UI shows "Unavailable".
    const balance = await getDuffelBalance();
    let blandCallsTotal: number | null = null;
    if (bland.isConfigured()) {
      try {
        const list = await bland.listCalls(1);
        if (typeof list.total_count === "number") blandCallsTotal = list.total_count;
      } catch (e) {
        console.warn("[Admin] Bland total_count fetch failed:", (e as Error)?.message || e);
      }
    }
    return res.json({
      ...stats,
      calls: blandCallsTotal ?? stats.calls,
      callsSource: blandCallsTotal != null ? "bland" : "db",
      duffelBalance: balance,
    });
  });

  // Inferred Duffel balance: admin-set seed minus paid Duffel-booked payments.
  const DUFFEL_SEED_KEY = "duffel_balance_seed";
  const DEFAULT_DUFFEL_SEED = 550;

  async function buildInferredBalance() {
    const setting = await storage.getSetting(DUFFEL_SEED_KEY);
    const seed = setting ? parseFloat(setting.value) : DEFAULT_DUFFEL_SEED;
    const seedNumber = Number.isFinite(seed) ? seed : DEFAULT_DUFFEL_SEED;
    const totalSpent = await storage.getDuffelSpentTotal();
    return {
      estimated: seedNumber - totalSpent,
      seed: seedNumber,
      totalSpent,
      lastUpdated: setting ? setting.updatedAt.toISOString() : null,
    };
  }

  app.get("/api/admin/duffel-balance", isAuthenticated, requireAdmin, async (_req: Request, res: Response) => {
    const data = await buildInferredBalance();
    return res.json(data);
  });

  // Hotels Phase 1: admin-only sanity-check for the hotel provider abstraction.
  // Read-only — does NOT persist anything (Phase 2 owns persistence). Returns
  // normalized search results plus the top 3-5 ranked options. Logs are
  // truncated to first 300 chars and never include credentials.
  const hotelTestSearchSchema = z.object({
    destination: z.string().trim().min(1).max(120),
    checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "checkInDate must be YYYY-MM-DD"),
    checkOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "checkOutDate must be YYYY-MM-DD"),
    adults: z.number().int().min(1).max(20),
    children: z.number().int().min(0).max(20).optional(),
    rooms: z.number().int().min(1).max(10).optional(),
    budgetPerNight: z.number().positive().max(100_000).optional(),
    totalHotelBudget: z.number().positive().max(1_000_000).optional(),
    refundableOnly: z.boolean().optional(),
    amenities: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
    neighborhood: z.string().trim().min(1).max(120).optional(),
    hotelType: z.string().trim().min(1).max(40).optional(),
    starRatingMin: z.number().min(1).max(5).optional(),
    // Phase 1 only knows the mock provider, so this field is accepted for
    // API-contract completeness but ignored — selection is driven by the
    // HOTEL_PROVIDER env via getHotelProvider(). Phase 3 will honor it.
    provider: z.string().trim().min(1).max(40).optional(),
  });

  app.post("/api/admin/hotels/test-search", isAuthenticated, requireAdmin, async (req: Request, res: Response) => {
    try {
      const parsed = hotelTestSearchSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid request" });
      }
      const request = parsed.data;
      if (Date.parse(request.checkOutDate) <= Date.parse(request.checkInDate)) {
        return res.status(400).json({ message: "checkOutDate must be after checkInDate" });
      }

      const provider = getHotelProvider();
      // Truncate echoed body to first 300 chars per the no-PII-in-logs rule.
      const echoed = JSON.stringify(request).slice(0, 300);
      console.log(`[hotels] test-search provider=${provider.name} body=${echoed}`);

      try {
        const options = await provider.searchHotels(request);
        const rankedTop = rankHotels(options, request);

        return res.json({
          provider: provider.name,
          configured: provider.isConfigured(),
          request,
          options,
          rankedTop,
        });
      } catch (innerErr) {
        // Phase 3: real adapters are stubs that throw NotConfiguredError on
        // every method until a future task implements them. Surface a clear
        // status to the admin tester instead of a 500.
        if (innerErr instanceof HotelProviderNotConfiguredError) {
          return res.status(200).json({
            provider: provider.name,
            configured: provider.isConfigured(),
            request,
            options: [],
            rankedTop: [],
            stubNotImplemented: true,
            message: innerErr.message,
          });
        }
        throw innerErr;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Hotel test search failed";
      console.error("[hotels] test-search failed:", msg);
      return res.status(500).json({ message: msg });
    }
  });

  // Hotels Phase 3: admin-only side-by-side comparison of all registered
  // hotel providers (mock + 5 real stubs). Read-only. Never returns env
  // values — only env var names from `requiredEnv`.
  app.get("/api/admin/hotels/providers", isAuthenticated, requireAdmin, async (_req: Request, res: Response) => {
    try {
      // `requested` = raw HOTEL_PROVIDER env value. `resolved` = the
      // adapter we're actually running after fallback-to-mock. We surface
      // both so admins can spot misconfigurations at a glance (e.g.
      // requested=expedia, resolved=mock means creds are missing).
      const requested = (process.env.HOTEL_PROVIDER || "mock").toLowerCase();
      const resolved = getHotelProvider().name;
      const providers = getAllProviderInfo();
      return res.json({ active: resolved, requested, resolved, providers });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to list hotel providers";
      console.error("[hotels] providers list failed:", msg);
      return res.status(500).json({ message: msg });
    }
  });

  // Hotels Phase 4: read-only admin lookup of recent hotel searches for a
  // given call request. Returns the search rows only (not options) so the
  // admin UI can list/select. `sourceRawPayload` lives on options, not on
  // searches, so nothing PII-sensitive is exposed here.
  app.get(
    "/api/admin/hotels/searches",
    isAuthenticated,
    requireAdmin,
    async (req: Request, res: Response) => {
      try {
        const callRequestIdRaw = req.query.callRequestId;
        const callRequestId = parseInt(String(callRequestIdRaw ?? ""), 10);
        if (!Number.isFinite(callRequestId) || callRequestId <= 0) {
          return res.status(400).json({ message: "callRequestId query param is required" });
        }
        const searches = await storage.getHotelSearchesByCallRequest(callRequestId);
        return res.json({ callRequestId, searches });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to list hotel searches";
        console.error("[hotels] admin searches list failed:", msg);
        return res.status(500).json({ message: msg });
      }
    },
  );

  // Hotels Phase 4: read-only admin detail for a single hotel search +
  // its persisted options. By default we strip the admin-only
  // `sourceRawPayload` field from each option (it can be huge and contains
  // raw provider responses). Pass `?raw=true` to include it for deep
  // debugging — still gated behind requireAdmin.
  app.get(
    "/api/admin/hotels/searches/:id",
    isAuthenticated,
    requireAdmin,
    async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (!Number.isFinite(id) || id <= 0) {
          return res.status(400).json({ message: "Invalid search id" });
        }
        const search = await storage.getHotelSearch(id);
        if (!search) {
          return res.status(404).json({ message: "Hotel search not found" });
        }
        const options = await storage.getHotelOptionsBySearch(id);
        const includeRaw = String(req.query.raw || "").toLowerCase() === "true";
        const sanitizedOptions = includeRaw
          ? options
          : options.map(({ sourceRawPayload, ...rest }) => rest);
        return res.json({ search, options: sanitizedOptions });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load hotel search";
        console.error("[hotels] admin search detail failed:", msg);
        return res.status(500).json({ message: msg });
      }
    },
  );

  app.get("/api/admin/promo-codes", isAuthenticated, requireAdmin, async (_req: Request, res: Response) => {
    const list = await storage.listPromoCodes();
    return res.json(list);
  });

  app.post("/api/admin/promo-codes", isAuthenticated, requireAdmin, async (req: Request, res: Response) => {
    try {
      const body = req.body || {};
      const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
      if (!code || code.length < 3 || code.length > 32) {
        return res.status(400).json({ message: "Code must be 3-32 characters" });
      }
      const overrideAmountCents = Number(body.overrideAmountCents);
      if (!Number.isFinite(overrideAmountCents) || overrideAmountCents < 50) {
        return res.status(400).json({ message: "overrideAmountCents must be a number >= 50" });
      }
      const forceManual = !!body.forceManual;
      const adminOnly = body.adminOnly === false ? false : true;
      const maxUses = body.maxUses == null || body.maxUses === ""
        ? null
        : Number(body.maxUses);
      if (maxUses != null && (!Number.isFinite(maxUses) || maxUses < 1)) {
        return res.status(400).json({ message: "maxUses must be a positive integer or null" });
      }
      let expiresAt: Date | null = null;
      if (body.expiresAt) {
        const d = new Date(body.expiresAt);
        if (isNaN(d.getTime())) return res.status(400).json({ message: "Invalid expiresAt" });
        expiresAt = d;
      }
      const description = typeof body.description === "string" ? body.description.trim().slice(0, 280) : null;

      const existing = await storage.getPromoCodeByCode(code);
      if (existing) return res.status(409).json({ message: "Promo code already exists" });

      const created = await storage.createPromoCode({
        code,
        description,
        overrideAmountCents,
        forceManual,
        adminOnly,
        maxUses,
        expiresAt,
        active: true,
        createdBy: req.session.userId!,
      });
      return res.json(created);
    } catch (err) {
      console.error("[admin] createPromoCode failed:", err);
      const msg = err instanceof Error ? err.message : "Failed to create promo code";
      return res.status(500).json({ message: msg });
    }
  });

  app.delete("/api/admin/promo-codes/:id", isAuthenticated, requireAdmin, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });
    const updated = await storage.deactivatePromoCode(id);
    if (!updated) return res.status(404).json({ message: "Promo code not found" });
    return res.json(updated);
  });

  app.post("/api/admin/duffel-balance/update", isAuthenticated, requireAdmin, async (req: Request, res: Response) => {
    const raw = req.body?.balance;
    const parsed = typeof raw === "number" ? raw : parseFloat(String(raw));
    if (!Number.isFinite(parsed)) {
      return res.status(400).json({ message: "balance must be a finite number" });
    }
    await storage.setSetting(DUFFEL_SEED_KEY, String(parsed));
    const data = await buildInferredBalance();
    return res.json(data);
  });

  app.get("/api/admin/calls-live", isAuthenticated, requireAdmin, async (_req: Request, res: Response) => {
    if (!bland.isConfigured()) {
      const fallback = await storage.adminGetAllCallRequests();
      const userIds = Array.from(new Set(fallback.map((c) => c.userId)));
      const usersList = await storage.adminGetUsersByIds(userIds);
      const userMap = new Map(usersList.map((u) => [u.id, { email: u.email, firstName: u.firstName, lastName: u.lastName }]));
      return res.json({
        source: "db",
        calls: fallback.map((c) => ({ ...c, user: userMap.get(c.userId) || null })),
        total_count: fallback.length,
      });
    }
    try {
      const list = await bland.listCalls(50);
      return res.json({ source: "bland", calls: list.calls, total_count: list.total_count ?? list.calls.length });
    } catch (err) {
      console.warn("[Admin] /api/admin/calls-live Bland fetch failed, falling back to DB:", (err as Error)?.message || err);
      const fallback = await storage.adminGetAllCallRequests();
      const userIds = Array.from(new Set(fallback.map((c) => c.userId)));
      const usersList = await storage.adminGetUsersByIds(userIds);
      const userMap = new Map(usersList.map((u) => [u.id, { email: u.email, firstName: u.firstName, lastName: u.lastName }]));
      return res.json({
        source: "db",
        calls: fallback.map((c) => ({ ...c, user: userMap.get(c.userId) || null })),
        total_count: fallback.length,
        error: (err as Error)?.message || "Bland AI request failed",
      });
    }
  });

  app.get("/api/admin/users", isAuthenticated, requireAdmin, async (_req: Request, res: Response) => {
    const all = await storage.adminGetAllUsers();
    return res.json(all.map(({ password, verificationToken, passwordResetToken, ...rest }) => ({ ...rest, isAdmin: isAdminEmail(rest.email) })));
  });

  app.get("/api/admin/payments", isAuthenticated, requireAdmin, async (_req: Request, res: Response) => {
    const list = await storage.adminGetAllPayments();
    const userIds = Array.from(new Set(list.map((p) => p.userId)));
    const usersList = await storage.adminGetUsersByIds(userIds);
    const userMap = new Map(usersList.map((u) => [u.id, { email: u.email, firstName: u.firstName, lastName: u.lastName }]));
    return res.json(list.map((p) => ({ ...p, user: userMap.get(p.userId) || null })));
  });

  // Confirmed bookings: all paid payments
  app.get("/api/admin/bookings", isAuthenticated, requireAdmin, async (_req: Request, res: Response) => {
    const list = (await storage.adminGetAllPayments()).filter((p) => p.status === "paid");
    const userIds = Array.from(new Set(list.map((p) => p.userId)));
    const usersList = await storage.adminGetUsersByIds(userIds);
    const userMap = new Map(usersList.map((u) => [u.id, { email: u.email, firstName: u.firstName, lastName: u.lastName }]));
    return res.json(list.map((p) => ({ ...p, user: userMap.get(p.userId) || null })));
  });

  app.get("/api/admin/pending-manual", isAuthenticated, requireAdmin, async (_req: Request, res: Response) => {
    const list = await storage.adminGetPaymentsByStatus("pending_manual");
    const userIds = Array.from(new Set(list.map((p) => p.userId)));
    const usersList = await storage.adminGetUsersByIds(userIds);
    const userMap = new Map(usersList.map((u) => [u.id, { email: u.email, firstName: u.firstName, lastName: u.lastName }]));
    return res.json(list.map((p) => ({ ...p, user: userMap.get(p.userId) || null })));
  });

  app.post("/api/admin/pending-manual/:id/complete", isAuthenticated, requireAdmin, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid payment ID" });
    const { duffelBookingRef, duffelOrderId, notes } = req.body || {};
    if (!duffelBookingRef || typeof duffelBookingRef !== "string" || !duffelBookingRef.trim()) {
      return res.status(400).json({ message: "Booking reference is required to mark a manual booking complete" });
    }
    const payment = await storage.getPayment(id);
    if (!payment) return res.status(404).json({ message: "Payment not found" });
    if (payment.status !== "pending_manual") {
      return res.status(400).json({ message: "Payment is not in pending_manual status" });
    }
    const updated = await storage.updatePayment(id, {
      status: "paid",
      duffelBookingRef: duffelBookingRef.trim(),
      duffelOrderId: duffelOrderId || null,
      manualBookingNotes: notes || null,
      manualBookingResolvedAt: new Date(),
      manualBookingResolvedBy: req.session.userId!,
    });
    await storage.createNotification({
      userId: payment.userId,
      type: "payment_confirmed",
      title: "Booking confirmed!",
      body: `Your flight has been booked. Booking reference: ${duffelBookingRef.trim()}`,
      linkUrl: "/billing",
    });

    // Best-effort: send manual booking confirmation email. Failure must not abort the operation.
    try {
      const customer = await storage.getUser(payment.userId);
      if (customer?.email) {
        const details = (payment.manualBookingDetails || {}) as {
          slices?: ManualBookingSlice[];
          passengers?: ManualBookingPassenger[];
        };
        const fromEmail = process.env.SENDGRID_FROM_EMAIL || "hello@travnr.com";
        const baseUrl = getBaseUrl(req);
        const firstSliceCarrier = details.slices?.[0]?.carrier || null;
        const { subject, html } = buildManualBookingConfirmationEmail({
          firstName: customer.firstName,
          bookingReference: duffelBookingRef.trim(),
          amount: payment.amount,
          currency: payment.currency,
          passengers: details.passengers,
          slices: details.slices,
          airlineName: firstSliceCarrier,
          notes: notes || null,
          dashboardUrl: `${baseUrl}/trips`,
        });
        await sgMail.send({ to: customer.email, from: { email: fromEmail, name: "Travnr" }, subject, html });
        console.log(`[admin] Manual booking confirmation email sent to ${customer.email} for payment ${payment.id}`);
      }
    } catch (mailErr) {
      console.error("[admin] Failed to send manual booking confirmation email (non-fatal):", mailErr);
    }

    return res.json(updated);
  });

  // ==================== ADMIN EMAIL PREVIEW / TEST ====================

  app.get("/api/admin/email/catalog", isAuthenticated, requireAdmin, async (_req: Request, res: Response) => {
    return res.json(EMAIL_CATALOG);
  });

  app.get("/api/admin/email/preview", isAuthenticated, requireAdmin, async (req: Request, res: Response) => {
    const type = String(req.query.type || "") as EmailTypeId;
    if (!EMAIL_CATALOG.some((e) => e.id === type)) {
      return res.status(400).json({ message: "Unknown email type" });
    }
    const baseUrl = getBaseUrl(req);
    const rendered = buildSampleEmail(type, baseUrl);
    return res.json(rendered);
  });

  app.post("/api/admin/email/test", isAuthenticated, requireAdmin, async (req: Request, res: Response) => {
    const type = String(req.body?.type || "") as EmailTypeId;
    if (!EMAIL_CATALOG.some((e) => e.id === type)) {
      return res.status(400).json({ message: "Unknown email type" });
    }
    const sessionUser = await storage.getUser(req.session.userId!);
    const recipient = sessionUser?.email;
    if (!recipient) return res.status(400).json({ message: "Could not resolve admin email" });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
      return res.status(400).json({ message: "Recipient email is not a valid address" });
    }
    if (!process.env.SENDGRID_API_KEY) {
      return res.status(503).json({ message: "SendGrid is not configured" });
    }
    const baseUrl = getBaseUrl(req);
    const { subject, html } = buildSampleEmail(type, baseUrl);
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || "hello@travnr.com";
    try {
      await sgMail.send({
        to: recipient,
        from: { email: fromEmail, name: "Travnr" },
        subject: `[TEST] ${subject}`,
        html,
      });
      return res.json({ ok: true, recipient });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send test email";
      console.error("[admin] Test email send failed:", err);
      return res.status(502).json({ message });
    }
  });

  // Dev-only SMS dry-run endpoint. Returns 404 in production so there is no
  // production endpoint that can send SMS to arbitrary numbers. Even in dev,
  // `sendSms` will dry-run by default (SMS_DRY_RUN defaults to on).
  app.post("/api/admin/sms-dry-run", isAuthenticated, requireAdmin, async (req: Request, res: Response) => {
    if (process.env.NODE_ENV === "production") {
      return res.status(404).json({ message: "Not found" });
    }
    const phone = typeof req.body?.phone === "string" ? req.body.phone : "";
    if (!phone.trim()) return res.status(400).json({ message: "phone is required" });
    const normalized = normalizePhoneE164(phone);
    const proposalUrl =
      typeof req.body?.proposalUrl === "string" && req.body.proposalUrl.trim()
        ? req.body.proposalUrl.trim()
        : `${getBaseUrl(req)}/proposal/sample-token`;
    const message = buildGuestProposalSms({ proposalUrl });
    const result = await sendSms({ to: normalized || phone, body: message });
    return res.json({
      message,
      messageLength: message.length,
      maskedTo: maskPhone(normalized),
      result,
    });
  });

  app.get("/api/admin/calls", isAuthenticated, requireAdmin, async (_req: Request, res: Response) => {
    const list = await storage.adminGetAllCallRequests();
    const userIds = Array.from(new Set(list.map((c) => c.userId)));
    const usersList = await storage.adminGetUsersByIds(userIds);
    const userMap = new Map(usersList.map((u) => [u.id, { email: u.email, firstName: u.firstName, lastName: u.lastName }]));
    return res.json(list.map((c) => ({ ...c, user: userMap.get(c.userId) || null })));
  });

  // ==================== BLAND AI INTEGRATION ====================

  app.get("/api/bland/config", isAuthenticated, async (_req: Request, res: Response) => {
    return res.json({ configured: bland.isConfigured() });
  });

  app.get("/api/bland/calls", isAuthenticated, async (req: Request, res: Response) => {
    const calls = await storage.getBlandCalls(req.session.userId!);
    return res.json(calls);
  });

  app.get("/api/bland/calls/:callRequestId", isAuthenticated, async (req: Request, res: Response) => {
    const callRequestId = parseInt(req.params.callRequestId);
    if (isNaN(callRequestId)) return res.status(400).json({ message: "Invalid call request ID" });
    const callRequest = await storage.getCallRequest(callRequestId);
    if (!callRequest || callRequest.userId !== req.session.userId!) {
      return res.status(404).json({ message: "Call request not found" });
    }
    const calls = await storage.getBlandCallsByCallRequest(callRequestId);
    return res.json(calls);
  });

  app.post("/api/bland/dispatch", isAuthenticated, async (req: Request, res: Response) => {
    if (!bland.isConfigured()) return res.status(503).json({ message: "Bland AI is not configured" });
    let blandCall: any = null;
    let callRequest: any = null;
    let user: any = null;
    try {
      const { callRequestId } = req.body;
      if (!callRequestId) return res.status(400).json({ message: "Call request ID is required" });

      callRequest = await storage.getCallRequest(callRequestId);
      if (!callRequest) return res.status(404).json({ message: "Call request not found" });
      if (callRequest.userId !== req.session.userId!) return res.status(403).json({ message: "Unauthorized" });
      if (!callRequest.phone) return res.status(400).json({ message: "No phone number on call request" });

      user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ message: "User not found" });

      const baseUrl = getBaseUrl(req);
      const task = bland.buildTravelConciergePrompt({
        userName: `${user.firstName} ${user.lastName}`,
        destination: callRequest.destination,
        tripType: callRequest.tripType,
        dateFrom: callRequest.dateFrom,
        dateTo: callRequest.dateTo,
        flexibility: callRequest.flexibility,
        timeWindow: callRequest.timeWindow,
        notes: callRequest.notes,
        email: user.email || null,
      });

      blandCall = await storage.createBlandCall({
        callRequestId: callRequest.id,
        userId: user.id,
        phoneNumber: callRequest.phone,
        status: "queued",
      });

      const result = await bland.dispatchCall({
        phoneNumber: callRequest.phone,
        task,
        webhookUrl: `${baseUrl}/api/bland/webhook`,
        dynamicDataUrl: `${baseUrl}/api/bland/dynamic-data`,
        dynamicDataHeaders: { "x-bland-secret": bland.getWebhookSecret() },
        metadata: {
          callRequestId: callRequest.id,
          userId: user.id,
          blandCallDbId: blandCall.id,
        },
        record: true,
      });

      await storage.updateBlandCall(blandCall.id, {
        blandCallId: result.callId,
        status: "queued",
      });

      await storage.updateCallRequest(callRequest.id, { status: "scheduled" });

      return res.json({
        blandCallId: result.callId,
        dbCallId: blandCall.id,
        status: result.status,
      });
    } catch (err: any) {
      console.error("Bland AI dispatch error:", err);
      if (blandCall) {
        await storage.updateBlandCall(blandCall.id, {
          status: "failed",
          errorMessage: err?.message || String(err),
        }).catch(() => {});
      }
      if (callRequest) {
        await storage.updateCallRequest(callRequest.id, { status: "cancelled" }).catch(() => {});
      }
      if (user) {
        await storage.createNotification({
          userId: user.id,
          type: "call_status",
          title: "Call could not be placed",
          body: "We were unable to dispatch your concierge call. Please try again from Call History.",
          linkUrl: "/call-history",
        }).catch(() => {});
      }
      return res.status(500).json({ message: err.message || "Failed to dispatch call" });
    }
  });

  app.post("/api/call-requests/:id/generate-proposal", isAuthenticated, async (req: Request, res: Response) => {
    const callRequestId = parseInt(req.params.id);
    const callRequest = await storage.getCallRequest(callRequestId);
    if (!callRequest || callRequest.userId !== req.session.userId!) {
      return res.status(404).json({ message: "Call request not found" });
    }
    if (callRequest.status !== "completed") {
      return res.status(400).json({ message: "Call must be completed before generating a proposal" });
    }
    const existingProposals = await storage.getProposalsByCallRequest(callRequestId);
    if (existingProposals.length > 0) {
      let allFallbacks = true;
      for (const ep of existingProposals) {
        const items = await storage.getProposalItems(ep.id);
        const isFallback = items.length === 0 || items.every(i => !i.duffelOfferId && (parseFloat(i.priceEstimate ?? "0") === 0));
        if (!isFallback) { allFallbacks = false; break; }
      }
      if (!allFallbacks) {
        return res.status(400).json({ message: "A real proposal already exists for this call" });
      }
    }

    const blandCalls = await storage.getBlandCallsByCallRequest(callRequestId);
    const completedCall = blandCalls?.find(c => c.status === "completed");
    const callSummary = completedCall?.summary || null;
    const callTranscript = completedCall?.transcript || null;

    try {
      await generateProposalFromCall(callRequestId, req.session.userId!, callSummary, callTranscript);
      return res.json({ message: "Proposal generated successfully" });
    } catch (err: any) {
      console.error("Manual proposal generation error:", err);
      return res.status(500).json({ message: err.message || "Failed to generate proposal" });
    }
  });

  // Cities served by multiple airports. When the transcript only resolves to a
  // bare city name (e.g. "New York", "London"), this lets us flag ambiguity in
  // logs so we can track how often the AI failed to confirm a specific airport.
  const MULTI_AIRPORT_CITIES: Record<string, string[]> = {
    "new york": ["JFK", "LGA", "EWR"],
    "nyc": ["JFK", "LGA", "EWR"],
    "london": ["LHR", "LGW", "STN", "LTN", "LCY", "SEN"],
    "paris": ["CDG", "ORY", "BVA"],
    "tokyo": ["HND", "NRT"],
    "chicago": ["ORD", "MDW"],
    "washington": ["DCA", "IAD", "BWI"],
    "washington dc": ["DCA", "IAD", "BWI"],
    "houston": ["IAH", "HOU"],
    "miami": ["MIA", "FLL"],
    "san francisco": ["SFO", "OAK", "SJC"],
    "bay area": ["SFO", "OAK", "SJC"],
    "los angeles": ["LAX", "BUR", "LGB", "SNA", "ONT"],
    "moscow": ["SVO", "DME", "VKO"],
    "berlin": ["BER"],
    "rome": ["FCO", "CIA"],
    "milan": ["MXP", "LIN", "BGY"],
    "stockholm": ["ARN", "BMA", "NYO"],
    "shanghai": ["PVG", "SHA"],
    "seoul": ["ICN", "GMP"],
    "buenos aires": ["EZE", "AEP"],
    "sao paulo": ["GRU", "CGH", "VCP"],
    "dallas": ["DFW", "DAL"],
    // Cities that exist in many places — empty list signals "multi-geography ambiguous";
    // the traveler must specify state/country to disambiguate.
    "springfield": [], // ambiguous: IL, MA, MO, OR, ...
    "portland": ["PDX", "PWM"], // OR vs ME
    "richmond": [], // VA, CA, ...
    "columbus": [], // OH, GA, IN, ...
  };

  function isAmbiguousCity(name: string): { ambiguous: boolean; options: string[] } {
    const key = name.trim().toLowerCase().replace(/[.,]+$/, "");
    if (!Object.prototype.hasOwnProperty.call(MULTI_AIRPORT_CITIES, key)) {
      return { ambiguous: false, options: [] };
    }
    const options = MULTI_AIRPORT_CITIES[key];
    // Only flag as ambiguous when there are multiple airport choices, OR when the list
    // is empty (signaling multi-geography ambiguity that needs state/country). A
    // single-airport entry is unambiguous and should not produce noisy warnings.
    if (options.length === 1) return { ambiguous: false, options };
    return { ambiguous: true, options };
  }

  // The Bland AI prompt instructs the agent to emit a <TRAVEL_DETAILS>{...}</TRAVEL_DETAILS>
  // JSON block at the end of the call summary with confirmed IATA codes and ISO dates.
  // Parsing this structured block is far more reliable than regex over free-form prose,
  // especially for ambiguous city names and multi-airport cities.
  function parseStructuredTravelBlock(text: string): {
    origin: string | null;
    destination: string | null;
    departureDate: string | null;
    returnDate: string | null;
    passengers: number | null;
    cabinClass: string | null;
    budget: number | null;
    timePreference: string | null;
    notes: string | null;
    email: string | null;
  } | null {
    if (!text) return null;
    const blockMatch = text.match(/<TRAVEL_DETAILS>\s*([\s\S]*?)\s*<\/TRAVEL_DETAILS>/i);
    if (!blockMatch) return null;
    let raw = blockMatch[1].trim();
    // Strip code fences if the model wrapped the JSON in ```json ... ```
    raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Lenient retry: replace single quotes and trailing commas
      try {
        const lenient = raw.replace(/,\s*([}\]])/g, "$1").replace(/'([^']*)'\s*:/g, '"$1":').replace(/:\s*'([^']*)'/g, ': "$1"');
        parsed = JSON.parse(lenient);
      } catch (err: any) {
        console.warn(`parseStructuredTravelBlock: failed to JSON.parse <TRAVEL_DETAILS> block: ${err?.message || err}`);
        return null;
      }
    }
    if (!parsed || typeof parsed !== "object") return null;

    const normIata = (v: any): string | null => {
      if (typeof v !== "string") return null;
      const trimmed = v.trim().toUpperCase();
      return /^[A-Z]{3}$/.test(trimmed) ? trimmed : null;
    };
    const normDate = (v: any): string | null => {
      if (typeof v !== "string") return null;
      const trimmed = v.trim();
      return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
    };
    const normCabin = (v: any): string | null => {
      if (typeof v !== "string") return null;
      const t = v.trim().toLowerCase().replace(/[\s-]+/g, "_");
      const allowed = ["economy", "premium_economy", "business", "first"];
      return allowed.includes(t) ? t : null;
    };
    const normPax = (v: any): number | null => {
      const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
      return Number.isFinite(n) && n >= 1 && n <= 20 ? n : null;
    };
    const normBudget = (v: any): number | null => {
      if (v === null || v === undefined || v === "") return null;
      const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^0-9.]/g, ""));
      return Number.isFinite(n) && n > 0 ? n : null;
    };
    const normEmail = (v: any): string | null => {
      if (typeof v !== "string") return null;
      const t = v.trim().toLowerCase();
      // Basic shape check; downstream sender layers should re-validate before send.
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t) ? t : null;
    };

    return {
      origin: normIata(parsed.origin_iata),
      destination: normIata(parsed.destination_iata),
      departureDate: normDate(parsed.departure_date),
      returnDate: normDate(parsed.return_date),
      passengers: normPax(parsed.passengers),
      cabinClass: normCabin(parsed.cabin_class),
      budget: normBudget(parsed.budget_usd),
      // The legacy <TRAVEL_DETAILS> block predates these analysis fields, so
      // they are always null here. Bland's post-call analysis_schema is now
      // the sole source for time_preference / notes.
      timePreference: null,
      notes: null,
      email: normEmail(parsed.email),
    };
  }

  // Shape of Bland's post-call analysis_schema output. Every field is optional
  // because Bland returns null (or omits) any field it could not determine
  // from the transcript. Numeric fields can arrive as numbers or strings.
  interface BlandAnalysisPayload {
    origin_iata?: string | null;
    origin_airport_name?: string | null;
    destination_iata?: string | null;
    destination_airport_name?: string | null;
    departure_date?: string | null;
    return_date?: string | null;
    passengers?: number | string | null;
    cabin_class?: string | null;
    budget_usd?: number | string | null;
    time_preference?: string | null;
    notes?: string | null;
    email?: string | null;
  }

  // Canonical normalized shape shared by parseStructuredTravelBlock and
  // normalizeBlandAnalysis so the precedence logic can mix them safely.
  interface NormalizedTravelDetails {
    origin: string | null;
    destination: string | null;
    departureDate: string | null;
    returnDate: string | null;
    passengers: number | null;
    cabinClass: string | null;
    budget: number | null;
    timePreference: string | null;
    notes: string | null;
    email: string | null;
  }

  // Bland delivers the analysis_schema output under different keys depending
  // on the event/version. Walk the known locations and return the first
  // object-shaped match, so persistence + parsing don't silently miss it.
  function extractAnalysisFromBlandPayload(payload: any): BlandAnalysisPayload | null {
    if (!payload || typeof payload !== "object") return null;
    const candidates: unknown[] = [
      payload.analysis,
      payload.summary?.analysis,
      payload.analysis_schema,
      payload.analysisSchema,
    ];
    for (const c of candidates) {
      if (c && typeof c === "object" && !Array.isArray(c)) {
        return c as BlandAnalysisPayload;
      }
    }
    return null;
  }

  // Recover analysis from a persisted bland_calls.variables jsonb blob (the
  // webhook stashes it under `__analysis`). Returns null when the column is
  // empty or the sub-key isn't present.
  function extractAnalysisFromVariables(variables: unknown): BlandAnalysisPayload | null {
    if (!variables || typeof variables !== "object") return null;
    const candidate = (variables as { __analysis?: unknown }).__analysis;
    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      return candidate as BlandAnalysisPayload;
    }
    return null;
  }

  // Normalize Bland's post-call analysis_schema output into the same shape as
  // parseStructuredTravelBlock. Bland returns the analysis as a plain object
  // matching the schema keys (with values typed as strings/numbers/null per
  // the field descriptions). Returns null if analysis is absent or unusable.
  function normalizeBlandAnalysis(analysis: BlandAnalysisPayload | null | undefined): NormalizedTravelDetails | null {
    if (!analysis || typeof analysis !== "object") return null;
    const normIata = (v: unknown): string | null => {
      if (typeof v !== "string") return null;
      const t = v.trim().toUpperCase();
      return /^[A-Z]{3}$/.test(t) ? t : null;
    };
    const normDate = (v: unknown): string | null => {
      if (typeof v !== "string") return null;
      const t = v.trim();
      return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null;
    };
    const normCabin = (v: unknown): string | null => {
      if (typeof v !== "string") return null;
      const t = v.trim().toLowerCase().replace(/[\s-]+/g, "_");
      return ["economy", "premium_economy", "business", "first"].includes(t) ? t : null;
    };
    const normPax = (v: unknown): number | null => {
      const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
      return Number.isFinite(n) && n >= 1 && n <= 20 ? n : null;
    };
    const normBudget = (v: unknown): number | null => {
      if (v === null || v === undefined || v === "") return null;
      const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^0-9.]/g, ""));
      return Number.isFinite(n) && n > 0 ? n : null;
    };
    const normEmail = (v: unknown): string | null => {
      if (typeof v !== "string") return null;
      const t = v.trim().toLowerCase();
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t) ? t : null;
    };
    // Short free-form preference fields. Bland may return "", "null", or
    // "none" when the analysis pass had nothing to record — treat all of
    // those as null. Cap length so an oversized response can't bloat
    // downstream payloads.
    const normShortText = (v: unknown, maxLen: number): string | null => {
      if (typeof v !== "string") return null;
      const t = v.trim();
      if (!t) return null;
      const lower = t.toLowerCase();
      if (lower === "null" || lower === "none" || lower === "n/a") return null;
      return t.length > maxLen ? t.slice(0, maxLen) : t;
    };
    return {
      origin: normIata(analysis.origin_iata),
      destination: normIata(analysis.destination_iata),
      departureDate: normDate(analysis.departure_date),
      returnDate: normDate(analysis.return_date),
      passengers: normPax(analysis.passengers),
      cabinClass: normCabin(analysis.cabin_class),
      budget: normBudget(analysis.budget_usd),
      timePreference: normShortText(analysis.time_preference, 80),
      notes: normShortText(analysis.notes, 200),
      email: normEmail(analysis.email),
    };
  }

  function parseTravelDetailsFromTranscript(transcript: string | null, summary: string | null, analysis?: BlandAnalysisPayload | null): {
    origin: string | null;
    destination: string | null;
    email: string | null;
    departureDate: string | null;
    returnDate: string | null;
    passengers: number;
    cabinClass: string;
    budget: number | null;
    timePreference: string | null;
    notes: string | null;
    sources?: Record<string, string>;
  } {
    const originalText = [summary, transcript].filter(Boolean).join("\n");
    const text = originalText.toLowerCase();
    if (!text && !analysis) return { origin: null, destination: null, email: null, departureDate: null, returnDate: null, passengers: 1, cabinClass: "economy", budget: null, timePreference: null, notes: null, sources: {} };

    const sources: Record<string, string> = {};

    // Highest priority: Bland's post-call analysis_schema output. It runs as a
    // separate LLM pass over the transcript that the caller never hears, so
    // the live agent's prompt no longer carries any JSON example. Falls back
    // to the legacy <TRAVEL_DETAILS> block (for in-flight calls dispatched
    // before this change) and then to regex heuristics over the transcript.
    const blandAnalysis: NormalizedTravelDetails | null = normalizeBlandAnalysis(analysis ?? null);
    const structured: NormalizedTravelDetails | null = parseStructuredTravelBlock(originalText);
    function pickField<K extends keyof NormalizedTravelDetails>(
      key: K,
    ): { value: NormalizedTravelDetails[K] | null; source: string | null } {
      if (blandAnalysis && blandAnalysis[key] !== null && blandAnalysis[key] !== undefined) {
        return { value: blandAnalysis[key], source: "bland_analysis" };
      }
      if (structured && structured[key] !== null && structured[key] !== undefined) {
        return { value: structured[key], source: "structured_block" };
      }
      return { value: null, source: null };
    }

    const originPick = pickField("origin");
    const destPick = pickField("destination");
    let origin: string | null = originPick.value;
    let destination: string | null = destPick.value;
    if (originPick.source) sources.origin = originPick.source;
    if (destPick.source) sources.destination = destPick.source;

    const COMMON_WORDS_SET = new Set(["THE","AND","FOR","ARE","NOT","YOU","ALL","CAN","HER","WAS","ONE","OUR","OUT","HAS","HIS","HOW","ITS","MAY","NEW","NOW","OLD","SEE","WAY","WHO","DID","GET","HIM","LET","SAY","SHE","TOO","USE","JAN","FEB","MAR","APR","JUN","JUL","AUG","SEP","OCT","NOV","DEC","BUT","END","SET","RUN","TRY","ANY","DAY","GOT","PUT","OWN","WHY","BIG","FEW","ASK","MAN","TWO","YET","YES","PER","ADD","AGO","AGE","AID","AIM","AIR","BAD","BAR","BED","BIT","BOX","BOY","BUS","BUY","CAR","CUT","DOG","DRY","DUE","EAR","EAT","ERA","EYE","FAR","FAT","FIT","FLY","FUN","GAP","GAS","GUN","HAD","HIT","HOT","ICE","ILL","JOB","JOY","KEY","LAW","LAY","LED","LEG","LIE","LOT","LOW","MAP","MET","MIX","NOR","ODD","OIL","PAY","PEN","PIE","PIN","PIT","POP","RAW","RED","RID","ROW","SAD","SAT","SIT","SIX","SKI","SKY","SON","SUM","TAX","TEN","TIE","TIN","TIP","TOP","VAN","VIA","WAR","WEB","WET","WIN","WON"]);

    // Step 0: Extract IATA codes from parentheses — the voice AI includes these in its summary
    // e.g., "from St. Louis, Missouri (STL) to Los Angeles, California (LAX)"
    const parenCodes: string[] = [];
    const parenPattern = /\(([A-Z]{3})\)/g;
    let pm: RegExpExecArray | null;
    while ((pm = parenPattern.exec(originalText)) !== null) {
      if (!COMMON_WORDS_SET.has(pm[1])) parenCodes.push(pm[1]);
    }

    // Also look for "from ORIGIN_CODE" / "to DEST_CODE" patterns — but ONLY for standalone all-uppercase codes
    // e.g., "from STL to LAX" or "departing STL"
    const fromCodeMatch = originalText.match(/(?:from|departing)\s+([A-Z]{3})(?:\s|,|\.|\)|$)/);
    const toCodeMatch = originalText.match(/(?:to|arriving)\s+([A-Z]{3})(?:\s|,|\.|\)|$)/);

    if (!origin && fromCodeMatch && !COMMON_WORDS_SET.has(fromCodeMatch[1])) {
      origin = fromCodeMatch[1];
    }
    if (!destination && toCodeMatch && !COMMON_WORDS_SET.has(toCodeMatch[1])) {
      destination = toCodeMatch[1];
    }

    // Use parenthetical codes if we still need origin/destination
    if (parenCodes.length >= 2) {
      if (!origin) origin = parenCodes[0];
      if (!destination) destination = parenCodes[1];
    } else if (parenCodes.length === 1) {
      if (!destination) destination = parenCodes[0];
      else if (!origin) origin = parenCodes[0];
    }

    // Step 1: try "from X to Y" patterns — allow apostrophes, hyphens, periods, digits in place names
    const fromToPatterns = [
      /(?:from|departing|leaving|flying from|traveling from|depart(?:ing)? from)\s+([\w\s''\-\.]+?)\s+(?:to|going to|heading to|flying to|traveling to)\s+([\w\s''\-\.]+?)(?:,|$|\s+on\b|\s+in\b|\s+around\b|\s+for\b|\s+from\b|\s+depart)/i,
      /(?:fly|travel|go|trip|flight)\s+(?:from\s+)?([\w\s''\-\.]+?)\s+to\s+([\w\s''\-\.]+?)(?:,|$|\s+on\b|\s+in\b)/i,
    ];
    if (!origin || !destination) {
      for (const pat of fromToPatterns) {
        const match = text.match(pat);
        if (match) {
          let rawOrigin = match[1].trim().replace(/\s*\([^)]*\)\s*$/, "").trim();
          let rawDest = match[2].trim().replace(/\s*\([^)]*\)\s*$/, "").trim();
          const MONTHS_RE = /^(?:january|february|march|april|may|june|july|august|september|october|november|december)/i;
          if (!MONTHS_RE.test(rawOrigin) && !MONTHS_RE.test(rawDest) && rawOrigin.length > 1 && rawDest.length > 1) {
            if (!origin) origin = rawOrigin;
            if (!destination) destination = rawDest;
            break;
          }
        }
      }
    }

    // Step 2: dedicated destination / origin phrase patterns
    if (!destination) {
      const destPatterns = [
        /(?:going to|heading to|traveling to|fly(?:ing)? to|destination(?:\s*:|\s+is)?|trip to|visit(?:ing)?|book(?:ing)?\s+(?:a\s+)?(?:flight\s+)?to)\s+([\w][\w\s''\-\.]{1,30}?)(?:,|$|\s+on\b|\s+in\b|\s+around\b|\s+for\b|\s+from\b)/i,
      ];
      for (const pat of destPatterns) {
        const match = text.match(pat);
        if (match) {
          destination = match[1].trim().replace(/\s*\([^)]*\)\s*$/, "").trim();
          break;
        }
      }
    }

    // Step 3: scan the ORIGINAL (properly cased) text for "to [ProperNoun]" — handles "to London", "to Paris" etc.
    if (!destination) {
      const SKIP_MONTHS = new Set(["January","February","March","April","May","June","July","August","September","October","November","December"]);
      const SKIP_WORDS = new Set(["The","A","An","Travnr","AI","It","He","She","We","You","They","This","That"]);
      const toCityRe = /\bto\s+([A-Z][a-zA-Z]+(?:[\s\-\.][A-Z][a-zA-Z]+)*)/g;
      let m: RegExpExecArray | null;
      while ((m = toCityRe.exec(originalText)) !== null) {
        const candidate = m[1].trim();
        const firstWord = candidate.split(/[\s\-]/)[0];
        if (!SKIP_MONTHS.has(firstWord) && !SKIP_WORDS.has(firstWord) && candidate.length > 2 && candidate.length < 40) {
          destination = candidate.toLowerCase();
          break;
        }
      }
    }

    if (!origin) {
      const originPatterns = [
        /(?:from|departing|leaving|out of|origin(?:\s*:|\s+is)?)\s+([\w][\w\s''\-\.]{1,30}?)(?:,|$|\s+to\b|\s+on\b)/i,
      ];
      for (const pat of originPatterns) {
        const match = text.match(pat);
        if (match) {
          const rawOrigin = match[1].trim().replace(/\s*\([^)]*\)\s*$/, "").trim();
          const MONTHS_RE = /^(?:january|february|march|april|may|june|july|august|september|october|november|december)/i;
          if (!MONTHS_RE.test(rawOrigin)) {
            origin = rawOrigin;
            break;
          }
        }
      }
    }

    // Step 4: scan original text for "from [ProperNoun]" to fill origin
    if (!origin) {
      const SKIP_MONTHS = new Set(["January","February","March","April","May","June","July","August","September","October","November","December"]);
      const SKIP_WORDS = new Set(["The","A","An","Travnr","AI","It","He","She","We","You","They","This","That"]);
      const fromCityRe = /\bfrom\s+([A-Z][a-zA-Z]+(?:[\s\-\.][A-Z][a-zA-Z]+)*)/g;
      let m: RegExpExecArray | null;
      while ((m = fromCityRe.exec(originalText)) !== null) {
        const candidate = m[1].trim();
        const firstWord = candidate.split(/[\s\-]/)[0];
        if (!SKIP_MONTHS.has(firstWord) && !SKIP_WORDS.has(firstWord) && candidate.length > 2 && candidate.length < 40) {
          origin = candidate.toLowerCase();
          break;
        }
      }
    }

    // Step 5: IATA code extraction (last resort — only fill slots still empty)
    // Only matches all-uppercase standalone 3-letter codes
    const iataPattern = /\b([A-Z]{3})\b/g;
    const iataCodes: string[] = [];
    let iataMatch: RegExpExecArray | null;
    while ((iataMatch = iataPattern.exec(originalText)) !== null) {
      const code = iataMatch[1];
      if (!COMMON_WORDS_SET.has(code) && !parenCodes.includes(code)) iataCodes.push(code);
    }
    if (iataCodes.length >= 2) {
      if (!origin) origin = iataCodes[0];
      if (!destination) destination = iataCodes[1];
    } else if (iataCodes.length === 1) {
      if (destination && !origin) origin = iataCodes[0];
      else if (!destination) destination = iataCodes[0];
    }

    // Mark sources for any fields filled by the regex passes (structured-block fields
    // already had their sources set above and could not be overwritten because every
    // regex pass is gated on `if (!origin)` / `if (!destination)`).
    if (origin && !sources.origin) sources.origin = "regex";
    if (destination && !sources.destination) sources.destination = "regex";

    let departureDate: string | null = blandAnalysis?.departureDate ?? structured?.departureDate ?? null;
    let returnDate: string | null = blandAnalysis?.returnDate ?? structured?.returnDate ?? null;
    if (departureDate) sources.departureDate = blandAnalysis?.departureDate ? "bland_analysis" : "structured_block";
    if (returnDate) sources.returnDate = blandAnalysis?.returnDate ? "bland_analysis" : "structured_block";

    if (!departureDate || !returnDate) {
      const datePattern = /(\d{4}-\d{2}-\d{2})/g;
      const dates: string[] = [];
      let dateMatch;
      while ((dateMatch = datePattern.exec(text)) !== null) {
        dates.push(dateMatch[1]);
      }
      if (!departureDate && dates.length >= 1) { departureDate = dates[0]; sources.departureDate = "regex_iso"; }
      if (!returnDate && dates.length >= 2) { returnDate = dates[1]; sources.returnDate = "regex_iso"; }
    }

    if (!departureDate) {
      const monthDayPatterns = [
        /(?:on|departing|leaving|departure|depart|leave)(?:\s*(?:on|:))?\s*(?:the\s+)?(\w+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?)/i,
        /(\w+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?)\s*(?:to|through|until|[-–])\s*(\w+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?)/i,
        /(\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(?:january|february|march|april|may|june|july|august|september|october|november|december)(?:\s*,?\s*\d{4})?)/i,
      ];
      for (const pat of monthDayPatterns) {
        const mdMatch = text.match(pat);
        if (mdMatch) {
          const cleanDate = (s: string) => s.replace(/(st|nd|rd|th)/gi, "").replace(/\bof\b/gi, "").trim();
          const thisYear = new Date().getFullYear();
          const parsed = new Date(cleanDate(mdMatch[1]));
          if (!isNaN(parsed.getTime())) {
            if (parsed.getFullYear() < thisYear) parsed.setFullYear(thisYear);
            departureDate = parsed.toISOString().split("T")[0];
          }
          if (mdMatch[2] && !returnDate) {
            const parsed2 = new Date(cleanDate(mdMatch[2]));
            if (!isNaN(parsed2.getTime())) {
              if (parsed2.getFullYear() < thisYear) parsed2.setFullYear(thisYear);
              returnDate = parsed2.toISOString().split("T")[0];
            }
          }
          if (departureDate) break;
        }
      }
    }

    if (!returnDate && departureDate) {
      const returnPatterns = [
        /(?:return(?:ing)?|com(?:e|ing)\s+back|back)\s*(?:on|:)?\s*(?:the\s+)?(\w+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?)/i,
        /(?:return(?:ing)?|com(?:e|ing)\s+back|back)\s*(?:on|:)?\s*(?:the\s+)?(\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(?:january|february|march|april|may|june|july|august|september|october|november|december)(?:\s*,?\s*\d{4})?)/i,
        /(?:for|stay(?:ing)?)\s+(\d+)\s*(?:days?|nights?|weeks?)/i,
      ];
      for (const pat of returnPatterns) {
        const rMatch = text.match(pat);
        if (rMatch) {
          if (/\d+\s*(?:days?|nights?|weeks?)/.test(rMatch[0])) {
            const num = parseInt(rMatch[1]);
            const mult = /weeks?/i.test(rMatch[0]) ? 7 : 1;
            const depDate = new Date(departureDate);
            depDate.setDate(depDate.getDate() + num * mult);
            returnDate = depDate.toISOString().split("T")[0];
          } else {
            const cleanDate = (s: string) => s.replace(/(st|nd|rd|th)/gi, "").replace(/\bof\b/gi, "").trim();
            const parsed = new Date(cleanDate(rMatch[1]));
            if (!isNaN(parsed.getTime())) {
              if (parsed.getFullYear() < new Date().getFullYear()) parsed.setFullYear(new Date().getFullYear());
              returnDate = parsed.toISOString().split("T")[0];
            }
          }
          if (returnDate) break;
        }
      }
    }

    let passengers = blandAnalysis?.passengers ?? structured?.passengers ?? 1;
    if (blandAnalysis?.passengers) sources.passengers = "bland_analysis";
    else if (structured?.passengers) sources.passengers = "structured_block";
    if (!blandAnalysis?.passengers && !structured?.passengers) {
      const paxPatterns = [
        /(\d+)\s*(?:passengers?|travelers?|travellers?|people|adults?|persons?)/i,
        /(?:passengers?|travelers?|travellers?|people|adults?|persons?)(?:\s*:\s*|\s+)(\d+)/i,
      ];
      for (const pat of paxPatterns) {
        const match = text.match(pat);
        if (match) {
          const n = parseInt(match[1]);
          if (n >= 1 && n <= 20) { passengers = n; sources.passengers = "regex"; }
          break;
        }
      }
      if (!sources.passengers) sources.passengers = "default";
    }

    // Cabin class: look for affirmative preference statements first to avoid matching
    // the AI agent's option list (e.g. "economy, business, or first class?").
    // Summary is more reliable than raw transcript, so check it first.
    let cabinClass = blandAnalysis?.cabinClass ?? structured?.cabinClass ?? "economy";
    if (blandAnalysis?.cabinClass) sources.cabinClass = "bland_analysis";
    else if (structured?.cabinClass) sources.cabinClass = "structured_block";
    if (!blandAnalysis?.cabinClass && !structured?.cabinClass) {
      const affirmativePrefix = /(?:want(?:s|ed)?|prefer(?:s|red)?|request(?:s|ed)?|chose?|choose|go(?:ing)?\s+with|book(?:s|ed|ing)?|like[sd]?|select(?:s|ed)?|opted?\s+for|confirmed?|fly(?:ing)?)\s+(?:an?\s+)?/i;
      const findCabinInText = (t: string): string | null => {
        if (new RegExp(affirmativePrefix.source + /\bfirst[\s-]class\b/.source, "i").test(t)) return "first";
        if (new RegExp(affirmativePrefix.source + /\bbusiness[\s-]class\b/.source, "i").test(t)) return "business";
        if (new RegExp(affirmativePrefix.source + /\bpremium[\s-]economy\b/.source, "i").test(t)) return "premium_economy";
        if (new RegExp(affirmativePrefix.source + /\beconomy\b/.source, "i").test(t)) return "economy";
        return null;
      };
      const summaryText = summary || "";
      const cabinFromSummary = findCabinInText(summaryText) ?? findCabinInText(text);
      if (cabinFromSummary) {
        cabinClass = cabinFromSummary;
        sources.cabinClass = "regex";
      } else {
        if (/\bfirst[\s-]class\b/i.test(summaryText)) { cabinClass = "first"; sources.cabinClass = "regex_keyword"; }
        else if (/\bbusiness[\s-]class\b/i.test(summaryText)) { cabinClass = "business"; sources.cabinClass = "regex_keyword"; }
        else if (/\bpremium[\s-]economy\b/i.test(summaryText)) { cabinClass = "premium_economy"; sources.cabinClass = "regex_keyword"; }
        else { sources.cabinClass = "default"; }
      }
    }

    let budget: number | null = blandAnalysis?.budget ?? structured?.budget ?? null;
    if (blandAnalysis?.budget) sources.budget = "bland_analysis";
    else if (structured?.budget) sources.budget = "structured_block";
    if (!budget) {
      const budgetPatterns = [
        /\$\s*([\d,]+(?:\.\d{2})?)/,
        /(\d[\d,]+)\s*(?:dollars|usd)/i,
        /budget(?:\s*(?:is|of|around|about|:))?\s*\$?\s*([\d,]+)/i,
      ];
      for (const pat of budgetPatterns) {
        const match = text.match(pat);
        if (match) {
          budget = parseFloat(match[1].replace(/,/g, ""));
          sources.budget = "regex";
          break;
        }
      }
    }

    let email: string | null = blandAnalysis?.email ?? structured?.email ?? null;
    if (blandAnalysis?.email) sources.email = "bland_analysis";
    else if (email) sources.email = "structured_block";

    // time_preference and notes only come from Bland's post-call analysis pass
    // (regex over free-form transcript would be too noisy for these short
    // free-form preference fields). They stay null when the analysis pass
    // didn't surface them.
    const timePreference: string | null = blandAnalysis?.timePreference ?? null;
    const notes: string | null = blandAnalysis?.notes ?? null;
    if (timePreference) sources.timePreference = "bland_analysis";
    if (notes) sources.notes = "bland_analysis";

    return { origin, destination, email, departureDate, returnDate, passengers, cabinClass, budget, timePreference, notes, sources };
  }

  // In-flight guard: prevents two webhook events from racing into duplicate proposal
  // generation for the same call request (e.g. call.ended + status=failed arriving close together).
  const proposalGenerationInFlight = new Set<number>();

  // Same idea as proposalGenerationInFlight, but keyed by Bland's call_id for the
  // stateless inbound flow (no callRequestId exists for inbound calls). Entries are
  // never deleted — Bland can retry the same call.ended payload minutes later, and
  // the cost of a permanently-held short string per processed inbound call is
  // negligible. Process restart resets it; the alternative (persisting to DB) is
  // out of scope here.
  const inboundGuestProposalDispatched = new Set<string>();

  // Process-local dedupe for guest-proposal SMS sends. Keyed by
  // `guest_proposal_ready:<proposalToken>:<normalizedPhone>`. Protects
  // against Bland webhook retries and the manual-regenerate path firing two
  // SMS for the same proposal+phone pair.
  // TODO: persist (e.g., sms_log table) once A2P approved.
  const smsProposalSent = new Set<string>();

  function triggerProposalGenerationOnce(
    callRequestId: number,
    userId: string,
    summary: string | null,
    transcript: string | null,
    analysis?: BlandAnalysisPayload | null,
  ): void {
    if (proposalGenerationInFlight.has(callRequestId)) {
      console.log(
        `triggerProposalGenerationOnce: skipping callRequestId=${callRequestId} — generation already in flight`
      );
      return;
    }
    proposalGenerationInFlight.add(callRequestId);
    generateProposalFromCall(callRequestId, userId, summary, transcript, undefined, analysis)
      .catch((err) => {
        console.error("Auto-proposal generation error:", err);
      })
      .finally(() => {
        proposalGenerationInFlight.delete(callRequestId);
      });
  }

  // Resolve a free-text origin/destination (city name, airport name, or already-IATA
  // code) to a Duffel place. Lifted out of generateProposalFromCall so the inbound
  // guest-proposal flow can share the exact same lookup behavior. Takes a logPrefix
  // so post-call vs inbound-guest log lines remain distinguishable.
  async function resolveAirport(
    query: string,
    preferUS: boolean,
    logPrefix: string,
  ): Promise<{ code: string; name: string } | null> {
    if (!duffel) return null;
    try {
      // If the query is already an IATA code (3 uppercase letters), look up the full name via Duffel
      if (/^[A-Z]{3}$/.test(query)) {
        try {
          const lookupRes = await duffel.suggestions.list({ query });
          const match = (lookupRes.data || []).find((p: any) => p.iata_code === query);
          if (match) return { code: query, name: match.city_name || match.name || query };
        } catch (e: any) {
          console.warn(`${logPrefix} Duffel suggestions.list threw for IATA "${query}":`, e?.message || e);
        }
        return { code: query, name: query };
      }
      const res = await duffel.suggestions.list({ query });
      const places = res.data || [];
      if (places.length === 0) {
        console.warn(`${logPrefix} Duffel suggestions returned 0 places for query="${query}"`);
        return null;
      }

      if (preferUS) {
        const usAirport = places.find((p: any) => p.type === "airport" && p.iata_country_code === "US");
        if (usAirport?.iata_code) return { code: usAirport.iata_code, name: usAirport.city_name || usAirport.name || query };

        try {
          const usRes = await duffel.suggestions.list({ query: query + " USA" });
          const usPlaces = usRes.data || [];
          const usAp = usPlaces.find((p: any) => p.type === "airport") || usPlaces[0];
          if (usAp?.iata_code) return { code: usAp.iata_code, name: usAp.city_name || usAp.name || query };
        } catch (e: any) {
          console.warn(`${logPrefix} Duffel suggestions.list threw for "${query} USA":`, e?.message || e);
        }
      }

      const airport = places.find((p: any) => p.type === "airport") || places[0];
      return airport?.iata_code ? { code: airport.iata_code, name: airport.city_name || airport.name || query } : null;
    } catch (e: any) {
      console.warn(`${logPrefix} Duffel suggestions.list threw for query="${query}":`, e?.message || e);
      return null;
    }
  }

  // Stateless guest-proposal generator for inbound phone calls.
  // The post-call webhook calls this when a payload arrives that does NOT match
  // any bland_calls row (i.e. the caller dialed in directly without a prior
  // /api/bland/call dispatch). It mirrors the post-call branch of
  // generateProposalFromCall — parse details, resolve airports, search Duffel,
  // build the guest proposal data, persist a guest_proposals row, and email the
  // three options — but skips everything that requires a userId (no in-app
  // proposal save, no Claude verification loop, no createNoFlightsProposal).
  // Always swallows its own errors so the webhook ack stays a 200.
  async function generateGuestProposalForInboundCall(opts: {
    blandCallId: string;
    phoneE164: string | null;
    transcript: string | null;
    summary: string | null;
    analysis: BlandAnalysisPayload | null;
  }): Promise<void> {
    const { blandCallId, phoneE164, transcript, summary, analysis } = opts;
    // Standardized trace prefix per task spec — every line is grep-able with
    // `[bland-inbound] call_id=<id>` so an operator can reconstruct the full
    // path of any single inbound call from the log file.
    const lp = `[bland-inbound] call_id=${blandCallId}`;

    console.log(
      `${lp} phone_resolved=${phoneE164 ? "yes" : "no"} transcript_present=${!!transcript} summary_present=${!!summary} analysis_present=${!!analysis}`
    );

    if (!duffel) {
      console.warn(`${lp} skipping reason=duffel_not_configured`);
      return;
    }
    if (!transcript && !summary && !analysis) {
      console.log(`${lp} skipping reason=no_transcript_or_summary_or_analysis`);
      return;
    }

    const details = parseTravelDetailsFromTranscript(transcript, summary, analysis);

    // Email resolution per task spec:
    //   1) phone↔email map first (covers returning callers — preserves the email
    //      we already know is good rather than overwriting with whatever the
    //      analysis pass extracted this time).
    //   2) Fall back to analysis.email after regex validation.
    //   3) When the analysis fallback fires AND a phone is present, upsert the
    //      map so the next inbound call from this number hits step (1) directly.
    let guestEmail: string | null = null;
    let emailSource: "phone_map" | "analysis" | "none" = "none";
    if (phoneE164) {
      try {
        guestEmail = await storage.getEmailForPhone(phoneE164);
        if (guestEmail) emailSource = "phone_map";
      } catch (e: any) {
        console.warn(`${lp} getEmailForPhone failed:`, e?.message || e);
      }
    }
    if (!guestEmail) {
      const analysisEmailRaw = (details as any)?.email;
      if (typeof analysisEmailRaw === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(analysisEmailRaw)) {
        guestEmail = analysisEmailRaw.trim().toLowerCase();
        emailSource = "analysis";
        if (phoneE164) {
          try {
            await storage.upsertPhoneEmailMap(phoneE164, guestEmail);
          } catch (e: any) {
            console.warn(`${lp} upsertPhoneEmailMap failed:`, e?.message || e);
          }
        }
      }
    }
    if (!guestEmail) {
      console.log(`${lp} no email resolvable, skipping (email_source=none, phone=${phoneE164 || "—"})`);
      return;
    }
    console.log(`${lp} email_resolved=${guestEmail} email_source=${emailSource}`);

    if (!details.destination) {
      console.log(`${lp} skipping reason=no_destination_parsed (email_source=${emailSource})`);
      return;
    }

    // Origin/destination resolution. US bias when caller phone is +1; no bias
    // when phone wasn't normalizable (we don't want to falsely default to US).
    const isUSUser = !!phoneE164 && phoneE164.startsWith("+1");
    const destResult = await resolveAirport(details.destination, isUSUser, lp);
    if (!destResult) {
      console.warn(`${lp} skipping reason=destination_unresolvable destination="${details.destination}"`);
      return;
    }
    const destCode = destResult.code;
    const destName = destResult.name;

    let originCode: string | null = null;
    let originName: string | null = null;
    if (details.origin) {
      const originResult = await resolveAirport(details.origin, isUSUser, lp);
      if (originResult) {
        originCode = originResult.code;
        originName = originResult.name;
      }
    }
    if (!originCode) {
      // Inbound has no profile to fall back to; default to the same JFK that
      // the post-call flow uses when nothing else is known. Override if it
      // collides with destination.
      originCode = destCode === "JFK" ? "LAX" : "JFK";
      originName = originCode;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let departureDate = details.departureDate || new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0];
    let returnDate = details.returnDate || null;
    if (new Date(departureDate) <= today) {
      departureDate = new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0];
      if (returnDate) {
        const duration = details.departureDate && details.returnDate
          ? Math.ceil((new Date(details.returnDate).getTime() - new Date(details.departureDate).getTime()) / 86400000)
          : 7;
        returnDate = new Date(Date.now() + (14 + duration) * 86400000).toISOString().split("T")[0];
      }
    }

    const passengers: Array<{ type: "adult" }> = [];
    for (let i = 0; i < details.passengers; i++) passengers.push({ type: "adult" as const });
    const slices: any[] = [{ origin: originCode, destination: destCode, departure_date: departureDate }];
    if (returnDate) slices.push({ origin: destCode, destination: originCode, departure_date: returnDate });

    console.log(`${lp} searching Duffel ${originCode}->${destCode} dep=${departureDate} ret=${returnDate || "—"} pax=${details.passengers} cabin=${details.cabinClass}`);

    let allOffers: any[] = [];
    try {
      const offerRequest = await duffel.offerRequests.create({
        slices,
        passengers,
        cabin_class: details.cabinClass as any,
        return_offers: true,
        max_connections: 1,
      });
      allOffers = (offerRequest.data as any).offers || [];
    } catch (e: any) {
      console.error(`${lp} skipping reason=duffel_offer_request_failed:`, e?.message || e);
      return;
    }
    console.log(`${lp} duffel_returned offers=${allOffers.length}`);
    if (allOffers.length === 0) {
      console.log(`${lp} skipping reason=zero_offers`);
      return;
    }
    allOffers.sort((a: any, b: any) => parseFloat(a.total_amount) - parseFloat(b.total_amount));

    const guestData = buildGuestProposalDataFromOffers({
      offers: allOffers,
      originIata: originCode,
      originName: originName || originCode,
      destinationIata: destCode,
      destinationName: destName,
      departureDate,
      returnDate,
      passengers: details.passengers,
      cabinClass: details.cabinClass,
    });
    if (guestData.options.length === 0) {
      console.log(`${lp} skipping reason=no_options_built_from_offers`);
      return;
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    let saved;
    try {
      saved = await storage.createGuestProposal({
        email: guestEmail,
        originIata: guestData.originIata,
        destinationIata: guestData.destinationIata,
        departureDate: guestData.departureDate,
        returnDate: guestData.returnDate ?? null,
        passengers: guestData.passengers,
        cabinClass: guestData.cabinClass,
        proposalData: guestData as any,
        status: "pending",
        expiresAt,
      });
    } catch (e: any) {
      console.error(`${lp} skipping reason=create_guest_proposal_failed:`, e?.message || e);
      return;
    }

    // Booking-link host: APP_URL → travnr.com (prod) → dev domain (dev) → localhost.
    // Identical fallback chain to the post-call IIFE so emailed links never leak the
    // dev preview domain in production.
    const isProduction =
      process.env.NODE_ENV === "production" ||
      process.env.REPLIT_DEPLOYMENT === "1";
    let canonicalHost: string;
    if (process.env.APP_URL) {
      canonicalHost = process.env.APP_URL;
    } else if (isProduction) {
      console.warn(`${lp} APP_URL not set in production — defaulting to https://travnr.com`);
      canonicalHost = "https://travnr.com";
    } else if (process.env.REPLIT_DEV_DOMAIN) {
      canonicalHost = `https://${process.env.REPLIT_DEV_DOMAIN}`;
    } else {
      canonicalHost = `http://localhost:${process.env.PORT || 5000}`;
    }
    const baseUrl = canonicalHost.replace(/\/+$/, "");

    try {
      await sendGuestProposalEmail(guestEmail, {
        baseUrl,
        originIata: guestData.originIata,
        originName: guestData.originName,
        destinationIata: guestData.destinationIata,
        destinationName: guestData.destinationName,
        departureDate: guestData.departureDate,
        returnDate: guestData.returnDate,
        passengers: guestData.passengers,
        options: guestData.options.map((o) => ({
          token: o.token,
          label: o.label,
          totalAmount: o.totalAmount,
          totalCurrency: o.totalCurrency,
          totalDurationMinutes: o.totalDurationMinutes,
          stops: o.stops,
          carrierName: o.carrierName,
          carrierLogo: o.carrierLogo,
          outboundDepartingAt: o.slices?.[0]?.departingAt ?? null,
          outboundArrivingAt: o.slices?.[0]?.arrivingAt ?? null,
          baggage: o.baggage,
          refundable: o.refundable,
          changeable: o.changeable,
        })),
      });
      console.log(`${lp} guest proposal sent token=${saved.token} email=${guestEmail} email_source=${emailSource} origin=${originCode} destination=${destCode}`);
    } catch (e: any) {
      console.error(`${lp} sendGuestProposalEmail failed:`, e?.message || e);
    }

    // SMS hook — fire-and-forget, never blocks email or proposal save.
    // Inbound has phoneE164 already resolved by the caller.
    if (!phoneE164) {
      console.log(`${lp} [sms] skipped reason=no_phone_available`);
    } else {
      const dedupeKey = `guest_proposal_ready:${saved.token}:${phoneE164}`;
      if (smsProposalSent.has(dedupeKey)) {
        console.log(`${lp} [sms] skipped reason=duplicate dedupe_key=${dedupeKey}`);
      } else {
        smsProposalSent.add(dedupeKey);
        const proposalUrl = `${baseUrl}/proposal/${saved.token}`;
        const smsBody = buildGuestProposalSms({ proposalUrl });
        console.log(`${lp} [sms] sending proposal_ready token=${saved.token} phone=${maskPhone(phoneE164)} body_length=${smsBody.length}`);
        void sendSms({ to: phoneE164, body: smsBody, dedupeKey })
          .then((result) => {
            console.log(`${lp} [sms] result token=${saved.token} ${JSON.stringify(result)}`);
          })
          .catch((err: any) => {
            console.error(`${lp} [sms] unexpected throw:`, err?.message || err);
          });
      }
    }

    // Phase 4 hotel-search hook (inbound). Off by default — only fires when
    // ENABLE_HOTEL_SEARCH=true. Fire-and-forget, single attempt, never
    // re-throws. Email/proposal/SMS paths above are completely untouched.
    // Inbound has no callRequest row (stateless caller) and no userId.
    if (process.env.ENABLE_HOTEL_SEARCH === "true") {
      void runHotelSearchForCall({
        source: "inbound",
        callRequestId: null,
        callRequest: null,
        details,
        userId: null,
        proposalId: null,
        logPrefix: lp,
      }).catch((err: any) => {
        console.error(`${lp} [hotels] unexpected throw from runHotelSearchForCall:`, err?.message || err);
      });
    }
  }

  async function generateProposalFromCall(
    callRequestId: number,
    userId: string,
    callSummary: string | null,
    callTranscript?: string | null,
    override?: { details: VerifierParsedDetails; skipVerification: true },
    callAnalysis?: BlandAnalysisPayload | null,
  ) {
    const callRequest = await storage.getCallRequest(callRequestId);
    if (!callRequest) {
      console.log(`generateProposalFromCall: call request ${callRequestId} not found`);
      return;
    }

    if (callRequest.userId !== userId) {
      console.warn(`generateProposalFromCall: user mismatch callRequest.userId=${callRequest.userId} vs userId=${userId}`);
      return;
    }

    if (!override) {
      const existingProposals = await storage.getProposalsByCallRequest(callRequestId);
      if (existingProposals.length > 0) {
        const fallbackIds: number[] = [];
        for (const ep of existingProposals) {
          const items = await storage.getProposalItems(ep.id);
          const isFallback = items.length === 0 || items.every(i => !i.duffelOfferId && (parseFloat(i.priceEstimate ?? "0") === 0));
          if (isFallback) fallbackIds.push(ep.id);
        }
        if (fallbackIds.length < existingProposals.length) {
          console.log(`Real proposal already exists for call request ${callRequestId}, skipping`);
          return;
        }
        console.log(`Replacing ${fallbackIds.length} fallback proposal(s) for call request ${callRequestId}`);
        for (const id of fallbackIds) {
          await storage.deleteProposalAndItems(id);
        }
      }
    }

    let transcript = callTranscript ?? null;
    let summary = callSummary;
    let analysis: BlandAnalysisPayload | null = callAnalysis ?? null;
    if (transcript === null || summary === null || analysis === null) {
      const blandCalls = await storage.getBlandCallsByCallRequest(callRequestId);
      const completedCall = blandCalls?.find(c => c.status === "completed");
      if (transcript === null) transcript = completedCall?.transcript || null;
      if (summary === null) summary = completedCall?.summary || null;
      // Recover the Bland analysis_schema output stashed in variables.__analysis
      // for re-trigger paths (manual regenerate, Claude verifier loop) that
      // didn't receive analysis as an explicit argument.
      if (analysis === null) {
        analysis = extractAnalysisFromVariables(completedCall?.variables);
      }
    }

    if (!transcript && !summary) {
      console.log(`generateProposalFromCall: no transcript or summary available yet for call request ${callRequestId}, skipping`);
      return;
    }

    let details: VerifierParsedDetails;
    if (override) {
      details = override.details;
      console.log(`[post-call ${callRequestId}] using Claude-corrected details:`, JSON.stringify(details));
    } else {
      details = parseTravelDetailsFromTranscript(transcript, summary, analysis);
      console.log(`Parsed travel details from transcript for call ${callRequestId}:`, JSON.stringify(details));

      // Surface ambiguity so we can monitor parser accuracy: only warn when
      // the destination/origin came from a regex pass (not from a confirmed
      // high-confidence source) AND matches a multi-airport city.
      // High-confidence sources: `bland_analysis` (post-call analysis_schema)
      // and `structured_block` (legacy <TRAVEL_DETAILS> for in-flight calls).
      const HIGH_CONFIDENCE_SOURCES = new Set(["bland_analysis", "structured_block"]);
      const checkAmbiguity = (label: string, value: string | null, source: string | undefined) => {
        if (!value || (source && HIGH_CONFIDENCE_SOURCES.has(source))) return;
        // Skip pure IATA codes (3 uppercase letters) — they're already disambiguated
        if (/^[A-Z]{3}$/.test(value)) return;
        const { ambiguous, options } = isAmbiguousCity(value);
        if (ambiguous) {
          console.warn(`[post-call ${callRequestId}] AMBIGUOUS_${label.toUpperCase()}: parsed "${value}" maps to multiple airports ${options.length ? `(${options.join("/")})` : "(many cities/airports)"} and was not confirmed by Bland post-call analysis or a legacy <TRAVEL_DETAILS> block. Source=${source}.`);
        }
      };
      checkAmbiguity("destination", details.destination, details.sources?.destination);
      checkAmbiguity("origin", details.origin, details.sources?.origin);

      const destSource = details.sources?.destination;
      if (!destSource || !HIGH_CONFIDENCE_SOURCES.has(destSource)) {
        console.warn(`[post-call ${callRequestId}] PARSE_ACCURACY: destination not from high-confidence source (source=${destSource ?? "none"}). Bland post-call analysis_schema may not have populated destination_iata; falling back to regex heuristics.`);
      }

      // Patch missing parsed fields from user-provided form data
      if (!details.destination && callRequest.destination) {
        details.destination = callRequest.destination;
        console.log(`generateProposalFromCall: using callRequest.destination="${callRequest.destination}" as fallback`);
      }
      if (!details.departureDate && callRequest.dateFrom) {
        details.departureDate = callRequest.dateFrom;
        console.log(`generateProposalFromCall: using callRequest.dateFrom="${callRequest.dateFrom}" as fallback`);
      }
      if (!details.returnDate && callRequest.dateTo) {
        details.returnDate = callRequest.dateTo;
        console.log(`generateProposalFromCall: using callRequest.dateTo="${callRequest.dateTo}" as fallback`);
      }

      // Last-resort: scan raw transcript/summary for any 3-letter IATA-style code
      // so we can still attempt a Duffel search on early hangups. Skip non-airport
      // tokens like country codes that commonly appear in transcripts.
      if (!details.destination) {
        const haystack = `${transcript || ""}\n${summary || ""}`;
        const iataMatches = haystack.match(/\b([A-Z]{3})\b/g) || [];
        const nonAirportTokens = new Set(["USA", "GMT", "EST", "PST", "CST", "MST", "UTC"]);
        const candidate = iataMatches.find(c => !nonAirportTokens.has(c));
        if (candidate) {
          details.destination = candidate;
          console.log(`generateProposalFromCall: last-resort IATA scan found "${candidate}" in transcript for call request ${callRequestId}`);
        }
      }
    }

    if (!details.destination) {
      console.log(`generateProposalFromCall: no destination found in transcript for call request ${callRequestId}`);
      await createFallbackProposal(callRequestId, userId, summary);
      return;
    }

    if (!duffel) {
      console.error(`[post-call ${callRequestId}] Duffel client is not initialized (DUFFEL_API_TOKEN missing) — writing fallback proposal`);
      await createFallbackProposal(callRequestId, userId, summary);
      return;
    }

    console.log(`[post-call ${callRequestId}] starting proposal generation: hasTranscript=${!!transcript}, hasSummary=${!!summary}`);

    let searchParamsLog: any = null;

    try {
      const callReqForPhone = callRequest as any;
      const userPhone = callReqForPhone.phone || callReqForPhone.phoneNumber || "";
      const isUSUser = userPhone.startsWith("+1") || userPhone.startsWith("1");
      console.log(`[post-call ${callRequestId}] resolved isUSUser=${isUSUser} from phone="${userPhone}"`);

      const postCallLogPrefix = `[post-call ${callRequestId}]`;
      const destResult = await resolveAirport(details.destination, isUSUser, postCallLogPrefix);
      if (!destResult) {
        console.error(`[post-call ${callRequestId}] No airport could be resolved for destination="${details.destination}" — writing fallback proposal`);
        await createFallbackProposal(callRequestId, userId, summary);
        return;
      }
      const destCode = destResult.code;
      const destName = destResult.name;
      console.log(`[post-call ${callRequestId}] resolved destination "${details.destination}" -> ${destCode} (${destName})`);

      let originCode = "JFK";
      const profile = await storage.getProfile(userId);

      let originSource = "default-JFK";
      if (details.origin) {
        const originResult = await resolveAirport(details.origin, isUSUser, postCallLogPrefix);
        if (originResult) {
          originCode = originResult.code;
          originSource = `parsed:"${details.origin}"`;
        } else {
          originSource = `parsed-but-unresolved:"${details.origin}"`;
        }
      }

      if (originCode === "JFK" && !details.origin) {
        if (profile?.homeAirport) {
          originCode = profile.homeAirport;
          originSource = "profile.homeAirport";
        } else if (profile?.nationality) {
          const nationalityToHub: Record<string, string> = {
            "US": "JFK", "GB": "LHR", "CA": "YYZ", "AU": "SYD", "DE": "FRA",
            "FR": "CDG", "JP": "NRT", "KR": "ICN", "SG": "SIN", "AE": "DXB",
            "IN": "DEL", "BR": "GRU", "MX": "MEX", "IT": "FCO", "ES": "MAD",
          };
          originCode = nationalityToHub[profile.nationality] || "JFK";
          originSource = `nationality:${profile.nationality}`;
        }
      }

      if (originCode === destCode) {
        const before = originCode;
        originCode = originCode === "JFK" ? "LAX" : "JFK";
        originSource = `${originSource} -> override (collided with destCode ${before})`;
      }

      console.log(`[post-call ${callRequestId}] resolved origin -> ${originCode} (source: ${originSource})`);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let departureDate = details.departureDate || new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0];
      let returnDate = details.returnDate || null;

      if (new Date(departureDate) <= today) {
        departureDate = new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0];
        if (returnDate) {
          const duration = details.departureDate && details.returnDate
            ? Math.ceil((new Date(details.returnDate).getTime() - new Date(details.departureDate).getTime()) / 86400000)
            : 7;
          returnDate = new Date(Date.now() + (14 + duration) * 86400000).toISOString().split("T")[0];
        }
      }

      const passengers: Array<{ type: "adult" }> = [];
      for (let i = 0; i < details.passengers; i++) {
        passengers.push({ type: "adult" as const });
      }

      const cabinLabel = details.cabinClass === "premium_economy" ? "Premium Economy" : details.cabinClass.charAt(0).toUpperCase() + details.cabinClass.slice(1);

      const slices: any[] = [{ origin: originCode, destination: destCode, departure_date: departureDate }];
      if (returnDate) {
        slices.push({ origin: destCode, destination: originCode, departure_date: returnDate });
      }

      searchParamsLog = {
        origin: originCode,
        destination: destCode,
        departureDate,
        returnDate,
        cabinClass: details.cabinClass,
        passengers: details.passengers,
        budget: details.budget,
      };
      console.log(`[post-call ${callRequestId}] Searching Duffel:`, JSON.stringify(searchParamsLog));

      const offerRequest = await duffel.offerRequests.create({
        slices,
        passengers,
        cabin_class: details.cabinClass as any,
        return_offers: true,
        max_connections: 1,
      });

      const allOffers = (offerRequest.data as any).offers || [];
      console.log(`[post-call ${callRequestId}] Duffel returned ${allOffers.length} offer(s)`);
      if (allOffers.length === 0) {
        let originName = details.origin || originCode;
        if (details.origin) {
          const originResult = await resolveAirport(details.origin, isUSUser, postCallLogPrefix);
          if (originResult) originName = originResult.name;
        }
        const searchParams = {
          originCode, originName, destCode, destName,
          departureDate, returnDate,
          cabinClass: details.cabinClass, cabinLabel,
          passengers: details.passengers,
          budget: details.budget,
        };
        await createNoFlightsProposal(callRequestId, userId, summary, searchParams);
        return;
      }

      allOffers.sort((a: any, b: any) => parseFloat(a.total_amount) - parseFloat(b.total_amount));

      // Fire the guest proposal email immediately, in parallel with proposal
      // save / verification below. Failures stay isolated and never block the
      // in-app flow. (Note: a verification-driven regenerate may send a 2nd
      // email with corrected options — accepted tradeoff for the speed win.)
      void (async () => {
        try {
          // Email resolution priority: parsed <TRAVEL_DETAILS> email →
          // BlandCall callbackEmail → phone→email map → user account email.
          let guestEmail: string | null = null;
          const parsedEmailRaw = (details as any)?.email;
          if (typeof parsedEmailRaw === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parsedEmailRaw)) {
            guestEmail = parsedEmailRaw.trim().toLowerCase();
          }
          if (!guestEmail) {
            try {
              const blandRows = await storage.getBlandCallsByCallRequest(callRequestId);
              for (const bc of blandRows || []) {
                const meta = (bc as any).metadata || (bc as any).variables || {};
                const cbEmail = meta?.callbackEmail || meta?.email || null;
                if (cbEmail && typeof cbEmail === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cbEmail)) {
                  guestEmail = cbEmail.trim().toLowerCase();
                  break;
                }
              }
            } catch {
              /* best-effort */
            }
          }
          if (!guestEmail) {
            const phoneForLookup = (callRequest as any).phone || (callRequest as any).phoneNumber || null;
            if (phoneForLookup) {
              guestEmail = await storage.getEmailForPhone(phoneForLookup).catch(() => null);
            }
          }
          if (!guestEmail) {
            const userRec = await storage.getUser(userId).catch(() => undefined);
            guestEmail = userRec?.email || null;
          }
          if (!guestEmail) {
            console.log(`[guest-proposal] skipped — no email could be resolved for callRequest=${callRequestId}`);
            return;
          }

          const guestData = buildGuestProposalDataFromOffers({
            offers: allOffers,
            originIata: originCode,
            originName: details.origin || originCode,
            destinationIata: destCode,
            destinationName: destName,
            departureDate,
            returnDate,
            passengers: details.passengers,
            cabinClass: details.cabinClass,
          });
          if (guestData.options.length === 0) {
            console.log(`[guest-proposal] skipped — no options built for callRequest=${callRequestId}`);
            return;
          }

          const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
          const saved = await storage.createGuestProposal({
            email: guestEmail,
            originIata: guestData.originIata,
            destinationIata: guestData.destinationIata,
            departureDate: guestData.departureDate,
            returnDate: guestData.returnDate ?? null,
            passengers: guestData.passengers,
            cabinClass: guestData.cabinClass,
            proposalData: guestData as any,
            status: "pending",
            expiresAt,
          });

          // Booking-link host: APP_URL → travnr.com (prod) → dev domain (dev)
          // → localhost. Production defaults to travnr.com so a missing
          // APP_URL never leaks the dev preview domain into emailed links.
          const isProduction =
            process.env.NODE_ENV === "production" ||
            process.env.REPLIT_DEPLOYMENT === "1";
          let canonicalHost: string;
          if (process.env.APP_URL) {
            canonicalHost = process.env.APP_URL;
          } else if (isProduction) {
            console.warn("[guest-proposal] APP_URL not set in production — defaulting to https://travnr.com");
            canonicalHost = "https://travnr.com";
          } else if (process.env.REPLIT_DEV_DOMAIN) {
            canonicalHost = `https://${process.env.REPLIT_DEV_DOMAIN}`;
          } else {
            canonicalHost = `http://localhost:${process.env.PORT || 5000}`;
          }
          const baseUrl = canonicalHost.replace(/\/+$/, "");

          await sendGuestProposalEmail(guestEmail, {
            baseUrl,
            originIata: guestData.originIata,
            originName: guestData.originName,
            destinationIata: guestData.destinationIata,
            destinationName: guestData.destinationName,
            departureDate: guestData.departureDate,
            returnDate: guestData.returnDate,
            passengers: guestData.passengers,
            options: guestData.options.map((o) => ({
              token: o.token,
              label: o.label,
              totalAmount: o.totalAmount,
              totalCurrency: o.totalCurrency,
              totalDurationMinutes: o.totalDurationMinutes,
              stops: o.stops,
              carrierName: o.carrierName,
              carrierLogo: o.carrierLogo,
              outboundDepartingAt: o.slices?.[0]?.departingAt ?? null,
              outboundArrivingAt: o.slices?.[0]?.arrivingAt ?? null,
              baggage: o.baggage,
              refundable: o.refundable,
              changeable: o.changeable,
            })),
          });
          console.log(`[guest-proposal] created token=${saved.token} for callRequest=${callRequestId} email=${guestEmail} (parallel send)`);

          // SMS hook — fire-and-forget. Recipient phone comes from the
          // call request that triggered this outbound call.
          const rawPhone =
            (callRequest as any).phone ||
            (callRequest as any).phoneNumber ||
            null;
          const smsPhone = normalizePhoneE164(rawPhone);
          if (!smsPhone) {
            console.log(`[sms] skipped reason=no_phone_available callRequest=${callRequestId}`);
          } else {
            const dedupeKey = `guest_proposal_ready:${saved.token}:${smsPhone}`;
            if (smsProposalSent.has(dedupeKey)) {
              console.log(`[sms] skipped reason=duplicate dedupe_key=${dedupeKey}`);
            } else {
              smsProposalSent.add(dedupeKey);
              const proposalUrl = `${baseUrl}/proposal/${saved.token}`;
              const smsBody = buildGuestProposalSms({ proposalUrl });
              console.log(`[sms] sending proposal_ready token=${saved.token} phone=${maskPhone(smsPhone)} body_length=${smsBody.length} callRequest=${callRequestId}`);
              void sendSms({ to: smsPhone, body: smsBody, dedupeKey })
                .then((result) => {
                  console.log(`[sms] result token=${saved.token} ${JSON.stringify(result)}`);
                })
                .catch((err: any) => {
                  console.error(`[sms] unexpected throw:`, err?.message || err);
                });
            }
          }
        } catch (guestErr: any) {
          console.error(
            `[guest-proposal] failed for callRequest=${callRequestId}:`,
            guestErr?.message || guestErr,
          );
        }
      })();

      // Phase 4 hotel-search hook (outbound). Off by default — only fires
      // when ENABLE_HOTEL_SEARCH=true. Fire-and-forget, single attempt,
      // never re-throws. Runs in parallel with the guest-proposal IIFE
      // above and the proposal-save / verifier flow below — none of those
      // paths touch hotel state. proposalId is null here because the
      // itinerary_proposals row doesn't exist yet at this point in the
      // flow; we may wire it in a later phase.
      // Note: the manual /regenerate-proposal endpoint is intentionally NOT
      // wired in Phase 4 — admins regenerating to fix flight options
      // shouldn't double-charge the hotel search budget.
      if (process.env.ENABLE_HOTEL_SEARCH === "true") {
        void runHotelSearchForCall({
          source: "outbound",
          callRequestId,
          callRequest: callRequest as any,
          details,
          userId,
          proposalId: null,
          logPrefix: postCallLogPrefix,
        }).catch((err: any) => {
          console.error(
            `${postCallLogPrefix} [hotels] unexpected throw from runHotelSearchForCall:`,
            err?.message || err,
          );
        });
      }

      const diverseOffers: any[] = [];
      const seenAirlines = new Set<string>();
      for (const offer of allOffers) {
        const airline = offer.owner?.iata_code || offer.owner?.name || "unknown";
        if (!seenAirlines.has(airline)) {
          diverseOffers.push(offer);
          seenAirlines.add(airline);
          if (diverseOffers.length >= 2) break;
        }
      }

      if (diverseOffers.length < 2) {
        for (const offer of allOffers) {
          if (!diverseOffers.includes(offer)) {
            diverseOffers.push(offer);
            if (diverseOffers.length >= 2) break;
          }
        }
      }

      if (details.budget) {
        diverseOffers.sort((a: any, b: any) => {
          const diffA = Math.abs(parseFloat(a.total_amount) - details.budget!);
          const diffB = Math.abs(parseFloat(b.total_amount) - details.budget!);
          return diffA - diffB;
        });
      }

      const topOffers = diverseOffers.slice(0, 2);
      const bestOffer = topOffers[0];

      const simplifyOffer = (offer: any) => ({
        id: offer.id,
        totalAmount: offer.total_amount,
        totalCurrency: offer.total_currency,
        expiresAt: offer.expires_at,
        owner: offer.owner,
        slices: offer.slices?.map((slice: any) => ({
          id: slice.id,
          duration: slice.duration,
          origin: { iata: slice.origin?.iata_code, name: slice.origin?.name, city: slice.origin?.city_name },
          destination: { iata: slice.destination?.iata_code, name: slice.destination?.name, city: slice.destination?.city_name },
          segments: slice.segments?.map((seg: any) => ({
            id: seg.id,
            departingAt: seg.departing_at,
            arrivingAt: seg.arriving_at,
            origin: { iata: seg.origin?.iata_code, name: seg.origin?.name },
            destination: { iata: seg.destination?.iata_code, name: seg.destination?.name },
            carrier: {
              name: seg.marketing_carrier?.name,
              iata: seg.marketing_carrier?.iata_code,
              logoUrl: seg.marketing_carrier?.logo_symbol_url || seg.marketing_carrier?.logo_lockup_url,
            },
            flightNumber: seg.marketing_carrier_flight_number,
            aircraft: seg.aircraft?.name,
            cabinClass: seg.passengers?.[0]?.cabin_class_marketing_name || seg.passengers?.[0]?.cabin_class,
            baggages: seg.passengers?.[0]?.baggages,
          })),
        })),
        passengers: offer.passengers,
        enrichment: enrichOfferDetails(offer),
      });

      const simplified = simplifyOffer(bestOffer);
      const routeSummary = simplified.slices?.map((s: any) =>
        `${s.origin?.city || s.origin?.iata} to ${s.destination?.city || s.destination?.iata}`
      ).join(", ") || destName;

      const proposal = await storage.createProposal({
        userId,
        callRequestId,
        title: `Trip to ${destName}`,
        summary: summary || `Based on your concierge call, we found ${cabinLabel} class flights for your trip. ${routeSummary}.`,
        totalEstimate: bestOffer.total_amount,
        status: "sent",
      });

      await storage.createProposalItem({
        proposalId: proposal.id,
        type: "flight",
        description: `${cabinLabel} Flight: ${routeSummary}`,
        priceEstimate: bestOffer.total_amount,
        duffelOfferId: bestOffer.id,
        duffelOfferData: simplified,
      });

      for (let i = 1; i < topOffers.length; i++) {
        const altSimplified = simplifyOffer(topOffers[i]);
        const altRoute = altSimplified.slices?.map((s: any) =>
          `${s.origin?.city || s.origin?.iata} to ${s.destination?.city || s.destination?.iata}`
        ).join(", ") || destName;
        const altCabin = altSimplified.slices?.[0]?.segments?.[0]?.cabinClass || cabinLabel;

        await storage.createProposalItem({
          proposalId: proposal.id,
          type: "flight",
          description: `Alternative ${altCabin} Flight: ${altRoute} (${topOffers[i].owner?.name || "Airline"})`,
          priceEstimate: topOffers[i].total_amount,
          duffelOfferId: topOffers[i].id,
          duffelOfferData: altSimplified,
        });
      }

      console.log(`Auto-generated proposal ${proposal.id} with ${topOffers.length} offers from call request ${callRequestId}`);

      // Post-generation Claude verification: silently double-check that the
      // proposal we just wrote actually matches the call transcript. If anything
      // is off, delete this proposal and regenerate using Claude's
      // corrected_details. The customer-facing notification is held back until
      // verification settles so the user only ever sees one alert pointing at
      // the final (possibly corrected) proposal.
      let suppressCustomerNotification = false;
      if (!override?.skipVerification) {
        try {
          const flightItems = await storage.getProposalItems(proposal.id);
          const snapshot = buildProposalSnapshot(
            proposal.id,
            details,
            originCode,
            destCode,
            departureDate,
            returnDate,
            flightItems.map((it) => ({
              description: it.description,
              priceEstimate: it.priceEstimate,
              duffelOfferData: it.duffelOfferData,
            })),
          );
          const verification = await verifyProposalAgainstTranscript(
            transcript,
            details,
            snapshot,
          ).catch((err) => {
            console.warn(`[claude-verify] verifyProposalAgainstTranscript threw for proposal=${proposal.id}:`, err?.message || err);
            return null;
          });
          if (verification && (!verification.verified || verification.confidence < 0.85)) {
            suppressCustomerNotification = true;
            const userRecord = await storage.getUser(userId).catch(() => undefined);
            const userName = userRecord
              ? `${userRecord.firstName ?? ""} ${userRecord.lastName ?? ""}`.trim() || userRecord.email || userId
              : userId;
            await fixAndRegenerateProposal({
              callRequestId,
              userId,
              oldProposalId: proposal.id,
              correctedDetails: verification.corrected_details,
              parsedDetails: details,
              verificationResult: verification,
              callSummary: summary,
              callTranscript: transcript,
              userName,
              userEmail: userRecord?.email ?? null,
              regenerate: async (overrideDetails) => {
                await generateProposalFromCall(
                  callRequestId,
                  userId,
                  summary,
                  transcript,
                  { details: overrideDetails, skipVerification: true },
                );
                const refetched = await storage.getProposalsByCallRequest(callRequestId);
                return refetched[refetched.length - 1]?.id ?? null;
              },
              deleteOldProposal: async () => {
                await storage.deleteProposalAndItems(proposal.id);
              },
              sendInternalEmail,
            }).catch((err) => {
              console.error(`[claude-verify] fixAndRegenerateProposal threw for callRequest=${callRequestId}:`, err?.message || err);
            });
          }
        } catch (verifyErr: any) {
          // Never let verification break the user flow — fall back to the normal
          // notification using the proposal we already created.
          console.warn(`[claude-verify] verification block threw for proposal=${proposal.id}:`, verifyErr?.message || verifyErr);
        }
      }

      if (!suppressCustomerNotification) {
        await storage.createNotification({
          userId,
          type: "proposal_received",
          title: "New travel proposal ready",
          body: `Based on your concierge call, we've prepared a flight proposal for your trip to ${destName}.`,
          linkUrl: `/proposals/${proposal.id}`,
        });

        // Guest email send moved up — it now fires in parallel right after
        // `allOffers.sort(...)`, before this verification gate.
      }
    } catch (err: any) {
      console.error(
        `[post-call ${callRequestId}] Duffel search/proposal generation failed.`,
        "\n  searchParams:", typeof searchParamsLog !== "undefined" ? JSON.stringify(searchParamsLog) : "(not yet built)",
        "\n  parsedDetails:", JSON.stringify(details),
        "\n  error:", JSON.stringify(err?.errors || err?.message || err, null, 2)
      );
      await createFallbackProposal(callRequestId, userId, summary);
    }
  }

  async function createNoFlightsProposal(
    callRequestId: number,
    userId: string,
    callSummary: string | null,
    searchParams: {
      originCode: string; originName: string; destCode: string; destName: string;
      departureDate: string; returnDate: string | null;
      cabinClass: string; cabinLabel: string;
      passengers: number; budget: number | null;
    }
  ) {
    const routeDesc = `${searchParams.originCode} → ${searchParams.destCode}`;
    const dateDesc = searchParams.returnDate
      ? `${searchParams.departureDate} to ${searchParams.returnDate}`
      : searchParams.departureDate;
    const budgetDesc = searchParams.budget ? ` within a $${searchParams.budget} budget` : "";

    const noFlightsSummary = callSummary
      ? callSummary + `\n\nNo ${searchParams.cabinLabel} flights were found for ${routeDesc} on ${dateDesc}${budgetDesc}. You can search again with different dates or preferences.`
      : `No ${searchParams.cabinLabel} flights found for ${routeDesc} on ${dateDesc}${budgetDesc}. Try adjusting your dates, cabin class, or route.`;

    const proposal = await storage.createProposal({
      userId,
      callRequestId,
      title: "Travel Concierge Proposal",
      summary: noFlightsSummary,
      totalEstimate: "0.00",
      status: "sent",
    });

    await storage.createProposalItem({
      proposalId: proposal.id,
      type: "flight",
      description: `No flights available: ${routeDesc} on ${dateDesc} (${searchParams.cabinLabel})`,
      priceEstimate: "0.00",
      duffelOfferId: null,
      duffelOfferData: {
        noFlightsFound: true,
        searchParams: {
          origin: searchParams.originCode,
          originName: searchParams.originName,
          destination: searchParams.destCode,
          destinationName: searchParams.destName,
          departureDate: searchParams.departureDate,
          returnDate: searchParams.returnDate,
          cabinClass: searchParams.cabinClass,
          passengers: searchParams.passengers,
          budget: searchParams.budget,
        },
      },
    });

    await storage.createNotification({
      userId,
      type: "proposal_received",
      title: "No flights found for your trip",
      body: `We couldn't find ${searchParams.cabinLabel} flights for ${routeDesc} on ${dateDesc}. Try different dates or preferences.`,
      linkUrl: `/proposals/${proposal.id}`,
    });

    console.log(`Created no-flights proposal ${proposal.id} for call request ${callRequestId}: ${routeDesc} on ${dateDesc}`);
  }

  async function createFallbackProposal(callRequestId: number, userId: string, callSummary: string | null) {
    const proposal = await storage.createProposal({
      userId,
      callRequestId,
      title: "Travel Concierge Proposal",
      summary: callSummary || "We're preparing your travel proposal. Flight options will appear here shortly.",
      totalEstimate: "0.00",
      status: "sent",
    });

    await storage.createProposalItem({
      proposalId: proposal.id,
      type: "other",
      description: "Travel planning - details pending from concierge call",
      priceEstimate: "0.00",
      duffelOfferId: null,
      duffelOfferData: null,
    });

    await storage.createNotification({
      userId,
      type: "proposal_received",
      title: "Travel proposal in progress",
      body: "We're working on your travel proposal. You'll receive flight options soon.",
      linkUrl: `/proposals/${proposal.id}`,
    });

    console.log(`Created fallback proposal ${proposal.id} for call request ${callRequestId}`);
  }

  app.post("/api/bland/inbound", async (req: Request, res: Response) => {
    try {
      const baseUrl = getBaseUrl(req);

      // Use the shared buildBlandCallConfig helper so inbound and outbound
      // calls cannot drift on voice, model, prompt, dynamic_data, analysis
      // schema, or end-call behavior. Inbound's only unique field is the
      // metadata.source flag the post-call webhook uses to detect inbound
      // payloads and run the stateless guest-proposal branch.
      const config = bland.buildBlandCallConfig({
        task: bland.buildTravelConciergePrompt({ userName: "there" }),
        webhookUrl: `${baseUrl}/api/bland/webhook`,
        dynamicDataUrl: `${baseUrl}/api/bland/dynamic-data`,
        dynamicDataHeaders: { "x-bland-secret": bland.getWebhookSecret() },
        metadata: { source: "inbound_phone" },
      });

      return res.status(200).json(config);
    } catch (err: any) {
      console.error("Bland inbound webhook error:", err?.message || err);
      return res.status(500).json({ message: "Failed to build inbound call config" });
    }
  });

  app.post("/api/bland/webhook", async (req: Request, res: Response) => {
    try {
      const webhookSecret = req.headers["x-bland-secret"] as string;
      const expectedSecret = bland.getWebhookSecret();
      if (expectedSecret && webhookSecret && webhookSecret !== expectedSecret && webhookSecret !== process.env.BLAND_AI_API_KEY) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const payload = req.body;
      const blandCallId = payload.call_id;

      if (!blandCallId) {
        console.warn("Bland webhook received without call_id");
        return res.json({ received: true });
      }

      console.log(`Bland webhook received: event=${payload.event || "unknown"}, call_id=${blandCallId}`);

      let blandCall = await storage.getBlandCallByBlandId(blandCallId);

      if (!blandCall && payload.metadata?.blandCallDbId) {
        const dbId = parseInt(payload.metadata.blandCallDbId);
        if (!isNaN(dbId)) {
          await storage.updateBlandCall(dbId, { blandCallId });
          blandCall = await storage.getBlandCallByBlandId(blandCallId);
        }
      }

      if (!blandCall && payload.metadata?.callbackEmail) {
        if (payload.status === "completed" || payload.event === "call.ended") {
          const baseUrl = getBaseUrl(req);
          sendAccountCreationEmail(
            payload.metadata.callbackEmail,
            payload.metadata.callbackName || "",
            payload.metadata.callbackRequestId,
            baseUrl
          ).catch((err: any) => {
            console.error("Account creation email error:", err);
          });

          if (payload.metadata.callbackRequestId) {
            try {
              await storage.updateCallbackRequest(payload.metadata.callbackRequestId, {
                transcript: payload.concatenated_transcript || null,
                summary: payload.summary || null,
                recordingUrl: payload.recording_url || null,
                blandCallId: blandCallId,
                status: "completed",
              });
            } catch (err) {
              console.error("Failed to update callback request with call data:", err);
            }
          }

          console.log(`Callback call completed for ${payload.metadata.callbackEmail}, signup email sent`);
        }
        return res.json({ received: true });
      }

      // Inbound-call branch: when no bland_calls row exists AND the payload
      // is flagged as an inbound call (via metadata.source from
      // /api/bland/inbound, or an explicit payload.inbound flag), generate a
      // stateless guest proposal directly from this payload. Mirrors the
      // post-call branch of the outbound flow but skips everything that
      // requires a userId. Always ACKs 200 — failures are logged and
      // swallowed so Bland never retries the webhook into a tight loop.
      if (!blandCall) {
        const isInboundCall =
          payload.inbound === true ||
          payload.metadata?.source === "inbound_phone";
        const isTerminal =
          payload.status === "completed" || payload.event === "call.ended";

        if (isInboundCall && isTerminal) {
          // Idempotency: Bland sometimes redelivers the same terminal webhook
          // (network retry, dual events). Claim the dispatch slot synchronously
          // BEFORE launching the fire-and-forget generator, so two webhook
          // events arriving back-to-back cannot both create a guest proposal
          // and email the caller twice.
          if (inboundGuestProposalDispatched.has(blandCallId)) {
            console.log(
              `[bland-inbound] call_id=${blandCallId} skipping reason=already_dispatched`
            );
          } else {
            // Phone resolution priority: payload.from (caller) → payload.phone_number
            // → payload.variables.phone_number → payload.variables.from. Bland's
            // payload shape varies between events; we walk all of them. A null
            // result is fine — the helper will still try analysis.email and
            // can email the caller without a phone (the phone↔email upsert
            // just gets skipped).
            const rawPhone =
              payload.from ||
              payload.phone_number ||
              (payload.variables && (payload.variables.phone_number || payload.variables.from)) ||
              null;
            const phoneE164 = normalizePhoneE164(rawPhone);
            console.log(
              `[bland-inbound] call_id=${blandCallId} webhook_received phone_raw="${rawPhone || "—"}" phone_normalized=${phoneE164 || "—"}`
            );

            // Mark dispatched BEFORE launching so a duplicate webhook arriving
            // mid-generation also short-circuits. We do this even when the
            // helper later finds nothing usable — that way Bland retries on
            // the same call_id never re-attempt and never spam the caller.
            inboundGuestProposalDispatched.add(blandCallId);
            const inboundAnalysis = extractAnalysisFromBlandPayload(payload);
            const transcript = payload.concatenated_transcript || null;
            const summary = payload.summary || null;
            // Fire-and-forget so the webhook ack is not blocked on Duffel +
            // SendGrid latency. Errors are swallowed inside the helper.
            void generateGuestProposalForInboundCall({
              blandCallId,
              phoneE164,
              transcript,
              summary,
              analysis: inboundAnalysis,
            }).catch((err) => {
              console.error(
                `[bland-inbound] call_id=${blandCallId} unexpected throw from generator:`,
                err?.message || err,
              );
            });
          }
        } else {
          console.warn(`No matching bland_call found for bland_call_id=${blandCallId}`);
        }
        return res.json({ received: true });
      }

      const updateData: any = {};

      // Always capture transcript/summary/recording data when present, regardless of status.
      // Early hangups, no-answers, and failed calls can still have partial transcripts we want to use.
      if (payload.call_length) updateData.duration = parseInt(payload.call_length);
      if (payload.concatenated_transcript) updateData.transcript = payload.concatenated_transcript;
      if (payload.transcript) updateData.transcriptJson = payload.transcript;
      if (payload.recording_url) updateData.recordingUrl = payload.recording_url;
      if (payload.summary) updateData.summary = payload.summary;
      // Stash Bland's analysis_schema output under variables.__analysis so
      // re-trigger paths (manual regenerate, Claude verifier loop) can recover
      // it later without depending on this webhook still being in scope.
      // Bland delivers analysis under multiple known keys depending on event
      // type (`analysis`, `summary.analysis`, `analysis_schema`); the helper
      // walks all of them so structured extraction never silently misses.
      const blandAnalysis = extractAnalysisFromBlandPayload(payload);
      if (payload.variables || blandAnalysis) {
        // Merge order: prior persisted variables → payload.variables (if any)
        // → analysis. This preserves earlier keys when a follow-up event
        // arrives carrying only analysis (or only different variables), so
        // we never accidentally drop data captured by a previous webhook.
        const existing = (blandCall.variables && typeof blandCall.variables === "object")
          ? (blandCall.variables as Record<string, unknown>)
          : {};
        updateData.variables = {
          ...existing,
          ...(payload.variables || {}),
          ...(blandAnalysis ? { __analysis: blandAnalysis } : {}),
        };
      }

      if (payload.status === "completed" || payload.event === "call.ended") {
        updateData.status = "completed";
        updateData.endedAt = new Date();

        const alreadyCompleted = blandCall.status === "completed";
        const hasData = !!(payload.concatenated_transcript || payload.summary);
        console.log(`Bland webhook call.ended/completed: callId=${blandCall.id}, alreadyCompleted=${alreadyCompleted}, hasData=${hasData}`);

        if (blandCall.callRequestId) {
          await storage.updateCallRequest(blandCall.callRequestId, { status: "completed" });
        }

        if (!alreadyCompleted) {
          await storage.createNotification({
            userId: blandCall.userId,
            type: "call_completed",
            title: "Concierge call completed",
            body: `Your concierge call has been completed${updateData.duration ? ` (${Math.ceil(updateData.duration / 60)} min)` : ""}.`,
            linkUrl: "/call-history",
          });
        }

      }

      if (payload.status === "in_progress" || payload.event === "call.started") {
        updateData.status = "in_progress";
        updateData.startedAt = new Date();
      } else if (payload.status === "failed" || payload.status === "error") {
        updateData.status = "failed";
        updateData.errorMessage = payload.error_message || "Call failed";
        updateData.endedAt = new Date();

        if (blandCall.callRequestId) {
          await storage.updateCallRequest(blandCall.callRequestId, { status: "requested" });
        }

        await storage.createNotification({
          userId: blandCall.userId,
          type: "call_failed",
          title: "Concierge call failed",
          body: `Your concierge call could not be completed. ${payload.error_message || "Please try again."}`,
          linkUrl: "/call-history",
        });
      } else if (payload.status === "no-answer") {
        updateData.status = "no_answer";
        updateData.endedAt = new Date();

        await storage.createNotification({
          userId: blandCall.userId,
          type: "call_no_answer",
          title: "Concierge call - no answer",
          body: "We were unable to reach you. Please request a new call when you're available.",
          linkUrl: "/call-history",
        });
      }

      if (Object.keys(updateData).length > 0) {
        await storage.updateBlandCall(blandCall.id, updateData);
      }

      // Trigger proposal generation whenever we have any transcript/summary content,
      // regardless of whether the call ended cleanly. Early hangups, no-answers,
      // and failed calls can still yield enough signal to find a destination.
      // Use the persisted bland_call row so content captured by an earlier event
      // can still drive generation when the terminal event omits it.
      const isTerminalStatus =
        updateData.status === "completed" ||
        updateData.status === "failed" ||
        updateData.status === "no_answer";
      if (blandCall.callRequestId && duffel && isTerminalStatus) {
        const persisted = await storage.getBlandCallByBlandId(blandCallId);
        const finalTranscript = persisted?.transcript || updateData.transcript || null;
        const finalSummary = persisted?.summary || updateData.summary || null;
        if (finalTranscript || finalSummary) {
          console.log(
            `Bland webhook: triggering proposal generation for callRequestId=${blandCall.callRequestId} (status=${updateData.status}, hasTranscript=${!!finalTranscript}, hasSummary=${!!finalSummary})`
          );
          triggerProposalGenerationOnce(
            blandCall.callRequestId,
            blandCall.userId,
            finalSummary,
            finalTranscript,
            blandAnalysis ?? extractAnalysisFromVariables(persisted?.variables),
          );
        }
      }

      return res.json({ received: true });
    } catch (err: any) {
      console.error("Bland webhook processing error:", err);
      return res.json({ received: true });
    }
  });

  // Apply minimal CORS headers ONLY to /api/bland/dynamic-data so the Bland
  // dashboard "Test Request" button (a cross-origin browser fetch from e.g.
  // https://app.bland.ai) can reach the endpoint. Real Bland production calls
  // are server-to-server and don't enforce CORS, so this is purely a
  // dashboard-tooling convenience and not a security relaxation.
  //
  // We use Access-Control-Allow-Origin: * because:
  //   1. Auth is via the x-bland-secret header (not cookies), so widening
  //      origin does not weaken auth.
  //   2. We do NOT set Access-Control-Allow-Credentials, so browsers will
  //      refuse to send cookies along even if the calling page tried.
  //   3. The response payload is concierge context already gated by the
  //      secret header.
  function applyBlandDynamicDataCors(_req: Request, res: Response) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, x-bland-secret",
    );
    res.setHeader("Access-Control-Max-Age", "86400");
    // Vary so any caching layer keys correctly on Origin.
    res.setHeader("Vary", "Origin");
  }

  // Preflight handler so the browser's OPTIONS preflight (triggered by the
  // custom x-bland-secret header) gets a 204 with the CORS allow-list.
  // Without this, the browser blocks the actual POST from ever firing and
  // the dashboard surfaces a generic FetchError.
  app.options("/api/bland/dynamic-data", (req: Request, res: Response) => {
    applyBlandDynamicDataCors(req, res);
    return res.status(204).end();
  });

  app.post("/api/bland/dynamic-data", async (req: Request, res: Response) => {
    try {
      // Headers and diagnostic log must run BEFORE the secret check so:
      //  (a) 401 responses still carry the CORS headers (otherwise the
      //      browser hides the 401 behind a generic CORS error and the
      //      dashboard can't tell auth from reachability).
      //  (b) misconfigured-secret attempts still appear in logs so an
      //      operator can debug a typo in the dashboard secret value.
      applyBlandDynamicDataCors(req, res);
      const _origin = (req.headers.origin as string) || "—";
      const _ct = (req.headers["content-type"] as string) || "—";
      // Boolean-only — never log the actual secret value.
      const _hasSecret = !!req.headers["x-bland-secret"];
      console.log(
        `[bland/dynamic-data] method=${req.method} origin=${_origin} ` +
          `content_type=${_ct} x_bland_secret_present=${_hasSecret} ` +
          `body=${JSON.stringify(req.body || {})}`,
      );

      const secret = req.headers["x-bland-secret"] as string;
      const expectedSecret = bland.getWebhookSecret();
      if (!secret || (secret !== expectedSecret && secret !== process.env.BLAND_AI_API_KEY)) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { phone_number, call_id, from } = req.body;

      let userId: string | null = null;
      let userLookupSource: "call_id" | "phone_traveler_profile" | "phone_bland_calls" | "phone_email_map_to_user" | "none" = "none";

      if (call_id) {
        const blandCall = await storage.getBlandCallByBlandId(call_id);
        if (blandCall) {
          userId = blandCall.userId;
          userLookupSource = "call_id";
        }
      }

      // Inbound-caller resolution: if call_id didn't yield a Travnr user (the
      // typical cold-inbound case), try to resolve by caller phone. Priority
      // is `phone_number → from`; we ignore `to` because for inbound calls
      // `to` is the Travnr DID, not the caller.
      const rawCallerPhone = (phone_number as string | undefined) || (from as string | undefined) || null;
      const normalizedCallerPhone = rawCallerPhone ? normalizePhoneE164(rawCallerPhone) : null;
      console.log(`[bland/dynamic-data] phone_normalized=${normalizedCallerPhone || "—"}`);

      if (!userId && normalizedCallerPhone) {
        const phoneMatch = await storage.getUserIdByPhone(normalizedCallerPhone).catch(() => null);
        if (phoneMatch) {
          userId = phoneMatch.userId;
          userLookupSource = phoneMatch.source;
        }
      }

      let travelerInfo = "No traveler profile found.";
      let bookingInfo = "No recent bookings.";
      let proposalInfo = "No active proposals.";
      let emailInfo = "No email on file — ask at the end of the call.";

      if (userId) {
        const profile = await storage.getProfile(userId);
        if (profile) {
          travelerInfo = [
            profile.name ? `Name: ${profile.name}` : null,
            profile.homeAirport ? `Home airport: ${profile.homeAirport}` : null,
            profile.seatPreference ? `Seat preference: ${profile.seatPreference}` : null,
            profile.dietaryNotes ? `Dietary needs: ${profile.dietaryNotes}` : null,
            profile.budgetRange ? `Budget: ${profile.budgetRange}` : null,
            profile.loyaltyPrograms ? `Loyalty programs: ${profile.loyaltyPrograms}` : null,
          ].filter(Boolean).join(". ") || "Profile exists but minimal details.";
        }

        const payments = await storage.getPayments(userId);
        const recentBookings = payments
          .filter(p => p.duffelBookingRef)
          .slice(0, 3)
          .map(p => `Booking ${p.duffelBookingRef} - ${p.currency?.toUpperCase()} ${p.amount} (${p.status})`)
          .join("; ");
        if (recentBookings) bookingInfo = recentBookings;

        const proposals = await storage.getProposals(userId);
        const activeProposals = proposals
          .filter(p => p.status === "sent" || p.status === "approved")
          .slice(0, 3)
          .map(p => `"${p.title}" - $${p.totalEstimate} (${p.status})`)
          .join("; ");
        if (activeProposals) proposalInfo = activeProposals;

        const owner = await storage.getUser(userId);
        if (owner?.email) emailInfo = `Email on file: ${owner.email}`;
      }

      // Fall back to the phone↔email map (covers guest callers and inbound calls
      // where call_id doesn't resolve to a Travnr user). Use the resolved
      // caller phone (phone_number || from) so inbound payloads that only
      // carry `from` still benefit from the fallback.
      const fallbackPhone = normalizedCallerPhone || phone_number;
      if (emailInfo.startsWith("No email on file") && fallbackPhone) {
        const mapped = await storage.getEmailForPhone(fallbackPhone).catch(() => null);
        if (mapped) emailInfo = `Email on file: ${mapped}`;
      }

      // Returning-caller context: when Bland reports the inbound phone number,
      // surface the most recent unbooked guest proposal (within 24h) so the AI
      // can offer to revisit it. Wrapped in try/catch so a lookup failure can
      // never break the existing dynamic-data response.
      let previousProposalInfo = "No prior options to revisit";
      if (fallbackPhone) {
        try {
          const recent = await storage.getRecentGuestProposalForPhone(fallbackPhone, 24);
          if (recent) {
            const route = `${recent.row.originIata} → ${recent.row.destinationIata}`;
            previousProposalInfo = recent.expired
              ? `Sent flight options for ${route} earlier — those have expired, plan something new`
              : `Sent flight options for ${route} earlier today, status ${recent.row.status}`;
          }
        } catch (e: any) {
          console.warn("[bland/dynamic-data] previous_proposal_info lookup failed:", e?.message || e);
        }
      }

      // Opportunistic phone↔email map upsert: when the phone-based path
      // resolved a user with an email on file, persist the mapping so future
      // inbound calls from this number can short-circuit via the cheaper
      // phone↔email map path. Wrapped in try/catch — never block the response.
      const emailFound = emailInfo.startsWith("Email on file:");
      if (
        normalizedCallerPhone &&
        emailFound &&
        userLookupSource !== "call_id" &&
        userLookupSource !== "none"
      ) {
        try {
          const emailValue = emailInfo.slice("Email on file:".length).trim();
          if (emailValue) {
            await storage.upsertPhoneEmailMap(normalizedCallerPhone, emailValue);
          }
        } catch (e: any) {
          console.warn("[bland/dynamic-data] phone_email_map upsert failed:", e?.message || e);
        }
      }

      console.log(`[bland/dynamic-data] user_lookup_source=${userLookupSource}`);
      console.log(`[bland/dynamic-data] user_found=${!!userId}`);
      console.log(`[bland/dynamic-data] email_found=${emailFound}`);

      return res.json({
        traveler_info: travelerInfo,
        booking_info: bookingInfo,
        proposal_info: proposalInfo,
        email_info: emailInfo,
        previous_proposal_info: previousProposalInfo,
      });
    } catch (err: any) {
      console.error("Bland dynamic data error:", err);
      // Re-apply CORS headers on the error path. They were already set at the
      // top of the try block, but if anything in this hot path ever throws
      // before that line (e.g. a future refactor), this guarantees the dashboard
      // still gets a useful CORS response instead of an opaque browser error.
      applyBlandDynamicDataCors(req, res);
      return res.json({
        traveler_info: "Error loading profile.",
        booking_info: "Error loading bookings.",
        proposal_info: "Error loading proposals.",
        email_info: "No email on file — ask at the end of the call.",
        previous_proposal_info: "No prior options to revisit",
      });
    }
  });

  app.post("/api/bland/stop/:callId", isAuthenticated, async (req: Request, res: Response) => {
    if (!bland.isConfigured()) return res.status(503).json({ message: "Bland AI is not configured" });
    try {
      const blandCallId = req.params.callId;
      const blandCall = await storage.getBlandCallByBlandId(blandCallId);
      if (!blandCall || blandCall.userId !== req.session.userId!) {
        return res.status(404).json({ message: "Call not found" });
      }
      await bland.stopCall(blandCallId);
      await storage.updateBlandCall(blandCall.id, { status: "completed", endedAt: new Date() });
      return res.json({ stopped: true });
    } catch (err: any) {
      console.error("Bland stop call error:", err);
      return res.status(500).json({ message: err.message || "Failed to stop call" });
    }
  });

  // GUEST PROPOSAL (public, by token)
  app.get("/api/guest-proposal/:token", async (req: Request, res: Response) => {
    try {
      const token = req.params.token;
      if (!token) return res.status(400).json({ message: "Missing token" });
      const row = await storage.getGuestProposalByToken(token);
      if (!row) return res.status(404).json({ message: "Not found" });

      const now = Date.now();
      const expired = row.expiresAt && new Date(row.expiresAt).getTime() < now;
      if (!expired) {
        // Best-effort transition pending -> viewed so we can track engagement
        // and (later) suppress redundant follow-ups. Never block the response.
        let surfacedStatus = row.status;
        if (row.status === "pending") {
          await storage.updateGuestProposalStatus(row.id, "viewed").catch((e) =>
            console.warn(`[guest-proposal] failed to mark token=${token} viewed:`, e?.message || e)
          );
          surfacedStatus = "viewed";
        }
        return res.json({
          token: row.token,
          status: surfacedStatus,
          email: row.email,
          createdAt: row.createdAt,
          expiresAt: row.expiresAt,
          proposal: row.proposalData,
        });
      }

      // Expired: mark this row as 'expired' synchronously (acts as a lock to prevent
      // duplicate regenerations from rapid repeat clicks / link-preview crawlers),
      // then kick off background regeneration. If the row was already expired, skip.
      if (row.status === "expired") {
        return res.status(410).json({
          expired: true,
          refreshed: false,
          message: "These options have expired. A fresh email was already on its way.",
          email: row.email,
        });
      }
      await storage.updateGuestProposalStatus(row.id, "expired").catch((e) =>
        console.warn(`[guest-proposal] failed to mark token=${token} expired:`, e?.message || e)
      );

      // Background regeneration — produces a brand new guest_proposal row + new email.
      (async () => {
        try {
          if (!duffel) {
            console.warn(`[guest-proposal] cannot regenerate token=${token}: Duffel not configured`);
            return;
          }
          const slices: any[] = [
            { origin: row.originIata, destination: row.destinationIata, departure_date: row.departureDate },
          ];
          if (row.returnDate) {
            slices.push({ origin: row.destinationIata, destination: row.originIata, departure_date: row.returnDate });
          }
          const passengers: Array<{ type: "adult" }> = [];
          for (let i = 0; i < (row.passengers || 1); i++) passengers.push({ type: "adult" as const });
          const offerRequest = await duffel.offerRequests.create({
            slices,
            passengers,
            cabin_class: (row.cabinClass || "economy") as any,
            return_offers: true,
            max_connections: 1,
          });
          const allOffers = (offerRequest.data as any).offers || [];
          if (allOffers.length === 0) {
            console.warn(`[guest-proposal] regeneration found no offers for token=${token}`);
            return;
          }
          allOffers.sort((a: any, b: any) => parseFloat(a.total_amount) - parseFloat(b.total_amount));
          const prevData = (row.proposalData as any) as GuestProposalData;
          const guestData = buildGuestProposalDataFromOffers({
            offers: allOffers,
            originIata: row.originIata,
            originName: prevData?.originName ?? row.originIata,
            destinationIata: row.destinationIata,
            destinationName: prevData?.destinationName ?? row.destinationIata,
            departureDate: row.departureDate,
            returnDate: row.returnDate,
            passengers: row.passengers,
            cabinClass: row.cabinClass,
          });
          if (guestData.options.length === 0) return;
          const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
          const saved = await storage.createGuestProposal({
            email: row.email,
            originIata: row.originIata,
            destinationIata: row.destinationIata,
            departureDate: row.departureDate,
            returnDate: row.returnDate,
            passengers: row.passengers,
            cabinClass: row.cabinClass,
            proposalData: guestData as any,
            status: "pending",
            expiresAt,
          });
          const baseUrl = getBaseUrl(req);
          await sendGuestProposalEmail(row.email, {
            baseUrl,
            originIata: guestData.originIata,
            originName: guestData.originName,
            destinationIata: guestData.destinationIata,
            destinationName: guestData.destinationName,
            departureDate: guestData.departureDate,
            returnDate: guestData.returnDate,
            passengers: guestData.passengers,
            options: guestData.options.map((o) => ({
              token: o.token,
              label: o.label,
              totalAmount: o.totalAmount,
              totalCurrency: o.totalCurrency,
              totalDurationMinutes: o.totalDurationMinutes,
              stops: o.stops,
              carrierName: o.carrierName,
              carrierLogo: o.carrierLogo,
              outboundDepartingAt: o.slices?.[0]?.departingAt ?? null,
              outboundArrivingAt: o.slices?.[0]?.arrivingAt ?? null,
              baggage: o.baggage,
              refundable: o.refundable,
              changeable: o.changeable,
            })),
          });
          console.log(`[guest-proposal] regenerated expired token=${token} -> new token=${saved.token}`);
        } catch (regenErr: any) {
          console.error(`[guest-proposal] regeneration failed for token=${token}:`, regenErr?.message || regenErr);
        }
      })();

      return res.status(410).json({
        expired: true,
        refreshed: true,
        message: "These options have expired. We're sending a fresh set of flights to your email now.",
        email: row.email,
      });
    } catch (err: any) {
      console.error("[guest-proposal] GET error:", err);
      return res.status(500).json({ message: "Failed to load proposal" });
    }
  });

  // ==================== GUEST BOOKING (public, by per-option token) ====================
  // Closes the loop on the guest flow: a recipient clicks "Book This Flight"
  // in the email, lands on /book/:optionToken, enters passenger details,
  // pays via Stripe, and receives either an automatic confirmation OR a
  // warm "we're on it" holding email if the Duffel balance is insufficient
  // (mirrors the existing manual-fallback path used by the logged-in flow).
  // No account is required — a placeholder user is created server-side so
  // payments + calendar entries can be linked once they (optionally) sign up.

  // Resolve a guest_proposal + selected option from a per-option token.
  async function resolveGuestOption(optionToken: string) {
    const row = await storage.getGuestProposalByOptionToken(optionToken);
    if (!row) return null;
    const proposalData = (row.proposalData as any) as GuestProposalData;
    const option = (proposalData?.options || []).find((o) => o.token === optionToken) || null;
    if (!option) return null;
    return { row, proposalData, option };
  }

  // Create or fetch a placeholder user keyed by email so we can satisfy the
  // payments.user_id FK without forcing the guest to sign up. The placeholder
  // has a random unguessable password (so they can't log in) and is marked
  // unverified.
  //
  // Security: the caller MUST have already verified that `email` matches the
  // guest_proposal's stored email (i.e. the proposal recipient). For an
  // existing user, we link the booking but do NOT mutate their profile —
  // anyone who knows a user's email could otherwise overwrite contact info.
  async function ensureGuestUser(args: {
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
  }): Promise<{ user: any; createdNew: boolean }> {
    const email = args.email.trim().toLowerCase();
    const existing = await storage.getUserByEmail(email);
    if (existing) {
      // Existing account — return as-is, do NOT mutate their profile.
      return { user: existing, createdNew: false };
    }
    const randomPassword = randomBytes(32).toString("hex");
    const hashed = await bcrypt.hash(randomPassword, 12);
    const verificationToken = randomBytes(32).toString("hex");
    const created = await storage.createUser({
      email,
      password: hashed,
      firstName: (args.firstName || "Guest").slice(0, 60),
      lastName: (args.lastName || "Traveler").slice(0, 60),
      verificationToken,
    });
    if (args.phone) {
      await storage.upsertProfile(created.id, {
        name: [created.firstName, created.lastName].filter(Boolean).join(" ") || null,
        phone: args.phone,
      }).catch((e) => console.warn("[guest-booking] upsertProfile (new) failed:", e?.message || e));
    }
    return { user: created, createdNew: true };
  }

  // GET /api/guest-booking/:optionToken/option
  // Returns the selected option summary + Stripe publishable key so the
  // public booking page can render the flight + Payment Element without
  // any auth.
  app.get("/api/guest-booking/:optionToken/option", async (req: Request, res: Response) => {
    try {
      const { optionToken } = req.params;
      if (!optionToken) return res.status(400).json({ message: "Missing token" });

      const resolved = await resolveGuestOption(optionToken);
      if (!resolved) return res.status(404).json({ message: "This booking link is no longer valid." });
      const { row, proposalData, option } = resolved;

      const expired = row.expiresAt && new Date(row.expiresAt).getTime() < Date.now();
      if (expired) {
        return res.status(410).json({ expired: true, message: "This flight option has expired. Please request fresh options." });
      }
      if (row.status === "booked") {
        return res.status(409).json({ alreadyBooked: true, message: "This proposal has already been booked." });
      }
      if (row.status === "booking") {
        return res.status(409).json({ alreadyBooked: true, message: "This proposal is currently being booked. Please refresh in a moment." });
      }

      const publishableKey = await getStripePublishableKey().catch(() => null);
      const originalCents = Math.round(parseFloat(option.totalAmount) * 100);
      const fee = applyConvenienceFee(originalCents);

      // Fetch the live offer to discover whether Duffel requires passenger
      // passport details for this fare. We only need the boolean — best-effort
      // (default to false on lookup failure so the page still renders).
      let passportRequired = false;
      if (duffel) {
        try {
          const offerRes = await duffel.offers.get(option.duffelOfferId);
          passportRequired = Boolean((offerRes.data as any)?.passenger_identity_documents_required);
        } catch (e: any) {
          console.warn("[guest-booking] passport-required lookup failed:", e?.message || e);
        }
      }

      return res.json({
        token: option.token,
        guestEmail: row.email,
        passengerCount: row.passengers,
        cabinClass: row.cabinClass,
        passportRequired,
        proposal: {
          originIata: proposalData.originIata,
          originName: proposalData.originName,
          destinationIata: proposalData.destinationIata,
          destinationName: proposalData.destinationName,
          departureDate: proposalData.departureDate,
          returnDate: proposalData.returnDate,
        },
        option,
        pricing: {
          originalAmountCents: fee.originalCents,
          convenienceFeeCents: fee.feeCents,
          totalAmountCents: fee.totalCents,
          currency: option.totalCurrency,
        },
        publishableKey,
      });
    } catch (err: any) {
      console.error("[guest-booking] option lookup error:", err);
      return res.status(500).json({ message: "Failed to load booking option" });
    }
  });

  // POST /api/guest-booking/:optionToken/validate-promo
  // No-auth promo validation scoped to a guest option token. Mirrors the
  // authenticated `/api/promo/validate` response shape exactly so the shared
  // PromoCodeInput component (which receives this URL via `validateEndpoint`)
  // can consume the response without any branching. The guest's email is
  // derived from the option token rather than trusted from the request, so a
  // caller cannot impersonate an admin email to unlock admin-only codes.
  app.post("/api/guest-booking/:optionToken/validate-promo", guestBookingLimiter, async (req: Request, res: Response) => {
    try {
      const optionToken = String(req.params.optionToken);
      const resolved = await resolveGuestOption(optionToken);
      if (!resolved) return res.status(404).json({ valid: false, message: "Booking option not found" });
      const { row } = resolved;

      const { code } = req.body || {};
      const result = await validatePromoCodeForUser(code, row.email);
      if (!result.ok) {
        return res.status(400).json({ valid: false, message: result.reason });
      }
      return res.json({
        valid: true,
        code: result.code,
        overrideAmountCents: result.overrideAmountCents,
        forceManual: result.forceManual,
      });
    } catch (err: any) {
      console.error("[guest-booking] validate-promo error:", err);
      return res.status(500).json({ valid: false, message: "Failed to validate promo" });
    }
  });

  // POST /api/guest-booking/:optionToken/payment-intent
  // Mirrors POST /api/stripe/create-flight-payment-intent for the no-auth case.
  // When a promo code is supplied, server-side re-validates it against the
  // guest's email (NOT a request-supplied email — token-derived only) and
  // overrides the charged amount + skips the convenience fee, mirroring the
  // authenticated flight payment-intent endpoint.
  app.post("/api/guest-booking/:optionToken/payment-intent", guestBookingLimiter, async (req: Request, res: Response) => {
    try {
      const { optionToken } = req.params;
      const resolved = await resolveGuestOption(optionToken);
      if (!resolved) return res.status(404).json({ message: "Booking option not found" });
      const { row, option } = resolved;

      const expired = row.expiresAt && new Date(row.expiresAt).getTime() < Date.now();
      if (expired) return res.status(410).json({ expired: true, message: "This option has expired." });
      if (row.status === "booked") return res.status(409).json({ alreadyBooked: true });
      // Block PaymentIntent creation while another /confirm is mid-flight to
      // prevent a double-charge race: status is set to "booking" inside the
      // confirm endpoint between claim and terminal state. Allowing a new PI
      // here could capture a second charge that confirm would then 409 on.
      if (row.status === "booking") {
        return res.status(409).json({ alreadyBooked: true, message: "This proposal is currently being booked." });
      }

      const { promoCode } = req.body || {};
      let promoMeta: { code: string; promoId: number; forceManual: boolean } | null = null;
      const originalCents = Math.round(parseFloat(option.totalAmount) * 100);
      let chargeCents: number;
      let feeOriginalCents = originalCents;
      let feeCents = 0;
      let promoOverrideCents: number | null = null;

      if (promoCode) {
        const promo = await validatePromoCodeForUser(String(promoCode), row.email);
        if (!promo.ok) {
          return res.status(400).json({ message: `Promo code rejected: ${promo.reason}` });
        }
        promoMeta = { code: promo.code, promoId: promo.promoId, forceManual: promo.forceManual };
        promoOverrideCents = promo.overrideAmountCents;
        chargeCents = promo.overrideAmountCents;
      } else {
        const fee = applyConvenienceFee(originalCents);
        chargeCents = fee.totalCents;
        feeOriginalCents = fee.originalCents;
        feeCents = fee.feeCents;
      }

      const stripe = await getUncachableStripeClient();
      const paymentIntent = await stripe.paymentIntents.create({
        amount: chargeCents,
        currency: String(option.totalCurrency || "usd").toLowerCase(),
        automatic_payment_methods: { enabled: true },
        metadata: {
          type: "guest_flight_booking",
          optionToken,
          guestProposalId: String(row.id),
          guestEmail: row.email,
          duffelOfferId: option.duffelOfferId,
          original_amount: String(feeOriginalCents),
          convenience_fee: String(feeCents),
          convenience_fee_percent: promoMeta ? "0" : String(CONVENIENCE_FEE_PERCENT),
          ...(promoMeta ? {
            promoCode: promoMeta.code,
            promoId: String(promoMeta.promoId),
            promoForceManual: promoMeta.forceManual ? "1" : "0",
            promoOverrideAmountCents: String(promoOverrideCents ?? chargeCents),
          } : {}),
        },
        receipt_email: row.email,
      });

      return res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amountCents: chargeCents,
        currency: option.totalCurrency,
        promoApplied: promoMeta ? { code: promoMeta.code, forceManual: promoMeta.forceManual, chargedAmountCents: chargeCents } : null,
      });
    } catch (err: any) {
      console.error("[guest-booking] PaymentIntent error:", err);
      return res.status(500).json({ message: err.message || "Failed to create payment" });
    }
  });

  // POST /api/guest-booking/:optionToken/confirm
  // Verifies the PI, books on Duffel (or routes to manual fallback), persists
  // a payments row + calendar entries, and emails the guest.
  const guestConfirmSchema = z.object({
    paymentIntentId: z.string().min(1),
    contact: z.object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      email: z.string().email(),
      phone: z.string().min(3),
    }),
    passengers: z.array(z.object({
      givenName: z.string().min(1),
      familyName: z.string().min(1),
      bornOn: z.string().min(4), // YYYY-MM-DD
      gender: z.enum(["m", "f", "x", "u"]).optional().default("u"),
      title: z.enum(["mr", "ms", "mrs", "miss", "dr"]).optional().default("mr"),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      passportNumber: z.string().optional(),
      passportCountry: z.string().optional(),
      passportExpiry: z.string().optional(),
    })).min(1),
  });

  app.post("/api/guest-booking/:optionToken/confirm", guestBookingLimiter, async (req: Request, res: Response) => {
    if (!duffel) return res.status(503).json({ message: "Booking is temporarily unavailable" });
    // Hoisted so the outer catch below can roll back the transient "booking"
    // claim if any throw escapes between claim and terminal state.
    let claimedRowId: number | null = null;
    let claimPriorStatus: string | null = null;
    let bookingComplete = false;
    try {
      const { optionToken } = req.params;
      const parsed = guestConfirmSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid input" });
      }
      const { paymentIntentId, contact, passengers } = parsed.data;

      const resolved = await resolveGuestOption(optionToken);
      if (!resolved) return res.status(404).json({ message: "Booking option not found" });
      const { row, proposalData, option } = resolved;

      // Strict ownership: the contact email submitted by the booker MUST match
      // the proposal recipient. Otherwise an attacker who knows or guesses an
      // option token could route a payment + booking to their own account.
      if (contact.email.trim().toLowerCase() !== row.email.trim().toLowerCase()) {
        return res.status(403).json({ message: "Contact email must match the email this proposal was sent to." });
      }

      // Idempotency: if we've already processed this PaymentIntent, return the
      // existing booking instead of double-charging Duffel.
      const existingPayment = await storage.getPaymentByStripeIntentId(paymentIntentId);
      if (existingPayment) {
        if (existingPayment.status === "pending_manual") {
          return res.json({
            status: "pending_manual",
            message: "Your payment was received. Our concierge team will email you the confirmation within 2 hours.",
          });
        }
        return res.json({
          status: "confirmed",
          bookingRef: existingPayment.duffelBookingRef,
          orderId: existingPayment.duffelOrderId,
        });
      }

      // Verify Stripe PaymentIntent belongs to this option + is succeeded.
      // We re-check every metadata field that the create-PI endpoint stamped,
      // so a PI created elsewhere cannot be cross-applied here.
      const stripe = await getUncachableStripeClient();
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (pi.status !== "succeeded") {
        return res.status(400).json({ message: "Payment not confirmed yet. Please try again." });
      }
      const md = pi.metadata || {};
      if (md.type !== "guest_flight_booking"
          || md.optionToken !== optionToken
          || md.guestProposalId !== String(row.id)
          || (md.guestEmail || "").toLowerCase() !== row.email.toLowerCase()
          || md.duffelOfferId !== option.duffelOfferId) {
        return res.status(403).json({ message: "Payment does not belong to this booking option." });
      }
      // If the PI was created with a promo, re-validate that promo NOW
      // (against the token-derived email — same source of truth used at PI
      // creation time). A promo that has since been disabled, expired, or
      // exhausted falls back to the standard amount check so we never honor
      // a stale discount, but a still-valid promo lets the PI amount equal
      // the override instead of the convenience-fee total.
      // Auto-refund duplicate / orphaned PIs but skip when the PI already
      // backs a real payment row (legitimate same-PI retry). Defined before
      // the promo/amount checks so those branches can call it when they
      // need to reject a PI that has already been captured by Stripe.
      const refundStrandedPI = async (reason: string) => {
        try {
          if (pi.status !== "succeeded") return { refunded: false };
          const existingPayment = await storage.getPaymentByStripeIntentId(pi.id).catch(() => null);
          if (existingPayment) {
            console.log(`[guest-booking] skip refund of PI ${pi.id} (${reason}): backs payment row ${existingPayment.id}`);
            return { refunded: false };
          }
          const refund = await stripe.refunds.create({
            payment_intent: pi.id,
            reason: "duplicate",
            metadata: { strandedReason: reason, optionToken },
          });
          console.log(`[guest-booking] refunded duplicate PI ${pi.id} (${reason}): ${refund.id}`);
          return { refunded: true, refundId: refund.id };
        } catch (e: any) {
          console.error(`[guest-booking] CRITICAL: refund of PI ${pi.id} (${reason}) failed; manual refund required:`, e?.message || e);
        }
        return { refunded: false };
      };

      const piPromoCode = pi.metadata?.promoCode || null;
      let appliedPromo: { id: number; code: string; forceManual: boolean; overrideAmountCents: number } | null = null;
      let promoBecameInvalid = false;
      if (piPromoCode) {
        const promo = await validatePromoCodeForUser(piPromoCode, row.email);
        if (promo.ok) {
          appliedPromo = {
            id: promo.promoId,
            code: promo.code,
            forceManual: promo.forceManual,
            overrideAmountCents: promo.overrideAmountCents,
          };
        } else {
          // The promo was valid when the PI was created but has since been
          // disabled, expired, or fully redeemed. The customer paid the
          // discounted amount in good faith — we must NOT silently fall
          // through to the standard amount check (which would reject and
          // strand the captured payment). Refund the customer below.
          promoBecameInvalid = true;
          console.warn(`[guest-booking] PI metadata promo no longer valid for token ${optionToken}: ${piPromoCode} (${promo.reason})`);
        }
      }

      const originalCents = Math.round(parseFloat(option.totalAmount) * 100);
      if (appliedPromo) {
        // Promo override: charged amount must be exactly the override (any
        // mismatch implies tampering since the PI was server-issued).
        if (pi.amount !== appliedPromo.overrideAmountCents) {
          return res.status(400).json({ message: "Payment amount does not match the promo-overridden total." });
        }
      } else if (promoBecameInvalid) {
        // The customer paid based on a promo that's no longer valid. Refund
        // them and ask them to retry without the promo (or contact support
        // if the promo expired mid-checkout). We do NOT consume the option
        // or status (caller can retry; refundStrandedPI is a no-op if a
        // payment row already exists for this PI).
        await refundStrandedPI("promo_invalid_at_confirm");
        return res.status(409).json({
          message: "The promo code used at checkout is no longer valid. Your payment has been refunded — please retry your booking.",
          promoInvalid: true,
          refunded: pi.status === "succeeded",
        });
      } else {
        const expectedTotalCents = applyConvenienceFee(originalCents).totalCents;
        if (pi.amount < expectedTotalCents) {
          return res.status(400).json({ message: "Payment amount is insufficient for this flight." });
        }
      }
      if (pi.currency !== String(option.totalCurrency).toLowerCase()) {
        return res.status(400).json({ message: "Payment currency does not match the flight currency." });
      }

      const expired = row.expiresAt && new Date(row.expiresAt).getTime() < Date.now();
      if (expired) {
        // Skip auto-refund while another confirm holds the booking lock —
        // its in-flight PI may be the same one and refunding would void it.
        if (row.status === "booking") {
          return res.status(410).json({
            expired: true,
            message: "This option has expired but a booking is currently in progress. Please wait a moment and refresh — if your payment was duplicated, contact support and it will be refunded.",
          });
        }
        const refundInfo = await refundStrandedPI("option_expired");
        return res.status(410).json({
          expired: true,
          ...refundInfo,
          message: refundInfo.refunded
            ? "This option expired before booking could complete. Your payment has been refunded."
            : "This option has expired before booking could complete. Please contact support — your payment has been received.",
        });
      }
      if (row.status === "booked") {
        const refundInfo = await refundStrandedPI("already_booked");
        return res.status(409).json({
          alreadyBooked: true,
          ...refundInfo,
          message: refundInfo.refunded
            ? "This proposal was already booked in another session. Your duplicate payment has been refunded."
            : "This proposal has already been booked.",
        });
      }

      // Atomic claim: only matches pending/viewed/sent → "booking", so a
      // single concurrent /confirm wins. Hoisted vars below let the outer
      // catch roll back if any throw escapes before we reach "booked".
      const claim = await storage.claimGuestProposalForBooking(row.id);
      if (!claim) {
        // Another /confirm holds the lock. Skip auto-refund — its in-flight
        // PI may be the same one and refunding would void it.
        return res.status(409).json({
          alreadyBooked: true,
          message: "This proposal is currently being booked. Please wait a moment and refresh — if your payment was duplicated, contact support and it will be refunded.",
        });
      }
      claimedRowId = row.id;
      claimPriorStatus = claim.priorStatus;
      const rollbackClaim = async () => {
        if (bookingComplete || claimedRowId == null || claimPriorStatus == null) return;
        await storage.updateGuestProposalStatus(claimedRowId, claimPriorStatus).catch((e) =>
          console.warn("[guest-booking] failed to rollback claim:", e?.message || e)
        );
      };

      // Re-fetch the offer to ensure it's still valid + get full passenger schema.
      let offer: any;
      try {
        const offerRes = await duffel.offers.get(option.duffelOfferId);
        offer = offerRes.data as any;
      } catch (offerErr: any) {
        const offerErrMsg = offerErr?.errors?.[0]?.message || "";
        if (offerErrMsg.toLowerCase().includes("does not exist") || offerErr?.status === 404) {
          await rollbackClaim();
          return res.status(400).json({ message: "This flight offer is no longer available. Please request fresh options." });
        }
        await rollbackClaim();
        throw offerErr;
      }
      if (offer.expires_at && new Date(offer.expires_at) < new Date()) {
        await rollbackClaim();
        return res.status(400).json({ message: "This flight offer has expired. Please request fresh options." });
      }
      if (offer.passenger_identity_documents_required) {
        const allHavePassport = passengers.every((p) => p.passportNumber && p.passportCountry && p.passportExpiry);
        if (!allHavePassport) {
          await rollbackClaim();
          return res.status(400).json({ message: "This flight requires passport details for every passenger." });
        }
      }

      // Map passengers to Duffel offer.passengers (by index).
      const passengerMappings = (offer.passengers || []).map((p: any, idx: number) => {
        const pax = passengers[idx] || passengers[0];
        const mapping: any = {
          id: p.id,
          given_name: pax.givenName,
          family_name: pax.familyName,
          born_on: pax.bornOn,
          email: pax.email || contact.email,
          phone_number: pax.phone || contact.phone,
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
        return mapping;
      });

      // Ensure a placeholder user exists so payments.user_id is satisfied.
      // Email match against `row.email` was enforced above, so this either
      // returns the legitimate existing user or creates a placeholder.
      const { user: guestUser, createdNew: guestUserCreated } = await ensureGuestUser({
        email: contact.email,
        firstName: contact.firstName,
        lastName: contact.lastName,
        phone: contact.phone,
      });

      // Build route + date labels for emails (used in both branches).
      const sliceSummary = (offer.slices || []).map((s: any) => ({
        origin: s.origin?.iata_code,
        destination: s.destination?.iata_code,
        departingAt: s.segments?.[0]?.departing_at,
        arrivingAt: s.segments?.[s.segments.length - 1]?.arriving_at,
        carrier: s.segments?.[0]?.marketing_carrier?.name,
        flightNumber: s.segments?.[0]?.marketing_carrier_flight_number,
      }));
      const routeLabel = sliceSummary.length
        ? `${sliceSummary[0].origin || "?"} → ${sliceSummary[sliceSummary.length - 1].destination || "?"}`
        : `${proposalData.originIata} → ${proposalData.destinationIata}`;
      const departingAt = sliceSummary[0]?.departingAt;
      const dateLabel = departingAt
        ? new Date(departingAt).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" } as Intl.DateTimeFormatOptions)
        : proposalData.departureDate;
      const carrierName = offer.owner?.name || option.carrierName || null;
      const chargedTotalAmount = (pi.amount / 100).toFixed(2);
      const currencyLower = String(option.totalCurrency || "usd").toLowerCase();

      // Atomically consume one promo slot BEFORE we touch Duffel or write a
      // fallback row. If maxUses has just been reached by a concurrent
      // booking, abort cleanly and roll back the booking-status claim — the
      // guest can retry without their option being permanently locked.
      if (appliedPromo) {
        const consumed = await storage.incrementPromoUsage(appliedPromo.id);
        if (!consumed) {
          await rollbackClaim();
          return res.status(409).json({ message: "Promo code is no longer available (fully redeemed)." });
        }
      }

      // Branch on Duffel balance sufficiency. Any failure here defaults to manual.
      // Admin promos with forceManual always route to manual regardless of
      // balance — same behavior as the authenticated book-direct flow.
      let balanceSufficient = false;
      try {
        balanceSufficient = await isDuffelBalanceSufficient(parseFloat(offer.total_amount), offer.total_currency);
      } catch (e: any) {
        console.warn("[guest-booking] balance check failed; routing to manual:", e?.message || e);
        balanceSufficient = false;
      }
      const forceManualByPromo = !!(appliedPromo?.forceManual);

      const baseUrl = getBaseUrl(req);
      const fromEmail = process.env.SENDGRID_FROM_EMAIL || "hello@travnr.com";

      if (!balanceSufficient || forceManualByPromo) {
        // Reuse the shared manual-fallback helper so guest + logged-in flows
        // stay in sync (creates payment row, in-app notification, admin email).
        const fallbackPayment = await createManualBookingFallback({
          userId: guestUser.id,
          userEmail: contact.email,
          proposalId: null,
          proposalTitle: routeLabel,
          offerId: offer.id,
          fullOffer: offer,
          passengerMappings,
          paidPiAmountCents: pi.amount,
          stripePaymentIntentId: paymentIntentId,
          endpoint: "POST /api/guest-booking/:optionToken/confirm",
        });
        if (appliedPromo) {
          await storage.updatePayment(fallbackPayment.id, { appliedPromoCode: appliedPromo.code }).catch((e) =>
            console.warn("[guest-booking] promo stamp on manual fallback failed:", e?.message || e)
          );
        }

        // Mark the proposal as booked. We do not roll back on a failed write
        // here because the payment + manual-fallback record above already
        // succeeded; a stuck status row is an admin cleanup task only.
        await storage.updateGuestProposalStatus(row.id, "booked").catch((e) =>
          console.error("[guest-booking] CRITICAL: manual fallback queued but failed to mark proposal booked:", e?.message || e)
        );
        bookingComplete = true;

        // Warm holding email to the guest (specific to the guest flow).
        const { subject, html } = buildGuestBookingHoldingEmail({
          firstName: contact.firstName,
          amount: chargedTotalAmount,
          currency: currencyLower,
          routeLabel,
          dateLabel,
        });
        sgMail.send({ to: contact.email, from: { email: fromEmail, name: "Travnr" }, subject, html })
          .catch((e) => console.error("[guest-booking] holding email failed:", e));

        return res.json({ status: "pending_manual" });
      }

      // ---- AUTO PATH: book on Duffel using balance ----
      const order = await duffel.orders.create({
        selected_offers: [offer.id],
        passengers: passengerMappings,
        type: "instant",
        payments: [{
          type: "balance" as const,
          amount: offer.total_amount,
          currency: offer.total_currency,
        }],
        metadata: { stripe_payment_intent_id: paymentIntentId, source: "guest_booking" },
      } as any);
      const orderData = order.data as any;

      const payment = await storage.createPayment({
        userId: guestUser.id,
        proposalId: null,
        stripePaymentIntentId: paymentIntentId,
        duffelOrderId: orderData.id,
        duffelBookingRef: orderData.booking_reference,
        amount: chargedTotalAmount,
        currency: currencyLower,
        status: "paid",
        appliedPromoCode: appliedPromo?.code ?? null,
      });

      // Payment + Duffel order have succeeded; a failed status write is an
      // admin cleanup task, not a financial issue. Do not roll back here.
      await storage.updateGuestProposalStatus(row.id, "booked").catch((e) =>
        console.error(`[guest-booking] order ${orderData.id} booked but failed to mark proposal booked:`, e?.message || e)
      );
      bookingComplete = true;

      // Calendar entries linked to the placeholder user so they appear after signup.
      await createCalendarEntriesFromOrder({
        userId: guestUser.id,
        paymentId: payment.id,
        proposalId: null,
        orderData,
      }).catch((e) => console.warn("[guest-booking] calendar entry failed:", e?.message || e));

      // Confirmation email with pre-filled signup CTA. We include
      // `claim=<verificationToken>` for any unverified placeholder (whether
      // freshly created or one left over from a prior guest booking) so the
      // CTA is never broken when the same email books twice. The token is
      // only ever mailed to that email's owner, and verified accounts never
      // receive a claim link — they just log in.
      const claimQuery = !guestUser.emailVerified && (guestUser as any).verificationToken
        ? `&claim=${encodeURIComponent((guestUser as any).verificationToken)}`
        : "";
      const signupUrl = `${baseUrl}/auth?mode=register&email=${encodeURIComponent(contact.email)}&name=${encodeURIComponent(`${contact.firstName} ${contact.lastName}`.trim())}&phone=${encodeURIComponent(contact.phone)}${claimQuery}`;
      const { subject, html } = buildGuestBookingConfirmationEmail({
        firstName: contact.firstName,
        bookingReference: orderData.booking_reference,
        amount: chargedTotalAmount,
        currency: currencyLower,
        routeLabel,
        dateLabel,
        carrierName,
        signupUrl,
      });
      sgMail.send({ to: contact.email, from: { email: fromEmail, name: "Travnr" }, subject, html })
        .catch((e) => console.error("[guest-booking] confirmation email failed:", e));

      return res.json({
        status: "confirmed",
        bookingRef: orderData.booking_reference,
        orderId: orderData.id,
      });
    } catch (err: any) {
      console.error("[guest-booking] confirm error:", err?.errors || err);
      // If we had claimed the proposal but never reached terminal state,
      // restore the prior status so the guest (or admin) can retry without
      // a permanent lock. We swallow rollback errors — they would only mask
      // the original failure.
      if (!bookingComplete && claimedRowId != null && claimPriorStatus != null) {
        await storage.updateGuestProposalStatus(claimedRowId, claimPriorStatus).catch((e) =>
          console.warn("[guest-booking] outer rollback failed:", e?.message || e)
        );
      }
      const duffelErr = err?.errors?.[0];
      const errMessage = duffelErr
        ? `${duffelErr.title ? duffelErr.title + ": " : ""}${duffelErr.message || "Booking failed"}`
        : err.message || "Booking failed";
      return res.status(500).json({ message: errMessage });
    }
  });

  // CALLBACK REQUEST (public)
  app.post("/api/callback-request", callbackLimiter, async (req: Request, res: Response) => {
    const parsed = callbackBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0]?.message || "Phone and email are required" });
    }
    const cb = await storage.createCallbackRequest(parsed.data);

    if (cb.phone && cb.email) {
      await storage.upsertPhoneEmailMap(cb.phone, cb.email).catch((e) =>
        console.warn("[phone-email-map] upsert from callback failed:", e?.message || e)
      );
    }

    if (bland.isConfigured() && cb.phone) {
      try {
        const baseUrl = getBaseUrl(req);
        const task = bland.buildTravelConciergePrompt({
          userName: cb.name || "there",
          destination: "your ideal destination",
          tripType: "both",
          notes: "This is a new visitor requesting a callback from the website. Learn about their travel needs and preferences.",
          email: cb.email || null,
        });
        // Note: no bland_call row is pre-created for callback-request, so dispatch failures
        // are logged only — no DB row to mark failed (out of task scope).

        const result = await bland.dispatchCall({
          phoneNumber: cb.phone,
          task,
          webhookUrl: `${baseUrl}/api/bland/webhook`,
          metadata: {
            callbackRequestId: cb.id,
            callbackEmail: cb.email,
            callbackName: cb.name,
            source: "landing_page",
          },
          record: true,
        });
        console.log(`Bland AI callback call dispatched: ${result.callId} for callback request ${cb.id}`);
      } catch (err: any) {
        console.error("Bland AI callback dispatch error:", err);
      }
    }

    return res.json(cb);
  });

  // WEBHOOK ENDPOINTS
  app.post("/api/webhooks/call-status", async (req: Request, res: Response) => {
    const { callRequestId, status } = req.body;
    if (!callRequestId || !status) return res.status(400).json({ message: "Missing data" });
    const cr = await storage.getCallRequest(callRequestId);
    if (!cr) return res.status(404).json({ message: "Call request not found" });
    await storage.updateCallRequest(callRequestId, { status });
    await storage.createNotification({
      userId: cr.userId, type: "call_status", title: `Call ${status}`,
      body: cr.destination ? `Your call request for ${cr.destination} has been ${status}.` : `Your call request has been ${status}.`,
      linkUrl: "/call-history",
    });
    return res.json({ message: "Updated" });
  });

  app.post("/api/webhooks/proposal-created", async (req: Request, res: Response) => {
    const { userId, callRequestId, title, summary, totalEstimate, items } = req.body;
    if (!userId || !title) return res.status(400).json({ message: "Missing data" });
    const proposal = await storage.createProposal({
      userId, callRequestId, title, summary, totalEstimate, status: "sent",
    });
    if (items && Array.isArray(items)) {
      for (const item of items) {
        await storage.createProposalItem({
          proposalId: proposal.id,
          type: item.type,
          description: item.description,
          priceEstimate: item.priceEstimate,
          duffelOfferId: item.duffelOfferId || null,
          duffelOfferData: item.duffelOfferData || null,
        });
      }
    }
    await storage.createNotification({
      userId, type: "new_proposal", title: "New proposal received",
      body: `Your "${title}" proposal is ready for review.`,
      linkUrl: `/proposals/${proposal.id}`,
    });
    return res.json(proposal);
  });

  app.get("/api/stripe/config", async (_req: Request, res: Response) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (err: any) {
      res.json({ publishableKey: null });
    }
  });

  app.post("/api/stripe/create-payment-intent", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { proposalId, itemId, amount: amountOverride, currency: currencyOverride } = req.body;
      if (!proposalId || !itemId) {
        return res.status(400).json({ message: "proposalId and itemId are required" });
      }

      const proposal = await storage.getProposal(proposalId);
      if (!proposal || proposal.userId !== req.session.userId!) {
        return res.status(404).json({ message: "Proposal not found" });
      }

      const items = await storage.getProposalItems(proposalId);
      const selectedItem = items.find(i => i.id === itemId);
      if (!selectedItem) {
        return res.status(400).json({ message: "Item not found" });
      }

      const offerData = selectedItem.duffelOfferData as any;
      const serverAmount = amountOverride ? parseFloat(String(amountOverride)) : parseFloat(offerData?.totalAmount || selectedItem.priceEstimate);
      const serverCurrency = currencyOverride ? String(currencyOverride).toLowerCase() : (offerData?.totalCurrency || "USD").toLowerCase();

      if (!serverAmount || serverAmount <= 0) {
        return res.status(400).json({ message: "Invalid item amount" });
      }

      const stripe = await getUncachableStripeClient();
      const amountInCents = Math.round(serverAmount * 100);
      const fee = applyConvenienceFee(amountInCents);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: fee.totalCents,
        currency: serverCurrency,
        automatic_payment_methods: { enabled: true },
        metadata: {
          userId: req.session.userId!,
          proposalId: String(proposalId),
          itemId: String(itemId),
          original_amount: String(fee.originalCents),
          convenience_fee: String(fee.feeCents),
          convenience_fee_percent: String(CONVENIENCE_FEE_PERCENT),
        },
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      });
    } catch (err: any) {
      console.error("Stripe PaymentIntent error:", err);
      res.status(500).json({ message: err.message || "Failed to create payment" });
    }
  });

  app.post("/api/stripe/confirm-booking", isAuthenticated, async (req: Request, res: Response) => {
    if (!duffel) return res.status(503).json({ message: "Duffel is not configured" });

    try {
      const { paymentIntentId, proposalId, itemId, passengers, overrideOfferId, overrideOfferData } = req.body;
      if (!paymentIntentId || !proposalId || !itemId || !passengers) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const stripe = await getUncachableStripeClient();
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== "succeeded") {
        return res.status(400).json({ message: "Payment not yet confirmed" });
      }

      if (paymentIntent.metadata?.userId !== req.session.userId!) {
        return res.status(403).json({ message: "Payment does not belong to this user" });
      }

      const proposal = await storage.getProposal(proposalId);
      if (!proposal || proposal.userId !== req.session.userId!) {
        return res.status(404).json({ message: "Proposal not found" });
      }

      const items = await storage.getProposalItems(proposalId);
      const selectedItem = items.find(i => i.id === itemId);
      if (!selectedItem || !selectedItem.duffelOfferId) {
        return res.status(400).json({ message: "Selected flight not found" });
      }

      const offerData = overrideOfferData || (selectedItem.duffelOfferData as any);
      const offerId = overrideOfferId || selectedItem.duffelOfferId;

      const expectedAmount = parseFloat(offerData?.totalAmount || selectedItem.priceEstimate);
      const expectedCents = Math.round(expectedAmount * 100);
      const expectedTotalCents = applyConvenienceFee(expectedCents).totalCents;
      if (paymentIntent.amount < expectedTotalCents) {
        return res.status(400).json({ message: "Payment amount insufficient" });
      }
      const expectedCurrency = String(offerData?.totalCurrency || "USD").toLowerCase();
      if (paymentIntent.currency !== expectedCurrency) {
        return res.status(400).json({ message: "Payment currency does not match the flight currency" });
      }

      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ message: "User not found" });

      const offerPassengerIds = offerData?.passengers?.map((p: any) => p.id) || [];
      const passengerMappings = passengers.map((p: any, idx: number) => ({
        id: offerPassengerIds[idx] || undefined,
        given_name: p.givenName,
        family_name: p.familyName,
        born_on: p.bornOn,
        email: user.email,
        phone_number: p.phone,
        title: p.title,
        gender: p.gender,
      }));

      const amount = offerData?.totalAmount || selectedItem.priceEstimate;
      const currency = offerData?.totalCurrency || "USD";

      const order = await duffel.orders.create({
        selected_offers: [offerId],
        passengers: passengerMappings,
        type: "instant",
        payments: [{
          type: "balance" as any,
          amount: String(amount),
          currency,
        }],
      });

      const orderData = order.data as any;

      const chargedTotalCents = paymentIntent.amount;
      const chargedTotalAmount = (chargedTotalCents / 100).toFixed(2);

      const payment = await storage.createPayment({
        userId: req.session.userId!,
        proposalId,
        stripePaymentIntentId: paymentIntentId,
        duffelOrderId: orderData.id,
        duffelBookingRef: orderData.booking_reference,
        amount: chargedTotalAmount,
        currency: (orderData.total_currency || "usd").toLowerCase(),
        status: "paid",
      });

      await storage.updateProposal(proposalId, { status: "approved" });

      await storage.createNotification({
        userId: req.session.userId!,
        type: "payment_confirmed",
        title: "Flight booked!",
        body: `Your flight for "${proposal.title}" has been booked. Reference: ${orderData.booking_reference}`,
        linkUrl: `/proposals/${proposalId}`,
      });

      res.json({
        bookings: [{
          payment,
          bookingReference: orderData.booking_reference,
          orderId: orderData.id,
        }],
      });
    } catch (err: any) {
      console.error("Stripe confirm-booking error:", err?.errors || err);
      const duffelErr = err?.errors?.[0];
      const errMessage = duffelErr
        ? `${duffelErr.title ? duffelErr.title + ": " : ""}${duffelErr.message || "Booking failed"}${duffelErr.code ? ` (${duffelErr.code})` : ""}`
        : err.message || "Booking failed";
      const { paymentIntentId, proposalId: alertProposalId, itemId } = req.body;
      const alertUser = await storage.getUser(req.session.userId!).catch(() => null);
      await sendBookingFailureAlert({
        endpoint: "POST /api/stripe/confirm-booking",
        userId: req.session.userId,
        userEmail: alertUser?.email,
        stripePaymentIntentId: paymentIntentId || null,
        offerId: req.body.overrideOfferId || itemId,
        proposalId: alertProposalId || null,
        error: err,
      });
      res.status(500).json({ message: errMessage });
    }
  });

  return httpServer;
}
