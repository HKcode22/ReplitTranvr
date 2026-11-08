/**
 * Phase5 prospective four-owner-HUB freeze input boundary, OFFLINE ONLY.
 * Replays the owner-supplied production READ ONLY evidence packet, not a
 * substitute for a live DB/source/provider/license/crossover budget audit.
 *
 * Critical separation:
 * - verified four eligible HUB frame rows => input to methods review only
 * - five historical Stage2-confirmed anchors => NEVER retrospectively passed
 * - four owner-selected sites => NOT an automatic paid Phase6 release
 * - pair MID/REGIONAL airport membership is NOT proved by this four-HUB scan
 */
import {createHash} from "node:crypto";
const SHA=/^[0-9a-f]{64}$/;
const ICAO=/^[A-Z]{4}$/;
export const OWNER_FOUR_HUBS=Object.freeze(["WSSS","OMAA","SKBO","YSSY"]);
export const SIX_REGIONS=Object.freeze([
 "Asia-Pacific","Europe","Gulf/Africa","North America","Oceania","South America"
]);
export const EXPECTED_B0062_FOUR_HUB_FRAME=Object.freeze({
 version:"frame_02ec6e78ba1fe3c2",
 frameHash:"02ec6e78ba1fe3c2923d5a32cc7bd61ed6016a5ed4cfa13ce000a9f52db37c94",
 trafficHash:"8dd10dd0b5e0e9f493ad823a37f0852b6882fef49f45ee7965af557408264424",
 regionHash:"4073cc05e958bf98b6501e418198305f80e7d17892318f6773d9e0aac9d3a764",
 tierHash:"18cd871421220e72cd96044ae790fc95bdae1d69b9f9e43ac35566fd786eb7dc",
 observedUtc:"2026-11-08T14:43:24.211Z"
});
const EXPECTED=Object.freeze({
 WSSS:Object.freeze({region:"Asia-Pacific",country:"SG",timezone:"Asia/Singapore",
  adsb:true,traffic:172463,out:156,in:147,undirected:162,
  carriers:6.421619050015873,intl:0.9996520992908624}),
 OMAA:Object.freeze({region:"Gulf/Africa",country:"AE",timezone:"Asia/Dubai",
  adsb:false,traffic:73914,out:128,in:121,undirected:131,
  carriers:2.301348700219086,intl:0.9887842627918932}),
 SKBO:Object.freeze({region:"South America",country:"CO",timezone:"America/Bogota",
  adsb:true,traffic:91600,out:94,in:53,undirected:95,
  carriers:4.37275360257945,intl:0.42748908296943233}),
 YSSY:Object.freeze({region:"Oceania",country:"AU",timezone:"Australia/Sydney",
  adsb:true,traffic:141036,out:90,in:88,undirected:92,
  carriers:6.271787234431572,intl:0.2854093990186903})
});
const refusal=code=>{throw Error("REFUSED_PHASE5_FOUR_HUB_FRAME_BINDING_"+code);};
const eq=(a,b)=>a===b;
function exactSet(array,expected,code){
 if(!Array.isArray(array)||array.length!==expected.length||
    !array.every(x=>typeof x==="string")||
    new Set(array).size!==array.length||
    expected.some(x=>!array.includes(x)))refusal(code);
}
function verifyOldLimitFlags(p){
 for(const key of ["historicFiveAnchorGate2Pass","oldYssyP25DeliveryGapClosedScientifically",
  "stage2CapacityAndScoreCertified","sourceRightsCertified",
  "providerWindowLengthVerified","activeCalendarSigned",
  "phase5ScientificFreeze","phase6PaidGo"])
  if(p[key]!==false)refusal("SCOPE_OR_FALSE_SCIENTIFIC_PASS_"+key);
 if(p.ownerFourAnchorPlanResearchDraftOnly!==true)refusal("FOUR_OWNER_METHODS_NOT_DRAFT");
 for(const k of ["providerCalls","dbWrites","webhookPosts"])
  if(p[k]!==0)refusal("NONREADONLY_HISTORICAL_EVIDENCE_"+k);
}
export function verifyFourHubB0062OwnerReadback(p){
 if(!p||typeof p!=="object"||Array.isArray(p))refusal("MISSING_PACKET");
 if(p.schema!=="phase5.owner-four-anchor-exact-active-frame-readonly.v1"||
    p.status!=="FOUR_OWNER_ANCHORS_FRAME_ELIGIBLE_ONLY_NOT_FREEZE")
  refusal("UNVERIFIED_OR_CHANGED_READBACK_STATUS");
 const v=EXPECTED_B0062_FOUR_HUB_FRAME;
 if(p.frameVersion!==v.version||p.frameHash!==v.frameHash||
    p.trafficReferenceHash!==v.trafficHash||
    p.regionMappingHash!==v.regionHash||p.tierHash!==v.tierHash||
    p.observedUtc!==v.observedUtc||
    ![v.frameHash,v.trafficHash,v.regionHash,v.tierHash].every(x=>SHA.test(x)))
  refusal("FROZEN_B0062_PROVENANCE_MISMATCH");
 exactSet(p.ownerChosenProspectiveAnchorIcaos,OWNER_FOUR_HUBS,"CHANGED_FOUR_OWNER_HUB_POOL");
 if(p.observedRows!==4||!Array.isArray(p.sites)||p.sites.length!==4||
    !Array.isArray(p.findings)||p.findings.length!==0)
  refusal("INCOMPLETE_OR_UNRESOLVED_HUB_ROW_SET");
 verifyOldLimitFlags(p);
 const seen=new Set();
 for(const x of p.sites){
  if(!x||typeof x!=="object"||!OWNER_FOUR_HUBS.includes(x.icao)||
     seen.has(x.icao))refusal("UNEXPECTED_OR_DUPLICATE_HUB");
  seen.add(x.icao);
  const want=EXPECTED[x.icao];
  if(x.found!==true||x.frameHubDualEligible!==true||
     x.tier!=="HUB"||x.feedSchedule!==true||x.feedLive!==true||
     x.feedAdsb!==want.adsb||
     x.preEligible!==true||x.postEligible!==true||
     !Array.isArray(x.problems)||x.problems.length!==0||
     x.region!==want.region||x.countryIso2!==want.country||
     x.timezone!==want.timezone)
    refusal("SITE_STRUCTURE_NOT_ACTUAL_B0062_"+x.icao);
  const m=x.metrics;
  if(!m||m.trafficMetricName!=="observed_commercial_movements"||
     m.trafficMetricUnits!=="resolved observed departures per fixed 365-day reference period"||
     !eq(m.trafficMetricValue,want.traffic)||
     !eq(m.outDegree,want.out)||!eq(m.inDegree,want.in)||
     !eq(m.undirectedDegree,want.undirected)||
     !eq(m.effectiveCarriers,want.carriers)||
     !eq(m.intlShare,want.intl))
    refusal("EXOGENOUS_REFERENCE_METADATA_DRIFT_"+x.icao);
 }
 const siteFacts=OWNER_FOUR_HUBS.map(icao=>{
  const s=p.sites.find(x=>x.icao===icao);
  return {icao,region:s.region,country:s.countryIso2,
   traffic:s.metrics.trafficMetricValue,degree:s.metrics.undirectedDegree,
   carriers:s.metrics.effectiveCarriers,intlShare:s.metrics.intlShare};
 });
 return {
  status:"FOUR_HUB_ACTUAL_FRAME_SNAPSHOT_VERIFIED_FOR_METHODS_REVIEW_ONLY",
  evidenceSha256:createHash("sha256").update(JSON.stringify({
    provenance:v,sites:siteFacts
  })).digest("hex"),
  frameHash:v.frameHash,
  anchors:OWNER_FOUR_HUBS.map(icao=>({
   icao,region:EXPECTED[icao].region
  })),
  scope:"purposive_four_hub_region_stratified_prospective_research",
  fourStructuralHubRowsVerified:true,
  originalFiveAnchorStage2Passed:false,
  liveProviderFidsResponseCertified:false,
  pairAirportIdsCertified:false,
  sourceRightsAndRetentionCertified:false,
  future31DayCalendarSigned:false,
  phase5ScientificFreezePassed:false,
  phase6PaidGo:false,
  providerCalls:0,databaseWrites:0
 };
}
/**
 * Bind a proposed four-anchor design to ONLY the real four HUB regions and
 * the six eligible MID/REGION cells verified in the preceding B0062 census.
 * Pair airport *identities* still require their own live frame readback.
 */
export function auditProspectiveFourHubCalendarInput(p,design){
 const evidence=verifyFourHubB0062OwnerReadback(p);
 if(!design||typeof design!=="object")refusal("MISSING_CALENDAR_INPUT");
 const anchors=design.anchorPool;
 if(!Array.isArray(anchors)||anchors.length!==4||
    anchors.some(x=>!x||!ICAO.test(x.icao)||typeof x.region!=="string"))
  refusal("INVALID_FOUR_HUB_CALENDAR_ANCHOR_POOL");
 exactSet(anchors.map(x=>x.icao),OWNER_FOUR_HUBS,"WRONG_FOUR_HUB_CALENDAR_ANCHORS");
 for(const a of anchors)
  if(a.region!==EXPECTED[a.icao].region)
   refusal("ANCHOR_REGION_MISMATCH_"+a.icao);
 for(const slot of ["MID_A","MID_B","REGIONAL"]){
  const regions=design.eligibleRegionsBySlot?.[slot];
  exactSet(regions,SIX_REGIONS,"UNVERIFIED_"+slot+"_REGION_UNIVERSE");
 }
 const pairs=design.pairAirportSets;
 if(!pairs||typeof pairs!=="object"||Object.keys(pairs).length!==5)
  refusal("INCOMPLETE_FIVE_CROSSOVER_PAIRS");
 for(let i=1;i<=5;i++){
  const k="pair-"+i,q=pairs[k];
  if(!q||typeof q!=="object"||
     ["HUB","MID_A","MID_B","REGIONAL"].some(slot=>
      !q[slot]||!ICAO.test(q[slot].icao)||typeof q[slot].region!=="string"))
    refusal("UNVERIFIED_FOUR_SLOT_PAIR_"+i);
  if(!OWNER_FOUR_HUBS.includes(q.HUB.icao)||
     q.HUB.region!==EXPECTED[q.HUB.icao].region)
    refusal("PAIR_HUB_NOT_ONE_OF_FOUR_"+i);
  const actual=[q.HUB.icao,q.MID_A.icao,q.MID_B.icao,q.REGIONAL.icao];
  if(new Set(actual).size!==4)refusal("PAIR_REUSES_AIRPORT_IN_SAME_BATCH_"+i);
  for(const slot of ["MID_A","MID_B","REGIONAL"])
   if(!SIX_REGIONS.includes(q[slot].region))
    refusal("PAIR_USES_UNVERIFIED_MAPPED_REGION_"+i+"_"+slot);
 }
 return {
  status:"FOUR_HUB_CALENDAR_INPUT_FRAME_BOUND_REVIEW_ONLY",
  frameEvidenceSha256:evidence.evidenceSha256,
  actualFourHubFrameEligible:true,
  prospectiveFivePairsProposed:true,
  exactMidRegionalAirportFrameMembershipVerified:false,
  exactFutureDatesSourceRefreshAndSevenRestBudgetsVerified:false,
  originalFiveAnchorGate2Passed:false,
  phase5ScientificFreezePassed:false,
  phase6PaidGo:false,
  providerCalls:0,databaseWrites:0
 };
}
