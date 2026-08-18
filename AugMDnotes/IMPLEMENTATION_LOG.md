# V3.9 Implementation Log — tracker (explained, plain-English)

> Connected to: `AugMDnotes/V3.9_DataCollectPlan.md` (the binding spec, PART 1).
> This file records **what has been implemented, what is being implemented, what
> still needs doing, and how — step by step** so any work can be audited and
> re-checked if something goes wrong.
>
> Status legend: `[x]` done · `[~]` in progress · `[ ]` pending · `[!]` blocked
> **Newest info is at the TOP of this file.** Scroll up for latest, down for history.

---

## 📍 0. WHERE WE ARE RIGHT NOW (read this first)

**We are at Phase 1 (Gate 0) — DONE ✅. Phase 2 (Gates 1–2) has STARTED: the
coverage frame is measured and sane. No money has been spent on collection yet, by design.**


| Item                            | Status                                                                                                   |
| ------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Balance                         | ✅ **2,901 credits** (was 862) — above the 1,300 reserve+min floor                                        |
| Refill conversion               | ✅ **CONFIRMED**: `npm run refill -- 1` → 862→863 (1 unit = 1 credit)                                     |
| Migrations 0017/0018/0019/0020  | ✅ all applied (fresh boot)                                                                               |
| Migration 0021 (sampling frame) | ✅ added + registered — `clean.adb_sampling_frame` (written by `npm run build-catalog`)                   |
| Migration 0022 (design prob)    | ✅ added + registered — rename to `airport_layer_design_probability`, `is_randomized`/`planned_share`, DB-enforced V3.8 rule + frame invariants |
| Watchdog config                 | ✅ `budget=1900, dailyCap=1900, softStop=50, autoCollect=false`                                           |
| `npm run health`                | ✅ `PASS balance 2901 credits (live-api)` — balance bug fixed                                             |
| `npm run gate0`                 | ✅ runs; `floor intact YES`, `invariant HOLDING`                                                          |
| `npm run coverage` **(Gate 1)** | ✅ **step 10 DONE**: `universeCount 4332`, `catalogCount 276`, `catalogInUniverse 267` (sane: 4332 ≥ 276) |
| Frame build (step 11)           | ✅ **script rebuilt (Option 1) + persisted to DB** — pending the live `npm run build-catalog` on Replit    |
| Collector uses the frame        | ✅ **REWIRED** (2026-08-18): reads `clean.adb_sampling_frame`, refuses if empty; **post_eligible=true** gate for webhook pool; **REGIONAL = genuine normalized probability draw** |
| Design-probability naming       | ✅ **V3.6/V3.8 enforced (2026-08-18)**: `airport_layer_design_probability` + `is_randomized`/`planned_share` + DB CHECK (migration 0022) |
| Credits spent on collection     | ✅ **0** — watchdog is in safe mode, nothing started                                                      |
| ⚠️ Known hazard                 | one old boot (02:07) had `autoCollect=true` (Run-button start); set the Replit Secret to prevent forever |


**What is NOT done yet (next actions, in order — full detail in §1):**

1. [ ] Verify `ADB_AUTO_COLLECT=0` took effect (`npm run logs:last | grep "watchdog started" | tail -1` → ends `autoCollect=false`).
2. [ ] (Optional) Set `ADB_MONTHLY_UNITS=60000` (PART 1 §3.2). **Do NOT set** `ADB_PLAN` — PART 1 doesn't name the plan; verify it from the RapidAPI account at Gate 0.
3. [x] **Confirmed "use the 6 geographic macro-regions"** (verified against the plan's "Priority anchor regions" list — every example airport maps cleanly).
4. [x] 🔴 **THE FRAME DECISION — MADE: Option 1** (added 2026-08-17): the plan §6 says build the frame from the **measured universe**, not our pre-plan static 276. **Chose Option 1** — frame = universe, 276 kept as flagged curated/reference subset, frozen tier rule v1 in the script.
5. [x] 🔴 **COLLECTOR REWIRED TO THE FRAME** (added 2026-08-18): a review found the watchdog still sampled from the old 276; `pickAirportCandidates` now reads `clean.adb_sampling_frame`, **refuses to start if the frame is empty**, filters the webhook pool to **post_eligible=true**, and draws REGIONAL via a **normalized probability draw**.
6. [x] 🔴 **DESIGN-PROBABILITY NAMING + DB RULE (2026-08-18)**: migration 0022 renames `sampling_probability` → `airport_layer_design_probability`; adds `is_randomized` + `planned_share`; enforces in the DB that randomized rows carry a design probability and planned-share rows don't (plan §30 V3.6/V3.8). Also adds frame CHECK constraints (unclassified⇒REGIONAL; pre_eligible = feed_schedule; post_eligible = feed_live OR feed_adsb).
7. [ ] **Run** `npm run build-catalog` (step 11) on Replit per the frame decision → record the tier × region strata + pre/post/both eligible counts.
8. [ ] **Run the two-stage anchor probe** (step 12) → lock the 5-airport pool + scores.
9. [ ] **Pre-freeze gates** (from the 2026-08-18 review): traffic-reference re-tiering for unclassified airports + frozen region validation before the frame is declared final.
10. [ ] Then Phase 3 gates (canary, SOFT_STOP, foreign subscriptions) → Phase 4 census → **only then** the 31-day run.

> ⚠️ **Do NOT start the 31-day run.** `ADB_AUTO_COLLECT` stays `0` until all
> gates (1–5) pass.

---



## 1. 📋 WHAT TO DO NEXT — the exact steps from the plan (read when back in Replit)

> Source: `V3.9_DataCollectPlan.md` §17 runbook. We are here: **Phase 2 (Gates
> 1–2), step 10 done ✅, steps 11–12 next.** We are still **Phase 1 done**, no
> money spent on collection, auto-collect still OFF.



### The order, at a glance


| #     | Step (from plan §17)                                        | Who does it                        | Status      |
| ----- | ----------------------------------------------------------- | ---------------------------------- | ----------- |
| 10    | `npm run coverage` → record universeCount                   | you (done)                         | ✅           |
| 11    | **Stratified catalog build**                                | **I write the script, you run it** | ⏳ next      |
| 12    | **Two-stage anchor probe** → lock 5 airports                | **I write the script, you run it** | ⏳ after     |
| 13–15 | Phase 3: canary, SOFT_STOP test, foreign-subscription check | you + me                           | pending     |
| 16    | Gate 0.5: inspect real payloads                             | you + me                           | pending     |
| 17+   | Phase 4: census validation                                  | you + me                           | pending     |
| —     | FREEZE + the 31-day run                                     | you + me                           | **NOT YET** |


> ✅ YES — §17 ("Step-by-step runbook") is a real section of
> `V3.9_DataCollectPlan.md` (the file in the `AugMDnotes` folder). Everything
> below is taken from that file, section by section.

---



### Step A — housekeeping: how to actually check the two things

**A1. Verify** `ADB_AUTO_COLLECT=0` **is working (your config).**

You already put it in Replit config — good. To PROVE it took effect, run this
in the Replit shell:

```bash
npm run logs:last | grep "watchdog started" | tail -1
```

Look at the end of that line. If it ends with `autoCollect=false`, ✅ it works.
If it shows `autoCollect=true`, the config value didn't reach the server yet —
**trigger a fresh boot** (press the Run ▶ button, or save any file, which
restarts `tsx --watch`) and re-check. The value is read once at server start,
so the check only matters after a boot.

**A2.** `ADB_PLAN` **and** `ADB_MONTHLY_UNITS` **— the honest answer.**

I originally wrote `ADB_PLAN = Ultra` here. **That was wrong** — I got it from
PART 2 §13 (old plan). Let me correct it, straight from PART 1:

- `ADB_MONTHLY_UNITS = 60000` — ✅ this one IS in PART 1 §3.2:
`"60,000 API units (monthly entitlement — VERIFY the actual plan at Gate 0)"`.
- `ADB_PLAN` — ❌ **PART 1 does NOT name the plan.** It only says "VERIFY the
actual plan at Gate 0". So we do NOT know the plan name from the plan file —
only your teammate's RapidAPI login can tell us what the account is billed as.

So the correct guidance is:

```text
ADB_MONTHLY_UNITS = 60000        # from PART 1 §3.2 — confident
ADB_PLAN = (leave it unset until someone reads the RapidAPI account)
```

Setting `ADB_MONTHLY_UNITS=60000` alone is enough to clear the
`VERIFY_AT_GATE_0` for monthly units. The `ADB_PLAN` placeholder will stay
`VERIFY_AT_GATE_0` until a teammate reads the real account name at Gate 0 — the
plan explicitly makes that a manual verification step, so a placeholder is the
honest state.

---



### Step B — the stratified catalog build (plan §17 step 11; PART 1 §4)

**First, the main idea — this is the part that was confusing. Read slowly:**

The plan talks about THREE different lists. Do not mix them up:


| List                  | What it is                                                                                                                                                   | Where it comes from                                                                                    | Size (measured)            |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | -------------------------- |
| **Universe**          | Every airport AeroDataBox can give us (the whole "world" of available airports)                                                                              | **FROM AERODATABOX** (free API call `GET /health/services/feeds/{service}/airports`, union of 3 feeds) | **4,332**                  |
| **Catalog**           | The 276 airports WE chose to study (our curated list, in `adbAirportCatalog_v3.ts`)                                                                          | **FROM US** — it's our own list, AeroDataBox doesn't know about it                                     | **276**                    |
| **Frame**             | The airports the PLAN says we collect from = `universe ∩ feed-eligible` — i.e. the whole collectable universe (every eligible airport, including quiet ones) | Per PART 1 §4                                                                                          | **≈ 4,332** (conceptually) |
| **catalogInUniverse** | How many of OUR 276 catalog airports AeroDataBox can actually serve                                                                                          | Computed = **our catalog ∩ their universe**                                                            | **267**                    |


**Here is the honest truth about the numbers (I verified it in the code):**

1. **4,332 = from AeroDataBox.** Our `listFeedAirports()` calls their free
  endpoint for the 3 feeds and unions the result. That number is theirs.
2. **276 = from US.** It's the count of our own `adbAirportCatalog_v3.ts`
  (30 HUB + 89 MID + 157 REGIONAL). Your memory is right — this number came
   from us, not from AeroDataBox.
3. **267 = a MIX — "our list, restricted to their coverage."** The code does
  `our catalog ∩ their universe`. So 267 = the 276 airports WE chose that
   AeroDataBox can actually serve. The 9 missing (2 MID + 7 REGIONAL) are
   airports **we** picked that AeroDataBox doesn't support — they stay in our
   catalog but can't be collected.
4. **What is "the frame"?** PART 1 §4 defines the frame as
  `universe ∩ feed-eligible` — **keep every eligible airport, including
   zero-yield ones; only coverage-failed leave.** So per the plan, the frame is
   the **whole universe** (~4,332 airports), NOT our 267. The 267 is
   `catalogInUniverse` — a **sanity metric the plan tells us to record at step
   10 / Gate 1** ("universe ≥ catalog": 4,332 ≥ 276 ✓). It is NOT "the frame".

> ⚠️ **Correction note:** an earlier draft of this section called 267 "the
> frame" and said "we sample within the frame (267)". That was misleading. Per
> PART 1 §4 the frame = universe ∩ feed-eligible (the whole universe). The
> 267 = `catalogInUniverse` = "how much of OUR catalog AeroDataBox supports",
> recorded as a Gate-1 sanity metric. The script has been relabeled to build
> the **stratified catalog** (our 276, each flagged in-universe) — not "the
> frame".

> 🔴 **REAL DESIGN GAP (confirmed by git history + plan text, 2026-08-17):**
> **the 276-airport catalog PREDATES the finalized plan and the plan
> explicitly moved AWAY from it.** Git: `adbAirportCatalog_v3.ts` was created
> 2026-08-09 / expanded to 276 on 2026-08-10; `V3.9_DataCollectPlan.md` was
> created 2026-08-13, and the catalog has NOT been regenerated since. The plan
> says, verbatim:
>
> - §6 title: **"Sampling frame v2: from '276 hard-coded' to 'measured
> universe'"** (line 1314)
> - §6 Step 2: **"build the frame from that universe, not from a static 276
> list"** (line 1324)
> - Week-1 plan: "Catalog build script: universe → frame … → **regenerate
> adbAirportCatalog_v3.ts data (or a DB-backed frame)**" (line 1836)
> - R-V3.2: "Expand frame from 276 to the AeroDataBox coverage universe" →
> **"Correct direction"** (line 3309)
>
> So per the plan, the frame should come from the **measured universe** (keep
> every feed-eligible airport), and the catalog itself should be **regenerated
> from coverage** — NOT the pre-plan static 276. Our current script builds from
> the 276 (→267). This is the honest, unresolved decision before step 11 can be
> called final.

**THE DECISION — MADE 2026-08-17: ✅ OPTION 1 (follow §6 literally).**

> Confirmed by the team: the V3.9 plan deliberately moved from "276 hard-coded"
> to "measured universe", and the SJSU/SDSU research (delay propagation along
> itineraries, network GCN-GRU models) argues for a defined **measured** frame so
> the model generalizes beyond a hand-picked set. A fixed 276 panel would have
> forced the study's claim to become "evaluated on a predefined curated panel" —
> a quiet reversal of a frozen design decision. Option 1 keeps the plan's claim
> intact; nothing is spent either way (this is pre-collection build work).

**What we did (Option 1 implemented in** `scripts/build_stratified_catalog.ts`**):**

- **Frame = the measured universe** (`/collection/coverage` → `universeUnion`,
~4,332 feed-covered airports), **NOT** our 276. Every feed-eligible universe
airport is in the frame; zero-yield airports stay (never dropped); only
coverage-failed airports leave.
- **The 276 is preserved as a flagged curated/reference subset.** Its
human-classified tiers (30 HUB + 89 MID + 157 REGIONAL) are kept; each frame
row records `tierSource: "curated" | "unclassified"`.
- **Frozen traffic-tier rule v1** (auditable, changeable only before the run):
curated 276 → their tier; **every other universe airport → REGIONAL, labelled
`tierSource: "unclassified"`** (NOT "default" and NOT a measured traffic class).
No HUB/MID label invented without traffic evidence; matches §8 REGIONAL
("frame = universe ∩ feed-covered", traffic_prior starts at 1.0, uniform
1/|eligible| before probe data). A traffic reference snapshot can re-tier
unclassified airports before the run is frozen.
- **Macro-region mapping extended to the whole universe** (ICAO first-letter
table): K,C,M,T,P → North America; E,L,U,B → Europe; R,V,W,Z → Asia-Pacific;
O,H,F,D,G → Gulf/Africa; S → South America; Y,N,A → Oceania. Every real ICAO
code maps; unmapped codes are reported (should be ~0).
- **Feed eligibility is explicit PER LAYER (this was missing and is now fixed):**
`pre_eligible` = airport has the **FlightSchedules** feed (needed by the PRE
model); `post_eligible` = airport has **FlightLiveUpdates OR AdsbUpdates**
(needed by the POST model). The old "union = one collectable universe" wording
was wrong — an airport being in one feed does NOT mean it's in the others.
- **The frame is persisted to the database** (`clean.adb_sampling_frame`,
migration 0021), because the plan allows a "DB-backed frame" (§6 line 1836)
and the collector has to read it from there.
- **Output:** universeCount, frameCount (curated vs unclassified), unmapped,
pre/post eligible counts, and the 18-cell strata table (tier × region) with
frame + curated counts, empty-cell warning, missing-from-universe list. Tested
locally (mocked coverage): frame=284 in the mock (real run ≈ 4,332), 18 cells
populated, no empty, curated correctly flagged, feed flags correct. 0 new TS
errors (baseline 57 unchanged).

**🔴 FIXES applied 2026-08-18 after a code review (these were real bugs):**

A code review found that even though the **script** built the measured frame,
the **collector (watchdog) still sampled from the old 276** — the frame was
never actually used. Three concrete bugs, all fixed now:

1. **Collector ignored the frame (the big one).** `pickAirportCandidates()` in
   `adbCollectionController_v3.ts` still picked airports from `AIRPORT_CATALOG`
   (our static 276), not from the measured universe. **Fixed:** it now reads
   `clean.adb_sampling_frame` (the DB table, `in_frame = true`) and **refuses
   to start with a clear error if the frame is empty** — it will never silently
   fall back to the 276. The tier mix (1 HUB + 2 MID + 1 REGIONAL) now draws
   from the measured frame.
2. **`sampling_probability` was computed against the wrong denominator.** It
   used `slots / AIRPORT_CATALOG[tier].length` (the old 276). **Fixed:** it now
   uses `slots / frame tier pool size`, and is labelled a **planned share**
   (HUB/MID are deterministic seeded slot-fill, so this is NOT a true
   "realized inclusion probability" — plan §8/§20). It's diagnostics-only;
   weights stay NULL.
3. **Unclassified airports were invisible to tier counting.** `countTiers()`
   only knew about the 276. **Fixed:** frame-only airports now fall back to
   REGIONAL (the §8 long-tail stratum they actually belong to).

Also fixed the misleading wording: the union of AeroDataBox's 3 feeds is the
**provider-supported feed universe**, NOT "one true collectable population" —
that's exactly why eligibility is recorded per feed layer.

**🔴 SECOND REVIEW (2026-08-18) — the statistical mechanics, now fixed:**

A second, deeper review (ChatGPT cross-checked against the binding PART 1,
the code, and the SJSU/SDSU + AeroDataBox docs) confirmed the architecture is
now on the right path, but flagged two MUST-fix items before any real paid
collection, plus a naming rule the plan already demanded. All are now done:

1. **Webhook candidates must be POST-eligible.** The webhook layer supplies
   live/ADS-B (POST/AIRBORNE) observations, and AeroDataBox itself says
   airport subscriptions depend on live/ADS-B coverage. An airport can be in
   the provider union but useless for webhooks. **Fixed:**
   `pickAirportCandidates()` now queries `WHERE in_frame = true AND
   post_eligible = true`. PRE eligibility is still recorded per airport and
   reported at build time (`pre_eligible`, `post_eligible`, `both`), so the
   intersection is visible — but the webhook pool is POST-gated.
2. **REGIONAL is now a genuine normalized probability draw, not "shuffle and
   take first".** The plan §8 defines `p_i = score_i / Σ score`, a true
   distribution with a nonzero floor for EVERY eligible airport. Before probe
   data: uniform `p_i = 1/|eligible|`. **Fixed:** `drawWithoutReplacement()`
   (seeded, reproducible) draws REGIONAL candidates with their conditional
   design probability; the realized draw's `p_i` is what's recorded. HUB/MID
   stay deterministic seeded slot-fill (that's what §30 allows). The adaptive
   `m_i` multiplier hooks in AFTER probe data exists (uniform until then, per
   §8).
3. **`sampling_probability` is gone — the plan's naming + DB rule is now
   enforced (migration 0022).** The plan §30 V3.6/V3.8 says the column must be
   `airport_layer_design_probability` (`_layer_` = can't be misread as
   flight-level), and the DB itself must forbid randomized/planned confusion:
   `is_randomized=true → design probability NOT NULL; is_randomized=false →
   design probability NULL (planned_share may be set)`. **Fixed:**
   migration 0022 renames the columns, adds `is_randomized` + `planned_share`,
   and adds the CHECK constraint to both `adb_collection_subs` and
   `flight_data_pre_post`. HUB/MID rows → `is_randomized=false, planned_share`;
   REGIONAL rows → `is_randomized=true, airport_layer_design_probability=p_i`.
   `sampling_weight` stays NULL always (no auto 1/p, §20). All code, exports,
   and the analysis script were updated to the new names.
4. **Frame CHECK constraints (auditability).** Migration 0022 also enforces:
   `unclassified ⇒ tier=REGIONAL`; `pre_eligible = feed_schedule`;
   `post_eligible = (feed_live OR feed_adsb)` — so the invariant can't
   silently drift.

**Still open (documented as pre-freeze gates, NOT code fixes yet):**

- **Traffic classification of the ~4,000 unclassified airports** is
  *provisionally allowed* as `REGIONAL + traffic_prior=1.0` (plan §8 supports
  a uniform prior before adaptive data), but the plan requires the
  traffic/reference variables to come from a **fixed reference snapshot**, not
  recursively from the collected sample. Before the final freeze we must either
  re-tier from a reference source or explicitly freeze the documented
  "provisional long-tail" claim.
- **Geographic mapping validation.** ICAO first-letter → 6 macro-regions is a
  reasonable project taxonomy but is not a "scientifically validated continent
  classification". Before final freeze: validate every frame airport maps to
  exactly one region (the script already reports `unmapped`, currently 0) and
  freeze the mapping as a reference table.
- **The REGIONAL adaptive `m_i`** (yield-aware multiplier) boots only after
  §23 probe data exists — currently uniform, which is correct pre-probe.

**What step 11 actually does — "build the stratified catalog":**

The **frame** (the universe) gets organized into **cells** by
**primary strata = traffic tier × macro-region** (PART 1 §4, §17 step 11),
and each airport is flagged `curated` (in our 276) or `default` (universe-only).
A "cell" is a group like:

```text
HUB × North America   →  all HUB universe airports in NA (incl. KJFK, KLAX, ...)
MID × Europe          →  all MID universe airports in EU (incl. EDDM, LIRF, ...)
REGIONAL × Asia       →  all REGIONAL universe airports in AP (curated + defaults)
```

PART 1 §4's exact requirements:

1. Primary strata = **traffic tier × macro-region** only (crossing more
  dimensions would explode the cell count).
2. Frame = `universe ∩ feed-eligible`; **keep every eligible airport, including
  zero-yield ones**; only coverage-failed airports leave the frame.
3. Balancing variables (network degree, intl/domestic, carrier diversity, time
  zone) are **reported WITHIN strata, never crossed** — from a **fixed
   reference snapshot** at frame-build time.
4. Catalog regenerates when coverage refreshes (12 h cache).

**⚠️ Correction about the macro-regions:** I previously claimed "the plan §23
lists 6 macro-regions — use all 6". **That was wrong.** §23 is in PART 2 (the
old plan). **PART 1 §4 only says "traffic tier × macro-region" — it does NOT
enumerate which macro-regions to use.** However, the plan's later sections
("Priority anchor regions" list) do enumerate exactly these six: North
America, Europe, Asia-Pacific, Gulf/Africa, South America, Oceania. Since you
asked me to check, I verified every airport in that list maps cleanly into
those 6 regions (none left out). So **the 6-region set is the plan's own
grouping** (from the later plan sections), it covers the world, and every
catalog ICAO maps to exactly one. **Decision: YES — confirmed, use these 6.**

**What the script will output:**

```text
universeCount                 : ~4,332   (measured AeroDataBox universe)
frameCount                    : ~4,332   (every feed-eligible universe airport)
  curated (our 276 ∩ frame)   : ~267
  unclassified REGIONAL       : ~4,000+  (provisional §8 long-tail, traffic_prior=1.0)
unmapped (no region)          : 0
Feed eligibility (per layer, NOT one union population):
  pre_eligible  (has FlightSchedules feed)      : ~N
  post_eligible (has LiveUpdates OR ADS-B)      : ~N
Primary strata (tier × macro-region):
  cell                          frame   curated
  HUB      × North America       ..      ..
  ... (every tier × every region) ...      ...
  REGIONAL × Oceania             ..      ..
Balancing within strata: intl share, carrier diversity, tz, degree — reported
Then: persists the frame to clean.adb_sampling_frame (migration 0021), which is
      the table the collector reads for its daily 1 HUB + 2 MID + 1 REGIONAL mix.
```

---



### Step C — the two-stage anchor probe (plan §17 step 12; PART 1 §8, §9)

**Why it exists (the main idea):** every day, the collection runs 4 slots — 1
HUB ("anchor") + 2 MID + 1 REGIONAL (§8). The **anchor slot** is the backbone
of the sample. PART 1 §8 names the anchor pool `KLAX · EGLL · WSSS · SBGR · OMDB` but calls it **"provisional — finalized only after probing (§9)"**. So
the pool is NOT locked in yet — we must *prove* these 5 are the right anchors
with a standardized measurement before the run. (The anchor score formula is
**frozen in code pre-probe** — we decide the math first, then measure.)

**Step C, numbers 1–3, explained in plain English:**

1. **Stage 1 — shortlist & measure (the "interview round").** We pick ~10–12
  candidate airports across regions. Each is probed with the SAME **2-hour**
   collection, at the SAME time-of-day and SAME weekday-class
   (so the comparison is apples-to-apples — no "peak for A, off-peak for B").
   We record three numbers per airport:
  - `unique-flights/credit` — how much data we get per credit spent,
  - `chain-links/credit` — how many flight-to-flight connections (the
  aircraft-rotation chains) per credit,
  - `stability` — is this consistent, or one lucky day?
   We also **re-probe WSSS and OMAA** the same way as calibration (PART 1 §9
   says WSSS ≈ 331 rows/h, OMAA ≈ 127 rows/h — those become our baselines).
2. **Stage 2 — the "finalist round".** The top ~5–6 from stage 1 get a longer
  confirmation probe (more data → more confidence).
3. **Score & lock — the math.** Every candidate gets one number:
  ```text
   anchor_score =
       40%  exogenous traffic        (published schedules — NOT our data)
     + 20%  geographic / network diversity
     + 20%  carrier / international diversity
     + 20%  standardized observed yield (from the probe)
  ```
   The probe is only **20%** — a single great probe day can't override years of
   scheduled traffic. **Station/API capacity is a separate PASS/FAIL feasibility
   gate** (an airport that can't physically serve enough data is disqualified) —
   it is NOT part of the score, so we never choose "easiest to collect" over
   "most useful information." The final **pool of 5 is locked with its scores**
   before the run.

**Budget:** all probing is hard-capped **inside the 1,900/day budget** (PART 1
§9: "Total probe spend hard-capped within the 1,900/day budget").

**What you will do (after I build it):** `npm run anchor-probe -- --stage 1` →
paste output → `npm run anchor-probe -- --stage 2` → paste output → we lock the
pool. **This is the first command that actually spends a few credits** — small
and capped, but it's real spend, which is exactly what the plan wants us to
verify before the full run.

> ⚠️ Correction note: an earlier draft of this section quoted a "never by fame /
> feedback loop" rule from §23. **§23 is in PART 2 (old plan) — that quote is
> NOT in PART 1.** PART 1's own justification for probing is simply that the
> anchor pool is *provisional* and *finalized only after probing*, with the
> score formula frozen pre-probe (§8, §9). This section now uses only PART 1
> wording.

---



### Step D — do NOT do these yet (the gates are there for a reason)

- ❌ Do **not** start `npm run dev` without `ADB_AUTO_COLLECT=0`.
- ❌ Do **not** delete any AeroDataBox subscriptions (that's Phase 3 step 13).
- ❌ Do **not** start the 31-day run. It waits for ALL gates 1–5 (§17).

---



### What I need from you right now (so we can finish step 11 correctly)

1. ✅ **THE FRAME DECISION — MADE (2026-08-17): Option 1.** Rebuild the frame
  FROM the measured universe (follow §6 literally). Confirmed by the team
   against the binding plan + SJSU/SDSU research on network/delay-propagation
   generalization (a fixed 276 panel would change the study's claim from
   "measured provider universe" to "predefined curated panel").
   The script has been rebuilt accordingly — see §3 Step B.
2. ✅ Confirm **"use our 6 geographic macro-regions"** — already verified they
  match the plan's "Priority anchor regions" list exactly (no pending question).
3. (Optional) Set `ADB_MONTHLY_UNITS=60000` (from PART 1 §3.2) and run the A1
  check command. Do **NOT** set `ADB_PLAN` — PART 1 doesn't name the plan;
   that value must be verified from the RapidAPI account at Gate 0.
4. ✅ (2026-08-18) **Collector rewired to the frame** — a review found the
   watchdog still sampled from the old 276; it now reads `clean.adb_sampling_frame`
   and refuses to start if the frame is empty. See "🔴 FIXES applied 2026-08-18"
   in §3 Step B.
5. Then run `npm run build-catalog` on Replit (step 11) and paste the output —
  the frame is built, frozen tier rule v1 is in the script, the frame is
  persisted to `clean.adb_sampling_frame`, and the 276 is preserved as a
  flagged curated/reference subset.

---



## 2. 🧭 PLAIN-ENGLISH GUIDE — WHAT WE'RE DOING + WHAT ALL THIS OUTPUT MEANS

> If you're confused, read THIS section. It explains the whole project in simple
> words, what `rl5.md` showed, and what every line of that output means. It also
> answers the questions you asked me.



### 2.1 The one-sentence goal

**We are building a scientifically valid dataset of flight-delay events** so that,
later, we can build/predict delays. To do that, we pay a data provider called
**AeroDataBox** for flight data. We get **60,000 API credits per month**, and we
must collect data for **31 days without wasting money or breaking the math**. The
whole plan is the checklist of "gates" we pass before we're allowed to start.

**We are NOT collecting data yet.** Everything so far has been *safety checks*
to make sure: (a) the money system works, (b) the code won't overspend, and (c)
we know which airports we can actually collect from.

### 2.2 The 3 commands you ran in `rl5.md`, in plain English

Your `rl5.md` file shows you ran three commands, in this order:


| Command            | What it does (plain English)                                                                                                  | Verdict                                         |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `npm run health`   | The "doctor's checkup" — is the server alive, is money OK, is data flowing?                                                   | ✅ balance OK, 2 things "FAIL" (explained below) |
| `npm run gate0`    | The "money report" — prints the whole monthly budget, and checks the two safety rules.                                        | ✅ clean                                         |
| `npm run coverage` | The "airport map" — asks AeroDataBox which airports it actually covers, and checks how many of OUR chosen airports are on it. | ✅ clean                                         |


You also ran `gate0` and `coverage` a second time each — that's fine, they're
free to run and just print the same report again.

### 2.3 `npm run health` — every line explained

```
FAIL  data flow     last row 8695 min ago — data has stalled
PASS  balance       2901 credits (live-api)
PASS  rows today    0
PASS  rows total    4316
FAIL  active batch  none running right now (idle)
```


| Line                      | Meaning                                                                                     | Good or bad?                                                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `balance 2901 (live-api)` | You have 2,901 credits on the account right now (read live from the API, not a stale copy). | ✅ **The important one — PASS.** We needed ≥ 1,300.                                                                               |
| `rows today 0`            | No new data collected today.                                                                | ✅ Expected — we haven't started collecting yet.                                                                                  |
| `rows total 4316`         | 4,316 rows already stored (from earlier testing).                                           | ✅                                                                                                                                |
| `data flow FAIL`          | No new row has arrived in a long time (8,695 min ≈ 6 days).                                 | ⚠️ **Expected, not a bug** — nothing has been started, so of course nothing flows. Turns green only after we begin the real run. |
| `active batch FAIL`       | No collection batch is running right now.                                                   | ⚠️ **Same reason** — we haven't started anything.                                                                                |


So: the "FAIL" lines are the *status "paused on purpose"*, not errors. The line
that actually matters — **balance** — is GREEN.

### 2.4 `npm run gate0` — the money report, explained

This prints the monthly budget and two safety checks. The two lines people ask
about are:

```
Latest Flight-Alert balance    2,901 credits (live-api)
Permanent floor (1000) intact  YES
Run-total invariant (≤ 57,900) HOLDING
```


| Line                                     | Meaning                                                                                                                                                                                       |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Permanent floor (1000) intact YES`      | The plan says we must **never** spend below 1,000 credits (that's the emergency cushion). Your balance is 2,901, which is above 1,000 → the floor is "intact" (safe).                         |
| `Run-total invariant (≤ 57,900) HOLDING` | The plan says the whole 31-day run must spend **no more than 57,900 credits**. We've spent **0** so far → 0 ≤ 57,900 → the limit "holds". "HOLDING" just means *still true / still in range*. |


Think of it like a bank account with two rules: "never go below the $1,000
cushion" (floor intact) and "never spend more than $57,900 total" (invariant
holding). Both are checked every time you run `npm run gate0`.

### 2.5 `npm run coverage` — what it did and why it matters

**Why we ran it:** before collecting data, we must prove we can actually get
data from the airports we want. AeroDataBox doesn't cover every airport in the
world, so we ask it: "which of OUR 276 chosen airports are you able to give us?"

**The output, line by line:**

```
universeCount (union)     : 4332    ← AeroDataBox covers 4,332 airports worldwide
catalogCount (ours)       : 276     ← we chose 276 airports for our dataset
catalogInUniverse         : 267     ← 267 of our 276 are collectable ✅
catalogMissingFromUniverse: 9       ← 9 of ours are NOT covered (excluded, fine)
universeNotInCatalog      : 4065    ← the other 4,065 ADB airports we don't want (fine)
byTier (ours, in universe):
  HUB       30/30                  ← all 30 big hubs collectable ✅
  MID       89/87                  ← 87 of 89 mid airports collectable
  REGIONAL  157/150                ← 150 of 157 regional airports collectable
```

**What it means:** of our 276 target airports, 267 are confirmed collectable.
The 9 missing ones (2 mid + 7 regional = 9 ✓) are simply airports AeroDataBox
doesn't cover, so we remove them from the "sampling frame" — that's a normal,
expected step, not a failure. The sanity rule from the plan is
`universe ≥ catalog` → `4332 ≥ 276` ✅.

**This is the first Phase-2 check, and it PASSED.** It's the number we record so
that later we can honestly say "our sample was drawn from a measured, known
universe."

### 2.6 Your questions, answered

**Q1. What does "floor intact YES, invariant HOLDING" mean?**
→ Explained above in §1.4. Short version: "we still have way more than the
1,000-credit safety cushion" (floor intact) and "we've spent 0 out of the
57,900-credit total budget, so the spending limit still holds" (invariant
holding). Both are GREEN.

**Q2. I set** `ADB_AUTO_COLLECT=0` **in Replit config, not Secrets — is that OK?**
→ Yes. Either way works as long as the value actually reaches the server. The
proof is in the log line:
`[adb-collector] watchdog started (... autoCollect=false)`.
If a fresh boot prints `autoCollect=false`, the config setting is working. The
only risk is if Replit ever starts the app *without* reading that config value —
which is why the secret is the more robust spot, but config is fine.

**Q3. Which files did you edit?**
→ Full list with line numbers in **§7** below ("THE CODE CHANGES"). The short
version: the controller (watchdog), the research-store file, the webhook
routes, the database migration list, plus 4 scripts you run on Replit
(`health`, `gate0`, `refill`, `coverage`) and `package.json` wiring them up.

**Q4. How do** `npm run coverage` **/** `npm run gate0` **/** `npm run health` **work? Are
they scripts?**
→ Yes, exactly. In `package.json` there is a `"scripts"` block. Each entry maps
a short name to a TypeScript file run with `tsx`:
`npm run health` → `tsx scripts/check_collection_health.ts`
`npm run gate0` → `tsx scripts/gate0_budget_report.ts`
`npm run coverage` → `tsx scripts/measure_coverage.ts`
`npm run refill` → `tsx scripts/refill_credits.ts`
They run directly from the Replit shell — no server needed.

**Q5. So... are we done? What next?**
→ We finished Phase 0 + most of Phase 1, and just did the FIRST check of Phase 2
(coverage ✅). Not done yet — next is building the stratified catalog (deciding
the exact airport mix), then the anchor probe, then more gates. **Nothing has
spent any money, and the 31-day run has NOT started.** Full roadmap in §8.

**Q6. I'm scared the 276 / 267 numbers are wrong. Are they correct per the
V3.9 plan?**
→ **Part 1 (the arithmetic) is right. Part 2 (the design) — you are RIGHT to
worry, and I verified it in git history + the plan text.** Let me be completely
honest:

**A. The arithmetic is correct** (checked by hand):

- catalog = 30 HUB + 89 MID + 157 REGIONAL = **276** (`adbAirportCatalog_v3.ts`)
- catalogInUniverse = 30 + 87 + 150 = **267** (of our 276, ADB can serve these)
- missing = 89−87 + 157−150 = 2 + 7 = **9** ✓ matches `catalogMissingFromUniverse 9`
- universe − catalogInUniverse = 4,332 − 267 = **4,065** ✓ matches `universeNotInCatalog`
- sanity `universe ≥ catalog`: 4,332 ≥ 276 ✓ → **Gate 1 step 10 PASSED**

**B. BUT there is a real design gap — and it is your worry, confirmed:**

1. **Git history proves the 276 catalog PREDATES the finalized plan:**
  - `adbAirportCatalog_v3.ts` created 2026-08-09, expanded to 276 on 2026-08-10.
  - `V3.9_DataCollectPlan.md` created 2026-08-13.
  - The catalog has **NOT been touched since** — it was never regenerated after
  the plan was finalized.
2. **The plan EXPLICITLY moved AWAY from using the 276 list as the frame:**
  - §6 title (line 1314): **"Sampling frame v2: from '276 hard-coded' to
   'measured universe'"**.
  - §6 Step 2 (line 1324): **"build the frame from that universe, not from a
  static 276 list"**.
  - R-V3.2 review (line 3309): "Expand frame from 276 to the AeroDataBox
  coverage universe" → verdict **"Correct direction"** → measure first (§6).
  - Week-1 plan (line 1836): "Catalog build script: universe → frame stratified
  by traffic tier × macro-region … **→ regenerate adbAirportCatalog_v3.ts data
  (or a DB-backed frame)**".
3. **What this means:** the plan says the **frame = universe ∩ feed-eligible**
  (keep every eligible airport, including zero-yield). Our current
   `build_stratified_catalog.ts` builds the stratified catalog from our **276
   (→267)** instead — i.e. it still uses the pre-plan "276 hard-coded" approach
   as the frame. That contradicts §6 as written.
4. **So:** 276/267 are CORRECT as **measurements** (real numbers, plan-named
  metrics like `catalogInUniverse`), and Gate 1 passes. But **whether our 276
   list should BE the sampling frame is a genuine decision the plan says we
   haven't made correctly yet.** See §3 Step B for the two honest options.

---



## 3. 🔄 RECENT CHANGES — the two latest review rounds (2026-08-18)



### 2026-08-18 — 🗂️ LOG REORGANIZED + `toInt` renamed to `toNum`

- **Log restructured** so current info is at the TOP and old stuff lives in a
  dedicated `## 8. 📦 ARCHIVE` section at the bottom. New order: §0 where-we-are
  → §1 what-to-do-next → §2 plain-English guide → §3 recent changes → §4–§7
  reference (code, phases, money, commands) → §8 archive (old run reports #1–#4,
  audit snapshot, older change log). No content was deleted — just moved.
- **`toInt` → `toNum`** in `adbCollectionController_v3.ts` (the two latest
  review entries below mentioned a `toInt` name; it never truncated — it
  returns numbers as-is — but the name implied integer rounding of the
  design probabilities, so it was renamed to remove that confusion).



### 2026-08-18 — 🔴 SECOND REVIEW: statistical mechanics fixed (POST-gated webhook pool, genuine REGIONAL draw, design-probability DB rule)

**What happened in plain English:** a second, deeper review confirmed the
architecture is now correct in direction, but found two must-fix statistical
issues before any paid collection, plus a naming/DB rule the plan already
demanded. All are implemented, type-checked (still 57 pre-existing errors,
none new), and the dashboard / Step B / this log are updated.

1. **Webhook candidates are now POST-eligible only.** `pickAirportCandidates()`
   filters `post_eligible = true` (live/ADS-B), because the webhook layer
   supplies POST/AIRBORNE observations and AeroDataBox says subscriptions
   depend on live/ADS-B coverage. PRE eligibility stays recorded and reported
   (pre/post/both counts at build time).
2. **REGIONAL selection is now a genuine normalized probability draw** (plan
   §8), not "shuffle and take first fresh": seeded `drawWithoutReplacement()`
   over the eligible REGIONAL pool, uniform `p_i = 1/|eligible|` pre-probe; the
   realized draw's conditional p_i is recorded. HUB/MID remain deterministic
   seeded slot-fill (planned share, §30).
3. **`sampling_probability` → `airport_layer_design_probability`** with
   `is_randomized` + `planned_share`, enforced in the DB (migration 0022):
   randomized rows must carry the design probability; planned-share rows must
   not. This is the plan §30 V3.6/V3.8 rule, no longer only in docs.
4. **Frame CHECK constraints** (unclassified⇒REGIONAL; pre_eligible = feed_schedule;
   post_eligible = feed_live OR feed_adsb) so the frame invariants can't drift.

Still open, documented as pre-freeze gates: (a) traffic-reference re-tiering of
the ~4,000 unclassified airports from a fixed reference snapshot (plan
requires the reference NOT come recursively from the collected sample);
(b) region-mapping validation/freeze; (c) the adaptive REGIONAL m_i, which
boots only after probe data.

**Next step for you:** run `npm run build-catalog` on Replit (step 11), paste
the output. Then step 12 anchor probe. Nothing has been spent; the 31-day run
still has NOT started (`autoCollect=false`).



### 2026-08-18 — 🔴 REVIEW-DRIVEN FIXES: collector wired to the frame, honest tiering, explicit feed eligibility

**What happened in plain English:** a code review of the Option-1 frame build
found three real bugs that would have silently undone the whole frame decision
— even though the build **script** was right, the **collector** was still
sampling from the old 276 list. All three are fixed, type-checked (still 57
pre-existing errors, none new), and the log's Step B / dashboard updated.

1. **The collector ignored the measured frame.** `pickAirportCandidates()` in
   `adbCollectionController_v3.ts` still picked candidates from
   `AIRPORT_CATALOG` (our static 276). Now it reads `clean.adb_sampling_frame`
   (migration 0021, `in_frame = true`) and **throws a clear error if the frame
   is empty** — it can never silently fall back to the 276. The daily
   1 HUB + 2 MID + 1 REGIONAL mix now draws from the measured universe.
2. **`sampling_probability` had the wrong denominator.** It divided by the old
   catalog length instead of the frame tier pool. Now it uses the frame pool
   and is labelled a **planned share** (§8/§20) — diagnostics only, weights stay
   NULL.
3. **Unclassified airports were invisible to tier counting.** `countTiers()`
   now falls back to REGIONAL (their real §8 stratum) for frame-only airports.

Also: `tierSource` renamed `"default"` → **`"unclassified"`** (the plan never
calls unknown traffic a "default class"); feed eligibility is now explicit
**per layer** (`pre_eligible` = has FlightSchedules; `post_eligible` = has
LiveUpdates OR ADS-B) instead of one union population; `build-catalog` runs
`applyBootMigrations()` first so the frame table always exists before it
persists. The frame is persisted to the DB per plan §6 ("DB-backed frame").

**Next step for you:** run `npm run build-catalog` on Replit (step 11), paste
the output. Then step 12 anchor probe. Nothing has been spent; the 31-day run
still has NOT started (`autoCollect=false`).



## 4. 🔍 THE CODE CHANGES AND WHERE — for your curiosity

Everything below is Phase 0 work already in the repo. Read the files to see it.

### 4.1 `server/lib/disruption/adbCollectionController_v3.ts` (the "watchdog")


| Change                                                                            | Where                                                                                      |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Budget default 3000 → **1900**                                                    | `:81` (`batchBudget`)                                                                      |
| Reserve floor 1000                                                                | `:82` (`reserveCredits`)                                                                   |
| Min batch 300                                                                     | `:84` (`minBatchCredits`)                                                                  |
| Daily cap 1900                                                                    | `:95` (`dailyCreditCap`)                                                                   |
| SOFT_STOP margin 50 (stops at 1900−50=1850)                                       | `:102` (`softStopMargin`)                                                                  |
| `ADB_AUTO_COLLECT=0` disables auto-start                                          | `:124-125` (`autoCollect`)                                                                 |
| `maxDeliveryRetries = 0` (1 item = 1 credit)                                      | around `:376` + batch creation                                                             |
| R6 template freeze: refuses wrong window shape / tier mix / crossover-2-without-1 | `readRunTemplate` `:265`, `checkTemplateFreeze` `:331`, called in `startBatchInner` `:593` |
| R7 versioned manifest stamped at batch start                                      | `writeManifest` `:284`, `readManifest` `:319`, called `:709`                               |
| Crossover block completion recorded                                               | `stopBatch` writes `crossover_block_done` `:785`                                           |
| `sampling_weight` stays NULL (removed illegal `1/p`)                              | batch-create SQL                                                                           |




### 4.2 `server/lib/disruption/flightDataPrePostStore_v3.ts` (the "research store")


| Change                                                                                  | Where                                  |
| --------------------------------------------------------------------------------------- | -------------------------------------- |
| `researchEventKey()` — SHA-256 key `evt                                                 | flight                                 |
| `appendResearchEvents()` — writes `flight_events` + `raw_airborne_events`, never throws | `:252`                                 |
| Airborne insert writes `loc_reported_utc` (the 0020 fix)                                | `:280`, `:308`, `:343`, `:365`, `:376` |




### 4.3 `server/routes_v3.ts` (the webhook ingress)


| Change                                                         | Where      |
| -------------------------------------------------------------- | ---------- |
| Imports `appendResearchEvents`, `researchEventKey`             | `:39-40`   |
| Webhook handler calls `appendResearchEvents(...)` after upsert | `:170-172` |




### 4.4 Migrations (schema)


| File                                                       | What                                                                                                                                |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `migrations/0018_collection_v39_delivery_failure_flag.sql` | R5: delivery-failure flag + pause                                                                                                   |
| `migrations/0019_collection_v39_population_and_events.sql` | S1 `flight_population`; S2 raw envelope on `adb_ingest_events`; S3/S4 `flight_events` (event_key, 4 timestamps, 8 ASPM milestones)  |
| `migrations/0020_collection_v39_airborne_time_series.sql`  | S5: `raw_airborne_events`, `clean_airborne_points`, `flight_trajectory`, `flight_airborne_snapshots` (+ the `loc_reported_utc` fix) |
| `server/db.ts`                                             | `BOOT_MIGRATIONS` now lists `0018/0019/0020` (`:37-39`)                                                                             |




### 4.5 Scripts (run from the Replit Shell)


| File                                  | Command                 | What                                                             |
| ------------------------------------- | ----------------------- | ---------------------------------------------------------------- |
| `scripts/gate0_budget_report.ts`      | `npm run gate0`         | Budget-partition report (§3.2) — now reads live balance          |
| `scripts/check_collection_health.ts`  | `npm run health`        | PASS/FAIL health — now reads live balance                        |
| `scripts/refill_credits.ts`           | `npm run refill [-- N]` | Read balance / refill N credits (1 unit = 1 credit)              |
| `scripts/credit_canary.ts`            | `npm run canary`        | R1 exclusivity assert + R3 credit math (Phase 3)                 |
| `scripts/measure_coverage.ts`         | `npm run coverage`      | Phase 2: airport coverage (universe/catalog)                     |
| `scripts/build_stratified_catalog.ts` | `npm run build-catalog` | Phase 2 step 11: measured frame (universe × tier × macro-region) |
| `package.json`                        | —                       | `refill`, `gate0`, `coverage`, `build-catalog` scripts           |


---



## 5. THE PHASES (the whole journey, from the plan §17)


| Phase | Name            | What it is, in plain English                                                                                                                                                                                     | Status                                                      |
| ----- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| **0** | Code deltas     | Make the code safe, budget-protected, scientifically valid. No money spent.                                                                                                                                      | ✅ DONE                                                      |
| **1** | Gate 0          | Record plan/units/balance, one 1-credit refill, confirm 1 unit = 1 credit, print budget report, commit manifest.                                                                                                 | ⏳ NEARLY DONE (refill + conversion ✅; report ✅; manifest ⏳) |
| **2** | Gates 1–2       | `npm run coverage` (✅ step 10 done), stratified catalog (✅ frame decision made = Option 1, ✅ script rebuilt from universe, ⏳ run `npm run build-catalog` on Replit), anchor probe (step 12 ⏳) → lock 5 airports. | ▶️ IN PROGRESS (step 10 ✅, 11 ready-to-run, 12 next)        |
| **3** | Gates 3–4 + 0.5 | Delete foreign subscriptions, credit canary, SOFT_STOP test, inspect real payloads.                                                                                                                              | pending                                                     |
| **4** | Gate 5          | Census validation (FIDS population vs webhook events).                                                                                                                                                           | pending                                                     |
| **5** | FREEZE          | Write versioned manifest, hash test rows. Config cannot change after.                                                                                                                                            | pending                                                     |
| **6** | 31-day run      | Real run: 1,900 credits/day × 31 days.                                                                                                                                                                           | pending                                                     |


**Key rule:** the 31-day run (Phase 6) waits for all gates (1–5) to pass.

---



## 6. THE MONEY NUMBERS (why the budget matters)


| Number          | Meaning                                                                                               |
| --------------- | ----------------------------------------------------------------------------------------------------- |
| **60,000**      | Total monthly API units (real entitlement — VERIFY at Gate 0)                                         |
| **57,900**      | *Spendable* experimental envelope = 58,900 refill − 1,000 floor. **Binding limit for the whole run.** |
| **1,900/day**   | Daily credit ceiling (~60,000 ÷ 31). Watchdog never exceeds it.                                       |
| **1,000 floor** | `ADB_RESERVE_CREDITS` — controller refuses to spend below this.                                       |
| **1,000 REST**  | Separate line for census/FIDS/probes — never from the 57,900 envelope.                                |


Arithmetic: `57,900 + 1,000 floor + 1,000 REST + 100 unallocated = 60,000 ✓`

---



## 7. HOW TO RUN ON REPLIT (commands)


| Purpose                                        | Command                           |
| ---------------------------------------------- | --------------------------------- |
| Start server, NO auto-collect (safe)           | `ADB_AUTO_COLLECT=0 npm run dev`  |
| Start server, auto-collect ON (run phase only) | `npm run dev`                     |
| Live log stream                                | `npm run logs`                    |
| Last 200 log lines (paste back)                | `npm run logs:last`               |
| Full recent log                                | `tail -n 1000 logs/collector.log` |
| Health check                                   | `npm run health`                  |
| Budget report                                  | `npm run gate0`                   |
| Refill / check balance                         | `npm run refill [-- N]`           |
| Canary (Phase 3)                               | `npm run canary`                  |
| Coverage (Phase 2, step 10)                    | `npm run coverage`                |
| Stratified catalog (Phase 2, step 11)          | `npm run build-catalog`           |
| Typecheck                                      | `npm run check`                   |


**To see after a fresh safe boot (the "good" log):**

- `[migrations] applied 0018/0019/0020...` → migrations worked
- `[adb-collector] watchdog started (window=4h, budget=1900 ... autoCollect=false)` → config correct
- `canStart=true` → balance OK (after refill)
- any `error` / `⚠ ALERT` lines → paste back to me

---



## 8. 📦 ARCHIVE — OLD STUFF (run reports, audit snapshot, older change log)

> Everything below is **history** — read it only if you are curious. The current
> state is at the TOP of this file.

---

### RUN REPORT #4 (from `rl4.md`, 2026-08-17) — ✅ IT ALL WORKED

You pulled the code, booted, and verified. Here is the line-by-line verdict.

#### 2.1 What you did and the results


| Step                                          | What the log shows                                                                                                                 | Verdict                          |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `git pull origin main`                        | `AugMDnotes/... IMPLEMENTATION_LOG.md, replitLogs3.md, scripts/check_collection_health.ts, scripts/gate0_budget_report.ts` updated | ✅ got all my fixes onto Replit   |
| Fresh boot (`ADB_AUTO_COLLECT=0 npm run dev`) | migrations `0017/0018/0019/0020` all `applied`                                                                                     | ✅ full S-layer stack live        |
| Watchdog                                      | `budget=1900, dailyCap=1900, softStop=50, reserve=1000, minBatch=300, autoCollect=false`                                           | ✅ safe mode                      |
| `npm run health`                              | `PASS balance 2901 credits (live-api)` + `PASS rows today 0` + `PASS rows total 4316`                                              | ✅ **the live-balance fix works** |
| `npm run gate0`                               | `Latest Flight-Alert balance 2,901 credits (live-api)`, `Permanent floor (1000) intact YES`, `Run-total invariant HOLDING`         | ✅ full budget report clean       |
| Heartbeats                                    | `balance=2901 rowsToday=0 canStart=true` (after refill)                                                                            | ✅ watchdog now *sees* the refill |




#### 2.2 The heart of it — the balance went LIVE

Compare these two heartbeat lines from your own log:

```
03:54:59  heartbeat balance=862  rowsToday=0 canStart=false  ← before refill, below floor
04:04:59  heartbeat balance=2901 rowsToday=0 canStart=true   ← after refill, above floor ✅
```

`canStart=false → canStart=true` is exactly the Gate-0 result we wanted: the
controller is now **allowed** to start a batch. It will not start one on its own
because `autoCollect=false` — that is the correct safe state.

#### 2.3 NEW in this log: `npm run coverage` — Phase 2 Gate 1, step 10 ✅

You ran the coverage measurement (I'd planned it as the very next step — you
beat me to it, and it works):

```
universeCount (union)     : 4332
worldScheduledCommercial  : 4072 (ATAG 2023)
catalogCount (ours)       : 276
catalogInUniverse         : 267
catalogMissingFromUniverse: 9
universeNotInCatalog      : 4065
byTier (ours, in universe):
  HUB       30/30
  MID       89/87
  REGIONAL  157/150
```

What each line means:


| Line                           | Meaning                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------- |
| `universeCount 4332`           | AeroDataBox's airport list (the "universe" we can sample from) — 4,332 airports             |
| `catalogCount 276`             | Our own target catalog — 276 airports                                                       |
| `catalogInUniverse 267`        | 267 of our 276 airports are actually collectable (in the universe)                          |
| `catalogMissingFromUniverse 9` | 9 of ours (2 MID + 7 REGIONAL) aren't in ADB's feed — not collectable, stay in our catalog  |
| `universeNotInCatalog 4065`    | ADB has 4,065 airports we don't target — fine, we only sample our catalog                   |
| `byTier`                       | Coverage per tier: HUB 30/30 ✓, MID 89/87, REGIONAL 157/150 (totals = 276 ✓, missing = 9 ✓) |


Sanity check from the plan (`universe ≥ catalog`): `4332 ≥ 276` ✅ **Gate 1 step 10 PASSED.**
The frame is now measured and sane — this is the number we record before trusting
any sampling claim.

#### 2.4 The 2 remaining `FAIL` lines — both expected (not bugs)

```
FAIL  data flow     last row 8344 min ago — data has stalled
FAIL  active batch  none running right now (idle)
```

- `data flow` **FAIL** — no batch has been started yet (pre-gates), so no new
rows. It will flip to PASS only after the first real batch after the gates.
- `active batch` **FAIL** — nothing is running because nothing was started.
Same reason.
- These are **status, not errors**. The important line — balance — now PASSES.



#### 2.5 ⚠️ One thing to note: the 02:07 boot had `autoCollect=true` again

In your `logs:last` history there is a boot at `02:07:06` with
`autoCollect=true`. This is the **same Run-button / auto-restart** issue from
Run #2: Replit started the server with bare `npm run dev` (no env prefix). It
did **no damage** — balance was still 862 < 1,300, so `canStart` stayed
`false` the whole time — but it is the reason you must add the Replit Secret
(step 2 below) so this can never happen again.

---



---

### RUN REPORT #3 (from `replitLogs3.md`, 2026-08-16) — ✅ REFILL WORKED

**This is the log where we closed Gate 0's refill + conversion checks.**


| What you ran             | What the log shows                                        | Verdict                           |
| ------------------------ | --------------------------------------------------------- | --------------------------------- |
| `npm run refill`         | `creditsRemaining: 862`                                   | ✅ read-only check works           |
| `npm run refill -- 1`    | `Refilling 1 credit(s) ... Success. New balance: 863`     | ✅ **1 unit = 1 credit CONFIRMED** |
| `npm run refill -- 2038` | `Refilling 2038 credit(s) ... Success. New balance: 2901` | ✅ **full refill SUCCESS**         |
| Fresh boot               | migrations `0017/0018/0019/0020` all `applied`            | ✅ S-layer stack live              |
| Watchdog                 | `budget=1900 ... autoCollect=false`                       | ✅ safe mode                       |


**Balance math (from the log):** 862 → +1 → 863 → +2,038 → **2,901**. Now
`2,901 ≥ 1,300` so collection is *allowed* — but `autoCollect=false` keeps it
stopped. Exactly right for Gate 0.

**The 3 "FAIL" lines you were scared about — explained:**

1. `FAIL balance 866` — **a stale-read bug in the health tool, now FIXED.** It
  read the DB column (last webhook row = 866) instead of the live API
   (2,901). `check_collection_health.ts` + `gate0_budget_report.ts` now call
   `getBalance()` live first and print `(live-api)` / `(db-snapshot)`.
2. `FAIL data flow` — expected: no batch started yet (pre-gates).
3. `FAIL active batch` — expected: nothing started yet.

---



---

### RUN REPORT #2 (from `replitLogs2.md`, 2026-08-16) — ✅ 0020 FIXED



#### 5.1 What worked

- **Migration 0020 APPLIED** on the fresh 23:58 boot — the `loc_reported_utc`
fix is confirmed. All 4 airborne tables exist. **Bug closed.**
- All 4 Phase-0 migrations (`0017/0018/0019/0020`) applied.
- Watchdog config correct (`budget=1900, softStop=50, autoCollect=false`).
- **Zero credits spent** (reserve floor held everything).



#### 5.2 The 3 suspicious things, explained

1. `0020 failed` **still appears (14:47, 20:06)** — those are OLD boots
  *before* your redeploy. `collector.log` is append-only, so past failures
   stay visible. The final 23:58 boot **succeeded** — that is the proof.
2. `refillToFullBudget` **changed 3138 → 2038** — expected. The number is
  `budget + reserve − balance`: old code budget 3000 → 3138; new Phase-0 code
   budget 1900 → 2038. Confirms the 1900 budget delta went live.
3. **⚠️ The real anomaly: one boot at 20:06 ran** `autoCollect=true`**.**
  Root cause: Replit's **Run ▶ button** runs bare `npm run dev` from `.replit`
   (no `ADB_AUTO_COLLECT=0`). Your shell command was correct. Nothing spent
   because balance < 1,300. **Fix:** Replit Secrets `ADB_AUTO_COLLECT=0`.



#### 5.3 Refill question answered

YES — you can refill without the RapidAPI dashboard because your teammate
added billing. `refillBalance()` (`aerodataboxLimiter_v3.ts:147`) sends only
`x-rapidapi-key`; RapidAPI honors it because the *account* carries the payment
method. Use `npm run refill -- N`.

---



---

### RUN REPORT #1 (from `replitLogs1.md`, 2026-08-16) — 0020 bug found + fixed



#### 6.1 What worked

- Server booted (`[express] serving on port 5000`).
- Migrations `0018/0019` applied.
- **Phase 0 R-delta config LIVE**: `budget=1900, dailyCap=1900, softStop=50, autoCollect=false` — the code changes were active on first real run.
- `npm run health` + `npm run gate0` both ran.
- Zero credits spent.



#### 6.2 What failed — the 0020 bug you spotted

```
[migrations] failed to apply 0020_collection_v39_airborne_time_series.sql:
        column "loc_reported_utc" does not exist
```

**Why:** migration 0020's index referenced `loc_reported_utc`, but that column
was missing from the table definition. PostgreSQL refused, and because the file
is one transaction, **all 4 airborne tables rolled back**.

**Fix (already applied):**

- `migrations/0020_collection_v39_airborne_time_series.sql` — added
`loc_reported_utc TIMESTAMPTZ` to `raw_airborne_events`.
- `server/lib/disruption/flightDataPrePostStore_v3.ts` — airborne insert now
writes `loc_reported_utc` (column list + values updated 32→33 params).
- Verified: every index column exists; typecheck clean.



#### 6.3 The blocker then

Balance 862 < reserve+min (1,300) → collection paused by design. This is what
Gate 0 fixed (refill → 2,901).

---



---

### AUDIT SNAPSHOT (what existed before Phase 0 — for the record)


| Item                                       | Plan delta                | Code state at audit              | Verified  |
| ------------------------------------------ | ------------------------- | -------------------------------- | --------- |
| Credit accounting (ledger + balance delta) | V3.9 §11, migration 0017  | exists                           | `git log` |
| `maxDeliveryRetries = 0`                   | §15 R-delta / §45.5       | controller + canary              | grep      |
| Daily credit cap 1,900                     | §3.3 / DD-R               | `:95`                            | read      |
| `ADB_BATCH_BUDGET` default                 | §22 fix 3 (must be 1900)  | ❌ was 3000 → FIXED (§7.1)        | read      |
| R1 subscription exclusivity                | §15                       | canary assert — FIXED            | read      |
| R3 credit canary                           | §15                       | `credit_canary.ts` — present     | read      |
| R7 versioned manifest                      | §15                       | `writeManifest` — FIXED          | read      |
| R2 SOFT_STOP margin                        | §15                       | `:102` — FIXED                   | grep      |
| R5 delivery-failure flag                   | §15, migration 0018       | — FIXED                          | ls        |
| R6 crossover template freeze               | §15                       | — FIXED                          | grep      |
| S1–S5 population/airborne layers           | §15, migrations 0019–0020 | — FIXED                          | ls        |
| Gate-0 budget-partition report             | §17 step 3                | `gate0_budget_report.ts` — FIXED | grep      |


---



---

### OLDER CHANGE LOG (2026-08-17 and earlier — full history)
### 2026-08-17 — ✅ FRAME DECISION MADE (Option 1) + script rebuilt from the measured universe

The team chose **Option 1**: follow plan §6 literally — build the frame from the
measured universe, keep the 276 as a flagged curated/reference subset.

- Rationale (team + research): the V3.9 plan deliberately moved from "276
hard-coded" to "measured universe"; SJSU/SDSU work (delay propagation along
itineraries, network GCN-GRU, airborne ETA) supports a **measured, defined
frame** so the model generalizes beyond a hand-picked set. A fixed 276 panel
would have changed the study's claim to "predefined curated panel" — a quiet
reversal of a frozen design decision.
- `scripts/build_stratified_catalog.ts` **rebuilt:**
  - Frame = `universeUnion` from `/collection/coverage` (every feed-eligible
  universe airport, zero-yield kept, only coverage-failed leave) — NOT the 276.
  - 276 preserved as flagged reference subset (`tierSource: "curated"`).
  - Frozen tier rule v1: curated 276 → their tier; every other universe airport
  → REGIONAL (`tierSource: "default"`), traffic_prior starts at 1.0 (§8). No
  invented HUB/MID labels without traffic evidence.
  - Macro-region map extended to the whole universe (ICAO first-letter): added
  P (US Pacific) → North America and B (Iceland/Greenland) → Europe; K,C,M,T
  → NA; E,L,U → EU; R,V,W,Z → AP; O,H,F,D,G → Gulf/Africa; S → SA; Y,N,A →
  Oceania. Unmapped codes reported (should be ~0).
  - Output: universeCount, frameCount (curated vs default), unmapped, 18-cell
  strata table (tier × region, frame + curated counts), empty-cell warning.
- **Tested locally** (mocked coverage): frame=287 test set, 18 cells all
populated, curated correctly flagged, unmapped only a fake `XUUX`; **0 new TS
errors** (57 pre-existing, unchanged).
- Dashboard §0 and "What I need from you" updated: no open decision remains for
step 11 — next action is running `npm run build-catalog` on Replit.



### 2026-08-17 — 🔴 CONFIRMED DESIGN GAP: 276 catalog predates the plan; §6 says "measured universe" (user's worry validated)

The user was right to be scared. Verified with git history + plan text:

1. **Git history:** `adbAirportCatalog_v3.ts` created 2026-08-09, expanded to
  276 on 2026-08-10. `V3.9_DataCollectPlan.md` created 2026-08-13. The catalog
   has NOT been regenerated since the plan was finalized.
2. **The plan explicitly moved away from the 276 list as the frame:**
  - §6 title: **"Sampling frame v2: from '276 hard-coded' to 'measured
   universe'"** (line 1314).
  - §6 Step 2: **"build the frame from that universe, not from a static 276
  list"** (line 1324).
  - Week-1 plan: "Catalog build script: universe → frame … → **regenerate
  adbAirportCatalog_v3.ts data (or a DB-backed frame)**" (line 1836).
  - R-V3.2: "Expand frame from 276 to the AeroDataBox coverage universe" →
  **"Correct direction"** (line 3309).
3. **Arithmetic is still correct:** 276 = 30+89+157; 267 = 30+87+150; 9 missing
  (2 MID + 7 REGIONAL); 4,065 = 4,332−267; Gate-1 sanity 4,332 ≥ 276 ✓.
4. **Action taken:** §1.6 Q6 rewritten to separate "arithmetic is right" from
  "design has a real gap". §3 Step B now presents **two honest options**:
   Option 1 = rebuild frame/catalog FROM the measured universe (follow §6),
   Option 2 = keep 276 as a documented restricted study panel (conscious
   amendment). "What I need from you" updated — the frame decision is now the
   required choice before step 11 is final. No money spent either way.



### 2026-08-17 — FINAL VERIFICATION: 276/267 are correct per the plan (user worried)

User asked for a second, rigorous double-check before trusting the numbers —
done, three independent proofs:

1. **The plan names these exact numbers.** PART 1 §4 (line 215): coverage via
  `GET /api/v1/collection/coverage` → `universeCount`, `catalogInUniverse`,
   `universeNotInCatalog`. Gate 1 (§16 line 903) pass criterion: record
   `universeCount`, `catalogInUniverse`, sane (`universe ≥ catalog`).
2. **The plan's endpoint IS our endpoint.** `routes_v3.ts:410` serves
  `GET /api/v1/collection/coverage` using the same `getAirportCoverage()` the
   `npm run coverage` script calls — same code path, verified.
3. **Hand-arithmetic on the live numbers is internally consistent:**
  - 276 = 30 HUB + 89 MID + 157 REGIONAL (our catalog)
  - 267 = 30 + 87 + 150 (ours that ADB serves)
  - 9 = 2 MID + 7 REGIONAL missing (89−87, 157−150) ✓
  - 4,065 = 4,332 − 267 ✓ (`universeNotInCatalog`)
  - 4,332 ≥ 276 ✓ (Gate-1 sanity) → **step 10 PASSED**

Confirmed honest labeling: 4,332 = ADB's; 276 = ours; 267 = "our list ∩ their
coverage" (the Gate-1 metric the plan asks us to record). None is "the frame"
(frame = whole universe per §4). Added this to §1.6 Q&A as Q6 for the user.

### 2026-08-17 — VERIFIED number origins + regions CONFIRMED (step 11 ready to run)

User asked for a rigorous double-check: "is 276/267 really from AeroDataBox or
from us?" — and it turns out they were RIGHT to ask. Verified in code:

- **4,332 (universeCount) = from AeroDataBox.** `listFeedAirports()` calls
`GET /health/services/feeds/{service}/airports` (free) for the 3 feeds and
unions them.
- **276 (catalogCount) = from US.** It's `adbAirportCatalog_v3.ts`
(30 HUB + 89 MID + 157 REGIONAL). AeroDataBox never returns 276; it's our own
curated list. The user's memory ("some numbers came from us") was correct.
- **267 (catalogInUniverse) = a MIX.** Code does `our catalog ∩ their universe`
→ 267 = our 276 that AeroDataBox can serve. 9 missing (2 MID + 7 REGIONAL)
are airports WE chose that ADB doesn't support (they stay catalogued, not
collectable).
- **"Frame" terminology FIXED.** Earlier log text called 267 "the frame". Per
PART 1 §4 the frame = `universe ∩ feed-eligible` (the whole universe, keep
every eligible airport). 267 = `catalogInUniverse`, a **Gate-1 sanity metric**
("universe ≥ catalog": 4,332 ≥ 276 ✓), NOT the frame. Script relabeled to
build the **stratified catalog** (each airport flagged in-universe).
- **Macro-regions CONFIRMED (user: YES).** PART 1 §4 doesn't enumerate regions,
but the plan's "Priority anchor regions" list enumerates exactly: North
America, Europe, Asia-Pacific, Gulf/Africa, South America, Oceania. I verified
every example airport in that list (KLAX…EGLL…WSSS…OMDB…SBGR…YSSY, 19 total)
maps into exactly one of the 6 — none left out. Log §0 checkbox flipped to
done; §8 phase row updated.
- Log §3 Step B rewritten with the four-row list (universe / catalog / frame /
catalogInUniverse) showing the ORIGIN of each number, and the correction notes.
- Script header/output relabeled: "stratified frame" → "stratified catalog";
`catalogInUniverse (the frame)` → `catalogInUniverse (ours that ADB supports)`.
Re-verified locally: pure function returns inU=267, 18 strata, no empty cells,
0 new TS errors.



### 2026-08-17 — CORRECTION: removed PART-2 (old-plan) claims, PART 1 is the only spec

> The user pointed out PART 2+ of `V3.9_DataCollectPlan.md` are OLD versions and
> **PART 1 (§1–§22) is the only binding spec**. This entry records the fixes:

- `ADB_PLAN = Ultra` **RETRACTED.** "Ultra" came from PART 2 §13 (old). PART 1
§3.2 only says "60,000 API units — VERIFY the actual plan at Gate 0"; it does
NOT name the plan. Do NOT set `ADB_PLAN` — leave it `VERIFY_AT_GATE_0` until a
teammate reads the RapidAPI account. `ADB_MONTHLY_UNITS = 60000` IS confirmed
(PART 1 §3.2). Fixes: §0 next-actions (A2), §3 Step A2, change-log entry below.
- **6 macro-regions RETRACTED as "from the plan §23".** §23 is PART 2 (old).
PART 1 §4 defines primary strata = "traffic tier × macro-region" but does NOT
enumerate the regions. The 6-region set (North America · Europe ·
Asia-Pacific · Gulf/Africa · South America · Oceania) is **our documented
geographic choice**, not a plan mandate — now labeled as such in §3 Step B and
in `scripts/build_stratified_catalog.ts`. The user's yes/no is still pending.
- **267/276/4,332 reframed.** The plan does NOT mandate these counts; §4 defines
the frame conceptually (`universe ∩ feed-eligible`, keep every eligible
airport). 4,332 / 276 / 267 are OUR measured values from `npm run coverage`
(step 10). Fixed §3 Step B.
- **Anchor-probe §23 "never by fame / feedback loop" quote RETRACTED.** Not in
PART 1. PART 1 §8/§9 justify probing by "pool is provisional — finalized only
after probing" + "score formula frozen pre-probe". Fixed §3 Step C.
- **"No tier-empty cells" RETRACTED as §27.1 requirement** (that's PART 2). It
remains in the script only as a helpful warning, not a plan requirement.
- Script header/output refs updated from `§4/§6/§27.1`/`§23` → `PART 1 §4/§17 step 11`. All section cross-refs in the log now point to PART 1.



### 2026-08-17 — `npm run build-catalog` implemented (Phase 2 step 11)

- **New script** `scripts/build_stratified_catalog.ts` + `build-catalog` in
`package.json`. Builds the stratified sampling frame: our 276 catalog ∩
AeroDataBox universe → **primary strata = traffic tier × macro-region**
(PART 1 §4/§17 step 11). Uses **our 6 geographic macro-regions** (our choice,
NOT plan-mandated — PART 1 doesn't enumerate regions).
- Verifies plan requirements (PART 1 §4): `catalogInUniverse` fraction,
missing-from-universe list, zero-yield stays in frame. (Tier-empty-cell check
kept as a helpful warning only.)
- **Tested locally** (mocked coverage): 18 cells (3 tiers × 6 regions), all 276
ICAOs mapped, no empty cells. **0 new TS errors** (typecheck clean for the new
file; the 57 pre-existing errors in `server/routes.ts` + client are untouched).
- Needs user yes/no on "use our 6 geographic macro-regions" then run on Replit.



### 2026-08-17 — Step-by-step detail added for Steps A–C (from the plan)

- **Step A answered from the plan:** verification command for `ADB_AUTO_COLLECT`
(`npm run logs:last | grep "watchdog started" | tail -1` → must end
`autoCollect=false`); `ADB_MONTHLY_UNITS = 60000` (PART 1 §3.2).
⚠️ NOTE: the original entry also claimed `ADB_PLAN = Ultra` — that was from
PART 2 §13 and is **RETRACTED** (see correction entry above).
- **Step B clarified the three lists** (universe 4,332 / catalog 276 / frame
267 = catalog ∩ universe). These are MEASURED values from `npm run coverage`
(step 10) — the plan defines the frame conceptually, it does not mandate the
counts. **We do NOT sample the whole universe** — we sample the frame.
- **Step C anchor probe explained in plain English** — why (prove anchors are
right: PART 1 §8 says the pool is provisional, finalized only after probing),
the interview/finalist rounds, the fixed scoring formula, capacity as a
separate gate, and that probing is the first real (small, capped) spend.
- Updated §0 next-actions + §8 phases to reflect the pending region-choice
decision. (Note: the original entry cited "plan §23 priority regions" — that
was PART 2 and is **RETRACTED**; see correction entry above.)



### 2026-08-17 — Next-steps section rewritten from the plan (§3)

- Rewrote **§3 WHAT TO DO NEXT** into the full plan-ordered steps: Step A
(housekeeping: Secret + VERIFY placeholders), Step B (stratified catalog
build = plan §17 step 11 + PART 1 §4: primary strata tier × macro-region,
balancing variables within), Step C (two-stage anchor probe = step 12 + PART
1 §8/§9: standardized probes, fixed scoring formula, capacity as feasibility
gate), Step D (what NOT to do yet). Added the exact "what I need from you"
list.
- Updated the §0 dashboard next-actions and §8 phases table to match.
- Awaiting user decision on the macro-regions before running
`npm run build-catalog`.



### 2026-08-17 — Plain-English guide added + coverage recorded + renumber

- Added **§1 PLAIN-ENGLISH GUIDE**: what we're doing, what `rl5.md` shows, and
every line of `health` / `gate0` / `coverage` explained in simple words.
- Answered the user's questions in the log itself (§1.6): "floor intact /
invariant HOLDING" meaning, `ADB_AUTO_COLLECT=0` in Replit config vs Secrets,
which files were edited, and how `npm run <x>` scripts work.
- Recorded the `npm run coverage` **result (Phase 2 step 10 ✅)**:
`universeCount 4332`, `catalogCount 276`, `catalogInUniverse 267`
(sanity: 4332 ≥ 276 ✓).
- Renumbered all sections (old §1→§2 … §11→§12) to fit the new §1 guide.
- `rl5.md` = the same run as `rl4.md` plus the coverage output (health/gate0
duplicated). No new failure; the 2 `FAIL` lines remain expected (pre-gates).



### 2026-08-17 — Run #4 analyzed (`rl4.md`); log reorganized

- **Run #4 = SUCCESS.** User pulled the code, booted, ran `npm run health`
(now `PASS balance 2901 credits (live-api)`) and `npm run gate0` (balance
2,901, floor intact, invariant HOLDING). Heartbeats: `balance=2901 canStart=true` after refill; `autoCollect=false`; zero credits spent.
- **Note:** an old 02:07 boot again showed `autoCollect=true` (Run-button
start). No damage (balance was low). Action: Replit Secrets
`ADB_AUTO_COLLECT=0`.
- **gate0 placeholders** `VERIFY_AT_GATE_0` come from env vars `ADB_PLAN` /
`ADB_MONTHLY_UNITS` (`gate0_budget_report.ts:43-44`) — fill from teammate.
- **Reorganized this log:** newest-on-top layout, added a "WHERE WE ARE NOW"
dashboard, added a code-changes reference (§7), moved run reports newest-first.



### 2026-08-16 — Run #3 analyzed (`replitLogs3.md`) + live-balance fix

- Refill SUCCESS: 862 → `-- 1` → 863 (conversion confirmed) → `-- 2038` → 2901.
- **Fixed stale-read bug:** `check_collection_health.ts` + `gate0_budget_report.ts`
now read balance LIVE from AeroDataBox (`getBalance()`), print `(live-api)` /
`(db-snapshot)`.
- Report added (§3 here).



### 2026-08-16 — Run #2 analyzed (`replitLogs2.md`)

- Migration 0020 CONFIRMED APPLIED; `3138→2038` explained (budget 3000→1900).
- autoCollect mystery solved (`.replit` Run button has no env prefix).
- Refill now possible via API key (teammate added billing); added
`scripts/refill_credits.ts` + `npm run refill`.
