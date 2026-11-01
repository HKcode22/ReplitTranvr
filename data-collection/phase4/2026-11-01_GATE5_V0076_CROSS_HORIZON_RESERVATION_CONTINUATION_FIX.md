# November 1, 2026 — V0076 cross-horizon reserved-unit admission regression

**Phase 4 Gate 5, Plan f.8; scientific HOLD.**

## Actual issue found

The durable prospective PREPARED staging code introduced in PR #316 imposed `reserved_units=0` on every newly staged owner. That is only true before any physical paid FIDS attempt. Once the T−24h owner reserves its first nonrefundable 2 API units in V0076, that overly strict requirement would refuse staging the independent T−6h and T−90m owners in the *same frozen cohort*, even if the remaining project budget is adequate. It would recreate the missed-horizon problem as a software failure.

## Fix and proof scope

The stage now requires that the existing cohort budget has the **same manifest and exact frozen ceiling**, that the reserved total is a safe nonnegative integer no greater than the ceiling, and that there is no foreign manifest. It does **not** reset, modify or refund `reserved_units`, authorize another physical attempt, or bypass the serializable V0076 reservation function. Remaining source query max 3 attempts, 2 API units/attempt and hard physical cutoff still gate actual spend. Query idempotence is unchanged.

Vitest covers positive already-reserved 18-unit continuation and rejects 55 reserved against the 54-unit synthetic frozen ceiling. The disposable PG16 main-push workflow stages the synthetic T−24h owner (and identical replay), then **simulates** two reserved units by updating only its temporary disposable test database, then stages T−6h and T−90m (and replays). Its expected status becomes: 1 synthetic cohort, 3 PREPARED owners, 9 query rows, 0 ACTIVE owners, 0 actual physical attempt records, **2 simulated previously reserved units**, 0 provider calls. This is explicitly NOT proof of any actual paid GET, provider billing or real GitHub prearm, nor a viable reason to activate.

The live production V0076 installation and four-table restricted-role isolation remain independent of this software-only fix. In particular the GitHub worker still has **no** V0076 table rights and no execute privilege on the reservation function. Rights/semantics issues #200/#300 and the full prospective Gate5 cohort #293 remain unresolved. No Cloudflare/Replit scheduling and no new Replit command.

**Strict Gate 5 HOLD, Phase 5 FREEZE HOLD, Phase 6 NO-GO.**
