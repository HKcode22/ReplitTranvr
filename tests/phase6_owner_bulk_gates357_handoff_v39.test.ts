import {describe,it,expect} from "vitest";
import {execFileSync} from "node:child_process";
import {readFileSync} from "node:fs";

const path="review-tools/p6_owner_bulk_gates357_current_main.sh";
const shell=()=>readFileSync(path,"utf8");

describe("Phase6 owner bulk Gates 3/5/7 handoff contract",()=>{
  it("is valid bash and stays no-provider/no-SOURCE-enable",()=>{
    expect(()=>execFileSync("bash",["-n",path],{stdio:"pipe"})).not.toThrow();
    const s=shell();
    expect(s).toContain("RECOVER_EXACT_NOV22_FROM_COMMITTED_EVIDENCE");
    expect(s).toContain("APPLY_EXACT_REVIEWED_DISABLED_MONDAY_STAGE_ONLY_NO_PROVIDER");
    expect(s).toContain("VERIFY_PRIMARY_FIDS_ONLY_NO_WRITES");
    expect(s).toContain("PRIMARY_BACKSTOP");
    expect(s).toContain("unset AERODATABOX_API_KEY RAPIDAPI_KEY AERODATABOX_WEBHOOK_SECRET");
    expect(s).toContain("NO_SOURCE_ENABLE_NO_FIDS_CALL_NO_PAID_GO");
    expect(s).toContain("split(/\\r?\\n/)");
    expect(s).not.toContain("split(/\\\\r?\\\\n/)");
    expect(s).not.toContain("ONE_SIGNED_SOURCE_CHILD_MAX_ONE_PAID_GET");
    expect(s).not.toContain("P6_SOURCE_AUTH_ENABLED_INDEPENDENT_READBACK");
    expect(s).not.toContain("v39_phase6_start_owner_v39");
    const account=readFileSync("review-tools/p6_launch_free_account_prearm_current_v39.mjs","utf8");
    expect(account).toContain('"/subscriptions/balance"');
    expect(account).toContain('"/subscriptions/webhook"');
    expect(account).toContain('method:"GET"');
    expect(account).toContain("providerPaidGets:0");
    expect(account).toContain("sourceFidsCalls:0");
    expect(account).not.toContain('method:"POST"');
    expect(account).not.toContain('method:"DELETE"');
    expect(account).not.toContain("/flights/");
  });
  it("uses exact current main and reviewed relay identity fail-closed",()=>{
    const s=shell();
    expect(s).toContain('PIN="$(git rev-parse HEAD)"');
    expect(s).toContain('"V3.9 Offline Safety"');
    expect(s).toContain('RELAY_PIN="214ede4895c6e6cdae5f124a85a323783251ea60"');
    expect(s).toContain('[[ "$(remote_relay)" == "$RELAY_PIN" ]] || hold RELAY_MAIN_CHANGED');
    expect(s).toContain("data-collection/phase5/evidence/2026-11-21_monday_exact_machine_bound_date_decision.json");
  });
});
