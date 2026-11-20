import {it,expect} from "vitest";
import {createHash} from "node:crypto";
import {validateP7OwnerPolicyDecision,P7_MONDAY_FIRST_SOURCE,P7_MONDAY_OUTCOME_TAIL} from "../review-tools/p7_commission_pre_policy_owner_v39";
const h=(s:string|Buffer)=>createHash("sha256").update(s).digest("hex");
it("requires independently reviewed exact bytes, prospective scope and settled terms evidence",()=>{
 const stage={stageCode:"a".repeat(40),stageSha256:h("stage"),costSha256:h("cost"),manifestSha256:h("manifest"),boundedTermsSha256:h("settled terms")};
 const policy=Buffer.from("synthetic private policy"),now=new Date("2026-11-20T12:00:00.000Z");
 const d={schema:"v39.phase7.pre-policy-owner-commission-review.v1",...stage,rightsSha256:h("rights"),policyBytesSha256:h(policy),policyReviewSha256:h("profile"),validFromUtc:"2026-11-20T00:00:00.000Z",validUntilUtc:"2026-12-30T00:00:00.000Z",firstSourceUtc:P7_MONDAY_FIRST_SOURCE,outcomeTailUtc:P7_MONDAY_OUTCOME_TAIL,reviewedAtUtc:"2026-11-20T10:00:00.000Z",reviewedBy:"synthetic CI reviewer",independentFieldProfileApproved:true,independentMappingAndReconstructionReviewApproved:true,originalScientificDesignPreserved:true,sourceUseDeferred:true,phase6PaidGo:false};
 const check=(x:unknown,p=policy)=>{const raw=Buffer.from(JSON.stringify(x));return validateP7OwnerPolicyDecision(raw,h(raw),stage,p,now)};
 expect(check(d)).toMatchObject({manifestSha256:stage.manifestSha256,policyBytesSha256:h(policy),firstSourceUtc:P7_MONDAY_FIRST_SOURCE});
 for(const bad of [{...d,independentFieldProfileApproved:false},{...d,phase6PaidGo:true},{...d,boundedTermsSha256:h("other")},{...d,stageSha256:h("other")},{...d,outcomeTailUtc:"2026-12-26T04:00:00.000Z"},{...d,extra:"not allowed"}])expect(()=>check(bad)).toThrow("INDEPENDENT_SCOPE");
 expect(()=>check(d,Buffer.from("different"))).toThrow("INDEPENDENT_SCOPE");
 expect(()=>check({...d,reviewedAtUtc:"2026-11-20T12:00:00.001Z"})).toThrow("REVIEW_CLOCK");
 const bytes=Buffer.from(JSON.stringify(d));expect(()=>validateP7OwnerPolicyDecision(bytes,h("wrong"),stage,policy,now)).toThrow("EXACT_COMMITTED_DECISION");
});
