# October 27 WSSS Gate05: confirmed UNLOGGED session reset and one-source pre-CREATE fix

## Live read-only forensic receipt

User executed `GATE05_CALLBACK_DIAGNOSIS`, output observed `2026-10-28T02:58:27.338Z`.

```json
{
  "owner": {
    "state":"PREPARED","airport":"WSSS",
    "source":"1885703c04ba8f24bf8d1183f873eb86d1f83d7c",
    "providerIdPresent":false,
    "startUtc":"2026-10-28T03:00:00.000Z",
    "stopUtc":"2026-10-28T04:00:00.000Z",
    "expiresUtc":"2026-10-28T04:20:00.000Z"
  },
  "callback":null,
  "database":{
    "server_started":"2026-10-28T02:50:50.638Z",
    "database_name":"neondb",
    "session_persistence":"u"
  }
}
```

The live PostgreSQL server started at 7:50:50 PDT **after** the ~7:15PM successful commission that inserted `clean.prepaid_probe_session_runtime` and before the paid preflight. The UNLOGGED row is missing while the signed LOGGED owner remains PREPARED. This strongly supports unlogged crash/recovery truncation as the missing-callback root cause, but does not establish what triggered the PostgreSQL/Neon restart. The paid one-use operator failed closed `PREPAID_NEW_CALLBACK_SESSION_NOT_ARMED` **before** provider CREATE (`providerCreateWasAttempted=false`, `positiveExactProviderIdKnown=false`, `databaseCommitMayBeAmbiguous=false`); do not claim paid charge/scientific PASS or a settled provider balance without a fresh account readback.

The original exact signed scope `98bbf760-6211-4eaa-908c-240be91e7b0d`, 8:00–9:00PM PDT, **has an immutable T+15s launch cutoff**, which expired. **DO NOT EDIT THIS OWNER'S FROZEN WINDOW, BYPASS IT OR RUN AN OLD PAID COMMAND.** Independent protective STOP #40623244833 was in progress at 8PM but is not evidence of Alert CREATE; once its final terminal safety/account outcome is independently verified, close this old scope with an immutable no-provider failure receipt and prospectively issue a new one under the **previously granted, unspent** 500 Alert-credit / 12 REST unit one-pilot approval. No blind rerun of original commission (V0074 was actually applied).

## Source remediation proposed in this PR (NO provider operation, NO live deployment)

- `server/lib/disruption/gate05PreparedCallbackRestartRecovery_v39.ts`: a **strict no-paid helper** that can reinsert the **exact SAME UUID** into transient UNLOGGED callback session **only** when: LOGGED Gate05 owner is PREPARED, exact WSSS/signed source/auth/STOP ticket/500-350-12/frozen 60-minute times, owner has no provider subscription; `pg_postmaster_start_time()` newer than LOGGED owner created time; UNLOGGED table is genuinely empty for exact session; no prior raw-provider webhook blob evidence; operator already verified real independently running exact owned GitHub STOP, zero account active subscriptions, unchanged provider balance and published runtime database & webhook-secret HMAC binding. Allowed only inside T−10min to T−30sec. Explicit BEGIN, LOGGED owner FOR UPDATE, exact INSERT, readback before COMMIT and after COMMIT. Ambiguous COMMIT never licenses CREATE/retry. If window expired, foreign active, previously billed, or owner not PREPARED, **NO REARM**.
- `scripts/v39_gate05_science_one_paid_create_once_v39.ts`: when the row is missing, requires positive live GitHub STOP, strict free provider account stable and actual published DB binding before calling helper; then checks row again immediately before paid CREATE. No provider CREATE extra attempts and original one-shot intent remains the only remote paid mutation.
- Offline tests exercise valid post-restart recovery, fail-closed active/failed/settled owners, foreign provider / unknown balance / missing independent STOP, wrong start window, prior provider custody, existing runtime identity, last-moment second crash reset and raw-first semantics.

**Important scientific limitation:** restoring a PREPARED session **before the first provider CREATE** is safe and preserves its old identity, but this helper does **not** repair loss of transient records from an ACTIVE already-billed pilot; that needs a separate independently reviewed active-source recovery or immediate exact STOP+missingness incident. A 60-minute sample with a mid-flight restart or true missing milestone cannot be called PASS merely because a session was rehydrated. Preserve no false provider hard 500-credit cap; the STOP at 350 is an early warning with 150 risk reserve, not guaranteed provider-enforced limit.

### Follow-up exact execution ordering

1. Wait for the original STOP's verified terminal state and confirm no active owned/foreign provider subscription and actual account balance. Since no CREATE was attempted, the billed total should remain unchanged, but **measure rather than presume**.
2. Close original LOGGED owner FAILED with immutable science/evidence SHA, no invented lost provider rows; do not re-run original one-use scope or edit time.
3. Produce a **new** exact single-airport WSSS prospective scope, fixed >=60min and independent protected STOP run, preserving the already-approved one-pilot total spend budget and no refill. The old `v39_gate05_science_owner_commission_no_provider_v39.ts` rejects previously installed V0074, so needs a **new reviewed already-migrated-schema commissioning operator**; original shell command must not be repeated. Avoid 40m old FIDS-only operator.
4. For any future pilot if Neon postmaster resets after new commission but before CREATE, the updated paid code restores the exact unbilled owner only with independent factual guards; freeze scientific minima; record restart as known infrastructure missingness, do not label estimated runway as actual.
5. After independent STOP ARMED, make at most **one** paid CREATE for fresh approved window; then collect same-cohort PRE/POST REST, monitor 60min and adjudicate strict f.8 physical legs/native T/runway reality and true source missingness.

No Replit AI Agent, Cloudflare, source changes to historical V0074/implementation custody, or provider support email prerequisite.
