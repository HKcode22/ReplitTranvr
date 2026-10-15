# Phase 2G Scientific Methods and Validity Memorandum
## Why Stage-1 Recovery Probes Are Sequential, Why the Weekday/UTC Time Block Exists, Why Concurrent OMAA+MMUN Is Not Valid Under the Current Protocol, and How OMAA-v2 Should Be Prepared

**Project:** V3.9 Aviation Data Collection / Phase 2G / Gate 2 / Stage 1  
**Repository:** `HKcode22/ReplitTranvr`  
**Current scientific identity contract:** `v39-physical-flight-instance-v2`  
**Current bounded recovery order:** `WSSS → OMAA → MMUN`  
**Prepared:** 2026-09-29  
**Status of this memorandum:** explanatory/methodological evidence record; it does not itself authorize a paid provider mutation.

---

# 0. Why this memorandum exists

This memorandum records a question that materially affects the validity, auditability, cost accounting, and duration of Phase 2G:

> Can two Stage-1 airport probes — specifically OMAA and MMUN — be run at the same time so the experiment can finish faster?

The motivation is reasonable. Phase 2G has taken weeks because multiple earlier paid attempts were invalidated by infrastructure, accounting, callback, provider, or physical-flight-identity defects. After the corrected WSSS-v2 measurement finally completed scientifically, it is natural to ask whether the remaining airport measurements can be accelerated.

The scientifically correct answer is more nuanced than either:

- “parallel experiments are always invalid”; or
- “if the software can run two subscriptions, the science is automatically valid.”

Neither statement is correct.

Parallel experiments can be scientifically excellent. Randomized block designs, paired designs, multi-arm experiments, cluster trials, and many engineering experiments deliberately run treatments within common blocks. The question here is not whether concurrency is allowed by science in the abstract.

The correct question is:

> **Does the current Phase-2G measurement model remain identifiable, comparable, attributable, non-interfering, auditable, and within its pre-specified safety contract if two provider subscriptions are active simultaneously?**

Under the current AeroDataBox account architecture, provider billing evidence, Phase-2G scoring denominator, owner/watchdog implementation, and prospectively frozen recovery contract, the answer is **no**.

Therefore:

> **For the current physical-v2 recovery, OMAA and MMUN should remain sequential. This is not because concurrency is inherently unscientific. It is because the current experiment uses an isolated-probe measurement and accounting design whose key validity properties do not automatically survive concurrency.**

---

# 1. User questions formally stated

This memo answers the following questions.

1. Can two regions/airports be scientifically measured at the same time?
2. Could OMAA-v2 and MMUN-v2 be run simultaneously tomorrow?
3. If software currently refuses overlap, is that merely an infrastructure restriction?
4. Could simultaneous runs bias the result?
5. Could simultaneous runs invalidate the result even without statistical “bias”?
6. Why does a shared AeroDataBox balance matter scientifically?
7. Why is the credit-attribution argument written as a mathematical/matrix problem?
8. According to whom or what is that matrix/identifiability reasoning legitimate?
9. Why are callbacks and provider-accounting failures relevant to a scientific metric?
10. What is SUTVA/no-interference, and why is it relevant?
11. What is an experimental unit, and why do hundreds of callback items not equal hundreds of independent experiments?
12. Why does the project use weekdays?
13. Why does Stage 1 use UTC slot 12 / approximately 11:00–13:00 UTC?
14. Why does that translate to approximately 04:00–06:00 PDT right now?
15. Is 04:00–06:00 California time a universal scientific theorem?
16. What is externally supported science versus a project-specific pre-specified design choice?
17. Can the protocol ever be amended?
18. What conditions would make a future concurrent protocol defensible?
19. What does all of this imply for the next OMAA-v2 attempt?

---

# 2. Evidence hierarchy

Claims in this memo are separated into four evidence classes.

## 2.1 Binding project evidence

These determine what the current Phase-2G experiment actually permits:

- `SEPmd/V3.9_DataCollectPlan_f.8.md`
- `SEPmd/V3.9_IMPLEMENTATION_LOG.md`
- `artifacts/preprobe-reference-freeze-record.json`
- `artifacts/phase2g-compact6-identity-v2-recovery-freeze-20260925.json`
- `SEPmd/phase2g/amendments/2026-09-25_PHYSICAL_FLIGHT_IDENTITY_V2_RECOVERY.md`
- the current Stage-1 runtime artifacts;
- the production owner/preflight/probe-execution code.

These are project contracts, not universal scientific laws.

## 2.2 Provider facts

AeroDataBox documentation establishes properties of the real provider system, including:

- Flight Alert credits are deducted when notifications are **sent**;
- delivery failures can still consume credits;
- enabled retries consume additional credits;
- the Flight Alert balance is shared across Flight Alert/webhook subscriptions;
- all subscriptions can pause when the shared balance reaches zero.

Source:

AeroDataBox, *Flight Alert API: Guide to the New System*, updated 2026-01-31.  
https://aerodatabox.com/flight-alert-api-2026/

These are vendor-system facts.

## 2.3 External scientific/mathematical principles

Examples:

- NIST design-of-experiments/blocking principles;
- no-interference/SUTVA literature;
- experimental-unit/repeated-measure literature;
- preregistration/protocol-deviation literature;
- standard linear algebra for underdetermined systems.

These principles explain why the project rules are or are not scientifically defensible.

## 2.4 Project-specific inference

Some conclusions combine the external principles with facts specific to this architecture. For example:

> “Two simultaneous current-style probes make per-airport external credit spend non-identifiable from the one shared account balance.”

That statement is not quoted from an AeroDataBox paper. It is a mathematical consequence of:
1. AeroDataBox exposing a shared balance; and
2. Phase-2G requiring per-airport external credit denominators/reconciliation.

The derivation is shown explicitly below.

---

# 3. Binding current Phase-2G rules

At the WSSS-v2 execution commit `3e26399a4545cb243d246d6fc824dad8b88492e9`, the project contract includes the following.

## 3.1 Stage-1 duration

Target:

```text
120 minutes
```

A safety/cap/failure stop may truncate the measurement, in which case censoring must be recorded.

## 3.2 Day/time matching

The pre-probe freeze record contains:

```text
probeTimeClass.stage1UtcSlotHour = 12
probeTimeClass.stage1WeekdayClass = "weekday"
probeTimeClass.stage2UtcSlotHour = 12
probeTimeClass.stage2WeekdayClass = "weekday"
```

This was fixed before the current WSSS-v2 result.

## 3.3 Sequential execution

The plan states that Stage-1 candidates are run sequentially and that a probe completes before the next begins.

The production code independently enforces this: `probeExecution_v39.ts` checks for another active probe and refuses overlap.

## 3.4 Physical-v2 recovery order

The identity-v2 recovery amendment fixes:

```text
WSSS → OMAA → MMUN
```

The owner code `choosePhysicalIdentityV2RemeasurementTargetV39` walks that order and explicitly refuses evidence showing a later candidate was run before an earlier missing one.

## 3.5 One additional v2 recovery attempt

The recovery is a bounded contract-correction measurement, not an open-ended retry loop. Each WSSS/OMAA/MMUN recovery candidate receives at most the prospectively authorized additional v2 attempt.

## 3.6 Credit controls

The WSSS-v2 runtime froze:

```text
minStabilityBuckets = 6
stage1ReservationCredits = 450
stage2ReservationCredits = 450
unsettledBurstMarginCredits = 50
```

The current preflight/probe code also protects a 1000-credit residual balance floor.

Thus current single-probe admission requires approximately:

[
1000+450+50=1500
]

credits available before start.

---

# 4. Scientific concept: Design of Experiments and nuisance-factor blocking

## 4.1 According to whom?

NIST/SEMATECH Engineering Statistics Handbook:

https://www.itl.nist.gov/div898/handbook/pri/section3/pri332.htm

NIST explains that experiments contain **nuisance factors**: factors that can affect the measured result but are not the scientific factor of primary interest. NIST explicitly gives **time of day** as an example.

NIST describes **blocking** as holding an important nuisance factor sufficiently controlled/homogeneous so differences in the primary factor can be studied with less contamination from nuisance variation.

Its well-known summary is:

> “Block what you can, randomize what you cannot.”

## 4.2 Application to Phase 2G

The primary comparison is airport/candidate performance under one common Stage-1 protocol.

Time/day is not the airport property being ranked, but airport traffic and provider update activity can vary by time/day.

A simplified model is:

[
Y_{i,t}=mu+alpha_i+eta_t+epsilon_{i,t}
]

where:

- (Y_{i,t}): measured yield for airport (i) in temporal block (t);
- (mu): baseline;
- (alpha_i): airport effect of interest;
- (eta_t): day/time nuisance effect;
- (epsilon): residual variation.

If OMAA is measured in one time class and MMUN in a completely different time class, an observed difference can contain both airport and temporal effects.

The pre-specified weekday/UTC-slot matching is therefore scientifically defensible as **blocking/matching**.

## 4.3 What this does not prove

NIST does **not** say:

- global airports must be measured at 11:00 UTC;
- California 04:00 is universally optimal;
- two airport probes may never run concurrently.

Those are separate questions.

---

# 5. Scientific concept: Aviation traffic has temporal structure

## 5.1 Empirical aviation evidence

A peer-reviewed analysis:

*Temporal patterns of aircraft operations at U.S. Airports: A statistical analysis*, Transportation Research Part A, 1985.  
DOI: 10.1016/0191-2607(85)90068-8  
https://www.sciencedirect.com/science/article/pii/0191260785900688

The study analyzed 24 selected FAA-towered airports and reported strong day-of-week and seasonal variation, with patterns varying by operation type and geographical location.

FAA's OPSNET system itself provides Day-of-the-Week reporting that groups operations by individual weekdays and weekday/weekend totals:

https://www.aspm.faa.gov/aspmhelp/index/OPSNET__Day_of_the_Week_Report.html

EUROCONTROL's 2025 Data Snapshot #56 likewise documents differing weekday/weekend IFR flight patterns and emphasizes that patterns vary by region/country:

https://www.eurocontrol.int/publication/eurocontrol-data-snapshot-56-shifting-weekday-flight-patterns

## 5.2 Correct claim

The defensible claim is:

> **Day/time can affect aviation traffic and therefore can be a nuisance variable in an airport-yield comparison.**

## 5.3 Incorrect overclaim

The following would be unsupported:

> “Tuesday 04:00–06:00 PDT is scientifically proven to be the best universal airport sampling time.”

No source identified in this audit establishes that.

---

# 6. Why “weekday” is used

The frozen project condition is:

```text
stage1WeekdayClass = weekday
```

It is a matching/blocking decision.

It does **not** mean weekends are scientifically bad data.

A separate design could validly study weekends. But comparing some candidates under weekday traffic and others under weekend traffic without modeling that difference can mix airport effects with day-class effects.

The project therefore holds day class approximately constant.

Tuesday is not uniquely magical. Monday–Friday can satisfy the frozen weekday class if all other eligibility and authorization conditions are satisfied.

---

# 7. Why UTC slot 12 exists

The pre-probe freeze record fixes:

```text
stage1UtcSlotHour = 12
```

The plan's time class allows approximately slot ±1 hour, yielding an admissible start class around:

```text
11:00–13:00 UTC
```

The preferred WSSS start was 11:00 UTC.

On 2026-09-29 California is observing PDT, UTC−7:

```text
11:00 UTC = 04:00 PDT
13:00 UTC = 06:00 PDT
```

Therefore “04:00–06:00” is an **operator-local translation**, not the scientific variable itself.

When California returns to PST, UTC slot 12 translates differently.

Protocol fidelity follows UTC, not a permanently fixed California wall clock.

---

# 8. Could parallel execution actually have statistical benefits?

Yes.

This is important because the memo should not pretend sequential execution is universally statistically superior.

Suppose:

[
Y_{i,t}=mu+alpha_i+eta_t+epsilon_{i,t}.
]

If two candidates are measured in the same temporal block (t), the common additive block effect cancels in a difference:

[
Y_{O,t}-Y_{M,t}
=
alpha_O-alpha_M+epsilon_O-epsilon_M.
]

If measured in different blocks:

[
Y_{O,t_1}-Y_{M,t_2}
=
alpha_O-alpha_M
+
(eta_{t_1}-eta_{t_2})
+
epsilon_O-epsilon_M.
]

So common-time measurement can reduce temporal confounding.

Similarly:

[
Var(X-Y)=Var(X)+Var(Y)-2Cov(X,Y).
]

If each has variance (sigma^2) and correlation (ho):

[
Var(X-Y)=2sigma^2(1-ho).
]

When a shared block creates positive correlation, a paired/block comparison can be more precise.

Therefore the theoretical problem is **not concurrency itself**.

The problem is whether the **current measurement and accounting architecture** supports concurrent experimental units without changing the estimand or losing identifiability.

---

# 9. Scientific concept: no-interference / SUTVA

## 9.1 According to whom?

Hudgens & Halloran, *Toward Causal Inference With Interference*, JASA 2008:

https://pmc.ncbi.nlm.nih.gov/articles/PMC2600548/

They describe no-interference as a fundamental assumption commonly made in causal inference: one unit's potential outcome is assumed unaffected by treatment assignment of other units. They identify it as a component of SUTVA.

VanderWeele & Tchetgen Tchetgen:

https://pmc.ncbi.nlm.nih.gov/articles/PMC4216807/

also discuss how inference becomes more complex when interference exists.

## 9.2 Application here

For concurrent OMAA/MMUN to behave like two isolated probes, we would need confidence that activating MMUN does not change OMAA's measurement process and vice versa.

Informally:

[
Y_O(	ext{OMAA alone})
=
Y_O(	ext{OMAA while MMUN active})
]

and:

[
Y_M(	ext{MMUN alone})
=
Y_M(	ext{MMUN while OMAA active}).
]

But current concurrent probes would share:

- provider account;
- shared Flight Alert balance;
- provider control plane;
- webhook endpoint;
- application process/runtime;
- database;
- object store path/system;
- CPU/network resources;
- watchdog/control resources;
- subscription inventory;
- incident state;
- final provider-balance accounting.

That creates plausible interference channels.

This does **not** prove that interference definitely would occur.

It proves that the assumption of *no interference* is nontrivial and currently unvalidated.

Isolation avoids needing that assumption for Phase-2G recovery.

---

# 10. Provider fact: AeroDataBox subscriptions share one Flight Alert balance

AeroDataBox states that its Flight Alert balance is shared across the account's flight-alert/webhook subscriptions.

Provider guide:

https://aerodatabox.com/flight-alert-api-2026/

It also states:

- 1 credit per flight item sent;
- charge occurs when sent, not when successfully delivered;
- if the endpoint is down, send attempts can still be charged;
- retries, when configured, also cost credits;
- when the shared Flight Alert balance reaches zero, all subscriptions pause.

These facts are central because the current experiment's denominator and reconciliation depend on provider spend.

---

# 11. The most important mathematical issue: per-airport external spend identifiability

This section explains in detail why the “matrix” appears.

## 11.1 We are not putting the airport into a matrix

Nothing about OMAA itself “is a matrix.”

The matrix is simply conventional notation for the **billing equations**.

Linear algebra writes systems of simultaneous linear equations as:

[
A x=b.
]

MIT OpenCourseWare explicitly presents systems this way and distinguishes underdetermined systems where there are fewer independent equations than unknowns.

References:

- MIT 18.642 lecture, systems (A x=b):  
  https://ocw.mit.edu/courses/18-642-topics-in-mathematics-with-applications-in-finance-fall-2024/mit18_642_f24_lec02_1.pdf

- MIT Linear Algebra, more unknowns than equations / nullspace:  
  https://ocw.mit.edu/courses/res-18-010-a-2020-vision-of-linear-algebra-spring-2020/mitres_18_010_s20_slides_part6.pdf

So the matrix notation is not an invented aviation-specific theory. It is just the standard mathematical representation of the information available from the provider.

## 11.2 Isolated OMAA probe

Let:

- (B_0) = settled provider balance before OMAA;
- (B_1) = settled provider balance after OMAA;
- (C_O) = externally billed OMAA credits.

If OMAA is the only active authorized billable experiment:

[
C_O=B_0-B_1.
]

This is one unknown and one independent external measurement.

Matrix form:

[
[1][C_O]=[Delta B].
]

The coefficient matrix has rank 1 and there is 1 unknown. The quantity is identified.

## 11.3 OMAA and MMUN simultaneous

Now let:

- (C_O) = OMAA provider spend;
- (C_M) = MMUN provider spend;
- (Delta B) = shared account balance decrease.

The account gives:

[
C_O+C_M=Delta B.
]

That is all the account-level balance says.

Matrix notation:

[
egin{bmatrix}1&1end{bmatrix}
egin{bmatrix}C_O\C_Mend{bmatrix}
=
egin{bmatrix}Delta Bend{bmatrix}.
]

There is 1 independent equation and 2 unknown quantities.

The matrix has rank 1 while the unknown vector has dimension 2.

Therefore the system is underdetermined.

## 11.4 Concrete example

Suppose the shared balance falls by 100.

The provider-level equation is:

[
C_O+C_M=100.
]

All of these satisfy the same observation:

[
(50,50)
]

[
(51,49)
]

[
(60,40)
]

[
(80,20).
]

The one shared balance observation cannot distinguish them.

## 11.5 Null-space explanation

If:

[
(C_O,C_M)
]

is one solution, then:

[
(C_O+d,C_M-d)
]

produces the same total for any (d) that leaves costs in their feasible domain.

The direction:

[
(1,-1)
]

lies in the null space of the balance observation ([1;1]), because:

[
[1;1]
egin{bmatrix}1\-1end{bmatrix}
=0.
]

This is the precise reason the decomposition is not unique.

## 11.6 Why this is called identifiability

A parameter/quantity is identifiable when different values cannot produce exactly the same observable evidence under the model.

Here, different per-airport external spend pairs produce the same shared-balance delta.

So per-airport external spend is not identifiable **from the shared balance alone**.

This is a mathematical property, not an opinion.

---

# 12. “But don't our callbacks tell us which airport spent the credits?”

They tell us which **received callback items** we assigned internally.

That is not the same thing as independently observing provider-side billing for every send.

Suppose internal persisted data are:

[
I_O=50,quad I_M=50.
]

Total internal = 100.

Suppose provider shared balance also decreases by 100.

Then aggregate equality holds:

[
C_O+C_M=I_O+I_M=100.
]

But this does not logically imply:

[
C_O=I_O
]

and:

[
C_M=I_M.
]

For example:

[
C_O=51,quad C_M=49
]

also gives a provider total of 100.

Why might this matter in the real provider system?

Because AeroDataBox says credits are charged when alerts are **sent**, not only when successfully delivered.

If a paid send never reaches our callback endpoint, the provider external cost may exist without the corresponding received internal item.

That exact class of problem is why Phase-2G has external-vs-internal reconciliation at all.

If we simply use the internal split to declare the external split, we assume away the failure mode the external check is intended to detect.

---

# 13. Why P2G06 makes this more than a hypothetical concern

A historical WSSS attempt produced:

```text
external provider spend = 220
internal received spend = 219
gap = 1
```

Whatever the ultimate provider mechanism, that experiment empirically demonstrated that provider-side charged exposure and locally received accounting can differ.

Therefore a future concurrent run with an aggregate gap creates a real attribution question:

> Did the missing externally charged item belong to OMAA or MMUN?

With only the shared balance, the experiment cannot answer that independently.

If yield uses credits in the denominator, assigning that unknown credit to one airport or the other changes the per-airport ratio.

---

# 14. Example showing how an unattributable 1-credit gap changes a score

Suppose:

```text
OMAA confirmed physical flights = 100
MMUN confirmed physical flights = 50

internal OMAA credits = 100
internal MMUN credits = 50

shared external spend = 151
```

There is one external credit not present in the combined received ledger.

Possibility A:

[
C_O=101,quad C_M=50.
]

Then:

[
Yield_O=rac{100}{101}approx0.9901
]

[
Yield_M=rac{50}{50}=1.
]

Possibility B:

[
C_O=100,quad C_M=51.
]

Then:

[
Yield_O=1
]

[
Yield_M=rac{50}{51}approx0.9804.
]

Same shared provider balance. Different airport-specific yields.

If ranking/promotion depends on those yields, the ambiguity is scientifically material.

That is exactly what “non-identifiable denominator” means in this context.

---

# 15. Duplicate-subscription example

The user's concern about duplicates is especially relevant.

Suppose intended state:

```text
1 OMAA subscription
1 MMUN subscription
```

but an orphan/duplicate state accidentally becomes:

```text
2 OMAA subscriptions
1 MMUN subscription
```

A subscription inventory may reveal the duplicate, which is useful.

But if charge-generating sends occurred before detection, the shared account balance contains charges from all active subscriptions.

The scientific questions then become:

- how much OMAA spend came from intended subscription A?
- how much came from duplicate OMAA subscription B?
- which callbacks were duplicated?
- did the duplicate change update cadence?
- were any duplicate sends missing locally?
- can the external charge denominator be reconstructed independently?

Sequential isolated execution makes the expected active set trivial:

```text
exactly one intended billable Stage-1 subscription
```

Anything else is immediately anomalous.

That is a major auditability advantage.

---

# 16. Concurrency can invalidate data without necessarily creating classical statistical bias

The word **bias** has a technical meaning: systematic expected deviation of an estimator from its target.

Not every invalid experiment is invalid because of estimator bias.

Concurrency could cause at least four distinct problems:

## 16.1 Interference bias

If shared load/provider behavior changes OMAA's notification process when MMUN is active, the measured OMAA quantity may systematically differ from isolated OMAA.

That is an interference problem and can become bias.

## 16.2 Non-identifiability

Even if neither airport affects the other's true feed, a shared external denominator may not be decomposable.

The data can therefore be non-identifiable without a classical bias calculation.

## 16.3 Protocol incomparability

WSSS-v2 was measured isolated; OMAA/MMUN would be measured concurrently.

Even perfect concurrency might represent a different measurement condition.

## 16.4 Failure attribution ambiguity

A provider/callback/accounting failure during the joint window may be impossible to assign to one airport without assumptions.

Thus “no proven bias” is not sufficient to call concurrency valid.

---

# 17. Scientific concept: experimental units and pseudoreplication

## 17.1 According to whom?

Parsons et al., *Unit of analysis issues in laboratory-based research*:

https://pmc.ncbi.nlm.nih.gov/articles/PMC5762161/

The paper emphasizes that defining the experimental unit is a fundamental design step and that repeated measurements from one unit are generally correlated rather than independent.

Lazic, *The problem of pseudoreplication in neuroscientific studies*:

https://pmc.ncbi.nlm.nih.gov/articles/PMC2817684/

also discusses repeated measures and correlated observations.

## 17.2 Application here

A two-hour airport window can produce:

- many callbacks;
- hundreds of flight items;
- repeated observations of the same physical flight;
- later enrichment of the same flight.

Those observations increase information about that exposure window and support stability/identity checks.

They do **not** automatically create hundreds of independent Stage-1 experimental units.

The hierarchy is closer to:

```text
airport × Stage-1 window
  ├── callback deliveries
  │    ├── flight items
  │    └── repeated updates
  └── physical flight instances
```

This matters because shared window/provider effects can correlate many observations at once.

---

# 18. Scientific concept: pre-specification and preregistration

## 18.1 According to whom?

Nosek et al., *The preregistration revolution*, PNAS 2018:

https://pmc.ncbi.nlm.nih.gov/articles/PMC5856500/

The paper explains the value of distinguishing design/analysis decisions specified before observing outcomes from decisions influenced by observed results.

It also explicitly notes that deviations do not automatically invalidate a study, especially when outcomes have not yet been observed and changes are transparently documented.

Henderson & Chambers, *Ten simple rules for writing a Registered Report*:

https://pmc.ncbi.nlm.nih.gov/articles/PMC9612468/

states that unanticipated changes can occur, but substantial deviations that may affect the validity/type of inference should be documented and treated carefully.

## 18.2 Application here

The current v2 recovery order and time/day class were fixed prospectively.

A future concurrency amendment is not forbidden by science.

But it should be:

- written before observing the affected future candidate outcomes;
- justified independently of favorable/unfavorable yield results;
- versioned and hash-frozen;
- explicit about changed assumptions;
- validated for accounting and interference.

Simply deciding at 03:30 that two subscriptions should run together because the project is behind schedule would change a substantive measurement condition without validating its consequences.

---

# 19. Measurement comparability

The experiment ultimately compares airport metrics.

A generic measurement can be represented as:

[
M_i=f(Airport_i, Protocol, TimeBlock, ProviderState, MeasurementSystem).
]

WSSS-v2 used:

- isolated active probe;
- one intended billable subscription;
- one owner;
- one independent watchdog;
- exact account-level external reconciliation attributable to WSSS;
- physical-v2 identity contract.

If OMAA/MMUN are measured concurrently, `Protocol` and `MeasurementSystem` change.

To treat the resulting values as directly comparable, we would need evidence that:

[
f(A,	ext{isolated})=f(A,	ext{concurrent})
]

for the relevant metric, or a model that explicitly accounts for the difference.

That equivalence has not been established.

---

# 20. Reliability engineering and fault containment

This problem belongs partly to reliability engineering.

Sequential execution creates a small failure domain:

```text
one probe
one session
one subscription
one budget
one owner
one watchdog
one external account delta
one cleanup target
```

Concurrent execution creates shared failure domains:

- shared provider account;
- shared balance;
- shared callback host;
- shared database;
- shared subscription inventory;
- shared network;
- shared provider control-plane availability;
- potentially shared CPU/process resources;
- shared incident/recovery logic.

A fault in a shared component can affect both candidate measurements.

Isolation does not make failures impossible. It makes them easier to attribute and contain.

---

# 21. Data provenance and auditability

Phase-2G's credit reconciliation is part of its scientific provenance chain:

```text
provider charged exposure
      ↓
settled external spend
      ↕ compare
internal received item/attempt accounting
      ↓
airport-specific denominator
      ↓
yield/ranking metric
```

If the provider side becomes only a joint aggregate while the ranking remains per airport, the provenance chain becomes weaker.

This is why accounting architecture matters scientifically.

---

# 22. Why the current design chooses sequential matching rather than concurrent blocking

Concurrent blocking has a statistical advantage: both airports can share the same exact temporal block.

Sequential matching has another advantage: stronger isolation and attribution.

The current architecture cannot obtain both advantages simultaneously.

Therefore the design currently trades:

```text
some between-date temporal noise
```

for:

```text
per-probe external attribution
fault isolation
simple active-subscription invariant
exact cleanup ownership
current owner/watchdog safety
measurement comparability with WSSS-v2
```

The temporal-noise risk is mitigated by keeping the same:

- weekday class;
- UTC slot class;
- target duration;
- metric contract;
- stability formula;
- reconciliation rule;
- candidate-selection protocol.

This is a defensible engineering/statistical compromise.

---

# 23. Why the time class is scientifically defensible but not universally “correct”

This distinction is essential.

## 23.1 Externally supported principle

Time/day can affect outcomes, so control/match them.

Supported by NIST blocking and aviation temporal evidence.

## 23.2 Project-specific choice

The specific block:

```text
weekday
UTC slot 12
```

was chosen and frozen by the project before current outcomes.

## 23.3 What makes it defensible now

Once prospectively frozen and applied consistently, it creates a common comparison condition.

Changing time classes in response to candidate results would create a stronger risk of adaptive bias/confounding.

## 23.4 What should not be claimed

Do not write:

> “Scientific research proves 11:00 UTC is the best possible global airport-probe start.”

The sources do not support that.

Write instead:

> “The protocol prospectively fixes a common weekday/UTC time class to reduce temporal heterogeneity across candidate measurements; external experimental-design and aviation evidence support controlling such temporal nuisance factors.”

---

# 24. Current WSSS result and why it should not be rerun

The corrected WSSS-v2 paid measurement completed the 120-minute target with:

- `duration_censored=false`;
- `stop_reason=null`;
- final external/internal reconciliation `MATCH`;
- 0 scientific hard violations;
- 0 exact-leg identity splits;
- 0 resolved→quarantined exact-leg regressions;
- 0 exact-leg provisional-key drift;
- successful late-aircraft-enrichment cases;
- provider subscription removed.

Its remaining step is exact-session purpose cleanup and finalizer closeout.

That is closeout, not recollection.

The recovery selector should therefore advance to OMAA only after WSSS becomes terminally finalized.

---

# 25. Current OMAA safety constraint

The existing admission rule requires:

[
1000+450+50=1500
]

credits.

WSSS terminal provider balance was approximately:

```text
1469
```

Therefore if the provider balance remains 1469:

[
1469<1500.
]

The current code should refuse a new Stage-1 start.

This should **not** be solved by silently weakening the protected floor.

It is a provider/account readiness issue.

---

# 26. Why two concurrent probes would need more reserve

If concurrency were redesigned with two independent 450-credit reservations, a conservative account reserve would be at least:

[
1000+450+450+50=1950
]

and possibly:

[
1000+(450+50)+(450+50)=2000
]

depending on the redesigned burst-risk definition.

Having enough balance would only solve the resource-capacity component. It would not solve external per-airport attribution or interference.

---

# 27. Probability: what we can and cannot honestly quantify

We do not currently have a validated probability such as:

> “Concurrency has a 3% chance of corrupting the experiment.”

No data support that number.

A simple Poisson model:

[
N(t)sim Poisson(lambda t)
]

would require assumptions about independent arrivals and rate structure that have not been validated for Flight Alert callback/update behavior.

Provider updates can be clustered by:

- scheduled traffic banks;
- repeated state changes;
- provider processing batches;
- correlated airport conditions;
- physical-flight enrichment.

Therefore deterministic invariants are currently more trustworthy than an invented failure probability.

---

# 28. Scientific and technical fields involved

This decision spans many disciplines.

| Discipline | Relevant concept |
|---|---|
| Design of Experiments | blocking, nuisance factors, matching |
| Mathematical statistics | variance, dependence, estimands |
| Probability | stochastic arrival/update processes |
| Linear algebra | equation rank, null space, underdetermined systems |
| Identifiability theory | unique recoverability of per-probe parameters |
| Causal inference | SUTVA/no-interference |
| Repeated-measures statistics | correlated observations |
| Experimental-unit theory | unit of analysis, pseudoreplication |
| Time-series/temporal analysis | time/day dependence |
| Aviation operations research | flight temporal patterns |
| Operations research | constrained scheduling/resources |
| Measurement science | comparability of measurement procedures |
| Data provenance | traceable denominators/evidence |
| Open science | prospective specification and transparent deviations |
| Reliability engineering | fault containment/common-mode failures |
| Distributed systems | shared-state concurrency/failure coupling |
| Database concurrency control | active-owner/transaction invariants |
| Accounting/control systems | external vs internal reconciliation |
| Software verification | fail-closed invariants |
| Safety engineering | floors, reservations, margins |
| Reproducible research | hashes, immutable evidence, versioned contracts |

---

# 29. When would concurrent OMAA/MMUN become scientifically defensible?

A future concurrency protocol could be strong if prospectively redesigned.

Minimum conditions:

## 29.1 Independent external cost attribution

Need provider-side evidence for each subscription, such as:

[
C_O 	ext{ directly observed}
]

and:

[
C_M 	ext{ directly observed}.
]

Then the system becomes identifiable.

For example:

[
egin{bmatrix}
1&0\
0&1
end{bmatrix}
egin{bmatrix}
C_O\
C_M
end{bmatrix}
=
egin{bmatrix}
b_O\
b_M
end{bmatrix}.
]

Now rank is 2 for 2 unknowns.

## 29.2 Interference validation

Demonstrate that concurrent subscriptions do not materially change:

- send cadence;
- provider behavior;
- callback success;
- costs;
- latency;
- DB persistence;
- resource contention.

## 29.3 Independent failure isolation

One candidate's failure must not make the other's status ambiguous.

## 29.4 Multi-probe owner/watchdog

The control system must natively understand two authorized simultaneous probes instead of treating the second as an overlap violation.

## 29.5 Aggregate and per-probe caps

Need both:

- per-probe limits;
- account-wide limits;
- joint burst reserve;
- fail-safe behavior at shared-balance exhaustion.

## 29.6 Prospective analysis plan

Treat the common time block explicitly in the model.

## 29.7 Comparability bridge

Either show concurrency is measurement-equivalent to isolated WSSS or stratify/model the two protocol modes separately.

## 29.8 Prospective freeze

The concurrency design must be documented/versioned before observing affected candidate outcomes.

---

# 30. Claim-by-claim evidence table

| Claim | Support | Classification |
|---|---|---|
| Time of day can be a nuisance factor | NIST DOE | externally established |
| Blocking controls nuisance variation | NIST DOE | externally established |
| Aviation traffic varies by day of week | peer-reviewed aviation study; FAA; EUROCONTROL | externally observed |
| Tuesday itself is uniquely required | none | **do not claim** |
| 04:00–06:00 PDT is universally optimal | none | **do not claim** |
| UTC slot 12 is the project's frozen comparison block | preprobe artifact | project fact |
| Parallel experiments can be valid | DOE/blocked designs | externally established |
| Current OMAA+MMUN concurrency is automatically equivalent to isolated WSSS | no evidence | **do not claim** |
| Shared balance is common across Flight Alert subscriptions | AeroDataBox | provider fact |
| One aggregate equation cannot uniquely determine two unknown spends | standard linear algebra | mathematical fact |
| Internal callback split alone proves external per-airport split | false when externally charged sends can be missing | **do not claim** |
| No-interference is a standard causal assumption | Hudgens/Halloran; VanderWeele et al. | externally established |
| Repeated callback items are all independent experiments | unit-of-analysis literature says no | **do not claim** |
| Protocol changes can never occur | preregistration literature says transparent changes are possible | false |
| Current recovery order is WSSS→OMAA→MMUN | v2 amendment + owner code | binding project fact |
| Current code refuses overlap | probeExecution_v39.ts | implementation fact |
| WSSS must be rerun again | current terminal evidence does not support it | no |
| OMAA is next after WSSS finalization | recovery selector/order | yes |

---

# 31. Corrected WSSS closeout audit note

A prior read-only audit command incorrectly queried non-existent durable reconciliation fields:

```text
internal_spend_credits
external_minus_internal
```

Migration `0058_phase2g_reconciliation_evidence.sql` actually defines:

```text
external_spend_credits
internal_received_credits
delivery_gap_credits
delivery_completeness
```

The failed SELECT caused no mutation. PostgreSQL rejected it during statement parsing.

Any WSSS closeout audit must use the real schema.

---

# 32. OMAA-v2 readiness sequence

OMAA should not be paid-launched until all steps below pass.

## A. WSSS closeout audit

Confirm:

- probe 11 is `settling` or already `completed`;
- `duration_censored=false`;
- `stop_reason=null`;
- reconciliation `MATCH`;
- durable reconciliation evidence exists;
- provider subscription count = 0;
- open incidents = 0;
- current provider balance is known.

## B. Exact-session purpose cleanup if required

Session:

```text
901ca702-8cdc-4ba0-bd20-2747f883ce86
```

The cleanup command must use the **observed** live provider-content blob count, not a guessed number.

Expected cleanup receipt:

- transient session rows 0;
- delivery rows 0;
- item rows 0;
- live provider-content blobs 0;
- active billable subscriptions 0;
- provider mutation false.

## C. WSSS finalizer

Use:

- probe ID 11;
- exact session;
- WSSS budget `P2G-S1-20260928-13`;
- exact cleanup receipt path and SHA;
- exact WSSS runtime path and SHA.

Expected terminal state:

```text
probe.status = completed
runtime_cleanup_verified_at_utc != NULL
budget.state = CLOSED
open incidents = 0
reconciliation = MATCH
```

## D. New OMAA runtime

Do not reuse the WSSS runtime/budget.

New runtime should bind:

- current post-documentation Git HEAD;
- preprobe freeze;
- smoke evidence;
- physical-v2 amendment hash;
- new probe budget day;
- min stability buckets 6;
- Stage-1 reservation 450;
- Stage-2 reservation 450.

## E. OMAA AUTH

Fresh authorization must:

- identify new runtime/budget;
- use target 120 minutes;
- use the current recovery amendment;
- be explicitly SHA-approved;
- cover the correct weekday/time eligibility window.

## F. Callback/runtime exact binding

Before paid preflight:

- callback runtime must report the exact current Git HEAD;
- route must be registered;
- runtime-owner contract must pass;
- webhook secret and DB binding must pass.

## G. Provider balance

Current single-probe admission requires at least 1500 under the frozen rule.

If current provider balance is below that, paid launch must refuse until provider/account readiness is legitimately restored.

## H. Final paid preflight

Must verify at minimum:

```text
next_candidate = OMAA
active_or_settling_probes = 0
active foreign/billable subscriptions = 0
open incidents = 0
provider balance sufficient
exact hashes match
callback health PASS
metric contract = v39-physical-flight-instance-v2
```

## I. Paid launch

Exactly one OMAA owner plus one independent watchdog.

Do **not** launch MMUN concurrently.

---

# 33. Final scientific position

The current recommendation to run OMAA and MMUN sequentially is not based on one authority saying “never run two experiments at once.”

It is based on several independent principles that converge in this particular architecture:

1. **NIST DOE:** control temporal nuisance factors.
2. **Aviation evidence:** day/time traffic patterns vary.
3. **Causal inference:** concurrent shared resources create possible interference.
4. **Linear algebra:** one shared balance equation does not uniquely recover two external spends.
5. **Identifiability:** observationally equivalent spend allocations cannot be distinguished.
6. **Provider facts:** AeroDataBox bills sends against one shared Flight Alert balance.
7. **Experimental-unit theory:** callbacks are nested/repeated observations rather than independent experiments.
8. **Preregistration:** material protocol changes should be prospective and transparent.
9. **Measurement comparability:** WSSS-v2 was isolated; concurrency is a different measurement condition unless equivalence is demonstrated.
10. **Reliability engineering:** isolation reduces shared failure domains and improves attribution.
11. **Provenance:** isolated external reconciliation preserves the scientific denominator.
12. **Current binding contract:** WSSS→OMAA→MMUN and no overlap are already prospectively frozen/enforced.

Therefore, for the current Phase-2G recovery:

```text
finish WSSS exact-session closeout
→ OMAA-v2 alone
→ finalize OMAA
→ MMUN-v2 alone
```

A future parallel-block protocol is scientifically possible, but it must first solve per-subscription provider-side attribution, interference, multi-probe safety, failure isolation, and comparability.

---

# 34. References

## Project sources

1. `SEPmd/V3.9_DataCollectPlan_f.8.md`.
2. `SEPmd/V3.9_IMPLEMENTATION_LOG.md`.
3. `artifacts/preprobe-reference-freeze-record.json`.
4. `artifacts/phase2g-compact6-identity-v2-recovery-freeze-20260925.json`.
5. `SEPmd/phase2g/amendments/2026-09-25_PHYSICAL_FLIGHT_IDENTITY_V2_RECOVERY.md`.
6. `artifacts/phase2g-gate2-runtime-P2G-S1-20260928-13.json`.
7. `server/lib/disruption/probeExecution_v39.ts`.
8. `scripts/v39_probe_stage1_owner_v39.ts`.
9. `scripts/v39_phase2g_stage1_paid_preflight_v39.ts`.
10. `migrations/0058_phase2g_reconciliation_evidence.sql`.
11. GitHub Actions run `36413290291`.

## Experimental design

12. NIST/SEMATECH Engineering Statistics Handbook, Randomized Block Designs.  
    https://www.itl.nist.gov/div898/handbook/pri/section3/pri332.htm

## Aviation temporal evidence

13. *Temporal patterns of aircraft operations at U.S. Airports: A statistical analysis*. Transportation Research Part A, 19(4), 325–335 (1985).  
    https://www.sciencedirect.com/science/article/pii/0191260785900688

14. FAA OPSNET Day of the Week Report.  
    https://www.aspm.faa.gov/aspmhelp/index/OPSNET__Day_of_the_Week_Report.html

15. EUROCONTROL Data Snapshot #56, *Shifting weekday flight patterns* (2025).  
    https://www.eurocontrol.int/publication/eurocontrol-data-snapshot-56-shifting-weekday-flight-patterns

## Causal inference / interference

16. Hudgens MG, Halloran ME. *Toward Causal Inference With Interference*. JASA 2008.  
    https://pmc.ncbi.nlm.nih.gov/articles/PMC2600548/

17. VanderWeele TJ, Tchetgen Tchetgen EJ. *On causal inference in the presence of interference*.  
    https://pmc.ncbi.nlm.nih.gov/articles/PMC4216807/

## Experimental units / repeated measures

18. Parsons NR et al. *Unit of analysis issues in laboratory-based research*.  
    https://pmc.ncbi.nlm.nih.gov/articles/PMC5762161/

19. Lazic SE. *The problem of pseudoreplication in neuroscientific studies*.  
    https://pmc.ncbi.nlm.nih.gov/articles/PMC2817684/

## Preregistration / protocol deviations

20. Nosek BA et al. *The preregistration revolution*. PNAS 2018.  
    https://pmc.ncbi.nlm.nih.gov/articles/PMC5856500/

21. Henderson EL, Chambers CD. *Ten simple rules for writing a Registered Report*.  
    https://pmc.ncbi.nlm.nih.gov/articles/PMC9612468/

## Linear algebra / underdetermined systems

22. MIT OpenCourseWare 18.642, Linear Algebra lecture: systems (Ax=b), underdetermined case (m<n).  
    https://ocw.mit.edu/courses/18-642-topics-in-mathematics-with-applications-in-finance-fall-2024/mit18_642_f24_lec02_1.pdf

23. MIT OpenCourseWare, *A Vision of Linear Algebra*, nullspace and more unknowns than equations.  
    https://ocw.mit.edu/courses/res-18-010-a-2020-vision-of-linear-algebra-spring-2020/mitres_18_010_s20_slides_part6.pdf

## Provider architecture

24. AeroDataBox, *Flight Alert API: Guide to the New System*, updated 2026-01-31.  
    https://aerodatabox.com/flight-alert-api-2026/
