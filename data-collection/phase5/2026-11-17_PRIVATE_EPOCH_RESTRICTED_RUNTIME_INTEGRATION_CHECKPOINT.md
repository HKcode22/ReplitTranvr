# November 17 — private epoch restricted-runtime integration candidate

**NO PRODUCTION INSTALL / NO GO.** Main independently re-read unchanged at `345f642e0df3266853a1f9d5e3f12fa262ddf1ee`. The existing primary V0103 pin and prior current-main VERIFY receipt remain intact. This is the continuation of #864, not another provider or collection architecture. Do not repeat the previously completed owner merge, historical clearance, role commission or 31-day candidate review.

## Completed candidate implementation

[Existing draft PR #864](https://github.com/HKcode22/ReplitTranvr/pull/864), exact current candidate head `7be888ab0aca74f853f04badd48edd83304d2494`; no merge. Staged V0105 is a provisional next migration name on the review branch, not an installed schema version. It adds four PostgreSQL functions only, no table, role, login, grant, scheduler, policy, retention extension or paid authorization:
- status for the exact existing B0062 singleton manifest, including due and foreign-due aggregate counts and deletion STOP;
- bounded DB-clock due-only sweep: 1–128 due same-manifest packets and at most one complete expired-head chain (up to 1,024 revisions), no caller cutoff; refuse mixed/broken chain or active publication lock conflict, never delete the content-free epoch claim, never delete a live packet or foreign-manifest packet;
- separate read-only aggregate commit receipt, written atomically with successful nonempty DELETE into existing project-owned `clean.adb_collection_meta` (generated run ID, manifest pin, counts and DB clock; no private path, body hash, aircraft/flight identity or payload). This is transactional aggregate evidence, not independent row-by-row content disappearance, immutable external audit, media eradication, or permission to retain all project metadata indefinitely. Zero-work creates no marker;
- narrow uncertain-commit/readback STOP using existing deletion incident and advisory lock (390015,104) from V0103/V0104; no resolution function or arbitrary incident text. Unknown commit is reconciled by exact independent marker when nonempty; otherwise HOLD/no replay.

Reuses the already commissioned writer and reader names, not new production logins. No direct table grants intended, no owner credentials or provider secrets in scheduled workflow. Existing V0103 bodies untouched. Exact current primary verifier is extended only in explicit optional mode to compare all eight definition bodies, arguments, volatility, owners, config and precise ACLs, still rejecting unrelated authority. OFF remains the old exact four-function boundary; extension functions installed inert without grants do not enlarge authority. A partially configured or extra-granted state can fail the primary actor verifier: eventual deployment MUST coordinate approved main, extension grant and exact mode without disabling existing independent primary cleanup. Do not set private mode OFF while extension grants remain present; VERIFY_ONLY is the nonmutating mode after commissioning. The old primary runner would reject the new grants, so never grant under old code/pin. Current main unchanged.

Existing primary workflow's cron, timeout, concurrency group, credentials and old VERIFY/APPLY controls unchanged. Only three optional vars: P6_PRIVATE_EPOCH_EXPIRY_MODE (OFF default, VERIFY_ONLY, APPLY_DUE_ONLY); exact approved P6_PRIVATE_EPOCH_EXPIRY_MANIFEST_SHA256; separate P6_PRIVATE_EPOCH_EXPIRY_APPROVAL=APPLY_REVIEWED_PRIVATE_EPOCH_EXPIRY_ONLY_NO_PROVIDER. No settings have been edited. Existing primary manual VERIFY forces private read-only even with APPLY configuration, primary successful receipt emitted first, a primary HOLD skips private work; later private failure cannot roll back an already acknowledged primary commit. Core has candidate max four batches ×128 packets / four complete epochs. No CLI or new workflow created. Private due at initial read remains explicit review-required even after recovery; current stored `retention_not_after_utc` must not be relabeled as a soft deadline. Deliberately no new paid admission guard or implicit authorization. Candidate starts at due, not a proof that hard physical retention can be met before a delayed runner arrives.

## Actual tests and correction

- Initial SQL candidate head `a8e30918722a2f2076c1ae60ed2b848044fb01c6`, actual PG16 run 44100772700/job 134099862467 failed at synthetic B0062 authorization insertion: fixture used Alert cap 1 but B0062 has exact 1,900 check. Corrected fixture to 1,900; no real constraint or cap weakened. Actual B0062 baseline successfully loaded in disposable PG16; V0105 functions installed in that disposable instance before fixture failure.
- Corrected core head `0506ab2455657b7c4c42da9454d14be5da265ef0`, [run 44101094681](https://github.com/HKcode22/ReplitTranvr/actions/runs/44101094681), job 134100974104 at 14:16:08Z: actual staged function-only B0062/V0101 commit, independent aggregate receipt, scope rejection, rollback invisibility, lock conflict, due-only batch and complete-chain deletion, revoked AUTH cleanup, foreign/live preservation, replay fence, no direct payload/meta/claim access, durable STOP all PASS. Simulated lost COMMIT ACK after real COMMIT reconciled by independent reader, exactly one sweep invocation, no replay.
- Integrated runtime head `2dcb551e20981b74910b29dce068e12147be642c`, [run 44101473865](https://github.com/HKcode22/ReplitTranvr/actions/runs/44101473865), actual job 134102317029: `P6_V0105_EXISTING_PRIMARY_EXACT_EIGHT_FUNCTION_ACL_AND_OPTIONAL_MODE_PG16_PASS` at 14:18:16.6797263Z, `P6_PRIVATE_EXPIRY_RUNTIME_LOST_COMMIT_ACK_INDEPENDENT_RECEIPT_NO_REPLAY_PASS`, `P6_V0105_STAGED_FUNCTION_ONLY_B0062_V0101_ACTUAL_COMMIT_RECEIPT_AND_STOP_PG16_PASS`. Both focused jobs successful, 6/7 workflows green at read, broad safety 44101473988 still running. Tests load actual B0062+V0079+V0103 and V0094 through V0101 into disposable PG16. Existing exact primary-only verifier correctly refuses extra authority, combined exact verifier passes, extra wrong-role status grant refuses, separate reader and writer sessions, primary VERIFY remains inert; optional flags tested. Test temporarily sets existing exact localhost fake URL/gate solely during the verifier fixture, then restores it; no new production TLS bypass.
- Final successor `7be888ab0aca74f853f04badd48edd83304d2494` adds explicit deadline-due-at-initial-read flag in core/CLI and two actual runtime assertions. Previous focused success is predecessor evidence, not final-head CI. Exact successor CI requested automatically by existing PR; not observed at initial checkpoint. Do not merge while CI or disposition pending. The first workflow-file update request disconnected, actual branch/file readback proved unchanged, then one exact retry succeeded on review branch. No uncertain production mutation.

## Nominal private SOURCE rows, distinct from billed requests

Reconstructed from exact compact receipt (blob ee17a694594356e2b0c772545c490c198db11b42) using prior independently verified 31/31 template timing parity, Stage8 planned+1min hardLatest (15-minute source lead, 180-second response allowance), current draft-shard planner (max 96 packets, max 180 minutes from first planned-105 lead until last planned+1 latest). Every 192-template day yields 11 SOURCE registry shards; day5/day10 288 templates yield 14 each. If all preparation/publishing succeeds: 6,144 query packets + 347 source registry packets + 31 daily review packets = 6,522 private packet rows across the experiment, excluding index revisions and every T24/PRE/POST/witness packet. Daily 204 rows ordinarily, 303 on the two six-hour days. These are planning metadata/custody rows, not observed flights or API billing units.

For an explicitly hypothetical common 96h prep-derived signed deadline (the TTL and 12h–20min prep window are still unapproved), all day SOURCE metadata may become due in one burst. Potential worst count in a 15min, 1h, 4h, 532min, or 12h window is 408 (days6/7), and rolling24h 711 (days5/6/7), from independent choices of each prep time within its allowable range. Compare candidate maximum 512 packets per invocation. 711 exceeds it by 199 even without PRE/POST/witness/actual retries. No guarantee all records publish, share a common deadline, or can be processed in the 9-minute workflow. Need actual observed throughput and legal class-specific deadline/eligibility margin. Additional PRE/POST private rows may dominate count; do not use this number as production volume estimate. Do not increase batch sizes, shorten usable raw data, or reclassify rights without review.

Reproduction:
```js
const M=60000;
const rows=c.rows.map(d=>{
 let times=[];
 for(const s of d.segments)
  for(let t=Date.parse(s.startUtc)/M;t<Date.parse(s.endUtc)/M;t+=15)
   for(const lag of [1440,360,90])for(let k=0;k<4;k++)times.push(t-lag-15);
 times.sort((a,b)=>a-b);let shards=[];
 for(const x of times){
  let s=shards.at(-1);
  if(!s||s.n===96||x+1-(s.first-105)>180){s={first:x,n:0};shards.push(s)}
  s.n++;
 }
 return {day:d.runDayIndex,n:times.length+shards.length+1,registries:shards.length,
  lo:times[0]-720+5760,hi:times[0]-20+5760};
});
for(const delta of [15,60,240,532,720,1440]){
 let best=0;
 for(const d of rows)for(const start of [d.lo-delta+1,d.hi])
  best=Math.max(best,rows.filter(x=>x.lo<start+delta&&x.hi>=start).reduce((a,b)=>a+b.n,0));
 console.log(delta,best);
}
```

## Actual commissioning remains finite but not yet approved

Do not run production SQL on draft branch; keep exact current main and primary retention pin. If genuine rights and operational review accept the exact scope, coordinate one actual final release with the existing owner SQL connection and exact restricted roles: independently read actual table ownership, V0101 schema and ACLs; verify reviewed final main, staged V0105 bytes, final manifest and safe stopped activation state; install function-only staged candidate once and grant only exact four function EXECUTEs to existing two actors, coordinate approved-main pin and VERIFY mode; independently verify both roles and current primary/private status. Do not rotate secrets, create another DB, create broad grants, reinstall V0079–V0104 or invoke old repin helper with unknown paths. Exact grant/re-pin owner wrapper and final approval are not executed or issued here. Need genuine independent retention policy/rights, including private and PRE/POST/witness content, actual PITR/deadline handling, account/STOP, scientific E and accepted missingness. Then existing final exact manifest/AUTH, disabled B0062/calendar and V0093/cost stages, independent readbacks and separate enable/paid decision. No new mailbox search or email sent. No provider calls or production DB, settings, main or secret changes. Full FREEZE HOLD / Phase6 paid NO-GO.