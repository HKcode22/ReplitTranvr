import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {
 NEXT3_SRC_V39,NEXT3_SCOPE_V39,NEXT3_INTENT_V39,NEXT3_POSITIVE_V39
} from "../scripts/v39_gate4_next3_paid_trial_custody_v39";

const paid=readFileSync(new URL(
 "../scripts/v39_gate4_next3_one_paid_create_operator_v39.ts",import.meta.url),"utf8");
const custody=readFileSync(new URL(
 "../scripts/v39_gate4_next3_paid_trial_custody_v39.ts",import.meta.url),"utf8");

describe("Gate4 NEXT3 exact-scope ONE paid operator — NO launch on import",()=>{
 it("loads sealed NEXT3 writer and independent Ed25519 signer, excludes spent NEXT2",()=>{
  expect(NEXT3_SRC_V39).toBe("5878b90eed04b2edfe2b226735ff0f02d9be25f3");
  expect(NEXT3_SCOPE_V39).toBe("15bec7e1-8efc-49e7-9ee8-63521a76d71c");
  expect(NEXT3_INTENT_V39).toContain("internal/gate4/next3/");
  expect(NEXT3_POSITIVE_V39).toContain("internal/gate4/next3/");
  expect(custody).toContain("openNext3OwnerCustodyV39");
  expect(custody).toContain("gate4Next3OpenSealedValuesV39");
  expect(custody).toContain("NEXT3_OWNER_BLOB_V39");
  expect(custody).toContain("custody.signerPrivatePkcs8Base64");
  expect(custody).toContain("custody.signerPublicSpkiBase64");
  expect(custody).not.toContain("openWriterOnlyV39");
  expect(custody).not.toContain("openGate4Next2SignerV39");
  expect(custody).not.toContain("087dc948c29d004f88eca141e1fc8e83c2844e3f");
 });
 it("binds protected signer, scoped auth, runner and timed soft-floor budget",()=>{
  expect(custody).toContain('v.GATE4_SAFETY_APPROVED_SIGNER_SPKI_SHA256!==');
  expect(custody).toContain('v.GATE4_SAFETY_APPROVED_SOURCE!==NEXT3_SRC_V39');
  expect(custody).toContain('v.GATE4_SAFETY_APPROVED_SCOPE!==NEXT3_SCOPE_V39');
  expect(custody).toContain("gate4ReviewIndependentArmedProofV39");
  expect(custody).toContain("workflow_dispatch");
  expect(custody).toContain("phase3-gate4-next3-callback-health-sixplus6.yml");
  expect(custody).toContain("Run NEXT3 live health");
  expect(custody).toContain("scope.softCreditTarget!==5");
  expect(custody).toContain("scope.protectedCreditFloor!==1900");
 });
 it("requires actual independent STOP ARMED and live running health job",()=>{
  expect(paid).toContain("next3StopArmedV39(scope,runnerSha,stopRunId)");
  expect(paid).toContain("next3ObserverRunningV39(healthRunId,runnerSha)");
  expect(paid).toContain('GATE4_NEXT3_PAID_GO!==GO');
  expect(paid).toContain("runGate4OnePositiveOwnerV39");
  expect(paid).toContain("proveActualExternalStopArmed");
  expect(paid).toContain("strictBalance");
  expect(paid).toContain("strictInventory");
  expect(paid).toContain("maxDeliveryRetries:0");
  expect(custody).not.toContain("Date.now()+45*60000");
  expect(custody).toContain("Date.now()+2*60000");
  expect(paid).toContain("Date.parse(x.writerExpiresUtc)<Date.parse(scope.stopUtc)+5*60000");
  expect(paid).toContain('hold("WRITER_EXPIRY_BEFORE_STOP_SETTLEMENT_BUFFER")');
  expect(paid).toContain("if(!await hostedReady())");

  expect(paid).not.toContain("refillBalance(");
 });
 it("reserves durable intent BEFORE provider CREATE and cannot repeat",()=>{
  const intent=paid.indexOf("await next3PutOnceV39(x.storage,INTENT");
  const create=paid.indexOf('return createGate4SingleWithRawReceiptV39("WSSS"');
  expect(intent).toBeGreaterThan(0);
  expect(create).toBeGreaterThan(intent);
  expect(paid).toContain("neverSecondCreate:true");
  expect(paid).toContain("if(await x.storage.exists(INTENT)||await x.storage.exists(POSITIVE))");
  expect(paid).toContain("createAttempted=true");
  expect(paid).toContain("neverRetryCreate:true");
  expect(paid).toContain("providerHttpPostAcceptanceUnconfirmed:createAttempted");
  expect(paid).toContain("providerIdUnknownUnlessSealed:createAttempted");
  expect(paid).toContain("deleteKnownExact:");
  expect(paid).toContain("persistPositiveIdPrivately:");
 });
 it("diagnoses expired sealed writer READ ONLY without weakening paid admission",()=>{
  expect(custody).toContain("allowExpiredWriterForReadOnly?:boolean");
  expect(custody).toContain("!options?.allowExpiredWriterForReadOnly&&");
  expect(paid).toContain('allowExpiredWriterForReadOnly:mode==="--check"');
  const start=paid.indexOf('if(mode==="--check"){');
  const stop=paid.indexOf('stage="FUTURE_WINDOW_AND_OBSERVER"');
  expect(start).toBeGreaterThan(0);
  expect(stop).toBeGreaterThan(start);
  const noProvider=paid.slice(start,stop);
  expect(noProvider).toContain("GATE4_NEXT3_READONLY_STATUS_NO_PROVIDER");
  expect(noProvider).toContain("sealedWriterExpiryReached:now>=expiry");
  expect(noProvider).toContain("sealedWriterCoversStopBuffer:usable");
  expect(noProvider).toContain("actualDatabaseRoleLoginVerified:false");
  expect(noProvider).toContain("readyForPaidCreate:false");
  expect(noProvider).toContain("providerCalls:0,databaseWrites:0");
  expect(noProvider).not.toContain("getBalanceEvidenceStrict(");
  expect(noProvider).not.toContain("listSubscriptionsStrict(");
  expect(noProvider).not.toContain("new pg.Pool(");
  expect(noProvider).not.toContain("createGate4SingleWithRawReceiptV39(");
  const paidOnly=paid.slice(stop);
  expect(paidOnly).toContain('hold("WRITER_EXPIRY_BEFORE_STOP_SETTLEMENT_BUFFER")');
  expect(paidOnly).toContain("next3StopArmedV39(scope,runnerSha,stopRunId)");
  expect(paidOnly).toContain("createAttempted=true");
 });
 it("ignores known synthetic V0071 as science and allows ONLY zero owned V0072",()=>{
  expect(paid).toContain("clean.gate4_alert_owned_binding_v39");
  expect(paid).toContain('"gate4_owner_writer_2026_next3"');
  expect(paid).toContain("w.bindings!==0");
  expect(paid).not.toContain("gate4_alert_prebind_original_v39");
  expect(paid).toContain("scientificProviderDeliveryEstablished:false");
  expect(paid).toContain("stopExecutedAndSettled:false");
  expect(paid).toContain('["--check","--execute-one"]');
 });
});
