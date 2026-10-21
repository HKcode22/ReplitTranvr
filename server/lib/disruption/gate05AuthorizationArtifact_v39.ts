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
  let parsed:unknown;
  try{parsed=JSON.parse(bytes.toString("utf8"));}
  catch{return fail("JSON");}
  if(parsed===null||Array.isArray(parsed)||typeof parsed!=="object")
    fail("FIELDS");
  const a=parsed as Record<string,any>;
  if(Object.keys(a).sort().join("|")!==[...keys].sort().join("|"))
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


/**
 * Deterministic, IO-FREE plan for the EXACT 3-row Gate05 schema representation.
 * This is not an installer or an approval. The artifact and external pins
 * still do not identify/attest an owner signer; real DB scope preparation and
 * subsequent activation require separately approved commissioning.
 *
 * Deliberately fixes state PREPARED, zero consumption, 4+8=12 cap, and exactly
 * one no-location and one with-location query. No caller-provided SQL allowed.
 */
export function previewGate05PreparedScopeRowsV39(
  bytes:Buffer,pins:TrustPins
){
  const reviewed=inspectGate05ExactAuthArtifactV39(bytes,pins);
  if(reviewed.airportIcao!=="WSSS"||
     pins.expectedIanaTimezone!=="Asia/Singapore")
    fail("PREPARED_WSSS_SCOPE_ONLY");

  const scope={
    scope_id:reviewed.scopeId,
    authorization_id:reviewed.authorizationId,
    authorization_sha256:reviewed.reviewedByteSha256,
    cycle_id:reviewed.cycleId,
    icao:"WSSS" as const,
    starts_at_utc:reviewed.startsAtUtc,
    expires_at_utc:reviewed.expiresAtUtc,
    state:"PREPARED" as const,
    base_cap_units:4 as const,
    retry_cap_units:8 as const,
    base_used_units:0 as const,
    retry_used_units:0 as const
  };
  const queries=[
    {scope_id:reviewed.scopeId,
     query_sha256:reviewed.allowedQuerySha256[0],
     query_index:1 as const,with_location:false as const,
     last_reserved_attempt:0 as const},
    {scope_id:reviewed.scopeId,
     query_sha256:reviewed.allowedQuerySha256[1],
     query_index:2 as const,with_location:true as const,
     last_reserved_attempt:0 as const}
  ] as const;
  const exactRowsSha256=createHash("sha256")
    .update(JSON.stringify({scope,queries})).digest("hex");

  return {
    schema:"v39.gate05.prepared-scope-rows-review.v1" as const,
    status:"ROWS_PREVIEW_ONLY_UNAUTHORIZED_NO_SQL" as const,
    scope,queries,exactRowsSha256,
    independentlyAuthenticatedOwnerSigner:false as const,
    independentlyAttestedProviderPlanAndRetention:false as const,
    approvedCommissioner:false as const,
    approvedActivation:false as const,
    paidPilotAuthorized:false as const,
    databaseWrites:0 as const,
    providerRequests:0 as const
  };
}


/**
 * Parameterized SQL *review plan* for a transaction that would persist only
 * a PREPARED owner scope and its TWO immutable FIDS queries.
 *
 * No connection, BEGIN, COMMIT, GRANT, role, HTTP, file or SQL execution.
 * A separately approved identity-bearing authorization commissioner must
 * attest rights and choose whether to execute these fixed statements.
 * NEVER substitute this pure plan for human approval or run it with the
 * legacy app's general-purpose DATABASE_URL during paid collection.
 */
export function planGate05PreparedOnlySqlV39(bytes:Buffer,pins:TrustPins){
  const rows=previewGate05PreparedScopeRowsV39(bytes,pins);
  const o=rows.scope,q=rows.queries;
  const commands=[
    {
      sql:"INSERT INTO clean.gate05_fids_pilot_scope_v39 "+
        "(scope_id,authorization_id,authorization_sha256,cycle_id,icao,"+
        "starts_at_utc,expires_at_utc,state,base_cap_units,retry_cap_units,"+
        "base_used_units,retry_used_units) "+
        "VALUES ($1::uuid,$2,$3,$4,$5,$6::timestamptz,$7::timestamptz,"+
        "'PREPARED',4,8,0,0)",
      params:[o.scope_id,o.authorization_id,o.authorization_sha256,
        o.cycle_id,o.icao,o.starts_at_utc,o.expires_at_utc]
    },
    {
      sql:"INSERT INTO clean.gate05_fids_allowed_query_v39 "+
        "(scope_id,query_sha256,query_index,with_location,last_reserved_attempt) "+
        "VALUES ($1::uuid,$2,1,false,0),($1::uuid,$3,2,true,0)",
      params:[o.scope_id,q[0].query_sha256,q[1].query_sha256]
    }
  ] as const;
  return {
    schema:"v39.gate05.prepared-scope-sql-review.v1" as const,
    status:"PARAMETERIZED_SQL_PLAN_ONLY_NO_COMMISSION_AUTH" as const,
    scopeId:o.scope_id,
    reviewedAuthorizationSha256:o.authorization_sha256,
    exactRowsSha256:rows.exactRowsSha256,
    commands,
    // A real commissioner must wrap statements in a reviewed atomic
    // transaction and validate exact post-write rows before COMMIT.
    includesBeginOrCommit:false as const,
    canActivatePilot:false as const,
    canAuthorizeProviderSpend:false as const,
    signerAndPlanRightsAttested:false as const,
    databaseWrites:0 as const,
    providerRequests:0 as const
  };
}


/**
 * PREPARED read-back verification for a future one-use, atomic commissioner.
 *
 * Requires DB SELECT results independently read within the SAME transaction
 * as the two parameterized INSERTs. Readback equality is necessary but NOT
 * sufficient: no signer trust, plan entitlement, production role, activation
 * or spending authority is established here.
 */
export function verifyGate05PreparedReadbackV39(
  bytes:Buffer,pins:TrustPins,scopeRows:unknown,queryRows:unknown
){
  const planned=previewGate05PreparedScopeRowsV39(bytes,pins);
  const deny=():never=>fail("PREPARED_READBACK");
  const record=(x:unknown):Record<string,unknown>=>{
    if(x===null||typeof x!=="object"||Array.isArray(x))return deny();
    return x as Record<string,unknown>;
  };
  if(!Array.isArray(scopeRows)||scopeRows.length!==1||
     !Array.isArray(queryRows)||queryRows.length!==2)return deny();
  const s=record(scopeRows[0]),expected=planned.scope;
  const simple=[
    "scope_id","authorization_id","authorization_sha256","cycle_id",
    "icao","state","base_cap_units","retry_cap_units",
    "base_used_units","retry_used_units"
  ] as const;
  if(simple.some(k=>s[k]!==expected[k]))deny();
  const exactInstant=(actual:unknown,expectedUtc:string):boolean=>{
    const ms=actual instanceof Date ? actual.getTime():
      typeof actual==="string" ? Date.parse(actual):NaN;
    return Number.isFinite(ms)&&ms===Date.parse(expectedUtc);
  };
  if(!exactInstant(s.starts_at_utc,expected.starts_at_utc)||
     !exactInstant(s.expires_at_utc,expected.expires_at_utc)||
     s.stopped_at_utc!==null||s.stop_reason!==null)deny();

  const actualQueries=queryRows.map(record).sort(
    (a,b)=>Number(a.query_index)-Number(b.query_index)
  );
  for(let i=0;i<planned.queries.length;i++){
    const got=actualQueries[i],wanted=planned.queries[i];
    if(got.scope_id!==wanted.scope_id||
       got.query_sha256!==wanted.query_sha256||
       got.query_index!==wanted.query_index||
       got.with_location!==wanted.with_location||
       got.last_reserved_attempt!==wanted.last_reserved_attempt)deny();
  }
  return {
    schema:"v39.gate05.prepared-readback-review.v1" as const,
    status:"EXACT_THREE_PREPARED_ROWS_MATCH_NO_LIVE_AUTH" as const,
    scopeId:planned.scope.scope_id,
    exactRowsSha256:planned.exactRowsSha256,
    reviewedAuthorizationSha256:planned.scope.authorization_sha256,
    rowsVerified:3 as const,
    activeScopesVerified:0 as const,
    usedApiUnitsVerified:0 as const,
    signerIdentityAttested:false as const,
    activationGranted:false as const,
    paidPilotAuthorized:false as const,
    providerRequests:0 as const
  };
}


/**
 * Exact, read-only inventory query for an exclusively commissioned pilot.
 * Intended for use under a SERIALIZED, independently authenticated future
 * transaction. The query alone cannot prevent a second writer racing in.
 *
 * Prior terminal STOPPED scopes are legitimate durable history and are
 * intentionally NOT a global blocker; only unclosed PREPARED/ACTIVE scopes
 * conflict with a newly prepared exclusive one-use pilot.
 */
export function gate05PreparedCommissionInventorySqlV39(scopeId:string){
  if(typeof scopeId!=="string"||!uuid.test(scopeId))
    fail("COMMISSION_INVENTORY_SCOPE");
  return {
    sql:"SELECT "+
      "(SELECT count(*)::int FROM clean.gate05_fids_pilot_scope_v39 "+
      "WHERE state IN ('PREPARED','ACTIVE')) AS open_scopes,"+
      "(SELECT count(*)::int FROM clean.gate05_fids_pilot_scope_v39 "+
      "WHERE scope_id=$1::uuid AND state='PREPARED') AS matching_prepared,"+
      "(SELECT count(*)::int FROM clean.gate05_fids_pilot_scope_v39 "+
      "WHERE scope_id=$1::uuid AND state='ACTIVE') AS matching_active,"+
      "(SELECT count(*)::int FROM clean.gate05_fids_allowed_query_v39 "+
      "WHERE scope_id=$1::uuid) AS matching_queries,"+
      "(SELECT count(*)::int FROM clean.gate05_fids_attempt_v39 "+
      "WHERE scope_id=$1::uuid) AS matching_attempts",
    params:[scopeId] as const
  };
}

/**
 * Necessary accounting/exclusivity evidence BEFORE or AFTER a PREPARED-only
 * rehearsal transaction. Does not mint owner AUTH, grant privileges, or
 * perform SQL itself.
 */
export function verifyGate05PreparedCommissionInventoryV39(
  rows:unknown,phase:"BEFORE"|"AFTER"
){
  const bad=():never=>fail("COMMISSION_INVENTORY");
  if(phase!=="BEFORE"&&phase!=="AFTER")return bad();
  if(!Array.isArray(rows)||rows.length!==1)return bad();
  const r=rows[0];
  if(!r||typeof r!=="object"||Array.isArray(r))return bad();
  const x=r as Record<string,unknown>;
  const keys=[
    "open_scopes","matching_prepared","matching_active",
    "matching_queries","matching_attempts"
  ] as const;
  if(keys.some(k=>!Number.isSafeInteger(x[k])||
    (x[k] as number)<0))return bad();
  const expected=phase==="BEFORE"?
    [0,0,0,0,0]:[1,1,0,2,0];
  if(keys.some((k,i)=>x[k]!==expected[i]))return bad();
  return {
    schema:"v39.gate05.prepared-exclusivity-v1" as const,
    status:phase==="BEFORE"?
      "NO_CONCURRENT_OPEN_SCOPE_VERIFIED" as const:
      "ONE_EXCLUSIVE_PREPARED_SCOPE_VERIFIED" as const,
    phase,
    noActiveScopeVerified:true as const,
    noAttemptsForTargetVerified:true as const,
    providerRequests:0 as const,
    activationAuthorized:false as const,
    paidPilotAuthorized:false as const
  };
}
