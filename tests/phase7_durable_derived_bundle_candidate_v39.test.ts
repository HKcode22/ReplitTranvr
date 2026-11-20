import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {Pool} from "pg";
import {describe,it,expect} from "vitest";
import {buildPhase7PairedDerivedCandidate} from "../server/lib/disruption/phase7PairedDerivedReleaseCandidate_v39";
import {validateDurableDerivedBundle,hashPhase7DurableCandidate,writeReviewedPhase7DurableBundle,reconcileReviewedPhase7DurableBundle,type Phase7DurableDerivedBundle,type Phase7DurableBundleApproval} from "../server/lib/disruption/phase7DurableDerivedBundleCandidate_v39";
import type {Phase7DerivedReleaseContract,Phase6ReleaseHorizon} from "../server/lib/disruption/phase6DerivedTrainingReleaseContract_v39";
import type {Phase7ApprovedDerivedInput} from "../server/lib/disruption/phase7DerivedReleaseWriter_v39";
const sha=(s:string)=>createHash("sha256").update(s).digest("hex");
const contract:Phase7DerivedReleaseContract={schema:"v39.phase6.phase7-derived-release-contract.v2",version:"v01",featureDictionarySha256:sha("dict"),termsReviewSha256:sha("terms"),derivedWorkReviewSha256:sha("derived"),sourceToReleaseMappingExpiryHours:24,researchExpiryUtc:"2099-12-31T00:00:00.000Z",cohortBucketCount:4,features:[{name:"congestion_bin",bucketCount:3,fieldClass:"approved_derived",transformEvidenceSha256:sha("feature"),nonReconstructable:true}],labels:[{name:"delay_bin",bucketCount:4,fieldClass:"approved_derived",transformEvidenceSha256:sha("label"),nonReconstructable:true}],allowedHorizons:["T-24h","T-6h","T-90m"]};
const row=(horizon:Phase6ReleaseHorizon):Phase7ApprovedDerivedInput=>({horizon,cohortBucket:1,split:"train",featureBuckets:{congestion_bin:1},labelBuckets:{delay_bin:2},missingness:{congestion_bin:false,delay_bin:false},qualityFlags:0,censoring:"observed"});
function fixture(){
 const paired=buildPhase7PairedDerivedCandidate(contract,[[row("T-24h"),row("T-6h"),row("T-90m")]],sha("synthetic association review"));
 // Synthetic test decision only; no operational approval is manufactured.
 const bundle:Phase7DurableDerivedBundle={schema:"v39.phase7.durable-derived-bundle.v1",packet:paired.packet,paired:{...paired.association,schema:"v39.phase7.paired-derived-association-reviewed.v1",approvedForUse:true},continuous:{schema:"v39.phase7.continuous-gate-out-target-packet.v1",packetId:"3f2504e0-4f89-41d3-9a0c-0305e82c3303",derivedPacketSha256:paired.association.packetSha256,targetName:"gate_out_delay_minutes",unit:"minutes",primaryHorizon:"T-6h",rows:[{releaseRowId:paired.packet.rows[1].releaseRowId,value:-3.75,censoring:"observed"}]}};
 const approval:Phase7DurableBundleApproval={schema:"v39.phase7.durable-derived-bundle-independent-review.v1",contractSha256:hashPhase7DurableCandidate(contract),bundleSha256:hashPhase7DurableCandidate(bundle),sourceParityReviewSha256:sha("synthetic parity"),reconstructionReviewSha256:sha("synthetic reconstruction"),fieldReviewSha256:sha("synthetic fields"),associationReviewSha256:paired.association.reviewEvidenceSha256,continuousTargetReviewSha256:sha("synthetic target"),approvedForDurableStorage:true,sourceMappingPersisted:false,minTargetMinutes:-60,maxTargetMinutes:1440};
 return {bundle,approval};
}
const now=new Date("2026-11-20T04:00:00Z");
describe("durable bundle exact scientific boundary (synthetic only)",()=>{
 it("includes continuous negative minutes, exactly paired rows and no source mapping",()=>{
  const {bundle,approval}=fixture(),v=validateDurableDerivedBundle(contract,bundle,approval,now);
  expect(v.rowCount).toBe(3);expect(v.bytes).toContain("-3.75");expect(v.bundleSha256).toBe(approval.bundleSha256);
 });
 it("rejects missing pair or target denominator, raw/ephemeral fields and approval drift",()=>{
  const {bundle,approval}=fixture();
  for(const bad of [{...bundle,continuous:{...bundle.continuous,rows:[]}},{...bundle,paired:{...bundle.paired,groups:[]}},{...bundle,ephemeralReceipts:[]},{...bundle,continuous:{...bundle.continuous,rows:[{...bundle.continuous.rows[0],sourceTimestamp:"2026-11-20"}]}}]){
   const x=bad as Phase7DurableDerivedBundle;
   expect(()=>validateDurableDerivedBundle(contract,x,{...approval,bundleSha256:hashPhase7DurableCandidate(x)},now)).toThrow();
  }
  expect(()=>validateDurableDerivedBundle(contract,bundle,{...approval,bundleSha256:sha("wrong")},now)).toThrow(/exact-reviewed-bundle/);
  expect(()=>validateDurableDerivedBundle(contract,bundle,approval,new Date("2100-01-01T00:00:00Z"))).toThrow(/research-expired/);
 });
});
const db=process.env.P7_DURABLE_DISPOSABLE_URL;
describe.skipIf(db!=="postgresql://postgres:postgres@127.0.0.1:5432/neondb?sslmode=disable"||process.env.GITHUB_ACTIONS!=="true")("real disposable PostgreSQL16 durable bundle",()=>{
 it("atomic insert with restricted actors, independently verified bytes and no overwrite/replay",async()=>{
  const admin=new Pool({connectionString:db,max:1});
  const actors={writerRole:"phase7_test_writer",readerRole:"phase7_test_reader"};
  const writer=new Pool({connectionString:"postgresql://phase7_test_writer:p7test@127.0.0.1:5432/neondb?sslmode=disable",max:1});
  const reader=new Pool({connectionString:"postgresql://phase7_test_reader:p7test@127.0.0.1:5432/neondb?sslmode=disable",max:1});
  try{
   await admin.query(readFileSync("data-collection/phase5/review-tools/p7_derived_release_storage_candidate_NOT_FOR_INSTALL.sql","utf8"));
   await admin.query("CREATE ROLE phase7_test_writer LOGIN PASSWORD 'p7test' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOINHERIT; CREATE ROLE phase7_test_reader LOGIN PASSWORD 'p7test' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOINHERIT; GRANT USAGE ON SCHEMA phase7_private TO phase7_test_writer,phase7_test_reader; GRANT INSERT ON phase7_private.derived_release_bundle_v39 TO phase7_test_writer; GRANT SELECT ON phase7_private.derived_release_bundle_v39 TO phase7_test_reader;");
   const {bundle,approval}=fixture();
   const receipt=await writeReviewedPhase7DurableBundle(writer,reader,contract,bundle,approval,actors,now);
   expect(receipt.status).toBe("DERIVED_BUNDLE_DURABLE_INDEPENDENT_READBACK");
   expect((await reconcileReviewedPhase7DurableBundle(reader,contract,bundle,approval,actors,now)).databaseWrites).toBe(0);
   await expect(writeReviewedPhase7DurableBundle(writer,reader,contract,bundle,approval,actors,now)).rejects.toThrow();
   await expect(writer.query("SELECT count(*) FROM phase7_private.derived_release_bundle_v39")).rejects.toThrow();
   await expect(reader.query("DELETE FROM phase7_private.derived_release_bundle_v39")).rejects.toThrow();
   expect((await reader.query("SELECT count(*)::int n FROM phase7_private.derived_release_bundle_v39")).rows[0].n).toBe(1);
  }finally{await Promise.all([writer.end(),reader.end(),admin.end()])}
 },30000);
});
