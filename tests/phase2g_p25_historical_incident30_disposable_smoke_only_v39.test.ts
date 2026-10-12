import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";
import {assessIncident30ZeroProviderSmokeV39,type Incident30SmokeWitnessV39} from "../scripts/v39_phase2g_p25_historical_incident_smoke_scope_v39";

const exact=():Incident30SmokeWitnessV39=>({
  incidents:[{
    id:30,cause:"reconciliation",resolved:false,
    kind:"stage1_supervisor_recovery",reason:"supervisor_child_exit_recovered",
    providerDeleteVerified:"true",runtimeCleanupVerified:"false"
  }],
  historicalProbe:{
    probeId:18,icao:"YSSY",status:"failed",durationCensored:true,
    reconciliationStatus:"UNRESOLVED",stopReason:"supervisor_child_exit_recovered",
    exactSessionBound:true,runtimeCleanupVerifiedAtUtc:null
  },
  originalRefs:30,untombstonedOriginalRefs:30,
  historicalRuntimeRows:0,historicalCleanupJournalRows:0,
  currentActiveOrSettlingProbes:0
});
describe("P25 exact old incident #30 is isolated for zero-provider synthetic POST only",()=>{
  it("never authorizes paid action, incident closure, original deletion or scientific promotion",()=>{
    const r=assessIncident30ZeroProviderSmokeV39(exact());
    expect(r).toMatchObject({
      allowed:true,historicalIncident30Preserved:true,
      paidLaunchAuthorized:false,incidentClosureAuthorized:false,
      originalDeletionAuthorized:false,historicalSciencePromotionAuthorized:false
    });
    expect(r.reason).toBe("EXACT_UNRESOLVED_HISTORICAL_INCIDENT30_ISOLATED_SMOKE_ONLY");
  });
  it("permits no-existing-incidents smoke without conferring paid authorization",()=>{
    const r=assessIncident30ZeroProviderSmokeV39({...exact(),incidents:[]});
    expect(r).toMatchObject({
      allowed:true,historicalIncident30Preserved:false,paidLaunchAuthorized:false
    });
  });
  it.each([
    ["unknown incident",{incidents:[{...exact().incidents[0],id:31}]}],
    ["two incidents",{incidents:[...exact().incidents,{...exact().incidents[0],id:31}]}],
    ["unconfirmed provider removal",{incidents:[{...exact().incidents[0],providerDeleteVerified:"false"}]}],
    ["old incident resolved without evidence",{incidents:[{...exact().incidents[0],resolved:true}]}],
    ["old incident wrong cause",{incidents:[{...exact().incidents[0],cause:"raw-persistence"}]}],
    ["existing old runtime",{historicalRuntimeRows:1}],
    ["old cleanup journal now present",{historicalCleanupJournalRows:1}],
    ["active billable-probe owner",{currentActiveOrSettlingProbes:1}],
    ["deleted original reference",{untombstonedOriginalRefs:29}],
    ["wrong count",{originalRefs:29}],
    ["wrong original session",{historicalProbe:{...exact().historicalProbe,exactSessionBound:false}}],
    ["retroactive scientific PASS",{historicalProbe:{...exact().historicalProbe,status:"passed"}}],
    ["fake cleanup claim",{historicalProbe:{...exact().historicalProbe,runtimeCleanupVerifiedAtUtc:"2026-10-11T00:00:00Z"}}],
    ["altered censor flag",{historicalProbe:{...exact().historicalProbe,durationCensored:false}}],
  ] as const)("%s refuses",(_name,patch)=>{
    expect(assessIncident30ZeroProviderSmokeV39({...exact(),...patch}).allowed).toBe(false);
  });
  it("real paid preflight remains strict on all unresolved incidents",()=>{
    const paid=readFileSync("scripts/v39_phase2g_stage1_paid_preflight_v39.ts","utf8");
    expect(paid).toContain("if (openIncidents !== 0) blockers.push(`open_incidents=${openIncidents}`)");
    const smoke=readFileSync("scripts/v39_phase2g_verify_live_callback_v39.ts","utf8");
    expect(smoke).toContain("assessIncident30ZeroProviderSmokeV39");
    expect(smoke).toContain("historicalIncident30PreservedForSmokeOnly");
    expect(smoke).toContain('REFUSED:DISPOSABLE_SESSION_COLLIDES_WITH_HISTORICAL_YSSY');
    expect(smoke).toContain("cleanupPrepaidProbeSessionV39(");
    expect(smoke).not.toMatch(/(?:UPDATE|DELETE\s+FROM)\s+clean\.adb_incident_stop/i);
  });
});
