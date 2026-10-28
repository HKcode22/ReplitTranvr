import {describe, it, expect} from "vitest";
import {gate05GithubOwnerTimeAdmitV39, gate05GithubStopIsReallyLiveV39}
  from "../scripts/v39_gate05_github_owner_controller_once_v39";

// Independent, synthetic UTC-clock boundary tests; no external services.
// An early deployment approval must never silently become a paid operation.
const T = Date.parse("2026-10-29T03:00:00.000Z");
const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;

describe("Gate05 GitHub timing: deterministic UTC boundaries", () => {
  it("keeps a frozen prospective one-hour cohort", () => {
    expect(() => gate05GithubOwnerTimeAdmitV39(
      T - 35 * MINUTE, T, T + HOUR, "dispatch"
    )).not.toThrow();
    expect(() => gate05GithubOwnerTimeAdmitV39(
      T - 86 * MINUTE, T, T + HOUR, "dispatch"
    )).toThrow();
    expect(() => gate05GithubOwnerTimeAdmitV39(
      T - 10 * MINUTE, T, T + HOUR, "dispatch"
    )).toThrow();
    expect(() => gate05GithubOwnerTimeAdmitV39(
      T - 35 * MINUTE, T, T + 40 * MINUTE, "dispatch"
    )).toThrow();
  });

  it("does not permit a late or premature paid phase", () => {
    expect(() => gate05GithubOwnerTimeAdmitV39(
      T - 5 * MINUTE, T, T + HOUR, "paid"
    )).not.toThrow();
    expect(() => gate05GithubOwnerTimeAdmitV39(
      T - 5 * MINUTE - 1, T, T + HOUR, "paid"
    )).toThrow();
    expect(() => gate05GithubOwnerTimeAdmitV39(
      T + 15001, T, T + HOUR, "paid"
    )).toThrow();
  });

  it("rejects queued, completed, or unrelated independent STOP", () => {
    const head = "a".repeat(40);
    const scope = "b2536cba-330e-4a64-8b3c-165cb55fce22";
    const run = {
      head_sha: head, event: "workflow_dispatch", run_attempt: 1,
      display_title: "Gate05 Science STOP " + scope,
      status: "in_progress"
    };
    const jobs = {jobs: [{
      name: "exact-owned-stop", status: "in_progress",
      steps: [{
        name: "Run independently authorized exact-owned STOP, never CREATE",
        status: "in_progress"
      }]
    }]};
    expect(gate05GithubStopIsReallyLiveV39(
      run, jobs, scope, head, T - 4 * MINUTE, T
    )).toBe(true);
    expect(gate05GithubStopIsReallyLiveV39(
      {...run, status: "completed"}, jobs, scope, head, T - 4 * MINUTE, T
    )).toBe(false);
    expect(gate05GithubStopIsReallyLiveV39(
      run, {jobs: []}, scope, head, T - 4 * MINUTE, T
    )).toBe(false);
    expect(gate05GithubStopIsReallyLiveV39(
      run, jobs, scope, head, T - 6 * MINUTE, T
    )).toBe(false);
  });
});
