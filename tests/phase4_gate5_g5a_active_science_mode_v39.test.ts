import {describe,expect,it} from "vitest";
import {
 assertP4G5ActiveTransitionInputV39,
 type P4G5ActiveTransitionInputV39
} from "../server/lib/disruption/phase4Gate5OwnerActiveTransition_v39";
import {prepareP4G5PhysicalOwnerV39}
 from "../server/lib/disruption/phase4Gate5PhysicalOwnerDispatchGuard_v39";
import {createHash} from "node:crypto";

const sha=(s:string)=>s.repeat(64);
const grid={
 airportIcao:"WSSS",airportIanaTimezone:"Asia/Singapore",
 serviceWindowStartUtc:"2026-11-05T02:00:00.000Z",
 serviceWindowEndUtc:"2026-11-05T03:00:00.000Z",
 assignmentFrozenAtUtc:"2026-11-03T13:00:00.000Z",
 acquisitionGuardMinutes:30,refreshCadenceMinutes:30,maxStalenessMinutes:45,
 githubPrearmLeadMinutes:60,apiUnitsPerPhysicalAttempt:2,
 maxAttemptsPerQuery:1,projectRestApiUnitsBudget:24,maxSourceQueries:9
};
const manifest=JSON.stringify({cohortId:"WSSS_G5A_20261105_0200Z",grid},null,2)+"\n";
const owner=prepareP4G5PhysicalOwnerV39({
 cohortId:"WSSS_G5A_20261105_0200Z",frozenManifestBytes:manifest,
 reviewedManifestSha256:createHash("sha256").update(manifest).digest("hex"),
 grid,horizon:"T-24h",actualOwnerProcessStartedAtUtc:"2026-11-03T23:40:00.000Z"
});
const base=():P4G5ActiveTransitionInputV39=>({
 owner,githubRunId:"123456789012",
 reviewedRunAuthorizationSha256:sha("1"),
 providerNativeSelectedTEvidenceSha256:sha("2"),
 perRecordActualOnlyRunwayEvidenceSha256:sha("3"),
 operatingPhysicalLegEvidenceSha256:sha("4"),
 lawfulContentRetentionEvidenceSha256:sha("5"),
 independentlyAuthenticatedGitHubRunnerEvidenceSha256:sha("6")
});
describe("prospective G5A active-owner scientific protocol selection",()=>{
 it("original runway mode still demands positive independent runway reference",()=>{
  expect(()=>assertP4G5ActiveTransitionInputV39(base())).not.toThrow();
  expect(()=>assertP4G5ActiveTransitionInputV39({
   ...base(),perRecordActualOnlyRunwayEvidenceSha256:null
  })).toThrow("P4_G5_ACTIVE_UNVERIFIED_MANIFEST_OWNER_OR_PROOF_REFERENCE");
 });
 it("schedule-revision mode requires explicitly null runway field and a real protocol reference",()=>{
  expect(()=>assertP4G5ActiveTransitionInputV39({
   ...base(),scientificMode:"G5A_REPORTED_SCHEDULE_REVISION",
   perRecordActualOnlyRunwayEvidenceSha256:null,
   g5aProtocolEvidenceSha256:sha("7")
  })).not.toThrow();
  expect(()=>assertP4G5ActiveTransitionInputV39({
   ...base(),scientificMode:"G5A_REPORTED_SCHEDULE_REVISION",
   g5aProtocolEvidenceSha256:sha("7")
  })).toThrow("P4_G5_ACTIVE_UNVERIFIED_MANIFEST_OWNER_OR_PROOF_REFERENCE");
  expect(()=>assertP4G5ActiveTransitionInputV39({
   ...base(),scientificMode:"G5A_REPORTED_SCHEDULE_REVISION",
   perRecordActualOnlyRunwayEvidenceSha256:null,
   g5aProtocolEvidenceSha256:null
  })).toThrow("P4_G5_ACTIVE_UNVERIFIED_MANIFEST_OWNER_OR_PROOF_REFERENCE");
 });
 it("original mode cannot smuggle a G5A protocol reference",()=>{
  expect(()=>assertP4G5ActiveTransitionInputV39({
   ...base(),g5aProtocolEvidenceSha256:sha("7")
  })).toThrow("P4_G5_ACTIVE_UNVERIFIED_MANIFEST_OWNER_OR_PROOF_REFERENCE");
 });
});
