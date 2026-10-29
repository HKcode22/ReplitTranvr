# Gate05 — chosen zero-paid live ADS-B finite continuity experiment (October 29, 2026)

Owner direction: **adsb.lol live public API only for position research**, **NO historical archives**, **NO email/contact request**, **NO new AeroDataBox billing**, **NO Replit Agent/Cloudflare**, **GitHub-only automation**.

## What was proven
- Original WSSS callback originals: 28/28 verified; 151 items; 68 EnRoute/Departed and 0 original position objects. Provider Alert status and ADS-B location are distinct products.
- First one-time external WSSS adsb.lol response [GitHub #40856550765](https://github.com/HKcode22/ReplitTranvr/actions/runs/40856550765): 12 aircraft records, 11 recent positions. ONE snapshot only; aircraft NOT tied to WSSS operating flight identities.

## Concrete next experiment (finite, no repeated setup)
A separate GitHub Actions workflow observes up to 6 live snapshots of the same WSSS 60-nm area at >=60-second intervals, with at most one public GET per snapshot and zero retries. Fixed UTC slot schedule 00:13 / 08:13 / 16:13, plus one source-merge launch. **The script stops making API calls at November 1, 2026 00:00 UTC**, regardless of scheduled workflow runs, which may continue as inert zero-GET checks until the workflow is removed. GitHub schedule timing is approximate.

Each sample is validated by the existing strict adsb.lol normalizer: provider clock, <=30s source position age, coordinates, radius, and separately recorded receipt availability. Ephemeral in-memory association of valid icao24 repeats computes plausible vs discontinuous successive aircraft observations. ONLY anonymous counts are published to public GitHub logs. No hex, callsigns, coordinates, raw response, database, file or object writes. No AeroDataBox calls or subscriptions.

**Decision:** This is an experimental, strictly limited research validation, not an indefinite production dependency. adsb.lol public terms allow free API queries but ask users to contact the operator before production use to avoid unexpected breakages. The owner declines outreach. Therefore no uptime guarantee or permission assumption, no open-ended schedule, and no deployment into the consumer app yet. This research is bounded, not operational production. See https://api.adsb.lol/docs and https://www.adsb.lol/docs/open-data/api/ ; ODbL 1.0 applies.

Success means multiple **fresh candidate aircraft positions** are returned and some temporally plausible continuity exists. It **does not mean** those tracks were operated scheduled WSSS legs, continuous all-day coverage, certain departure runway event, authorized long-run production SLA, valid PRE as-of cohorts, or strict original f.8 §16 PASS.

## Follow-through without waiting on historical source or vendor email
Continue Phase4 **offline** engineering in parallel: durable LOGGED lineage (not sole UNLOGGED runtime), deterministic airline operating-leg/callsign/icao24/time evidence and ambiguity quarantine, source outage/staleness as missing rather than negative, timestamp arrival as feature availability, and an independently approved **new versioned prediction target** if actual-vs-scheduled runway clocks are unobtainable. Do not relabel `actual_wheels_off - scheduled_wheels_off` to ADS-B approximate airborne status.

Provider original paid WSSS exact subscription was stopped; the owner DB state `ACTIVE` residue still requires separate authenticated **no-paid DB-only** state transition. Previous 151 Alert credits are spent; no new paid authorization.

**Research release boundary:** No long-run paid Phase4/6 expansion; no additional AeroDataBox retest. CI must pass before merge; a research observation is not independent production acceptance. Source of truth [issue #173](https://github.com/HKcode22/ReplitTranvr/issues/173) and [Phase3 README](README.md).
