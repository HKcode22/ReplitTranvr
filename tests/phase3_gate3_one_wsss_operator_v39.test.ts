import {describe,expect,it} from "vitest";
import {
  GATE3_OPERATOR_ONE_CANARY_SCOPE_V39,
  GATE3_INDEPENDENT_WATCHDOG_RELEASED_V39,
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
    expect(GATE3_INDEPENDENT_WATCHDOG_RELEASED_V39).toBe(true);
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
  it("requires authenticated GitHub API capacity before reserving a paid session",async()=>{
    const names=["V39_DATABASE_TARGET_CONFIRM","V39_DATABASE_RUNTIME_URL",
      "AERODATABOX_API_KEY","AERODATABOX_WEBHOOK_SECRET",
      "WEBHOOK_BASE_URL","GITHUB_TOKEN","GH_TOKEN"] as const;
    const previous=Object.fromEntries(names.map(k=>[k,process.env[k]]));
    process.env.V39_DATABASE_TARGET_CONFIRM="production";
    process.env.V39_DATABASE_RUNTIME_URL="synthetic-offline-no-connection";
    process.env.AERODATABOX_API_KEY="synthetic-offline-no-provider";
    process.env.AERODATABOX_WEBHOOK_SECRET="synthetic-offline-webhook";
    delete process.env.WEBHOOK_BASE_URL;
    delete process.env.GITHUB_TOKEN;
    delete process.env.GH_TOKEN;
    try{
      await expect(executeOneWsssGate3OperatorV39(flags))
        .rejects.toThrow("GATE3_OPERATOR_AUTHENTICATED_GITHUB_API_REQUIRED");
    }finally{
      for(const name of names){
        if(previous[name]===undefined)delete process.env[name];
        else process.env[name]=previous[name];
      }
    }
  });
  it("blocks the real owner before provider or DB I/O if production target is not confirmed",async()=>{
    const previous=process.env.V39_DATABASE_TARGET_CONFIRM;
    process.env.V39_DATABASE_TARGET_CONFIRM="test-not-production";
    try{
      await expect(executeOneWsssGate3OperatorV39(flags))
        .rejects.toThrow("GATE3_OPERATOR_ENVIRONMENT_NOT_READY");
    }finally{
      if(previous===undefined)delete process.env.V39_DATABASE_TARGET_CONFIRM;
      else process.env.V39_DATABASE_TARGET_CONFIRM=previous;
    }
  });
});
