# 2026-11-26 03:42 PST — post-cutover CI reconciliation and next exact repair

## Owner cutover and independent evidence

PR #976 exact 454349c92ca9a560b500eba2d8f391863d49439f: 46/46 PR workflows successful by independent GitHub query. Relay #30 b2dec744491d5438a8041adc38f74d9fcc9f3b64: 4/4 successful. Owner shell merged target at 11:40:12Z to f4fe806dbda9695f181aee3b16d7285c42e44f93; repinned runtime, primary FIDS expiry, Phase7 expiry and relay target. Both jobs in [45812762727](https://github.com/HKcode22/ReplitTranvr/actions/runs/45812762727) passed on new main (139884581510 and 139884582116). Existing retention remained enabled. Script stopped before relay merge with ACTIVE_RELAY_NO_CANCEL; correct protective hold, not rollback or a CI defect. Relay #30 remains open on old 879494843b02699ef3e3bebd0acd8f6ddf9551d0 as verified. Existing owner script blob 022043fa2df7a1b458d90567b6f9011f7209aca9 is idempotent for merged target and exact current pins, requires no active root/parent/child/relay. Do not cancel ongoing relay or reset paid routes. Main exact push census 17 runs including retention; 16 success, full safety 45812670810 running at first read. Actual independent relay pulse following cutover still outstanding.

## CI failure census (Nov26 since midnight PST, 12 failures, all PR events)

| Prior head | Run IDs | Actual failed step/root | Reconciliation |
|---|---|---|---|
| 4f4e16d4 | 45796497453 | V0112 predecessor exact-match refusal in disposable PG16 | F025; corrected SQL predecessor, subsequent exact registration passed |
| 6572192e | 45799354735, 45799354831, 45799354784, 45799354670, 45799354682, 45799354656, 45799354783 | All same TS18048 candidate possibly undefined at conditional review line 188, not seven independent faults | F025/I026; explicit narrowing, subsequent exact TypeScript and all CI passed |
| 7c607d6a | 45800099500 | Recovery register crosswalk mistaken for primary ID | F032/I027; parser restricted to primary sections |
| 41d5d38f | 45807756371, 45807755244 | Conditional proof fixture repeated-character digest metadata shape; focused and full offline failures | F025/I041; fixture uses actual SHA-256, not weaker guard; 4c8854e0 passed 46/46 |
| 14cf53d9 | 45810213223 | T038 linked script not test/workflow path | F032/I027 recurrence; corrected metadata, 454349c9 passed 46/46 |

12 workflow failures, 4 broad categories, no newly observed production failure in that time range. Deliberate PostgreSQL negative-test errors are not workflow failures. No CI rerun to mask a failure. Historical production and relay losses remain in original register; do not add prior CI failures to paid-loss counts. Node20 action deprecation is warning, not execution failure; record as maintenance consideration rather than a new paid blocker.

## #977 successor code

F027/F039/I044/T039: commit 427411f4c82277d1c66863cd157c68d9d4384443 connects explicit conditional later packet to existing private current signed registry hydration/projection, worker/enrollment scope and protected workflow marker. Verify parsed later/source objects against exact authenticated bytes; no alternate roster or writer. Legacy direct registry child and Stage14 bridge remain native-only. Conditional service counts separate from physical native counts. Existing mandatory Phase7 proof metadata and signature resolver, cutoff, source rights, and later-without-T24 scope remain. T039 uses existing actual prepared fixture and signed metadata plus negative source/registry object drift. Does not produce actual signed registry, claim, production PRE, conditional POST or physical gate-out. CI on successor required. #977 only target recovery branch, #30 distinct relay. No migration install, provider calls, production DB writes or paid resume.
