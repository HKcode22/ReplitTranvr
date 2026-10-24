import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
const source=readFileSync(new URL(
 "../scripts/v39_gate4_next1_one_paid_create_operator_v39.ts",import.meta.url),"utf8");
describe("Gate4 new one-time WSSS paid operator — no automatic provider exposure",()=>{
 it("pins NEW receipt, scope, exact published receiver SHA, no previous trial replay",()=>{
  expect(source).toContain('const RECEIVER="97ed05bfcc8b34bd607a80dbcfec6945ffd0d11a"');
  expect(source).toContain('const SCOPE="d6c0fcac-798e-4913-bfd1-a561adb3dd82"');
  expect(source).toContain('writer-gate4_owner_writer_2026_next1.json');
  expect(source).toContain("readGate4ApprovedManifestV39()");
  expect(source).toContain("next-wsss-deployment-values.json");
  expect(source).toContain("gate4-wsss-next1-one-create-intent.json");
  expect(source).not.toContain("writer-20261023.json");
  expect(source).not.toContain("const SCOPE=\"498dccd7-5da3-4687-a6ea-e0dc03b54398\"");
 });
 it("requires independent protected exact STOP BEFORE one CREATE",()=>{
  expect(source).toContain("gate4ReviewIndependentArmedProofV39");
  expect(source).toContain("proveActualExternalStopArmed");
  expect(source).toContain("GATE4_STOP_RUN_ID");
  expect(source).toContain("runGate4OnePositiveOwnerV39");
  expect(source).toContain("createGate4SingleWithRawReceiptV39");
  expect(source).toContain("maxDeliveryRetries:0");
  expect(source).toContain("noSecondCreate:true");
  expect(source).toContain("writeOnce(INTENT");
  expect(source.indexOf("writeOnce(INTENT")).toBeLessThan(source.indexOf("   const result=await runGate4OnePositiveOwnerV39"));
  expect(source).not.toContain("refillBalance(");
 });
 it("requires private positive provider ID, 20 minute bounded trial and no hard-cap fiction",()=>{
  expect(source).toContain("Date.parse(stop)-Date.parse(start)!==20*60_000");
  expect(source).toContain('const GO="EXECUTE_ONE_NEXT1_WSSS_ALERT_20MIN_SOFT5_NO_RETRY"');
  expect(source).toContain("GATE4_SAFETY_APPROVED_PROTECTED_FLOOR");
  expect(source).toContain("Does not claim provider hard billing cap");
  expect(source).toContain("positiveProviderIdCaptured:true");
  expect(source).toContain("exactScopedV0072ReadBack");
  expect(source).toContain("threeBalanceSettlementVerified:false");
  expect(source).toContain("deleteKnownExact");
  expect(source).toContain("GATE4_PAID_OPERATOR_UNCERTAIN_OUTCOME_MANUAL_RESCUE_HOLD");
 });
 it("has an offline check mode and verified public receiver before billable execution",()=>{
  expect(source).toContain('["--check","--execute-one"]');
  expect(source).toContain('if(mode==="--check")');
  expect(source).toContain("await verifyPublishedReceiver()");
  expect(source).toContain("GATE4_OPERATOR_OFFLINE_CONFIGURATION_PASS");
  expect(source).toContain("providerRequests:0,databaseWrites:0,stopArmed:false");
 });
});
