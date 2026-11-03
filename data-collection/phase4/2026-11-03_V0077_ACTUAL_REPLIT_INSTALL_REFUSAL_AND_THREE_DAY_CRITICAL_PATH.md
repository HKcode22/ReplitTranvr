# Phase4 Gate5 — real Replit V0077 installation refusal, narrowed diagnosis and original science path

**2026-11-03 Pacific.** Owner completed exactly the reviewed detached worktree command on GitHub `a14554729ed36efe96c1ceea479be1b20f3b33ee` with source V0077 staged Git blob `6783468fccf32de571e7ea77671db7370d9d87a4`. User's final line:

```text
P4_G5_V0077_INSTALL_HOLD_NO_PROVIDER
```

The source invocation/branch/BLOB/env presence checks passed, a temporary worktree was prepared, Node emitted a **generic SSL mode compatibility warning** and the installer **refused**. **No evidence of a successful V0077 production installation** and no provider call from this script. The SSL warning alone is not proof of the failure's cause. Prior entrypoint intentionally suppressed all non-SQLSTATE causes under the same generic HOLD; neither infer an ACL failure nor claim a complete DDL rollback solely from the generic message. Any DB transaction is coded to roll back on exception, but an exception during/after COMMIT could leave the installation state uncertain without a new read-only catalog inspection.

New `scripts/v39_phase4_gate5_v0077_readonly_failure_diagnosis.ts` reads only PostgreSQL catalogs over the **existing configured** privileged and distinct restricted runtime URLs, inside two `REPEATABLE READ READ ONLY` transactions. It emits only safe flags (never role names, DB name, hosts/URLs, raw SQL exception DETAIL, FIDS flight identifiers or original Content). It differentiates:
- live PG16 parent V0076 or `clean.fids_query_response` absent
- different science database, same role or wrong privileged/restricted schema CREATE grants
- V0077 already fully present with **private** runtime role access
- V0077 fully present but unexpected runtime privileges
- partial V0077 table/trigger schema
- safe one-time empty V0077 installation candidate
- labeled SQLSTATE/admin/runtime connectivity failure, no raw secret-containing message

There is no production DDL/writes, paid GETs, account quota consumption, or original Content read. New offline tests and real disposable PG16 workflow exercise before and after the exact V0077 installer. The original installer now displays only **whitelisted internal HOLD codes** or safe SQLSTATE; arbitrary exception messages remain hidden.

**Operator action:** after exact-head checks green and merge, use **one** short pinned diagnostic command in the Replit shell and paste only the JSON output. Do **not** rerun the same installer blindly. Depending on the result, fix only the actual issue, independently verify successful/partial installation, and authorize exactly one reviewed non-time-sensitive migration if still missing and appropriate. No secrets, manual clock triggers, Cloudflare, Replit AI Agent, or unnecessary provider queries.

## Why T−24h/T−6h/T−90m were already done

November 2 WSSS 3+3+3 FIDS physical GETs **completed** with 18 provider REST units and source-only audit. That operational achievement remains valid. They intentionally did **not** persist the original per-flight provider Content/qualified operating-leg population, nor the contemporaneous T−24/T−6/T−90 PRE and webhook/POST flight-level linkage. Their observation count is **not** a unique physical-flight denominator. An expired original or missing PRE cannot be reconstructed from its later metadata/hash and called historical science.

**Do not automatically repeat the nine physical requests.** First maximize what lawful existing metadata proves, and complete original f.8 §1.9. If a new real prospective test is scientifically indispensable, schedule **one** future source→PRE→POST cohort, not another source-only pilot, with the frozen GitHub-only owner, verified rights, budget/STOP, explicit field-specific target uncertainty, true snapshot timing, and independent audit.

## Strict critical path to November 6 priority, without fake PASS

1. Finish V0077 private schema diagnosis / bounded installation only if missing; evidence not assumed from generic error.
2. Wire one reviewed producer GitHub horizon owner to actual V0076/V0077-bound lawful provider original and physical-leg population. Receiver semantics and current rights must be documented; no indefinite support-email wait, but no unauthorized storage.
3. Persist on-time as-of T−24h/T−6h/T−90m PRE for eligible verified physical flights; do not require webhooks or optional weather to create PRE.
4. Independently classify exact subscribed webhook inside, outside observed source, unresolved/collision/duplicate, missing; POST actually observed vs estimated/proxy/censored/not-applicable; AIRBORNE nested funnel and feature/target missingness.
5. Compute source age, denominator and strata by airport/tier/region/UTC/carrier/route/tail, bias/sensitivity and legal TTL/spend checks. Issue a reproducible independent PASS or clearly bounded HOLD from **real cohort measurements**, not green tests alone.

Three-day target is an **engineering priority**, not permission to misstate actual historical evidence. The binding Plan f.8 and hash-locked Implementation Log **remain unchanged**.
