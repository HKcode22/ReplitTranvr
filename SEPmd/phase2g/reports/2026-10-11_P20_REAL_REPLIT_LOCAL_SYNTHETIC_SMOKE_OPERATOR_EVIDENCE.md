# P20 — Actual operator Replit Shell isolated localhost synthetic smoke PASS

**Observed:** October 11, 2026 UTC (operator-pasted output; command itself does not print absolute UTC execution time). Do NOT confuse the 1.218-second smoke with the two-hour actual hosted replay or with real public AeroDataBox paid callbacks.

## Exact execution context

Operator in the original primary `~/workspace`:
1. Fetched GitHub branch `phase2g-p2g24-github-observer-20261009` without overwriting the current manually repaired Replit checkout.
2. Created a **detached** Git worktree at `/tmp/p2g-p20-30-513` with exact commit `deafa972a1a3d91a35831ce08ad87a1274ea7232` (short `deafa97`). Symlinked existing workspace `node_modules` only.
3. Invoked `experiments/phase2g_rehearsal/synthetic_replit_local_wallclock_v39.ts --smoke` with `env -i` retaining only PATH, HOME, TMPDIR=/tmp and `P2G_LOCAL_SYNTHETIC_ONLY=YES`. No AeroDataBox key, production Postgres DSN, existing App Storage bucket credentials or callback secret was forwarded to the child process.
4. Original sender and receiver communicated **only over 127.0.0.1 HTTP**. The fsynced synthetic first-hop spool and replay were run inside existing Replit workspace compute; there was no new published host, billable subscription, provider POST or production scientific dataset change.

## Operator-pasted exact result

```json
{
  "schema": "v39.p20-local-wallclock-synthetic.v1",
  "mode": "SHORT_LOCAL_SMOKE",
  "elapsedSeconds": 1.218,
  "plannedSeconds": 1.2,
  "syntheticSenderAttempts": 8,
  "syntheticSenderTimely202": 8,
  "syntheticSenderFailedOrLate": 0,
  "receiverUniqueOriginals": 8,
  "receiverRejectedDuringOutage": 2,
  "sourceReceiptsVerified": 8,
  "eightElapsedWindowBins": [1,1,1,1,1,1,1,1],
  "originalSpoolAuditPassed": true,
  "allLocallySentSourcesReplayedExactly": true,
  "localRuntimeResult": "PASS_LOCAL_ONLY",
  "evidenceDirectory": "/tmp/p2g-wallclock-synthetic-fVP9cU",
  "publishedHttpsIngressProven": false,
  "providerSourceIdentityAuthenticated": false,
  "scientificFlightPhysicalV2Proven": false,
  "originalProviderCreditsUsed": 0,
  "productionDatabaseReadOrWrite": false,
  "liveSixPlusSixEnabled": false,
  "paidYssyGoAuthorized": false
}
```

**P20 subgate result:** The actual operator's Replit runtime (not merely GitHub Actions) successfully executed local eight-bin synthetic HTTP sender → fsynced source receipts → simulated local receiver interruption → exact replay, with eight timely 202, no sender failure or delay, 8/8 receipt and original hash rechecks, zero provider calls. This is first actual **Replit Shell** evidence for this smoke. The `receiverRejectedDuringOutage=2` counts fake receiver 503s, not missed AeroDataBox source notifications; direct initial source acceptance was 8/8. Any duplicate/lost source from frontdoor downtime remains outside this test.

**What remains unproven:** full 7200 elapsed seconds, 120 minute-spaced source attempts, two **actual 3m** receiver outages, measured 10s deadline under a realistic heavy callback load, public published `/api/v1/webhooks/aerodatabox/.../prepaid/...` path, Replit Autoscale cold start to original HTTP POST, literal provider original wire vs canonical JSON, original AeroDataBox sender/billed attempt census, real v2 semantic PostgreSQL storage and delayed runway outcomes, historical 260/259 and any paid GO. The locally generated evidence directory holds **synthetic-only** artifacts on ephemeral `/tmp`, not long-lived independent hosting or provider data. Neither 120min nor public POST has been run by this smoke.

**Next scientific and operational action:** inspect and harden long-run acceptance (require actual outage episodes/rejections and eight bins), run the separate opt-in `--full-120m` only if current Replit account usage/billing is acceptable, and preserve progress/last result. The long runner is still localhost and cannot alone resolve P09 independent first-hop or P14 upstream cost ledger. No paid stage-1 YSSY permission is granted by P20 smoke success.

Continuity sources: [P01–P20 ledger](2026-10-10_P01_P20_SUNDAY_YSSY_RELEASE_LEDGER_AND_ZERO_CREDIT_COMMANDS.md), [operator+assistant 6+6 & truthful partial-science decisions](../decisions/2026-10-11_YSSY_6PLUS6_SCIENTIFIC_MISSINGNESS_DECISION_RECORD.md), [P18 published GET evidence](2026-10-11_P18_ACTUAL_PRIMARY_TRAVNR_PUBLISHED_GET_RUNTIME_AND_SOURCE_COMPARISON.md), [draft PR #27](https://github.com/HKcode22/ReplitTranvr/pull/27).
