CREATE TYPE "public"."trip_request_source" AS ENUM('account', 'guest');--> statement-breakpoint
CREATE TYPE "public"."trip_request_type" AS ENUM('refund', 'cancel', 'change');--> statement-breakpoint
CREATE TABLE "trip_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"payment_id" integer NOT NULL,
	"user_id" varchar(36),
	"type" "trip_request_type" NOT NULL,
	"source" "trip_request_source" NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "trip_requests" ADD CONSTRAINT "trip_requests_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_requests" ADD CONSTRAINT "trip_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trip_requests_payment_id_idx" ON "trip_requests" USING btree ("payment_id");