import {describe,it,expect} from "vitest";
import {reviewGate4SecondScopeRlsV39} from
 "../server/lib/disruption/gate4SecondScopeRlsPlan_v39";
import type {Gate4SecondScopeRlsSpecV39} from
 "../server/lib/disruption/gate4SecondScopeRlsPlan_v39";

const scope:Gate4SecondScopeRlsSpecV39={
 previousScopeId:"498dccd7-5da3-4687-a6ea-e0dc03b54398",
 nextScopeId:"33333333-4444-4555-8666-777777777777",
 nextAuthorizationSha256:"a".repeat(64),
 nextReceiverSourceSha:"b".repeat(40),
 airportIcao:"WSSS",
 nextWriterRole:"gate4_owner_writer_2026_next1",
 legacyOwnedBindings:1,
 otherOwnedBindings:0,
 previousOriginalRows:1,
 previousWriterExists:true,
 nextWriterRoleExists:false,
 rlsEnabled:true,
 existingPolicyNames:[
   "gate4_safety_select_v39",
   "gate4_writer_insert_20261023",
   "gate4_writer_select_20261023"
 ]
};

describe("Gate4 next writer permission blueprint — PURE, not authorization",()=>{
 it("accepts observed prior record/policy state and drafts ONLY new role grants/policies",()=>{
   const r=reviewGate4SecondScopeRlsV39(scope);
   expect(r.status).toBe("REVIEW_ONLY_READY");
   expect(r.preservesPreviousBinding).toBe(true);
   expect(r.statements).toHaveLength(5);
   expect(r.statements.join("\n")).toContain(
     "FOR INSERT TO gate4_owner_writer_2026_next1 WITH CHECK (");
   expect(r.statements.join("\n")).toContain(
     "FOR SELECT TO gate4_owner_writer_2026_next1 USING (");
   expect(r.statements.join("\n")).toContain(scope.nextScopeId);
   expect(r.statements.join("\n")).toContain(scope.nextAuthorizationSha256);
   expect(r.statements.join("\n")).toContain(scope.nextReceiverSourceSha);
   for(const unsafe of ["DROP ","DELETE ","UPDATE ","TRUNCATE ",
     "ALTER ROLE gate4_owner_writer_20261023","CREATE SUBSCRIPTION",
     "FOR ALL TO PUBLIC","POLICY gate4_safety_select_v39 ON"]){
     expect(r.statements.join("\n")).not.toContain(unsafe);
   }
   expect(r.authorizesProductionDdl).toBe(false);
   expect(r.authorizesProviderCreate).toBe(false);
   expect(r.authorizesRepublish).toBe(false);
   expect(r.providerRequests).toBe(0);
   expect(r.databaseWrites).toBe(0);
 });
 it("does not reuse old paid scope, allow malformed auth/source or arbitary SQL identifiers",()=>{
   for(const candidate of [
     {...scope,nextScopeId:scope.previousScopeId},
     {...scope,nextAuthorizationSha256:"wrong"},
     {...scope,nextReceiverSourceSha:"bad"},
     {...scope,nextWriterRole:"gate4_owner_writer_20261023"},
     {...scope,nextWriterRole:"gate4_owner_writer_2026_new;DROP TABLE clean.x"},
     {...scope,nextWriterRole:"postgres"},
     {...scope,airportIcao:"KLAX" as "WSSS"}
   ]){
     const r=reviewGate4SecondScopeRlsV39(candidate);
     expect(r.status).toBe("HOLD_INVALID_NEXT_SCOPE");
     expect(r.statements).toEqual([]);
   }
 });
 it("rejects unknown extra owner rows and any change to historical policy names",()=>{
   for(const candidate of [
     {...scope,legacyOwnedBindings:0},
     {...scope,otherOwnedBindings:1},
     {...scope,previousOriginalRows:0},
     {...scope,previousWriterExists:false},
     {...scope,nextWriterRoleExists:true},
     {...scope,rlsEnabled:false},
     {...scope,existingPolicyNames:["gate4_safety_select_v39"]},
     {...scope,existingPolicyNames:[
       ...scope.existingPolicyNames,"public_bypass"
     ]}
   ]){
     const r=reviewGate4SecondScopeRlsV39(candidate);
     expect(r.status).toBe("HOLD_EXISTING_DB_STATE");
     expect(r.statements).toEqual([]);
   }
 });
 it("does not let ordering differences in existing observed policy names invent a mismatch",()=>{
   const p=reviewGate4SecondScopeRlsV39({
     ...scope,existingPolicyNames:[...scope.existingPolicyNames].reverse()
   });
   expect(p.status).toBe("REVIEW_ONLY_READY");
 });
});
