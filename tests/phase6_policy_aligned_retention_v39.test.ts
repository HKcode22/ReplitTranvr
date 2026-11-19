import {describe,it,expect} from "vitest";
import {
 verifyPhase6PolicyContract,
 PHASE6_POLICY_CONTRACT_NEVER_AUTHORIZES_GO,
 type Phase6PolicyContract,
} from "../server/lib/disruption/phase6PolicyAlignedRetention_v39";

const sha="a".repeat(64);
const field=(fieldId:string):any=>({
  fieldId,table:"clean.flight_snapshots",source:"AERODATABOX_FIDS",
  scientificRole:"Amendment E model input",retentionClass:"provider_derived_candidate",
  sourceAccessMaximumHours:24,longTermDisposition:"review_required",
  reconstructionRisk:"provider_record_reconstructable",
  transformation:"as-of source-bound feature selection",
  externalReviewSha256:null,expiryAction:"hard_delete_or_clear",
});
const contract=():Phase6PolicyContract=>({
  schema:"v39.phase6.policy-aligned-field-retention.v1",
  predecessorMainSha:"88a065458537aa5e1a0055dec82b7bf81b0c00eb",
  predecessorManifestSha256:"b".repeat(64),
  predecessorConfigSha256:"c".repeat(64),
  predecessorCalendarSha256:"d".repeat(64),
  fields:[
    field("origin_icao"),field("destination_icao"),field("operating_carrier"),
    field("scheduled_arrival_utc"),field("provider_revised_departure_utc"),
    field("reported_pre_departure_status"),
    {fieldId:"origin_metar_visibility_m",table:"clean.flight_snapshots",
      source:"NOAA_METAR",scientificRole:"as-of weather",retentionClass:"independent_source_content",
      sourceAccessMaximumHours:168,longTermDisposition:"review_required",
      reconstructionRisk:"unknown",transformation:"as-of weather feature",
      externalReviewSha256:null,expiryAction:"independent_source_lifecycle"},
    {fieldId:"missingness_flags",table:"clean.flight_snapshots",
      source:"PROJECT_METADATA",scientificRole:"feature missingness",
      retentionClass:"project_metadata",sourceAccessMaximumHours:168,
      longTermDisposition:"approved_after_external_review",reconstructionRisk:"none",
      transformation:"project-generated missingness metadata",
      externalReviewSha256:sha,expiryAction:"project_lifecycle"},
  ],
});

describe("policy-aligned successor field retention",()=>{
  it("keeps required route/carrier/timing fields in the scientific inventory",()=>{
    const verdict=verifyPhase6PolicyContract(contract());
    expect(verdict.pass).toBe(true);
    expect(verdict.pendingReviewFieldIds).toContain("origin_icao");
    expect(verdict.pendingReviewFieldIds).toContain("scheduled_arrival_utc");
  });
  it("does not silently approve long-term provider content",()=>{
    const c=contract();
    c.fields=[{...field("origin_icao"),longTermDisposition:"approved_after_external_review"}];
    const verdict=verifyPhase6PolicyContract(c);
    expect(verdict.pass).toBe(false);
    expect(verdict.failures).toContain("approved-field-missing-external-review:origin_icao");
    expect(verdict.failures).toContain("approved-field-not-reviewed-nonreconstructable:origin_icao");
  });
  it("rejects an ADB field beyond the current 24-hour source boundary",()=>{
    const c=contract();
    c.fields=[{...field("destination_icao"),sourceAccessMaximumHours:25}];
    expect(verifyPhase6PolicyContract(c).failures).toContain("adb-fids-access-over-24h:destination_icao");
  });
  it("never creates paid authorization",()=>{
    expect(PHASE6_POLICY_CONTRACT_NEVER_AUTHORIZES_GO).toEqual({
      sourceRightsApproved:false,authorizationEnabled:false,phase6PaidGo:false,
    });
  });
});
