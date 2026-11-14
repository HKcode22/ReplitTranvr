# Phase 6 — restricted signed later PRE to ORIGINAL Stage14 gate (NO GO)

**Written 2026-11-13 PST / 2026-11-14 UTC.** No production SQL, no paid provider, no GitHub child dispatch, no new DB or login, no fabricated native flight, no phase5 scientific freeze or Phase6 GO.

## Specific need
SOURCE now has merged #653 code to verify a private query against its signed daily SOURCE registry and repeat the original Phase5 one-GET admission. The NEXT missing lane is LATER_PRE (T−6h and T−90m), not another invented collector. Reuse exact existing earlier modules:

- `phase5Phase6Pg16PrivateLaterPreHydrator_v39.ts` reads V0094 `LATER_PRE_DAY_REGISTRY`, real SOURCE registry and all referenced `LATER_PRE_PACKET` bytes under dedicated restricted PostgreSQL16 private **reader** login; verifies exact SHA, provenance, rights hash, native operating-member fields, T24 evidence and DB clock; returns due/censored/deferred entries **in memory**. Importantly: the internal `verified` payload is PRIVATE, not safe to stringify, upload or print.
- `phase5SignedLaterPreDayRegistry_v39.ts` checks the exact signed day/shard and SOURCE day membership; `v39_phase5_later_pre_registry_child_v39.ts` checks the original signed day workflow release; `v39_phase5_one_signed_witnessed_later_pre_github_owner_v39.ts` performs original physical-native T, T24 witness/standalone approved-no-T24 amendment, distinct PRE-only login and Stage14 hard-cutoff checks.
- Merged #650 V0096 signed 31-day index/route supplies the exact SOURCE/LATER_PRE/POST day/shard path/hash and window; merged #651 supplies V0096 staged schema-only one-time owner tool; merged #652 and #653 bind the SOURCE lane with existing one-GET admission.

## New candidate PR
`server/lib/disruption/phase6PrivateLaterPreExistingStage14Bridge_v39.ts` is a **PURE ZERO-I/O** second-stage bridge. Requires a private V0096 index handoff (with sealed internal registry byte map), separately read-only authenticated V0094 restricted PG later-PRE hydrate result, one explicit prospective due-flight path/packet SHA/native horizon/flight identity, current restricted PG clock and signed route intent. Confirms immutable matching SOURCE and LATER_PRE day/shard hashes, signed route window, source linkage, and one due flight within the actual 90-to-15 minute pre-cutoff selection window.

It calls **both** existing `admitP5LaterRegistryChildEnv` and `admitP5SignedWitnessedLaterPre`, without replacing any Stage14 SQL or provider contract checks. Only the exact single packet SHA, query digest and T24 receipt SHA are derived from that signed registry. Every other right/code/GO/manifest/PRE login input must remain separately approved. The output's JSON-visible portion includes only counts/SHA/horizon/cutoff and no flight ID, provider bytes or DB credentials; private original packet bytes and delegated PRE environment are nonenumerable and not written to checkout. This does not execute the PRE writer. A later job adapter must invoke `runP5SignedWitnessedLaterPre` under the current true GitHub run and separately commissioned PRE-only DB role; the original writer alone decides whether it may actually COMMIT.

`tests/phase6_private_later_pre_existing_stage14_bridge_v39.test.ts` exercises synthetic valid T−6h/T−90m, missing freeze/source rights/role, changed flight, digest, registry, cutoff and stale independent PG clock, cross-lane route drift, and privacy. New offline workflow runs it together with existing Phase5 PRE child/registry/Stage14 tests. These are synthetic CI; **no actual private Neon data** is read.

## Explicit scientific and production boundaries
- Signed registry/Ed25519 review does not itself establish genuine future operating legs, AeroDataBox legally permitted research/retention, an account-specific extended TTL, or independently approved physics-based arrival/departure truth.
- T−24h is still the separately existing first PRE horizon and witness; a T−6h/T−90m packet without T24 is only allowed under an independently reviewed **standalone missing-T24 protocol**, not fabricated backfill.
- Real exact PRE as-of/committed clock, source original membership and missingness require the existing Stage14/witness DB writer and independent post-commit readback. A due-shard candidate is not proof of an observed PRE.
- 31-day unattended execution still needs genuine independently signed forward calendar and source, lawful Contents expiry/backup policy, V0094→V0095→V0096 one-time commissioning and independent production readback on EXISTING Replit-attached `neondb`, scoped private reader and PRE GH logins, SOURCE/LATER_PRE/POST existing-child wiring, bounded pool capacity, duplicate/unknown COMMIT quarantine, independent science freeze and distinct paid Day1 GO.
- Do not trigger any old Phase4/5 paid flight workflows, reinstate migrations V0079–V0093, create a Neon plugin DB, or ask for already-known legacy API plan credentials. The goal is unattended GH workers after proper one-time commissioning, not daily Replit Shell.

**Phase5 scientific FREEZE HOLD. Phase6 paid NO-GO. Nov20 target conditional.**
