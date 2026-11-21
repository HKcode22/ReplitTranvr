# 04 — What comes back from AeroDataBox? Normalization, codeshares, scope and identity

## The file that answers "which flight?"

`server/lib/disruption/fidsCensus_v3.ts` is the main FIDS response→population transformation. The actual cohort queries **WSSS departures** in the 14:00–15:00Z study window. It does **not** specify one known flight number to fetch. The observed response records are filtered, normalized and linked by a physical-operating-identity rule. The source logs deliberately print counts instead of identifying each airline/flight.

### Block 1: input contract

`fetchFidsPopulation(params,deps)` starts from a typed `FidsCensusParams` (airport, local provider query range, timezone, service window, direction, flags, protocol version, response cutoff and optional reservation). `buildFidsRequestContractV39` validates it.

```ts
const frame = buildFidsRequestContractV39(params);
const fids = await (deps.fetchAirport ?? fetchFidsAirport)(
  params.airportIcao,
  params.fromLocal,
  params.toLocal,
  { direction: frame.direction,
    withLeg: frame.withLeg,
    withCancelled: frame.withCancelled,
    withCodeshared: frame.withCodeshared,
    withCargo: frame.withCargo,
    withPrivate: frame.withPrivate,
    withLocation: frame.withLocation }
);
```

Trimmed excerpt. `deps.fetchAirport ?? fetchFidsAirport` means use an injected fetcher during tests if present; otherwise use the real AeroDataBox fetcher. This is **dependency injection**, which makes tests possible without paid calls. The G5A request uses `withLocation:false`: this particular FIDS pipeline is not direct ADS-B position collection.

### Block 2: provider JSON is not a normalized database row

The raw response can include nested `departure`, `arrival`, flight number, codeshare status, flags and times. The normalizer translates these to a consistent `PopulationRow` with fields such as:

```text
flightNumber, depAirportIcao, arrAirportIcao,
depScheduledUtc, arrScheduledUtc,
sourceAirportIcao, populationRole, scopeClassification,
codeshareResolutionStatus, analyticIdentityId,
canonicalFlightInstanceId, responseHash, availableAtUtc
```

The point of **normalization** here is not changing data into "better" facts. It is mapping variable provider JSON into columns with known meanings and preserving uncertainty and provenance.

### Block 3: service-window and exclusion checks

Open `normalizeFidsRecord`:

```ts
const selectedUtc = movement === "departure"
  ? isoOrNull(f?.departure?.scheduledTime?.utc)
  : isoOrNull(f?.arrival?.scheduledTime?.utc);
if (!selectedUtc) return null;
if (selectedMs < params.serviceWindowStartUtc.getTime() ||
    selectedMs >= params.serviceWindowEndUtc.getTime()) return null;
if (!params.withCargo && f?.isCargo === true) return null;
```

`?.` is optional chaining: the nested provider field might be missing. A record is not silently included if its selected timestamp is missing or outside the frozen service window. The remaining code checks private, canceled and codeshare flags according to query settings.

### Block 4: parse identifiers carefully

`parseFlightNumber` uses a strict regular expression for two-character carrier codes followed by 1–4 digits, allowing a space. `localServiceDateOrNull` uses the airport's IANA timezone. Why local date? An international flight near midnight can have a different local date from UTC; using the wrong date may identify the wrong physical movement.

The normalizer tracks both `providerRecordKey` and candidate canonical flight ID. They are not interchangeable. A source row key identifies a **record**, whereas a cross-observation operating-flight identity aims to identify the **same physical leg** after schedule changes.

### Block 5: operator versus codeshare

```ts
const isOperator =
  f?.codeshareStatus === "IsOperator" || f?.codeshareStatus === 1;
const isMarketing =
  f?.codeshareStatus === "IsCodeshared" || f?.codeshareStatus === 2;
```

A **marketing flight** is an airline label under which the same operated flight may be sold. Counting every codeshare as a separate aircraft artificially inflates the denominator. This code requires *positive operator evidence* for the G5A eligible operating identity path. Unknown is not confirmation.

### Block 6: native ID versus conditional composite

The real G5A code has two important branches:

```text
IF positive operator + stable provider flight.id + requested origin
   THEN identityStatus = confirmed_operating_leg
        canonical = hash(providerId, carrier, flightNumber, route)
ELSE IF positive operator + NO stable id + same frozen future study frame
   THEN identityStatus = g5a_conditional_operator_composite_no_native_id
        canonical = hash(frozenStudyStart, carrier, flightNumber, route)
ELSE provisional/ambiguous; not a confidently eligible operating leg
```

This is **pseudocode**, not source pasted literally. **Crucial why:** a flight's reported scheduled time may change. If you included the *current scheduled timestamp* in its stable identity key, a retiming would appear to be a brand-new flight, precisely corrupting the schedule-revision study. The G5A identity design anchors to provider-native ID where available or an explicitly conditional composite that does not contain the drifting schedule.

The second branch is *not* a certified native provider ID. The later audit preserves that uncertainty.

### Block 7: disallow duplicate identities in one source

The normalizer counts repeated composite keys and repeated identities inside a single original response. A collision is demoted to an ambiguous/provisional key rather than silently dropped or counted as a second leg. Notice the pattern:

```ts
const counts = new Map<string, number>();
for (const r of preDedup) {
  const k = compositeKey(r);
  counts.set(k, (counts.get(k) ?? 0) + 1);
}
```

`Map` stores per-key counts. `?? 0` uses zero if the key wasn't seen. The later `map` uses this count to demote duplicates. This is a concrete example of when **deduplication affects eligibility** without erasing source observations.

### Block 8: classify unknown commercial scope honestly

`classifyScope` returns `"confirmed_core"`, `"unknown"` or `"auxiliary"`.

```ts
if (input.isCargo === true ||
    input.isPrivate === true ||
    input.isGeneralAviation === true) return "auxiliary";
if (input.isCharter === true) return "unknown";
if (input.isCargo === false &&
    input.isPrivate === false &&
    input.isCharter === false) return "confirmed_core";
return "unknown";
```

Why isn't missing `isCargo` treated as `false`? Because an absent provider flag is **not evidence of its negation**. G5A can keep an eligible conditional operating identity with unknown scope, but must flag it as uncertain; it may not promote it to `confirmed_core` merely to make counts look good.

### Block 9: source rows versus eligible keys

After normalization and duplicate safety:

```ts
const rows = unambiguous.map((r) => r.row);
const flightInstanceIds = Array.from(
  new Set(unambiguous.map((r) => r.resolvedCanonical)
    .filter((x): x is string => !!x))
);
```

This directly explains why a source captured **48 normalized rows** but **12 source-qualified keys**: row observations include more than eligible unique operators. Their ratio should be *measured*, not interpreted as 36 "bad flights" without inspecting classifications.

### Block 10: where source persistence happens

`fetchFidsPopulation` builds `rawPayload`, `responseHash` and `populationQueryId`, then passes `query` and `rows` to the persistence dependency. For this G5A source owner that dependency is a V0077 atomic binding adapter; see [Lesson 05](05-atomic-original-bindings-paid-ledger-and-ttl.md).

### ADSB.lol and actual airborne data

There is **no ADSB.lol fetch in this G5A FIDS owner/POST call path**. The direct source function is `fetchFidsAirport` from `aerodataboxLimiter_v3.ts`. Older project plans discuss ADSB.lol or weather/webhooks for broader research, but their existence elsewhere in the repo does not make them automatic inputs to this exact three-horizon data. A FIDS `departure.scheduledTime.utc` is a **schedule**, not direct evidence of airborne position or actual runway wheels-off.

## Exercises

1. Why can two marketed flight numbers refer to one physical operated aircraft leg?
2. Why would hashing a changing schedule into the identity create false "new flights"?
3. What does `withLocation:false` tell you about this particular request?
4. What is more honest when a provider omits `isCharter`: false or unknown, and why?
5. Find `normalizeFidsRecord`; identify three returns that block inclusion and two branches that still preserve uncertain observations.
