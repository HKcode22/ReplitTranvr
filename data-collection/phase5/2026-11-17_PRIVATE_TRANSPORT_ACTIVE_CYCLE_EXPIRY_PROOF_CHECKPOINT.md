# November 17 — private transport retention during live compact collection

**Current production main unchanged:** `345f642e0df3266853a1f9d5e3f12fa262ddf1ee`. This is a review-only proof addressing a demonstrated lifecycle dependency, NOT new production scope, provider-use permission, retention extension or scientific/paid authorization.

## 1. Concrete missing connection, not more primary FIDS testing

The deployed/verified V0103 primary FIDS cleanup acts on existing FIDS payloads and linked normalized population fields. The separate V4 object-reference monitor reads metadata, not private SQL byte storage. Neither handles the V0094/V0097/V0101 private packet and signed index tables.

Exact current `scripts/v39_phase6_private_epoch_retention_owner_v39.mjs` already implements reviewed scope, DB-clock cutoff, physical logical DELETE of due private packets, complete retirement of an expired-head index chain (including its earlier still-unexpired revisions), and permanent content-free day claim preservation. Its CLI is owner-local and requires local unarmed/STOP environment; it is not a scheduled independent scoped actor, and local environment values alone are not proof that the live database or other workers are stopped. The current publisher/reader roles have no direct DELETE; keep that boundary. V0101 preserves owner-only deletion. Current primary writer and metadata reader are verified against exactly their existing SECURITY DEFINER EXECUTE permissions; the extra-function check in `verifyP5PrimaryExpiryActor` rejects an unreviewed additional callable function in clean/phase6_private/public. Do not grant the existing actors more authority or patch installed V0103/V0101 retrospectively.

This is a material issue for the planned **unattended 31-day collection**, even if legal retention of the training corpus is eventually granted. Expiration/read refusal does not remove stored bytes; deleting an expired head alone could allow fallback to an older revision, and deleting the immutable day claim enables replay. Reuse the original semantics.

## 2. Actual compact dates: expiration is DURING collection, not only at final cleanup

Using exact current-main compact receipt (Git blob ee17a694594356e2b0c772545c490c198db11b42) and existing planning candidate 12h lookahead/20min minimum preparation lead. Each day's earliest T24 SOURCE = first active start minus 24h15m. Daily review expiry in existing `phase6DurableDailySourcePreparationRuntime_v39.ts` = min(policyValidUntil, observed DB clock + approved retention hours). Model daily prepare occurs within candidate lead interval, policy end does not shorten deadline, all 31 days publish successfully. This is an illustration of planned daily review packet deadline, not count of actual private packet rows, not authority to use this TTL. Other private kinds can expire earlier and may be more sensitive to underlying source expiry.

| Candidate retention from preparation | First earliest expiry UTC | First latest expiry UTC | Due by last service even at latest prep | Due by allocated tail even at latest prep |
|---|---|---|---:|---:|
| 96h (unapproved planning metadata proposal) | Nov23 11:45Z | Nov23 23:25Z | 27/31 | 29/31 |
| 168h (technical maximum of these particular policies, NOT rights) | Nov26 11:45Z | Nov26 23:25Z | 25/31 | 26/31 |

Under earliest prep, 28/31 daily reviews would expire by last service at 96h; 29/31 by allocated tail. At 168h, 25/31 and 27/31 respectively. Last service Dec24 04:00Z; allocated tail Dec26 04:00Z. Last day daily review at latest prep +96h expires Dec26 23:25Z, +168h expires Dec29 23:25Z. Minimum candidate 96h planning-lifetime margin over each day's allocated 48h tail 5h45m (already known); this does not guarantee actual source or PRE survival. Longest gap between nominal SOURCE instants in this exact calendar is 1,545min, not an all-lane DB/worker outage-free cleanup window. Do not pause collection on this basis or require owner to manually police records each night.

Reproduction from compact receipt cases[0].rows:
```js
const H=3600000,M=60000;
const data=c.rows.map(d=>{
 const first=Date.parse(d.segments[0].startUtc)-24*H-15*M;
 return {earliest:first-12*H,latest:first-20*M};
});
for(const age of [96,168]) for(const cutoff of [c.lastServiceEndUtc,c.allocatedOutcomeTailUtc])
 console.log(age,cutoff,["earliest","latest"].map(k=>
  data.filter(d=>d[k]+age*H<=Date.parse(cutoff)).length));
```

## 3. Bounded implementation proof in existing actual disposable PG16 harness

[Draft PR #864](https://github.com/HKcode22/ReplitTranvr/pull/864), exact initial head `f99651ed39f45989eba29797450594c93a4ebed5`, adds one review-only SQL prototype and extends the real signed-day epoch fixture. No permanent migration, no new workflow, no production role or grant. Prototype is a temporary invoker function (NOT security definer) that is loaded only by an existing explicitly localhost disposable test harness in a transaction which is rolled back. It accepts one synthetic manifest and a bounded count (1–128), uses one DB cutoff and NOWAIT publication fence, validates replay claims/prior SHA chain, refuses live-head/expired-ancestor inconsistency, retires at most one complete due epoch per invocation, deletes only due same-manifest packets, returns only counts; preserves every day claim. The existing owner test follows after rollback. The fixture checks wrong manifest format/count, two due packets cleared in bounded successive invocations, earlier live index revision retirement, zero-work repeat, unexpired same-manifest and expired foreign-manifest packet preservation, day31 preservation and claim survival.

Actual focused CI: [44099883362](https://github.com/HKcode22/ReplitTranvr/actions/runs/44099883362). At opening it is in progress; this checkpoint does not claim pass or deployed cleanup. Broad CI [44099883001](https://github.com/HKcode22/ReplitTranvr/actions/runs/44099883001) likewise pending. Existing original primary/retention production pin not changed. This is intentionally not new authorization; do not execute the candidate against production even if all tests pass.

### Smallest possible production continuation, contingent on actual rights and review

If the currently planned private retention/custody scope is confirmed, use the existing restricted retention actors, current primary cleanup scheduling and independent readback, with a small separately approved function-only extension (or another lawful existing platform mechanism established by actual evidence). No new business worker credential, no table privilege, no public access and no unrestricted deletion. Need a real bounded deployed function and corresponding exact ACL checks / approved-main rebind as one coordinated release, not granting a new function under old pin. Preserve primary cleanup independently even if private cleanup refuses; keep aggregate independent commit verification, existing STOP on unknown deletion, current day claims and exact manifest. Prove current-day concurrency, bounded processing and no silent resurrection, protected scope and recurring physical deadline; account for that GitHub scheduling is best effort. Do not modify production without explicit policy/coverage and reviewed exact release. Candidate batch size 128 and one epoch are test bounds, not chosen production throughput or a guarantee.

This proof cannot resolve PRE snapshot/provider-literal fields, V0081 immutable historical witness, POST label rights, backup/PITR, actual physical storage deletion SLA, or preservation of a usable full-cycle linked dataset. It does not establish an independent gate-out label. Do not extend raw FIDS custody (23h access / 24h hard limit), silently narrow the ML experiment or create authorization tokens from fixtures.

## 4. Existing external blocker status

Issue #300 records the Nov1 distinct rights inquiry already sent and a narrowly prepared unsent follow-up; #200 records Oct30 milestone inquiry, not affirmative proof. A narrowly new since-Nov15 targeted incoming-mail query (known provider/RapidAPI domains and rights/milestone terms) found zero matches at this read; this is not exhaustive mailbox proof, no private content or IDs exported, no duplicate full search and no mail sent. The targeted read was performed to avoid missing fresh progress on the release dependency, despite the earlier recommendation not to repeat mail searches. It does not grant rights. Owner may send the previously prepared follow-up, or supply actual applicable agreement, before full-corpus approval. No subscription purchase, API request, DB mutation, or release secret change.

**Disposition:** engineering proof branch only; exact current main and compact dates unchanged. Genuine source rights, scientific/operational acceptance, final exact authorized manifest and production staging remain necessary. Phase5 full scientific FREEZE HOLD / Phase6 paid NO-GO.

## Actual focused CI completion (same exact head, no implementation change)

Run 44099883362 both jobs SUCCESS. Actual job 134096724376 log, 2026-11-17T14:09:22.0828841Z: `P6_PRIVATE_BOUNDED_DUE_ONLY_DISPOSABLE_TX_PROOF_PASS_NO_PRODUCTION_GRANT`. Original independent expired-head refusal and owner scope/claim fencing test also passed immediately after proof rollback. At final check 5/6 workflows successful; broad workflow status: in_progress/not concluded. These are real disposable PG16 test receipts, not a deployed recurring writer, production authorization, concurrency stress test, or deletion SLA. Current production main unchanged. See exact master issue comment 6950446448.
