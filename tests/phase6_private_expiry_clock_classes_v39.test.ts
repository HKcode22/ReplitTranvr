import {describe,it,expect} from "vitest";
import {privateExpiryDeadlineEvidence,P6_PRIVATE_METADATA_PROFILE as profile} from "../scripts/v39_phase6_private_epoch_expiry_runtime_v39.mjs";
const counts={duePackets:0,dueIndexes:0,expiredHeads:0,foreignDuePackets:0,foreignDueIndexes:0,claims:0};
describe("private custody expiry clock classes",()=>{
 it("only two V0106 metadata kinds may expire logically without claiming physical hard deadline breach",()=>{
  expect(privateExpiryDeadlineEvidence({...counts,duePackets:3,dueOperationalMetadataPackets:3},profile)).toEqual({dueOperationalMetadataPackets:3,deadlineDueObservedAtInitialRead:false});
 });
 it("keeps every source candidate, index, and foreign manifest as hard due",()=>{
  for(const c of [{duePackets:3,dueOperationalMetadataPackets:2},{dueIndexes:1},{foreignDuePackets:1},{foreignDueIndexes:1}])
   expect(privateExpiryDeadlineEvidence({...counts,dueOperationalMetadataPackets:0,...c},profile).deadlineDueObservedAtInitialRead).toBe(true);
 });
 it("does not permit unknown classification, negative or excessive counts",()=>{
  for(const x of [undefined,-1,2,0.5])
   expect(()=>privateExpiryDeadlineEvidence({...counts,duePackets:1,dueOperationalMetadataPackets:x},profile)).toThrow();
  expect(()=>privateExpiryDeadlineEvidence(counts,"UNKNOWN")).toThrow();
 });
 it("legacy V0105 remains fail closed and cannot opt into metadata exception by extra field",()=>{
  expect(privateExpiryDeadlineEvidence({...counts,duePackets:1,dueOperationalMetadataPackets:1}).deadlineDueObservedAtInitialRead).toBe(true);
 });
});
