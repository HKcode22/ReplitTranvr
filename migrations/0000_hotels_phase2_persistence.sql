-- Hotels Phase 2 — Persistence (Task #109).
--
-- This migration is PURELY ADDITIVE. It creates three new tables for
-- the upcoming hotel-search / option / booking flow and adds nothing
-- else. No existing table, column, enum, index, or constraint is
-- modified. The generated drizzle-kit snapshot in `migrations/meta/`
-- captures the complete schema (so future `drizzle-kit generate`
-- diffs work correctly), but the project applies schema changes via
-- `npm run db:push`; this file is the reviewable record of what
-- Phase 2 actually adds.
--
-- Tables:
--   hotel_searches  — provider-agnostic search request + status.
--   hotel_options   — normalized result rows. `source_raw_payload`
--                     is admin-only; never return it from non-admin
--                     endpoints.
--   hotel_bookings  — links users <-> hotel_options <-> payments.
--                     `traveler_details` jsonb is intentionally
--                     restricted to traveler names + DOB only at the
--                     application layer. PCI lives only in the
--                     existing `payments` table once Phase 5 wires
--                     the link. There is no write path to this table
--                     in Phase 2 — Phase 5 will add a Zod-validated
--                     gate before any insert.

CREATE TABLE "hotel_searches" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(36),
	"call_request_id" integer,
	"proposal_id" integer,
	"provider" text NOT NULL,
	"request" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"raw_provider_payload_truncated" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "hotel_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"search_id" integer NOT NULL,
	"provider" text NOT NULL,
	"provider_hotel_id" text NOT NULL,
	"provider_rate_id" text,
	"name" text NOT NULL,
	"address" text,
	"neighborhood" text,
	"latitude" numeric(9, 6),
	"longitude" numeric(9, 6),
	"star_rating" numeric(2, 1),
	"guest_rating" numeric(3, 2),
	"images" jsonb,
	"description" text,
	"amenities" jsonb,
	"room_name" text,
	"bed_type" text,
	"board_type" text,
	"cancellation_policy" text,
	"refundable" boolean,
	"free_cancellation_until" timestamp,
	"nightly_price" numeric(10, 2),
	"taxes_and_fees" numeric(10, 2),
	"total_price" numeric(10, 2),
	"currency" varchar(3),
	"pay_now_or_later" text,
	"check_in_instructions" text,
	"special_instructions" text,
	"source_raw_payload" jsonb,
	"rank_score" numeric(5, 2),
	"rank_reasons" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hotel_bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"hotel_option_id" integer NOT NULL,
	"payment_id" integer,
	"provider" text NOT NULL,
	"provider_booking_id" text,
	"confirmation_number" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"traveler_details" jsonb NOT NULL,
	"total_charged" numeric(10, 2),
	"currency" varchar(3),
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hotel_searches" ADD CONSTRAINT "hotel_searches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotel_searches" ADD CONSTRAINT "hotel_searches_call_request_id_call_requests_id_fk" FOREIGN KEY ("call_request_id") REFERENCES "public"."call_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotel_searches" ADD CONSTRAINT "hotel_searches_proposal_id_itinerary_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."itinerary_proposals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotel_options" ADD CONSTRAINT "hotel_options_search_id_hotel_searches_id_fk" FOREIGN KEY ("search_id") REFERENCES "public"."hotel_searches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotel_bookings" ADD CONSTRAINT "hotel_bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotel_bookings" ADD CONSTRAINT "hotel_bookings_hotel_option_id_hotel_options_id_fk" FOREIGN KEY ("hotel_option_id") REFERENCES "public"."hotel_options"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotel_bookings" ADD CONSTRAINT "hotel_bookings_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hotel_options_search_id_idx" ON "hotel_options" USING btree ("search_id");--> statement-breakpoint
CREATE INDEX "hotel_bookings_user_id_idx" ON "hotel_bookings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "hotel_bookings_hotel_option_id_idx" ON "hotel_bookings" USING btree ("hotel_option_id");
