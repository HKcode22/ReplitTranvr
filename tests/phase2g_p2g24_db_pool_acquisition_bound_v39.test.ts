import {describe,it,expect} from "vitest";
import {v39PoolConnectionTimeoutMillis} from "../server/lib/disruption/db_v39";

describe("Phase2G callback-only PostgreSQL connection acquisition bound (offline)",()=>{
  it("published callback-only process refuses unbounded DB acquisition waits",()=>{
    expect(v39PoolConnectionTimeoutMillis({V39_CALLBACK_ONLY_RUNTIME:"1"})).toBe(4000);
  });
  it("ordinary Travnr server retains existing default behavior",()=>{
    expect(v39PoolConnectionTimeoutMillis({V39_CALLBACK_ONLY_RUNTIME:"0"})).toBe(0);
    expect(v39PoolConnectionTimeoutMillis({})).toBe(0);
  });
  it("no case-folded approximate or malformed flag silently activates guard",()=>{
    for(const v of ["true","yes","01"," 1 ","callback-only",""]) {
      expect(v39PoolConnectionTimeoutMillis({V39_CALLBACK_ONLY_RUNTIME:v})).toBe(0);
    }
  });
  it("connection timeout is shorter than upstream 10-second envelope but is not total POST timing proof",()=>{
    const limit=v39PoolConnectionTimeoutMillis({V39_CALLBACK_ONLY_RUNTIME:"1"});
    expect(limit).toBeGreaterThan(0);
    expect(limit).toBeLessThan(10_000);
  });
});