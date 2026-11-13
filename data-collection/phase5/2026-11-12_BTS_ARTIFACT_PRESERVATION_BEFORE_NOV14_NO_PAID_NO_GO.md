# November 12 PST / November 13 UTC — preserve original verified BTS artifacts before November 14 expiry

**Status: manual nonpaid archival workflow proposed on a GitHub PR; NOT yet executed and no new archive proven.** This is a **parallel historical-data preservation operation**, not a Phase5 scientific or paid Phase6 release condition. The main critical path remains genuine future B0062 calendar, seven physical UTC REST categories, current source rights/cost, narrow inert staging, independent freeze and paid GO.

## Actual source evidence — checked again after PR #617

Main source of truth: [actual BTS run #43281032803](https://github.com/HKcode22/ReplitTranvr/actions/runs/43281032803). Independent GitHub Actions artifact metadata currently shows **both old artifacts still present, expired=false**:

| Existing artifact | ID | Current expiration (UTC) |
| --- | --- | --- |
| `v39-gate5-bts-aug2026-official-public-source` | `13973225677` | **2026-11-14 18:33:57 UTC** |
| `v39-phase5-bts-aug2026-us-historical-only-not-pre` | `13973485715` | **2026-12-12 18:35:05 UTC** |

Do not confuse GitHub's outer artifact ZIP SHA with the underlying original government ZIP or normalized CSV.gz. The reviewed inner file checksums are:

- Official BTS August 2026 source ZIP: `203509350f574f81728ca51175a17360d0413aa990512f8e0c8f1342f5baf23a`.
- Phase5 normalized historical-only CSV.gz: `406587471b44794ea1f574fad2400fc0bafdd85f6898faa8f41b6706294a4614`.
- Verified published reporting-carrier rows `608389`, signed reported gate-departure-delay labels `597734`, missing tail registrations `1338`. This is a historical **U.S.-only** data lane, not past or current AeroDataBox PRE, not a matched global operating-leg population and not live aircraft tail linkage.

## Concrete new engineering

[`phase5-bts-aug2026-verified-artifact-preservation-manual.yml`](../../.github/workflows/phase5-bts-aug2026-verified-artifact-preservation-manual.yml) is a **STOP-by-default, main-only, manually dispatched** recovery path.

1. On PR, run only the preexisting BTS **synthetic offline self-test**. No transfer or source request. The preservation job is unreachable on PRs/pushes.
2. On **explicit** owner manual `workflow_dispatch` with `COPY_VERIFIED_BTS_TO_90_DAY_ARTIFACTS`, download **only the two already-produced artifact names from exact original run #43281032803** using read-only GitHub Actions token; do not ask BTS or AeroDataBox again.
3. Verify both underlying file SHA-256s, original and normalized manifest fields, expected row/label/missing-tail totals, the CSV.gz gzip integrity, and false PRE/paid/database status before any new upload.
4. Publish **two newly named GitHub Actions artifacts within the same repository**, requesting 90-day retention, without replacing or deleting the original artifacts. If original is missing/expired or any SHA/manifest/gzip check fails, **HOLD and preserve no new artifact**.
5. Independently check the completed run's *actual new artifact IDs, expiry and SHA*; never infer archival success from a green PR CI check alone.

The workflow has **no schedule**, no additional external provider download, no `DATABASE_URL`, no activated worker, no original-source rewriting, and no published GitHub Release or external object storage. These new Actions artifacts are an **interim, expiring safety copy**, NOT permanent Phase7 storage. Actual allowed retention may be shorter if repository/org policy is tighter than the requested 90 days.

### Manual operation after PR review + merge (not yet run)

Use the GitHub Actions UI for the reviewed workflow on **main**, select the affirmative manual confirmation instead of default HOLD, and inspect the run. Equivalently, in an authorized local Shell with `gh` access:

```bash
gh workflow run phase5-bts-aug2026-verified-artifact-preservation-manual.yml \
  --repo HKcode22/ReplitTranvr --ref main \
  -f confirm=COPY_VERIFIED_BTS_TO_90_DAY_ARTIFACTS
```

**No provider key, DB URL, Replit agent, old V0093 installer or paid authorization is required.** Do not call this completed until the successful main-branch workflow produces two real fresh artifacts and an independent later readback verifies them. Because the original ZIP expires **November 14, 2026 at 18:33:57 UTC**, this particular archival action is time-sensitive and should be handled independently of the main Phase6 launch readiness.

## Overall Phase5→6 next sequencing (not changed)

1. Actual independent future-dated full 31-day B0062 calendar/treatment/region plan: 10 known paired airport-window identities, 21 prospective unknown ordinary airport IDs, 20/5/6 holdout, true pre-T24 lead and known-airport washout.
2. Current AeroDataBox/RapidAPI charge units/range/source-use/retention, seven REST categories per *physical UTC charge date*, separate Alert-credit/STOP bounds.
3. Commission **only** the two specifically scoped inert prelaunch writer identities after true review, apply already merged #603 and #608 transaction code with independently pinned inputs, then perform independent read-only Neon readback.
4. Scientific FREEZE separately adjudicated; paid Phase6 GO only with signed external evidence. Do not relabel BTS or optional ADSB.lol as physical operating-leg PRE.

**Current scientific state HOLD; Phase6 paid GO NO.** The merged V0079–V0093 schema and verified Stage14/C+D/ADSB evidence paths remain reusable. No repeat installation.
