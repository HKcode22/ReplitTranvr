import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";

describe("Gate4 exact strict R1 and post-DELETE inventory source contract",()=>{
 const s=readFileSync(new URL(
   "../server/lib/disruption/adbCollectionController_v39.ts",
   import.meta.url),"utf8");
 it("admission never interprets failed provider list as zero subscriptions",()=>{
   const a=s.slice(s.indexOf("async function assertR1Exclusive"),
     s.indexOf("async function loadFrameAndStates"));
   expect(a).toContain("await listSubscriptionsStrict()");
   expect(a).not.toContain("await listSubscriptions()");
   expect(a).toContain("REFUSED_R1_FOREIGN_ACTIVE_COUNT=");
   // Incident cannot print actual provider IDs in exception string.
   expect(a).not.toContain('foreign.map(x => x.id).join');
 });
 it("owned STOP reads strict provider inventory before settling balance",()=>{
   const a=s.slice(s.indexOf("async function settleAndCloseActiveSegment"),
     s.indexOf("async function closeParent"));
   const deleteAt=a.indexOf("attemptGate4AllOwnedDeletesV39(");
   const inventoryAt=a.indexOf("const inventory=await listSubscriptionsStrict()");
   const settleAt=a.indexOf("const settlement = await runSettlement");
   expect(deleteAt).toBeGreaterThanOrEqual(0);
   expect(inventoryAt).toBeGreaterThan(deleteAt);
   expect(settleAt).toBeGreaterThan(inventoryAt);
   expect(a).toContain("activeBillableCount===null || activeBillableCount!==0");
   expect(a).toContain("INCIDENT_STOP: strict provider subscription inventory unverified");
 });
 it("strict client throws uncertainty instead of returning UI empty array",()=>{
   const p=readFileSync(new URL(
     "../server/lib/disruption/aerodataboxLimiter_v3.ts",import.meta.url),
     "utf8");
   const strict=p.slice(p.indexOf("export async function listSubscriptionsStrict():"),
     p.indexOf("export async function listSubscriptionsStrictWithRetry("));
   expect(strict).toContain("throw new Error(");
   expect(strict).not.toContain("catch { return []; }");
   // A documented empty HTTP 204 can be legitimate; but its current
   // handling must be explicitly reviewed, not inferred from a 500.
   expect(strict).toContain("resp.status === 204");
 });
});
