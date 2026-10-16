import {describe,it,expect} from "vitest";
import {classifyPhase2gTerminalOwnerZeroSubscriptionV39 as decide}
  from "../server/lib/disruption/phase2gTerminalOwnerHandoff_v39";

const end = Date.parse("2026-10-13T05:02:25.362Z");
const base = {
  probeStatus: "probing",
  expectedSubscriptionId: "synthetic-owned-id-only",
  activeBillableSubscriptionIds: [] as string[],
  scheduledWindowEndMs: end,
  observedNowMs: end + 22_000,
  cleanupGraceMs: 300_000,
};

describe("P25 terminal owner/independent watchdog deletion race",()=>{
  it("allows only a bounded zero-sub post-deadline owner handoff",()=>{
    expect(decide(base)).toBe("WAIT_BOUNDED_TERMINAL_OWNER_CLEANUP");
    expect(decide({...base,observedNowMs:end})).toBe("WAIT_BOUNDED_TERMINAL_OWNER_CLEANUP");
    expect(decide({...base,observedNowMs:end+299_999})).toBe("WAIT_BOUNDED_TERMINAL_OWNER_CLEANUP");
  });
  it("recovers immediately if subscription disappears before deadline",()=>{
    expect(decide({...base,observedNowMs:end-1})).toBe("RECOVER_ISOLATION_LOST");
    expect(decide({...base,observedNowMs:end-120_000})).toBe("RECOVER_ISOLATION_LOST");
  });
  it("fails closed after cleanup grace expires, at the exact boundary",()=>{
    expect(decide({...base,observedNowMs:end+300_000})).toBe("RECOVER_ISOLATION_LOST");
    expect(decide({...base,observedNowMs:end+300_001})).toBe("RECOVER_ISOLATION_LOST");
  });
  it("never tolerates foreign or additional active billable subscription",()=>{
    for (const ids of [["other"],["synthetic-owned-id-only","other"]]) {
      expect(decide({...base,activeBillableSubscriptionIds:ids})).toBe("RECOVER_ISOLATION_LOST");
    }
  });
  it("never tolerates an unknown owner, missing session status, or malformed clock",()=>{
    expect(decide({...base,expectedSubscriptionId:null})).toBe("RECOVER_ISOLATION_LOST");
    expect(decide({...base,expectedSubscriptionId:""})).toBe("RECOVER_ISOLATION_LOST");
    expect(decide({...base,probeStatus:"settling"})).toBe("RECOVER_ISOLATION_LOST");
    expect(decide({...base,probeStatus:"failed"})).toBe("RECOVER_ISOLATION_LOST");
    expect(decide({...base,scheduledWindowEndMs:NaN})).toBe("RECOVER_ISOLATION_LOST");
    expect(decide({...base,cleanupGraceMs:301_000})).toBe("RECOVER_ISOLATION_LOST");
    expect(decide({...base,observedNowMs:Infinity})).toBe("RECOVER_ISOLATION_LOST");
  });
});
