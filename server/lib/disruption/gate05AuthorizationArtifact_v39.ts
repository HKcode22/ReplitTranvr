/**
 * Gate0.5 reviewed JSON authorization *artifact binding* (offline only).
 * This checks an independently pinned exact byte digest and exact pilot shape.
 * It does NOT authenticate the human signer, mint AUTH, activate DB roles,
 * read the provider account, or authorize provider expenditure.
 */
import {createHash} from "node:crypto";
import {assertPrepaidOriginalJsonStructureV39} from "./prepaidOriginalJsonStructure_v39";
import {gate05FidsQueryFingerprintV39} from "./gate05ScopedFidsOwner_v39";

type TrustPins={
  independentlyReviewedArtifactSha256:string;
  expectedSourceCommit:string;
  expectedOpenapiSha256:string;
  expectedProviderResetUtc:string;
  expectedIanaTimezone:string;
  observedNowUtc:string;
};
const hex=(s:unknown,n:number)=>typeof s==="string"&&new RegExp("^[a-f0-9]{"+n+"}$").test(s);
const date=(s:unknown):number=>{
  if(typeof s!=="string"||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(s))
    throw Error("GATE05_AUTH_NONCANONICAL_UTC_HOLD");
  const ms=Date.parse(s);
  if(!Number.isFinite(ms)||new Date(ms).toISOString().slice(0,19)!==s.slice(0,19))
    throw Error("GATE05_AUTH_INVALID_UTC_HOLD");
  return ms;
};
const keys=[
  "schema","scopeId","authorizationId","sourceCommit","openapiSha256",
  "cycleId","providerResetUtc","airportIcao","ianaTimezone",
  "fromLocal","toLocal","startsAtUtc","expiresAtUtc",
  "noLocationQuerySha256","locationQuerySha256",
  "maxBaseUnits","maxRetryUnits","maxTotalUnits",
  "maxAlertCreates","purpose"
] as const;
const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/;
const fail=(reason:string):never=>{throw Error("GATE05_AUTH_"+reason+"_HOLD");};

export function inspectGate05ExactAuthArtifactV39(
  bytes:Buffer,pins:TrustPins
){
  if(!Buffer.isBuffer(bytes)||bytes.length<20||bytes.length>16384)
    fail("BYTES");
  if(!pins||!hex(pins.independentlyReviewedArtifactSha256,64)||
     !hex(pins.expectedSourceCommit,40)||
     !hex(pins.expectedOpenapiSha256,64))
    fail("INDEPENDENT_PINS");
  // Generic JSON duplicate-key and Unicode/escape validation, not
  // prepaid-domain semantic processing.
  assertPrepaidOriginalJsonStructureV39(bytes);
  const actualDigest=createHash("sha256").update(bytes).digest("hex");
  if(actualDigest!==pins.independentlyReviewedArtifactSha256)
    fail("REVIEWED_DIGEST_MISMATCH");
  let a:Record<string,any>;
  try{a=JSON.parse(bytes.toString("utf8"));}
  catch{return fail("JSON");}
  if(!a||Array.isArray(a)||typeof a!=="object"||
     Object.keys(a).sort().join("|")!==[...keys].sort().join("|"))
    fail("FIELDS");
  if(a.schema!=="v39.gate05.fids-feasibility-auth.v1"||
     a.purpose!=="TWO_QUERY_FEASIBILITY_NOT_SCIENTIFIC_PILOT"||
     typeof a.scopeId!=="string"||!uuid.test(a.scopeId)||
     typeof a.authorizationId!=="string"||
     !/^AUTH-[A-Z0-9-]{8,100}$/.test(a.authorizationId)||
     a.sourceCommit!==pins.expectedSourceCommit||
     a.openapiSha256!==pins.expectedOpenapiSha256||
     typeof a.cycleId!=="string"||a.cycleId.length<8||a.cycleId.length>120||
     a.providerResetUtc!==pins.expectedProviderResetUtc||
     a.ianaTimezone!==pins.expectedIanaTimezone||
     typeof a.airportIcao!=="string"||!/^[A-Z]{4}$/.test(a.airportIcao)||
     a.maxBaseUnits!==4||a.maxRetryUnits!==8||a.maxTotalUnits!==12||
     a.maxAlertCreates!==0)
    fail("SCOPE_OR_LIMITS");
  const now=date(pins.observedNowUtc);
  const start=date(a.startsAtUtc),end=date(a.expiresAtUtc),reset=date(a.providerResetUtc);
  if(start<now||start>now+86400000||end<=start||
     end>start+3600000||end>reset||reset<=now)
    fail("TIME_WINDOW_OR_CYCLE");
  const core={icao:a.airportIcao,fromLocal:a.fromLocal,toLocal:a.toLocal};
  const noLocation=gate05FidsQueryFingerprintV39({...core,withLocation:false});
  const location=gate05FidsQueryFingerprintV39({...core,withLocation:true});
  if(noLocation!==a.noLocationQuerySha256||
     location!==a.locationQuerySha256||noLocation===location)
    fail("FIDS_QUERY_FINGERPRINT");
  return {
    schema:"v39.gate05.exact-auth-review.v1" as const,
    status:"ARTIFACT_BOUND_NOT_HUMAN_SIGNED_OR_DEPLOYABLE" as const,
    reviewedByteSha256:actualDigest,
    sourceCommit:a.sourceCommit as string,
    authorizationId:a.authorizationId as string,
    scopeId:a.scopeId as string,
    airportIcao:a.airportIcao as string,
    cycleId:a.cycleId as string,
    providerResetUtc:a.providerResetUtc as string,
    startsAtUtc:a.startsAtUtc as string,
    expiresAtUtc:a.expiresAtUtc as string,
    allowedQuerySha256:[noLocation,location],
    maxBaseUnits:4 as const,maxRetryUnits:8 as const,maxTotalUnits:12 as const,
    humanSignatureVerified:false as const,
    liveProviderPlanVerified:false as const,
    activationPermissionGranted:false as const,
    paidPilotAuthorized:false as const
  };
}
