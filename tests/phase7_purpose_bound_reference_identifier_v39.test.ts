import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {admitPurposeBoundReferenceIdentifier,PHASE7_REFERENCE_BOUNDARY} from "../server/lib/disruption/phase7PurposeBoundReferenceIdentifier_v39";
import {parseP7ReferenceLinkPolicy} from "../server/lib/disruption/phase7ExactPreLaneEvidenceAuthority_v39";
import type {Phase7CanonicalFieldDisposition} from "../server/lib/disruption/phase7CanonicalFieldParity_v39";
const sha=(x:string)=>createHash("sha256").update(x).digest("hex");
const scope={schema:"v39.phase7.reference-identifier-scope.v1",itemScopeId:"3f2504e0-4f89-41d3-9a0c-0305e82c3303",kind:"airport_icao",purpose:"identify",value:"WSSS",termsReviewSha256:sha("terms"),purposeReviewSha256:sha("item scope"),independentScopeApproved:true};
describe("purpose-bound reference identifier boundary",()=>{
 it("can retain eligible codes for a single independently reviewed item rather than discard all identities",()=>{
  expect(admitPurposeBoundReferenceIdentifier(scope).value).toBe("WSSS");
  expect(admitPurposeBoundReferenceIdentifier({...scope,kind:"flight_designator",purpose:"link",value:"SQ123"}).value).toBe("SQ123");
  expect(PHASE7_REFERENCE_BOUNDARY.perFlightTrainingLinkApproved).toBe(false);
 });
 it("rejects records, schedules, source values, bulk export, unapproved scope and replay identifiers for other purposes",()=>{
  for(const x of [[scope],{...scope,releaseRowId:scope.itemScopeId},{...scope,scheduledGateOutUtc:"2026-11-22T00:00:00.000Z"},{...scope,purpose:"export"},{...scope,independentScopeApproved:false},{...scope,value:"WSSS-2026-11-22"},{...scope,kind:"api_retrieval_identifier",purpose:"link",value:"abc"}])expect(()=>admitPurposeBoundReferenceIdentifier(x)).toThrow(/PHASE7_REFERENCE_SCOPE_REJECTED/);
 });

 it("binds IATA versus ICAO operating carrier to an explicit reviewed reference policy; no format inference or training permission",()=>{
  const manifest=sha("manifest"),rights=sha("rights"),pre=sha("pre policy"),terms=sha("terms");
  const dispositions:Phase7CanonicalFieldDisposition[]=[
   {field:"origin_icao",disposition:"PURPOSE_BOUND_REFERENCE_LANE",outputField:null,reviewSha256:sha("origin reviewed")},
   {field:"destination_icao",disposition:"PURPOSE_BOUND_REFERENCE_LANE",outputField:null,reviewSha256:sha("destination reviewed")},
   {field:"operating_carrier",disposition:"PURPOSE_BOUND_REFERENCE_LANE",outputField:null,reviewSha256:sha("carrier reviewed")}
  ];
  const make=(carrierKind:string)=>{
   const review={
    schema:"v39.phase7.pre-reference-link-purpose-policy.v1",
    manifestSha256:manifest,rightsSha256:rights,prePolicySha256:pre,termsReviewSha256:terms,
    independentPurposeReviewSha256:sha("purpose reviewer"),validFromUtc:"2026-11-20T00:00:00.000Z",
    validUntilUtc:"2026-12-30T00:00:00.000Z",scope:"SINGLE_ORIGINAL_MEMBER_LINK_ONLY",
    allowSubstituteCompilation:false,allowPerFlightTrainingLink:false,
    fields:[
     {field:"origin_icao",kind:"airport_icao",purpose:"link",fieldReviewSha256:dispositions[0].reviewSha256},
     {field:"destination_icao",kind:"airport_icao",purpose:"link",fieldReviewSha256:dispositions[1].reviewSha256},
     {field:"operating_carrier",kind:carrierKind,purpose:"link",fieldReviewSha256:dispositions[2].reviewSha256}
    ]
   };
   const b=Buffer.from(JSON.stringify(review));
   const env={V39_P5_MANIFEST_SHA256:manifest,V39_P5_RIGHTS_SHA256:rights,
    P6_PHASE7_PRE_PRESERVATION_POLICY_SHA256:pre,
    P6_PHASE7_PRE_REFERENCE_LINK_POLICY_BASE64:b.toString("base64"),
    P6_PHASE7_PRE_REFERENCE_LINK_POLICY_SHA256:createHash("sha256").update(b).digest("hex")};
   return parseP7ReferenceLinkPolicy(env,terms,dispositions);
  };
  expect(make("airline_iata").fields[2].kind).toBe("airline_iata");
  expect(make("airline_icao").fields[2].kind).toBe("airline_icao");
  expect(()=>make("airport_iata")).toThrow("REFERENCE_PURPOSE_FIELD_DENOMINATOR");
  expect(()=>make("flight_designator")).toThrow("REFERENCE_PURPOSE_FIELD_DENOMINATOR");
  const iata={...scope,kind:"airline_iata",purpose:"link",value:"SQ"};
  const icao={...scope,kind:"airline_icao",purpose:"link",value:"SIA"};
  expect(admitPurposeBoundReferenceIdentifier(iata).value).toBe("SQ");
  expect(admitPurposeBoundReferenceIdentifier(icao).value).toBe("SIA");
  expect(()=>admitPurposeBoundReferenceIdentifier({...iata,kind:"airline_icao"})).toThrow("PHASE7_REFERENCE_SCOPE_REJECTED");
  expect(()=>admitPurposeBoundReferenceIdentifier({...icao,kind:"airline_iata"})).toThrow("PHASE7_REFERENCE_SCOPE_REJECTED");
  expect(PHASE7_REFERENCE_BOUNDARY.perFlightTrainingLinkApproved).toBe(false);
 });

});
