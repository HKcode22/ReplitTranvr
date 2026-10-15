import {describe, expect, it, vi} from "vitest";
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {runGate3PrepaidInertFixtureV39}
  from "../scripts/v39_gate3_prepaid_inert_fixture_v39";

describe("standalone Phase3 Gate3 fixture owner never invokes a live provider",()=>{
  it("rejects unspecified or malformed fixture input",()=>{
    expect(()=>runGate3PrepaidInertFixtureV39([]))
      .toThrow("GATE3_OFFLINE_REQUIRES_EXACT_FIXTURE_FILE_FLAG");
    expect(()=>runGate3PrepaidInertFixtureV39(["--auth","ANY"]))
      .toThrow("GATE3_OFFLINE_REQUIRES_EXACT_FIXTURE_FILE_FLAG");
  });
  it("returns code 2 for a real JSON file lacking all evidence",()=>{
    const folder=mkdtempSync(join(tmpdir(),"v39-g3-inert-"));
    const log=vi.spyOn(console,"log").mockImplementation(()=>{});
    try {
      const file=join(folder,"synthetic.json");
      writeFileSync(file,JSON.stringify({routeTemplate:"bad"}));
      expect(runGate3PrepaidInertFixtureV39(["--fixture-file",file])).toBe(2);
      const reported=JSON.parse(String(log.mock.calls.at(-1)?.[0]));
      expect(reported.status).toBe("OFFLINE_FIXTURE_HOLD");
      expect(reported.paidProviderAuthorized).toBe(false);
      expect(reported.publishedReceiverValidatedByThisCommand).toBe(false);
      expect(reported.actualPostToPublishedReceiverByThisCommand).toBe(false);
      expect(reported.actualProviderBalanceReadByThisCommand).toBe(false);
    } finally {
      log.mockRestore();
      rmSync(folder,{recursive:true,force:true});
    }
  });
  it("does not import provider, DB or paid owner modules in standalone entrypoint",()=>{
    const src=readFileSync(join(process.cwd(),"scripts/v39_gate3_prepaid_inert_fixture_v39.ts"),"utf8");
    expect(src).not.toMatch(/import\s*.*from\s*["'][^"']*(?:aerodataboxLimiter|db_v39|credit_canary|paid_guard|prepaidProbeWindow)/);
    expect(src).toContain('evidenceKind: "SYNTHETIC_OFFLINE_ONLY"');
  });
});
