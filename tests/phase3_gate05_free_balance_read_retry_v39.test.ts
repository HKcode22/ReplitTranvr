import {describe,it,expect,vi} from "vitest";
import {getBalanceEvidenceStrictWithRetry} from
  "../server/lib/disruption/aerodataboxLimiter_v3";

const GOOD = {
  balance:{creditsRemaining:1981},
  quota:{
    observedAtUtc:"2026-10-28T05:00:00.000Z",
    apiUnitsLimit:60000,apiUnitsRemaining:59980,
    apiUnitsResetSeconds:10000,apiUnitsResetAtUtc:"2026-11-04T02:21:21Z",
    requestsLimit:10000,requestsRemaining:9900,requestsResetSeconds:10000,
    requestId:"synthetic",rapidApiRegion:null,rapidApiVersion:null
  }
};

describe("Gate05 strict FREE balance transport resilience, fail closed",()=>{
 it("retries two free transport failures, then returns fresh evidence",async()=>{
  const read=vi.fn()
    .mockRejectedValueOnce(new Error("BALANCE_UNAVAILABLE: transport failure"))
    .mockRejectedValueOnce(new Error("BALANCE_UNAVAILABLE: transport failure"))
    .mockResolvedValueOnce(GOOD);
  const sleep=vi.fn().mockResolvedValue(undefined);
  const r=await getBalanceEvidenceStrictWithRetry({
    maxAttempts:3,readImpl:read,sleepImpl:sleep
  });
  expect(r).toEqual(GOOD);
  expect(read).toHaveBeenCalledTimes(3);
  expect(sleep.mock.calls).toEqual([[2000],[3000]]);
 });
 it("does not retry invalid auth, missing quota or scientifically unknown balance",async()=>{
  for(const msg of [
    "BALANCE_UNAVAILABLE: HTTP 401",
    "BALANCE_UNAVAILABLE: HTTP 403",
    "BALANCE_UNAVAILABLE: missing/invalid x-ratelimit-api-units-remaining",
    "BALANCE_UNAVAILABLE: invalid response"
  ]){
    const read=vi.fn().mockRejectedValue(new Error(msg));
    const sleep=vi.fn();
    await expect(getBalanceEvidenceStrictWithRetry({
      readImpl:read,sleepImpl:sleep
    })).rejects.toThrow(msg);
    expect(read).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  }
 });
 it("allows only bounded read-only retry for HTTP 5xx, not HTTP 429",async()=>{
   const read=vi.fn()
     .mockRejectedValueOnce(new Error("BALANCE_UNAVAILABLE: HTTP 503"))
     .mockResolvedValueOnce(GOOD);
   const sleep=vi.fn().mockResolvedValue(undefined);
   await expect(getBalanceEvidenceStrictWithRetry({
      readImpl:read,sleepImpl:sleep
   })).resolves.toEqual(GOOD);
   expect(read).toHaveBeenCalledTimes(2);
   const rateLimited=vi.fn().mockRejectedValue(
     new Error("BALANCE_UNAVAILABLE: HTTP 429"));
   await expect(getBalanceEvidenceStrictWithRetry({
     readImpl:rateLimited,sleepImpl:sleep
   })).rejects.toThrow("HTTP 429");
   expect(rateLimited).toHaveBeenCalledTimes(1);
 });
 it("persistent transport failure remains HARD HOLD, never cached balance",async()=>{
   const read=vi.fn().mockRejectedValue(
     new Error("BALANCE_UNAVAILABLE: transport failure"));
   const sleep=vi.fn().mockResolvedValue(undefined);
   await expect(getBalanceEvidenceStrictWithRetry({
     readImpl:read,sleepImpl:sleep
   })).rejects.toThrow("BALANCE_UNAVAILABLE: transport failure");
   expect(read).toHaveBeenCalledTimes(3);
   expect(sleep).toHaveBeenCalledTimes(2);
 });
 it("rejects zero, fractional or unbounded retry counts",async()=>{
   for(const n of [0,4,1.5,Number.POSITIVE_INFINITY]){
    await expect(getBalanceEvidenceStrictWithRetry({
      maxAttempts:n,
      readImpl:vi.fn().mockResolvedValue(GOOD)
    })).rejects.toThrow("BALANCE_GET_RETRY_ATTEMPTS_INVALID");
   }
 });
});
