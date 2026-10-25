import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";

const source=readFileSync(new URL(
 "../scripts/v39_gate4_next2_one_paid_create_operator_v39.ts",
 import.meta.url),"utf8");
const custody=readFileSync(new URL(
 "../scripts/v39_gate4_next2_paid_trial_custody_v39.ts",
 import.meta.url),"utf8");

describe("Gate4 NEXT2 integration source review",()=>{
 it("requires independent STOP and separate live health monitor",()=>{
  expect(source).toContain("next2StopArmedV39(scope,runnerSha,stopRunId)");
  expect(source).toContain("next2ObserverRunningV39(healthRunId,runnerSha)");
  expect(custody).toContain("gate4ReviewIndependentArmedProofV39");
 });
 it("reserves one-shot AFTER the final prechecks and BEFORE transport",()=>{
  const call=source.indexOf("runGate4OnePositiveOwnerV39(scope,{");
  const reserve=source.indexOf("reserveOneShotImmediatelyBeforeCreate:async()=>{");
  const intent=source.indexOf("await next2PutOnceV39(x.storage,INTENT,{",reserve);
  const transport=source.indexOf("createExactlyOne:()=>{",reserve);
  expect(call).toBeGreaterThan(0);
  expect(reserve).toBeGreaterThan(call);
  expect(intent).toBeGreaterThan(reserve);
  expect(transport).toBeGreaterThan(intent);
  expect(source).toContain("intentWritten=true;");
  expect(source).toContain("neverSecondCreate:true");
  expect(source).toContain("neverRetryCreate:true");
 });
 it("requires independent exact ownership readback and honest verdict",()=>{
  expect(source).toContain("createGate4OwnedBindingPgStoreV39(pool)");
  expect(source).toContain("r.subscription.id");
  expect(source).toContain("scientificProviderDeliveryEstablished:false");
  expect(source).toContain("stopExecutedAndSettled:false");
 });
 it("refreshes account evidence before durable intent",()=>{
  const pre=source.indexOf('stage="FRESH_PROVIDER_BASELINE_AND_ZERO_ACTIVE"');
  const intent=source.indexOf('stage="DURABLE_ONE_SHOT_INTENT"');
  expect(pre).toBeGreaterThan(0);
  expect(intent).toBeGreaterThan(pre);
 });
});
