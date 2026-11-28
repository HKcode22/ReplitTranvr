/** Separate prospective conditional-service outcome pairing.
 * Only independently signed PRE issuance and POST original review receipts.
 * No raw exports, no physical gate-out labels, no signer or DB writer here.
 * Trust pins must come from a protected independently commissioned policy.
 */
import {createHash,createPublicKey,verify,type KeyObject} from "node:crypto";
import {measureP5FirstCycleScheduleRevision,type P5ScheduleHorizon} from "./phase5ProspectiveProviderScheduleRevisionPrimary_v39";
const H=/^[a-f0-9]{64}$/,K=/^leg:g5a:[a-f0-9]{64}$/,U=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// JSON receipts are runtime data, not validated TypeScript values. Require a
// complete primitive-string match before comparing evidence identities.
const exactMatch=(pattern:RegExp,value:unknown):value is string=>
 typeof value==="string"&&pattern.exec(value)?.[0]===value;
const fail=(x:string):never=>{throw Error("HOLD_P5_CONDITIONAL_PAIR_"+x);};
const sha=(x:string|Buffer)=>createHash("sha256").update(x).digest("hex");
function clock(x:unknown){if(typeof x!=="string"||!Number.isFinite(Date.parse(x))||new Date(x).toISOString()!==x)return fail("CLOCK");return Date.parse(x);}
const b64=(x:unknown,n:number)=>{if(typeof x!=="string"||x.length>n||!x.length)return fail("WIRE");const b=Buffer.from(x,"base64");if(b.toString("base64")!==x)return fail("WIRE");return b;};
const keyHash=(k:KeyObject)=>sha(k.export({type:"spki",format:"der"}) as Buffer);
type Policy={schema:"v39.phase5.conditional-schedule-pair-policy.v1";manifestSha256:string;protocolSha256:string;rightsSha256:string;effectiveUtc:string;expiresUtc:string;preSignerSpkiSha256:string;postSignerSpkiSha256:string;endpoint:"PROVIDER_SCHEDULE_REVISION_ABS_GE_15_MIN";approvedSeparateTier:true};
type Observation={schema:"v39.phase5.conditional-schedule-receipt.v1";lane:"PRE"|"POST";manifestSha256:string;protocolSha256:string;rightsSha256:string;runDayIndex:number;serviceKey:string;operatorFlightNumber:string;originIcao:string;destinationIcao:string;sourceQueryId:string;sourceResponseSha256:string;sourceBodySha256:string;sourceAvailableUtc:string;sourceExpiresUtc:string;sourcePlannedUtc:string;reviewedAtUtc:string;scheduledDepartureUtc:string;firstScheduledDepartureUtc:string;horizon:P5ScheduleHorizon;preIssueReceiptSha256:string|null;preIssuedUtc:string|null;postReservationSha256:string|null;positiveOperatorUnique:true;nativeOperatingLegCertified:false};
type Wire={bodyBase64:string;signatureBase64:string};
type Trust={policyBytes:Buffer;expectedPolicySha256:string;preSignerPublicKeyPem:string;postSignerPublicKeyPem:string};
function parseWire(w:Wire,key:KeyObject){
 const body=b64(w?.bodyBase64,32768),sig=b64(w?.signatureBase64,256);
 if(sig.length!==64||!verify(null,body,key,sig))return fail("SIGNATURE");
 let v:Observation;try{v=JSON.parse(body.toString("utf8"));}catch{return fail("WIRE_JSON");}
 if(!v||v.schema!=="v39.phase5.conditional-schedule-receipt.v1"||!exactMatch(H,v.manifestSha256)||!exactMatch(H,v.protocolSha256)||!exactMatch(H,v.rightsSha256)||!exactMatch(K,v.serviceKey)||!exactMatch(U,v.sourceQueryId)||!exactMatch(H,v.sourceResponseSha256)||!exactMatch(H,v.sourceBodySha256)||
 !Number.isSafeInteger(v.runDayIndex)||v.runDayIndex<1||v.runDayIndex>31||!exactMatch(/^[A-Z0-9]{2}[0-9]{1,4}$/,v.operatorFlightNumber)||!exactMatch(/^[A-Z]{4}$/,v.originIcao)||!exactMatch(/^[A-Z]{4}$/,v.destinationIcao)||v.originIcao===v.destinationIcao||
 v.positiveOperatorUnique!==true||v.nativeOperatingLegCertified!==false||!["T-24h","T-6h","T-90m"].includes(v.horizon))return fail("RECEIPT");
 return v;
}
export function measureP5ConditionalSignedSchedulePair(trust:Trust,preWire:Wire,postWire:Wire,dbObservedUtc:string){
 if(!trust||!exactMatch(H,trust.expectedPolicySha256)||!Buffer.isBuffer(trust.policyBytes)||trust.policyBytes.length>16384||sha(trust.policyBytes)!==trust.expectedPolicySha256)fail("PINNED_POLICY");
 let p:Policy;try{p=JSON.parse(trust.policyBytes.toString("utf8"));}catch{return fail("POLICY_JSON");}
 if(!p||p.schema!=="v39.phase5.conditional-schedule-pair-policy.v1"||p.endpoint!=="PROVIDER_SCHEDULE_REVISION_ABS_GE_15_MIN"||p.approvedSeparateTier!==true||
 ![p.manifestSha256,p.protocolSha256,p.rightsSha256,p.preSignerSpkiSha256,p.postSignerSpkiSha256].every(x=>exactMatch(H,x))||p.preSignerSpkiSha256===p.postSignerSpkiSha256)fail("POLICY");
 const a=createPublicKey(trust.preSignerPublicKeyPem),b=createPublicKey(trust.postSignerPublicKeyPem);
 if(a.asymmetricKeyType!=="ed25519"||b.asymmetricKeyType!=="ed25519"||keyHash(a)!==p.preSignerSpkiSha256||keyHash(b)!==p.postSignerSpkiSha256)fail("DISTINCT_SIGNER_PINS");
 const pre=parseWire(preWire,a),post=parseWire(postWire,b),now=clock(dbObservedUtc),effective=clock(p.effectiveUtc),policyExpiry=clock(p.expiresUtc);
 const offset={"T-24h":86400000,"T-6h":21600000,"T-90m":5400000}[pre.horizon],T=clock(pre.firstScheduledDepartureUtc),cutoff=T-offset,W=T+7200000;
 if(effective>=policyExpiry||now>=policyExpiry||pre.lane!=="PRE"||post.lane!=="POST"||pre.horizon!=="T-6h"||post.horizon!==pre.horizon||pre.manifestSha256!==p.manifestSha256||post.manifestSha256!==p.manifestSha256||
 pre.protocolSha256!==p.protocolSha256||post.protocolSha256!==p.protocolSha256||pre.rightsSha256!==p.rightsSha256||post.rightsSha256!==p.rightsSha256||
 pre.runDayIndex!==post.runDayIndex||pre.serviceKey!==post.serviceKey||pre.operatorFlightNumber!==post.operatorFlightNumber||pre.originIcao!==post.originIcao||pre.destinationIcao!==post.destinationIcao||
 pre.firstScheduledDepartureUtc!==post.firstScheduledDepartureUtc||pre.sourceQueryId.toLowerCase()===post.sourceQueryId.toLowerCase()||pre.sourceResponseSha256===post.sourceResponseSha256||
 !exactMatch(H,pre.preIssueReceiptSha256??"")||pre.postReservationSha256!==null||post.preIssueReceiptSha256!==pre.preIssueReceiptSha256||
 post.preIssuedUtc!==pre.preIssuedUtc||!exactMatch(H,post.postReservationSha256??""))fail("PAIR_BINDING");
 const pa=clock(pre.sourceAvailableUtc),pr=clock(pre.reviewedAtUtc),pi=clock(pre.preIssuedUtc),pe=clock(pre.sourceExpiresUtc),pp=clock(pre.sourcePlannedUtc);
 const oa=clock(post.sourceAvailableUtc),orr=clock(post.reviewedAtUtc),oe=clock(post.sourceExpiresUtc),op=clock(post.sourcePlannedUtc);
 if(effective>pp||pp>pa||pa>pr||pr>pi||pi>cutoff||pi>=pe||pe>pa+23*3600000||
 op<T||op>oa||oa<=cutoff||oa>W||orr<oa||orr<W||orr>now||now>=pe||now>=oe||oe>oa+23*3600000||clock(pre.scheduledDepartureUtc)!==T)fail("PROSPECTIVE_OR_RETENTION");
 const key=pre.serviceKey.slice("leg:g5a:".length);
 const observations=[pre,post].map(x=>({originalSha256:x.sourceResponseSha256,sourceQueryId:x.sourceQueryId,availableAtUtc:x.sourceAvailableUtc,technicalExpiryAtUtc:x.sourceExpiresUtc,scheduledDepartureUtc:x.scheduledDepartureUtc,reviewedStableServiceKeySha256:key,reviewerScope:"QUERY_FILTERED_SCOPE_UNVERIFIED" as const,matchingServiceCount:1,nativeOperatingFlightId:null,operatorFlightNumber:x.operatorFlightNumber,originIcao:x.originIcao,destinationIcao:x.destinationIcao,inRequestedDepartureQuery:true}));
 const candidate=measureP5FirstCycleScheduleRevision({reviewedManifestSha256:p.manifestSha256,firstObservedNativeScheduledDepartureUtc:pre.firstScheduledDepartureUtc,horizon:pre.horizon,assessmentWatermarkUtc:new Date(W).toISOString(),reviewedStableServiceKeySha256:key,evidenceTier:"CONDITIONAL_QUERY_FILTERED_SERVICE",nativeOperatingFlightId:null,operatorFlightNumber:pre.operatorFlightNumber,originIcao:pre.originIcao,destinationIcao:pre.destinationIcao,observations});
 const summary={status:candidate.status,endpoint:p.endpoint,conditionalTierOnly:true,physicalGateOutCertified:false,trainingPublicationAuthorized:false,providerCalls:0,databaseWrites:0};
 return Object.freeze(Object.defineProperty(summary,"privateCandidate",{value:Object.freeze(candidate),enumerable:false})) as typeof summary&{readonly privateCandidate:typeof candidate};
}
