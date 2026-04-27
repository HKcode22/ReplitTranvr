import { sql, relations } from "drizzle-orm";
import {
  pgTable, text, varchar, boolean, timestamp, serial, numeric, jsonb, index, pgEnum, integer
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
export const insertSavedCardSchema = createInsertSchema(savedCards).omit({ id: true, createdAt: true });
export const insertBlandCallSchema = createInsertSchema(blandCalls).omit({ id: true, createdAt: true });
export const insertCalendarEntrySchema = createInsertSchema(calendarEntries).omit({ id: true, createdAt: true });
export const insertPromoCodeSchema = createInsertSchema(promoCodes).omit({ id: true, usedCount: true, createdAt: true, updatedAt: true });

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
export type SavedCard = typeof savedCards.$inferSelect;
export type InsertSavedCard = z.infer<typeof insertSavedCardSchema>;
export type BlandCall = typeof blandCalls.$inferSelect;
export type InsertBlandCall = z.infer<typeof insertBlandCallSchema>;
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
