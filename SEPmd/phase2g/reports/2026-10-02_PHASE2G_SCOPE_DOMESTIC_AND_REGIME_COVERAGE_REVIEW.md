# Phase 2G Scope Review — What Is Already Covered, What Is Missing, and Whether LKPR Is Worth Running

**Date:** 2026-10-02  
**Status:** Design-review / decision record only — no paid-provider authorization  
**Repository baseline reviewed:** `ce83335d5e8283c068faede456f8d93ce3cec4a1`  
**Context:** WSSS-v2 and OMAA-v2 are scientifically valid and protocol-closed; MMUN-v2 is scientifically valid and protocol-closed but fails the frozen 60 rows/hour capacity gate; the frozen selector currently points to LKPR.

---

## 1. Questions raised by the project owner

The project owner asked, in substance:

1. Are the six Phase-2G macro-regions meant to become the final Phase-6 collection geography?
2. If WSSS and OMAA already provide strong international-hub data, are additional international-heavy Stage-1 airports necessary?
3. How is domestic-flight behavior represented?
4. Was MMUN actually a useful North-American domestic representative?
5. Are there important dimensions missing besides domestic-versus-international mix?
6. Would continuing LKPR/SKBO/YSSY add meaningful scientific information, or merely prolong Phase 2G?
7. Is the current plan/implementation too strict for an early operational pilot?
8. Should Phase 2G be closed now, or should the remaining paid probes be changed prospectively?
9. If the scope is changed, how can it be done without retroactively rewriting WSSS/OMAA/MMUN evidence or cherry-picking a favorable outcome?

This report records the answers and proposed direction.

---

## 2. Critical conceptual correction: the compact-6 is not the final Phase-6 airport set

The six-airport compact Stage-1 set is a **screening design**, not the final collection geography.

The binding V3.9 Plan currently defines:

- a HUB/anchor layer;
- MID-tier slots;
- a REGIONAL slot;
- a region-balanced calendar/selection mechanism;
- a long-tail/coverage-floor mechanism.

The Plan's Phase-6 batch template is:

`{HUB:1, MID:2, REGIONAL:1}`

when the anchor mechanism is enabled.

Therefore:

> Passing or failing a Phase-2G anchor probe does not mean that an entire macro-region will or will not appear in Phase 6.

The MID and REGIONAL layers are the principal mechanisms that can provide wider geographic coverage during Phase 6. Anchor airports are a high-yield rotating HUB layer, not a complete global sample by themselves.

This distinction is important because it means Phase 2G does **not** need one permanent anchor from every world region in order for Phase 6 to contain multiple regions.

---

## 3. What WSSS and OMAA already cover well

### WSSS — Singapore Changi

Frozen pre-probe exogenous attributes:

- region: Asia-Pacific
- traffic metric: 172,463
- route degree: 162
- effective carriers: 6.42
- international share: 0.99965
- domestic share: ~0.00035

Corrected live v2 result:

- 321 provider items / credits
- 141 resolved physical-flight identities
- exact reconciliation `MATCH`
- delivery completeness 1.0
- full uncensored two-hour exposure
- no hard physical-identity-v2 violations

Current Changi Airport Group reporting describes Changi as a global international hub connected to about 170 cities with close to 100 airlines and more than 7,000 weekly flights.

Public source:
https://www.changiairport.com/en/corporate/our-media-hub/newsroom/2025/2024-year-in-review.html

Interpretation:

WSSS strongly covers a **large, highly international, globally connected Asia-Pacific hub** and gives strong evidence for repeated physical-leg updates and international network connectivity.

### OMAA — Abu Dhabi

Frozen pre-probe exogenous attributes:

- region: Gulf/Africa
- traffic metric: 73,914
- route degree: 131
- effective carriers: 2.30
- international share: 0.98878
- domestic share: ~0.01122

Corrected live v2 result:

- 148 provider items / credits
- 75 confirmed physical-flight identities
- exact reconciliation `MATCH`
- delivery completeness 1.0
- full uncensored two-hour exposure
- no hard physical-identity-v2 violations

Abu Dhabi Airports currently describes AUH as a global gateway with more than 100 international destinations and more than 30 international airlines. 2025 passenger traffic reached 32.5 million at AUH.

Public sources:
https://www.adairports.ae/en/our-expertise/zayed-international
https://adairports.ae/en/pressrelease/2026/01/abu-dhabi-airports-closes-2025-with-record-traffic-as--zayed-international-emerges-as-emea

Interpretation:

OMAA covers another international regime, but one that differs meaningfully from WSSS in geography, climate, carrier concentration and hub structure.

### What these two together establish

They establish that the corrected v2 collection system can operate successfully at two real international HUB environments with different traffic/network characteristics.

They do **not** establish that:
- domestic-heavy airports behave the same;
- every macro-region behaves the same;
- European short-haul / low-cost operations behave the same;
- high-altitude Latin-American operations behave the same;
- unseen-region generalization is already proven;
- all final Phase-6 airports should simply be WSSS and OMAA.

---

## 4. MMUN was North America, but it was not a domestic-heavy North-American hub

Frozen pre-probe MMUN attributes:

- region: North America
- international share: 0.69132
- domestic share: 0.30868
- route degree: 102
- effective carriers: 13.65

P2G18 MMUN-v2 final result:

- scientifically valid
- lifecycle complete
- durable reconciliation `MATCH`
- external/internal = 46/46
- delivery gap = 0
- delivery completeness = 1
- rows/hour = 22.9996
- frozen capacity threshold = 60 rows/hour
- capacity gate = FAIL

Current ASUR reporting also shows Cancún as strongly international. ASUR's 2025 filing calls Cancún Mexico's busiest airport for international regular-service passengers, and 60.6% of its international passengers in 2025 began or ended travel in the United States.

Public source:
https://www.asur.com.mx/media/Informes%20Financieros/2026/ASUR-Airport-20F-Financial-Information-Year-2025.pdf

Therefore:

> "North America macro-region" did not mean "North-American domestic operations."

MMUN remains useful scientific evidence: it demonstrated a valid but low-yield tourist/international-heavy hub under the provider's live webhook product. It should not be promoted as an anchor because it failed the prospectively frozen capacity gate.

---

## 5. Domestic/international is not the only missing dimension

A robust aviation-delay pilot can differ across at least the following dimensions.

### 5.1 Domestic versus international market mix

This matters because domestic-heavy networks can have:
- shorter average stage lengths;
- more aircraft rotations per day;
- denser same-tail leg sequences;
- different turnaround patterns;
- different passenger/connection structures.

This dimension is poorly represented by WSSS and OMAA.

### 5.2 Aircraft-rotation / tail-chain density

The project is explicitly motivated by same-aircraft delay propagation.

Chen & Li (SDSU/Purdue, AIAA SciTech 2019) find departure delay and late-arriving-aircraft delay to be important predictive features and construct chained delay prediction.

Source:
https://junchen.sdsu.edu/proceedings/scitech_gnc19_Chen.pdf

Zheng, Wei & Hu (SJSU-associated publication, Aerospace 2021) find that propagation effects vary with aircraft utilization and flight order.

Source:
https://scholarworks.sjsu.edu/faculty_rsca/2410/

Therefore, an airport that produces more repeated same-tail short-haul rotations may add information not supplied by predominantly long-haul international hubs.

### 5.3 Network topology and hub role

Delay behavior can depend on airport/network connectivity rather than only local flight counts.

The 2024 Transportation Research Part E review treats delay propagation from both flight-chain and airport-network perspectives and emphasizes differences across air-transport systems and data/application scopes.

Source:
https://www.sciencedirect.com/science/article/pii/S1366554524001169

### 5.4 Carrier concentration / operating model

The frozen exogenous candidate data already show large differences in effective-carrier diversity.

Examples:
- OMAA: 2.30
- WSSS: 6.42
- MMUN: 13.65
- LKPR: 18.07
- SKBO: 4.37
- YSSY: 6.27

A concentrated hub and a many-carrier airport need not have identical schedule/rotation behavior.

### 5.5 Route-length and schedule structure

Short-haul networks can expose several same-tail legs inside a continuous collection window, while long-haul operations may expose fewer sequential legs.

This directly affects the project's chain-depth metrics.

### 5.6 Weather / operational constraints

Weather and airport operating configuration are not interchangeable across regions.

The SJSU-associated delay-propagation study finds operation-, time- and weather-related factors materially affect delays, including convective-weather effects.

Sydney Airport provides a concrete example of an operational regime not represented by WSSS/OMAA: strong westerly winds can force a change from parallel north/south runway operations to a single east/west runway, materially reducing throughput.

Source:
https://www.sydneyairport.com.au/weather

This is useful because it demonstrates why collecting from operationally different airports can matter beyond a simple continent label.

### 5.7 Geography / regulatory / ATC regime

Airport/airspace systems differ by region, and the project's own evaluation plan contains an unseen-region engine. That claim needs actual cross-region Phase-6 data.

However, the Phase-6 MID/REGIONAL region-balancing mechanism can supply much of this diversity. It does not all have to come from the anchor pool.

### 5.8 Airport-specific constraints

Potentially informative contrasts include:
- coastal/wind-sensitive operations;
- high-altitude operations;
- tropical convection;
- hot/desert operations;
- dense short-haul/low-cost networks;
- long-haul transfer hubs.

No single anchor airport covers all of these.

---

## 6. Remaining compact candidates and what they add

The following values come from the pre-outcome frozen preprobe artifact, not from observed Stage-1 yield.

### LKPR — Prague / Europe

- international share: 0.97073
- domestic share: 0.02927
- traffic metric: 67,100
- route degree: 170
- effective carriers: 18.07

Prague Airport reports 17.75 million passengers in 2025, 194 destinations, 84 airlines and a 45% low-cost-carrier passenger share.

Source:
https://www.prg.aero/en/return-record-numbers-prague-airport-handles-close-178-million-passengers-2025

**Incremental value:** European / intra-European / low-cost / many-carrier international regime.

**Overlap:** still overwhelmingly international, so it is less useful for filling the domestic-heavy hole.

### SKBO — Bogotá / South America

- international share: 0.42749
- domestic share: 0.57251
- traffic metric: 91,600
- route degree: 95
- effective carriers: 4.37

OPAIN's 2025 report shows:
- 45.5 million total passengers;
- 29.3 million domestic passengers;
- 16.2 million international passengers.

Source:
https://www.opain.co/skins/page/infografia/Informe_gestion_2025_version_Web.pdf

**Incremental value:** domestic-majority + substantial international traffic + Latin-American hub environment. It is a strong bridge between the two market types.

### YSSY — Sydney / Oceania

- international share: 0.28541
- domestic share: 0.71459
- traffic metric: 141,036
- route degree: 92
- effective carriers: 6.27

Sydney Airport's current planning material says international passengers are currently just under 40% of total passenger volume. Its 2025 operating results recorded 17.17 million international passengers out of more than 42.54 million total, while the airport also operates major domestic T2/T3 terminals. Sydney Airport describes T2 as Australia's busiest domestic terminal, serving about 17 million passengers annually.

Sources:
https://www.sydneyairport.com.au/corporate/media/corporate-newsroom/sydney-airport-traffic-and-operational-performance-q4-2025
https://www.sydneyairport.com.au/corporate/media/corporate-newsroom/terminal-2-upgrade-to-cut-travel-time-from-kerb-to-gate
https://www.sydneyairport.com.au/corporate/media/corporate-newsroom/sydney-airport-releases-preliminary-draft-master-plan-2045

**Incremental value:** strongest domestic-heavy contrast in the frozen compact-6, high exogenous traffic, plus meaningful international gateway traffic and a distinct coastal/wind-sensitive operating regime.

---

## 7. Is another international region scientifically necessary?

### For Phase-2G anchor feasibility: no universal requirement

No cited source establishes that an early operational pilot must probe exactly six regions, five anchors or a European airport.

The project's own provenance report already states:
- exactly six compact candidates = project-specific;
- two-hour Stage 1 = project-specific;
- 60 rows/hour = project-specific;
- five-anchor architecture = project-specific.

NIST sampling guidance says sample size should depend on:
- the quantity being estimated;
- desired precision;
- process/population variability;
- prior information;
- cost and practicality.

Sources:
https://www.itl.nist.gov/div898/handbook/ppc/section3/ppc333.htm
https://www.itl.nist.gov/div898/handbook/ppc/section1/ppc134.htm

Therefore, continuing LKPR merely because "Europe has not been probed yet" is not a literature requirement.

### But international traffic is not one homogeneous regime

LKPR could still add legitimate information:
- European short-haul structure;
- very high carrier diversity;
- large low-cost-carrier share;
- different ATC/weather/network context.

So LKPR is **not scientifically useless**.

The question is marginal value.

After valid WSSS and OMAA, the largest uncovered axis is domestic/mixed rotation behavior, not a third nearly-all-international hub.

Therefore LKPR's marginal value is lower than YSSY or SKBO for the current pilot.

---

## 8. Recommended scope direction

### Do not launch LKPR merely because the old selector says it is next

The current selector is correctly implementing the currently frozen protocol.

It does **not** answer whether that protocol remains the best use of remaining time and credits for an early operational pilot.

Changing direction must be done prospectively and explicitly; it must not silently reinterpret the old selector.

### Recommended information-efficient path

**Recommended primary next contrast: YSSY.**

Reason:
1. strongest domestic-heavy mix in the frozen compact-6;
2. high pre-outcome exogenous traffic metric;
3. dual PRE/POST eligibility already frozen;
4. still has major international traffic, so it is not a purely domestic special case;
5. adds a distinct weather/runway operational regime;
6. maximizes contrast with WSSS/OMAA without inventing a new airport after seeing outcomes.

**Recommended additional robustness candidate: SKBO.**

Reason:
1. domestic-majority but not as one-sided as YSSY;
2. meaningful international traffic;
3. Latin-American regional context;
4. different carrier/network structure;
5. gives a second non-international-dominated hub regime.

### Proposed minimal completion set

A scientifically defensible *scope-reduced early-pilot* anchor set would be:

- WSSS — international/global Asia-Pacific
- OMAA — international/Gulf transfer regime
- YSSY — domestic-majority Oceania + international gateway
- SKBO — mixed domestic/international South America

MMUN remains preserved as:
- valid measurement;
- North-America macro-region observation;
- capacity-failed / non-promotable anchor.

LKPR would be deferred rather than declared bad.

Europe and additional regions should be represented in Phase 6 through the already-designed MID/REGIONAL region-allocation mechanisms, rather than requiring every regime to become a permanent HUB anchor.

---

## 9. Why not stop immediately with only WSSS + OMAA?

Stopping with only WSSS and OMAA would make the anchor evidence strongly concentrated in nearly-all-international hubs.

That creates a weak basis for:
- domestic-heavy same-tail rotation behavior;
- mixed domestic/international airports;
- claims that anchor yield is robust to market mix.

Therefore the recommended scope reduction is **not** "stop now with two."

It is "stop requiring one Stage-1 anchor probe from every macro-region and obtain the highest-value missing contrasts instead."

---

## 10. Why not mechanically finish LKPR → SKBO → YSSY + old conditional Stage 2?

Under the current compact amendment, MMUN's capacity failure already creates a Stage-2 confirmation trigger.

Completing the old protocol literally can therefore expand into:
- remaining Stage-1 candidates;
- additional confirmation work;
- more paid windows;
- additional calendar delay.

That may be proportionate for a confirmatory anchor-selection experiment.

It is difficult to justify for the stated **early operational pilot** objective when the project has already spent about a month validating the measurement system and has strong live evidence from WSSS/OMAA plus a valid negative MMUN result.

The strict integrity controls should remain:
- physical-flight-v2;
- exact reconciliation;
- cleanup/finalizer evidence;
- no outcome-driven retry;
- exact runtime/auth binding;
- leakage controls;
- budget safety.

The **scope** can be reduced without weakening those integrity controls.

---

## 11. Important anti-bias rule for any change

The project must not simply skip candidates in code without a prospective amendment.

A valid scope change must:

1. preserve every historical WSSS/OMAA/MMUN attempt unchanged;
2. explicitly state that the original compact-6 selection question is being replaced by a reduced early-pilot scope question;
3. use only pre-existing/frozen exogenous airport attributes to justify which unmeasured contrast is most informative;
4. define the new stopping rule **before** the next paid result is seen;
5. define whether YSSY alone or YSSY+SKBO completes Phase 2G;
6. update the Phase-6 anchor rotation/calendar if the anchor-pool size changes;
7. keep MID/REGIONAL region balancing so broader geography still enters Phase 6;
8. narrow later claims accordingly — do not call a reduced anchor pool globally representative;
9. rerun tests/traceability/contradiction checks before paid execution.

---

## 12. Proposed decision

### Recommended

**Do not run LKPR in the next paid window.**

Before the next paid probe, freeze a scope-reduction amendment with:

- next information-value target: `YSSY`;
- second/final robustness target: `SKBO`;
- no automatic LKPR Stage-1 requirement for the early pilot;
- no automatic five-candidate Stage-2 confirmation requirement;
- Phase-2G closure after YSSY and SKBO complete valid Stage-1 measurements, subject to provider/accounting/scientific safety gates;
- MMUN retained as a valid capacity-failed result;
- Phase-6 anchor pool reduced from five to four: `WSSS, OMAA, YSSY, SKBO`;
- Europe and other regions retained through Phase-6 MID/REGIONAL region-balanced sampling;
- final evaluation claims explicitly limited to the realized collection frame.

This recommendation balances:
- scientific diversity;
- domestic/international contrast;
- network and carrier heterogeneity;
- weather/operational heterogeneity;
- chain-propagation relevance;
- schedule/credit cost;
- the project's early-pilot status.

### Faster alternative

If calendar pressure dominates and the project owner accepts a narrower pilot:

- run YSSY only;
- close Phase 2G with a three-anchor pool `WSSS, OMAA, YSSY`;
- preserve MMUN as capacity-failed evidence;
- rely on Phase-6 MID/REGIONAL slots for broader geography.

This is faster but supports weaker cross-regime anchor claims.

### Original-protocol alternative

If preserving the current frozen compact-6/final-five question is more important than schedule:

- continue LKPR → SKBO → YSSY;
- obey the currently triggered Stage-2 confirmation rule;
- do not call Phase 2G complete until the old protocol's final-five conditions are satisfied.

This is the strongest continuity with the frozen protocol but has the highest additional cost and delay.

---

## 13. Bottom line

The project did not waste all Phase-2G work.

It learned several high-value facts:

1. the callback/accounting/runtime system can now complete a two-hour paid probe safely;
2. physical-flight-v2 behaves correctly under real mutable enrichment;
3. WSSS is a high-yield international environment;
4. OMAA is a viable international environment with a different hub/carrier regime;
5. MMUN is scientifically measurable but too sparse under the provider's webhook product for the frozen anchor-capacity requirement;
6. domestic/mixed hub behavior remains the clearest missing anchor regime;
7. the original six-region/five-anchor protocol is a project design choice, not a literature mandate.

The recommended correction is therefore **not** to loosen scientific integrity. It is to stop treating the original scope size as sacred and redirect the remaining screening budget toward the most informative missing regimes.
