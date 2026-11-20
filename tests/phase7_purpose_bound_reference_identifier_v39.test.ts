import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {admitPurposeBoundReferenceIdentifier,PHASE7_REFERENCE_BOUNDARY} from "../server/lib/disruption/phase7PurposeBoundReferenceIdentifier_v39";
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
});
