#!/usr/bin/env bash
set -euo pipefail

cat >&2 <<'EOF'
REFUSED:YSSY_EARLY_PILOT_EXECUTION_DEFERRED

The prior YSSY preparation path was prospectively superseded before any YSSY
paid launch.

The frozen Stage-1 window 11:00-13:00 UTC maps to 21:00-23:00
Australia/Sydney on 2026-10-02 and terminates at Sydney Airport's 23:00 local
curfew boundary.

Do not reuse:
  AUTH-20261002-P2G19
  P2G-S1-20261002-18

YSSY requires a separately frozen local-operating-hours-aware protocol before
any paid execution.

The currently intended domestic/mixed early-pilot target is SKBO after the
superseding scope amendment passes full CI.
EOF

exit 2
