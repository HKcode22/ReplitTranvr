# P09/P15/P18/P19 — user proposed 3 Replit endpoints plus six primary + six emergency recovery

Date Oct 10 2026 PDT. **Design-only / draft research. No provider calls, subscriptions, refills, domain provisioning, Replit imports, third account creation, production DB writes, deploys, Cloudflare or merges.** Retain preexisting scientific F.8 and frozen historical P2G22/P2G23/P2G24 outcomes, including unexplained P2G22 externally billed 260 vs internal 259.

## Confirmed historical Replit receivers (read-only)

1. Current primary `https://replit-tranvr--hk84164.replit.app` — user-controlled hk84164 published ReplitTranvr app, Replit publish status SUCCESS. This is the current Stage-1 published callback, not evidence the latest isolated draft commit is deployed.
2. Teammate Almabdella app `Travnr-Environment-Setup.zip` — Replit app ID `95ac2e69-854d-460f-8e9d-8e4711aef739`, formerly used temporary development callback `https://95ac2e69-854d-460f-8e9d-8e4711aef739-00-265uxlvlm69md.kirk.replit.dev`. Replit reports an existing successful published deployment at `https://travnr.com`. User historically had Editor access, NOT the app owner/publisher right to republish old code. No live code-hash/raw POST/secret/database/bucket test of Almabdella made in this review; **travnr.com must not be treated as a validated standby**.
3. Third hypothetical new Replit app/account — does NOT exist. Could import the single frozen `HKcode22/ReplitTranvr` source commit directly from GitHub after authorization; **no manual file-by-file copy** is required. Importing source does **not** import/reveal production credentials, permissions, App Storage bindings, published runtime, public URL or production scientific access. A separate Replit account may increase billing and prevent default access to hk84164's bucket.

## Hard provider routing finding

Actual `server/lib/disruption/prepaidProbeWindow_v39.ts` calls `createSubscription("FlightByAirportIcao", icao, {url:webhookUrl,maxDeliveryRetries:0})` with **one pinned URL**, incorporating the exact per-session UUID. `server/lib/disruption/aerodataboxLimiter_v3.ts` passes that URL in the single-subscription body. AeroDataBox's current guide documents one callback URL per subscription and up to two **explicit, separately billable same-URL retries**. The documented operations list subscribe/GET/list/DELETE, NOT a validated seamless transfer of an existing subscription to another URL. Changing the callback URL mid-window by deleting/recreating a subscription breaks frozen single-owner/session/source-lifecycle comparability and risks a gap, duplicated sends and unbounded credit attribution. No automatic redirect from main `hk84164` to Almabdella is performed by a GitHub health check; the HTTP sender has already targeted main.

Three **parallel** subscriptions to the same airport/subject would typically multiply original provider sends/credits (potentially about 3x, load and billing details dependent), contradict current single-subscription, max-500-credit/day freeze; do NOT do this.

A reverse proxy/front door **inside the primary Replit app** also fails precisely when primary ingress is unavailable. To fail over incoming POST transparently, the provider must be bound to ONE **stable external HTTPS front door independent of primary app**, which routes to exactly one healthy backend, verifies original body durability and UTC before 2xx, and completes within the sender's ~10s HTTP timeout. Such a front door is **not currently deployed or approved**. DNS failover or a custom domain can be considered as a design alternative, but caching, health checks, provider HTTP timeout, common Replit outages, costs and exact source proof must be measured; merely naming three domains does not solve routing.

## Shared Neon PostgreSQL is NOT sufficient alone

Earlier setup uses same independently hosted external Neon PostgreSQL scientific database for Almabdella and hk84164. Replit published apps need exact identical session DB binding, LOGGED vs UNLOGGED lifecycle, unique delivery identity, same secrets, no duplicate paid owner, migration/schema parity, and a proven transaction/idempotency strategy under **concurrent** received POST. hk84164 uses separate Replit App Storage raw bucket. Existing `ReplitProviderBlobStoreV39` requires explicit `V39_PROVIDER_BLOB_BUCKET_ID`, no fallback. Original source blob read-back and 168-hour retention must be available across whichever receiver owns the delivery; other-account replicas have no automatically proven bucket permission. Shared DB rows without source object access can cause false 2xx or unrepairable metadata. Replit App Storage docs support **explicit app-to-app bucket access** within configured permissions, not an assumption the third email/account can access old sensitive source.

All three deployed apps depend on Replit infrastructure: redundancy across Replit accounts is NOT guaranteed failure-domain independence during platform-wide incidents.

## What was implemented (draft / synthetic only)

- `experiments/phase2g_rehearsal/synthetic_three_replit_failover_feasibility_v39.ts` evaluates 4 layouts: direct 3 public URLs (no failover); 3 separate paid subscriptions (duplicate billing); delete/create at failure (scientific discontinuity); hypothetical one stable front door to 3 published owner/secret/DB/storage-matched receivers (eligible **only for no-provider-credit rehearsal** after all proofs, not paid GO).
- 12 adversarial offline tests verify fixed provider binding, delayed 10s ACK, missing stable ingress, unpublishable legacy dev URL, cross-app missing blob, duplicated billing, improper owner, correlated platform outage and false URL-as-db path.
- `experiments/phase2g_rehearsal/synthetic_six_primary_six_emergency_v39.ts` is a NEW *hypothetical* risk model reflecting user's distinction: first **6** transient health GET misses with prospectively approved blind-credit ceiling; 7th–11th emergency monitoring allowed **only** with verified independent original provider per-attempt cost/source receipts, intact 8 frozen clock bins/replay, and bounded backlog; 12th stops. Any hard auth/identity/source violation, known credit gap, owner conflict, exposure ceiling violation or >=180s wall forces immediate STOP. Healthy GET recovery is not proof of paid original source completeness.
- 11 offline tests check 6-primary candidate, source-gated emergency checks, owner/credit hard stops, 180s ceiling, missing certified original data, healthy GET not a science pass.
- Both evaluators **always** set paid launch authorization false, original F.8 pass false. This change does NOT override real `v39_phase2g_stage1_logged_supervisor_v39.ts`, which still defaults to 3-strike and refuses selected six-plus-six-candidate prelaunch until independent source verifier exists.

The desired interpretation — "the first 6 should replace the 3, and another 6 only if needed" — is technologically feasible as a *future* **paid health watchdog policy** with explicit cost exposure and different science-result labels, but not an automatically safe webhook preservation solution. 6 first checks over 15s intervals span ~75s between first and sixth failed probe; 12 failures span ~165s, bounded also by 180s wall. That is not an original-webhook retry schedule and **does not guarantee <2.5% item loss** or any recovered message.

## Important sources

- AeroDataBox 2026 API guide: https://aerodatabox.com/flight-alert-api-2026/
- Replit development vs published domains: https://replit.com/blog/hosting-changes and https://replit.com/products/deployments
- Replit App Storage cross-app grant: https://docs.replit.com/references/data-and-storage/object-storage
- Replit import existing GitHub repo: https://docs.replit.com/build/welcome
- V3.9 repo source `server/lib/disruption/prepaidProbeWindow_v39.ts`, `aerodataboxLimiter_v3.ts`, `replitProviderBlobStore_v39.ts`, exact frozen main + draft separate.

## Acceptance dependencies and next permitted work

1. Confirm reproducible route/source/storage parity of proposed Almabdella published app with teammate's explicit permission and zero paid source.
2. Verify a stable front-door architecture, operator control, billing, 10s worst-case sender ack and independent original source retention *without Cloudflare*, BEFORE any routing/provider/subscription change. The candidate third account is optional and likely cannot solve a platform-wide outage.
3. In isolated synthetic systems, test the chosen pre-approved 6-primary then source-verified six-emergency cost/risk vs historic 3-strike and report scientific completeness separately. Separate bounded-censored exploratory data from original full-window PASS.
4. Keep independent original provider billing source 260/259 reconciliation, P13 crash restoration, release SHA, signed source UTC and true hosted two-hour synthetic rehearsal mandatory; no paid YSSY launch unless prospectively approved.

**No cloud / paid traffic / build deployment / main merge.**
