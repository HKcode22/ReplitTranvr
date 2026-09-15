#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

npx tsx scripts/v39_phase2g_preflight_v39.ts \
  --smoke artifacts/v39-phase2-safety-smoke-AUTH-20260915-P2F095554-20260915T100325Z.json \
  --smoke-runtime-file artifacts/phase2f-smoke-runtime-20260915T095554Z.json \
  --smoke-runtime-sha 58dbadb53bedc27dbaa236d020e21e7059470dd5ba0d10594475c5af2429d232 \
  --expected-handoff RUN-20260915-D61659402642563B6FEDF2AAA981474838BF088B67526528426F9702509C9D1B \
  --preprobe artifacts/preprobe-reference-freeze-record.json
