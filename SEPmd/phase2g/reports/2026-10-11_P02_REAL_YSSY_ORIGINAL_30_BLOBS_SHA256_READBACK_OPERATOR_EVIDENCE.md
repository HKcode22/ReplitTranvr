# P02 historical P2G24 original content — complete object readback/hash audit (operator-run, zero mutation)

**Checkpoint:** October 11 2026 UTC; supplied as pasted primary Replit Shell stdout in the current ChatGPT conversation. **This is operator-provided runtime evidence, not a cloud-side audit independently executed by GitHub Actions.** Historical probe selection is YSSY Oct 9, P2G-S1-20261009-23, probe_id=18, session `6267293e-75a0-42a7-b977-89543f200ebc`.

## New verified-by-script evidence

The user ran the P02 read-only original 30-blob verification block in their existing `~/workspace` primary Replit app. The block attempts the reviewed file `scripts/v39_p2g24_readonly_blob_integrity_audit.ts` only when its `git hash-object` equals the exact expected Git blob SHA `a606576d7f12d46e5f87cd9c8c11abadd381af21`; otherwise it executes an inline equivalent with read-only SELECT/ROLLBACK, frozen failed-probe contract, 30 object-ref validation, download and SHA-256 plus byte-length checks. **The stdout does not reveal which branch was taken**, so do NOT claim this was certainly the reviewed-file execution. Both intended branches are nonmutating and no provider API calls.

The original stdout exactly reported:

```json
{
  "status": "PASS_ALL_30_SHA256_AND_BYTES",
  "references": 30,
  "verified": 30,
  "mismatched": 0,
  "inaccessible": 0,
  "failures": [],
  "database_mutations": 0,
  "object_storage_mutations": 0,
  "aerodatabox_calls": 0
}
```

**P02 result**: all 30 historical database-referenced stored provider-content objects were accessible to this running primary Replit environment **at the time of the audit** and matched their saved per-object SHA-256 and byte counts; no content mismatch or download failure was reported. **Mark P02 subgate HISTORICAL 30-OBJECT INTEGRITY VERIFIED (operator shell)**. No bytes, raw flight notifications, object keys, provider IDs or sensitive callback URLs were printed or committed.

The immediately preceding user P02 read-only DB preflight at `2026-10-11T05:20:47Z` independently printed 30 references, zero deletion markers, earliest nominal expiry `2026-10-16T04:02:22.780Z`, latest `2026-10-16T04:52:22.024Z`. The failed/censored/UNRESOLVED probe remains such; the separate DB epoch started `2026-10-11T05:20:34.452Z` but its reason and exact preceding UNLOGGED delta remain unknown. The primary workspace at the earlier check was locally clean on `phase2g-p2g24-manual-receiver-repair-20261009`, HEAD `d5db303d25694f355289587e97cb4972a975b87e`, NOT connected GitHub's isolated investigation branch; no checkout/reset was performed by this audit.

## What this does and does NOT close

**Closed:** the bounded actual *stored-object* readback/SHA/size check for all 30 preserved historical provider-content entries. Historical records can be re-examined as **verified saved-byte samples**, subject to their actual canonicalization/source attribution, scientific metric, privacy and retention conditions.

**Not proven:** authenticated original literal HTTP on-wire bytes (ordinary V3.9 stored canonicalized parsed JSON); upstream AeroDataBox POST attempts never received; per-attempt source UTC and provider billable item ledger; historical 260 billed / 259 internally accounted; original 120-minute YSSY scientific completeness; exact incident cause; service availability after this audit; independent 168h+ cross-platform custody; live physical-flight-v2 deployed parity; future 120-minute trial. DO NOT label P2G24 a success because the 30 saved objects passed checksum. The 30 refs are **not** 30 proof-of-complete original flights or attempt ledger.

**Remaining P02 retention risk**: the referenced objects' current retention metadata expires Oct 16; readback is a point-in-time integrity check, not future immutability or preservation. A separate privacy-approved archival/retention decision might be useful, but requires explicit scope, lawful access and assessment of any new storage/billing; do NOT extend or copy raw flight content automatically.

## Next action

Update [P01–P20 tracker](2026-10-10_P01_P20_SUNDAY_YSSY_RELEASE_LEDGER_AND_ZERO_CREDIT_COMMANDS.md), keep original failure classification unchanged and prioritize P09 first-hop original-source risk, P14 sender/credit identity, P18 deployed receiver/physical-v2 build parity and P20 hosted real-time no-provider rehearsal. Historical proof makes some observed-subset descriptive science possible only once actual row identity/metric/provenance gates also pass. Do NOT convert it into upstream completion by assumption.

**Paid YSSY Oct11 20:00 PDT remains NO-GO based on those independent release blockers.** Zero new AeroDataBox credits/provider calls, Replit deploys, production SQL writes, App Storage writes, Cloudflare provisions or GitHub main merges were performed here.
