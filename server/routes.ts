import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { randomBytes } from "crypto";
import sgMail from "@sendgrid/mail";
import { z } from "zod";
import { Duffel } from "@duffel/api";
import * as bland from "./lib/bland";
import { getUncachableStripeClient, getStripePublishableKey } from "./lib/stripeClient";

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
  const verifyUrl = `${baseUrl}/api/auth/verify?token=${token}`;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || "hello@travnr.com";

  try {
    await sgMail.send({
      to: email,
      from: { email: fromEmail, name: "Travnr" },
      subject: "Verify your Travnr email",
      html: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #2d7abf; font-size: 28px; margin: 0;">Travnr</h1>
          </div>
          <h2 style="font-size: 22px; color: #1a1a2e; margin-bottom: 16px;">Verify your email</h2>
          <p style="color: #555; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
            Thanks for signing up for Travnr! Click the button below to verify your email address and get started.
          </p>
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${verifyUrl}" style="background-color: #2d7abf; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">Verify My Email</a>
          </div>
          <p style="color: #999; font-size: 13px; line-height: 1.5;">
            If you didn't create a Travnr account, you can safely ignore this email.
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error("SendGrid error:", error);
  }
}

async function sendPasswordResetEmail(email: string, token: string, baseUrl: string) {
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || "hello@travnr.com";

  try {
    await sgMail.send({
      to: email,
      from: { email: fromEmail, name: "Travnr" },
      subject: "Reset your Travnr password",
      html: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #2d7abf; font-size: 28px; margin: 0;">Travnr</h1>
          </div>
          <h2 style="font-size: 22px; color: #1a1a2e; margin-bottom: 16px;">Reset your password</h2>
          <p style="color: #555; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
            We received a request to reset your password. Click the button below to choose a new password. This link will expire in 1 hour.
          </p>
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${resetUrl}" style="background-color: #2d7abf; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">Reset My Password</a>
          </div>
          <p style="color: #999; font-size: 13px; line-height: 1.5;">
            If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error("SendGrid password reset email error:", error);
  }
}

async function sendAccountCreationEmail(email: string, name: string, callbackRequestId: number, baseUrl: string) {
  const signUpUrl = `${baseUrl}/auth?email=${encodeURIComponent(email)}`;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || "hello@travnr.com";

  try {
    await sgMail.send({
      to: email,
      from: { email: fromEmail, name: "Travnr" },
      subject: "Your Travnr concierge call is complete — create your account",
      html: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #2d7abf; font-size: 28px; margin: 0;">Travnr</h1>
          </div>
          <h2 style="font-size: 22px; color: #1a1a2e; margin-bottom: 16px;">Thanks for chatting with us${name ? `, ${name}` : ""}!</h2>
          <p style="color: #555; font-size: 15px; line-height: 1.6; margin-bottom: 16px;">
            Your concierge call has been completed. We're putting together a personalized travel proposal based on our conversation.
          </p>
          <p style="color: #555; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
            Create your free Travnr account to view your call results, travel proposals, and manage future bookings — all in one place.
          </p>
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${signUpUrl}" style="background-color: #2d7abf; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">Create My Account</a>
          </div>
          <p style="color: #999; font-size: 13px; line-height: 1.5;">
            If you didn't request a concierge call from Travnr, you can safely ignore this email.
          </p>
        </div>
      `,
    });
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

  const duffelErrors = error?.errors;
  const errorDetail = duffelErrors
    ? duffelErrors.map((e: any) =>
        `<li><strong>${e.title || "Error"}</strong>: ${e.message || ""}${e.code ? ` (code: ${e.code})` : ""}${e.type ? ` [type: ${e.type}]` : ""}</li>`
      ).join("")
    : `<li>${error?.message || String(error)}</li>`;

  const timestamp = new Date().toISOString();

  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px;">
      <div style="background: #dc2626; color: white; padding: 16px 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0; font-size: 18px;">Duffel Booking Failure Alert</h2>
        <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.85;">${timestamp}</p>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 6px 0; color: #6b7280; width: 160px;">Endpoint</td><td style="padding: 6px 0; font-family: monospace;">${endpoint}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">User ID</td><td style="padding: 6px 0; font-family: monospace;">${userId || "—"}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">User Email</td><td style="padding: 6px 0;">${userEmail || "—"}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Stripe PI</td><td style="padding: 6px 0; font-family: monospace;">${stripePaymentIntentId || "—"}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Duffel Offer ID</td><td style="padding: 6px 0; font-family: monospace;">${offerId || "—"}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Proposal ID</td><td style="padding: 6px 0;">${proposalId ?? "—"}</td></tr>
        </table>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
        <h3 style="font-size: 14px; color: #dc2626; margin: 0 0 8px;">Error Details</h3>
        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #1f2937; line-height: 1.7;">${errorDetail}</ul>
        ${stripePaymentIntentId ? `<div style="margin-top: 16px; padding: 12px; background: #fef3c7; border-radius: 6px; font-size: 13px; color: #92400e;"><strong>Note:</strong> Stripe payment was charged (PI: ${stripePaymentIntentId}). Customer may need to be refunded if booking cannot be completed.</div>` : ""}
      </div>
    </div>
  `;

  try {
    await sgMail.send({
      to: ADMIN_ALERT_EMAILS,
      from: { email: fromEmail, name: "Travnr Alerts" },
      subject: `[ACTION REQUIRED] Duffel booking failed — ${userEmail || userId || "unknown user"}`,
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
  const { endpoint, userId, userEmail, paymentId, stripePaymentIntentId, offerId, proposalId, amount, currency } = context;
  const timestamp = new Date().toISOString();
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px;">
      <div style="background: #b45309; color: white; padding: 16px 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0; font-size: 18px;">Manual Booking Required — Duffel Balance Insufficient</h2>
        <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.85;">${timestamp}</p>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
        <p style="font-size: 14px; color: #1f2937;">A customer payment was successfully captured but the Duffel balance is insufficient to complete the booking automatically. Please log into the admin dashboard to complete this booking manually.</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 6px 0; color: #6b7280; width: 160px;">Endpoint</td><td style="padding: 6px 0; font-family: monospace;">${endpoint}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Payment ID</td><td style="padding: 6px 0; font-family: monospace;">${paymentId}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">User</td><td style="padding: 6px 0;">${userEmail || userId}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Amount Charged</td><td style="padding: 6px 0;"><strong>${currency.toUpperCase()} ${amount}</strong></td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Stripe PI</td><td style="padding: 6px 0; font-family: monospace;">${stripePaymentIntentId || "—"}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Duffel Offer ID</td><td style="padding: 6px 0; font-family: monospace;">${offerId || "—"}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Proposal ID</td><td style="padding: 6px 0;">${proposalId ?? "—"}</td></tr>
        </table>
      </div>
    </div>
  `;
  try {
    await sgMail.send({
      to: ADMIN_ALERT_EMAILS,
      from: { email: fromEmail, name: "Travnr Alerts" },
      subject: `[MANUAL BOOKING] ${currency.toUpperCase()} ${amount} — ${userEmail || userId}`,
      html,
    });
  } catch (mailErr) {
    console.error("Failed to send manual booking alert email:", mailErr);
  }
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
  const slices = data.slices || [];
  const firstSlice = slices[0];
  const lastSlice = slices[slices.length - 1] || firstSlice;
  const routeLabel = firstSlice
    ? `${firstSlice.origin?.iata || firstSlice.origin?.city || ""} → ${(slices.length > 1 ? lastSlice?.destination?.iata || lastSlice?.destination?.city : firstSlice.destination?.iata || firstSlice.destination?.city) || ""}`
    : "your trip";
  const dateLabel = firstSlice?.departingAt ? new Date(firstSlice.departingAt).toLocaleDateString([], { dateStyle: "long" } as any) : "your selected date";

  const slicesHtml = slices.map((s) => {
    const dep = s.departingAt ? new Date(s.departingAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "—";
    const arr = s.arrivingAt ? new Date(s.arrivingAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "—";
    const flightLabel = [s.carrierIata, s.flightNumber].filter(Boolean).join("");
    const carrier = s.carrierName ? `${s.carrierName}${flightLabel ? ` · Flight ${flightLabel}` : ""}` : (flightLabel ? `Flight ${flightLabel}` : "");
    return `
      <tr>
        <td style="padding:10px 0;color:#1a1a2e;border-bottom:1px solid #f1f1f4;">
          <strong>${s.origin?.iata || ""} ${s.origin?.city || s.origin?.name || ""}</strong>
          → <strong>${s.destination?.iata || ""} ${s.destination?.city || s.destination?.name || ""}</strong><br/>
          ${carrier ? `<span style="color:#1a1a2e;font-size:13px;">${carrier}</span><br/>` : ""}
          <span style="color:#6b7280;font-size:13px;">Depart: ${dep}<br/>Arrive: ${arr}</span>
        </td>
      </tr>`;
  }).join("");

  const paxList = (data.passengers || []).map(p =>
    `<li>${[p.given_name, p.family_name].filter(Boolean).join(" ")}</li>`
  ).join("");

  try {
    await sgMail.send({
      to: toEmail,
      from: { email: fromEmail, name: "Travnr" },
      subject: `Your booking is confirmed — ${routeLabel} on ${dateLabel}`,
      html: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 20px;">
          <div style="text-align:center;margin-bottom:24px;">
            <h1 style="color:#2d7abf;font-size:26px;margin:0;">Travnr</h1>
          </div>
          <h2 style="font-size:20px;color:#1a1a2e;margin:0 0 12px;">Your booking is confirmed${data.firstName ? `, ${data.firstName}` : ""}!</h2>
          <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 16px;">
            We've reserved <strong>${routeLabel}</strong> on <strong>${dateLabel}</strong>. Your booking reference is <strong>${data.bookingReference}</strong>.
          </p>
          <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px 18px;margin-bottom:18px;">
            <h3 style="margin:0 0 8px;font-size:14px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">Itinerary</h3>
            <table style="width:100%;border-collapse:collapse;font-size:14px;">${slicesHtml}</table>
            ${data.cabinClass ? `<p style="margin:10px 0 0;font-size:13px;color:#6b7280;">Cabin: <span style="color:#1a1a2e;text-transform:capitalize;">${String(data.cabinClass).replace(/_/g, " ")}</span></p>` : ""}
          </div>
          ${paxList ? `<div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px 18px;margin-bottom:18px;"><h3 style="margin:0 0 8px;font-size:14px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">Passengers</h3><ul style="margin:0;padding-left:20px;color:#1a1a2e;">${paxList}</ul></div>` : ""}
          <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px 18px;margin-bottom:18px;">
            <h3 style="margin:0 0 8px;font-size:14px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">Total Charged</h3>
            <p style="margin:0;font-size:18px;font-weight:600;color:#1a1a2e;">${Number(data.amount).toLocaleString()} ${(data.currency || "USD").toUpperCase()}</p>
          </div>
          <div style="text-align:center;margin:24px 0;">
            <a href="${dashboardUrl}" style="display:inline-block;background:#2d7abf;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">View on your dashboard</a>
          </div>
          <p style="color:#555;font-size:14px;line-height:1.6;">
            Need to make a change? Reply to this email and we'll take care of it.
          </p>
          <p style="color:#1a1a2e;font-size:14px;line-height:1.6;margin-top:24px;">Safe travels,<br/>The Travnr team</p>
          <p style="color:#999;font-size:12px;margin-top:16px;">Travnr · hello@travnr.com</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Failed to send booking confirmation email:", err);
  }
}

async function sendRefundRequestEmails(args: {
  user: { email: string; firstName?: string; lastName?: string };
  payment: { id: number; amount: string | number; currency: string; duffelBookingRef?: string | null; duffelOrderId?: string | null };
  reason: string;
}) {
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || "hello@travnr.com";
  const { user, payment, reason } = args;
  const amountLine = `${Number(payment.amount).toLocaleString()} ${(payment.currency || "USD").toUpperCase()}`;

  const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
  const safeReason = escapeHtml(reason || "");

  const adminHtml = `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 20px;">
      <div style="background:#f59e0b;color:white;padding:16px 20px;border-radius:8px 8px 0 0;">
        <h2 style="margin:0;font-size:18px;">Refund Request</h2>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:none;padding:20px;border-radius:0 0 8px 8px;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:6px 0;color:#6b7280;width:160px;">Customer</td><td>${[user.firstName, user.lastName].filter(Boolean).join(" ")} (${user.email})</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Payment ID</td><td>#${payment.id}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Amount</td><td>${amountLine}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Booking Ref</td><td style="font-family:monospace;">${payment.duffelBookingRef || "—"}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Duffel Order ID</td><td style="font-family:monospace;">${payment.duffelOrderId || "—"}</td></tr>
        </table>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />
        <h3 style="font-size:14px;color:#1a1a2e;margin:0 0 8px;">Reason</h3>
        <p style="margin:0;font-size:14px;color:#1f2937;line-height:1.6;white-space:pre-wrap;">${safeReason || "(none provided)"}</p>
      </div>
    </div>`;

  const userHtml = `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 20px;">
      <div style="text-align:center;margin-bottom:24px;"><h1 style="color:#2d7abf;font-size:26px;margin:0;">Travnr</h1></div>
      <h2 style="font-size:20px;color:#1a1a2e;margin:0 0 12px;">We received your refund request</h2>
      <p style="color:#555;font-size:15px;line-height:1.6;">
        Thanks${user.firstName ? `, ${user.firstName}` : ""}. Your refund request for booking
        ${payment.duffelBookingRef ? `<strong>${payment.duffelBookingRef}</strong>` : `payment #${payment.id}`}
        (${amountLine}) has been received. A member of our team will reply within one business day.
      </p>
      <p style="color:#999;font-size:12px;margin-top:24px;">Travnr · hello@travnr.com</p>
    </div>`;

  try {
    await sgMail.send({
      to: ["hello@travnr.com"],
      from: { email: fromEmail, name: "Travnr Refunds" },
      replyTo: user.email,
      subject: `Refund request — ${user.email} — ${amountLine}`,
      html: adminHtml,
    });
  } catch (err) {
    console.error("Failed to send refund admin email:", err);
  }
  try {
    await sgMail.send({
      to: user.email,
      from: { email: fromEmail, name: "Travnr" },
      subject: "We received your refund request",
      html: userHtml,
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

  // AUTH ROUTES
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid input" });
      }
      const { email, password, firstName, lastName } = parsed.data;
      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ message: "Email already registered" });
      }
      const hashedPassword = await bcrypt.hash(password, 12);
      const verificationToken = randomBytes(32).toString("hex");
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        verificationToken,
      });
      await sendVerificationEmail(email, verificationToken, getBaseUrl(req));

      const callbackReqs = await storage.getCallbackRequestsByEmail(email);
      if (callbackReqs.length > 0) {
        const cb = callbackReqs[0];
        if (cb.phone) {
          await storage.upsertProfile(user.id, {
            name: `${firstName} ${lastName}`,
            phone: cb.phone,
          });
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

  app.post("/api/auth/login", async (req: Request, res: Response) => {
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

  app.post("/api/auth/resend-verification", async (req: Request, res: Response) => {
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

  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
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

  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
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
    return res.json({ ...proposal, items, payments: proposalPayments });
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
      const bookedPayments = pymts.filter(p => p.duffelOrderId && p.status === "paid");

      const trips = await Promise.all(
        bookedPayments.map(async (payment) => {
          let orderData = null;
          if (duffel && payment.duffelOrderId) {
            try {
              const order = await duffel.orders.get(payment.duffelOrderId);
              orderData = order.data;
            } catch (err: any) {
              console.warn(`Failed to fetch Duffel order ${payment.duffelOrderId}:`, err.message);
            }
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
    if (proposal.status !== "approved") {
      return res.status(400).json({ message: "Proposal must be approved before booking" });
    }

    try {
      const items = await storage.getProposalItems(proposalId);
      const flightItems = items.filter((i) => i.duffelOfferId && i.duffelOfferData);

      if (flightItems.length === 0) {
        return res.status(400).json({ message: "No Duffel flight offers attached to this proposal" });
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
    return res.json(updated);
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

    return {
      origin: normIata(parsed.origin_iata),
      destination: normIata(parsed.destination_iata),
      departureDate: normDate(parsed.departure_date),
      returnDate: normDate(parsed.return_date),
      passengers: normPax(parsed.passengers),
      cabinClass: normCabin(parsed.cabin_class),
      budget: normBudget(parsed.budget_usd),
    };
  }

  function parseTravelDetailsFromTranscript(transcript: string | null, summary: string | null): {
    origin: string | null;
    destination: string | null;
    departureDate: string | null;
    returnDate: string | null;
    passengers: number;
    cabinClass: string;
    budget: number | null;
    sources?: Record<string, string>;
  } {
    const originalText = [summary, transcript].filter(Boolean).join("\n");
    const text = originalText.toLowerCase();
    if (!text) return { origin: null, destination: null, departureDate: null, returnDate: null, passengers: 1, cabinClass: "economy", budget: null, sources: {} };

    const sources: Record<string, string> = {};

    // Step -1: prefer the structured <TRAVEL_DETAILS> JSON block emitted by the Bland AI
    // agent. This is the most reliable signal because the agent has already confirmed
    // each detail with the traveler in-call, including disambiguating multi-airport cities.
    const structured = parseStructuredTravelBlock(originalText);

    let origin: string | null = structured?.origin ?? null;
    let destination: string | null = structured?.destination ?? null;
    if (origin) sources.origin = "structured_block";
    if (destination) sources.destination = "structured_block";

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

    let departureDate: string | null = structured?.departureDate ?? null;
    let returnDate: string | null = structured?.returnDate ?? null;
    if (departureDate) sources.departureDate = "structured_block";
    if (returnDate) sources.returnDate = "structured_block";

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

    let passengers = structured?.passengers ?? 1;
    if (structured?.passengers) sources.passengers = "structured_block";
    if (!structured?.passengers) {
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
    let cabinClass = structured?.cabinClass ?? "economy";
    if (structured?.cabinClass) sources.cabinClass = "structured_block";
    if (!structured?.cabinClass) {
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

    let budget: number | null = structured?.budget ?? null;
    if (structured?.budget) sources.budget = "structured_block";
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

    return { origin, destination, departureDate, returnDate, passengers, cabinClass, budget, sources };
  }

  async function generateProposalFromCall(callRequestId: number, userId: string, callSummary: string | null, callTranscript?: string | null) {
    const callRequest = await storage.getCallRequest(callRequestId);
    if (!callRequest) {
      console.log(`generateProposalFromCall: call request ${callRequestId} not found`);
      return;
    }

    if (callRequest.userId !== userId) {
      console.warn(`generateProposalFromCall: user mismatch callRequest.userId=${callRequest.userId} vs userId=${userId}`);
      return;
    }

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

    let transcript = callTranscript ?? null;
    let summary = callSummary;
    if (transcript === null || summary === null) {
      const blandCalls = await storage.getBlandCallsByCallRequest(callRequestId);
      const completedCall = blandCalls?.find(c => c.status === "completed");
      if (transcript === null) transcript = completedCall?.transcript || null;
      if (summary === null) summary = completedCall?.summary || null;
    }

    if (!transcript && !summary) {
      console.log(`generateProposalFromCall: no transcript or summary available yet for call request ${callRequestId}, skipping`);
      return;
    }

    const details = parseTravelDetailsFromTranscript(transcript, summary);
    console.log(`Parsed travel details from transcript for call ${callRequestId}:`, JSON.stringify(details));

    // Surface ambiguity so we can monitor parser accuracy: if the destination/origin
    // came from regex (not the structured block) AND matches a multi-airport city, log it.
    const checkAmbiguity = (label: string, value: string | null, source: string | undefined) => {
      if (!value || source === "structured_block") return;
      // Skip pure IATA codes (3 uppercase letters) — they're already disambiguated
      if (/^[A-Z]{3}$/.test(value)) return;
      const { ambiguous, options } = isAmbiguousCity(value);
      if (ambiguous) {
        console.warn(`[post-call ${callRequestId}] AMBIGUOUS_${label.toUpperCase()}: parsed "${value}" maps to multiple airports ${options.length ? `(${options.join("/")})` : "(many cities/airports)"} and was not confirmed in <TRAVEL_DETAILS> block. Source=${source}.`);
      }
    };
    checkAmbiguity("destination", details.destination, details.sources?.destination);
    checkAmbiguity("origin", details.origin, details.sources?.origin);

    if (!details.sources?.destination || details.sources.destination !== "structured_block") {
      console.warn(`[post-call ${callRequestId}] PARSE_ACCURACY: destination not from structured block (source=${details.sources?.destination ?? "none"}). Bland AI may have failed to emit a <TRAVEL_DETAILS> block.`);
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
      async function resolveAirport(query: string, preferUS: boolean): Promise<{code: string, name: string} | null> {
        try {
          // If the query is already an IATA code (3 uppercase letters), look up the full name via Duffel
          if (/^[A-Z]{3}$/.test(query)) {
            try {
              const lookupRes = await duffel!.suggestions.list({ query });
              const match = (lookupRes.data || []).find((p: any) => p.iata_code === query);
              if (match) return { code: query, name: match.city_name || match.name || query };
            } catch (e: any) {
              console.warn(`[post-call ${callRequestId}] Duffel suggestions.list threw for IATA "${query}":`, e?.message || e);
            }
            return { code: query, name: query };
          }
          const res = await duffel!.suggestions.list({ query });
          const places = res.data || [];
          if (places.length === 0) {
            console.warn(`[post-call ${callRequestId}] Duffel suggestions returned 0 places for query="${query}"`);
            return null;
          }

          if (preferUS) {
            const usAirport = places.find((p: any) => p.type === "airport" && p.iata_country_code === "US");
            if (usAirport?.iata_code) return { code: usAirport.iata_code, name: usAirport.city_name || usAirport.name || query };

            try {
              const usRes = await duffel!.suggestions.list({ query: query + " USA" });
              const usPlaces = usRes.data || [];
              const usAp = usPlaces.find((p: any) => p.type === "airport") || usPlaces[0];
              if (usAp?.iata_code) return { code: usAp.iata_code, name: usAp.city_name || usAp.name || query };
            } catch (e: any) {
              console.warn(`[post-call ${callRequestId}] Duffel suggestions.list threw for "${query} USA":`, e?.message || e);
            }
          }

          const airport = places.find((p: any) => p.type === "airport") || places[0];
          return airport?.iata_code ? { code: airport.iata_code, name: airport.city_name || airport.name || query } : null;
        } catch (e: any) {
          console.warn(`[post-call ${callRequestId}] Duffel suggestions.list threw for query="${query}":`, e?.message || e);
          return null;
        }
      }

      const callReqForPhone = callRequest as any;
      const userPhone = callReqForPhone.phone || callReqForPhone.phoneNumber || "";
      const isUSUser = userPhone.startsWith("+1") || userPhone.startsWith("1");
      console.log(`[post-call ${callRequestId}] resolved isUSUser=${isUSUser} from phone="${userPhone}"`);

      const destResult = await resolveAirport(details.destination, isUSUser);
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
        const originResult = await resolveAirport(details.origin, isUSUser);
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
          const originResult = await resolveAirport(details.origin, isUSUser);
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

      await storage.createNotification({
        userId,
        type: "proposal_received",
        title: "New travel proposal ready",
        body: `Based on your concierge call, we've prepared a flight proposal for your trip to ${destName}.`,
        linkUrl: `/proposals/${proposal.id}`,
      });

      console.log(`Auto-generated proposal ${proposal.id} with ${topOffers.length} offers from call request ${callRequestId}`);
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
      const task = bland.buildTravelConciergePrompt({ userName: "there" });

      return res.status(200).json({
        task,
        voice: "mason",
        language: "eng",
        max_duration: 15,
        model: "enhanced",
        record: true,
        wait_for_greeting: true,
        webhook: `${baseUrl}/api/bland/webhook`,
        webhook_events: ["call.ended"],
        dynamic_data: [{
          url: `${baseUrl}/api/bland/dynamic-data`,
          method: "POST",
          headers: { "x-bland-secret": bland.getWebhookSecret() },
          cache: false,
          response_data: [
            { name: "traveler_info", data: "$.traveler_info", context: "Traveler information: {{traveler_info}}" },
            { name: "booking_info", data: "$.booking_info", context: "Booking information: {{booking_info}}" },
            { name: "proposal_info", data: "$.proposal_info", context: "Proposal information: {{proposal_info}}" },
          ],
        }],
      });
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

      if (!blandCall) {
        console.warn(`No matching bland_call found for bland_call_id=${blandCallId}`);
        return res.json({ received: true });
      }

      const updateData: any = {};

      if (payload.status === "completed" || payload.event === "call.ended") {
        updateData.status = "completed";
        updateData.endedAt = new Date();
        if (payload.call_length) updateData.duration = parseInt(payload.call_length);
        if (payload.concatenated_transcript) updateData.transcript = payload.concatenated_transcript;
        if (payload.transcript) updateData.transcriptJson = payload.transcript;
        if (payload.recording_url) updateData.recordingUrl = payload.recording_url;
        if (payload.summary) updateData.summary = payload.summary;
        if (payload.variables) updateData.variables = payload.variables;

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

      if (
        blandCall.callRequestId &&
        duffel &&
        updateData.status === "completed" &&
        (updateData.transcript || updateData.summary)
      ) {
        generateProposalFromCall(
          blandCall.callRequestId,
          blandCall.userId,
          updateData.summary || null,
          updateData.transcript || null
        ).catch((err) => {
          console.error("Auto-proposal generation error:", err);
        });
      }

      return res.json({ received: true });
    } catch (err: any) {
      console.error("Bland webhook processing error:", err);
      return res.json({ received: true });
    }
  });

  app.post("/api/bland/dynamic-data", async (req: Request, res: Response) => {
    try {
      const secret = req.headers["x-bland-secret"] as string;
      const expectedSecret = bland.getWebhookSecret();
      if (!secret || (secret !== expectedSecret && secret !== process.env.BLAND_AI_API_KEY)) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { phone_number, call_id } = req.body;

      let userId: string | null = null;

      if (call_id) {
        const blandCall = await storage.getBlandCallByBlandId(call_id);
        if (blandCall) userId = blandCall.userId;
      }

      let travelerInfo = "No traveler profile found.";
      let bookingInfo = "No recent bookings.";
      let proposalInfo = "No active proposals.";

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
      }

      return res.json({
        traveler_info: travelerInfo,
        booking_info: bookingInfo,
        proposal_info: proposalInfo,
      });
    } catch (err: any) {
      console.error("Bland dynamic data error:", err);
      return res.json({
        traveler_info: "Error loading profile.",
        booking_info: "Error loading bookings.",
        proposal_info: "Error loading proposals.",
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

  // CALLBACK REQUEST (public)
  app.post("/api/callback-request", async (req: Request, res: Response) => {
    const parsed = callbackBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0]?.message || "Phone and email are required" });
    }
    const cb = await storage.createCallbackRequest(parsed.data);

    if (bland.isConfigured() && cb.phone) {
      try {
        const baseUrl = getBaseUrl(req);
        const task = bland.buildTravelConciergePrompt({
          userName: cb.name || "there",
          destination: "your ideal destination",
          tripType: "both",
          notes: "This is a new visitor requesting a callback from the website. Learn about their travel needs and preferences.",
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
