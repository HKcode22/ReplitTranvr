# 2026-11-13 — stop accidental private provider flight-packet leaks into public GitHub

**Verified repository visibility:** `HKcode22/ReplitTranvr` is **public** (GitHub repository metadata `private:false`). Source provider original Contents, full flight-level native later PRE packets, signed private registries, reviewer private keys, database credentials and sensitive legal retention documents must **not** be added to public PRs, commits, checkout paths, Actions logs, or source artifacts.

Existing GitHub `SOURCE`/later-PRE controllers historically read `data-collection/phase5/frozen/*.json` from a checkout. Actual private contents cannot be inserted there, even if SHA-pinned; a SHA is not confidentiality. The new private write-once local publisher [#631](https://github.com/HKcode22/ReplitTranvr/pull/631) and proposed restricted V0094 private PG16 read adapter [#632](https://github.com/HKcode22/ReplitTranvr/pull/632) are designed to keep actual payload bytes out of public version control. Neither alone establishes a live private GitHub-worker transport.

This change:
- Explicitly ignores the **entire** root `/data-collection/phase5/frozen/` directory in `.gitignore`, including source registries and later flight packet shards, rather than adding an allowlist exception for full private Contents.
- Adds `.github/workflows/phase5-public-frozen-private-flight-packet-leak-guard.yml`, invoked for **every** main PR and push, fail-closed if **any tracked path** under the private `frozen/` directory exists or if the protective ignore rule was removed. The job passes no provider, Neon or paid approval secret; it never prints filenames or file contents. It cannot prevent a contributor force-adding sensitive material to an already public PR before the guard runs; manual repository-access controls, proper local secret scanning and no force-add are still required.
- Protects the original source model and explicitly does NOT create a new packet store, signer, publisher, worker, or production credentials. No data is deleted or migrated, as the verified main Git tree currently has **zero** files under the private directory.

Future worker integration should use a separately reviewed narrow private-repository or Neon `bytea` transport to read exact SOURCE/PRE/POST registry bytes, via the **existing** `verifyP5SignedLaterPreDayRegistry` and authentic private real PG16 cutoff checks. It must not re-enable actual private `frozen/` content in this public repository merely to get a green GH child job.

**Science FREEZE HOLD; Phase6 paid GO NO; no live DB write or provider call.**
