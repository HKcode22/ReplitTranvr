/**
 * Phase4/Gate5 independent OFFLINE census, f.8 §§5,7.5,16-17.
 * Provider data, true cutoff T and identity provenance must be authenticated
 * by a separate adapter; this module can NEVER certify a live scientific PASS.
 */
export const GATE5_OFFLINE_SCHEMA_V39="v39.phase4.gate5-offline-funnel.v1" as const;
export const GATE5_HORIZONS_V39={"T-24h":86400000,"T-6h":21600000,"T-90m":5400000} as const;
export type Gate5Horizon=keyof typeof GATE5_HORIZONS_V39;
export interface FidsFact {
 flightId:string;queryId:string;airport:string;
 role:"requested_airport_primary"|"opposite_movement_context";
 scope:"confirmed_core"|"unknown"|"auxiliary";
 codeshare:"confirmed_operating_leg"|"resolved_marketing"|"ambiguous_unknown";
 firstSelectedTUtc:string|null;movementScheduledUtc:string|null;
 availableAtUtc:string;departureCountry:string|null;arrivalCountry:string|null;
}
export interface WebhookFact {flightId:string;airport:string;receivedAtUtc:string}
export interface SnapshotFact {
 flightId:string;horizon:Gate5Horizon;cutoffUtc:string;populationQueryId:string;
 requiredComplete:boolean;optionalMissing:boolean;
 targetApplicable:boolean;targetObserved:boolean;targetSourceVerified:boolean;
}
export interface AirborneFact {
 flightId:string;eligible:boolean;observed:boolean;usable:boolean;complete:boolean;
 snapshotEligible:boolean;labeled:boolean;
}
export interface Gate5Input {
 airport:string;tier:string;region:string;
 windowStartUtc:string;windowEndUtc:string;
 fids:readonly FidsFact[];webhooks:readonly WebhookFact[];
 snapshots:readonly SnapshotFact[];airborne:readonly AirborneFact[];
}
export type Rate=Readonly<{numerator:number;denominator:number;value:number|null;reason:string|null}>;
export interface HorizonReport {
 horizon:Gate5Horizon;population:number;eligible:number;expectedSnapshots:number;
 createdSnapshots:number;webhookCaptured:number;capturedOutsidePopulation:number;
 requiredComplete:number;optionalMissing:number;targetApplicable:number;targetObserved:number;
 noVerifiedT:number;firstFidsAfterCutoff:number;
 countryMix:{domestic:number;international:number;unknown:number};
 rates:{snapshot:Rate;capture:Rate;required:Rate;optionalMissing:Rate;target:Rate};
 violations:string[];
}
export interface Gate5Report {
 schema:typeof GATE5_OFFLINE_SCHEMA_V39;
 status:"OFFLINE_ONLY_NOT_LIVE_GATE5_PASS";
 airport:string;tier:string;region:string;
 sourceObservations:number;primaryObservedRows:number;contextExcluded:number;
 ambiguousExcluded:number;webhookItems:number;distinctWebhookIds:number;
 horizons:HorizonReport[];
 airborne:{eligible:number;observed:number;usable:number;complete:number;
   snapshotEligible:number;labeled:number;rates:{stage:string;count:number;previous:Rate;eligible:Rate}[]};
 violations:string[];strictPassed:false;phase6Authorized:false;
 providerQueries:0;databaseWrites:0;
}
function ms(value:string):number{
 if(typeof value!=="string"||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(value))
   throw Error("GATE5_EXPLICIT_UTC_REQUIRED");
 const n=Date.parse(value);
 if(!Number.isFinite(n)||new Date(n).toISOString().slice(0,19)!==value.slice(0,19))
   throw Error("GATE5_INVALID_UTC");
 return n;
}
function id(s:string):boolean{return typeof s==="string"&&s.length>0&&s.length<=180;}
function ratio(n:number,d:number,reason:string):Rate{
 if(!Number.isSafeInteger(n)||!Number.isSafeInteger(d)||n<0||d<0)
   throw Error("GATE5_INVALID_RATE");
 return {numerator:n,denominator:d,value:d===0?null:n/d,reason:d===0?reason:null};
}
function op(f:FidsFact):boolean{
 return f.role==="requested_airport_primary"&&f.scope==="confirmed_core"&&
   f.codeshare==="confirmed_operating_leg";
}
function mix(f:FidsFact):"domestic"|"international"|"unknown"{
 const a=f.departureCountry,b=f.arrivalCountry;
 if(!a||!b||!/^[A-Z]{2}$/.test(a)||!/^[A-Z]{2}$/.test(b))return "unknown";
 return a===b?"domestic":"international";
}
export function analyzeGate5Offline(input:Gate5Input):Gate5Report {
 if(!input||!Array.isArray(input.fids)||!Array.isArray(input.webhooks)||
    !Array.isArray(input.snapshots)||!Array.isArray(input.airborne)||
    input.fids.length>50000||input.webhooks.length>50000||
    input.snapshots.length>100000||input.airborne.length>50000)
   throw Error("GATE5_INPUT_INVALID");
 if(!/^[A-Z]{4}$/.test(input.airport)||!id(input.tier)||!id(input.region))
   throw Error("GATE5_SCOPE_INVALID");
 const start=ms(input.windowStartUtc),end=ms(input.windowEndUtc);
 if(start>=end||end-start>7*86400000)throw Error("GATE5_WINDOW_INVALID");
 const rowsById=new Map<string,FidsFact[]>();
 const seenRows=new Set<string>();
 let context=0,ambiguous=0,primary=0;
 for(const f of input.fids){
   if(!f||!id(f.flightId)||!id(f.queryId)||f.airport!==input.airport||
      !["requested_airport_primary","opposite_movement_context"].includes(f.role)||
      !["confirmed_core","unknown","auxiliary"].includes(f.scope)||
      !["confirmed_operating_leg","resolved_marketing","ambiguous_unknown"].includes(f.codeshare))
     throw Error("GATE5_FIDS_ROLE_ID_SCOPE_INVALID");
   ms(f.availableAtUtc);
   if(f.firstSelectedTUtc!==null)ms(f.firstSelectedTUtc);
   if(f.movementScheduledUtc!==null)ms(f.movementScheduledUtc);
   const k=f.queryId+"|"+f.flightId+"|"+f.role;
   if(seenRows.has(k))throw Error("GATE5_FIDS_DUPLICATE");
   seenRows.add(k);
   if(f.role!=="requested_airport_primary"){context++;continue;}
   if(f.codeshare!=="confirmed_operating_leg")ambiguous++;
   if(!op(f)||f.movementScheduledUtc===null)continue;
   const scheduled=ms(f.movementScheduledUtc);
   if(scheduled<start||scheduled>=end)continue;
   primary++;
   rowsById.set(f.flightId,[...(rowsById.get(f.flightId)||[]),f]);
 }
 for(const facts of rowsById.values())
   facts.sort((a,b)=>ms(a.availableAtUtc)-ms(b.availableAtUtc)||
     a.queryId.localeCompare(b.queryId));
 const captured=new Set<string>();
 for(const w of input.webhooks){
   if(!w||!id(w.flightId)||w.airport!==input.airport)
     throw Error("GATE5_WEBHOOK_ID_SCOPE_INVALID");
   const t=ms(w.receivedAtUtc);
   if(t>=start&&t<end)captured.add(w.flightId);
 }
 const snapshots=new Set<string>();
 for(const s of input.snapshots){
   if(!s||!id(s.flightId)||!id(s.populationQueryId)||
      !(s.horizon in GATE5_HORIZONS_V39)||
      [s.requiredComplete,s.optionalMissing,s.targetApplicable,s.targetObserved,
       s.targetSourceVerified].some(x=>typeof x!=="boolean"))
     throw Error("GATE5_SNAPSHOT_INVALID");
   const k=s.flightId+"|"+s.horizon+"|"+ms(s.cutoffUtc);
   if(snapshots.has(k))throw Error("GATE5_SNAPSHOT_DUPLICATE");
   snapshots.add(k);
 }
 const violations:string[]=[];
 const horizons:HorizonReport[]=[];
 for(const [horizon,lag] of Object.entries(GATE5_HORIZONS_V39) as [Gate5Horizon,number][]){
   const expected=new Map<string,{cutoff:number;queryId:string;fact:FidsFact}>();
   const countryMix={domestic:0,international:0,unknown:0};
   let noT=0,late=0;
   for(const [flightId,facts] of rowsById){
     const initial=facts[0];
     if(initial.firstSelectedTUtc===null){noT++;continue;}
     const cutoff=ms(initial.firstSelectedTUtc)-lag;
     const asOf=facts.filter(f=>ms(f.availableAtUtc)<=cutoff);
     if(asOf.length===0){late++;continue;}
     const chosen=asOf[asOf.length-1];
     expected.set(flightId,{cutoff,queryId:chosen.queryId,fact:chosen});
     countryMix[mix(chosen)]++;
   }
   let created=0,required=0,optional=0,applicable=0,observed=0;
   const errors:string[]=[];
   for(const s of input.snapshots.filter(x=>x.horizon===horizon)){
     const e=expected.get(s.flightId);
     if(!e||ms(s.cutoffUtc)!==e.cutoff||s.populationQueryId!==e.queryId){
       errors.push("SNAPSHOT_NOT_IN_ASOF_POPULATION");continue;
     }
     created++;
     if(s.requiredComplete)required++;
     if(s.optionalMissing)optional++;
     if(s.targetApplicable){
       applicable++;
       if(s.targetObserved){
         if(s.targetSourceVerified)observed++;
         else errors.push("TARGET_WITHOUT_VERIFIED_SOURCE");
       }
     }else if(s.targetObserved)errors.push("NONAPPLICABLE_TARGET_OBSERVED");
   }
   const inside=[...captured].filter(fid=>expected.has(fid)).length;
   const outside=captured.size-inside;
   if(created>expected.size)errors.push("SNAPSHOTS_EXCEED_EXPECTED");
   violations.push(...errors.map(e=>horizon+":"+e));
   horizons.push({
     horizon,population:expected.size,eligible:expected.size,
     expectedSnapshots:expected.size,createdSnapshots:created,
     webhookCaptured:inside,capturedOutsidePopulation:outside,
     requiredComplete:required,optionalMissing:optional,
     targetApplicable:applicable,targetObserved:observed,
     noVerifiedT:noT,firstFidsAfterCutoff:late,countryMix,
     rates:{
       snapshot:ratio(created,expected.size,"ZERO_ELIGIBLE"),
       capture:ratio(inside,expected.size,"ZERO_ELIGIBLE"),
       required:ratio(required,created,"ZERO_CREATED_SNAPSHOTS"),
       optionalMissing:ratio(optional,created,"ZERO_CREATED_SNAPSHOTS"),
       target:ratio(observed,applicable,"ZERO_APPLICABLE_TARGET")
     },violations:errors
   });
 }
 const stages=["eligible","observed","usable","complete","snapshotEligible","labeled"];
 const counts=[0,0,0,0,0,0], seenAir=new Set<string>();
 for(const a of input.airborne){
   if(!a||!id(a.flightId)||seenAir.has(a.flightId))throw Error("GATE5_AIRBORNE_DUPLICATE");
   seenAir.add(a.flightId);
   const flags=[a.eligible,a.observed,a.usable,a.complete,a.snapshotEligible,a.labeled];
   if(flags.some(x=>typeof x!=="boolean"))throw Error("GATE5_AIRBORNE_FLAG_INVALID");
   for(let j=1;j<flags.length;j++)
     if(flags[j]&&!flags[j-1])throw Error("GATE5_AIRBORNE_NON_NESTED");
   if(a.eligible&&!rowsById.has(a.flightId))
     violations.push("AIRBORNE_WITHOUT_PRIMARY_OPERATING_FIDS");
   flags.forEach((flag,j)=>{if(flag)counts[j]++;});
 }
 return {
   schema:GATE5_OFFLINE_SCHEMA_V39,status:"OFFLINE_ONLY_NOT_LIVE_GATE5_PASS",
   airport:input.airport,tier:input.tier,region:input.region,
   sourceObservations:input.fids.length,primaryObservedRows:primary,
   contextExcluded:context,ambiguousExcluded:ambiguous,
   webhookItems:input.webhooks.length,distinctWebhookIds:captured.size,
   horizons,
   airborne:{eligible:counts[0],observed:counts[1],usable:counts[2],
     complete:counts[3],snapshotEligible:counts[4],labeled:counts[5],
     rates:stages.map((stage,j)=>({
       stage,count:counts[j],
       previous:ratio(counts[j],j===0?counts[0]:counts[j-1],"ZERO_PREVIOUS_STAGE"),
       eligible:ratio(counts[j],counts[0],"ZERO_AIRBORNE_ELIGIBLE")
     }))},
   violations,strictPassed:false,phase6Authorized:false,providerQueries:0,databaseWrites:0
 };
}
