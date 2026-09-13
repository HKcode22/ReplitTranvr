#!/usr/bin/env bash
# V3.9 prerequisite-P bootstrap guide.
#
# This helper intentionally does NOT fabricate evidence or provider authority.
# It prints the exact safe setup sequence for the current Phase-2 architecture.
set -euo pipefail

cat <<'EOF'
V3.9 Phase-2 prerequisite-P bootstrap (no provider calls):

1. Ensure the production owner DATABASE_URL is available to the shell.
2. Provision/reconcile the least-privilege runtime role:
     npx tsx scripts/provision_runtime_role_v39.ts
   This writes V39_DATABASE_RUNTIME_URL and V39_DB_ROLE_EVIDENCE to ignored .env.

3. Set V39_PUBLIC_WEBHOOK_BASE_URL to the actual HTTPS deployment origin
   (Travnr production is https://travnr.com), then run:
     npx tsx scripts/configure_webhook_evidence_v39.ts
   This creates/keeps the webhook secret and writes no-secret webhook evidence.

4. Create/select a DEDICATED Replit App Storage bucket in the App Storage tool.
   Put its exact Bucket ID in V39_PROVIDER_BLOB_BUCKET_ID. Do not use an
   implicit/default bucket. Set V39_PROVIDER_BLOB_MODE=required.

5. After the owner reviews/approves the already-supplied 168h raw / 24h FIDS
   entitlement and the isolated storage topology, prepare machine evidence:
     npx tsx scripts/prepare_phase2_p_evidence_v39.ts --owner-approved
   Destructive retention remains unarmed (0).

6. Apply migrations with the owner connection, then run the live P verifier:
     npm run v39:security:verify
   It independently verifies the DB role, HTTPS webhook, UNLOGGED tables,
   safe logged constraints, no unresolved incident, and performs a synthetic
   dedicated-bucket write/read/delete/absence test. Only then can it record P.

No AeroDataBox paid request, subscription, FIDS call, refill, smoke or probe is
performed by steps 1-6.

The old full V39_RETENTION_MATRIX_EVIDENCE belongs to later Phase-6 retention
closure and is deliberately NOT prerequisite-P.
EOF
