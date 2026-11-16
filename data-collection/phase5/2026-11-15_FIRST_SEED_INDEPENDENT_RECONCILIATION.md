# Phase 5: independently reconciled first-seed planning packet

**Review only — NOT authorized collection, NOT actual spend.** No provider call, no database write, no workflow dispatch, no new seed. The original GitHub artifact was downloaded and its exact archive verified against GitHub metadata. A local independent enumeration reproduces the core planning amounts. This does not certify source rights, timing or scientific truth.

- Original seed run: 43700154416
- Existing review artifact: [14185419539](https://github.com/HKcode22/ReplitTranvr/actions/runs/43774511200/artifacts/14185419539)
- ZIP SHA-256: `4592d797cdf6224796c9267affc048924f0a022232d23c430fb0783a40a58527`
- Embedded JSON SHA-256: `4d6c1cb3fa54a054ee6515a30d5df382eecf1b80f502e003a9306bf0350f5ab5`
- Embedded code candidate: `200021b3851c39b3faf897883aa88eeb9214418e` (historical candidate, not current main approval)
- Current main preserved for pending owner handoff: `fa0e9430505170bc3805360126d7fb836dd7e3ea`
- Original calendar rows SHA-256: `45a44fffeb774b5d0829487bd82f1a4a40f70085bc776f269cf04f0a8c70962c`

## Confirmed arithmetic

| Planned metric | Independently reproduced |
|---|---:|
| Parent days | 31 |
| Active exposure segments | 34 |
| Maximum exposure hours | 128 |
| Source request templates | 6,144 |
| Source base + split units | 12,288 |
| All seven cost categories | 41,960 |
| UTC charge dates | 47 |
| UTC date/category rows | 329 |
| Peak date | Nov 27, 2026 |
| Peak proposed daily units | 1,228 |
| Protective floor / project ceiling | 1,000 / 50,000 |
| Remaining headroom after floor | 7,040 |

## Parent-day calendar (UTC)

The pairing and proposed exposure windows are preserved exactly. Ordinary future airport selections remain intentionally unknown; the listed anchor is not a completed four-airport draw. Request counts are planned templates assuming the 15-minute refresh, 4 slots and 3 horizons, not actual flight counts. Split windows preserve their inactive gap.

| Day | UTC start | Exposure shape | Split | Anchor | Planned source GET templates |
|---:|---|---|---|---|---:|
| 1 | 2026-11-22 00:00 | 4h | train | OMAA | 192 |
| 2 | 2026-11-23 04:00 | 4h | train | WSSS | 192 |
| 3 | 2026-11-24 08:00 | 2x2h | train | YSSY | 192 |
| 4 | 2026-11-25 12:00 | 4h | train | SKBO | 192 |
| 5 | 2026-11-27 16:00 | up-to-6h | train | SKBO | 288 |
| 6 | 2026-11-28 20:00 | 4h | train | WSSS | 192 |
| 7 | 2026-12-05 00:00 | 2x2h | train | OMAA | 192 |
| 8 | 2026-12-07 04:00 | 2x2h | train | WSSS | 192 |
| 9 | 2026-12-08 08:00 | 4h | train | YSSY | 192 |
| 10 | 2026-12-09 12:00 | up-to-6h | train | SKBO | 288 |
| 11 | 2026-12-11 16:00 | 4h | train | SKBO | 192 |
| 12 | 2026-12-12 20:00 | 4h | train | YSSY | 192 |
| 13 | 2026-12-14 00:00 | 4h | train | OMAA | 192 |
| 14 | 2026-12-15 04:00 | 4h | train | WSSS | 192 |
| 15 | 2026-12-16 08:00 | 4h | train | YSSY | 192 |
| 16 | 2026-12-17 12:00 | 4h | train | OMAA | 192 |
| 17 | 2026-12-18 16:00 | 4h | train | SKBO | 192 |
| 18 | 2026-12-19 20:00 | 4h | train | OMAA | 192 |
| 19 | 2026-12-21 00:00 | 4h | train | YSSY | 192 |
| 20 | 2026-12-22 04:00 | 4h | train | WSSS | 192 |
| 21 | 2026-12-23 08:00 | 4h | validation | SKBO | 192 |
| 22 | 2026-12-24 12:00 | 4h | validation | WSSS | 192 |
| 23 | 2026-12-25 16:00 | 4h | validation | SKBO | 192 |
| 24 | 2026-12-26 20:00 | 4h | validation | OMAA | 192 |
| 25 | 2026-12-28 00:00 | 4h | validation | YSSY | 192 |
| 26 | 2026-12-29 04:00 | 4h | test | OMAA | 192 |
| 27 | 2026-12-30 08:00 | 4h | test | WSSS | 192 |
| 28 | 2026-12-31 12:00 | 4h | test | YSSY | 192 |
| 29 | 2027-01-01 16:00 | 4h | test | SKBO | 192 |
| 30 | 2027-01-02 20:00 | 4h | test | OMAA | 192 |
| 31 | 2027-01-04 00:00 | 4h | test | WSSS | 192 |

## Proposed UTC-day REST ceilings by category

These rows allocate capacity, not costs already incurred. The source budget follows the physical UTC charge day, which can be earlier than the service day.

| UTC date | Base | Split | Retry | Validation | Outcome | Bootstrap | Diagnostic | Total |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 2026-11-20 | 8 | 0 | 2 | 0 | 0 | 0 | 8 | 18 |
| 2026-11-21 | 304 | 0 | 32 | 0 | 0 | 0 | 8 | 344 |
| 2026-11-22 | 272 | 0 | 28 | 16 | 640 | 0 | 8 | 964 |
| 2026-11-23 | 312 | 0 | 32 | 16 | 640 | 0 | 8 | 1,008 |
| 2026-11-24 | 384 | 0 | 40 | 16 | 640 | 0 | 8 | 1,088 |
| 2026-11-25 | 256 | 0 | 26 | 16 | 640 | 0 | 8 | 946 |
| 2026-11-26 | 128 | 64 | 20 | 0 | 640 | 0 | 8 | 860 |
| 2026-11-27 | 384 | 128 | 52 | 16 | 640 | 0 | 8 | 1,228 |
| 2026-11-28 | 256 | 0 | 26 | 16 | 640 | 0 | 8 | 946 |
| 2026-11-29 | 0 | 0 | 0 | 0 | 640 | 0 | 8 | 648 |
| 2026-11-30 | 0 | 0 | 0 | 0 | 640 | 0 | 8 | 648 |
| 2026-12-01 | 0 | 0 | 0 | 0 | 640 | 0 | 8 | 648 |
| 2026-12-03 | 8 | 0 | 2 | 0 | 0 | 0 | 8 | 18 |
| 2026-12-04 | 304 | 0 | 32 | 0 | 0 | 0 | 8 | 344 |
| 2026-12-05 | 72 | 0 | 8 | 16 | 640 | 0 | 8 | 744 |
| 2026-12-06 | 192 | 0 | 20 | 0 | 640 | 0 | 8 | 860 |
| 2026-12-07 | 320 | 0 | 32 | 16 | 640 | 0 | 8 | 1,016 |
| 2026-12-08 | 384 | 64 | 46 | 16 | 640 | 0 | 8 | 1,158 |
| 2026-12-09 | 256 | 128 | 40 | 16 | 640 | 0 | 8 | 1,088 |
| 2026-12-10 | 128 | 0 | 14 | 0 | 640 | 0 | 8 | 790 |
| 2026-12-11 | 384 | 0 | 40 | 16 | 640 | 0 | 8 | 1,088 |
| 2026-12-12 | 264 | 0 | 28 | 16 | 640 | 0 | 8 | 956 |
| 2026-12-13 | 304 | 0 | 32 | 0 | 640 | 0 | 8 | 984 |
| 2026-12-14 | 272 | 0 | 28 | 16 | 640 | 0 | 8 | 964 |
| 2026-12-15 | 312 | 0 | 32 | 16 | 640 | 0 | 8 | 1,008 |
| 2026-12-16 | 384 | 0 | 40 | 16 | 640 | 0 | 8 | 1,088 |
| 2026-12-17 | 384 | 0 | 40 | 16 | 640 | 0 | 8 | 1,088 |
| 2026-12-18 | 384 | 0 | 40 | 16 | 640 | 0 | 8 | 1,088 |
| 2026-12-19 | 264 | 0 | 28 | 16 | 640 | 0 | 8 | 956 |
| 2026-12-20 | 304 | 0 | 32 | 0 | 640 | 0 | 8 | 984 |
| 2026-12-21 | 272 | 0 | 28 | 16 | 640 | 0 | 8 | 964 |
| 2026-12-22 | 312 | 0 | 32 | 16 | 640 | 0 | 8 | 1,008 |
| 2026-12-23 | 384 | 0 | 40 | 16 | 640 | 0 | 8 | 1,088 |
| 2026-12-24 | 384 | 0 | 40 | 16 | 640 | 0 | 8 | 1,088 |
| 2026-12-25 | 384 | 0 | 40 | 16 | 640 | 0 | 8 | 1,088 |
| 2026-12-26 | 264 | 0 | 28 | 16 | 640 | 0 | 8 | 956 |
| 2026-12-27 | 304 | 0 | 32 | 0 | 640 | 0 | 8 | 984 |
| 2026-12-28 | 272 | 0 | 28 | 16 | 640 | 0 | 8 | 964 |
| 2026-12-29 | 312 | 0 | 32 | 16 | 640 | 0 | 8 | 1,008 |
| 2026-12-30 | 384 | 0 | 40 | 16 | 640 | 0 | 8 | 1,088 |
| 2026-12-31 | 384 | 0 | 40 | 16 | 640 | 0 | 8 | 1,088 |
| 2027-01-01 | 384 | 0 | 40 | 16 | 640 | 0 | 8 | 1,088 |
| 2027-01-02 | 264 | 0 | 28 | 16 | 640 | 0 | 8 | 956 |
| 2027-01-03 | 304 | 0 | 32 | 0 | 640 | 0 | 8 | 984 |
| 2027-01-04 | 72 | 0 | 8 | 16 | 640 | 0 | 8 | 744 |
| 2027-01-05 | 0 | 0 | 0 | 0 | 640 | 0 | 8 | 648 |
| 2027-01-06 | 0 | 0 | 0 | 0 | 640 | 0 | 8 | 648 |
| **Total** | **11,904** | **384** | **1,280** | **496** | **27,520** | **0** | **376** | **41,960** |

## Still missing: genuine external review inputs

These eight values are explicitly null in the existing packet. No hashes have been manufactured, no approval flag set, and no current quota or provider pricing independently revalidated.

- `manifestSha256`
- `calendarSha256`
- `configSha256`
- `phase6AuthorizationId`
- `predecessorEvidenceIds`
- `alertSafety`
- `providerRangeEvidenceSha256`
- `timingEvidenceSha256`

The timing candidate is illustrative: 2,700-second staleness, 120-second scheduler slip, 180-second response/persist, 120-second commit margin and 20-minute preparation lead. Actual native GitHub scheduling evidence does not establish these bounds. Do not stage this partial review packet.

## Existing first-day critical dates (Pacific standard time)

- Nov 18, 4:00 PM — proposed early-draw window opens.
- Nov 20, 3:15 PM — strict prospective draw cutoff.
- Nov 20, 3:45 PM — first nominal T−24 source request.
- Nov 21, 9:45 AM — first nominal T−6 request.
- Nov 21, 2:15 PM — first nominal T−90 request.
- Nov 21, 4:00 PM — first study service window opens.

A missed prospective cutoff must be handled via the existing same-seed prospective review, never a retroactive PRE or selective redraw.
