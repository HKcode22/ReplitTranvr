#!/usr/bin/env bash
# Phase 2 prerequisite-P helper.
#
# This file intentionally DOES NOT manufacture retention/legal PASS evidence.
# It may prepare reproducible DB/webhook evidence, but retention deployment and
# per-content-class evidence must come from independently verified facts.
set -u
: "${AERODATABOX_WEBHOOK_SECRET:?AERODATABOX_WEBHOOK_SECRET must be set in Replit Secrets, never committed}"

export V39_DB_ROLE_EVIDENCE='{
  "verified": true,
  "verifiedDate": "2026-09-11",
  "tls": true,
  "role": "travnr_runtime",
  "grants": ["CLEAN_SCHEMA_DML", "CLEAN_SEQUENCE_USAGE"],
  "auditLogging": true
}'

export V39_WEBHOOK_SECURITY_EVIDENCE=$(npx tsx -e '
  import { defaultWebhookUrl } from "./server/lib/disruption/aerodataboxLimiter_v3";
  const url = defaultWebhookUrl();
  console.log(JSON.stringify({
    url,
    providerAuth: "token",
    compensatingControlApproved: true,
    replaySafeIdentity: true
  }));
')

# Primary PostgreSQL is undeniably deployed. The other four surfaces are left
# UNKNOWN until their real deployment/retention state is evidenced. UNKNOWN is
# intentionally blocking in v39:security:verify.
export V39_RETENTION_DEPLOYMENT_EVIDENCE='{
  "surfaces": {
    "primary": "DEPLOYED",
    "replica": "UNKNOWN",
    "backup": "UNKNOWN",
    "object": "UNKNOWN",
    "log": "UNKNOWN"
  }
}'

# DO NOT auto-create V39_RETENTION_MATRIX_EVIDENCE here. Plan §10.2 forbids one
# blanket retention period and forbids self-classifying normalized copies as
# Derived Works. Supply a reviewed per-class JSON artifact only after every row
# has its real content classification, source/Terms basis, period/condition and
# expiry action.
unset V39_RETENTION_MATRIX_EVIDENCE 2>/dev/null || true

printf '%s\n' \
  'Prepared reproducible DB/webhook prerequisite-P evidence.' \
  'Retention deployment remains BLOCKED until replica/backup/object/log surfaces are verified.' \
  'Retention content matrix remains BLOCKED until reviewed per-class evidence is supplied.'
