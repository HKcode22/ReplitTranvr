import { eq, desc, and, isNull } from "drizzle-orm";
import { db } from "./db";
import {
  users, travelerProfiles, callRequests, itineraryProposals,
  proposalItems, notifications, payments, callbackRequests, savedCards, blandCalls,
  type User, type InsertUser, type TravelerProfile, type InsertTravelerProfile,
  type CallRequest, type InsertCallRequest, type ItineraryProposal, type InsertProposal,
  type ProposalItem, type InsertProposalItem, type Notification, type InsertNotification,
  type Payment, type InsertPayment, type CallbackRequest, type InsertCallbackRequest,
  type SavedCard, type InsertSavedCard, type BlandCall, type InsertBlandCall,
} from "@shared/schema";

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
  getPaymentsByProposal(proposalId: number): Promise<Payment[]>;
  getPaymentByStripeIntentId(intentId: string): Promise<Payment | undefined>;
  createPayment(data: InsertPayment): Promise<Payment>;
  updatePayment(id: number, data: Partial<Payment>): Promise<Payment | undefined>;

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
  getBlandCallsByCallRequest(callRequestId: number): Promise<BlandCall[]>;
  createBlandCall(data: InsertBlandCall): Promise<BlandCall>;
  updateBlandCall(id: number, data: Partial<BlandCall>): Promise<BlandCall | undefined>;
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

  async getBlandCallsByCallRequest(callRequestId: number): Promise<BlandCall[]> {
    return db.select().from(blandCalls).where(eq(blandCalls.callRequestId, callRequestId)).orderBy(desc(blandCalls.createdAt));
  }

  async createBlandCall(data: InsertBlandCall): Promise<BlandCall> {
    const [call] = await db.insert(blandCalls).values(data).returning();
    return call;
  }

  async updateBlandCall(id: number, data: Partial<BlandCall>): Promise<BlandCall | undefined> {
    const [call] = await db.update(blandCalls).set(data).where(eq(blandCalls.id, id)).returning();
    return call;
  }
}

export const storage = new DatabaseStorage();
