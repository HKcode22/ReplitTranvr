import {describe,it,expect} from "vitest";
import {reviewGate4SecondReceiverRlsV39} from
 "../server/lib/disruption/gate4SecondReceiverRlsPlan_v39";
import type {Gate4SecondReceiverRlsInputsV39} from
 "../server/lib/disruption/gate4SecondReceiverRlsPlan_v39";
const x:Gate4SecondReceiverRlsInputsV39={
 oldScopeId:"498dccd7-5da3-4687-a6ea-e0dc03b54398",
 nextScopeId:"11111111-2222-4333-8444-555555555555",
 nextAuthSha256:"a".repeat(64),
 nextPublishedSourceSha:"b".repeat(40),
 nextReceiverRole:"gate4_receiver_2026_next1",
 oldOriginalCount:1,otherOriginalCount:0,
 oldReceiverExists:true,oldReceiverLoginEnabled:true,
 newReceiverAlreadyExists:false,rlsCurrentlyEnabled:false,
 existingPolicies:[]
};
describe("Gate4 second receiver pure RLS preview — no provider",()=>{
 it("generates only scoped new/legacy SELECT+INSERT policies; no old original changes",()=>{
  const r=reviewGate4SecondReceiverRlsV39(x);
  expect(r.status).toBe("REVIEW_ONLY_READY");
  expect(r.statements).toHaveLength(8);
  const sql=r.statements.join("\n");
  for(const part of [x.oldScopeId,x.nextScopeId,x.nextAuthSha256,
   x.nextPublishedSourceSha,"airport_icao='WSSS'",
   "FOR SELECT TO gate4_receiver_20261022",
   "FOR INSERT TO gate4_receiver_20261022",
   "FOR SELECT TO gate4_receiver_2026_next1",
   "FOR INSERT TO gate4_receiver_2026_next1",
   "ENABLE ROW LEVEL SECURITY"])expect(sql).toContain(part);
  for(const bad of ["DROP ","DELETE ","UPDATE ","TRUNCATE ",
   "gate4_alert_owned_binding_v39","FOR ALL TO PUBLIC"])
   expect(sql).not.toContain(bad);
  expect(r.databaseWrites).toBe(0);
  expect(r.providerRequests).toBe(0);
  expect(r.authorizesDDL).toBe(false);
  expect(r.authorizesDeploy).toBe(false);
  expect(r.authorizesProvider).toBe(false);
  expect(r.keepsHistoricPrepaidRoute).toBe(true);
 });
 it("refuses spent scope, wrong SHA/AUTH, unsafe role identifiers",()=>{
  for(const changed of [
   {nextScopeId:x.oldScopeId},
   {oldScopeId:"11111111-2222-4333-8444-555555555555"},
   {nextAuthSha256:"short"},
   {nextPublishedSourceSha:"not-a-sha"},
   {nextReceiverRole:"gate4_receiver_20261022"},
   {nextReceiverRole:"gate4_receiver_2026_next;DROP TABLE x"},
   {nextReceiverRole:"postgres"},
  ]){
   const r=reviewGate4SecondReceiverRlsV39({...x,...changed});
   expect(r.status).toBe("HOLD_INVALID_SCOPE");
   expect(r.statements).toEqual([]);
  }
 });
 it("fails closed on altered historical originals, duplicate new role, RLS state, policies",()=>{
  for(const changed of [
   {oldOriginalCount:0},{oldOriginalCount:2},{otherOriginalCount:1},
   {oldReceiverExists:false},{oldReceiverLoginEnabled:false},
   {newReceiverAlreadyExists:true},{rlsCurrentlyEnabled:true},
   {existingPolicies:["PUBLIC_SELECT"]},
   {existingPolicies:undefined as unknown as string[]},
  ]){
   const r=reviewGate4SecondReceiverRlsV39({...x,...changed});
   expect(r.status).toBe("HOLD_DATABASE_BASELINE");
   expect(r.statements).toEqual([]);
  }
 });
});
