import {describe,it,expect} from "vitest";
import {selectP6ProspectiveConditionalSourceScope as select} from "../server/lib/disruption/phase6ReviewedPreparedSourceShardSigner_v39";
const p={validFromUtc:"2026-11-25T00:00:00.000Z",validUntilUtc:"2026-12-30T00:00:00.000Z",conditionalServicePolicy:{schema:"v39.phase5.conditional-source-signing-policy.v1" as const,protocolSha256:"a".repeat(64),effectiveUtc:"2026-11-26T00:00:00.000Z",firstEligibleRunDayIndex:4,reviewedConditionalServiceScope:true as const}};
const plan={day:{runDayIndex:4,scheduledStartUtc:new Date("2026-11-28T08:00:00.000Z")},acquisition:{runDayIndex:4,scheduledRequestUtc:"2026-11-27T07:45:00.000Z"}};
describe("existing SOURCE signer conditional scope",()=>{
 it("preserves existing native-only template and earlier days",()=>{
  expect(select({validFromUtc:p.validFromUtc,validUntilUtc:p.validUntilUtc},plan,"2026-11-26T10:00:00.000Z")).toBeUndefined();
  expect(select(p,{day:{...plan.day,runDayIndex:3},acquisition:{...plan.acquisition,runDayIndex:3}},"2026-11-26T10:00:00.000Z")).toBeUndefined();
 });
 it("binds future day and actual reviewed clock without changing acquisition",()=>{
  const x=select(p,plan,"2026-11-26T10:00:00.000Z");
  expect(x).toEqual({protocolSha256:"a".repeat(64),cohortStartUtc:"2026-11-28T08:00:00.000Z",effectiveUtc:p.conditionalServicePolicy.effectiveUtc,reviewedConditionalServiceScope:true});
  expect(select(p,{...plan,day:{...plan.day,scheduledStartUtc:"2026-11-28T08:00:00.000Z"}},"2026-11-26T11:00:00.000Z")).toEqual(x);
 });
 it("rejects retrospective signing, mixed day and unsupported scope",()=>{
  expect(()=>select(p,plan,plan.acquisition.scheduledRequestUtc)).toThrow(/NOT_PROSPECTIVE/);
  expect(()=>select(p,plan,"2026-11-25T10:00:00.000Z")).toThrow(/NOT_PROSPECTIVE/);
  expect(()=>select(p,{...plan,acquisition:{...plan.acquisition,runDayIndex:5}},"2026-11-26T10:00:00.000Z")).toThrow(/CLOCK_OR_DAY/);
  expect(()=>select({...p,conditionalServicePolicy:{...p.conditionalServicePolicy,protocolSha256:"x"}},plan,"2026-11-26T10:00:00.000Z")).toThrow(/POLICY_SHAPE/);
 });
});
