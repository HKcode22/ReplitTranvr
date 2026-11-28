import {describe,it,expect,vi} from "vitest";
import {readPhase7PostScopedGroup,P7_POST_SCOPED_GROUP_SQL,finalizeReviewedPhase7PostGroup,preflightPhase7PostScopedReader,preflightPhase7ConditionalT6ScopedReader} from "../server/lib/disruption/phase7PostScopedGroup_v39";
import {createHash,randomUUID} from "node:crypto";
import {buildPhase7DerivedReleasePacket} from "../server/lib/disruption/phase7DerivedReleaseWriter_v39";
import {serializePhase7DerivedReleasePacket} from "../server/lib/disruption/phase6DerivedTrainingReleasePacket_v39";
import {hashPhase7DurableCandidate} from "../server/lib/disruption/phase7DurableDerivedBundleCandidate_v39";
import type {Phase7DerivedReleaseContract} from "../server/lib/disruption/phase6DerivedTrainingReleaseContract_v39";
const h=(s:string)=>createHash("sha256").update(s).digest("hex");
const shared={version:"v01",featureDictionarySha256:h("dictionary"),termsReviewSha256:h("terms"),derivedWorkReviewSha256:h("derived")};
const contract:Phase7DerivedReleaseContract={schema:"v39.phase6.phase7-derived-release-contract.v2",...shared,sourceToReleaseMappingExpiryHours:24,researchExpiryUtc:"2027-12-31T00:00:00.000Z",cohortBucketCount:31,features:[{name:"context_bin",bucketCount:3,fieldClass:"approved_derived",transformEvidenceSha256:h("feature"),nonReconstructable:true}],labels:[{name:"delay_bin",bucketCount:4,fieldClass:"approved_derived",transformEvidenceSha256:h("label"),nonReconstructable:true}],allowedHorizons:["T-24h","T-6h","T-90m"]};
const profile={} as any,role="p7_scoped_group_reader";
const anchor={manifestSha256:h("manifest"),rightsSha256:h("rights"),queryDigestSha256:h("query"),frameSha256:h("frame"),snapshotId:"1",runDayIndex:1,airportIcao:"WSSS",horizon:"T-6h",ambiguousIdentity:false,sourceExpiresAtUtc:"2027-02-02T20:00:00.000Z"} as const;
function fake(extra:Record<string,unknown>={},payloadChange=false){
 const packet=buildPhase7DerivedReleasePacket(contract,[{horizon:"T-6h",cohortBucket:0,split:"train",featureBuckets:{context_bin:1},labelBuckets:{delay_bin:null},missingness:{context_bin:false,delay_bin:true},qualityFlags:0,censoring:"not_due"}]);
 const bytes=Buffer.from(serializePhase7DerivedReleasePacket(contract,packet)),row={group_id:randomUUID(),contract_sha256:hashPhase7DurableCandidate(contract),profile_sha256:hashPhase7DurableCandidate(profile),packet_sha256:h(bytes.toString()),packet_bytes:payloadChange?Buffer.from("tampered"):bytes};
 const actor={actor:role,login:role,db:"neondb",ro:"on",version:160000,replica:false,at:new Date("2027-02-02T12:00:00Z"),rolsuper:false,rolcreaterole:false,rolcreatedb:false,rolbypassrls:false,rolreplication:false,member:false,can_use:true,can_scope:true,can_create:false,can_direct:false,...extra};
 const query=vi.fn(async(sql:string,..._args:any[])=>sql.startsWith("SELECT current_user")?{rows:[actor]}:sql===P7_POST_SCOPED_GROUP_SQL?{rowCount:1,rows:[row]}:sql.startsWith("SELECT clock_timestamp")?{rows:[{at:actor.at}]}:{rows:[]});
 const release=vi.fn(),pool={connect:vi.fn().mockResolvedValue({query,release})};
 return {query,release,pool};
}
describe("private POST group scoped SQL adapter",()=>{
 it("reads only with restricted read-only actor and exact scope",async()=>{
  const f=fake(),a=anchor as any;const v=await readPhase7PostScopedGroup(f.pool,role,contract,profile,a);
  expect(v.fragments).toHaveLength(1);
  expect(f.query).toHaveBeenCalledWith(P7_POST_SCOPED_GROUP_SQL,[a.manifestSha256,"1",a.rightsSha256,a.queryDigestSha256,1,"WSSS",a.frameSha256]);
  expect(f.release).toHaveBeenCalledOnce();
 });
 it("rejects broad privileges, expiry, ambiguous source and tampering",async()=>{
  for(const f of [fake({can_direct:true}),fake({at:new Date("2027-02-03")}),fake({},true)]){
   await expect(readPhase7PostScopedGroup(f.pool,role,contract,profile,anchor as any)).rejects.toThrow("HOLD_P7_SCOPED_POST_GROUP");
   expect(f.release).toHaveBeenCalledOnce();
  }
  const f=fake();await expect(readPhase7PostScopedGroup(f.pool,role,contract,profile,{...anchor,ambiguousIdentity:true} as any)).rejects.toThrow("BAD_ANCHOR");
  expect(f.pool.connect).not.toHaveBeenCalled();
 });
 it("refuses independent outcome bound to another flight before any write",async()=>{
  const f=fake(),a={...anchor,flightInstanceId:"leg:test-one",selectedNativeTUtc:"2027-02-02T10:00:00Z"} as any;
  const v=await readPhase7PostScopedGroup(f.pool,role,contract,profile,a);
  const review=vi.fn();
  await expect(finalizeReviewedPhase7PostGroup({anchor:a,fragments:v.fragments,scope:{evidence:{"T-6h":{flightInstanceId:"leg:test-two"}}} as any,contract,profile,writer:f.pool as any,reader:f.pool as any,writerRole:"p7_writer",readerRole:role,releasedAtUtc:v.observedAtUtc,independentlyApproveExactBundle:review})).rejects.toThrow("REVIEW_NOT_BOUND_TO_LIVE_ANCHOR");
  expect(review).not.toHaveBeenCalled();
 });
});

it("preflight uses the same restricted actor and does not read private rows or write",async()=>{
 const f=fake();await preflightPhase7PostScopedReader(f.pool,role,contract);
 expect(f.query).not.toHaveBeenCalledWith(P7_POST_SCOPED_GROUP_SQL,expect.anything());
 expect(f.query.mock.calls.some(([sql])=>/INSERT|UPDATE|DELETE/.test(sql)&&!sql.startsWith("SELECT current_user"))).toBe(false);
 const denied=fake({can_scope:false});await expect(preflightPhase7PostScopedReader(denied.pool,role,contract)).rejects.toThrow("READER_SCOPE_OR_CLOCK");expect(denied.release).toHaveBeenCalledOnce();
});

it("conditional preflight checks the V0115 signature, not the existing native grant, without reading a group",async()=>{
 const f=fake();
 await expect(preflightPhase7ConditionalT6ScopedReader(f.pool,role,contract)).resolves.toBe("2027-02-02T12:00:00.000Z");
 expect(f.query.mock.calls.find(([sql])=>sql.startsWith("SELECT current_user"))?.[1]).toEqual(["phase7_private.read_bound_conditional_t6_group_v39(text,bigint,text,text,integer,text,text,text)"]);
 expect(f.query).not.toHaveBeenCalledWith(P7_POST_SCOPED_GROUP_SQL,expect.anything());
 const denied=fake({can_scope:false});
 await expect(preflightPhase7ConditionalT6ScopedReader(denied.pool,role,contract)).rejects.toThrow("READER_SCOPE_OR_CLOCK");
 expect(denied.release).toHaveBeenCalledOnce();
});
