import {describe,expect,it,vi} from "vitest";
import {mkdtempSync,rmSync,writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {runMlExploratoryAuditV39}
  from "../scripts/v39_ml_exploratory_input_review_v39";

describe("local exploratory ML audit CLI, zero provider calls and zero model fits",()=>{
  it("requires exactly two local JSON files, not a paid owner or DB URL",()=>{
    expect(()=>runMlExploratoryAuditV39([])).toThrow(
      "ML_EXPLORATORY_REQUIRES_EXACT_LOCAL_ROWS_AND_SPLIT_JSON");
    expect(()=>runMlExploratoryAuditV39(["--auth","paid"])).toThrow(
      "ML_EXPLORATORY_REQUIRES_EXACT_LOCAL_ROWS_AND_SPLIT_JSON");
  });
  it("prints sanitized HOLD counts and never a fabricated trained model",()=>{
    const dir=mkdtempSync(join(tmpdir(),"v39-ml-local-"));
    const spy=vi.spyOn(console,"log").mockImplementation(()=>{});
    try {
      const rows=join(dir,"rows.json"),split=join(dir,"split.json");
      writeFileSync(rows,"[]");
      writeFileSync(split,JSON.stringify({
        trainBeforeUtc:"2026-10-01T00:00:00Z",
        validationBeforeUtc:"2026-10-02T00:00:00Z",
        testBeforeUtc:"2026-10-03T00:00:00Z",
        featureNames:["previousRouteCount"],
      }));
      expect(runMlExploratoryAuditV39([
        "--rows-json",rows,"--split-json",split,
      ])).toBe(2);
      const result=JSON.parse(String(spy.mock.calls.at(-1)?.[0]));
      expect(result).toMatchObject({
        status:"HOLD",modelFitExecuted:false,phase6ProtectedTestUsed:false,
        rawProviderObjectsReadByThisCommand:false,
        actualLabelEvidenceIndependentlyVerifiedByThisCommand:false,
        providerCalls:0,databaseMutations:0,
      });
    } finally {spy.mockRestore();rmSync(dir,{force:true,recursive:true});}
  });
});
