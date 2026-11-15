import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {proposeP6LaterDayAppendBytes,prepareP6ReviewedLaterShardAppend,commitP6ExternallyReviewedLaterAppend} from "../server/lib/disruption/phase6ReviewedLaterShardAppendRuntime_v39";
const h=(s:string)=>s.repeat(64),sha=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const t="2026-11-22T00:00:00.000Z",end="2026-11-22T04:00:00.000Z";
const source={lane:"SOURCE" as const,runDayIndex:1,shardIndex:1,filePath:"data-collection/phase5/frozen/source_fixture_0001.json",
 fileSha256:h("a"),publishedAtUtc:"2026-11-21T23:00:00.000Z",notBeforeUtc:"2026-11-21T23:15:00.000Z",
 hardLatestUtc:"2026-11-22T00:15:00.000Z",reviewEvidenceSha256:h("b"),sourceRegistryFilePath:null,sourceRegistrySha256:null};
const head={schema:"v39.phase6.run-day-scoped-append-only-index.v1",runDayIndex:1,revision:1,previousIndexSha256:null,
 manifestSha256:h("1"),calendarSha256:h("2"),reviewedCodeSha:"e".repeat(40),reviewedReleaseSha256:h("3"),reviewedRightsSha256:h("4"),entries:[source]};
const registry={schema:"v39.phase5.signed-later-pre-day-registry.v1" as const,manifestSha256:head.manifestSha256,reviewedCodeSha:head.reviewedCodeSha,
 sourceDayRegistrySha256:source.fileSha256,sourceDayRegistryFilePath:source.filePath,runDayIndex:1,shardIndex:1,
 entries:[{filePath:"data-collection/phase5/frozen/later_packet_fixture001.json",expectedPacketSha256:h("8"),expectedQueryDigestSha256:h("9"),
 expectedFlightInstanceId:"ci-only-leg",expectedHorizon:"T-6h" as const,expectedSelectedTNativeUtc:"2026-11-22T07:00:00.000Z",
 expectedSourcePopulationQueryId:"a23e4567-e89b-42d3-a456-426614174000"}]};
const path="data-collection/phase5/frozen/later_registry_fixture001.json",digest=h("c"),ev=h("d");
function propose(r=registry,now=t,expiry=end){return proposeP6LaterDayAppendBytes(Buffer.from(JSON.stringify(head)),head,source,r,path,digest,ev,now,end,expiry,end);}
describe("reviewed later shard to exact unsigned current day append",()=>{
 it("preserves immutable source prefix, exact next revision and bounded native cutoff",()=>{
  const x=propose(),p=JSON.parse(x.privateIndexBytes.toString("utf8"));
  expect(p.entries[0]).toEqual(source);expect(p.entries[1]).toMatchObject({lane:"LATER_PRE",hardLatestUtc:"2026-11-22T01:00:00.000Z",
   sourceRegistrySha256:source.fileSha256,fileSha256:digest,reviewEvidenceSha256:ev});
  expect(p.revision).toBe(2);expect(p.previousIndexSha256).toBe(sha(Buffer.from(JSON.stringify(head))));
  expect(x.indexSha256).toBe(sha(x.privateIndexBytes));expect(x.phase6PaidGo).toBe(false);
  expect(Object.keys(x)).not.toContain("privateIndexBytes");expect(JSON.stringify(x)).not.toContain("ci-only-leg");
 });
 it("refuses late, overwide, cross-source or retention-expired shard",()=>{
  expect(()=>propose(registry,"2026-11-22T00:45:00.000Z")).toThrow("LATE_OR_OVERWIDE");
  expect(()=>propose({...registry,entries:[{...registry.entries[0],expectedSelectedTNativeUtc:"2026-11-22T10:00:00.000Z"}]})).toThrow("LATE_OR_OVERWIDE");
  expect(()=>propose({...registry,sourceDayRegistrySha256:h("f")})).toThrow("WRONG_HEAD");
  expect(()=>propose(registry,t,"2026-11-22T00:30:00.000Z")).toThrow("LATE_OR_OVERWIDE");
 });
 it("both operational entrypoints default to HOLD without explicit independent authority, no DB access",async()=>{
  const fake={query:async()=>{throw Error("SHOULD_NOT_QUERY");}};
  const input:any={readerClient:fake,publisherClient:fake};
  await expect(prepareP6ReviewedLaterShardAppend(input)).rejects.toThrow("NO_DISTINCT");
  await expect(commitP6ExternallyReviewedLaterAppend(input,{} as any)).rejects.toThrow("NO_DISTINCT");
 });
});
