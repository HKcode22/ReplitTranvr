-- Task #88: Enforce a single normalized E.164 phone per user across all
-- traveler profiles. Uses a partial unique index so legacy rows without a
-- phone (NULL) are not blocked. Application code (server/routes.ts and
-- server/storage.ts) is responsible for normalizing input via
-- normalizePhoneE164 before insert/update so different formats of the same
-- number compare equal under this index.
CREATE UNIQUE INDEX IF NOT EXISTS "traveler_profiles_phone_unique_idx"
  ON "traveler_profiles" ("phone")
  WHERE "phone" IS NOT NULL;
