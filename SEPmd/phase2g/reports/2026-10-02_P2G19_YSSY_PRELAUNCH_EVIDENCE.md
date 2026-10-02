# P2G19 YSSY — Prelaunch Evidence Record

Date: 2026-10-02

## Scope decision

The frozen early-pilot selector returned:

- ICAO: YSSY
- replacement: false
- status: PASS_NEXT_YSSY

Scope amendment SHA-256:

`280f9d83d64f2129ef7c579e92b3c803ca6832c5d3d987e1f7b27082f89cc8a6`

## Refill

The project owner authorized an exact Flight-Alert refill after a read-only account check.

Observed before refill:

- Alert balance: 1691
- API units remaining: 59513
- active billable subscriptions: 0

Authorized mutation:

- refill amount: 309 credits
- AUTH: AUTH-20261002-RF2000
- exact target balance: 2000

Observed after refill:

- Alert balance: 2000
- API units remaining: 59204
- active billable subscriptions: 0
- last refilled UTC: 2026-10-02 08:42

Refill result:

`P2G19_YSSY_REFILL=PASS`

## Database readiness before runtime freeze

Read-only checks showed:

- active/settling probes: 0
- open incidents: 0
- open probe budgets: 0
- pre-existing P2G19 probes: 0
- MMUN probe 14: completed
- MMUN reconciliation: MATCH
- MMUN cleanup verified: true

Status:

`PASS_READY_FOR_RUNTIME_FREEZE`

## P2G19 runtime

- source Git head: `7d599e4328ed8d96b0e627e984f1021216cc29d7`
- protected source SHA-256: `29ede394e8c5fb49100811e393eac5ab96e6802960f6c7c4bba51f54e598e26c`
- budget: `P2G-S1-20261002-18`
- runtime file: `artifacts/phase2g-gate2-runtime-P2G-S1-20261002-18.json`
- runtime SHA-256: `22e511d881d9e04fed3f2a7e8bbde97c34886f46a04f192f93cae1e275adcec8`
- runtime binding SHA-256: `87cb40c377da5d5acb311308f718f6717ebe9931fadc5227c7c51fdd81d4e696`
- runtime evidence ID: `RUN-20260915-87CB40C377DA5D5ACB311308F718F6717EBE9931FADC5227C7C51FDD81D4E696`
- Stage-1 reservation: 450
- unsettled margin: 50
- target duration: 120 minutes

## Draft YSSY AUTH

- authorization ID: `AUTH-20261002-P2G19`
- AUTH file: `SEPmd/V3.9_PHASE2G_AUTH_20261002_P2G19.json`
- AUTH SHA-256: `2e45ecf6fd675c644d38532d430612fc499d1e7ac75657f9242fd4a3554e27db`
- Alert-credit ceiling: 500
- valid from: `2026-10-02T11:00:00Z`
- expires: `2026-10-02T15:10:00Z`
- cleanup owner: `scripts/v39_phase2g_github_actions_owner_v39.sh`

At creation time this AUTH was draft-only and unapproved.

## Historical MMUN lifecycle receipts preserved on main

Cleanup:

- `artifacts/phase2g-exact-session-purpose-cleanup-P2G18-MMUN-v2-1790861225198.json`
- SHA-256: `17f8530c9dc407324dcde1ff2700769e51f672c8d1a8bc9353b44f2a8359d82d`

Finalizer:

- `artifacts/phase2g-settling-finalizer-probe14-1790861410050.json`
- SHA-256: `cbc6bddd9e02dd160ba9eff54b06e5880114b20a22b2483d83a968b78ff2203b`

No paid YSSY launch is recorded by this evidence file.


## Supersession before paid launch

A deeper prelaunch operating-hours audit found that the authorized 11:00-13:00 UTC YSSY window maps to 21:00-23:00 Australia/Sydney on 2026-10-02 and terminates at Sydney Airport's legally enforced 23:00 curfew boundary.

No P2G19 YSSY paid launch occurred.

The runtime `P2G-S1-20261002-18` and AUTH `AUTH-20261002-P2G19` are therefore preserved as **SUPERSEDED_UNUSED** evidence and must not be reused.

The superseding prospective scope places SKBO first and blocks YSSY paid execution until a separately frozen local-operating-hours-aware protocol exists.

See:
- `SEPmd/phase2g/amendments/2026-10-02_YSSY_CURFEW_OPERATING_HOURS_CORRECTION.md`
- `artifacts/phase2g-early-pilot-scope-operating-hours-correction-freeze-20261002.json`
