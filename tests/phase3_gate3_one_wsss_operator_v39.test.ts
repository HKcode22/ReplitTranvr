import {describe,expect,it} from "vitest";
import {
  GATE3_OPERATOR_ONE_CANARY_SCOPE_V39,
  parseGate3OperatorArgsV39,
  executeOneWsssGate3OperatorV39
} from "../scripts/v39_gate3_one_wsss_operator_v39";

const flags=[
  "--auth-id","AUTH-20261016-G3WSSS",
  "--auth-file","data-collection/authorizations/g3-wsss.json",
  "--window","WSSS/departures/2026-10-20T01:00:00Z+600s",
  "--icao","WSSS",
  "--credits","50",
  "--seconds","600",
  "--expected-published-head","a".repeat(40)
];

describe("one WSSS Gate3 paid owner: exact scope AND no unsupported hard-cap release",()=>{
  it("accepts only reviewed target WSSS/600s/50 with exact options",()=>{
    const parsed=parseGate3OperatorArgsV39(flags);
    expect(parsed).toMatchObject({
      icao:"WSSS",credits:50,seconds:600
    });
    expect(GATE3_OPERATOR_ONE_CANARY_SCOPE_V39.maxPaidCreates).toBe(1);
  });
  it("refuses altered airport/period/budget/commit before any provider operation",()=>{
    for(const [key,newValue] of [
      ["--icao","WSSS2"],["--credits","51"],
      ["--credits","49"],["--seconds","601"],
      ["--window","WSSS/departures/2026-10-20T01:00:00Z+601s"],
      ["--expected-published-head","bad"],
    ]){
      const changed=[...flags];
      changed[changed.indexOf(key)+1]=newValue;
      expect(()=>parseGate3OperatorArgsV39(changed)).toThrow();
    }
  });
  it("blocks the real owner before provider, DB and AUTH I/O while seals closed",async()=>{
    await expect(executeOneWsssGate3OperatorV39(flags))
      .rejects.toThrow("GATE3_OPERATOR_SOURCE_SEAL_CLOSED_BEFORE_IO");
  });
});
