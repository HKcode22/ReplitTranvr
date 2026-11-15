import {describe,it,expect} from "vitest";
import {generateP5ProspectiveStudySeedBundle,verifyP5ProspectiveStudySeedBundle} from "../scripts/v39_phase5_prospective_study_seed_commit_reveal_v39.mjs";
const identity={reviewedCodeSha:"a".repeat(40),dateCandidateBytesSha256:"b".repeat(64),
 workflowRunId:"123456",firstRunDateUtc:"2035-11-22",claimedCommitmentObservedAtUtc:"2035-11-15T00:00:00.000Z"};
describe("prospective seed commitment / actual cryptographic RNG offline",()=>{
 it("produces 36 distinct values, exact commit/reveal, no independent review or paid authority",()=>{
  const {bundle,bundleCommitmentSha256}=generateP5ProspectiveStudySeedBundle(identity);
  const report=verifyP5ProspectiveStudySeedBundle(bundle,{...identity,bundleCommitmentSha256});
  expect(report.distinctSeeds).toBe(36);expect(report.independentSeedWitnessVerified).toBe(false);
  expect(report.phase6PaidGo).toBe(false);expect(report.providerCalls).toBe(0);
  expect(()=>verifyP5ProspectiveStudySeedBundle({...bundle,treatmentSeedHex:"c".repeat(64)},{...identity,bundleCommitmentSha256})).toThrow();
  expect(()=>verifyP5ProspectiveStudySeedBundle(bundle,{...identity,workflowRunId:"123457",bundleCommitmentSha256})).toThrow();
 });
 it("rejects invalid date and commitment too late for proposed service day",()=>{
  expect(()=>generateP5ProspectiveStudySeedBundle({...identity,claimedCommitmentObservedAtUtc:"2035-11-20T00:00:00.000Z"})).toThrow();
  expect(()=>generateP5ProspectiveStudySeedBundle({...identity,firstRunDateUtc:"2035-02-30"})).toThrow();
 });
});
