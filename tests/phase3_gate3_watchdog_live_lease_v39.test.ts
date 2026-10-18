import {afterEach,describe,expect,it,vi} from "vitest";
import {assertGate3WatchdogLiveLeaseV39,
  verifyGate3WatchdogLiveLeaseFromGitHubV39,
  publishGate3WatchdogLeaseV39,
  type Gate3WatchdogLeaseV39}
  from "../server/lib/disruption/gate3WatchdogLiveLease_v39";

const scope={
  githubRunId:39000001234,commentId:6229000000,
  expectedGitHead:"a".repeat(40),authSha256:"b".repeat(64),
  sessionId:"1789c946-f0f1-4b51-a25b-3fb41d7caf97",
  startUtc:"2026-10-17T12:01:00Z"
};
const now=new Date("2026-10-17T12:00:20.000Z");
const lease:Gate3WatchdogLeaseV39={
  schema:"v39.gate3.wsss-watchdog-lease.v1",
  status:"ACTIVE",githubRunId:scope.githubRunId,
  expectedGitHead:scope.expectedGitHead,
  authSha256:scope.authSha256,sessionId:scope.sessionId,
  startUtc:scope.startUtc,heartbeatUtc:"2026-10-17T12:00:10.000Z",
  providerCreatesByWatchdog:0,hardCreditLimitGuaranteed:false
};
const comment={
  id:scope.commentId,user:{login:"github-actions[bot]",type:"Bot"},
  body:JSON.stringify(lease),
  created_at:"2026-10-17T12:00:00Z",
  updated_at:"2026-10-17T12:00:10Z"
};
const run={
  id:scope.githubRunId,status:"in_progress",conclusion:null,
  head_sha:scope.expectedGitHead,event:"workflow_dispatch",
  path:".github/workflows/phase3-gate3-independent-safety.yml@main",
  name:"Phase3 Gate3 WSSS Independent Safety Sidecar (Manual, Sealed)",
  repository:{full_name:"HKcode22/ReplitTranvr"}
};
afterEach(()=>{vi.unstubAllGlobals()});
describe("GitHub exact WSSS watchdog ARM/heartbeat evidence (not a paid source release)",()=>{
  it("accepts only a fresh exact Actions-bot lease from the same running job",()=>{
    expect(assertGate3WatchdogLiveLeaseV39(scope,comment,run,now)).toEqual(lease);
  });
  it("accepts only the actual GitHub REST workflow path on main",()=>{
    const fullPath=".github/workflows/phase3-gate3-independent-safety.yml";
    for(const suffix of ["@main","@refs/heads/main"]){
      expect(assertGate3WatchdogLiveLeaseV39(scope,comment,{
        ...run,path:fullPath+suffix
      },now)).toEqual(lease);
    }
    for(const path of [
      fullPath,fullPath+"@other",fullPath+"@refs/heads/feature",
      fullPath+"@main/extra",fullPath+"@refs/tags/main",
      ".github/workflows/other.yml@main"
    ]){
      expect(()=>assertGate3WatchdogLiveLeaseV39(scope,comment,{
        ...run,path
      },now)).toThrow("GATE3_WATCHDOG_LEASE_JOB_NOT_ACTIVE_OR_NOT_EXACT_WORKFLOW");
    }
  });
  it("rejects forged non-bot comment even with matching JSON",()=>{
    expect(()=>assertGate3WatchdogLiveLeaseV39(scope,{
      ...comment,user:{login:"random-user",type:"User"}
    },run,now)).toThrow("GATE3_WATCHDOG_LEASE_NOT_TRUSTED_GITHUB_ACTIONS_COMMENT");
  });
  it("rejects stopped, queued or unrelated GitHub Actions run",()=>{
    for(const altered of [
      {...run,status:"completed",conclusion:"success"},
      {...run,status:"queued"},
      {...run,path:".github/workflows/phase2g-paid-stage1.yml"},
      {...run,head_sha:"c".repeat(40)},
      {...run,event:"push"},
    ]){
      expect(()=>assertGate3WatchdogLiveLeaseV39(
        scope,comment,altered,now)).toThrow(
          "GATE3_WATCHDOG_LEASE_JOB_NOT_ACTIVE_OR_NOT_EXACT_WORKFLOW"
        );
    }
  });
  it("rejects stale heartbeat even when Actions run still in progress",()=>{
    expect(()=>assertGate3WatchdogLiveLeaseV39(
      scope,{...comment,body:JSON.stringify({
        ...lease,heartbeatUtc:"2026-10-17T11:59:00Z"
      })},run,now)).toThrow("GATE3_WATCHDOG_LEASE_STALE_HEARTBEAT");
  });
  it("rejects old comment timestamp that claims a fresher forged beat",()=>{
    expect(()=>assertGate3WatchdogLiveLeaseV39(
      scope,{...comment,updated_at:"2026-10-17T11:58:00Z"},run,now
    )).toThrow("GATE3_WATCHDOG_LEASE_STALE_HEARTBEAT");
  });
  it("rejects a STOPPED watchdog after successful deletion",()=>{
    expect(()=>assertGate3WatchdogLiveLeaseV39(scope,{
      ...comment,body:JSON.stringify({...lease,status:"STOPPED"})
    },run,now)).toThrow("GATE3_WATCHDOG_LEASE_CONTENT_SCOPE_OR_STATE_MISMATCH");
  });
  it("refuses wrong session, exact AUTH SHA or paid CREATE claim",()=>{
    for(const bad of [
      {...lease,sessionId:"00000000-0000-4000-8000-000000000000"},
      {...lease,authSha256:"c".repeat(64)},
      {...lease,providerCreatesByWatchdog:1},
      {...lease,hardCreditLimitGuaranteed:true},
    ]){
      expect(()=>assertGate3WatchdogLiveLeaseV39(scope,{
        ...comment,body:JSON.stringify(bad)
      },run,now)).toThrow("GATE3_WATCHDOG_LEASE_CONTENT_SCOPE_OR_STATE_MISMATCH");
    }
  });
  it("reads both GitHub REST endpoints and checks exact run/comment",async()=>{
    const fetchMock=vi.fn(async (url:string)=>{
      return {ok:true,json:async()=>url.includes("/issues/comments/")?comment:run};
    });
    vi.stubGlobal("fetch",fetchMock);
    const result=await verifyGate3WatchdogLiveLeaseFromGitHubV39(scope,now);
    expect(result).toEqual(lease);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("posts metadata-only lease comment and verifies Actions bot response",async()=>{
    const fetchMock=vi.fn(async (_url:string,opts:any)=>{
      const obj=JSON.parse(opts.body);
      expect(obj.body).toBe(JSON.stringify(lease));
      expect(obj.body).not.toContain("creditsRemaining");
      expect(opts.method).toBe("POST");
      return {ok:true,json:async()=>({id:scope.commentId,
        user:{login:"github-actions[bot]"}})};
    });
    vi.stubGlobal("fetch",fetchMock);
    expect(await publishGate3WatchdogLeaseV39(
      "test-only-fake-token",lease)).toBe(scope.commentId);
  });
  it("refuses publishing without an Actions token before fetch",async()=>{
    const f=vi.fn();
    vi.stubGlobal("fetch",f);
    await expect(publishGate3WatchdogLeaseV39("",lease))
      .rejects.toThrow("GATE3_WATCHDOG_LEASE_PUBLISH_SCOPE_INVALID");
    expect(f).not.toHaveBeenCalled();
  });
});
