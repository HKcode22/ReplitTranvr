# P25 — two-hour no-provider rehearsal, evidence boundaries and run authority

**Target paid YSSY:** Monday October 12, 2026, 20:00–22:00 PDT = Tuesday October 13, 03:00–05:00 UTC. This document authorizes NO paid provider calls or staging/cloud provisioning. It is supplemental *engineering* evidence, not an amendment waiving full F.8 science, receipt completeness or the one-shot protected budget.

## Existing real-wall-clock LOCAL harness (ready to run with zero provider)

Use **unchanged draft PR27** `experiments/phase2g_rehearsal/synthetic_replit_local_wallclock_v39.ts --full-120m`. It uses 127.0.0.1 synthetic sender→fixed fsynced local frontdoor spool→synthetic backend; a real monotonic **7,200,000 ms** runtime, 120 attempted test sources, two deliberate ~180-second receiver outages, local 503s, backend replay, original object hashes, and two-hour progress receipts. No AeroDataBox, external webhook, live PostgreSQL or live object store. It requires `P2G_LOCAL_SYNTHETIC_ONLY=YES`, and fails if paid-provider, production-DB or provider-bucket environment variables are present. `--smoke` is a 1.2-second demonstration **and is not a full rehearsal**. Even if full mode reports `PASS_LOCAL_ONLY`, its fields must keep `publishedHttpsIngressProven:false`, `scientificFlightPhysicalV2Proven:false`, `paidYssyGoAuthorized:false`; do not promote to hosted-production PASS.

Suggested isolated Replit Shell command (one time, from clean `~/workspace`):
```bash
set -Eeuo pipefail
cd ~/workspace
git fetch origin phase2g-p2g24-github-observer-20261009
STAGE="$(mktemp -d /tmp/yssy-p20-local-120m.XXXXXX)"
git worktree add --detach "$STAGE" origin/phase2g-p2g24-github-observer-20261009
ln -s "$PWD/node_modules" "$STAGE/node_modules"
(
 cd "$STAGE"
 env -i HOME="$HOME" PATH="$PATH" P2G_LOCAL_SYNTHETIC_ONLY=YES \
  node --import tsx \
  experiments/phase2g_rehearsal/synthetic_replit_local_wallclock_v39.ts \
  --full-120m
)
```
Keep the full stdout + retained `P20_LOCAL_ONLY_RESULT.json` evidence. Do not claim the run passed until it truly runs 120 elapsed minutes. Replit Shell/process persistence is not guaranteed; if the process dies prematurely, outcome is FAIL/INCOMPLETE.

## True HOSTED published-equivalent 120-minute rehearsal (not ready / needs isolated environment)

A local loopback test is **not** proof of Replit Autoscale published ingress. The separate hosted test needs a **distinct HTTPS staging receiver** running the exact reviewed callback-only source, backed by an **isolated disposable PostgreSQL 16 database** and **isolated object-store bucket** (never the paid production database/bucket, never use AeroDataBox API key/subscribe). A staging hostname alone is not proof of isolation. The operator must verify deployment source tree, real database identity, object bucket identity, staging webhook secret and incremental hosting/storage cost **before** provisioning or sending synthetic POSTs. No Cloudflare provisioning was authorized or requested.

The actual hosted load must use an independently frozen, variable-rate sender-manifest signed BEFORE start (not a fabricated one-per-minute provider requirement), compare original source raw SHA/bytes and per-attempt IDs with receiver-side durable objects and exact 2XX timing, test 8-second admission and provider's 10-second maximum, and use real 120-minute wall-clock owner/receiver per-minute health witnesses. The observed webhook count may vary; do not require 120 real provider notifications or 15 in each 15-minute bucket. The 15-minute flight-science buckets remain governed by the frozen collection plan, not by synthetic load rate.

Faults R0–R11 as relevant: idle startup/cold start, wrong-secret 404, signed nonempty HTTP 200, duplicates, concurrent bursts and big 1.8/5.8/21.7KB originals, SQL contention, object-store readback error, lost/late ACK, DB SIGKILL and UNLOGGED reset, two 3-minute health interruptions under 6+6, exact tail/physical-v2 code-share quarantine, cleanup/receiver replacement. A planned fault is not counted as PASS merely because it was named; record actual injections, monotonic duration and expected fail-closed outcome. No attempt to artificially force healthy ACKs when source is not durable.

PASS must require independent preplanned attempted SEND vs actual HTTP ACK records, received exact SHA/bytes durable readback, no unexplained synthetic attempt-credit delta, 168h source-retention *contract* plus meaningful readback (120-minute observation cannot prove 168h actual elapsed retention), start/end monotonic 7200 sec (<=30sec completion tolerance), no background cloud/provider cost, zero real provider units, isolated cleanup with no orphans, and one signed report. Any unaccounted source send or ACK after deadline => FAIL/CENSORED, not sanitized success.

**Dependencies to launch the hosted rehearsal:** final PR35 source tested, actual separate staging endpoint and isolated PG/bucket verified, account cost=0 incremental documented, operator approval of any real staging resource changes. It can run concurrently with remaining paid-release preparation, but should finish with time to inspect errors before the October 12 paid window. A 120-minute local-only test does not replace this hosted one.

## PAID YSSY remains separate

At final paid start, require one exact approved source-bound AuthRecord + ledger, no active billable subscriptions, 1000 credit floor/500 ceiling, old P2G24 budget correctly quarantined under separate explicit operator consent (never fabricate null credits), exact published SHA matching GitHub paid owner, new signed original callback receipt, and actual `PASS_READY_FOR_PAID_STAGE1`. Extra engineering rehearsal by itself is not paid GO and cannot prove AeroDataBox upstream sender completeness.
