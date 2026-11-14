/**
 * Phase 6 no-dispatch link: exact one V0095 private SOURCE_QUERY_PACKET
 * to one V0094 SOURCE_DAY_REGISTRY from the verified DAY-EPOCH reader.
 * Retain the old pure read-only binder compatibility, but paid GitHub SOURCE
 * now mandates the new externally signed per-day path upstream.
 *
 * Does NOT read SQL, access credentials, call AeroDataBox, dispatch Actions,
 * materialize files, or assert a legal right/paid GO. The two receipts MUST
 * come from the already reviewed restricted PG16 readers. Existing Phase5
 * signed child admission and V0079/V0080/V0082 spend fences remain mandatory.
 */
import {createHash} from "node:crypto";
export const P6_SOURCE_QUERY_PAIR_SCHEMA=
 "v39.phase6.private-source-registry-query-binding-no-dispatch.v1";
const H=/^[0-9a-f]{64}$/;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const REG=/^data-collection\/phase5\/frozen\/source_[A-Za-z0-9_.-]{8,125}\.json$/;
const PACK=/^data-collection\/phase5\/frozen\/sourceq_[A-Za-z0-9_.-]{8,110}\.json$/;
const fail=c=>{throw Error("HOLD_P6_PRIVATE_SOURCE_QUERY_PAIR_"+c);};
const sha=b=>createHash("sha256").update(b).digest("hex");
function ms(s){
 if(typeof s!=="string"||!UTC.test(s)||!Number.isFinite(Date.parse(s))||
    new Date(s).toISOString()!==s)fail("INVALID_PG_CLOCK_OR_WINDOW");
 return Date.parse(s);
}
function parseObject(raw){
 let o;
 try{o=JSON.parse(raw.toString("utf8"));}
 catch{fail("UNPARSEABLE_PRIVATE_SOURCE_JSON");}
 if(!o||Array.isArray(o)||typeof o!=="object")
  fail("UNPARSEABLE_PRIVATE_SOURCE_JSON");
 return o;
}
function sealedProperty(o,name){
 const d=Object.getOwnPropertyDescriptor(o??{},name);
 return Boolean(d&&d.enumerable===false&&d.writable===false);
}
/**
 * Pure second-stage cross-binding; this is NOT a substitute for the signed
 * Ed25519 review, PG16 reader/ACL, provider rights, payment or child gates.
 */
export function bindP6OnePrivateSourceQueryFromVerifiedIndex({
 indexHandoff,sourcePacketReceipt,
 expectedRoutingIntentSha256,expectedQueryDigestSha256
}){
 const z=indexHandoff?.redactedSummary;
 const p=sourcePacketReceipt?.redactedSummary;
 const oldOnly=z?.schema===
      "v39.phase6.private-index-and-full-registries-memory-handoff-no-dispatch.v1"&&
   z.status==="SIGNED_RESTRICTED_INMEMORY_31DAY_REGISTRY_HANDOFF_NO_DISPATCH"&&
   z.underlyingPerFlightPacketsNotHydratedHere===true&&
   sealedProperty(indexHandoff,"privateRegistryBytes")&&
   indexHandoff.privateRegistryBytes instanceof Map;
 const perDay=z?.schema===
     "v39.phase6.day-epoch-exact-source-pre-post-original-semantics-no-go.v1"&&
   z.status==="ED25519_DAY_EPOCH_ORIGINAL_SOURCE_PRE_POST_SEMANTICS_PASS_NO_GO"&&
   z.reviewedEd25519SourceWasOriginalDayBytes===true&&
   z.originalV0096GlobalChainNotUsed===true&&
   z.derivedProjectionIsNotAnAdditionalReviewerSignature===true&&
   z.actualIndividualChildPaidReleaseDone===false&&
   z.actualOperatingFlightMembershipEstablishedHere===false&&
   z.individualUnderlyingFlightPacketsVerifiedHere===false&&
   H.test(z.externallySignedDayEpochIndexSha256??"")&&
   Number.isSafeInteger(z.runDayIndex)&&z.runDayIndex>=1&&
   z.runDayIndex<=31&&
   sealedProperty(indexHandoff,"getFrozen")&&
   typeof indexHandoff.getFrozen==="function";
 if((!oldOnly&&!perDay)||z.phase6PaidGo!==false||
    z.githubChildDispatches!==0||z.providerCalls!==0||
    z.databaseWrites!==0||
    !sealedProperty(indexHandoff,"privateRoutingCandidates")||
    !Array.isArray(indexHandoff.privateRoutingCandidates))
  fail("UNVERIFIED_SIGNED_INDEX_OR_PRIVATE_REGISTRY_HANDOFF");
 if(!H.test(expectedRoutingIntentSha256??"")||
    !H.test(expectedQueryDigestSha256??""))
  fail("MISSING_EXACT_INDEPENDENT_ROUTE_AND_QUERY_PINS");
 const candidates=indexHandoff.privateRoutingCandidates.filter(x=>
   x?.routingIntentSha256===expectedRoutingIntentSha256);
 if(candidates.length!==1)fail("NO_UNIQUE_SIGNED_ROUTE_INTENT");
 const c=candidates[0];
 if(c.lane!=="SOURCE"||
    (perDay&&c.runDayIndex!==z.runDayIndex)||
    !Number.isSafeInteger(c.runDayIndex)||c.runDayIndex<1||
    c.runDayIndex>31||
    !Number.isSafeInteger(c.shardIndex)||c.shardIndex<1||
    c.newPaidDispatchAuthorizedHere!==false||
    c.privateBytesOnlyFromRestrictedReader!==true||
    c.independentlyAuthenticatedGHHistoryRequired!==true||
    !REG.test(c.signedFrozenPath??"")||
    !H.test(c.signedFrozenSha256??"")||
    c.boundSourceRegistryPath!==null||
    c.boundSourceRegistrySha256!==null)
  fail("NOT_ONE_VALID_SIGNED_SOURCE_ROUTE");
 const origin=ms(perDay?z.observedRealPgClockUtc:
  z.observedRestrictedPgClockUtc);
 const packetAt=ms(p?.observedDatabaseClockUtc);
 if(origin>packetAt||packetAt-origin>120000||
    origin<ms(c.notBeforeUtc)||packetAt>=ms(c.hardLatestUtc)||
    ms(c.notBeforeUtc)>=ms(c.hardLatestUtc))
  fail("SOURCE_WINDOW_EXPIRED_OR_PRIVATE_READ_TOO_OLD");
 let registryBytes;
 try{
  registryBytes=perDay?indexHandoff.getFrozen(c.signedFrozenPath):
   indexHandoff.privateRegistryBytes.get(c.signedFrozenPath);
 }catch{fail("SIGNED_PRIVATE_SOURCE_REGISTRY_MISSING_REDACTED");}
 if(!Buffer.isBuffer(registryBytes)||
    registryBytes.length<100||registryBytes.length>100000||
    sha(registryBytes)!==c.signedFrozenSha256)
  fail("SOURCE_DAY_REGISTRY_PRIVATE_SHA_OR_SIZE_CHANGED");
 const registry=parseObject(registryBytes);
 if(registry.schema!=="v39.phase5.signed-per-day-source-batch-readonly.v1"||
    registry.runDayIndex!==c.runDayIndex||
    !H.test(registry.manifestSha256??"")||
    !Array.isArray(registry.entries)||
    registry.entries.length<1||registry.entries.length>96)
  fail("WRONG_SIGNED_SOURCE_REGISTRY_SHAPE_OR_DAY");
 if(!p||p.schema!==
    "v39.phase6.private-source-post-packet-restricted-read-once.v1"||
    p.status!=="VERIFIED_ONE_PRIVATE_PACKET_BYTE_TRANSPORT_NO_GO"||
    p.kind!=="SOURCE_QUERY_PACKET"||
    p.runDayIndex!==c.runDayIndex||
    p.shardIndex!==c.shardIndex||
    p.verifiedEd25519Review!==true||
    p.actualPhase6PaidGoCertified!==false||
    p.independentlyAuthorizedProviderUseCertified!==false||
    p.contentsWereCopiedToPublicLogs!==false||
    p.providerCalls!==0||p.databaseWrites!==0||
    !H.test(p.contentSha256??"")||
    !sealedProperty(sourcePacketReceipt,"privateBytes")||
    !sealedProperty(sourcePacketReceipt,"privateLogicalPath")||
    !PACK.test(sourcePacketReceipt.privateLogicalPath??"")||
    !Buffer.isBuffer(sourcePacketReceipt.privateBytes)||
    sourcePacketReceipt.privateBytes.length<100||
    sourcePacketReceipt.privateBytes.length>200000||
    sha(sourcePacketReceipt.privateBytes)!==p.contentSha256)
  fail("PRIVATE_QUERY_PACKET_READER_OR_SHA_UNVERIFIED");
 let selected=null;
 const paths=new Set(),digests=new Set();
 for(const e of registry.entries){
  if(!e||!PACK.test(e.filePath??"")||
     !H.test(e.expectedPacketSha256??"")||
     !H.test(e.expectedQueryDigestSha256??"")||
     paths.has(e.filePath)||digests.has(e.expectedQueryDigestSha256))
   fail("DUPLICATED_OR_MALFORMED_SOURCE_QUERY_REGISTRY");
  paths.add(e.filePath);digests.add(e.expectedQueryDigestSha256);
  if(e.expectedQueryDigestSha256===expectedQueryDigestSha256)
   selected=e;
 }
 if(!selected||selected.filePath!==sourcePacketReceipt.privateLogicalPath||
    selected.expectedPacketSha256!==p.contentSha256)
  fail("QUERY_IDENTITY_OR_PACKET_NOT_BOUND_TO_SIGNED_REGISTRY");
 const query=parseObject(sourcePacketReceipt.privateBytes);
 if(query.schema!=="v39.phase5.github-source-one-query-template.v2"||
    query.manifestSha256!==registry.manifestSha256||
    query.queryDigestSha256!==expectedQueryDigestSha256||
    query.plan?.acquisition?.runDayIndex!==c.runDayIndex||
    query.plan?.acquisition?.maxAttempts!==1||
    query.plan?.acquisition?.apiUnitsPerAttempt!==2||
    query.plan?.acquisition?.providerQueryDirection!=="Departure"||
    query.plan?.independentlyApprovedSourceAndRetention!==true||
    query.plan?.githubOnlyOwnerApproved!==true)
  fail("PRIVATE_QUERY_RELEASE_NOT_EXISTING_ONE_GET_TEMPLATE");
 const result={redactedSummary:Object.freeze({
  schema:P6_SOURCE_QUERY_PAIR_SCHEMA,
  status:"ONE_PRIVATE_SOURCE_QUERY_BOUND_TO_SIGNED_REGISTRY_NO_DISPATCH",
  runDayIndex:c.runDayIndex,shardIndex:c.shardIndex,
  routingIntentSha256:c.routingIntentSha256,
  registrySha256:c.signedFrozenSha256,
  queryDigestSha256:expectedQueryDigestSha256,
  queryPacketSha256:p.contentSha256,
  observedRestrictedPgClockUtc:p.observedDatabaseClockUtc,
  registryQueryCount:registry.entries.length,
  requiresExistingP5SignedDaySourceChildAdmission:true,
  independentLegalRetentionAndPaidGoStillRequired:true,
  privateSourcePathsAndBytesNotLogged:true,
  providerCalls:0,databaseWrites:0,githubChildDispatches:0,
  phase6PaidGo:false
 })};
 Object.defineProperties(result,{
  privateRegistryBytes:{enumerable:false,writable:false,
   value:Buffer.from(registryBytes)},
  privateQueryBytes:{enumerable:false,writable:false,
   value:Buffer.from(sourcePacketReceipt.privateBytes)},
  privateRegistryPath:{enumerable:false,writable:false,
   value:c.signedFrozenPath},
  privateQueryPath:{enumerable:false,writable:false,
   value:sourcePacketReceipt.privateLogicalPath}
 });
 return Object.freeze(result);
}
