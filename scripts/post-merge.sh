#!/usr/bin/env bash
# Replit source-sync hook: dependencies only.
# Never apply schema changes as a side effect of pulling/merging code:
# a production migration must be individually reviewed, bound to the
# deployed release SHA and explicitly approved before execution.
set -Eeuo pipefail
cd "$(dirname "$0")/.."
npm ci --no-audit --no-fund
echo "P25_POSTMERGE_DEPENDENCIES_READY=YES"
echo "P25_POSTMERGE_DATABASE_MUTATIONS=ZERO"
echo "P25_POSTMERGE_PROVIDER_CALLS=ZERO"
echo "P25_POSTMERGE_PAID_AUTHORIZATION=FALSE"
