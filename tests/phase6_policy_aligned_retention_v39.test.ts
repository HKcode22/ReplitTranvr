import {readFileSync} from "node:fs";
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
      longTermDisposition:"approved_after_external_review",reconstructionRisk:"reviewed_nonreconstructable",
      transformation:"feature engineering: project-generated missingness metadata",
      externalReviewSha256:sha,expiryAction:"project_lifecycle"},
  ],
});


const inventory = JSON.parse(readFileSync(new URL(
  "../data-collection/phase5/policy/phase6-policy-aligned-field-dispositions.v1.json",
  import.meta.url,
), "utf8")) as {
  predecessor: {
    mainSha: string;
    manifestSha256: string;
    configSha256: string;
    calendarSha256: string;
  };
  scientificScopeUnchanged: {
    calendarDays: number;
    plannedQueries: number;
    reservedRestUnits: number;
    horizons: string[];
    primaryCandidate: string;
    pairedUpdate: string;
    comparator: string;
    prePostSeparation: boolean;
    protectedChronologicalEvaluation: boolean;
  };
  paidGo: boolean;
  authorizationEnabled: boolean;
  fields: Array<Record<string, unknown>>;
};

const inventoryContract = (): Phase6PolicyContract => ({
  schema: "v39.phase6.policy-aligned-field-retention.v1",
  predecessorMainSha: inventory.predecessor.mainSha,
  predecessorManifestSha256: inventory.predecessor.manifestSha256,
  predecessorConfigSha256: inventory.predecessor.configSha256,
  predecessorCalendarSha256: inventory.predecessor.calendarSha256,
  fields: inventory.fields as Phase6PolicyContract["fields"],
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
  it("validates the checked-in field inventory against the executable contract",()=>{
    const verdict=verifyPhase6PolicyContract(inventoryContract());
    expect(verdict.pass).toBe(true);
    expect(inventory.predecessor.mainSha).toBe("88a065458537aa5e1a0055dec82b7bf81b0c00eb");
    expect(inventory.scientificScopeUnchanged).toMatchObject({
      calendarDays:31,plannedQueries:6144,reservedRestUnits:37388,
      horizons:["T-24h","T-6h","T-90m"],
      primaryCandidate:"T-6h_actual_gate_out_delay_minutes_conditional_on_operated_leg",
      pairedUpdate:"T-90m",comparator:"T-24h",
      prePostSeparation:true,protectedChronologicalEvaluation:true,
    });
    const ids=inventory.fields.map(field=>field.fieldId);
    for(const required of [
      "origin_icao","destination_icao","operating_carrier",
      "scheduled_arrival_utc","provider_revised_departure_utc",
      "reported_pre_departure_status","actual_gate_out","actual_wheels_off",
      "actual_wheels_on","actual_gate_in","cancellation_or_diversion_state",
    ]) expect(ids).toContain(required);
    expect(inventory.fields.every(field=>
      typeof field.transformation==="string" &&
      field.transformation.length>0 &&
      field.externalReviewSha256===null &&
      typeof field.expiryAction==="string",
    )).toBe(true);
    expect(inventory.paidGo).toBe(false);
    expect(inventory.authorizationEnabled).toBe(false);
  });
  it("never creates paid authorization",()=>{
    expect(PHASE6_POLICY_CONTRACT_NEVER_AUTHORIZES_GO).toEqual({
      sourceRightsApproved:false,authorizationEnabled:false,phase6PaidGo:false,
    });
  });
});
