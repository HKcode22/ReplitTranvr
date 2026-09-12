import { describe, expect, it } from "vitest";
import { RETENTION_MATRIX } from "../server/lib/disruption/retentionMatrix_v39";
import { verifyPrepaidGovernanceEvidence, verifyRetentionExpiryPropagationSource } from "../server/lib/disruption/prepaidSecurityRetention_v39";
import { validateRetentionPolicyInputs } from "../scripts/v39_retention_policy_apply_v39";

function matrixEvidence(): Record<string, any> {
  const out: Record<string, any> = {};
  for (const r of RETENTION_MATRIX) {
    if (r.contentClassification === "raw_api_content") out[r.contentClass] = {
      retentionVerifiedDate:"2026-09-11", retentionSource:"AeroDataBox provider Terms",
      retentionLegalBasis:"AeroDataBox Terms Article 5.5 raw_api_content",
      retentionPeriodDaysOrCondition:"7 days unless provider Plan Terms/Cache-Control explicitly permit longer",
      expiryAction:"HARD_DELETE provider raw content at expiry",
    };
    else if (r.contentClassification === "derived_work") out[r.contentClass] = {
      retentionVerifiedDate:"2026-09-11", retentionSource:"AeroDataBox provider Terms",
      retentionLegalBasis:"AeroDataBox Terms Article 5.6 non-trivial computational transformation; individual provider fields are non-reconstructable",
      retentionPeriodDaysOrCondition:"verified Derived-Work research lifecycle", expiryAction:"project lifecycle deletion",
    };
    else if (r.contentClassification === "external_source_content") out[r.contentClass] = {
      retentionVerifiedDate:"2026-09-11", retentionSource:"external weather source Terms",
      retentionLegalBasis:"source license permits research use", retentionPeriodDaysOrCondition:"per source terms", expiryAction:"delete per source terms",
    };
    else out[r.contentClass] = {
      retentionVerifiedDate:"2026-09-11", retentionSource:"repository lineage review",
      retentionLegalBasis:"non_aerodatabox_metadata; no provider content", retentionPeriodDaysOrCondition:"project metadata lifecycle", expiryAction:"project lifecycle deletion",
    };
  }
  return out;
}
const governance = {
  verifiedDate:"2026-09-11", termsPlanSource:"provider Terms + account plan evidence", termsPlanRetentionVerified:true,
  ownerLegalApprovalRef:"OWNER-P-001", regionReferenceLicenseVerified:true, trafficReferenceLicenseVerified:true,
  trafficReferenceSourceName:"licensed global schedule reference", credentialsOutsideLogsVerified:true,
  secretRedactionVerified:true, sharedSettlementConfigurationVerified:true,
};
const runtime = {
  verifiedDate:"2026-09-11", ownerApprovalRef:"OWNER-P-001",
  rawPolicies:Object.fromEntries(["webhook_raw_delivery","airborne_raw","fids_population"].map((contentClass)=>[contentClass,{
    retentionSeconds:604800, retentionSource:"AeroDataBox provider Terms",
    retentionLegalBasis:"AeroDataBox Terms Article 5.5 raw_api_content", expiryAction:"HARD_DELETE provider raw content at expiry",
  }]))
};
const deployment = { surfaces:{primary:"DEPLOYED",replica:"NOT_DEPLOYED",backup:"NOT_DEPLOYED",object:"NOT_DEPLOYED",log:"NOT_DEPLOYED"} };

describe("prerequisite-P full governance/retention controls", () => {
  it("blocks governance while traffic reference license is unresolved", () => {
    const verdict = verifyPrepaidGovernanceEvidence({...governance,trafficReferenceLicenseVerified:false,trafficReferenceSourceName:"BLOCKED"});
    expect(verdict.pass).toBe(false);
    expect(verdict.failures).toContain("traffic-reference-license-unverified");
  });

  it("detects database-triggered expiry propagation owner", () => {
    expect(verifyRetentionExpiryPropagationSource().pass).toBe(true);
  });

  it("accepts explicit policy seconds only when matrix/governance/deployment evidence agree", () => {
    const result = validateRetentionPolicyInputs({
      matrixEvidenceRaw:JSON.stringify(matrixEvidence()), governanceEvidenceRaw:JSON.stringify(governance),
      runtimePolicyEvidenceRaw:JSON.stringify(runtime), deploymentEvidenceRaw:JSON.stringify(deployment),
    });
    expect(result.policies).toHaveLength(3);
    expect(result.policies.every((p)=>p.retentionSeconds===604800&&/^[a-f0-9]{64}$/.test(p.policyHash))).toBe(true);
  });

  it("never permits the code to infer a missing numeric retention duration", () => {
    const bad:any=structuredClone(runtime); delete bad.rawPolicies.airborne_raw.retentionSeconds;
    expect(()=>validateRetentionPolicyInputs({matrixEvidenceRaw:JSON.stringify(matrixEvidence()),governanceEvidenceRaw:JSON.stringify(governance),runtimePolicyEvidenceRaw:JSON.stringify(bad),deploymentEvidenceRaw:JSON.stringify(deployment)})).toThrow("positive integer");
  });

  it("refuses unknown/deployed non-primary retention surfaces", () => {
    const bad={surfaces:{...deployment.surfaces,backup:"UNKNOWN"}};
    expect(()=>validateRetentionPolicyInputs({matrixEvidenceRaw:JSON.stringify(matrixEvidence()),governanceEvidenceRaw:JSON.stringify(governance),runtimePolicyEvidenceRaw:JSON.stringify(runtime),deploymentEvidenceRaw:JSON.stringify(bad)})).toThrow("backup");
  });
});
