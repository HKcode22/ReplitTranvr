import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {loadPhase2gCompact6AmendmentV39} from "../server/lib/disruption/phase2Compact6_v39";

const sha=(s:string)=>createHash("sha256").update(s).digest("hex");
describe("P25 exact prospective recovery must load under real V3.9 scientific gate",()=>{
 it("accepts exact hashed one-shot frozen amendment and linked project-lead decision",()=>{
   const path="data-collection/evidence/original-artifacts/phase2g/phase2g-early-pilot-yssy-p25-recovery-freeze-20261011.json";
   const raw=readFileSync(path,"utf8");
   const decision=readFileSync("data-collection/evidence/original-artifacts/phase2g/phase2g-p25-yssy-prospective-project-lead-approval-20261011.json","utf8");
   const pre=JSON.parse(readFileSync("data-collection/evidence/original-artifacts/other/preprobe-reference-freeze-record.json","utf8"));
   const loaded=loadPhase2gCompact6AmendmentV39({
     path,expectedSha256:sha(raw),
     sourcePreprobeFileSha256:"b9113c26d7ec02e4abf036ec3c00837f36c5e741aa08b642d46868ace7ff1870",
     preprobe:pre
   });
   const a=loaded.amendment.p2g25_yssy_published_infrastructure_recovery_rerun;
   expect(a?.authorized).toBe(true);
   expect(a?.approval_status).toBe("PROJECT_LEAD_APPROVED_ONE_RECOVERY");
   expect(a?.project_lead_decision_sha256).toBe(sha(decision));
   expect(loaded.fileSha256).toBe("b54256346a35354d71e46e18a44d175056cba3228d93313d0036cc08af2f4f94");
   expect(a?.current_utc_window_start).toBe("2026-10-13T03:00:00Z");
   expect(a?.max_alert_credits).toBe(500);
   expect(a?.no_automatic_retry_after_this_attempt).toBe(true);
   expect(JSON.parse(decision).provider_mutation_authorized_now).toBe(false);
   expect(JSON.parse(decision).paid_launch_authorized_now).toBe(false);
 });
});
