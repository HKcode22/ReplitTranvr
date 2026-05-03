import { eq, desc, and, isNull, count, sql, inArray } from "drizzle-orm";
import { db } from "./db";
import {
  users, travelerProfiles, callRequests, itineraryProposals,
  proposalItems, notifications, payments, callbackRequests, savedCards, blandCalls,
  calendarEntries, systemSettings, promoCodes, phoneEmailMap, guestProposals,
  hotelSearches, hotelOptions, hotelBookings, tripRequests,
  type User, type InsertUser, type TravelerProfile, type InsertTravelerProfile,
  type CallRequest, type InsertCallRequest, type ItineraryProposal, type InsertProposal,
  type ProposalItem, type InsertProposalItem, type Notification, type InsertNotification,
  type Payment, type InsertPayment, type CallbackRequest, type InsertCallbackRequest,
  type SavedCard, type InsertSavedCard, type BlandCall, type InsertBlandCall,
  type CalendarEntry, type InsertCalendarEntry,
  type TripRequest, type InsertTripRequest,
  type PromoCode, type InsertPromoCode,
  type PhoneEmailMap, type GuestProposal, type InsertGuestProposal,
  type HotelSearch, type InsertHotelSearch,
  type HotelOption, type InsertHotelOption,
  type HotelBooking, type InsertHotelBooking,
} from "@shared/schema";
import { normalizePhoneE164 } from "./lib/phone";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser & { verificationToken?: string }): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;

  getProfile(userId: string): Promise<TravelerProfile | undefined>;
  upsertProfile(userId: string, data: Partial<InsertTravelerProfile>): Promise<TravelerProfile>;

  getCallRequests(userId: string): Promise<CallRequest[]>;
  getCallRequest(id: number): Promise<CallRequest | undefined>;
  createCallRequest(data: InsertCallRequest): Promise<CallRequest>;
  updateCallRequest(id: number, data: Partial<CallRequest>): Promise<CallRequest | undefined>;

  getProposals(userId: string): Promise<ItineraryProposal[]>;
  getProposal(id: number): Promise<ItineraryProposal | undefined>;
  getProposalsByCallRequest(callRequestId: number): Promise<ItineraryProposal[]>;
  createProposal(data: InsertProposal): Promise<ItineraryProposal>;
  updateProposal(id: number, data: Partial<ItineraryProposal>): Promise<ItineraryProposal | undefined>;

  getProposalItems(proposalId: number): Promise<ProposalItem[]>;
  createProposalItem(data: InsertProposalItem): Promise<ProposalItem>;
  updateProposalItem(id: number, data: Partial<Pick<ProposalItem, "description" | "priceEstimate" | "duffelOfferId" | "duffelOfferData">>): Promise<ProposalItem | undefined>;
  deleteProposalAndItems(proposalId: number): Promise<void>;

  getNotifications(userId: string): Promise<Notification[]>;
  getNotification(id: number): Promise<Notification | undefined>;
  createNotification(data: InsertNotification): Promise<Notification>;
  markNotificationRead(id: number): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;

  getPayments(userId: string): Promise<Payment[]>;
  getPayment(id: number): Promise<Payment | undefined>;
  getPaymentsByProposal(proposalId: number): Promise<Payment[]>;
  getPaymentByStripeIntentId(intentId: string): Promise<Payment | undefined>;
  createPayment(data: InsertPayment): Promise<Payment>;
  updatePayment(id: number, data: Partial<Payment>): Promise<Payment | undefined>;
  getPaymentByDuffelBookingRef(ref: string): Promise<Payment | undefined>;

  createTripRequest(data: InsertTripRequest): Promise<TripRequest>;

  getCalendarEntries(userId: string): Promise<CalendarEntry[]>;
  getCalendarEntriesByPayment(paymentId: number): Promise<CalendarEntry[]>;
  createCalendarEntry(data: InsertCalendarEntry): Promise<CalendarEntry>;

  createCallbackRequest(data: InsertCallbackRequest): Promise<CallbackRequest>;
  getCallbackRequestsByEmail(email: string): Promise<CallbackRequest[]>;
  updateCallbackRequest(id: number, data: Partial<CallbackRequest>): Promise<CallbackRequest | undefined>;

  getSavedCards(userId: string): Promise<SavedCard[]>;
  getSavedCard(id: number): Promise<SavedCard | undefined>;
  createSavedCard(data: InsertSavedCard): Promise<SavedCard>;
  deleteSavedCard(id: number, userId: string): Promise<void>;
  setDefaultCard(id: number, userId: string): Promise<void>;

  getBlandCalls(userId: string): Promise<BlandCall[]>;
  getBlandCallByBlandId(blandCallId: string): Promise<BlandCall | undefined>;
  getBlandCallsByBlandIds(ids: string[]): Promise<BlandCall[]>;
  getBlandCallById(id: number): Promise<BlandCall | undefined>;
  getRecentCompletedBlandCalls(limit?: number): Promise<BlandCall[]>;
  getBlandCallsByCallRequest(callRequestId: number): Promise<BlandCall[]>;
  getBlandCallsByCallRequestIds(ids: number[]): Promise<BlandCall[]>;
  createBlandCall(data: InsertBlandCall): Promise<BlandCall>;
  updateBlandCall(id: number, data: Partial<BlandCall>): Promise<BlandCall | undefined>;

  getUserIdByTravelerProfilePhone(normalizedPhone: string): Promise<string | null>;
  upsertPhoneEmailMap(phone: string, email: string): Promise<PhoneEmailMap | null>;
  getEmailForPhone(phone: string): Promise<string | null>;
  getEmailsForPhones(phones: string[]): Promise<Map<string, string>>;
  getUserIdByPhone(phone: string): Promise<{ userId: string; source: "phone_traveler_profile" | "phone_bland_calls" | "phone_email_map_to_user" } | null>;

  createGuestProposal(data: InsertGuestProposal): Promise<GuestProposal>;
  getGuestProposalByToken(token: string): Promise<GuestProposal | undefined>;
  getGuestProposalByOptionToken(optionToken: string): Promise<GuestProposal | undefined>;
  updateGuestProposalStatus(id: number, status: string): Promise<GuestProposal | undefined>;
  claimGuestProposalForBooking(id: number): Promise<{ row: GuestProposal; priorStatus: string } | undefined>;
  getRecentGuestProposalForPhone(phone: string, hoursWindow: number): Promise<{ row: GuestProposal; expired: boolean } | undefined>;

  // ===== Hotels (Phase 2 — persistence) =====
  createHotelSearch(data: InsertHotelSearch): Promise<HotelSearch>;
  getHotelSearch(id: number): Promise<HotelSearch | undefined>;
  getHotelSearchesByCallRequest(callRequestId: number): Promise<HotelSearch[]>;
  updateHotelSearchStatus(id: number, status: string, errorMessage?: string): Promise<void>;
  bulkCreateHotelOptions(rows: InsertHotelOption[]): Promise<HotelOption[]>;
  getHotelOptionsBySearch(searchId: number): Promise<HotelOption[]>;
  getHotelOption(id: number): Promise<HotelOption | undefined>;
  createHotelBooking(data: InsertHotelBooking): Promise<HotelBooking>;
  getHotelBooking(id: number): Promise<HotelBooking | undefined>;
  updateHotelBookingStatus(id: number, status: string, fields?: Partial<HotelBooking>): Promise<void>;

  // ===== Hotels (Phase 5 — booking concurrency) =====
  // Atomic, in-memory claim on a hotel_options row to prevent two
  // admin-initiated booking attempts from racing on the same option.
  // Returns true on successful claim, false if already claimed.
  // TODO: move to a DB-backed advisory lock once we have real volume.
  claimHotelOptionForBooking(hotelOptionId: number): Promise<boolean>;
  releaseHotelOptionClaim(hotelOptionId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.verificationToken, token));
    return user;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.passwordResetToken, token));
    return user;
  }

  async createUser(data: InsertUser & { verificationToken?: string }): Promise<User> {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return user;
  }

  async getProfile(userId: string): Promise<TravelerProfile | undefined> {
    const [profile] = await db.select().from(travelerProfiles).where(eq(travelerProfiles.userId, userId));
    return profile;
  }

  async upsertProfile(userId: string, data: Partial<InsertTravelerProfile>): Promise<TravelerProfile> {
    const existing = await this.getProfile(userId);
    if (existing) {
      const [updated] = await db.update(travelerProfiles)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(travelerProfiles.userId, userId))
        .returning();
      return updated;
    }
    const [profile] = await db.insert(travelerProfiles).values({ ...data, userId } as any).returning();
    return profile;
  }

  async getCallRequests(userId: string): Promise<CallRequest[]> {
    return db.select().from(callRequests).where(eq(callRequests.userId, userId)).orderBy(desc(callRequests.createdAt));
  }

  async getCallRequest(id: number): Promise<CallRequest | undefined> {
    const [cr] = await db.select().from(callRequests).where(eq(callRequests.id, id));
    return cr;
  }

  async createCallRequest(data: InsertCallRequest): Promise<CallRequest> {
    const [cr] = await db.insert(callRequests).values(data).returning();
    return cr;
  }

  async updateCallRequest(id: number, data: Partial<CallRequest>): Promise<CallRequest | undefined> {
    const [cr] = await db.update(callRequests).set(data).where(eq(callRequests.id, id)).returning();
    return cr;
  }

  async getProposals(userId: string): Promise<ItineraryProposal[]> {
    return db.select().from(itineraryProposals).where(eq(itineraryProposals.userId, userId)).orderBy(desc(itineraryProposals.createdAt));
  }

  async getProposal(id: number): Promise<ItineraryProposal | undefined> {
    const [p] = await db.select().from(itineraryProposals).where(eq(itineraryProposals.id, id));
    return p;
  }

  async getProposalsByCallRequest(callRequestId: number): Promise<ItineraryProposal[]> {
    return db.select().from(itineraryProposals).where(eq(itineraryProposals.callRequestId, callRequestId));
  }

  async createProposal(data: InsertProposal): Promise<ItineraryProposal> {
    const [p] = await db.insert(itineraryProposals).values(data).returning();
    return p;
  }

  async updateProposal(id: number, data: Partial<ItineraryProposal>): Promise<ItineraryProposal | undefined> {
    const [p] = await db.update(itineraryProposals).set(data).where(eq(itineraryProposals.id, id)).returning();
    return p;
  }

  async getProposalItems(proposalId: number): Promise<ProposalItem[]> {
    return db.select().from(proposalItems).where(eq(proposalItems.proposalId, proposalId));
  }

  async createProposalItem(data: InsertProposalItem): Promise<ProposalItem> {
    const [item] = await db.insert(proposalItems).values(data).returning();
    return item;
  }

  async updateProposalItem(id: number, data: Partial<Pick<ProposalItem, "description" | "priceEstimate" | "duffelOfferId" | "duffelOfferData">>): Promise<ProposalItem | undefined> {
    const [item] = await db.update(proposalItems).set(data).where(eq(proposalItems.id, id)).returning();
    return item;
  }

  async deleteProposalAndItems(proposalId: number): Promise<void> {
    await db.delete(proposalItems).where(eq(proposalItems.proposalId, proposalId));
    await db.delete(itineraryProposals).where(eq(itineraryProposals.id, proposalId));
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }

  async getNotification(id: number): Promise<Notification | undefined> {
    const [n] = await db.select().from(notifications).where(eq(notifications.id, id));
    return n;
  }

  async createNotification(data: InsertNotification): Promise<Notification> {
    const [n] = await db.insert(notifications).values(data).returning();
    return n;
  }

  async markNotificationRead(id: number): Promise<void> {
    await db.update(notifications).set({ readAt: new Date() }).where(eq(notifications.id, id));
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications).set({ readAt: new Date() }).where(
      and(eq(notifications.userId, userId), isNull(notifications.readAt))
    );
  }

  async getPayments(userId: string): Promise<Payment[]> {
    return db.select().from(payments).where(eq(payments.userId, userId)).orderBy(desc(payments.createdAt));
  }

  async getPayment(id: number): Promise<Payment | undefined> {
    const [p] = await db.select().from(payments).where(eq(payments.id, id));
    return p;
  }

  async getCalendarEntries(userId: string): Promise<CalendarEntry[]> {
    return db.select().from(calendarEntries).where(eq(calendarEntries.userId, userId)).orderBy(desc(calendarEntries.date));
  }

  async getCalendarEntriesByPayment(paymentId: number): Promise<CalendarEntry[]> {
    return db.select().from(calendarEntries).where(eq(calendarEntries.paymentId, paymentId));
  }

  async createCalendarEntry(data: InsertCalendarEntry): Promise<CalendarEntry> {
    const [entry] = await db.insert(calendarEntries).values(data).returning();
    return entry;
  }

  async getPaymentsByProposal(proposalId: number): Promise<Payment[]> {
    return db.select().from(payments).where(eq(payments.proposalId, proposalId));
  }

  async getPaymentByStripeIntentId(intentId: string): Promise<Payment | undefined> {
    const [p] = await db.select().from(payments).where(eq(payments.stripePaymentIntentId, intentId));
    return p;
  }

  async createPayment(data: InsertPayment): Promise<Payment> {
    const [p] = await db.insert(payments).values(data).returning();
    return p;
  }

  async updatePayment(id: number, data: Partial<Payment>): Promise<Payment | undefined> {
    const [p] = await db.update(payments).set(data).where(eq(payments.id, id)).returning();
    return p;
  }

  async getPaymentByDuffelBookingRef(ref: string): Promise<Payment | undefined> {
    // Booking refs are normalized to upper-case throughout the codebase
    // (Duffel returns them upper-case), but compare case-insensitively
    // for the public lookup so guests don't fail on shift-key mistakes.
    const [p] = await db
      .select()
      .from(payments)
      .where(sql`upper(${payments.duffelBookingRef}) = upper(${ref})`);
    return p;
  }

  async createTripRequest(data: InsertTripRequest): Promise<TripRequest> {
    const [row] = await db.insert(tripRequests).values(data).returning();
    return row;
  }

  async createCallbackRequest(data: InsertCallbackRequest): Promise<CallbackRequest> {
    const [cb] = await db.insert(callbackRequests).values(data).returning();
    return cb;
  }

  async getCallbackRequestsByEmail(email: string): Promise<CallbackRequest[]> {
    return db.select().from(callbackRequests).where(eq(callbackRequests.email, email)).orderBy(desc(callbackRequests.createdAt));
  }

  async updateCallbackRequest(id: number, data: Partial<CallbackRequest>): Promise<CallbackRequest | undefined> {
    const [updated] = await db.update(callbackRequests).set(data).where(eq(callbackRequests.id, id)).returning();
    return updated;
  }

  async getSavedCards(userId: string): Promise<SavedCard[]> {
    return db.select().from(savedCards).where(eq(savedCards.userId, userId)).orderBy(desc(savedCards.createdAt));
  }

  async getSavedCard(id: number): Promise<SavedCard | undefined> {
    const [card] = await db.select().from(savedCards).where(eq(savedCards.id, id));
    return card;
  }

  async createSavedCard(data: InsertSavedCard): Promise<SavedCard> {
    if (data.isDefault) {
      await db.update(savedCards).set({ isDefault: false }).where(eq(savedCards.userId, data.userId));
    }
    const [card] = await db.insert(savedCards).values(data).returning();
    return card;
  }

  async deleteSavedCard(id: number, userId: string): Promise<void> {
    await db.delete(savedCards).where(and(eq(savedCards.id, id), eq(savedCards.userId, userId)));
  }

  async setDefaultCard(id: number, userId: string): Promise<void> {
    await db.update(savedCards).set({ isDefault: false }).where(eq(savedCards.userId, userId));
    await db.update(savedCards).set({ isDefault: true }).where(and(eq(savedCards.id, id), eq(savedCards.userId, userId)));
  }

  async getBlandCalls(userId: string): Promise<BlandCall[]> {
    return db.select().from(blandCalls).where(eq(blandCalls.userId, userId)).orderBy(desc(blandCalls.createdAt));
  }

  async getBlandCallByBlandId(blandCallId: string): Promise<BlandCall | undefined> {
    const [call] = await db.select().from(blandCalls).where(eq(blandCalls.blandCallId, blandCallId));
    return call;
  }

  // Bulk lookup by Bland's external call_id. Used by /api/admin/calls-live
  // to enrich the live Bland-API list with cached AI summaries from our DB
  // without an N+1 query loop.
  async getBlandCallsByBlandIds(ids: string[]): Promise<BlandCall[]> {
    const cleaned = Array.from(new Set(ids.filter((id): id is string => typeof id === "string" && !!id)));
    if (cleaned.length === 0) return [];
    return db.select().from(blandCalls).where(inArray(blandCalls.blandCallId, cleaned));
  }

  // Recent completed bland_calls — used by the backfill script to find
  // calls that never got an AI summary. The transcript-presence and
  // already-cached checks live in the script itself; this query just
  // bounds the candidate set so we don't scan the entire history at once.
  async getRecentCompletedBlandCalls(limit: number = 100): Promise<BlandCall[]> {
    return db
      .select()
      .from(blandCalls)
      .where(eq(blandCalls.status, "completed"))
      .orderBy(desc(blandCalls.createdAt))
      .limit(limit);
  }

  async getBlandCallsByCallRequest(callRequestId: number): Promise<BlandCall[]> {
    return db.select().from(blandCalls).where(eq(blandCalls.callRequestId, callRequestId)).orderBy(desc(blandCalls.createdAt));
  }

  // Bulk variant: one query for many call_request ids. Used by the
  // /api/admin/calls-live DB-fallback branch to avoid N+1 lookups while
  // resolving the most-recent bland_call (and its cached aiSummary)
  // per call request.
  async getBlandCallsByCallRequestIds(ids: number[]): Promise<BlandCall[]> {
    const cleaned = Array.from(new Set(ids.filter((n): n is number => Number.isFinite(n))));
    if (cleaned.length === 0) return [];
    return db
      .select()
      .from(blandCalls)
      .where(inArray(blandCalls.callRequestId, cleaned))
      .orderBy(desc(blandCalls.createdAt));
  }

  async getBlandCallById(id: number): Promise<BlandCall | undefined> {
    const [row] = await db.select().from(blandCalls).where(eq(blandCalls.id, id));
    return row;
  }

  async createBlandCall(data: InsertBlandCall): Promise<BlandCall> {
    const [call] = await db.insert(blandCalls).values(data).returning();
    return call;
  }

  async updateBlandCall(id: number, data: Partial<BlandCall>): Promise<BlandCall | undefined> {
    const [call] = await db.update(blandCalls).set(data).where(eq(blandCalls.id, id)).returning();
    return call;
  }

  // ===== Admin queries =====
  async adminGetAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async adminGetAllPayments(): Promise<Payment[]> {
    return db.select().from(payments).orderBy(desc(payments.createdAt));
  }

  async adminGetPaymentsByStatus(status: Payment["status"]): Promise<Payment[]> {
    return db.select().from(payments).where(eq(payments.status, status)).orderBy(desc(payments.createdAt));
  }

  async adminGetAllCallRequests(): Promise<CallRequest[]> {
    return db.select().from(callRequests).orderBy(desc(callRequests.createdAt));
  }

  async adminGetUsersByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return [];
    return db.select().from(users).where(inArray(users.id, ids));
  }

  async adminGetStats(): Promise<{ users: number; payments: number; pendingManual: number; bookings: number; calls: number; revenue: number; revenueByCurrency: { currency: string; amount: number }[] }> {
    const [u] = await db.select({ c: count() }).from(users);
    const [p] = await db.select({ c: count() }).from(payments);
    const [pm] = await db.select({ c: count() }).from(payments).where(eq(payments.status, "pending_manual"));
    const [b] = await db.select({ c: count() }).from(payments).where(eq(payments.status, "paid"));
    const [cr] = await db.select({ c: count() }).from(callRequests);
    const [rev] = await db
      .select({ total: sql<string>`COALESCE(SUM(${payments.amount}), 0)` })
      .from(payments)
      .where(eq(payments.status, "paid"));
    const revByCurr = await db
      .select({ currency: payments.currency, total: sql<string>`COALESCE(SUM(${payments.amount}), 0)` })
      .from(payments)
      .where(eq(payments.status, "paid"))
      .groupBy(payments.currency);
    const revenueTotal = parseFloat(String(rev?.total ?? "0"));
    return {
      users: Number(u?.c || 0),
      payments: Number(p?.c || 0),
      pendingManual: Number(pm?.c || 0),
      bookings: Number(b?.c || 0),
      calls: Number(cr?.c || 0),
      revenue: Number.isFinite(revenueTotal) ? revenueTotal : 0,
      revenueByCurrency: revByCurr.map((r) => ({ currency: r.currency, amount: parseFloat(String(r.total)) || 0 })),
    };
  }

  async getSetting(key: string): Promise<{ value: string; updatedAt: Date } | null> {
    const [row] = await db.select().from(systemSettings).where(eq(systemSettings.key, key)).limit(1);
    if (!row) return null;
    return { value: row.value, updatedAt: row.updatedAt };
  }

  async setSetting(key: string, value: string): Promise<{ value: string; updatedAt: Date }> {
    const now = new Date();
    const [row] = await db
      .insert(systemSettings)
      .values({ key, value, updatedAt: now })
      .onConflictDoUpdate({ target: systemSettings.key, set: { value, updatedAt: now } })
      .returning();
    return { value: row.value, updatedAt: row.updatedAt };
  }

  async getPromoCodeByCode(code: string): Promise<PromoCode | undefined> {
    const normalized = code.trim().toUpperCase();
    const [row] = await db.select().from(promoCodes).where(eq(promoCodes.code, normalized)).limit(1);
    return row;
  }

  async listPromoCodes(): Promise<PromoCode[]> {
    return db.select().from(promoCodes).orderBy(desc(promoCodes.createdAt));
  }

  async createPromoCode(data: InsertPromoCode): Promise<PromoCode> {
    const normalized = { ...data, code: data.code.trim().toUpperCase() };
    const [row] = await db.insert(promoCodes).values(normalized).returning();
    return row;
  }

  async deactivatePromoCode(id: number): Promise<PromoCode | undefined> {
    const [row] = await db
      .update(promoCodes)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(promoCodes.id, id))
      .returning();
    return row;
  }

  async incrementPromoUsage(id: number): Promise<boolean> {
    const result = await db
      .update(promoCodes)
      .set({ usedCount: sql`${promoCodes.usedCount} + 1`, updatedAt: new Date() })
      .where(and(
        eq(promoCodes.id, id),
        eq(promoCodes.active, true),
        sql`(${promoCodes.maxUses} IS NULL OR ${promoCodes.usedCount} < ${promoCodes.maxUses})`,
      ))
      .returning({ id: promoCodes.id });
    return result.length > 0;
  }

  async getDuffelSpentTotal(): Promise<number> {
    const [r] = await db
      .select({ total: sql<string>`COALESCE(SUM(${payments.amount}), 0)` })
      .from(payments)
      .where(and(eq(payments.status, "paid"), sql`${payments.duffelOrderId} IS NOT NULL`));
    const n = parseFloat(String(r?.total ?? "0"));
    return Number.isFinite(n) ? n : 0;
  }

  // Strict lookup: returns the userId of any traveler_profile whose phone
  // equals the supplied already-normalized E.164 phone string. Used by the
  // signup path to surface a friendly "Phone number already registered"
  // error before relying on the DB unique constraint as the final guard.
  async getUserIdByTravelerProfilePhone(normalizedPhone: string): Promise<string | null> {
    if (!normalizedPhone) return null;
    const [row] = await db
      .select({ userId: travelerProfiles.userId })
      .from(travelerProfiles)
      .where(eq(travelerProfiles.phone, normalizedPhone))
      .limit(1);
    return row?.userId ?? null;
  }

  async upsertPhoneEmailMap(phone: string, email: string): Promise<PhoneEmailMap | null> {
    const normalizedPhone = normalizePhoneE164(phone);
    const normalizedEmail = (email || "").trim().toLowerCase();
    if (!normalizedPhone || !normalizedEmail || !normalizedEmail.includes("@")) return null;
    const [row] = await db
      .insert(phoneEmailMap)
      .values({ phone: normalizedPhone, email: normalizedEmail })
      .onConflictDoUpdate({
        target: phoneEmailMap.phone,
        set: { email: normalizedEmail, updatedAt: new Date() },
      })
      .returning();
    return row ?? null;
  }

  async getEmailForPhone(phone: string): Promise<string | null> {
    const normalizedPhone = normalizePhoneE164(phone);
    if (!normalizedPhone) return null;
    const [row] = await db.select().from(phoneEmailMap).where(eq(phoneEmailMap.phone, normalizedPhone));
    return row?.email ?? null;
  }

  // Bulk variant of `getEmailForPhone` — looks up many phones in a single
  // SQL query (`IN (...)`) and returns a map keyed by the *normalized* phone.
  // Callers should normalize their lookup keys with `normalizePhoneE164`
  // when reading from the returned map. Unknown / unnormalizable phones are
  // simply absent from the map.
  async getEmailsForPhones(phones: string[]): Promise<Map<string, string>> {
    const normalized = Array.from(
      new Set(
        phones
          .map((p) => normalizePhoneE164(p))
          .filter((p): p is string => p !== null),
      ),
    );
    const out = new Map<string, string>();
    if (normalized.length === 0) return out;
    const rows = await db.select().from(phoneEmailMap).where(inArray(phoneEmailMap.phone, normalized));
    for (const r of rows) {
      if (r.phone && r.email) out.set(r.phone, r.email);
    }
    return out;
  }

  // Resolve a Travnr user from an inbound caller phone number using three
  // read-only sources in priority order. The `users` table has no phone
  // column (and shared/schema.ts is locked), so we join through:
  //   1. traveler_profiles.phone — owner-entered, primary source.
  //   2. bland_calls.phone_number — any prior outbound call from this phone
  //      implies that user owns it.
  //   3. phone_email_map.email → users.email — covers callers who appeared
  //      via the guest flow with an email that matches a registered user.
  // For each source, if multiple distinct user IDs match, treat the source as
  // ambiguous and skip to the next source rather than picking arbitrarily —
  // when all sources are exhausted without a unique match, the caller falls
  // back to the email-only phone↔email map path so no user context is leaked
  // across accounts that happen to share a phone number. Never throws —
  // returns null on any unexpected error.
  async getUserIdByPhone(phone: string): Promise<{ userId: string; source: "phone_traveler_profile" | "phone_bland_calls" | "phone_email_map_to_user" } | null> {
    try {
      const normalizedPhone = normalizePhoneE164(phone);
      if (!normalizedPhone) return null;
      // Compare digits-only on BOTH sides so stored values like "3145551234",
      // "(314) 555-1234", "13145551234", or "+13145551234" all match the same
      // normalized E.164 input. We also compare the last 10 digits to handle
      // stored 10-digit US numbers without a country code (e.g., stored
      // "3145551234" vs input normalized to "+13145551234" → "13145551234").
      const digits = normalizedPhone.replace(/[^0-9]/g, "");
      const last10 = digits.slice(-10);
      const matchSql = (col: any) => sql`(
        regexp_replace(COALESCE(${col}, ''), '[^0-9]', '', 'g') = ${digits}
        OR right(regexp_replace(COALESCE(${col}, ''), '[^0-9]', '', 'g'), 10) = ${last10}
      )`;

      // Ambiguity policy: if a phone source returns multiple distinct user IDs
      // (i.e. the phone is shared across accounts in that source), skip it and
      // try the next source rather than picking arbitrarily. If no source ever
      // yields a unique match, return null so the caller falls back to the
      // email-only phone↔email map path — no profile/booking context is ever
      // attached to a phone that resolves to multiple users in every source.

      // Source 1: traveler_profiles.phone (free-form text — normalize in SQL)
      try {
        const rows = await db
          .select({ userId: travelerProfiles.userId })
          .from(travelerProfiles)
          .where(matchSql(travelerProfiles.phone));
        const distinct = Array.from(new Set(rows.map(r => r.userId).filter(Boolean)));
        if (distinct.length === 1) {
          return { userId: distinct[0]!, source: "phone_traveler_profile" };
        }
      } catch (e: any) {
        console.warn("[storage.getUserIdByPhone] traveler_profiles lookup failed:", e?.message || e);
      }

      // Source 2: bland_calls.phone_number (already E.164 from outbound dispatch,
      // but normalize defensively in SQL in case of legacy rows)
      try {
        const rows = await db
          .select({ userId: blandCalls.userId })
          .from(blandCalls)
          .where(matchSql(blandCalls.phoneNumber));
        const distinct = Array.from(new Set(rows.map(r => r.userId).filter(Boolean)));
        if (distinct.length === 1) {
          return { userId: distinct[0]!, source: "phone_bland_calls" };
        }
      } catch (e: any) {
        console.warn("[storage.getUserIdByPhone] bland_calls lookup failed:", e?.message || e);
      }

      // Source 3: phone_email_map.email → users.email (weakest fallback).
      // Extra guards: only resolve when the matched user's email is verified,
      // because the phone↔email link can be established by an unverified guest
      // flow and we don't want to reveal full account history (profile,
      // bookings, proposals) based on an unverified email association. Also
      // treat any case where multiple users share that email as ambiguous.
      try {
        const email = await this.getEmailForPhone(normalizedPhone);
        if (email) {
          const matches = await db
            .select({ id: users.id, emailVerified: users.emailVerified })
            .from(users)
            .where(eq(users.email, email));
          const distinct = Array.from(new Set(matches.map(r => r.id).filter(Boolean)));
          if (distinct.length === 1) {
            const matched = matches.find(r => r.id === distinct[0]);
            if (matched?.emailVerified) {
              return { userId: distinct[0]!, source: "phone_email_map_to_user" };
            }
          }
        }
      } catch (e: any) {
        console.warn("[storage.getUserIdByPhone] phone_email_map lookup failed:", e?.message || e);
      }

      return null;
    } catch (e: any) {
      console.warn("[storage.getUserIdByPhone] unexpected error:", e?.message || e);
      return null;
    }
  }

  async createGuestProposal(data: InsertGuestProposal): Promise<GuestProposal> {
    const [row] = await db.insert(guestProposals).values(data).returning();
    return row;
  }

  async getGuestProposalByToken(token: string): Promise<GuestProposal | undefined> {
    const [row] = await db.select().from(guestProposals).where(eq(guestProposals.token, token));
    return row;
  }

  async getGuestProposalByOptionToken(optionToken: string): Promise<GuestProposal | undefined> {
    const [row] = await db
      .select()
      .from(guestProposals)
      .where(sql`${guestProposals.proposalData}->'options' @> ${JSON.stringify([{ token: optionToken }])}::jsonb`)
      .limit(1);
    return row;
  }

  async updateGuestProposalStatus(id: number, status: string): Promise<GuestProposal | undefined> {
    const [row] = await db.update(guestProposals).set({ status }).where(eq(guestProposals.id, id)).returning();
    return row;
  }

  // Atomically claim a guest_proposal for booking so concurrent /confirm calls
  // cannot both proceed. Sets status to a transient "booking" marker (the
  // schema column is free-form text). Only succeeds when current status is one
  // of the pre-booking states (pending / viewed / sent) — we explicitly do
  // NOT claim from already-terminal states like "booked" or "expired".
  // The caller must either promote the row to a final status ("booked") or
  // restore the prior status on failure.
  async claimGuestProposalForBooking(id: number): Promise<{ row: GuestProposal; priorStatus: string } | undefined> {
    // Read the current status first so we can capture the true prior value
    // for rollback. The subsequent conditional UPDATE then guards against
    // races (it will only succeed if status is still one of the allowed set).
    const [before] = await db.select().from(guestProposals).where(eq(guestProposals.id, id)).limit(1);
    if (!before) return undefined;
    const allowed = new Set(["pending", "viewed", "sent"]);
    if (!allowed.has(before.status)) return undefined;
    const [row] = await db.update(guestProposals)
      .set({ status: "booking" })
      .where(and(
        eq(guestProposals.id, id),
        inArray(guestProposals.status, ["pending", "viewed", "sent"]),
      ))
      .returning();
    if (!row) return undefined;
    return { row, priorStatus: before.status };
  }

  // Look up the most recent unbooked guest_proposal for a phone number by
  // joining through phone_email_map → email. Returns the row plus a derived
  // `expired` flag (computed from expiresAt). Used by the inbound dynamic-data
  // endpoint so the AI can acknowledge prior options on returning calls.
  async getRecentGuestProposalForPhone(phone: string, hoursWindow: number): Promise<{ row: GuestProposal; expired: boolean } | undefined> {
    const normalizedPhone = normalizePhoneE164(phone);
    if (!normalizedPhone) return undefined;
    const email = await this.getEmailForPhone(normalizedPhone);
    if (!email) return undefined;
    const sinceMs = Date.now() - Math.max(1, hoursWindow) * 60 * 60 * 1000;
    const since = new Date(sinceMs);
    const [row] = await db
      .select()
      .from(guestProposals)
      .where(and(
        eq(guestProposals.email, email),
        sql`${guestProposals.status} != 'booked'`,
        sql`${guestProposals.createdAt} >= ${since}`,
      ))
      .orderBy(desc(guestProposals.createdAt))
      .limit(1);
    if (!row) return undefined;
    const expired = !!row.expiresAt && new Date(row.expiresAt).getTime() < Date.now();
    return { row, expired };
  }

  // ===== Hotels (Phase 2 — persistence) =====
  // These methods are pure CRUD wrappers used by the admin test endpoint
  // (Phase 1) and, later, by the post-call hotel-search hook (Phase 4) and
  // booking guardrails (Phase 5). No business logic lives here.

  async createHotelSearch(data: InsertHotelSearch): Promise<HotelSearch> {
    const [row] = await db.insert(hotelSearches).values(data).returning();
    return row;
  }

  async getHotelSearch(id: number): Promise<HotelSearch | undefined> {
    const [row] = await db.select().from(hotelSearches).where(eq(hotelSearches.id, id));
    return row;
  }

  async getHotelSearchesByCallRequest(callRequestId: number): Promise<HotelSearch[]> {
    return db
      .select()
      .from(hotelSearches)
      .where(eq(hotelSearches.callRequestId, callRequestId))
      .orderBy(desc(hotelSearches.createdAt));
  }

  // Status transitions also stamp `completed_at` for the terminal states
  // (`completed`, `failed`, `partial`) so callers don't have to remember to
  // set it themselves. `pending` leaves `completed_at` untouched.
  async updateHotelSearchStatus(id: number, status: string, errorMessage?: string): Promise<void> {
    const isTerminal = status === "completed" || status === "failed" || status === "partial";
    const patch: Partial<HotelSearch> = { status };
    if (errorMessage !== undefined) patch.errorMessage = errorMessage;
    if (isTerminal) patch.completedAt = new Date();
    await db.update(hotelSearches).set(patch).where(eq(hotelSearches.id, id));
  }

  async bulkCreateHotelOptions(rows: InsertHotelOption[]): Promise<HotelOption[]> {
    if (rows.length === 0) return [];
    return db.insert(hotelOptions).values(rows).returning();
  }

  async getHotelOptionsBySearch(searchId: number): Promise<HotelOption[]> {
    return db.select().from(hotelOptions).where(eq(hotelOptions.searchId, searchId));
  }

  async getHotelOption(id: number): Promise<HotelOption | undefined> {
    const [row] = await db.select().from(hotelOptions).where(eq(hotelOptions.id, id));
    return row;
  }

  async createHotelBooking(data: InsertHotelBooking): Promise<HotelBooking> {
    const [row] = await db.insert(hotelBookings).values(data).returning();
    return row;
  }

  async getHotelBooking(id: number): Promise<HotelBooking | undefined> {
    const [row] = await db.select().from(hotelBookings).where(eq(hotelBookings.id, id));
    return row;
  }

  // `fields` lets callers patch additional columns (provider IDs, totals,
  // error messages, payment link) in the same write. `id`, `createdAt`, and
  // `updatedAt` are stripped from `fields` to prevent accidental clobbering;
  // `updatedAt` is always bumped to now.
  async updateHotelBookingStatus(id: number, status: string, fields?: Partial<HotelBooking>): Promise<void> {
    const { id: _ignoredId, createdAt: _ignoredCreated, updatedAt: _ignoredUpdated, ...safeFields } = (fields ?? {}) as Partial<HotelBooking>;
    await db
      .update(hotelBookings)
      .set({ ...safeFields, status, updatedAt: new Date() })
      .where(eq(hotelBookings.id, id));
  }

  // ===== Hotels (Phase 5 — booking concurrency) =====
  // In-memory claim set. Mirrors the spirit of `claimGuestProposalForBooking`
  // (atomic flip via a unique-constraint write) but in process memory because
  // the schema is locked for Phase 5 and admin booking volume is tiny. Two
  // concurrent /api/admin/hotels/bookings calls for the same hotelOptionId
  // can only have one winner — the loser sees `claim_taken`. The booking
  // endpoint MUST wrap its work in try/finally and call
  // `releaseHotelOptionClaim` so a thrown error does not permanently lock
  // the option.
  // TODO: replace with a Postgres advisory lock (`pg_try_advisory_lock`)
  // when we have multi-instance deployments.
  private static hotelOptionClaims: Set<number> = new Set();

  async claimHotelOptionForBooking(hotelOptionId: number): Promise<boolean> {
    if (DatabaseStorage.hotelOptionClaims.has(hotelOptionId)) return false;
    DatabaseStorage.hotelOptionClaims.add(hotelOptionId);
    return true;
  }

  async releaseHotelOptionClaim(hotelOptionId: number): Promise<void> {
    DatabaseStorage.hotelOptionClaims.delete(hotelOptionId);
  }
}

export const storage = new DatabaseStorage();
