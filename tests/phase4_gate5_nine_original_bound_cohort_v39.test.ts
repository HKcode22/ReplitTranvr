import {describe,it,expect,vi} from "vitest";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {addCanonicalFidsEnvelopeHashV39}
 from "../server/lib/disruption/fidsEnvelopeCanonical_v39";
import {draftP4Gate5ThreeHorizonGridV39,
 type P4Gate5GridDraftInputV39}
 from "../server/lib/disruption/phase4Gate5FrozenGridDraft_v39";
import {P4_G5_ORIGINAL_FRAME_READONLY_SQL_V39}
 from "../server/lib/disruption/phase4Gate5OriginalRequestFrameReadOnly_v39";
import {P4_FRESH_COHORT_SOURCE_SQL_V39,
 P4_FRESH_COHORT_PRE_SQL_V39,P4_FRESH_COHORT_OUTCOME_SQL_V39}
 from "../server/lib/disruption/phase4Gate5FreshCohortReadOnly_v39";
import {auditP4G5NineOriginalBoundCohortV39,
 auditP4G5OneHorizonOriginalBeforeExpiryV39,
 auditP4G5DiscoveredHorizonOriginalBeforeExpiryV39,
 P4_G5_HORIZON_BOUND_SOURCE_DISCOVERY_SQL_V39,
 reconcileP4G5ThreeHorizonNoncontentReceiptsV39}
 from "../server/lib/disruption/phase4Gate5NineOriginalBoundCohort_v39";

type D=Record<string,any>;
const sha=(x:string)=>createHash("sha256").update(x,"utf8").digest("hex");
const digest=(...x:string[])=>sha(x.join("|"));
const H=["T-24h","T-6h","T-90m"] as const;
const stamp=(x:number)=>new Date(x).toISOString();
const grid=():P4Gate5GridDraftInputV39=>({
 airportIcao:"WSSS",airportIanaTimezone:"Asia/Singapore",
 serviceWindowStartUtc:"2026-11-06T17:00:00.000Z",
 serviceWindowEndUtc:"2026-11-06T18:00:00.000Z",
 assignmentFrozenAtUtc:"2026-11-05T10:00:00.000Z",
 acquisitionGuardMinutes:20,refreshCadenceMinutes:30,
 maxStalenessMinutes:45,githubPrearmLeadMinutes:60,
 apiUnitsPerPhysicalAttempt:2,maxAttemptsPerQuery:1,
 projectRestApiUnitsBudget:18,maxSourceQueries:9
});
function fixture(extendedRights=false){
 const g=grid(),cohortId="WSSS_NINE_SLOTS_CI";
 const bytes=JSON.stringify({cohortId,grid:g},null,2)+"\n";
 const manifestSha=sha(bytes),draft=draftP4Gate5ThreeHorizonGridV39(g);
 const slots:Array<{horizon:typeof H[number];queryIndex:number;populationQueryId:string}>=[];
 const rows=new Map<string,D>();
 const body=Buffer.from('{"departures":[],"arrivals":[]}');
 let serial=1;
 for(const horizon of H){
  const owner=draft.horizonOwners.find(o=>o.horizon===horizon)!;
  const ownerDigest=digest(manifestSha,cohortId,horizon,
   owner.earliestPhysicalStartUtc,owner.latestPhysicalStartUtc,
   String(owner.queryCount));
  const queries=draft.queries.filter(q=>q.horizon===horizon);
  for(let queryIndex=0;queryIndex<3;queryIndex++){
   const q=queries[queryIndex];
   const sourceId="b00bb00b-0000-4000-8000-"+String(serial++).padStart(12,"0");
   const queryDigest=digest(manifestSha,cohortId,horizon,String(queryIndex),
    q.candidateGridCutoffUtc,q.plannedPhysicalStartUtc,
    q.providerQueryFromLocal,q.providerQueryToLocal);
   const reservation=digest(manifestSha,ownerDigest,queryDigest,"1");
   const sourceSha=sha(horizon+"|"+queryIndex+"|source");
   const p=Date.parse(q.plannedPhysicalStartUtc);
   const raw=addCanonicalFidsEnvelopeHashV39({
    departures:[],arrivals:[],
    payloadRepresentation:"RECONSTRUCTED_RESPONSE_JSON_NOT_VERBATIM_HTTP_BYTES",
    originalHttpWireBytesPreserved:false,
    originalDecodedEntityBodyPreserved:true,
    originalDecodedEntityBodyEvidence:{
     schema:"v39.fids-fetch-decoded-source-body.v1",
     representation:"FETCH_DECODED_RESPONSE_BODY_BYTES_NOT_HTTP_WIRE",
     bodyLengthBytes:body.length,bodySha256:sha(body.toString("utf8")),
     bodyBase64:body.toString("base64")
    },
    fidsRequestContract:{
     schema:"v39.fids-request-frame.application-intent.v1",
     endpointKind:"airport_local_fids",airportIcao:"WSSS",
     fromLocal:q.providerQueryFromLocal,toLocal:q.providerQueryToLocal,
     direction:"Departure",withLeg:true,withCancelled:true,
     withCodeshared:true,withCargo:false,withPrivate:false,withLocation:false,
     originalHttpBytesPreserved:false,
     sourceTransportRequestReceiptVerified:false,
     providerApiVersion:"1.15.4.0",fidsProtocolVersion:"v3.9-f.8",
     openapiSha256:"a".repeat(64)
    }
   });
   const row:D={
    manifest_sha256:manifestSha,query_digest:queryDigest,
    population_query_id:sourceId,original_response_sha256:sourceSha,
    expected_reservation_sha256:reservation,
    source_use_expires_at_utc:extendedRights?"2026-11-07T20:00:00.000Z":
     stamp(p+24*3600000),
    bound_at_utc:stamp(p+40000),owner_digest:ownerDigest,
    github_run_id:"12345678",owner_github_run_id:"12345678",
    physical_attempt_number:1,committed_at_utc:stamp(p+5000),
    horizon,query_index:queryIndex,
    planned_dispatch_utc:q.plannedPhysicalStartUtc,
    hard_latest_dispatch_utc:stamp(Date.parse(q.candidateGridCutoffUtc)-15*60000),
    prediction_cutoff_utc:q.candidateGridCutoffUtc,
    source_airport_icao:"WSSS",query_direction:"Departure",
    from_local:q.providerQueryFromLocal,to_local:q.providerQueryToLocal,
    airport_iana_timezone:"Asia/Singapore",
    service_window_start_utc:g.serviceWindowStartUtc,
    service_window_end_utc:g.serviceWindowEndUtc,
    fids_retrieval_utc:stamp(p+10000),available_at:stamp(p+35000),
    response_hash:sourceSha,provider_api_version:"1.15.4.0",
    fids_protocol_version:"v3.9-f.8",openapi_sha256:"a".repeat(64),
    raw_payload:raw
   };
   slots.push({horizon,queryIndex,populationQueryId:sourceId});
   rows.set(queryDigest,row);
  }
 }
 const full={
  reviewedFrozenManifestBytes:bytes,
  independentlyReviewedManifestSha256:manifestSha,
  expectedCohortId:cohortId,originalSourceSlots:slots,
  readAsOfUtc:"2026-11-06T20:00:00.000Z"
 };
 return {full,rows,g};
}
function stub(rows:Map<string,D>,options:{
 extra?:boolean;missing?:string;noBody?:string;
 ledgerMissing?:boolean;ledgerDuplicate?:boolean
}={}){
 const query=vi.fn(async(sql:string,params:unknown[])=>{
  if(sql===P4_G5_HORIZON_BOUND_SOURCE_DISCOVERY_SQL_V39){
   const matches=[...rows.values()]
    .filter(r=>r.manifest_sha256===params[0]&&r.horizon===params[1])
    .map(r=>({horizon:r.horizon,query_index:r.query_index,
      population_query_id:r.population_query_id}));
   if(options.ledgerMissing)matches.pop();
   if(options.ledgerDuplicate)matches.push({...matches[0]});
   return {rows:matches};
  }
  if(sql===P4_G5_ORIGINAL_FRAME_READONLY_SQL_V39){
   const row=rows.get(String(params[1]));
   if(!row||row.population_query_id!==params[2]||
      row.query_digest===options.missing||
      row.query_digest===options.noBody||
      Date.parse(String(params[3]))>=Date.parse(row.source_use_expires_at_utc))
    return {rows:[]};
   return {rows:[row]};
  }
  if(sql===P4_FRESH_COHORT_SOURCE_SQL_V39)return {rows:[{
   ever_retained_query_receipts:options.extra?10:9,
   retained_original_query_receipts:options.extra?10:9,
   source_population_rows:0,invalid_hash_or_clock_rows:0,
   source_consistent_primary_rows:0,
   provisional_distinct_analytic_identities:0,
   tagged_core_canonical_identities:0
  }]};
  if(sql===P4_FRESH_COHORT_PRE_SQL_V39)return {rows:[]};
  if(sql===P4_FRESH_COHORT_OUTCOME_SQL_V39)return {rows:[{
   provisional_resolved_origin_identities:0,
   provisional_matched_core_callback_identities:0,
   provisional_outside_sampled_core_callback_identities:0,
   outcome_rows:0,outcome_status_observed:0,outcome_status_pending:0,
   outcome_status_censored:0,outcome_status_missing:0,
   outcome_status_not_applicable:0
  }]};
  throw Error("TEST_UNEXPECTED_SQL");
 });
 return {query};
}
describe("Phase4 future exact nine source slots and pre-expiry horizon handoff",()=>{
 it("regression: 24-hour T-24h contents expire before full postflight audit",async()=>{
  const {full,rows}=fixture();
  const db=stub(rows);
  const result=await auditP4G5NineOriginalBoundCohortV39(db,full);
  expect(result.status).toBe("HOLD_MISSING_OR_EXPIRED_ORIGINAL_SOURCE_SLOTS");
  expect(result.matchedOriginalSourceSlots).toBe(6);
  expect(result.missingOrExpiredOriginalSourceSlots).toBe(3);
  expect(result.provisionalFlightFunnel).toBeNull();
  expect(result.scientificGate5Passed).toBe(false);
  expect(db.query).toHaveBeenCalledTimes(9);
  expect(db.query.mock.calls.every(([s])=>
   s===P4_G5_ORIGINAL_FRAME_READONLY_SQL_V39)).toBe(true);
 });
 it("discovers three original IDs automatically from V0077, then checks exact source request/body",async()=>{
  const {full,rows}=fixture(),db=stub(rows);
  const {originalSourceSlots,...withoutIds}=full;
  expect(originalSourceSlots).toHaveLength(9);
  const result=await auditP4G5DiscoveredHorizonOriginalBeforeExpiryV39(
   db,{...withoutIds,horizon:"T-24h",
    readAsOfUtc:"2026-11-05T19:00:00.000Z"});
  expect(result.status).toBe("THREE_APPLICATION_SOURCE_FRAMES_MATCHED_NOT_PROVIDER_CERTIFIED");
  expect(result.matchedOriginalSlots).toBe(3);
  expect(result.scientificGate5Passed).toBe(false);
  expect(db.query).toHaveBeenCalledTimes(4);
  expect(db.query.mock.calls[0][0]).toBe(P4_G5_HORIZON_BOUND_SOURCE_DISCOVERY_SQL_V39);
  expect(db.query.mock.calls.slice(1).every(([sql])=>
   sql===P4_G5_ORIGINAL_FRAME_READONLY_SQL_V39)).toBe(true);
  const printed=JSON.stringify(result);
  expect(printed).not.toContain("population_query_id");
  expect(printed).not.toContain("bodyBase64");
  expect(printed).not.toContain(originalSourceSlots[0].populationQueryId);
 });
 it("incomplete or duplicated discovered ledger cannot look like complete source evidence",async()=>{
  const {full,rows}=fixture();
  const {originalSourceSlots,...withoutIds}=full;
  expect(originalSourceSlots).toHaveLength(9);
  const scope={...withoutIds,horizon:"T-24h" as const,
   readAsOfUtc:"2026-11-05T19:00:00.000Z"};
  const incomplete=stub(rows,{ledgerMissing:true});
  const missing=await auditP4G5DiscoveredHorizonOriginalBeforeExpiryV39(
   incomplete,scope);
  expect(missing.status).toBe("HOLD_INCOMPLETE_V0077_HORIZON_ORIGINAL_LINKS");
  if(missing.status!=="HOLD_INCOMPLETE_V0077_HORIZON_ORIGINAL_LINKS")
   throw Error("TEST_EXPECTED_INCOMPLETE_LEDGER");
  expect(missing.discoveredOriginalSourceLinks).toBe(2);
  expect(missing.matchedOriginalSlots).toBeNull();
  expect(incomplete.query).toHaveBeenCalledTimes(1);
  const tooMany=stub(rows,{ledgerDuplicate:true});
  await expect(auditP4G5DiscoveredHorizonOriginalBeforeExpiryV39(
   tooMany,scope)).rejects.toThrow("HOLD");
  expect(tooMany.query).toHaveBeenCalledTimes(1);
  const digest=[...rows.values()][0]!.query_digest as string;
  const absentBody=stub(rows,{missing:digest});
  const r=await auditP4G5DiscoveredHorizonOriginalBeforeExpiryV39(
   absentBody,scope);
  expect(r.status).toBe("HOLD_MISSING_OR_EXPIRED_ONE_HORIZON_ORIGINAL");
  expect(r.matchedOriginalSlots).toBe(2);
 });
 it("three pre-expiry read-only horizon proofs can be reconciled without retaining FIDS flight bytes",async()=>{
  const {full,rows}=fixture(),db=stub(rows);
  const clocks={
   "T-24h":"2026-11-05T19:00:00.000Z",
   "T-6h":"2026-11-06T13:00:00.000Z",
   "T-90m":"2026-11-06T17:00:00.000Z"
  } as const;
  const reports=[];
  for(const horizon of H){
   const report=await auditP4G5OneHorizonOriginalBeforeExpiryV39(
    db,{...full,horizon,
     originalSourceSlots:full.originalSourceSlots.filter(s=>s.horizon===horizon),
     readAsOfUtc:clocks[horizon]});
   expect(report.status).toBe("THREE_APPLICATION_SOURCE_FRAMES_MATCHED_NOT_PROVIDER_CERTIFIED");
   expect(report.matchedOriginalSlots).toBe(3);
   expect(report.providerCalls).toBe(0);
   expect(report.databaseWrites).toBe(0);
   expect(report.independentGitHubJobAttestationVerified).toBe(false);
   reports.push(report);
  }
  const handoff=reconcileP4G5ThreeHorizonNoncontentReceiptsV39(
   reports,full.independentlyReviewedManifestSha256);
  expect(handoff.totalOriginalSlotsApplicationMatched).toBe(9);
  expect(handoff.independentlyVerifiedGitHubJobLogs).toBe(false);
  expect(handoff.genuinelyPersistedPreSnapshotsCount).toBeNull();
  expect(handoff.scientificGate5Passed).toBe(false);
  expect(db.query).toHaveBeenCalledTimes(9);
 });
 it("OPTIONAL extended lawful source lifetime still cannot certify Gate5 from 9 exact slots alone",async()=>{
  const {full,rows}=fixture(true),db=stub(rows);
  const r=await auditP4G5NineOriginalBoundCohortV39(db,full);
  expect(r.status).toBe(
   "ALL_NINE_ORIGINAL_REQUEST_FRAMES_MATCHED_PROVISIONAL_FUNNEL_ONLY");
  expect(r.matchedOriginalSourceSlots).toBe(9);
  expect(r.historicalQueryReceiptsMeasured).toBe(9);
  expect(r.retainedOriginalQueryReceiptsMeasured).toBe(9);
  expect(r.provisionalFlightFunnel).not.toBeNull();
  expect(r.provisionalFlightFunnel?.sourceInventoryIsScopedByAirportAndWindowOnly)
   .toBe(true);
  expect(r.scientificGate5Passed).toBe(false);
  expect(r.legalRetentionIndependentlyVerified).toBe(false);
  expect(r.independentGithubManifestPinVerified).toBe(false);
  expect(db.query).toHaveBeenCalledTimes(12);
 });
 it("even all nine originals cannot disguise extra source receipts in same window",async()=>{
  const {full,rows}=fixture(true),db=stub(rows,{extra:true});
  const r=await auditP4G5NineOriginalBoundCohortV39(db,full);
  expect(r.status).toBe("HOLD_UNBOUND_OR_EXTRA_AIRPORT_WINDOW_SOURCE_RECEIPTS");
  expect(r.historicalQueryReceiptsMeasured).toBe(10);
  expect(r.provisionalFlightFunnel).toBeNull();
 });
 it("duplicate/misindexed/unfrozen slots rejected prior to DB reads",async()=>{
  const {full,rows}=fixture(true),db=stub(rows);
  for(const modify of [
   (x:D)=>x.originalSourceSlots.pop(),
   (x:D)=>x.originalSourceSlots[1].populationQueryId=
    x.originalSourceSlots[0].populationQueryId,
   (x:D)=>x.originalSourceSlots[1].queryIndex=0,
   (x:D)=>x.originalSourceSlots[1].horizon="T-90m",
   (x:D)=>x.independentlyReviewedManifestSha256="f".repeat(64),
   (x:D)=>x.expectedCohortId="OTHER_COHORT"
  ]){
   const bad=JSON.parse(JSON.stringify(full));modify(bad);
   await expect(auditP4G5NineOriginalBoundCohortV39(db,bad)).rejects.toThrow();
  }
  expect(db.query).not.toHaveBeenCalled();
 });
 it("wrong original request options or source identity fail closed",async()=>{
  const {full,rows}=fixture(true);
  const first=[...rows.values()][0];
  first.raw_payload.fidsRequestContract.withLeg=false;
  const db=stub(rows);
  await expect(auditP4G5NineOriginalBoundCohortV39(db,full))
   .rejects.toThrow("HOLD");
  expect(db.query).toHaveBeenCalledTimes(1);
 });
 it("one horizon refuses extra/repeated IDs and detects expired original",async()=>{
  const {full,rows}=fixture();
  const horizon="T-24h" as const,filtered=full.originalSourceSlots
   .filter(s=>s.horizon===horizon);
  const db=stub(rows),readAsOfUtc="2026-11-05T19:00:00.000Z";
  const source={...full,horizon,originalSourceSlots:filtered,readAsOfUtc};
  const bad={...source,originalSourceSlots:[filtered[0],filtered[0],filtered[2]]};
  await expect(auditP4G5OneHorizonOriginalBeforeExpiryV39(db,bad))
   .rejects.toThrow("SINGLE_HORIZON_SLOT_IDENTITY");
  const late=await auditP4G5OneHorizonOriginalBeforeExpiryV39(db,{
   ...source,readAsOfUtc:"2026-11-06T20:00:00.000Z"
  });
  expect(late.status).toBe("HOLD_MISSING_OR_EXPIRED_ONE_HORIZON_ORIGINAL");
  expect(late.matchedOriginalSlots).toBe(0);
  expect(late.scientificGate5Passed).toBe(false);
 });
 it("syntactic reports do not impersonate independent GitHub proof or license",async()=>{
  const {full,rows}=fixture(),db=stub(rows);
  const clocks=["2026-11-05T19:00:00.000Z",
    "2026-11-06T13:00:00.000Z","2026-11-06T17:00:00.000Z"];
  const reps=[];
  for(let j=0;j<3;j++)reps.push(
   await auditP4G5OneHorizonOriginalBeforeExpiryV39(db,{
    ...full,horizon:H[j],
    originalSourceSlots:full.originalSourceSlots.filter(s=>s.horizon===H[j]),
    readAsOfUtc:clocks[j]
   })
  );
  for(const alter of [
   (a:D[])=>a.pop(),
   (a:D[])=>a[1].horizon=a[0].horizon,
   (a:D[])=>a[0].matchedOriginalSlots=2,
   (a:D[])=>a[2].sourceStatusBySlot[1].status="MISSING_OR_EXPIRED",
   (a:D[])=>a[1].manifestSha256="f".repeat(64)
  ]){
   const bad=JSON.parse(JSON.stringify(reps));alter(bad);
   expect(()=>reconcileP4G5ThreeHorizonNoncontentReceiptsV39(
    bad,full.independentlyReviewedManifestSha256)).toThrow("HOLD");
  }
  const src=readFileSync(
   "server/lib/disruption/phase4Gate5NineOriginalBoundCohort_v39.ts","utf8");
  for(const forbidden of ["fetch(","process.env","INSERT INTO","UPDATE clean",
   "DELETE FROM","COMMIT","AERODATABOX_API_KEY"])
   expect(src).not.toContain(forbidden);
  const hold=JSON.parse(readFileSync(
   "data-collection/phase4/GATE5_NEXT_FROZEN_COHORT_READONLY_AUDIT_HOLD.json",
   "utf8"));
  expect(hold.mode).toBe("HOLD_NO_REVIEWED_NEXT_COHORT");
  expect(hold.providerCallsAuthorized).toBe(false);
  expect(hold.databaseWritesAuthorized).toBe(false);
 });
});
