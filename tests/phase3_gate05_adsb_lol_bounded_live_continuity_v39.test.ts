import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {normalizeGate05AdsbLolOfflineV39} from "../server/lib/disruption/gate05ZeroCostAdsbEvidence_v39";
import {summarizeGate05AdsbContinuityV39} from "../server/lib/disruption/gate05LiveAdsbContinuity_v39";

const at=(sec:number)=>new Date(Date.parse("2026-10-29T10:00:00.000Z")+sec*1000).toISOString();
function sample(sec:number,hex:string,lat:number,lon:number,flight="SIA123"){
  return normalizeGate05AdsbLolOfflineV39({
    now:Date.parse(at(sec)),
    ac:[{hex,lat,lon,flight,seen_pos:1,alt_baro:12000,gs:300}]
  },at(sec));
}
describe("Gate05 finite real-time ADS-B sampling science boundary",()=>{
  it("keeps repeat aircraft candidates distinct from certified operated flights",()=>{
    const a=sample(0,"abc123",1.359,103.99);
    const b=sample(60,"abc123",1.36,104.0);
    const c=sample(120,"abc124",1.37,104.01);
    const r=summarizeGate05AdsbContinuityV39([a,b,c]);
    expect(r.snapshotCount).toBe(3);
    expect(r.uniqueAircraftCandidates).toBe(2);
    expect(r.repeatedAircraftCandidates).toBe(1);
    expect(r.plausibleConsecutiveSegments).toBe(1);
    expect(r.physicalOperatingFlightMatchesCertified).toBe(false);
    expect(r.scheduledWheelsOffCertified).toBe(false);
    expect(r.actualWheelsOffCertified).toBe(false);
    const out=JSON.stringify(r);
    expect(out).not.toContain("abc123");
    expect(out).not.toContain("SIA123");
    expect(out).not.toContain("103.99");
  });
  it("rejects an impossible displacement rather than claiming a track",()=>{
    const r=summarizeGate05AdsbContinuityV39([
      sample(0,"abc123",1.36,103.99),
      sample(60,"abc123",1.36,105.0)
    ]);
    expect(r.plausibleConsecutiveSegments).toBe(0);
    expect(r.implausibleJumpSegments).toBe(1);
  });
  it("does not inflate repeated points with same source time",()=>{
    const x=sample(0,"abc123",1.36,103.99);
    const r=summarizeGate05AdsbContinuityV39([x,x]);
    expect(r.plausibleConsecutiveSegments).toBe(0);
    expect(r.duplicateOrNonmonotoneSegments).toBe(1);
  });
  it("enforces hard six-snapshot cap",()=>{
    const arr=Array.from({length:7},(_,i)=>sample(i*60,"abc123",1.36,103.99));
    expect(()=>summarizeGate05AdsbContinuityV39(arr)).toThrow("GATE05_FREE_SAMPLE_CAP_EXCEEDED");
  });
  it("finite workflow has no paid trigger, secret, permanent database or historical dependency",()=>{
    const wf=readFileSync(".github/workflows/phase3-gate05-wsss-bounded-public-adsb-research.yml","utf8");
    const src=readFileSync("scripts/v39_gate05_adsb_lol_wsss_bounded_live_20261029.ts","utf8");
    expect(wf).toContain("schedule:");
    expect(wf).not.toContain("workflow_dispatch:");
    expect(wf).not.toContain("secrets.");
    expect(src).toContain('2026-11-01T00:00:00.000Z');
    expect(src).toContain("MAX_GETS=6");
    expect(src).not.toContain("DATABASE_URL");
    expect(src).not.toContain("AERODATABOX_API_KEY");
    expect(src).not.toContain("INSERT INTO");
    expect(src).not.toContain("POST");
    expect(src).not.toContain("historical");
    expect(src).not.toContain("globe_history");
  });
});