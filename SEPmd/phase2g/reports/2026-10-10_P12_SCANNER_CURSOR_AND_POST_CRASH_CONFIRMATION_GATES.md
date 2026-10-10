# P12 fault replay — page-atomic scanner and post-crash DB confirmation

**2026-10-10. Isolated synthetic-only fix and scientific NO-GO.** No actual provider ingress, paid subscription, AeroDataBox credit or Replit/Cloudflare deployment was touched. This investigation branch is **not a production cutover plan**.

## Previously established underlying failure

The YSSY local disposable Postgres bridge test proved that the *synthetic edge* may preserve original raw source bytes, first-edge UTC and R2 `processed` marker while Replit's **UNLOGGED** delivery and item tables disappear after a PostgreSQL interruption. Historical edge `processed=true` is therefore not current database continuity. An old queue delivery could be ACKed despite present-day missing flight-item evidence. Earlier R2 outbox scanner also advanced its pagination cursor even when it had counted errors on the page, potentially skipping a permanently unresolved object in the source inventory.

## New isolated fix

### 1. Source page errors cannot advance the durable scanner cursor

`experiments/phase2g_cf_sandbox_ingress/worker.ts` now treats a scanner **page** as the smallest safe advance unit. Every page records its starting errors; failed `get()`, corrupted index or original raw SHA, malformed processed marker, unavailable downstream current-state proof, or failed Queue `send()` prevents the page's cursor from advancing. Earlier fully processed pages may remain checkpointed; at-least-once repeated enqueue is expected. The persisted CAS scanner checkpoint and readback still fail closed if R2 checkpoint persistence fails.

Regression fixtures place 101 original receipt indexes across **two** scanner pages; the first 100 are processed. One deliberately corrupted later original or failed Queue send means no false forward checkpoint; after repair the next scanner resumes on the **same** 101st source, rather than skipping it. The existing 351-index multi-page scanning test still requires coverage of the 351st orphaned original.

**Important operational limit:** A persistently poison/corrupted source can block an affected page indefinitely. That is intentionally safer than silently claiming complete recovery; production needs an alert and explicitly adjudicated DLQ/retention, not an unrecorded cursor skip.

### 2. Historical `processed` marker is insufficient for Queue ACK or scanner skip

A new **test-only** `/__p2g-sandbox-confirm` request does not POST provider bytes again. It sends a signed original receipt identity (`sessionId,receiptId,providerAttemptId,sourceSha256,edgeReceivedAtUtc`) and requires a **fresh current SQL-science persistence confirmation** with an exact echoed source identity. A false or stale/mismatched response triggers Queue `retry()`; scanner treats it as unresolved and stops cursor advancement. The original R2 receipt/raw bytes are preserved.

In the actual disposable V3.9 SQL bridge, the fake receiver's confirmation queries current local flight-item existence **without attempting a replay**. After deleting the disposable UNLOGGED runtime rows while preserving its original edge receipt and marker, Queue redelivery **cannot ACK** anymore. It retries; that is a scientific CENSOR/UNRESOLVED signal, *not* evidence that missing flights have been automatically reconstructed.

A forged positive confirmation with an incorrect receipt ID is also rejected, as are index records where receipt ID does not recompute from the original session+attempt, or whose R2 raw-object key does not match the original source SHA.

### 3. Strictly synthetic: endpoint not deployed

The new `/__p2g-sandbox-confirm` interface exists only as a mocked test contract. It **does not exist on actual published Replit**. It is not an authenticated live source receipt or a production-current evidence guarantee. Failure to reach it is **retry, not ACK**, and without an implementation it cannot restore data or satisfy P12. Receiver DB epoch binding, network/cold-start tail latency, cost/billing, 168h retention and external provider-source proof all remain separate hard gates.

The test-only Worker still refuses actual provider mode and restricts delivery to its `/__p2g-sandbox-verify` endpoint. **Never point it at a real prepaid subscription**, and never loosen actual frozen `maxDeliveryRetries=0`.

## Test and release check

- Offline Worker tests now include a second-page corrupt receipt, later Queue outage recovery, forged index identity, historical processed marker with missing current downstream DB state, forged positive current-state response, and 351-source checkpoint coverage. The local SQL bridge also checks that the same processed marker surviving UNLOGGED loss leads to retry rather than ACK.
- CI must be **COMPLETED SUCCESS in both jobs** before this report can assert full validation. Current test-only implementation is on `phase2g-p2g24-github-observer-20261009`; previous run [#38093708703](https://github.com/HKcode22/ReplitTranvr/actions/runs/38093708703) validated the page-atomic scanner and forged index contract, before adding current-state confirmations. Record exact final run SHA and passing case counts separately once verified.

## Real P09–P20 paid blockers

The connected Cloudflare account had **zero Queues and R2 disabled** on its last read-only check. No approved external 168-hour durable ingress/complete original wire archive exists. A free Queue's 24h retention alone cannot prove 7-day originals. No real AeroDataBox independent billable attempted-delivery ledger, publisher receiver authenticated source UTC, published 120-minute wall-clock zero-provider R0–R11 failure rehearsal or exact owner/build/secret continuity has been verified. The locally proven synthetic 120-delivery flight recovery intentionally remains quarantined and uses a LOGGED full-row fixture that **must not** be copied to production due to V3.9 privacy/PITR constraints.

The user's chosen **6 primary + 6 conditional backup health checks** are only test candidate. Live paid supervisor **still uses 3 consecutive failures at 15s nominal cadence**, and provider delivery retries remain **zero**. Changes to the stop rule need a prospective scientific amendment, proof of non-random missingness and full original 8×15m observation window, plus explicit current authorization.

**YSSY paid Sunday October 11 20:00 PDT / Monday October 12 03:00 UTC — NO-GO.** Do not reclassify censored P2G24, execute a new paid subscription or silently infer actual provider credits from synthetic counters.
