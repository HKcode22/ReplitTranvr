# November 17 — exact final V0105 manifest recovery complete; final configuration narrowed

Owner returned both actual receipts from the exact 98318ccb wrapper and final success marker. **Close manifest regeneration/recovery and the existing credential-name inventory. Do not rerun either solely for chat continuity.** [Sanitized owner receipt](evidence/2026-11-17_actual_v0105_manifest_and_configuration_receipt_NO_GO.json). The assistant independently checked remote main and unchanged ledger, not the owner's private local file bytes or GitHub secret values. No private paths/account secrets copied here.

| Current owner result | Actual |
| --- | --- |
| Code / tree | 6f518add10d00567a95fbcaf3650ebf608da8a60 / ccf9f6665e3a8547476651a17efcf2261d32c53c |
| Review SHA256 | 25f5204cac9ed0b8a031bf2a609c323caab4e7f939ae6b12c6b93afeec94ee47 |
| Executable inventory | 2,180; SHA256 9b47e3bfc1d52fbded77bb3b83a1bd967aafa3721dd954508f835bbf97e6ab95 |
| Manifest candidate SHA256 | fc6b594ec0e458d8810981ac8f170a3a91384be609e3c16a09c25f5a91449041 |
| Config / calendar | unchanged compact 4055c042... / 71252643... |
| All day-plan hashes | 31 of 31 |
| Queries / reserved REST | 6,144 / 37,388 |
| Existing DB credential names | 13/13 present |
| Six signer groups | 0/6 repository name groups present; seven absent aliases |
| Future / competing legacy modes | 18/18 / 5/5 UNSET |
| Primary retention / private V0105 | primary enabled, exact pin and approval; private COMMISSION_VERIFY_ONLY, no APPLY approval |
| Ledger | 12 historical predecessors, zero final approvals |

The 95 unique absent references (108 total minus 13 present) are NOT 95 credentials to create. They include conditional/static legacy paths, hashes, policy/trust bytes and genuine approval fields. Exact current workflow source proves static SOURCE review wire/pins/public-key aliases and static batch-registry SHA (private transport true), three static POST context/packet/request digests (non-stored-current), and fixed PRE roster SHA on noncurrent paths are not to be populated for the selected dynamic stored/current mode. All 13 commissioned DB URLs stay untouched. AERODATABOX_API_KEY repository name absent (environment/org inheritance not resolved); reuse existing owner key only if actual scoped account/rights permit, never ask to paste it. No Key or secret value read. Do not set all 95 names to 1 or rotate existing credentials.

## Narrow next action: locally prepare candidate signer keys once

Exact current existing consumers read base64 PKCS8 PEM Ed25519 and hash SPKI DER with SHA256:
- Daily runtime scripts/v39_phase6_nonpaid_source_day_github_runtime_v39.mjs blob 1b33f7c1... daily, query and registry key, daily distinct from other two.
- scripts/v39_phase6_stored_source_postcommit_native_later_v39.mjs uses same day key, distinct later key; same later key used for later PRE/T24 registry material, not independent T24 custody.
- scripts/v39_phase6_native_post_producer_v39.mjs blob 9a8a1a23... requires POST key distinct from day/query and T24 witness fingerprint.
- server/lib/disruption/phase6PrivateT24WitnessReceiptTransport_v39.mjs blob c75ee672... binds actual independent custody public key, policy, original per-flight evidence and expiry; separate private key required.

Use [owner-local candidate custody helper](review-tools/p5_signer_candidates_OWNER_LOCAL_ONLY.cjs) blob **72a204a6586d01c3acfe63030fa3b68201c88bb4**, exact byte identity independently matched native local tested file. Native Node actual Ed25519 and actual filesystem tests **11/11 passed**: six distinct keys/seven names, sign/verify, exact reuse, permission checks, duplicate refusal, different-key tampering refusal, partial-state no replay, symlink refusal, weak-permission refusal, origin refusal, Git-root refusal, and no-approval/no-secret-write receipt. All test keys synthetic temporary, removed. Private generation in existing owner's environment not yet performed.

This is ONLY candidate key custody, not release commissioning. If a previous independently held key exists outside the designated path, use that actual custody rather than silently generating replacement. Owner helper writes new 0700 outside workspace and 0600 PKCS8 files exclusively; existing complete candidate group readback reuses same exact fingerprints, partial or altered custody holds with no replay. Public PEM/fingerprints returned; no private bytes, no sign-off of real flight packets. No key upload or GitHub variable/secret write. Actual independent custodian acceptance still needed (different keys do not prove independent humans); T24 custody requires its own reviewed holder. Subsequent verified deployment can reuse key fingerprint/policy binding, not regenerate.

## Final release material, not more architecture

All current policy shapes already implemented:
1. `v39.phase6.delegated-daily-source-review-policy.v1`: planned day SHA list, private timezone catalog, config/frame, exact budget binding, source API/protocol and actual cutoff policy, nested nativePreFeatureReview + nativeLaterReview/dayAppendPolicy/t24Custody. For V0093 COST_UPPER_BOUND, reviewed31DaySourceRequestGridSha256 must be null; actual reviewedCostEnvelopeSha256 mandatory, same across signer/daily policies. Do not substitute coverage-grid hash.
2. `v39.phase6.delegated-source-review-policy.v1`: same study/budget binding and separate query/registry fingerprint, retention/validity, max queries/day.
3. Stable source trust exact ten fields, code/manifest/calendar/rights/release, reader session + day/query public keys and fingerprints. Separate POST trust exact three fields; nonpaid transport trust binds actual daily+signing policy hashes, reader/publisher sessions, daily public key, allowed lead/retention. 
4. `v39.phase6.native-post-physical-window-policy.v1` + nested T24 custody/later day-append policies have explicit genuine rights/price/cost/feature evidence and policy valid-through-tail. Current code requires 48h outcome tail, generic selectedT source semantics (no actual-only gate-out certificate inferred). Actual independent T24 access and physical label missingness remain conditional.
5. Final AUTH existing ledger demands FIVE actual evidence files/hashes specifically named as approved predecessors: scientificFreezeEvidenceSha256, sourceRightsEvidenceSha256, providerAccountAndBudgetEvidenceSha256, publishedAndGithubStopEvidenceSha256, operationalReleaseEvidenceSha256. No arbitrary hash or proposed policy as proof. Current ledger blob cddbeb12d27fb0e6b18195950a8f0333c88443aa exactly preserved. No approval appended. Actual final code pin will account for approved commit; prior candidate digest remains candidate.

The updated finite scope is candidate signer generation and actual custody/approved policy binding; legal/scientific/operational/release/account evidence; existing disabled B0062 + V0093 stage/readbacks; then separate paid activation. Manifest recovery and DB credential inventory COMPLETE. No production mutation, provider call, new migration, extra scheduler or repeat test. No replacement account. Full scientific FREEZE HOLD / paid NO-GO.
