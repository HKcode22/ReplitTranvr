import {readFileSync} from "node:fs";
import {randomUUID} from "node:crypto";
import {describe,expect,it} from "vitest";
import {selectPrepaidWindowSessionV39} from
  "../server/lib/disruption/prepaidWindowSessionSelection_v39";

const id=randomUUID();
const prearmed=()=>({
  sessionId:id,icao:"YSSY",fixedExposureSeconds:300,
  canaryCreditCeiling:20,authorizationEvidenceSha256:"f".repeat(64),
  authArtifactRaw:"{synthetic-only-no-real-auth}",
  expectedAuthId:"AUTH-20261014-G3MOCK",
  expectedAirportFilterWindow:"YSSY/departures/2026-10-14T12:00:00Z+300s",
});
const input=()=>({
  ownerKind:"phase3_credit_canary" as const,icao:"YSSY",
  ownerProbeId:null,stage:null,targetHours:300/3600,
  settledOtherCredits:0,hardCapCredits:20,prearmedGate3:prearmed(),
});
function hooks(review:{
  status:"HOLD"|"OFFLINE_AUTH_SESSION_CONSISTENT";reasons:readonly string[];
}={status:"OFFLINE_AUTH_SESSION_CONSISTENT",reasons:[]}){
  let arms=0,reviews=0;
  return {
    armHistorical:async(x:any)=>{
      arms++;
      return {sessionId:randomUUID(),ownerKind:x.ownerKind,
        ownerProbeId:x.ownerProbeId,stage:x.stage,icao:x.icao,
        state:"armed" as const,expiresAtUtc:"2026-10-15T00:00:00Z"};
    },
    reviewPrearmedGate3:async(_:any)=>{reviews++;return review;},
    get arms(){return arms;},get reviews(){return reviews;},
  };
}
describe("prepaid shared runner selects original Phase2 or prepared Gate3 identity",()=>{
  it("keeps legacy Phase2 freshly armed with unchanged owner fields",async()=>{
    for(const ownerKind of ["phase2_safety_smoke","anchor_probe"] as const){
      const h=hooks();
      const session=await selectPrepaidWindowSessionV39({
        ownerKind,ownerProbeId:ownerKind==="anchor_probe"?15:null,
        stage:ownerKind==="anchor_probe"?1:null,
        icao:"WSSS",targetHours:2,
        hardCapCredits:500,settledOtherCredits:0,
      },h);
      expect(session.ownerKind).toBe(ownerKind);
      expect(h.arms).toBe(1);
      expect(h.reviews).toBe(0);
    }
  });
  it("Gate3 reuses its exact prearmed identity and NEVER arms a second session",async()=>{
    const h=hooks(),x=input();
    const s=await selectPrepaidWindowSessionV39(x,h);
    expect(s).toMatchObject({
      sessionId:id,ownerKind:"phase3_credit_canary",
      ownerProbeId:null,stage:null,icao:"YSSY",state:"armed",
    });
    expect(h.arms).toBe(0);
    expect(h.reviews).toBe(1);
  });
  it("refuses non-reviewed prearmed identity and never falls back to Phase2 arming",async()=>{
    const h=hooks({status:"HOLD",reasons:["DURABLE_OWNER_MISSING"]});
    await expect(selectPrepaidWindowSessionV39(input(),h))
      .rejects.toThrow("GATE3_PREARMED_OWNER_AUTH_HOLD");
    expect(h.arms).toBe(0);
    expect(h.reviews).toBe(1);
  });
  it("rejects Gate3 extra owner, wrong airport, cap, duration and missing prearm before any hook",async()=>{
    const mutations=[
      {ownerProbeId:15},{stage:1},{icao:"WSSS"},
      {hardCapCredits:19},{settledOtherCredits:1},
      {targetHours:0.5},{prearmedGate3:undefined},
      {prearmedGate3:{...prearmed(),icao:"WSSS"}},
      {prearmedGate3:{...prearmed(),fixedExposureSeconds:3601}},
      {prearmedGate3:{...prearmed(),canaryCreditCeiling:150}},
      {prearmedGate3:{...prearmed(),sessionId:"not-a-uuid"}},
      {prearmedGate3:{...prearmed(),authorizationEvidenceSha256:"oops"}},
    ];
    for(const patch of mutations){
      const h=hooks();
      await expect(selectPrepaidWindowSessionV39({...input(),...patch} as any,h))
        .rejects.toThrow("GATE3_PREARMED_EXACT_SESSION_SCOPE_REQUIRED");
      expect(h.arms).toBe(0);
      expect(h.reviews).toBe(0);
    }
  });
  it("rejects smuggling a prearmed Gate3 config into historical Phase2",async()=>{
    for(const ownerKind of ["anchor_probe","phase2_safety_smoke"] as const){
      const h=hooks();
      await expect(selectPrepaidWindowSessionV39({
        ...input(),ownerKind,
      } as any,h)).rejects.toThrow("GATE3_PREARMED_MODE_FORBIDDEN_FOR_PHASE2");
      expect(h.arms).toBe(0);
    }
  });
  it("runner integration remains hard-held before provider create for Gate3",()=>{
    const w=readFileSync("server/lib/disruption/prepaidProbeWindow_v39.ts","utf8");
    const rt=readFileSync("server/lib/disruption/prepaidProbeRuntime_v39.ts","utf8");
    const chosen=w.indexOf("await selectPrepaidWindowSessionV39(input,");
    const hold=w.indexOf("GATE3_PREARMED_PROVIDER_EXPOSURE_PENDING_OWNER_AND_HOST_PARITY");
    const create=w.indexOf("const creation = await resolveAmbiguousPrepaidCreateV39({");
    expect(chosen).toBeGreaterThan(0);
    expect(hold).toBeGreaterThan(0);
    expect(hold).toBeLessThan(chosen);
    expect(create).toBeGreaterThan(chosen);
    expect(w).toContain("GATE3_PROVIDER_EXPOSURE_RELEASED_V39 = false");
    expect(w).not.toContain("armPrepaidProbeSessionV39({\n    ownerKind: input.ownerKind");
    expect(rt).toContain("GATE3_GENERIC_PHASE2_SESSION_ARM_FORBIDDEN");
    expect(w).toContain("reviewGate3OwnerPreflightV39(client,");
    expect(w).toMatch(/process\.cwd\(\),"data-collection","evidence","ledgers","V3\.9_RUN_REPORTS_AND_EVIDENCE\.md"/);
  });
});
