# Nov 18 Pacific — actual signer commissioning, compact POST/cost closure, final exact release bundle

Production main `70580b3749544dfcbeff39da181b2aa42b1b4476` unchanged. Keep existing receiver and scheduler pins; no new DB, migrations, keys, provider, collection architecture, or Phase6 workflow. Owner asked to finish in bulk, not add repeated readiness probes.

## Completed actual owner execution
- Prior exact six-policy assembly and public OpenAPI receipt: 1,017 airports/168 zones; workpaper raw SHA256 7925dca816933a401ec97f1d3a1f920b881c8f1e296ab8f70f0563c19cf13b0e; raw provider contract SHA256 63b8daf194858a27ea487308f34839def760aadda2acd9f81c82c466f9de7f09. No repeat recovery.
- Actual Mac owner installed seven missing inactive GitHub signing aliases with six existing exact signing keys. All seven metadata readbacks and local public fingerprint/possession checks passed; no key rotation or approval/policy flag changed. [Receipt](evidence/2026-11-18_actual_owner_seven_signer_aliases_SUCCESS_INACTIVE.json), commit 73dc20bf71644d0173eed4d3b4fb9fca43db7167. GitHub never returned secret values; independently approved custody is distinct from successful installation. No further key installation or backup regeneration.

## Completed exact computations
- Read all 31 actual committed compact SOURCE day-plan files. Four POST choices (30/10,60/20,120/20,240/20 minutes) fit all 144 group windows on a single physical UTC date. For the existing candidate 60/20 choice, one GET per group upper bound 288 units, peak 24 units per UTC date (26 dates). All dates fit existing outcome cap. Nominal 23h original-access rule leaves 0/2048 T24 source templates, 2048/2048 T6 and 2048/2048 T90 templates potentially retained at dispatch end. This is nominal geometry, **not actual flight/label coverage**. Reuse existing T24 witness custody, no raw TTL extension. See [exact calculation](evidence/2026-11-18_compact_native_post_geometry_31_actual_plans.json), commit 2e4d20e0188dc5eba0c50d49c9c3fa2552e5ea89.
- Independently ran the existing partition/slot/V0093 cost-draft functions (exact fetched main production source, V8 with SHA256 separately validated against standard vectors). Reproduced exact actual compact candidate 31 days / 6144 GET templates / 38 UTC charge dates / 266 rows / 37,388 units; row hash a49720f28ce10019ee049436086e1734ac6ee2ec0f24189621aab2e32583ad6a. Bound to the existing unsigned candidate manifest and historical dated quota/timing/range inputs: slot budget 81a3b0e0a8e6e9cd48e8e6997ab4e7c700594797f568aa7b0b704d071f335e5e; exact **candidate** cost digest 20470f4ad2b7e1dec2f3a0385dda1d2315112fc008d27e5cea72417767ae058f. Do not use this as approved final cost digest; fresh approved inputs/manifest will change it. Correct same digest into both V0093 category and cost pins; exact source grid stays null. Three mutated input refusals and every POST date within outcome cap. See [cost compiler evidence](evidence/2026-11-18_exact_compact_cost_binding_NOT_RUNTIME.json), commit fa6ed7b83c9e9fb9bcfab887441164c1f611174b.
- Conditional E primary, three native schedule forecast cutoffs and separate AIRBORNE preserved. Native scheduled departure as forecast reference is a different semantic proposition from authentic physical scheduled/actual gate-out pair. Do not infer actual-only labels from revisedTime, Live, or estimated runway. Historical missingness/conditional target not silently relabelled; no new paid test to repeat Nov6.

## Implemented final existing release bundle and manifest storage
[Pure policy cross-binding](review-tools/p5_exact_final_release_policy_bindings.cjs), blob 34156ac65811165c0d217e7175f8643eeef55761; [owner final bundle tool](review-tools/p5_exact_final_release_bundle_owner.cjs), blob cf5c220fa4c44c13c93e8bfe58f72f5a5bc635ed. Reuse existing compiler, committed-plan parity checker, scoped AUTH ledger reader, existing activation review verifier, existing owner admission and one-use provider mutation advisory lock. No new source release path; utilities are owner review branch files outside the executable inventory. Exact approved manifest is stored in existing clean.adb_collection_meta at phase5_frozen_manifest:<actual approved SHA256>, only before first inert stage and only with actual ledger-approved AUTH and genuine exact private final-policy review. No generic UPDATE, no source use permission inferred. Atomic insert, same-byte reuse only if authority/exposure empty, fresh separate read-only byte and authority comparison, unknown commit refuses replay. Validate complete private final six-policy shared pins, all six signer fingerprints, exact timezone catalog, all 31 plans, daily/signing transport hashes, true reviewed native/later/T24/post scope, validity through tail, GitHub secret lengths. Produce one private static-secret-values file (no credential/key or approval flags written by tool), rather than manually preparing each secret. Final actual stage uses already installed B0062/V0093 writer roles and existing workflow. Rebind actual executable inventory only when main changes; no circular final-Git-SHA dependency in AUTH because exact private policy review occurs after final metadata commit and final main pin.

Validation: 22 synthetic positive/negative six-policy/manifest cases (actual candidate shape used as fixture, mock fingerprints/hash), 11 mocked-PG/GitHub transaction cases (positive write+separate readback, current empty authority, existing exact reuse, wrong actor, lock conflict, active auth, differing manifest, unknown commit, readback drift and authority race, stale review); 33 passed. No native Node/production Postgres execution of new final owner bundle yet; actual approved input files/ledger entry are required. No approval generated by these tests. Do not run final bundle against candidate files.

Final driver expects one private approved input directory with approved-manifest.json, approved-config.json, source-inventory.json, approved-external-input.json, approved-timing-input.json, approved-auth.json, approved-policy-objects.json, approved-private-policy-review.json, exact saved public-provider-contract-CANDIDATE.json. Inputs are actual existing release-review material, not fixtures/placeholder values. The approved private review is explicit acceptance of the final six exact policy payload hashes and code/manifest/config/release/rights, with reviewer identity/time and independent source/daily/signing/transport/native/post scopes. Its digest is supplied by reviewer after the final code pin, and not committed into a SHA-circular AUTH ledger. Invoke the driver with exact fetched core blob, mode VERIFY_AND_EXPORT_EXACT_APPROVED_BUNDLE or STORE_EXACT_APPROVED_MANIFEST_AND_EXPORT_NO_PROVIDER, directory path and the actual independent review SHA. Existing owner DATABASE_URL and STOP env, exact clean current main checkout, and existing tsx required, no new role. Do not ask owner to run this before genuine inputs exist.

## One current owner operation (not another inventory)

Fresh account evidence and external active subscription list must be actual, not infer zero from local DB. Use the existing free strict balance and subscription LIST APIs (balance before/after; no FIDS, refill or Alert mutation), one public receiver health GET for exact historical reviewed V4 source, and present candidate mode flags (not secret values or global published STOP). Persist only sanitized canonical evidence privately and print its SHA256. Actual free endpoint receipt can be incorporated into existing no-refill budget review; if quota changes or subscription active, review visible actual differences rather than silently force old values. No DB reads, no Azure/Neon management mutation, no redoing signing keys or calendar. Five isolated account reducer checks passed; actual owner execution pending.

```bash
cd ~/workspace
bash <<'P5_FRESH_ACCOUNT_STOP'
set -Eeuo pipefail
set +x
umask 077
REPO=HKcode22/ReplitTranvr
ROOT="$(pwd -P)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
fetch_blob() {
  gh api "repos/$REPO/git/blobs/$1" --jq '.content' | base64 --decode > "$2"
  test "$(git hash-object "$2")" = "$1"
}
fetch_blob 69a28f547906d1f3b088b33439985319dbaa7e49 "$TMP/owner.cjs"
fetch_blob bf960455d883e16bb569f648981593d5290d1009 "$TMP/limiter.ts"
fetch_blob ca12ed74dd6a0e4dc8d76480c520cc128f69b94d "$TMP/health.ts"
printf '%s\n' '{"type":"module"}' > "$TMP/package.json"
node --check "$TMP/owner.cjs"
test -x "$ROOT/node_modules/.bin/tsx"
timeout 100s env -u NODE_OPTIONS "$ROOT/node_modules/.bin/tsx" \
  "$TMP/owner.cjs" "$TMP/limiter.ts" "$TMP/health.ts"
P5_FRESH_ACCOUNT_STOP
```

No change to owner research-retention request or support follow-up: no duplicate provider email; no rights assertion from silence, no raw TTL extension. Actual stored final manifest, actual independent five-evidence scoped AUTH, final policy review, calendar/cost staging, readbacks and separately authorized paid activation are not yet executed. Strict existing compact launch before Nov19 23:10Z/15:10 Pacific; first source 23:45Z. If missed, exact prospective date review (no redraw/backfill), not weakening cutoff. No provider calls, production DB writes, secret mutations or dispatch during this assistant continuation. The seven earlier owner key writes are real and closed.
