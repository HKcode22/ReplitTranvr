/**
 * Gate 0.5 f.8 §16: source-item evidence census for a NEW prospective pilot.
 * Pure, offline and provider-agnostic. A caller must extract authentic
 * raw-before-2xx item facts; this function never reads/mutates production data.
 *
 * The census DOES NOT authenticate caller claims about physical-flight ID,
 * provider origin, FIDS T, runway actual-vs-estimated or final billing.
 * It cannot certify Gate 0.5. It generates auditable denominators rather
 * than accepting a user-supplied "100 flights" summary as a measurement.
 */
export const GATE05_CENSUS_SCHEMA_V39 = "v39.gate05.observed-sample-census.v1" as const;

export type Gate05RawItemV39 = Readonly<{
  envelopeId: string;
  itemOrdinal: number;
  rawSha256: string;
  receivedAtUtc: string;
  rawDurableAtUtc: string | null;
  http2xxAtUtc: string | null;
  /** Verified is a source-reader claim, NOT independently certified here. */
  physicalFlightId: string | null;
  identityBasis: "VERIFIED_OPERATING_LEG" | "PROVISIONAL" | "UNKNOWN";
  codeshareRole: "OPERATOR" | "MARKETING" | "UNKNOWN";
  flightStage: "AIRBORNE" | "COMPLETED" | "OTHER" | "UNKNOWN";
  /** Provider-native location clock, optional; absence is NULL, not zero. */
  airbornePointUtc: string | null;
  /** Provider state-change clock for a completed flight, optional. */
  terminalStateUpdatedAtUtc: string | null;
}>;

export type Gate05ObservedPilotV39 = Readonly<{
  frozenAtUtc: string;
  observedSubscriptionStartUtc: string;
  exactProviderDeletionVerifiedAtUtc: string;
  plannedEndUtc: string;
  /** True only if the archived signed raw-before-2xx policy is independently proven. */
  evidenceSourceReviewed: boolean;
  items: readonly Gate05RawItemV39[];
}>;

export type Gate05ObservedCensusV39 = Readonly<{
  schema: typeof GATE05_CENSUS_SCHEMA_V39;
  status: "STOPPED_EARLY" | "SAMPLE_ONLY_NEEDS_SOURCE_AUDIT";
  itemFacts: number;
  rawBefore2xxItems: number;
  missingRawAckProofItems: number;
  distinctReceivedItems: number;
  inWindowReceivedItemCount: number;
  sourceQualifiedPhysicalFlights: number;
  sourceQualifiedCompletedFlights: number;
  sourceQualifiedAirborneFlights: number;
  uniqueUsableAirbornePoints: number;
  marketingOrUnverifiedItems: number;
  malformedOrStaleAirbornePointItems: number;
  observedDurationMinutes: number;
  plannedDurationMinutes: number;
  firstReceivedAtUtc: string | null;
  lastReceivedAtUtc: string | null;
  postStopReceivedItemCount: number;
  airborneGapSeconds: Readonly<{
    count: number;
    median: number | null;
    p95: number | null;
    maximum: number | null;
  }>;
  terminalReceiptLatencySeconds: Readonly<{
    count: number;
    median: number | null;
    p95: number | null;
    maximum: number | null;
  }>;
  /** Actual receipt after stop, NOT proof of a final grace/censoring deadline. */
  latestPostStopReceiptDelaySeconds: number | null;
  sampleMinima: Readonly<{
    notifications: 100;
    distinctOperatingFlights: 50;
    completedFlights: 20;
    airborneFlights: 30;
    airbornePoints: 100;
    durationMinutes: 60;
  }>;
  /** NUMERICAL sample thresholds only, never forged by custody proof. */
  deficits: readonly string[];
  /** Science/provenance proof limitations, separate from sample sufficiency. */
  integrityFindings: readonly string[];
  independentPhysicalIdentityConfirmed: false;
  scheduledWheelsOffReferenceConfirmed: false;
  actualWheelsOffSourceConfirmed: false;
  perFlightAsOfCutoffConfirmed: false;
  rawCustodyIndependentlyValidated: false;
  finalProviderBillingConfirmed: false;
  strictSciencePassed: false;
  paidAuthorizationGranted: false;
  providerCalls: 0;
  databaseWrites: 0;
}>;

const HEX = /^[0-9a-f]{64}$/;
function instant(text: string, tag: string): number {
  if (typeof text !== "string" ||
      !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(text))
    throw Error("GATE05_CENSUS_INVALID_UTC_" + tag);
  const ms = Date.parse(text);
  if (!Number.isFinite(ms) ||
      new Date(ms).toISOString().slice(0,19) !== text.slice(0,19))
    throw Error("GATE05_CENSUS_INVALID_UTC_" + tag);
  return ms;
}
function optionalInstant(text: string | null, tag: string): number | null {
  return text === null ? null : instant(text,tag);
}
function percentile(sorted: number[], p: number): number | null {
  if (!sorted.length) return null;
  // Nearest rank: a predefined, conservative P95 for small samples.
  return sorted[Math.max(0,Math.ceil(sorted.length*p)-1)];
}
function metric(values: number[]) {
  values.sort((a,b)=>a-b);
  const n=values.length;
  return {
    count:n,
    median:n ? (values[Math.floor((n-1)/2)] +
      values[Math.floor(n/2)])/2 : null,
    p95:percentile(values,0.95),
    maximum:n ? values[n-1] : null
  };
}
export function censusGate05ObservedPilotV39(
  pilot: Gate05ObservedPilotV39
): Gate05ObservedCensusV39 {
  if (!pilot || typeof pilot !== "object" || Array.isArray(pilot) ||
      typeof pilot.evidenceSourceReviewed !== "boolean" ||
      !Array.isArray(pilot.items) || pilot.items.length > 100_000)
    throw Error("GATE05_CENSUS_INVALID_PILOT");
  const frozen=instant(pilot.frozenAtUtc,"freeze");
  const started=instant(pilot.observedSubscriptionStartUtc,"started");
  const stopped=instant(pilot.exactProviderDeletionVerifiedAtUtc,"stopped");
  const planned=instant(pilot.plannedEndUtc,"planned");
  if (!(frozen<started && started<stopped && started<planned &&
        stopped<started+24*3600_000 && planned<started+24*3600_000))
    throw Error("GATE05_CENSUS_IMPOSSIBLE_WINDOW");
  const items=new Set<string>();
  const legs=new Set<string>();
  const completed=new Set<string>();
  const airborne=new Set<string>();
  const points=new Map<string,Set<number>>();
  const receiptLatencies:number[]=[];
  let custody=0,missing=0,marketing=0,stale=0,postStop=0;
  let first=Infinity,last=-Infinity,lastAfter=-Infinity;
  for(const item of pilot.items){
    if(!item || typeof item!=="object" ||
       !/^[a-zA-Z0-9_-]{8,160}$/.test(item.envelopeId) ||
       !Number.isSafeInteger(item.itemOrdinal) || item.itemOrdinal<0 ||
       !HEX.test(item.rawSha256) ||
       !["VERIFIED_OPERATING_LEG","PROVISIONAL","UNKNOWN"].includes(item.identityBasis) ||
       !["OPERATOR","MARKETING","UNKNOWN"].includes(item.codeshareRole) ||
       !["AIRBORNE","COMPLETED","OTHER","UNKNOWN"].includes(item.flightStage) ||
       !(item.physicalFlightId===null ||
         (typeof item.physicalFlightId==="string" &&
          /^[a-zA-Z0-9:_-]{8,160}$/.test(item.physicalFlightId))))
      throw Error("GATE05_CENSUS_INVALID_ITEM");
    const key=item.envelopeId+":"+item.itemOrdinal;
    if(items.has(key))throw Error("GATE05_CENSUS_DUPLICATE_RECEIPT_KEY");
    items.add(key);
    const received=instant(item.receivedAtUtc,"received");
    const raw=optionalInstant(item.rawDurableAtUtc,"raw");
    const ack=optionalInstant(item.http2xxAtUtc,"ack");
    const location=optionalInstant(item.airbornePointUtc,"airborne");
    const updated=optionalInstant(item.terminalStateUpdatedAtUtc,"terminal");
    if(received<started-60_000 || received>stopped+24*3600_000)
      throw Error("GATE05_CENSUS_OUT_OF_SCOPE_RECEIPT");
    if(raw!==null && raw<received-60_000)
      throw Error("GATE05_CENSUS_RAW_CLOCK_BEFORE_RECEIVE");
    if(ack!==null && ack<received-60_000)
      throw Error("GATE05_CENSUS_ACK_CLOCK_BEFORE_RECEIVE");
    // Paid sample denominators are strictly within the authentic exposure
    // window. Late receipts may inform grace/censoring, never increase sample.
    const inside=received>=started && received<=stopped;
    if(inside){
      if(raw!==null && ack!==null && raw<=ack && received<=ack)custody++;
      else missing++;
    }
    first=Math.min(first,received);last=Math.max(last,received);
    if(received>stopped){postStop++;lastAfter=Math.max(lastAfter,received);}
    if(!inside)continue;
    // A physically identified OPERATOR contributes once, regardless of
    // marketing aliases, repeated notifications and multiple live points.
    const verified=item.identityBasis==="VERIFIED_OPERATING_LEG" &&
      item.codeshareRole==="OPERATOR" && item.physicalFlightId!==null;
    if(!verified){marketing++;continue;}
    const id=item.physicalFlightId!;
    legs.add(id);
    if(item.flightStage==="COMPLETED")completed.add(id);
    if(item.flightStage==="AIRBORNE"){
      if(location!==null && location>=started &&
         location<=stopped && location<=received+120_000){
        airborne.add(id);
        if(!points.has(id))points.set(id,new Set());
        points.get(id)!.add(location);
      } else stale++;
    }
    // Terminal update latency is only available where provider state clock
    // is present. A poststop receipt is retained as a censored late receipt.
    if(item.flightStage==="COMPLETED" && updated!==null &&
       updated<=received && updated>=started-3600_000)
      receiptLatencies.push((received-updated)/1000);
  }
  const gaps:number[]=[];
  let pointCount=0;
  for(const unique of points.values()){
    const times=[...unique].sort((a,b)=>a-b);
    pointCount+=times.length;
    for(let i=1;i<times.length;i++)gaps.push((times[i]-times[i-1])/1000);
  }
  const duration=(stopped-started)/60_000;
  const deficits:string[]=[];
  const integrityFindings:string[]=[];
  // The binding f.8 §16 100-item threshold is about observed notifications.
  // Whether each was proved durably raw-before-2xx is a *separate* integrity
  // measurement. Missing HTTP ACK clocks must not be misclassified as
  // "insufficient flight sample" when a source audit found 100+ receipts.
  if(custody+missing<100)deficits.push("RECEIVED_NOTIFICATION_ITEMS_LT_100");
  if(missing>0)
    integrityFindings.push("RAW_BEFORE_2XX_ITEM_ACK_PROOF_INCOMPLETE");
  if(legs.size<50)deficits.push("SOURCE_QUALIFIED_OPERATING_FLIGHTS_LT_50");
  if(completed.size<20)deficits.push("COMPLETED_OPERATING_FLIGHTS_LT_20");
  if(airborne.size<30)deficits.push("AIRBORNE_OPERATING_FLIGHTS_LT_30");
  if(pointCount<100)deficits.push("USABLE_UNIQUE_AIRBORNE_POINTS_LT_100");
  if(duration<60)deficits.push("EXACT_OBSERVED_SUBSCRIPTION_DURATION_LT_60_MIN");
  if(!pilot.evidenceSourceReviewed)
    integrityFindings.push("ITEM_SOURCE_NOT_INDEPENDENTLY_REVIEWED");
  return {
    schema:GATE05_CENSUS_SCHEMA_V39,
    status:duration<60?"STOPPED_EARLY":"SAMPLE_ONLY_NEEDS_SOURCE_AUDIT",
    itemFacts:pilot.items.length,
    rawBefore2xxItems:custody,
    missingRawAckProofItems:missing,
    distinctReceivedItems:items.size,
    inWindowReceivedItemCount:custody+missing,
    sourceQualifiedPhysicalFlights:legs.size,
    sourceQualifiedCompletedFlights:completed.size,
    sourceQualifiedAirborneFlights:airborne.size,
    uniqueUsableAirbornePoints:pointCount,
    marketingOrUnverifiedItems:marketing,
    malformedOrStaleAirbornePointItems:stale,
    observedDurationMinutes:duration,
    plannedDurationMinutes:(planned-started)/60_000,
    firstReceivedAtUtc:Number.isFinite(first)?new Date(first).toISOString():null,
    lastReceivedAtUtc:Number.isFinite(last)?new Date(last).toISOString():null,
    postStopReceivedItemCount:postStop,
    airborneGapSeconds:metric(gaps),
    terminalReceiptLatencySeconds:metric(receiptLatencies),
    latestPostStopReceiptDelaySeconds:Number.isFinite(lastAfter)?
      (lastAfter-stopped)/1000:null,
    sampleMinima:{notifications:100,distinctOperatingFlights:50,
      completedFlights:20,airborneFlights:30,airbornePoints:100,
      durationMinutes:60},
    deficits,integrityFindings,
    independentPhysicalIdentityConfirmed:false,
    scheduledWheelsOffReferenceConfirmed:false,
    actualWheelsOffSourceConfirmed:false,
    perFlightAsOfCutoffConfirmed:false,
    rawCustodyIndependentlyValidated:false,
    finalProviderBillingConfirmed:false,
    strictSciencePassed:false,
    paidAuthorizationGranted:false,providerCalls:0,databaseWrites:0
  };
}
