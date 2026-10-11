import {describe,it,expect} from "vitest";
import {v39PoolConnectionTimeoutMillis} from "../server/lib/disruption/db_v39";

describe("Phase2G callback-only connection timeout cannot silently create paid delivery loss",()=>{
  it("published callback-only default remains the original unlimited pool wait while backup is not approved",()=>{
    expect(v39PoolConnectionTimeoutMillis({V39_CALLBACK_ONLY_RUNTIME:"1"})).toBe(0);
  });
  it("ordinary Travnr service remains unchanged under every callback-specific flag",()=>{
    expect(v39PoolConnectionTimeoutMillis({V39_CALLBACK_ONLY_RUNTIME:"0",V39_CALLBACK_DB_ACQUIRE_TIMEOUT_APPROVED:"1"})).toBe(0);
    expect(v39PoolConnectionTimeoutMillis({V39_CALLBACK_DB_ACQUIRE_TIMEOUT_APPROVED:"1"})).toBe(0);
    expect(v39PoolConnectionTimeoutMillis({})).toBe(0);
  });
  it("bounded experimental timeout is opt-in ONLY with exact two flags",()=>{
    expect(v39PoolConnectionTimeoutMillis({
      V39_CALLBACK_ONLY_RUNTIME:"1",V39_CALLBACK_DB_ACQUIRE_TIMEOUT_APPROVED:"1"
    })).toBe(4000);
  });
  it("misspelled or malformed flags do not accidentally change live callback behavior",()=>{
    for(const flag of ["", "yes", "true", "01", " 1 ", "0"]) {
      expect(v39PoolConnectionTimeoutMillis({
        V39_CALLBACK_ONLY_RUNTIME:"1",V39_CALLBACK_DB_ACQUIRE_TIMEOUT_APPROVED:flag
      })).toBe(0);
    }
  });
  it("a 4s bound is a resource-control experiment, not a provider-ACK guarantee",()=>{
    const n=v39PoolConnectionTimeoutMillis({
      V39_CALLBACK_ONLY_RUNTIME:"1",V39_CALLBACK_DB_ACQUIRE_TIMEOUT_APPROVED:"1"
    });
    expect(n).toBeLessThan(10_000);
    expect(n).toBeGreaterThan(0);
    expect(v39PoolConnectionTimeoutMillis({V39_CALLBACK_ONLY_RUNTIME:"1"})).toBe(0);
  });
});