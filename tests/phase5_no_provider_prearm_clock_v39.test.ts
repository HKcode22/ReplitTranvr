import {describe,it,expect} from "vitest";
import {admitPrearmClockWave,measurePrearmClockWave} from "../scripts/v39_phase5_no_provider_prearm_clock_v39";
import {waitForP5ScheduledPhysicalDispatch,p5SourcePacingTargetUtc} from "../server/lib/disruption/phase5V0080GitHubPrearm_v39";
const created="2026-11-16T09:00:00Z",first="2026-11-16T09:15:00.000Z",sha="a".repeat(40);
const db="postgresql://postgres:postgres@localhost:5432/v39_ci?sslmode=disable";
const env={GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",GITHUB_REF:"refs/heads/main",
 GITHUB_EVENT_NAME:"workflow_dispatch",GITHUB_RUN_ATTEMPT:"1",GITHUB_RUN_ID:"12345",GITHUB_SHA:sha,
 P5_PREARM_CLOCK_APPROVED_MAIN:sha,P5_PREARM_CLOCK_CONFIRM:"MEASURE_TWO_FOUR_SLOT_PREARM_CLOCK_WAVES_NO_PROVIDER",
 P5_PREARM_CLOCK_WAVE:"1",P5_PREARM_CLOCK_SLOT:"1",P5_PREARM_CLOCK_FIRST_TARGET:first,
 ADB_AUTO_COLLECT:"0",V39_PHASE6_PROCESS_ARMED:"0",V39_PHASE6_OWNER_APPROVED:"0",V39_P5_SOURCE_OWNER_APPROVED:"0",
 V39_PHASE5_FREEZE_SIGNED:"0",DATABASE_URL:db,V39_DATABASE_RUNTIME_URL:db};
const run={id:12345,head_sha:sha,head_branch:"main",path:".github/workflows/phase5-v0080-github-runtime-prearm-real-pg16.yml",
 event:"workflow_dispatch",run_attempt:1,created_at:created};
describe("nonpaid prospective prearm clock measurement",()=>{
 it("freezes exact two waves, four slots, original UTC and cutoff",()=>{
  const a=admitPrearmClockWave(env,run);
  const b=admitPrearmClockWave({...env,P5_PREARM_CLOCK_SLOT:"4",P5_PREARM_CLOCK_WAVE:"2"},run);
  expect(a.planned).toBe(Date.parse(first));
  expect(b.planned-a.planned).toBe(900000);
  expect(a.cutoff-a.planned).toBe(900000);
 });
 it("refuses provider credentials, production DB, reruns, wrong code, shifted or unbounded target",()=>{
  for(const patch of [{AERODATABOX_API_KEY:"never"},{P6_PRIVATE_READER_DATABASE_URL:"never"},
   {GITHUB_RUN_ATTEMPT:"2"},{P5_PREARM_CLOCK_SLOT:"5"},{P5_PREARM_CLOCK_WAVE:"3"},
   {P5_PREARM_CLOCK_APPROVED_MAIN:"b".repeat(40)},{DATABASE_URL:"postgresql://bad"},
   {P5_PREARM_CLOCK_FIRST_TARGET:"2026-11-16T08:59:00.000Z"},
   {P5_PREARM_CLOCK_FIRST_TARGET:"2026-11-16T09:36:00.000Z"}])
   expect(()=>admitPrearmClockWave({...env,...patch},run)).toThrow(/HOLD_P5_PREARM_CLOCK_/);
  expect(()=>admitPrearmClockWave(env,{...run,id:111})).toThrow(/RUN_IDENTITY/);
 });
 it("reuses original wait and reads clock to completion, never early",async()=>{
  const s=admitPrearmClockWave(env,run);let now=s.planned-15001;
  const got=await measurePrearmClockWave(s,async()=>new Date(now),(p,c,m,read)=>waitForP5ScheduledPhysicalDispatch(p,c,m,read,async ms=>{now+=ms;}));
  expect(got.status).toBe("OBSERVED_READY_AND_TIMELY_NO_PROVIDER");
  expect(got.releaseSlipMs).toBe(0);expect(got.readyLeadMs).toBe(15001);
  expect(got.dbClockReads).toBeGreaterThan(2);
  expect(got.providerResponseAndPersistMeasured).toBe(false);
  expect(got.productionDatabaseWrites).toBe(0);expect(got.phase6PaidGo).toBe(false);
 });
 it("records late setup rather than moving target, even if original wait permits it",async()=>{
  const s=admitPrearmClockWave(env,run);
  const got=await measurePrearmClockWave(s,async()=>new Date(s.planned+1));
  expect(got.status).toBe("HOLD_NOT_READY_BEFORE_TARGET");expect(got.releaseSlipMs).toBe(1);
  const late=await measurePrearmClockWave(s,async()=>new Date(s.planned+120001),
   async()=>{throw Error("must not call wait");});
  expect(late.status).toBe("HOLD_NOT_READY_BEFORE_TARGET");expect(late.dbReleasedAtUtc).toBeNull();
 });
 it("preserves refusal and excessive slip separately",async()=>{
  const s=admitPrearmClockWave(env,run);let now=s.planned-1000;
  const refused=await measurePrearmClockWave(s,async()=>new Date(now),async()=>{throw Error("cutoff missed");});
  expect(refused.status).toBe("HOLD_EXISTING_WAIT_REFUSED");expect(refused.dbReleasedAtUtc).toBeNull();
  const slow=await measurePrearmClockWave(s,async()=>new Date(now),async()=>{now=s.planned+120001;});
  expect(slow.status).toBe("HOLD_RELEASE_OUTSIDE_PROPOSED_SLIP");
 });
});

describe("outcome-blind four-slot provider burst mitigation",()=>{
 const slots=["HUB","MID_A","MID_B","REGIONAL"];
 const base=Date.parse("2026-11-25T21:45:00.000Z");
 const iso=(x:number)=>new Date(x).toISOString();
 it("rotates balanced 0/20/40/60 second positions over four signed quarters",()=>{
  const positions=slots.map(()=>[] as number[]);
  for(let n=0;n<4;n++){
   const t=base+n*900000;
   const row=slots.map((s,i)=>{const offset=Date.parse(p5SourcePacingTargetUtc(s,iso(t),iso(t+720000),iso(t+900000),180))-t;positions[i].push(offset);return offset;});
   expect(row.sort((a,b)=>a-b)).toEqual([0,20000,40000,60000]);
  }
  for(const x of positions)expect(x.sort((a,b)=>a-b)).toEqual([0,20000,40000,60000]);
 });
 it("fits shorter balanced slots within the hard latest and response margin",()=>{
  const positions=slots.map(()=>[] as number[]);
  for(let n=0;n<4;n++){
   const t=base+n*900000;
   const row=slots.map((s,i)=>{const offset=Date.parse(p5SourcePacingTargetUtc(s,iso(t),iso(t+30000),iso(t+240000),180))-t;positions[i].push(offset);return offset;});
   expect(row.sort((a,b)=>a-b)).toEqual([0,8000,16000,24000]);
  }
  for(const x of positions)expect(x.sort((a,b)=>a-b)).toEqual([0,8000,16000,24000]);
  const limited=slots.map(s=>Date.parse(p5SourcePacingTargetUtc(s,iso(base),iso(base+120000),iso(base+210000),180))-base);
  expect(limited.sort((a,b)=>a-b)).toEqual([0,8000,16000,24000]);
 });
 it("does not change a window with insufficient signed slack and refuses invalid scope",()=>{
  for(const s of slots){expect(p5SourcePacingTargetUtc(s,iso(base),iso(base+13000),iso(base+240000),180)).toBe(iso(base));expect(p5SourcePacingTargetUtc(s,iso(base),iso(base+30000),iso(base+185000),180)).toBe(iso(base));}
  expect(()=>p5SourcePacingTargetUtc("bad",iso(base),iso(base+720000),iso(base+900000),180)).toThrow(/PACING_INVALID_SIGNED_SCOPE/);
 });
 it("waits on DB clock before reservation but original cutoff remains authoritative",async()=>{
  let now=base-5000;const t=iso(base+60000);
  await waitForP5ScheduledPhysicalDispatch(iso(base),iso(base+900000),180,async()=>new Date(now),async ms=>{now+=ms;},t);
  expect(now).toBe(base+60000);
  await expect(waitForP5ScheduledPhysicalDispatch(iso(base),iso(base+900000),180,async()=>new Date(base+721000),async()=>{},t)).rejects.toThrow(/MISSED_PROSPECTIVE/);
  await expect(waitForP5ScheduledPhysicalDispatch(iso(base),iso(base+900000),180,async()=>new Date(base),async()=>{},iso(base+61000))).rejects.toThrow(/PACING_TARGET/);
 });
});
