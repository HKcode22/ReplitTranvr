import {describe,it,expect} from "vitest";
import type {ProviderBlobExpiryCandidateV39}
 from "../server/lib/disruption/providerBlobExpiry_v39";
import {
 parseP5BlobOnlyArgs,reviewP5BlobOnlyCandidates,
 admitP5BlobOnlyApply
} from "../scripts/v39_phase5_expired_provider_blobs_only_owner_v39";

const uuid="123e4567-e89b-42d3-a456-426614174000";
const sha="a".repeat(64);
const commit="b".repeat(40);
const expires="2026-10-30T12:00:00.000Z";
const now=Date.parse("2026-11-14T12:00:00.000Z");
function candidate(id=uuid):ProviderBlobExpiryCandidateV39{
 const objectName="v39/provider/raw_provider_content/"+
  id.slice(0,2)+"/"+id+".blob";
 const ref:ProviderBlobExpiryCandidateV39["ref"]={
  blobRefId:id,storageKind:"replit_app_storage" as const,
  contractVersion:"provider-blob-contract-v39@1.0.0" as const,
  objectName,contentClass:"raw_provider_content" as const,
  contentSha256:sha,contentBytes:100,
  persistedAtUtc:"2026-10-23T12:00:00.000Z",
  expiresAtUtc:expires,retentionHours:168
 };
 return {blobRefId:id,objectName,contentClass:ref.contentClass,
  contentSha256:sha,expiresAtUtc:expires,ref};
}
const approved={
 P5_BLOB_ONLY_CLEANUP_APPROVAL:
 "OWNER_APPLY_EXACT_EXPIRED_RAW_PROVIDER_BLOB_ONLY_DELETE_VERIFY_TOMBSTONE",
 P5_BLOB_ONLY_CLEANUP_APPROVED_MAIN_SHA:commit,
 P5_BLOB_ONLY_CLEANUP_EXPECTED_COUNT:"1",
 ADB_AUTO_COLLECT:"0",V39_PROVIDER_BLOB_MODE:"required",
 V39_PHASE6_PROCESS_ARMED:"0"
};
describe("owner-only expired raw provider object remediation never auto-arms",()=>{
 it("defaults to dry-run, refuses unreviewed CLI arguments",()=>{
  expect(parseP5BlobOnlyArgs([]).apply).toBe(false);
  expect(parseP5BlobOnlyArgs(["--dry-run"]).apply).toBe(false);
  expect(parseP5BlobOnlyArgs(["--apply"]).apply).toBe(true);
  expect(()=>parseP5BlobOnlyArgs(["--apply","--dry-run"])).toThrow(/UNKNOWN_OR_COMBINED/);
  expect(()=>parseP5BlobOnlyArgs(["--help"])).toThrow();
 });
 it("counts exactly reviewed raw class, expiry, id and hard TTL, no contents",()=>{
  const review=reviewP5BlobOnlyCandidates([candidate()],now,1);
  expect(review).toMatchObject({candidates:1,exactRawClassOnly:true,
   expectedCountMatched:true,readyToDelete:false,contentsDownloaded:false,
   providerCalls:0});
  expect(()=>reviewP5BlobOnlyCandidates([],now)).toThrow(/EMPTY/);
  expect(()=>reviewP5BlobOnlyCandidates([candidate()],now,65)).toThrow(/DRIFTED/);
  expect(()=>reviewP5BlobOnlyCandidates([candidate(),candidate()],now))
   .toThrow(/DUPLICATE/);
  const c=candidate();c.ref.retentionHours=169;
  expect(()=>reviewP5BlobOnlyCandidates([c],now)).toThrow();
  const s=candidate();s.ref.contentClass="live_fids_cache";
  expect(()=>reviewP5BlobOnlyCandidates([s],now)).toThrow(/UNEXPECTED_CLASS/);
  expect(()=>reviewP5BlobOnlyCandidates([candidate()],Date.parse(expires)+60000))
   .toThrow(/RECENT_NOT_EXPIRED/);
 });
 it("APPLY denied without exact explicit actor approval, reviewed local SHA, expected count and STOP",()=>{
  expect(()=>admitP5BlobOnlyApply({},commit,1)).toThrow(/NO_EXPLICIT/);
  expect(()=>admitP5BlobOnlyApply({...approved,GITHUB_ACTIONS:"true"},commit,1)).toThrow();
  expect(()=>admitP5BlobOnlyApply({...approved,V39_PHASE6_PROCESS_ARMED:"1"},commit,1)).toThrow();
  expect(()=>admitP5BlobOnlyApply({...approved,
   P5_BLOB_ONLY_CLEANUP_APPROVED_MAIN_SHA:sha},commit,1)).toThrow();
  expect(()=>admitP5BlobOnlyApply({...approved,
   P5_BLOB_ONLY_CLEANUP_EXPECTED_COUNT:"65"},commit,1)).toThrow();
  expect(()=>admitP5BlobOnlyApply({...approved,
   V39_PROVIDER_BLOB_MODE:"off"},commit,1)).toThrow();
  expect(admitP5BlobOnlyApply(approved,commit,1))
   .toMatchObject({approvedExpectedCount:1});
 });
});
