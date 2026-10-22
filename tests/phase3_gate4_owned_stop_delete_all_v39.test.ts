import {describe,it,expect,vi} from "vitest";
import {readFileSync} from "node:fs";
import {attemptGate4AllOwnedDeletesV39} from
  "../server/lib/disruption/gate4OwnedStopDelete_v39";

const fixture=(config:{failDelete?:string;throwDelete?:string;
 failMark?:string;throwMark?:string}={})=>{
  const log:string[]=[];
  const deps={
    deleteOwned:vi.fn(async(id:string)=>{
      log.push("DELETE:"+id);
      if(id===config.throwDelete)throw Error("provider disconnected");
      return id!==config.failDelete;
    }),
    markEnded:vi.fn(async(id:string)=>{
      log.push("MARK:"+id);
      if(id===config.throwMark)throw Error("PG unavailable");
      return id!==config.failMark;
    })
  };
  return {log,deps};
};
describe("Gate4 owned STOP delete-all — injected no-provider failures",()=>{
  it("deletes and marks every known ID without exposing IDs in summary",async()=>{
    const f=fixture();
    const result=await attemptGate4AllOwnedDeletesV39(["ID1","ID2"],f.deps);
    expect(result).toMatchObject({
      attempted:2,deleteReturnedTrue:2,markedEnded:2,unconfirmed:0,
      allKnownOwnedClosed:true,independentlyVerified:false
    });
    expect(JSON.stringify(result)).not.toContain("ID1");
  });
  it("provider rejection does not skip deleting the next resource",async()=>{
    const f=fixture({failDelete:"ID1"});
    const r=await attemptGate4AllOwnedDeletesV39(["ID1","ID2"],f.deps);
    expect(r.unconfirmed).toBe(1);
    expect(r.allKnownOwnedClosed).toBe(false);
    expect(f.log).toEqual(["DELETE:ID1","DELETE:ID2","MARK:ID2"]);
  });
  it("provider throws yet all remaining IDs are attempted",async()=>{
    const f=fixture({throwDelete:"ID2"});
    const r=await attemptGate4AllOwnedDeletesV39(["ID1","ID2","ID3"],f.deps);
    expect(r.unconfirmed).toBe(1);
    expect(f.deps.deleteOwned).toHaveBeenCalledTimes(3);
  });
  it("ended_at SQL failure is unconfirmed despite remote delete return",async()=>{
    const f=fixture({throwMark:"ID1"});
    const r=await attemptGate4AllOwnedDeletesV39(["ID1","ID2"],f.deps);
    expect(r.deleteReturnedTrue).toBe(2);
    expect(r.markedEnded).toBe(1);
    expect(r.allKnownOwnedClosed).toBe(false);
  });
  it("missing persisted row is also unconfirmed and cannot be waived",async()=>{
    const f=fixture({failMark:"ID1"});
    const r=await attemptGate4AllOwnedDeletesV39(["ID1"],f.deps);
    expect(r.unconfirmed).toBe(1);
  });
  it("invalid/duplicate ID still attempts the other distinct owner",async()=>{
    const f=fixture();
    const r=await attemptGate4AllOwnedDeletesV39(["A","","A","B"],f.deps);
    expect(r.unconfirmed).toBe(2);
    expect(f.deps.deleteOwned).toHaveBeenCalledTimes(2);
    expect(r.allKnownOwnedClosed).toBe(false);
  });
  it("actual controller uses delete-all helper before settlement",()=>{
    const s=readFileSync(new URL(
      "../server/lib/disruption/adbCollectionController_v39.ts",
      import.meta.url),"utf8");
    const start=s.indexOf("async function settleAndCloseActiveSegment");
    const end=s.indexOf("async function closeParent",start);
    const segment=s.slice(start,end);
    expect(segment).toContain("attemptGate4AllOwnedDeletesV39(");
    expect(segment.indexOf("attemptGate4AllOwnedDeletesV39("))
      .toBeLessThan(segment.indexOf("runSettlement("));
    expect(segment).toContain("INCIDENT_STOP: provider subscription deletion unconfirmed");
  });
});
