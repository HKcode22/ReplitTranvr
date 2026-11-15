# November 15 — V0095 actual owner install, empty schema commissioning review

## Actual live evidence, not CI

User supplied Replit shell transcript from main `8b9c5d62ff13762fead9597dbdd5d5fb760749e1`:
- Existing `neondb`, `neondb_owner`, PG server version 160016. Before: `V0094_READY_EMPTY_V0095_NOT_INSTALLED_NO_GO`, zero private rows, old two constraints.
- Applied exactly V0095 SQL Git blob `845d8bfd84cae6262ceaa421ba2f9f5ca5df1939` once. Returned `V0095_ONE_USE_EMPTY_PRIVATE_KIND_EXTENSION_OWNER_READBACK_NO_GO`, new types SOURCE_QUERY_PACKET and POST_PACKET, 0 new LOGINs, 0 flight writes and provider calls.
- Fresh independent **connection** readback `V0095_INSTALLED_EMPTY_PRIVATE_KIND_EXTENSION_INERT_NO_GO`; two constraints `p5_v0095_kind_allowed`, `p5_v0095_kind_path_guard`, 0 rows. Final `V0095_EMPTY_SCHEMA_COMPLETE_NO_PAID_GO`. This verifies the one-time migration in production, not independent external permission. **Never reinstall V0095, V0094 or V0079–V0093; never install old global V0096.**
- pg connection-string SSL future compatibility warning was not a failure. No credential values disclosed.

## Actual code release state
- #705 6/6 green, merged `8b9c5d62ff13762fead9597dbdd5d5fb760749e1`.
- #706 corrected head `6168eebcf1bed26b064b097576ec9bb1f4532e0f` 10/10 green, merged `b05afa09a1279e9e2cdabb1c046834b3319d74fc`. Staged V0100 exact restartable enrollment, same original V0091 checks; existing V0087 queue. No live V0100 install, no actual enrollment. Manual current day selection remains.
- #707 exact head `91f74539e19b10f6b3d89f66504559e0023379f2` 7/7 green, merged `6ffdae47a8927a66ce7a73b0a290d6b4ad87388d`. Actual private POST child code uses authentic day+distinct reviewer and exact SOURCE PRE registry audit; retains existing per-packet protected pins. No paid GET or POST outcome executed.
- #708 5/5 green, merged `4b3175fbf75a8b9539a53c42c03fbc16e7877741`. Its earlier pending/live statements are superseded by this note.

## Review of remaining exact inert schema changes (technical review only; not independent legal or organizational approval)
Reviewed immutable SQL in main plus prior exact-head CI:
| Migration | SQL Git blob | Installer Git blob | Original PG16 CI |
|---|---|---|---|
| V0097 | 70033952e734e389a0be02205d7cbb6eefbc0462 | 472659f340244637a9e2ce7be2d9bbf1c43af2f0 | [#675 run](https://github.com/HKcode22/ReplitTranvr/actions/runs/43676243790) |
| V0098 | dcbe7a1647b45e216b18493b1697add61fdaff75 | dbe77b7c9fd9118faa3eb85ac978094607714311 | [#683 run](https://github.com/HKcode22/ReplitTranvr/actions/runs/43681677235) |
| V0099 | 0731fdb0f96fe5c1416fae8dd64327900c91c287 | 345d24cd70436ff1a891e1ec552c341f560f0dda | [#692 run](https://github.com/HKcode22/ReplitTranvr/actions/runs/43685364996) |

V0097 creates two empty existing-schema tables (content-free, immutable per-day replay claim and signed append-only day index), bounded day/revision, exact SHA, 7-day maximum index retention, no new LOGIN, reader SELECT and publisher SELECT/INSERT solely on index. V0098 adds nullable bytea wire columns+size/packet-kind guards to two empty tables; original ACL and UPDATE guards remain. V0099 extends kind/path/size/signature constraints for daily metadata preparation; original TTL/ACLs retained, one additional private metadata type, no new table/login. Each transaction asks for absent or exact empty predecessor; each has postflight. V0099 supersedes earlier V0095/V0098 packet guards; its own inventory must be used after it succeeds.

The V0097–V0099 CLI installers require an actual separate independent release-review SHA. This note is an engineering review, not that external approval; do not put an arbitrary hash, placeholder, or this note's hash into a variable that purports to certify independent rights/PITR. Propose explicitly separating authorization of **empty schema only** from authorization of payload publication and paid data collection, as already done for V0095. Prior live readback proves V0095, not V0097 onward. Retention reader commissioning and the 65-object cleanup remain closed. No new source rights email required to keep engineering moving. No actual raw retention, data-use, PITR or scientific GO established by this work. 
