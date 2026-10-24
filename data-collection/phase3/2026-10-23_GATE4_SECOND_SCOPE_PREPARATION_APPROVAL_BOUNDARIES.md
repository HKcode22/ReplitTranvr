# Gate 4 second live Alert — **preparation-only** authorization and safe engineering order

**Date:** October 23, 2026, Pacific. **Owner authorization:** explicitly **YES to PREPARATION ONLY** of a fresh, bounded WSSS live Alert delivery test; review of new receiver scope, temporary restricted DB writer, and controlled republish **if proven necessary**. **NOT authorized:** paid AeroDataBox CREATE/GET, GH STOP dispatch, new paid window, production table/role/GRANT/RLS changes, provider DELETE, automatic scheduling, or spending. Any public health GET of Replit is no-provider and read-only. Keep Phase 4 HOLD until Gate 4 live ordinary Alert is evidenced or the owner explicitly changes scope.

## Verified known-good foundation; do not unnecessarily republish

- **Owner's actual public receiver GET** `https://replit-tranvr--hk84164.replit.app/__v39/workspace-runtime` returned HTTP200, `status=PASS`, `git_head=d2265a1ee8ed4428f7aef97aa084c9aeb7e8aaf5`, `published_deployment=true`, `prepaid_route_registered=true`, `gate4_alert_ingress_registered=true`. This establishes serving binary identity and route registration, **not paid callback delivery**. Do not claim current GitHub `main` is the published binary (main at this preparation was `8ff18699fd817cc8ab9c8c715855acf790a3f505`, deliberately different).
- First bounded Oct 23/24 WSSS trial: one positive paid Alert CREATE bound to a private provider-issued ID in `clean.gate4_alert_owned_binding_v39` (V0072), independent protected exact STOP [Actions #40044881981](https://github.com/HKcode22/ReplitTranvr/actions/runs/40044881981) completed/success, strict post-stop LIST+balance 3x all 2037/0 active. Zero paid-window V0071 originals / zero original SHA+claimed paid-ID matches; one preserved V0071 row was an *earlier Oct22 synthetic* with SHA intact. See [issue #38 source reconciliation](https://github.com/HKcode22/ReplitTranvr/issues/38#issuecomment-6377891047). This is **safety PASS; genuine Alert delivery unobserved**, not an established software fault or measured delivery-rate failure.
- Gate3 WSSS08 `SETTLED` 19-credit owner+600sec GitHub watchdog is genuine prepaid transport evidence, not ordinary Alert receipt. Gate0.5 actual FIDS retrieval 30+30, 4 units and independent STOP is closed for qualified feasibility. No new Gate3/Gate0.5 runs.

## Concrete source problems that rule out reusing old "run again" command

1. Old live operator `scripts/v39_gate4_single_live_create_operator_v39.ts` freezes **previous UUID `498dccd7-5da3-4687-a6ea-e0dc03b54398`**, receiver `d2265a1…`, historical `AUTH` prefix, old private `writer-20261023.json`, old Ed25519 signer and one-attempt intent, an **exact five-minute** window, `maxDeliveryRetries=0`, and the old paid CREATE phrase. **Never invoke its `--execute-one` mode again**. No recycling old owner receipt or private signed consent into a second subscription.
2. Old `scripts/v39_gate4_one_shot_writer_commission_v39.ts --apply` assumes the V0072 owner table **has zero rows and zero writer role/policies**, and fixes its restricted role name `gate4_owner_writer_20261023`. Since the first positive CREATE left an immutable V0072 binding, that assumption is knowingly false. Re-running old `--apply` is not a legal scope rotation and must stay BLOCKED. Its `--revoke` is a **production security mutation**, requires separate independent review/permission, and must not be blindly applied as preparation.
3. The deployed ordinary Alert route in `gate4PrebindAdditiveRoute_v39.ts` pins `GATE4_PREBIND_SCOPE_ID`, `GATE4_PREBIND_AUTH_SHA256`, the **compiled** deployed Git SHA, WSSS ICAO, and a callback bearer secret at startup. Merely changing protected GH environment vars DOES NOT rescope the published receiver. A later reviewed publish/restart or safe alternative must load the new values while preserving the known-good prepaid route, original historical objects, and rollback.
4. The V0071 receiver DB login `gate4_receiver_20261022` has SELECT+INSERT **on the original table only**, not V0072 owner rights; the application validates a specific AUTH/UUID and webhook secret. V0071 baseline migration does not provide per-UUID database RLS. Reusing the restricted receiver login with newly rotated runtime env may be possible, **but this is not evidence of database-level one-scope confinement**; evaluate whether a fresh receiver login/row policy is required instead. Never grant owner-binding rights to the callback receiver.
5. Protected GitHub `gate4-safety` runner requires reviewed **current GitHub SHA** and the separately frozen **published receiver SHA** plus a new AUTH/UUID/UTC window/observed fresh starting credits. Old protected pins/window and old Actions run are SPENT. No exact STOP workflow dispatch before distinct owner approval of protected vars and the final prospective window. The existing GitHub independent runner has no billing hard cap, and GitHub can stop unexpectedly.

## This preparation's strictly safe deliverable

Review-only `scripts/v39_gate4_next_scope_readonly_inventory_v39.ts`:
- Requires existing `V39_PRODUCTION_DATABASE_OWNER_URL` in the user's Replit environment, fails without the exact `/neondb` owner identity.
- Establishes `BEGIN READ ONLY`, `default_transaction_read_only=on` plus a 7s SELECT timeout **before** inspecting anything.
- Counts old V0072 owner bindings and V0071 original rows, other-scope counts, old writer login status, and RLS policy **names/count** only. Outputs no raw wire, provider ID, signed receipt, secret, auth hash, DB URL, role password, flight data, policy SQL WHERE predicate, or notification details.
- Does not instantiate a provider client or call GitHub API; no DB writes or role/GRANT changes; always ROLLBACK. A green metadata result is **not** a paid approval or scientific delivery PASS.
- It should confirm old positive ownership is preserved before a new separately authorized writer role is designed. If schema access is missing, return a sanitized `HOLD` rather than grant elevated runtime privileges.

## A proportionate *next* test proposal, NOT a signed budget/window

| Dimension | Preparation proposal | Requires explicit later decision? |
|---|---|---|
| Route | WSSS, `FlightByAirportIcao` Alert, zero retries | Yes: exact airport, subject and new AUTH |
| Duration | Up to **20 minutes** initial bounded prospective candidate (not today's start time) | Yes: exact UTC start/stop |
| Soft monitor | Trigger STOP at ~5 externally observed consumed credits **or** timeout | Yes: fresh baseline, reserve floor, accepted overshoot risk |
| Safety | One new positive CREATE from reviewed owner, independent protected GitHub STOP already ARMED, exact owned-ID DELETE only | Yes: production writer setup and STOP controls |
| Genuine science evidence | At least one paid-window original with SHA-valid wire and new positive ID claim plus accounted provider SEND charge, source/AUTH/scope match, ACK/commit verified | After run, direct measured evidence |
| Reliability claim | No percent with zero provider SEND denominator; one good event is qualified **live path feasibility** only | No fake month-scale reliability |

**No 100-credit paid threshold experiment is needed:** preserve existing offline scaled 100/10 and PG fault tests. Alert CREATE on a credit-based subscription is not itself charged; SENDs can consume provider credits in bursts. **Five credits is a soft stop, not a provider-enforced hard maximum.** A 20-minute window cannot guarantee receiving an aviation event. Therefore require fresh live feed coverage review before spending, a clearly stated exposure ceiling/headroom and an explicit user GO. If no SEND occurs and 0 original arrives, report `NO_LIVE_PROVIDER_NOTIFICATION_OBSERVED` and preserve evidence, not a failure or PASS.

## Exact remaining sequence

1. Review the new **read-only** metadata inventory's code and CI on its isolated branch. Run in Replit Shell only with user-held DB owner login and no printed credentials. Do not run `--apply` or `--execute-one`.
2. On returned sanitized metadata, design a **new** least-privilege V0072 writer role and additive RLS scoped to only the *new* UUID/AUTH/receiver SHA; preserve any existing safety reader policies and old rows. If old role can still LOGIN, separately review revocation after evidence and active-run safeguards. Test in disposable PostgreSQL first.
3. Choose the new trial AUTH ledger, UUID, start/stop and credit/risk ceiling with explicit owner GO for any resulting production config/role/publish changes; all PIN values must be independently reviewed. Do not publish a different binary solely because current main advanced; preserve source identity and previous stable receiver.
4. Once reviewed and approved: safe new runtime receiver scope/secret with preserved prepaid route and verified rollback, exact published health SHA check, owned-ID write-once role, protected GH STOP time-limited admission, then **separate final paid CREATE approval**. No unapproved paid experiment or automatic retries.
5. After actual observation: exact scoped immutable paid original binary+digest, source/AUTH/ID match, separate owner attribution, stop, provider LIST and >=3 stability reads, mathematical charge/SEND/notification distinctions. Then use the [PR113 verdict](https://github.com/HKcode22/ReplitTranvr/pull/113) to issue scientific Gate4 closeout, with limitations.

**Current truthful Gate4:** source/route and exact STOP safety proven, real ordinary paid Alert delivery still unobserved. **Phase 4 held per owner request.** No future automatic notification, schedule or paid subscription has been configured in this preparation.
