import {describe,it,expect} from "vitest";
import {decideP5LaterPreEvidencePath} from
 "../server/lib/disruption/phase5StandaloneLaterPreWithoutT24Decision_v39";
const h=(c:string)=>c.repeat(64);
const permit=(horizon:"T-24h"|"T-6h"|"T-90m")=>({
 horizon,expectedSourceResponseSha256:h("a"),
 independentlyReviewedNativeTEvidenceSha256:h("b")
});
const opt=()=>({
 schema:"v39.phase5.standalone-later-asof-no-t24.v1" as const,
 reviewedProtocolSha256:h("c"),
 reviewedOriginalResponseSha256:h("a"),
 reviewedNativeTSemanticsSha256:h("b"),
 missingT24Class:"HONEST_T24_UNOBSERVED_NOT_BACKFILLED" as const,
 independentLaterAsOfAndMissingnessReviewAttested:true as const
});
describe("opt-in standalone later PRE with honest missing T24",()=>{
 it("preserves original T24 and authenticated witness path",()=>{
  expect(decideP5LaterPreEvidencePath(permit("T-24h"))).toBe("NATIVE_T24");
  for(const horizon of ["T-6h","T-90m"] as const)
   expect(decideP5LaterPreEvidencePath({
    ...permit(horizon),reviewedT24WitnessReceipt:{schema:"already-verified-at-writer"}
   })).toBe("WITNESSED_T24_LATER");
 });
 it.each(["T-6h","T-90m"] as const)(
  "permits %s only with independent matching signed protocol, source and native-T proof",horizon=>{
   expect(decideP5LaterPreEvidencePath({
    ...permit(horizon),reviewedStandaloneLaterNoT24:opt()
   },h("c"))).toBe("STANDALONE_ASOF_LATER_MISSING_T24");
  });
 it("refuses unsigned or forged later-only evidence",()=>{
  const p={...permit("T-6h" as const),reviewedStandaloneLaterNoT24:opt()};
  expect(()=>decideP5LaterPreEvidencePath(p)).toThrow("MISSING_SIGNED_INDEPENDENT_STANDALONE_REVIEW");
  expect(()=>decideP5LaterPreEvidencePath(p,h("d"))).toThrow("MISSING_SIGNED_INDEPENDENT_STANDALONE_REVIEW");
  expect(()=>decideP5LaterPreEvidencePath({...p,reviewedStandaloneLaterNoT24:{
   ...opt(),reviewedOriginalResponseSha256:h("e")
  }},h("c"))).toThrow("MISSING_SIGNED_INDEPENDENT_STANDALONE_REVIEW");
  expect(()=>decideP5LaterPreEvidencePath({...p,reviewedStandaloneLaterNoT24:{
   ...opt(),independentLaterAsOfAndMissingnessReviewAttested:false as never
  }},h("c"))).toThrow("MISSING_SIGNED_INDEPENDENT_STANDALONE_REVIEW");
 });
 it("refuses disguising a missing T24 as witnessed or assigning fallback to T24",()=>{
  const no=permit("T-90m");
  expect(()=>decideP5LaterPreEvidencePath(no)).toThrow("MISSING_SIGNED_INDEPENDENT_STANDALONE_REVIEW");
  expect(()=>decideP5LaterPreEvidencePath({
   ...no,reviewedT24WitnessReceipt:{some:"witness"},
   reviewedStandaloneLaterNoT24:opt()
  },h("c"))).toThrow("CONFLICTING_WITNESS_AND_STANDALONE_TIERS");
  expect(()=>decideP5LaterPreEvidencePath({
   ...permit("T-24h"),reviewedStandaloneLaterNoT24:opt()
  },h("c"))).toThrow("NO_STANDALONE_T24_SUBSTITUTION");
 });
});
