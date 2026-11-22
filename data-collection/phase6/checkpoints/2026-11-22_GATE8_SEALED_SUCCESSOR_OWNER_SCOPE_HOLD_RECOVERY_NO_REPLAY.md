# Gate 8 — owner sealed successor successfully verified; secret-scope prewrite HOLD; safe continuation

**Observation:** November 22, 2026. **Production main:** `b432eb9a5bac7bc3c4537249e75ec7df41e8727c` (unchanged), external relay main `c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed`. **Phase6 paid GO:** false. **Scope:** Gate 8 only; Gates 1–7 remain bounded CLOSED. This checkpoint is a branch file; do not merge it into production main merely to record status because that would change immutable main SHA bindings.

## Verified new owner receipt, no duplicate work

Owner ran the previously approved hash-pinned one-use helper `3e4e95ea319903916e0bf82c882d00495c87ae2c`.

- Exactly one public-only ephemeral X25519 request committed to evidence branch, `18b8b506ab21c09d30c7f56d4970fa0cb70d3ead`. **Do not recreate request or a new key.**
- Exactly one first-attempt owner-only seal workflow [45026584506](https://github.com/HKcode22/ReplitTranvr/actions/runs/45026584506), job `137220832583`, succeeded. It recovered the existing ORIGINAL 31 repo-scoped static policy strings in branch-isolated GitHub Actions memory, used the previously reviewed final policy validator to validate historical and new current SHA-only policy bindings, and encrypted exactly eleven required successor secret values using AEAD to the owner’s ephemeral public key. No AeroDataBox, DB writes, paid activation or plaintext logs/artifacts.
- The owner local decoder was actually run in `--verify` mode and independently in `--apply` mode. Both printed `P6_G8_OWNER_ENCRYPTED_SUCCESSOR_DECRYPTED_AND_VALIDATED` with exact `staticDigest=3bb538896d2023ed1ff54b1b0d914a8a134299eac3a5068827e93d82400864b0`, `linkedPostDigest=0916015a99b379d4ff703f59530794577c5c5ab2404e6cdfc1112921f165b54d`, `changedSecretCount=11`, `applied=false`, `phase6PaidGo=false`.
- The owner `--apply` decoder failed specifically with `HOLD_P6_G8_OWNER_SEALED_EXACT_REPO_SECRET_SCOPE_NO_SHADOW`. This is the first statement inside `--apply` *after* read-only GH owner/main and repository/environment secret-NAME inventory. The failing assertion was:

```js
[...keys,"V39_PHASE6_PROCESS_ARMED","V39_PHASE6_OWNER_APPROVED"]
 .every(k => repoSecretNames.has(k) && !protectedEnvironmentSecretNames.has(k))
```

**Crucial:** This failure was BEFORE BOTH global STOP-secret updates and BEFORE ALL 11 successor policy secret writes. No owner command dispatched a new POST preflight. It is unjustified to call the policy rebind installed, or three protected POST actors passed. Do not infer a provider or DB mutation. The mismatch is the helper’s conservative **secret storage scope assumption**, not evidence that policy values were wrong.

## Preserve real private custody — NO REPEAT

Owner's one-time private-key and ciphertext directory was explicitly retained; do **not** expose `owner-private.pem`, `request.json` public-key details, the ciphertext envelope, decrypted successor secret values, raw workflow secrets or full private files in chat/logs. The historical AUTH `auth.json` used by the old helper is still missing, but was proven irrelevant by 31/31 installed secret readback and original+successor full-validator read-only GitHub hosted runs [45024854391](https://github.com/HKcode22/ReplitTranvr/actions/runs/45024854391) and [45025941764](https://github.com/HKcode22/ReplitTranvr/actions/runs/45025941764). The owner must not run the old helper `88f9fc6c...` or rerun the original one-use `3e4e95ea...` since its request is permanently created.

Existing protected POST workflow `phase5-one-signed-future-post-v0083-main-manual.yml` uses `environment: phase6-protected-runtime` and many `secrets.*` fields, meaning an environment-level secret can override a same-named repo-level secret for that protected job. The original decoder assumes **none** of the eleven successor keys nor two STOP keys exists under the environment. This may be false by design; do **not** simply remove the assertion and update repo-only secrets, because the live protected actor could still read an old environment-scoped value, and the two STOP fields could be stored at a different expected scope.

## Read-only recovery already prepared

Prepared new branch-only `p6_g8_existing_sealed_owner_secret_scope_inventory_readonly.sh`: compares the *names only* for the exact eleven successor-policy keys plus `V39_PHASE6_PROCESS_ARMED` and `V39_PHASE6_OWNER_APPROVED` across repository and existing `phase6-protected-runtime` environment, first verifying current target/relay main, owner identity, seal run ID and preserved original private files. Emits structured `entries` with `BOTH`, `REPOSITORY_ONLY`, `ENVIRONMENT_ONLY`, or `MISSING`; includes counts and zero credential values, zero writes, zero provider/DB calls. **Not executed** in this assistant session; owner shell readback needed for exact affected names.

After metadata is observed, design a **one-time exact-scope owner-only continuation** that reuses the same encrypted artifact and owner private key, refuses main drift and secret values with conflicting environment provenance, preserves all existing reviewer/signer/manifest/rights/calendar/policy bytes, disarms global STOP at *actual* enforced scopes, and writes only the necessary 11 successor secret values at exact actual scopes. Account for any shadowed environment scope explicitly, not by bypass. Then run *one* first-attempt current-main disarmed protected POST reviewer, publisher, storage preflight, and require all required steps success. No SOURCE reenable, V0108 reinstall, retention replay, extra cron, new key/request, paid GO or provider call.

## No-repeat register, current proven progress

| Item | Evidence | Status |
| --- | --- | --- |
| G1–G7 implementation and bounded acceptance | Earlier checkpoints, immutable study plan, V0108/Neon and CI | CLOSED, do not redo |
| SOURCE activation and original flight-stage authorization | Owner PG16 database readbacks | DONE, no reenrollment |
| Three nonpaid SHA pins and live target main | Owner `P6_G8_ALL_THREE_NONPAID_SHA_PINS_READBACK_PASS` | DONE |
| Current-main full retention primary+Phase7 | [45023781129](https://github.com/HKcode22/ReplitTranvr/actions/runs/45023781129) | DONE, no replay |
| Real independent PRIMARY_BACKSTOP relay target ACK and target success | Relay [45025537232](https://github.com/HKcode22/TravnrClockRelay/actions/runs/45025537232) and target [45025567271](https://github.com/HKcode22/ReplitTranvr/actions/runs/45025567271) | DONE, no replay |
| Original 31/31 policy values intact | [45024854391](https://github.com/HKcode22/ReplitTranvr/actions/runs/45024854391) | DONE |
| Exact old+successor full policy validator | [45025941764](https://github.com/HKcode22/ReplitTranvr/actions/runs/45025941764) | DONE |
| Owner X25519/AES-GCM encrypted successor generated and locally verified | [45026584506](https://github.com/HKcode22/ReplitTranvr/actions/runs/45026584506), owner two exact digest PASS receipts | DONE, preserve existing envelope and private key |
| Eleven successor GitHub secrets installed | Decoding passed but exact secret-scope check failed **pre-write** | HOLD |
| Current-main protected reviewer/publisher/storage preflight | None ran after this owner abort | HOLD |
| Prospective Monday ROLLING_ROOT, fresh STOP/credit/rights, distinct paid GO | Not established by any prior completed retention/PRE/POST research | HOLD, paid OFF |

**Status:** `P6_G8_OWNER_ENCRYPTED_SUCCESSOR_VERIFIED_PREWRITE_SECRET_SCOPE_HOLD_NO_PAID_GO`. No reopened gates, no value reconstruction, no running already finished jobs.
