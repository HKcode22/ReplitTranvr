import { sql, relations } from "drizzle-orm";
import {
  pgTable, pgSchema, text, varchar, boolean, timestamp, serial, numeric, real, jsonb, index, uniqueIndex, pgEnum, integer, bigint, doublePrecision, uuid, smallint
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const systemSettings = pgTable("system_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const promoCodes = pgTable("promo_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  description: text("description"),
  overrideAmountCents: integer("override_amount_cents").notNull(),
  forceManual: boolean("force_manual").default(false).notNull(),
  adminOnly: boolean("admin_only").default(true).notNull(),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").default(0).notNull(),
  expiresAt: timestamp("expires_at"),
  active: boolean("active").default(true).notNull(),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tripTypeEnum = pgEnum("trip_type", ["flight", "hotel", "both"]);
export const callStatusEnum = pgEnum("call_status", ["requested", "scheduled", "completed", "cancelled"]);
export const proposalStatusEnum = pgEnum("proposal_status", ["draft", "sent", "approved", "rejected"]);
export const proposalItemTypeEnum = pgEnum("proposal_item_type", ["flight", "hotel", "other"]);
export const paymentStatusEnum = pgEnum("payment_status", ["unpaid", "processing", "paid", "failed", "pending_manual"]);

export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  profileImageUrl: text("profile_image_url"),
  emailVerified: boolean("email_verified").default(false).notNull(),
  verificationToken: text("verification_token"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  sid: varchar("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
}, (table) => [index("IDX_session_expire").on(table.expire)]);

export const travelerProfiles = pgTable("traveler_profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  name: text("name"),
  phone: text("phone"),
  homeAirport: text("home_airport"),
  passportCountry: text("passport_country"),
  dateOfBirth: text("date_of_birth"),
  gender: text("gender"),
  title: text("title"),
  passportNumber: text("passport_number"),
  nationality: text("nationality"),
  seatPreference: text("seat_preference"),
  hotelPreference: text("hotel_preference"),
  dietaryNotes: text("dietary_notes"),
  budgetRange: text("budget_range"),
  loyaltyPrograms: text("loyalty_programs"),
  notes: text("notes"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const savedCards = pgTable("saved_cards", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  cardBrand: text("card_brand").notNull(),
  lastFour: text("last_four").notNull(),
  expiryMonth: text("expiry_month").notNull(),
  expiryYear: text("expiry_year").notNull(),
  cardholderName: text("cardholder_name").notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const callRequests = pgTable("call_requests", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  tripType: tripTypeEnum("trip_type").notNull(),
  destination: text("destination").default(""),
  phone: text("phone").notNull().default(""),
  dateFrom: text("date_from"),
  dateTo: text("date_to"),
  flexibility: text("flexibility"),
  timeWindow: text("time_window"),
  status: callStatusEnum("status").default("requested").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const itineraryProposals = pgTable("itinerary_proposals", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  callRequestId: serial("call_request_id").references(() => callRequests.id),
  title: text("title").notNull(),
  summary: text("summary"),
  totalEstimate: numeric("total_estimate", { precision: 10, scale: 2 }).notNull(),
  status: proposalStatusEnum("status").default("sent").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const proposalItems = pgTable("proposal_items", {
  id: serial("id").primaryKey(),
  proposalId: integer("proposal_id").notNull().references(() => itineraryProposals.id),
  type: proposalItemTypeEnum("type").notNull(),
  description: text("description").notNull(),
  priceEstimate: numeric("price_estimate", { precision: 10, scale: 2 }).notNull(),
  duffelOfferId: text("duffel_offer_id"),
  duffelOfferData: jsonb("duffel_offer_data"),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  linkUrl: text("link_url"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  proposalId: integer("proposal_id").references(() => itineraryProposals.id),
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  duffelOrderId: text("duffel_order_id"),
  duffelBookingRef: text("duffel_booking_ref"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("usd").notNull(),
  status: paymentStatusEnum("status").default("unpaid").notNull(),
  refundStatus: text("refund_status"),
  refundRequestedAt: timestamp("refund_requested_at"),
  refundReason: text("refund_reason"),
  manualBookingDetails: jsonb("manual_booking_details"),
  manualBookingResolvedAt: timestamp("manual_booking_resolved_at"),
  manualBookingResolvedBy: varchar("manual_booking_resolved_by", { length: 36 }).references(() => users.id),
  manualBookingNotes: text("manual_booking_notes"),
  appliedPromoCode: text("applied_promo_code"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tripRequestTypeEnum = pgEnum("trip_request_type", ["refund", "cancel", "change"]);
export const tripRequestSourceEnum = pgEnum("trip_request_source", ["account", "guest"]);

export const tripRequests = pgTable("trip_requests", {
  id: serial("id").primaryKey(),
  paymentId: integer("payment_id").notNull().references(() => payments.id),
  userId: varchar("user_id", { length: 36 }).references(() => users.id),
  type: tripRequestTypeEnum("type").notNull(),
  source: tripRequestSourceEnum("source").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("trip_requests_payment_id_idx").on(table.paymentId),
]);

export const calendarEntries = pgTable("calendar_entries", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  paymentId: integer("payment_id").references(() => payments.id),
  proposalId: integer("proposal_id").references(() => itineraryProposals.id),
  entryType: text("entry_type").notNull(),
  date: text("date").notNull(),
  label: text("label").notNull(),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const blandCallStatusEnum = pgEnum("bland_call_status", ["queued", "ringing", "in_progress", "completed", "failed", "no_answer"]);

export const blandCalls = pgTable("bland_calls", {
  id: serial("id").primaryKey(),
  callRequestId: integer("call_request_id").references(() => callRequests.id),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  blandCallId: text("bland_call_id"),
  phoneNumber: text("phone_number").notNull(),
  status: blandCallStatusEnum("status").default("queued").notNull(),
  duration: integer("duration"),
  transcript: text("transcript"),
  transcriptJson: jsonb("transcript_json"),
  recordingUrl: text("recording_url"),
  summary: text("summary"),
  variables: jsonb("variables"),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const callbackRequests = pgTable("callback_requests", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default(""),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  status: text("status").default("pending"),
  blandCallId: text("bland_call_id"),
  transcript: text("transcript"),
  summary: text("summary"),
  recordingUrl: text("recording_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const phoneEmailMap = pgTable("phone_email_map", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull().unique(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const guestProposals = pgTable("guest_proposals", {
  id: serial("id").primaryKey(),
  token: varchar("token").notNull().unique().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  originIata: text("origin_iata").notNull(),
  destinationIata: text("destination_iata").notNull(),
  departureDate: text("departure_date").notNull(),
  returnDate: text("return_date"),
  passengers: integer("passengers").default(1).notNull(),
  cabinClass: text("cabin_class").default("economy").notNull(),
  proposalData: jsonb("proposal_data").notNull(),
  status: text("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

// =====================================================================
// Hotels (Phase 2 — persistence only). Provider-agnostic hotel search,
// option storage, and booking record. Wired only from the admin test
// endpoint at this stage; the post-call hotel-search hook is Phase 4 and
// the booking flow is Phase 5. All tables are additive — no existing
// columns or enums are touched. `tripTypeEnum` and `proposalItemTypeEnum`
// already include "hotel" from earlier work, so no enum migration here.
// =====================================================================

export const hotelSearches = pgTable("hotel_searches", {
  id: serial("id").primaryKey(),
  // Nullable: inbound guest flow has no user yet at search time.
  userId: varchar("user_id", { length: 36 }).references(() => users.id),
  callRequestId: integer("call_request_id").references(() => callRequests.id),
  proposalId: integer("proposal_id").references(() => itineraryProposals.id),
  provider: text("provider").notNull(),
  // Full normalized HotelSearchRequest. Provider-agnostic shape.
  request: jsonb("request").notNull(),
  // pending | completed | failed | partial
  status: text("status").default("pending").notNull(),
  errorMessage: text("error_message"),
  // Provider payload truncated to first 2000 chars for debugging only.
  // Full payloads (when needed) live on hotel_options.source_raw_payload.
  rawProviderPayloadTruncated: text("raw_provider_payload_truncated"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const hotelOptions = pgTable("hotel_options", {
  id: serial("id").primaryKey(),
  searchId: integer("search_id").notNull().references(() => hotelSearches.id),
  provider: text("provider").notNull(),
  providerHotelId: text("provider_hotel_id").notNull(),
  providerRateId: text("provider_rate_id"),
  name: text("name").notNull(),
  address: text("address"),
  neighborhood: text("neighborhood"),
  latitude: numeric("latitude", { precision: 9, scale: 6 }),
  longitude: numeric("longitude", { precision: 9, scale: 6 }),
  starRating: numeric("star_rating", { precision: 2, scale: 1 }),
  guestRating: numeric("guest_rating", { precision: 3, scale: 2 }),
  // String[] of image URLs.
  images: jsonb("images"),
  description: text("description"),
  // String[] of amenity names (provider-specific until Phase 3+ normalizes).
  amenities: jsonb("amenities"),
  roomName: text("room_name"),
  bedType: text("bed_type"),
  boardType: text("board_type"),
  cancellationPolicy: text("cancellation_policy"),
  refundable: boolean("refundable"),
  freeCancellationUntil: timestamp("free_cancellation_until"),
  nightlyPrice: numeric("nightly_price", { precision: 10, scale: 2 }),
  taxesAndFees: numeric("taxes_and_fees", { precision: 10, scale: 2 }),
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 3 }),
  // pay_now | pay_at_property | deposit
  payNowOrLater: text("pay_now_or_later"),
  checkInInstructions: text("check_in_instructions"),
  specialInstructions: text("special_instructions"),
  // ADMIN-ONLY: never returned to non-admin endpoints. Future endpoints
  // that surface options to non-admins must explicitly omit this column.
  sourceRawPayload: jsonb("source_raw_payload"),
  // Populated by the Phase 1 ranking function.
  rankScore: numeric("rank_score", { precision: 5, scale: 2 }),
  // Per-signal debug breakdown of why this option scored where it did.
  rankReasons: jsonb("rank_reasons"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("hotel_options_search_id_idx").on(table.searchId),
]);

export const hotelBookings = pgTable("hotel_bookings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  hotelOptionId: integer("hotel_option_id").notNull().references(() => hotelOptions.id),
  // Nullable until Phase 5 wires the Stripe payment link.
  paymentId: integer("payment_id").references(() => payments.id),
  provider: text("provider").notNull(),
  providerBookingId: text("provider_booking_id"),
  confirmationNumber: text("confirmation_number"),
  // Spec-approved values for Phase 2: pending | confirmed | failed | cancelled.
  // Phase 5 (booking guardrails) will add `manual_fallback` and `dry_run`
  // states; column is free-form text to allow that without another migration.
  status: text("status").default("pending").notNull(),
  // HARD RULE: traveler names + DOB only. NO payment instruments,
  // NO loyalty card numbers, NO government IDs at this layer. PCI lives
  // only in the existing payments table once Phase 5 wires the link.
  travelerDetails: jsonb("traveler_details").notNull(),
  totalCharged: numeric("total_charged", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 3 }),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("hotel_bookings_user_id_idx").on(table.userId),
  index("hotel_bookings_hotel_option_id_idx").on(table.hotelOptionId),
]);

export const hotelSearchesRelations = relations(hotelSearches, ({ one, many }) => ({
  user: one(users, { fields: [hotelSearches.userId], references: [users.id] }),
  callRequest: one(callRequests, { fields: [hotelSearches.callRequestId], references: [callRequests.id] }),
  proposal: one(itineraryProposals, { fields: [hotelSearches.proposalId], references: [itineraryProposals.id] }),
  options: many(hotelOptions),
}));

export const hotelOptionsRelations = relations(hotelOptions, ({ one, many }) => ({
  search: one(hotelSearches, { fields: [hotelOptions.searchId], references: [hotelSearches.id] }),
  bookings: many(hotelBookings),
}));

export const hotelBookingsRelations = relations(hotelBookings, ({ one }) => ({
  user: one(users, { fields: [hotelBookings.userId], references: [users.id] }),
  option: one(hotelOptions, { fields: [hotelBookings.hotelOptionId], references: [hotelOptions.id] }),
  payment: one(payments, { fields: [hotelBookings.paymentId], references: [payments.id] }),
}));

export const savedCardsRelations = relations(savedCards, ({ one }) => ({
  user: one(users, { fields: [savedCards.userId], references: [users.id] }),
}));

export const usersRelations = relations(users, ({ many, one }) => ({
  travelerProfile: one(travelerProfiles, { fields: [users.id], references: [travelerProfiles.userId] }),
  callRequests: many(callRequests),
  proposals: many(itineraryProposals),
  notifications: many(notifications),
  payments: many(payments),
  savedCards: many(savedCards),
}));

export const travelerProfilesRelations = relations(travelerProfiles, ({ one }) => ({
  user: one(users, { fields: [travelerProfiles.userId], references: [users.id] }),
}));

export const blandCallsRelations = relations(blandCalls, ({ one }) => ({
  user: one(users, { fields: [blandCalls.userId], references: [users.id] }),
  callRequest: one(callRequests, { fields: [blandCalls.callRequestId], references: [callRequests.id] }),
}));

export const callRequestsRelations = relations(callRequests, ({ one, many }) => ({
  user: one(users, { fields: [callRequests.userId], references: [users.id] }),
  proposals: many(itineraryProposals),
  blandCalls: many(blandCalls),
}));

export const itineraryProposalsRelations = relations(itineraryProposals, ({ one, many }) => ({
  user: one(users, { fields: [itineraryProposals.userId], references: [users.id] }),
  callRequest: one(callRequests, { fields: [itineraryProposals.callRequestId], references: [callRequests.id] }),
  items: many(proposalItems),
  payments: many(payments),
}));

export const proposalItemsRelations = relations(proposalItems, ({ one }) => ({
  proposal: one(itineraryProposals, { fields: [proposalItems.proposalId], references: [itineraryProposals.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, { fields: [payments.userId], references: [users.id] }),
  proposal: one(itineraryProposals, { fields: [payments.proposalId], references: [itineraryProposals.id] }),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true, createdAt: true, updatedAt: true, emailVerified: true, verificationToken: true, profileImageUrl: true, passwordResetToken: true, passwordResetExpires: true,
});
export const insertTravelerProfileSchema = createInsertSchema(travelerProfiles).omit({ id: true, updatedAt: true });
export const insertCallRequestSchema = createInsertSchema(callRequests).omit({ id: true, createdAt: true, status: true });
export const insertProposalSchema = createInsertSchema(itineraryProposals).omit({ id: true, createdAt: true });
export const insertProposalItemSchema = createInsertSchema(proposalItems).omit({ id: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, readAt: true, createdAt: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true });
export const insertCallbackRequestSchema = createInsertSchema(callbackRequests).omit({ id: true, createdAt: true });
export const insertPhoneEmailMapSchema = createInsertSchema(phoneEmailMap).omit({ id: true, createdAt: true, updatedAt: true });
export const insertGuestProposalSchema = createInsertSchema(guestProposals).omit({ id: true, token: true, createdAt: true });
export const insertSavedCardSchema = createInsertSchema(savedCards).omit({ id: true, createdAt: true });
export const insertBlandCallSchema = createInsertSchema(blandCalls).omit({ id: true, createdAt: true });
export const insertCalendarEntrySchema = createInsertSchema(calendarEntries).omit({ id: true, createdAt: true });
export const insertTripRequestSchema = createInsertSchema(tripRequests).omit({ id: true, createdAt: true });
export const insertPromoCodeSchema = createInsertSchema(promoCodes).omit({ id: true, usedCount: true, createdAt: true, updatedAt: true });
export const insertHotelSearchSchema = createInsertSchema(hotelSearches).omit({ id: true, createdAt: true, completedAt: true });
export const insertHotelOptionSchema = createInsertSchema(hotelOptions).omit({ id: true, createdAt: true });
export const insertHotelBookingSchema = createInsertSchema(hotelBookings).omit({ id: true, createdAt: true, updatedAt: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type TravelerProfile = typeof travelerProfiles.$inferSelect;
export type InsertTravelerProfile = z.infer<typeof insertTravelerProfileSchema>;
export type CallRequest = typeof callRequests.$inferSelect;
export type InsertCallRequest = z.infer<typeof insertCallRequestSchema>;
export type ItineraryProposal = typeof itineraryProposals.$inferSelect;
export type InsertProposal = z.infer<typeof insertProposalSchema>;
export type ProposalItem = typeof proposalItems.$inferSelect;
export type InsertProposalItem = z.infer<typeof insertProposalItemSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type CallbackRequest = typeof callbackRequests.$inferSelect;
export type InsertCallbackRequest = z.infer<typeof insertCallbackRequestSchema>;
export type PhoneEmailMap = typeof phoneEmailMap.$inferSelect;
export type InsertPhoneEmailMap = z.infer<typeof insertPhoneEmailMapSchema>;
export type GuestProposal = typeof guestProposals.$inferSelect;
export type InsertGuestProposal = z.infer<typeof insertGuestProposalSchema>;
export interface GuestProposalOption {
  token: string;
  label: "Best Price" | "Best Value" | "Fastest";
  duffelOfferId: string;
  totalAmount: string;
  totalCurrency: string;
  totalDurationMinutes: number;
  stops: number;
  carrierName?: string | null;
  carrierIata?: string | null;
  carrierLogo?: string | null;
  slices: Array<{
    origin: { iata?: string | null; city?: string | null; name?: string | null };
    destination: { iata?: string | null; city?: string | null; name?: string | null };
    departingAt?: string | null;
    arrivingAt?: string | null;
    durationMinutes: number;
    stops: number;
    segments: Array<{
      carrierName?: string | null;
      carrierIata?: string | null;
      flightNumber?: string | null;
      departingAt?: string | null;
      arrivingAt?: string | null;
      origin?: { iata?: string | null; name?: string | null };
      destination?: { iata?: string | null; name?: string | null };
    }>;
  }>;
  baggage?: string | null;
  refundable?: boolean | null;
  changeable?: boolean | null;
  // Display-ready policy strings, computed server-side. Surface "Contact us
  // for details" when the source provider didn't return structured policy
  // info (e.g. SerpApi/Google Flights offers).
  refundPolicyText?: string | null;
  changePolicyText?: string | null;
  seatSelectionText?: string | null;
  // Raw SerpApi extension strings (e.g. "1 carry-on bag", "Wi-Fi for a fee")
  // — populated only for SerpApi offers, used by the booking page to surface
  // the available amenity info verbatim.
  extensions?: string[] | null;
  // Other near-equivalent flights for the same category (Best Price / Best
  // Value / Fastest), pre-computed at proposal-build time so the guest
  // proposal page can show an instant-expand "See other options" section.
  similarOptions?: GuestProposalOption[];
  isDuffel?: boolean;
  source?: string;
}
export interface GuestProposalData {
  originIata: string;
  originName?: string | null;
  destinationIata: string;
  destinationName?: string | null;
  departureDate: string;
  returnDate?: string | null;
  passengers: number;
  cabinClass: string;
  options: GuestProposalOption[];
}
export type SavedCard = typeof savedCards.$inferSelect;
export type InsertSavedCard = z.infer<typeof insertSavedCardSchema>;
export type BlandCall = typeof blandCalls.$inferSelect;
export type InsertBlandCall = z.infer<typeof insertBlandCallSchema>;
export type TripRequest = typeof tripRequests.$inferSelect;
export type InsertTripRequest = z.infer<typeof insertTripRequestSchema>;
export type CalendarEntry = typeof calendarEntries.$inferSelect;
export interface CalendarEntryDetails {
  bookingRef?: string | null;
  departingAt?: string | null;
  arrivingAt?: string | null;
  origin?: string | null;
  destination?: string | null;
  carrier?: string | null;
  flightNumber?: string | null;
}
export type InsertCalendarEntry = z.infer<typeof insertCalendarEntrySchema>;
export type PromoCode = typeof promoCodes.$inferSelect;
export type InsertPromoCode = z.infer<typeof insertPromoCodeSchema>;
export type HotelSearch = typeof hotelSearches.$inferSelect;
export type InsertHotelSearch = z.infer<typeof insertHotelSearchSchema>;
export type HotelOption = typeof hotelOptions.$inferSelect;
export type InsertHotelOption = z.infer<typeof insertHotelOptionSchema>;
export type HotelBooking = typeof hotelBookings.$inferSelect;
export type InsertHotelBooking = z.infer<typeof insertHotelBookingSchema>;

// =====================================================================
// Agency Disruption Monitoring System (standalone from consumer flow).
// Additive only — no existing table, enum, or relation is modified.
// =====================================================================

export const agencyAccounts = pgTable("agency_accounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  contactEmail: text("contact_email").notNull().unique(),
  contactName: text("contact_name").notNull(),
  password: text("password").notNull(),
  plan: text("plan").default("trial").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const monitoredFlights = pgTable("monitored_flights", {
  id: serial("id").primaryKey(),
  agencyId: integer("agency_id").notNull().references(() => agencyAccounts.id),
  flightNumber: text("flight_number").notNull(),
  carrierIata: text("carrier_iata").notNull(),
  departureDate: text("departure_date").notNull(),
  departureTime: text("departure_time"),
  originIata: text("origin_iata").notNull(),
  destinationIata: text("destination_iata").notNull(),
  riskScore: integer("risk_score").default(0).notNull(),
  riskTier: text("risk_tier").default("green").notNull(),
  lastCheckedAt: timestamp("last_checked_at"),
  redTierFirstAt: timestamp("red_tier_first_at"),
  cancelledAt: timestamp("cancelled_at"),
  tailNumber: text("tail_number"),
  equipmentType: text("equipment_type"),
  isTest: boolean("is_test").default(false).notNull(),
  status: text("status").default("active").notNull(),
  agencyResolvedAt: timestamp("agency_resolved_at"),
  confirmationAlertSentAt: timestamp("confirmation_alert_sent_at"),
  resolvedStatus: text("resolved_status"),
  resolvedDelayMinutes: integer("resolved_delay_minutes"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("monitored_flights_agency_id_idx").on(table.agencyId),
  index("monitored_flights_status_idx").on(table.status),
]);

export const flightTravelers = pgTable("flight_travelers", {
  id: serial("id").primaryKey(),
  monitoredFlightId: integer("monitored_flight_id").notNull().references(() => monitoredFlights.id, { onDelete: "cascade" }),
  agencyId: integer("agency_id").notNull().references(() => agencyAccounts.id),
  travelerName: text("traveler_name").notNull(),
  travelerEmail: text("traveler_email").notNull(),
  travelerPhone: text("traveler_phone"),
  selectionToken: text("selection_token").unique(),
  selectedOptionId: text("selected_option_id"),
  selectedAt: timestamp("selected_at"),
  alertSentAt: timestamp("alert_sent_at"),
  confirmationAlertSentAt: timestamp("confirmation_alert_sent_at"),
  agencyNotifiedAt: timestamp("agency_notified_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("flight_travelers_flight_id_idx").on(table.monitoredFlightId),
  index("flight_travelers_agency_id_idx").on(table.agencyId),
]);

export const healthReports = pgTable("health_reports", {
  id: serial("id").primaryKey(),
  generatedAt: timestamp("generated_at").defaultNow(),
  flightsAnalyzed: integer("flights_analyzed"),
  flightsFlagged: integer("flights_flagged"),
  truePositives: integer("true_positives"),
  falsePositives: integer("false_positives"),
  falseNegatives: integer("false_negatives"),
  trueNegatives: integer("true_negatives"),
  precision: real("precision"),
  recall: real("recall"),
  avgScoreDisrupted: real("avg_score_disrupted"),
  avgScoreOnTime: real("avg_score_on_time"),
  claudeSummary: text("claude_summary"),
  rawData: jsonb("raw_data"),
  requestedByAgencyId: integer("requested_by_agency_id").references(() => agencyAccounts.id),
});

export const riskScoreHistory = pgTable("risk_score_history", {
  id: serial("id").primaryKey(),
  monitoredFlightId: integer("monitored_flight_id").notNull().references(() => monitoredFlights.id),
  score: integer("score").notNull(),
  tier: text("tier").notNull(),
  signals: jsonb("signals").notNull(),
  tailNumber: text("tail_number"),
  equipmentType: text("equipment_type"),
  scoredAt: timestamp("scored_at").defaultNow().notNull(),
}, (table) => [
  index("risk_score_history_flight_id_idx").on(table.monitoredFlightId),
]);

export const disruptionAlternatives = pgTable("disruption_alternatives", {
  id: serial("id").primaryKey(),
  monitoredFlightId: integer("monitored_flight_id").notNull().references(() => monitoredFlights.id),
  flightNumber: text("flight_number").notNull(),
  carrierIata: text("carrier_iata").notNull(),
  carrierName: text("carrier_name"),
  departureTime: text("departure_time").notNull(),
  arrivalTime: text("arrival_time").notNull(),
  durationMinutes: integer("duration_minutes"),
  stops: integer("stops").default(0).notNull(),
  price: text("price"),
  riskScore: integer("risk_score").notNull(),
  riskTier: text("risk_tier").notNull(),
  offerData: jsonb("offer_data"),
  selectionToken: text("selection_token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("disruption_alternatives_flight_id_idx").on(table.monitoredFlightId),
]);

export const userMonitoredFlights = pgTable("user_monitored_flights", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  flightNumber: text("flight_number").notNull(),
  carrierIata: text("carrier_iata").notNull(),
  departureDate: text("departure_date").notNull(),
  departureTime: text("departure_time"),
  originIata: text("origin_iata").notNull(),
  destinationIata: text("destination_iata").notNull(),
  riskScore: integer("risk_score").default(0).notNull(),
  riskTier: text("risk_tier").default("green").notNull(),
  lastCheckedAt: timestamp("last_checked_at"),
  redTierFirstAt: timestamp("red_tier_first_at"),
  cancelledAt: timestamp("cancelled_at"),
  resolvedStatus: text("resolved_status"),
  resolvedDelayMinutes: integer("resolved_delay_minutes"),
  resolvedAt: timestamp("resolved_at"),
  lastAlertedTier: text("last_alerted_tier"),
  flightStatus: jsonb("flight_status"),
  status: text("status").default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("user_monitored_flights_user_id_idx").on(table.userId),
  index("user_monitored_flights_status_idx").on(table.status),
]);

export const agencyAccountsRelations = relations(agencyAccounts, ({ many }) => ({
  flights: many(monitoredFlights),
}));

export const monitoredFlightsRelations = relations(monitoredFlights, ({ one, many }) => ({
  agency: one(agencyAccounts, { fields: [monitoredFlights.agencyId], references: [agencyAccounts.id] }),
  riskHistory: many(riskScoreHistory),
  alternatives: many(disruptionAlternatives),
  travelers: many(flightTravelers),
}));

export const flightTravelersRelations = relations(flightTravelers, ({ one }) => ({
  flight: one(monitoredFlights, { fields: [flightTravelers.monitoredFlightId], references: [monitoredFlights.id] }),
  agency: one(agencyAccounts, { fields: [flightTravelers.agencyId], references: [agencyAccounts.id] }),
}));

export const healthReportsRelations = relations(healthReports, ({ one }) => ({
  requestedByAgency: one(agencyAccounts, { fields: [healthReports.requestedByAgencyId], references: [agencyAccounts.id] }),
}));

export const riskScoreHistoryRelations = relations(riskScoreHistory, ({ one }) => ({
  flight: one(monitoredFlights, { fields: [riskScoreHistory.monitoredFlightId], references: [monitoredFlights.id] }),
}));

export const disruptionAlternativesRelations = relations(disruptionAlternatives, ({ one }) => ({
  flight: one(monitoredFlights, { fields: [disruptionAlternatives.monitoredFlightId], references: [monitoredFlights.id] }),
}));

export const insertAgencyAccountSchema = createInsertSchema(agencyAccounts).omit({
  id: true, createdAt: true, active: true, plan: true,
});
export const insertMonitoredFlightSchema = createInsertSchema(monitoredFlights).omit({
  id: true, createdAt: true, riskScore: true, riskTier: true, lastCheckedAt: true,
  status: true, agencyResolvedAt: true, departureTime: true,
});
export const insertFlightTravelerSchema = createInsertSchema(flightTravelers).omit({
  id: true, createdAt: true, selectionToken: true, selectedOptionId: true,
  selectedAt: true, alertSentAt: true, agencyNotifiedAt: true,
});
export const insertHealthReportSchema = createInsertSchema(healthReports).omit({
  id: true, generatedAt: true,
});
export const insertRiskScoreHistorySchema = createInsertSchema(riskScoreHistory).omit({
  id: true, scoredAt: true,
});
export const insertDisruptionAlternativeSchema = createInsertSchema(disruptionAlternatives).omit({
  id: true, createdAt: true,
});

export type UserMonitoredFlight = typeof userMonitoredFlights.$inferSelect;

export type AgencyAccount = typeof agencyAccounts.$inferSelect;
export type InsertAgencyAccount = z.infer<typeof insertAgencyAccountSchema>;
export type MonitoredFlight = typeof monitoredFlights.$inferSelect;
export type InsertMonitoredFlight = z.infer<typeof insertMonitoredFlightSchema>;
export type RiskScoreHistory = typeof riskScoreHistory.$inferSelect;
export type InsertRiskScoreHistory = z.infer<typeof insertRiskScoreHistorySchema>;
export type DisruptionAlternative = typeof disruptionAlternatives.$inferSelect;
export type InsertDisruptionAlternative = z.infer<typeof insertDisruptionAlternativeSchema>;
export type FlightTraveler = typeof flightTravelers.$inferSelect;
export type InsertFlightTraveler = z.infer<typeof insertFlightTravelerSchema>;
export type HealthReport = typeof healthReports.$inferSelect;
export type InsertHealthReport = z.infer<typeof insertHealthReportSchema>;

// ============================================================
// v3 — Flight Data PRE/POST (AeroDataBox webhook raw collection)
// Schema: clean (same home as the v2 tables). Written ONLY by
// the webhook path (flightDataPrePostStore_v3). See
// MDplan/V3_WebhookExtractionPlan.md + AugMLtest/PrePosFeat.md.
// ============================================================
const cleanSchema = pgSchema("clean");

export const flightDataPrePost = cleanSchema.table(
  "flight_data_pre_post",
  {
    id: serial("id").primaryKey(),

    // Identity
    flightNumber: text("flight_number").notNull(),
    carrierIata: text("carrier_iata"),
    carrierIcao: text("carrier_icao"),
    carrierName: text("carrier_name"),
    callSign: text("call_sign"),
    isCargo: boolean("is_cargo"),
    status: text("status"),
    statusCode: smallint("status_code"),
    codeshareStatus: text("codeshare_status"),
    lastUpdatedUtc: timestamp("last_updated_utc", { withTimezone: true }),

    // Great-circle distance (gcd_km canonical — the other units are derivable)
    gcdKm: doublePrecision("gcd_km"),

    // Departure (PRE)
    depAirportIcao: text("dep_airport_icao"),
    depAirportIata: text("dep_airport_iata"),
    depAirportName: text("dep_airport_name"),
    depAirportShortName: text("dep_airport_short_name"),
    depAirportMunicipality: text("dep_airport_municipality"),
    depAirportCountryCode: text("dep_airport_country_code"),
    depAirportLat: doublePrecision("dep_airport_lat"),
    depAirportLon: doublePrecision("dep_airport_lon"),
    depAirportTimezone: text("dep_airport_timezone"),
    depScheduledUtc: timestamp("dep_scheduled_utc", { withTimezone: true }),
    depScheduledLocal: text("dep_scheduled_local"),
    depRevisedUtc: timestamp("dep_revised_utc", { withTimezone: true }),
    depRunwayUtc: timestamp("dep_runway_utc", { withTimezone: true }),
    depTerminal: text("dep_terminal"),
    depCheckinDesk: text("dep_checkin_desk"),
    depGate: text("dep_gate"),
    depRunway: text("dep_runway"),
    depQuality: jsonb("dep_quality"),

    // Arrival (PRE baseline)
    arrAirportIcao: text("arr_airport_icao"),
    arrAirportIata: text("arr_airport_iata"),
    arrAirportName: text("arr_airport_name"),
    arrAirportShortName: text("arr_airport_short_name"),
    arrAirportMunicipality: text("arr_airport_municipality"),
    arrAirportCountryCode: text("arr_airport_country_code"),
    arrAirportLat: doublePrecision("arr_airport_lat"),
    arrAirportLon: doublePrecision("arr_airport_lon"),
    arrAirportTimezone: text("arr_airport_timezone"),
    arrScheduledUtc: timestamp("arr_scheduled_utc", { withTimezone: true }),
    arrScheduledLocal: text("arr_scheduled_local"),
    arrRevisedUtc: timestamp("arr_revised_utc", { withTimezone: true }),
    arrRunwayUtc: timestamp("arr_runway_utc", { withTimezone: true }),
    arrTerminal: text("arr_terminal"),
    arrGate: text("arr_gate"),
    arrBaggageBelt: text("arr_baggage_belt"),
    arrRunway: text("arr_runway"),
    arrQuality: jsonb("arr_quality"),

    // Aircraft (tail-number join key)
    aircraftReg: text("aircraft_reg"),
    aircraftModeS: text("aircraft_mode_s"),
    aircraftModel: text("aircraft_model"),

    // Live position (POST, ADS-B)
    locLat: doublePrecision("loc_lat"),
    locLon: doublePrecision("loc_lon"),
    locAltitudeFt: doublePrecision("loc_altitude_ft"),
    locPressureAltitudeFt: doublePrecision("loc_pressure_altitude_ft"),
    locPressureHpa: doublePrecision("loc_pressure_hpa"),
    locGroundSpeedKt: doublePrecision("loc_ground_speed_kt"),
    locTrueTrackDeg: doublePrecision("loc_true_track_deg"),
    locVsiFpm: integer("loc_vsi_fpm"),
    locReportedUtc: timestamp("loc_reported_utc", { withTimezone: true }),

    // Stage + meta
    dataStage: text("data_stage").notNull(),
    hasLiveLocation: boolean("has_live_location").notNull().default(false),
    subscriptionId: uuid("subscription_id"),
    subscriptionIsActive: boolean("subscription_is_active"),
    subscriptionBillingType: text("subscription_billing_type"),
    subscriptionActivateBeforeUtc: timestamp("subscription_activate_before_utc", { withTimezone: true }),
    subscriptionExpiresOnUtc: timestamp("subscription_expires_on_utc", { withTimezone: true }),
    subscriptionCreatedOnUtc: timestamp("subscription_created_on_utc", { withTimezone: true }),
    subjectType: text("subject_type"),
    subjectId: text("subject_id"),
    subscriberType: text("subscriber_type"),
    subscriberId: text("subscriber_id"),
    subscriptionNotices: jsonb("subscription_notices"),
    creditsRemaining: bigint("credits_remaining", { mode: "number" }),
    balanceLastRefilledUtc: timestamp("balance_last_refilled_utc", { withTimezone: true }),
    balanceLastDeductedUtc: timestamp("balance_last_deducted_utc", { withTimezone: true }),

    // Sampling metadata (tier-rotating collection, migration 0012)
    samplingBatchId: text("sampling_batch_id"),
    airportTier: text("airport_tier"),
    samplingProbability: doublePrecision("sampling_probability"),
    samplingWeight: doublePrecision("sampling_weight"),
    randomSeed: text("random_seed"),
    collectionWindowStart: timestamp("collection_window_start", { withTimezone: true }),
    collectionWindowEnd: timestamp("collection_window_end", { withTimezone: true }),

    receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
    payloadJson: jsonb("payload_json").notNull(),
    dedupKey: text("dedup_key").notNull(),
  },
  (table) => [
    uniqueIndex("flight_data_pre_post_dedup_key_unique").on(table.dedupKey),
    index("idx_fdp_flight_date").on(table.flightNumber, table.depScheduledUtc),
    index("idx_fdp_aircraft_reg").on(table.aircraftReg),
    index("idx_fdp_status").on(table.status),
    index("idx_fdp_batch").on(table.samplingBatchId),
  ],
);

export type FlightDataPrePost = typeof flightDataPrePost.$inferSelect;
export type InsertFlightDataPrePost = typeof flightDataPrePost.$inferInsert;
