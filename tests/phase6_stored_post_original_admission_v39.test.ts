import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {selectP6ExactStoredPostRoute,inspectP6StoredPostOriginalV0083} from "../server/lib/disruption/phase6StoredPostOriginalAdmission_v39";
const hash=(b:Buffer|string)=>createHash("sha256").update(b).digest("hex");
function fixture(){
 const post=Buffer.from("synthetic post"),source=Buffer.from("synthetic source"),indexSha256=hash("day"),
  routingIntentSha256=hash("route"),selector={runDayIndex:1,indexRevision:2,indexSha256,routingIntentSha256};
 const route={lane:"POST",runDayIndex:1,shardIndex:3,routingIntentSha256,
  signedFrozenPath:"data-collection/phase5/frozen/post_synthetic_123.json",signedFrozenSha256:hash(post),
  boundSourceRegistryPath:"data-collection/phase5/frozen/source_synthetic_123.json",boundSourceRegistrySha256:hash(source),
  privateBytesOnlyFromRestrictedReader:true,newPaidDispatchAuthorizedHere:false,independentlyAuthenticatedGHHistoryRequired:true};
 const map=new Map([[route.signedFrozenPath,post],[route.boundSourceRegistryPath,source]]);
 const index:any={redactedSummary:{schema:"v39.phase6.day-epoch-exact-source-pre-post-original-semantics-no-go.v1",
  status:"ED25519_DAY_EPOCH_ORIGINAL_SOURCE_PRE_POST_SEMANTICS_PASS_NO_GO",runDayIndex:1,externallySignedDayEpochIndexSha256:indexSha256,
  reviewedEd25519SourceWasOriginalDayBytes:true,originalV0096GlobalChainNotUsed:true,phase6PaidGo:false}};
 Object.defineProperties(index,{privateRoutingCandidates:{value:[route],enumerable:false},getFrozen:{value:(p:string)=>map.get(p),enumerable:false}});
 return{index,selector,route,map};
}
describe("exact stored POST original admission bridge",()=>{
 it("selects one exact private route with both SHA-bound registry bytes",()=>{
  const f=fixture();expect(selectP6ExactStoredPostRoute(f.index,f.selector)).toBe(f.route);
  expect(JSON.stringify(f.index)).not.toContain(f.route.signedFrozenPath);
 });
 it("rejects forged digest, wrong lane/day, duplicate route, changed source bytes",()=>{
  const f=fixture();expect(()=>selectP6ExactStoredPostRoute(f.index,{...f.selector,indexSha256:hash("other")})).toThrow("UNAUTHENTICATED");
  f.route.lane="SOURCE";expect(()=>selectP6ExactStoredPostRoute(f.index,f.selector)).toThrow("ROUTE_OR_SOURCE_LINK");
  f.route.lane="POST";f.route.runDayIndex=2;expect(()=>selectP6ExactStoredPostRoute(f.index,f.selector)).toThrow("ROUTE_OR_SOURCE_LINK");
  f.route.runDayIndex=1;f.index.privateRoutingCandidates.push(f.route);expect(()=>selectP6ExactStoredPostRoute(f.index,f.selector)).toThrow("MISSING_OR_AMBIGUOUS");
  f.index.privateRoutingCandidates.pop();f.map.set(f.route.boundSourceRegistryPath,Buffer.from("wrong"));
  expect(()=>selectP6ExactStoredPostRoute(f.index,f.selector)).toThrow("PRIVATE_ROUTE_BYTES_DRIFT");
 });
 it("unapproved caller stops before SQL even with a prospective selector",async()=>{
  const f=fixture();let sql=0;
  await expect(inspectP6StoredPostOriginalV0083({readerClient:{query:async()=>{sql++;throw Error("not allowed")}},
   trust:{},selector:f.selector,env:{}})).rejects.toThrow("NO_SEPARATE_STORED_POST_READONLY_SCOPE");
  expect(sql).toBe(0);
 });
});
