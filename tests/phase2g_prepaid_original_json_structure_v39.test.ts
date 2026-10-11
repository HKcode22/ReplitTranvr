import {describe,it,expect} from "vitest";
import {assertPrepaidOriginalJsonStructureV39 as verify}
  from "../server/lib/disruption/prepaidOriginalJsonStructure_v39";

const buf=(x:string)=>new TextEncoder().encode(x);

describe("P04/P11 production-prepaid original wire JSON structural admission",()=>{
  it("accepts nested unique JSON object keys",()=>{
    expect(()=>verify(buf('{"id":"x","flights":[{"id":"a","item":{"codeshareStatus":"IsOperator"}}],"deliveryAttempt":{"costCredits":1}}'))).not.toThrow();
  });
  it("accepts a legitimately escaped unique name without false duplicate",()=>{
    expect(()=>verify(buf('{"\\u0069d":"x","flights":[]}'))).not.toThrow();
  });
  it("does not silently discard second top-level notification identity",()=>{
    expect(()=>verify(buf('{"id":"x","id":"y"}')))
      .toThrow("PREPAID_ORIGINAL_DUPLICATE_JSON_KEY");
  });
  it("detects escaped alias of original key",()=>{
    expect(()=>verify(buf('{"id":"x","\\u0069d":"y"}')))
      .toThrow("PREPAID_ORIGINAL_DUPLICATE_JSON_KEY");
  });
  it("rejects nested contradictory billable flight-item cost",()=>{
    expect(()=>verify(buf('{"deliveryAttempt":{"costCredits":5,"\\u0063ostCredits":4}}')))
      .toThrow("PREPAID_ORIGINAL_DUPLICATE_JSON_KEY");
  });
  it("rejects duplicate flight identity within an item, not just outer envelope",()=>{
    expect(()=>verify(buf('{"flights":[{"id":"A","id":"B"}]}')))
      .toThrow("PREPAID_ORIGINAL_DUPLICATE_JSON_KEY");
  });
  it("rejects deliberately malformed JSON before Express normalization",()=>{
    expect(()=>verify(buf('{"id":"broken",}')))
      .toThrow("PREPAID_ORIGINAL_JSON_STRUCTURE_INVALID");
  });
  it("rejects invalid original UTF-8 instead of substituting replacement characters",()=>{
    expect(()=>verify(new Uint8Array([123,34,105,100,34,58,34,255,34,125])))
      .toThrow("PREPAID_ORIGINAL_JSON_UTF8_INVALID");
  });
  it("caps nested JSON depth before excessive parser recursion",()=>{
    const deep='['.repeat(65)+'0'+']'.repeat(65);
    expect(()=>verify(buf(deep))).toThrow("PREPAID_ORIGINAL_JSON_TOO_DEEP");
  });
  it("allows empty valid array without inventing flight identity",()=>{
    expect(()=>verify(buf('[]'))).not.toThrow();
  });
});
