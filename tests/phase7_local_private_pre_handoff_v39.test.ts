import {describe,it,expect} from "vitest";
import {createHash,generateKeyPairSync} from "node:crypto";
import {mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {readP7LocalPreScope,callP7LocalPreRole,listenP7LocalPreRole,makeP7LocalPreRequest,openP7LocalPrivatePreHandoff,validateP7LocalPreRequest,type P7LocalPreRole,type P7LocalPreScope} from "../server/lib/disruption/phase7LocalPrivatePreHandoff_v39";
import {hashPhase7DurableCandidate} from "../server/lib/disruption/phase7DurableDerivedBundleCandidate_v39";
import type {P5Stage14SingleFlightPrePermit} from "../server/lib/disruption/phase5V0079SingleBoundFlightPreWriter_v39";
import type {P7Wire} from "../server/lib/disruption/phase7PrivateSignedReviewTransport_v39";
const h=(x:string)=>createHash("sha256").update(x).digest("hex");
const scope:P7LocalPreScope={codeSha:"a".repeat(40),runId:"1234567",runDayIndex:2,queryDigestSha256:h("query"),manifestSha256:h("manifest"),rightsSha256:h("rights"),releaseSha256:h("release"),providerContractSha256:h("contract")};
const permit=(n:number)=>({manifestSha256:scope.manifestSha256,expectedReviewedSourceRightsSha256:scope.rightsSha256,expectedReviewedReleaseSha256:scope.releaseSha256,expectedProviderContractSha256:scope.providerContractSha256,expectedGithubSourceRunId:scope.runId,runDayIndex:scope.runDayIndex,queryDigestSha256:scope.queryDigestSha256,horizon:"T-6h",selectedTNativeUtc:"2035-11-25T12:00:00.000Z",flightInstanceId:"leg:synthetic-"+n} as P5Stage14SingleFlightPrePermit);
const wires=(p:P5Stage14SingleFlightPrePermit[],kind:string)=>p.map(x=>({permitSha256:hashPhase7DurableCandidate(x),wire:{payloadBase64:Buffer.from(kind+":"+hashPhase7DurableCandidate(x)).toString("base64"),signatureBase64:Buffer.alloc(64,1).toString("base64")}}));
describe("private same-runner PRE handoff transport",()=>{
 it("rejects changed run, query, duplicate permit, role alias and JSON digest drift",()=>{
  const p=permit(1),q=makeP7LocalPreRequest(scope,"issue_lane",[p]);
  expect(()=>validateP7LocalPreRequest(q,scope,"proof")).toThrow("ROLE_OPERATION");
  expect(()=>validateP7LocalPreRequest({...q,permits:[permit(2)]},scope,"lane")).toThrow("REQUEST_DIGEST");
  expect(()=>makeP7LocalPreRequest(scope,"issue_lane",[{...p,expectedGithubSourceRunId:"7654321"}])).toThrow("EXACT_PERMIT_SCOPE");
  expect(()=>makeP7LocalPreRequest(scope,"issue_lane",[p,p])).toThrow("DUPLICATE_PERMIT");
  expect(()=>makeP7LocalPreRequest(scope,"issue_lane",[{...p,optionalUnexpected:undefined} as P5Stage14SingleFlightPrePermit])).toThrow();
 });
 it("uses actual Unix sockets for one exact page, invokes separate handlers in order, refuses replay and checks stored wires",async()=>{
  const dir=mkdtempSync(join(tmpdir(),"p7h-")),paths={lane:join(dir,"l.sock"),proof:join(dir,"p.sock"),publisher:join(dir,"w.sock")};
  const servers:Awaited<ReturnType<typeof listenP7LocalPreRole>>[]=[],events:string[]=[],stored=new Map<string,P7Wire>(),lane=new Map<string,P7Wire>();
  const ps=[permit(1),permit(2)];
  try{
   for(const role of ["lane","proof","publisher"] as P7LocalPreRole[])servers.push(await listenP7LocalPreRole({path:paths[role],role,scope,maxLifetimeMs:30000,handler:async q=>{
    events.push(q.op);
    if(q.op==="issue_lane")return {wires:wires(q.permits,"lane"),committedCount:0};
    if(q.op==="issue_proof"){
     expect(q.permits.every(p=>lane.has(hashPhase7DurableCandidate(p)))).toBe(true);
     return {wires:wires(q.permits,"proof"),committedCount:0};
    }
    for(const x of q.wires)(q.op==="publish_lane"?lane:stored).set(x.permitSha256,x.wire);
    return {wires:[],committedCount:q.permits.length};
   }}));
   const port=openP7LocalPrivatePreHandoff({scope,paths,readStored:async p=>new Map(p.map(x=>[hashPhase7DurableCandidate(x),stored.get(hashPhase7DurableCandidate(x))!]))});
   expect((await port.readExactPermitProofs(ps)).size).toBe(2);
   expect(events).toEqual(["issue_lane","publish_lane","issue_proof","publish_proof"]);
   await expect(port.readExactPermitProofs(ps)).rejects.toThrow("REMOTE_HOLD_NO_REPLAY");
   expect(events).toHaveLength(4);
   await expect(callP7LocalPreRole(paths.proof,makeP7LocalPreRequest(scope,"issue_lane",ps))).rejects.toThrow();
  }finally{await Promise.all(servers.map(x=>x.close()));rmSync(dir,{recursive:true,force:true});}
 });
 it("stops after an unknown publication and never calls signer or publisher again",async()=>{
  const steps:string[]=[];
  const fake=async(_path:string,q:ReturnType<typeof makeP7LocalPreRequest>)=>{
   steps.push(q.op);if(q.op==="publish_lane")throw Error("UNKNOWN_COMMIT");
   return {schema:"v39.phase7.local-pre-handoff-response.v1" as const,requestSha256:q.requestSha256,ok:true as const,wires:wires(q.permits,"lane"),committedCount:0};
  };
  const port=openP7LocalPrivatePreHandoff({scope,paths:{lane:"l",proof:"p",publisher:"w"},call:fake,readStored:async()=>{throw Error("MUST_NOT_READ")}});
  await expect(port.readExactPermitProofs([permit(1)])).rejects.toThrow("UNKNOWN_COMMIT");
  expect(steps).toEqual(["issue_lane","publish_lane"]);
 });
});

import {projectP7LocalRoleEnvironment,readP7ConditionalInstructionRolePolicy} from "../scripts/v39_phase7_local_pre_evidence_roles_v39";
describe("actual protected role credential projection",()=>{
 const base:NodeJS.ProcessEnv={GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"workflow_dispatch",GITHUB_RUN_ATTEMPT:"1",
  GITHUB_WORKFLOW_REF:"HKcode22/ReplitTranvr/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml@refs/heads/main",GITHUB_SHA:scope.codeSha,V39_P5_APPROVED_CODE_SHA:scope.codeSha,
  GITHUB_RUN_ID:scope.runId,P5_SOURCE_BATCH_RUN_DAY_INDEX:String(scope.runDayIndex),P5_SOURCE_CHILD_EXPECTED_QUERY_DIGEST:scope.queryDigestSha256,V39_P5_MANIFEST_SHA256:scope.manifestSha256,V39_P5_RIGHTS_SHA256:scope.rightsSha256,V39_P5_RELEASE_SHA256:scope.releaseSha256,V39_P5_PROVIDER_CONTRACT_SHA256:scope.providerContractSha256,
  ADB_AUTO_COLLECT:"0",V39_PHASE6_PROCESS_ARMED:"0",P6_PHASE7_PRE_SAME_RUNNER_HANDOFF_APPROVED:"1",RUNNER_TRACKING_ID:"synthetic-tracking-id",
  P6_NONPAID_DAILY_POLICY_BASE64:"synthetic-policy",P6_NONPAID_DAILY_POLICY_SHA256:h("daily"),GITHUB_TOKEN:"must-not-forward",ACTIONS_RUNTIME_TOKEN:"must-not-forward"};
 const source="postgresql://phase5_p5_source_login_20261108:fake@ep-ci.example.neon.tech/neondb?sslmode=require";
 const endpoint=new URL(source);endpoint.password="";
 const lane={...base,V39_P5_SOURCE_DATABASE_URL:source,P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_PRIVATE_KEY_BASE64:"synthetic-lane-key",P6_PHASE7_PRE_REFERENCE_LINK_POLICY_BASE64:"synthetic-link-policy",P6_PHASE7_PRE_REFERENCE_LINK_POLICY_SHA256:h("link")};
 const proof={...base,V39_P5_SOURCE_DATABASE_URL:source,P6_PHASE7_PRE_PROOF_REVIEWER_PRIVATE_KEY_BASE64:"synthetic-proof-key",P6_PRIVATE_READER_DATABASE_URL:"synthetic-reader-url",
  P6_PHASE7_PRIVATE_REVIEW_TRANSPORT_APPROVED:"1",P6_PHASE7_PRIVATE_REVIEW_READER_LOGIN:"synthetic-reader",P6_PHASE7_PRIVATE_REVIEW_PUBLISHER_LOGIN:"synthetic-publisher"};
 const publisher={...base,P6_PRIVATE_READER_DATABASE_URL:"synthetic-reader-url",P6_PRIVATE_PUBLISHER_DATABASE_URL:"synthetic-publisher-url",P6_PHASE7_PRIVATE_REVIEW_TRANSPORT_APPROVED:"1",P6_PHASE7_PRIVATE_REVIEW_PUBLISH_APPROVED:"1",P6_PHASE7_PRIVATE_REVIEW_READER_LOGIN:"synthetic-reader",P6_PHASE7_PRIVATE_REVIEW_PUBLISHER_LOGIN:"synthetic-publisher"};
 it("exact approved successor survives every actual restricted role environment projection",()=>{
  const old="9c9cddb1aaeb04934d94af2937ee158e6d991f6c",head="7".repeat(40);
  const successor={GITHUB_SHA:head,V39_P5_APPROVED_CODE_SHA:old,P6_PHASE5B_RUNTIME_EXECUTABLE_SHA:head};
  for(const [role,env] of [["lane",lane],["proof",proof],["publisher",publisher]] as const){
   const projected=projectP7LocalRoleEnvironment({...env,...successor},role,role==="publisher"?endpoint.toString():undefined);
   expect(projected.P6_PHASE5B_RUNTIME_EXECUTABLE_SHA).toBe(head);
   expect(projected.V39_P5_APPROVED_CODE_SHA).toBe(old);
   expect(readP7LocalPreScope(projected).codeSha).toBe(head);
   expect(projected.GITHUB_TOKEN).toBeUndefined();
   expect(projected.ACTIONS_RUNTIME_TOKEN).toBeUndefined();
   for(const delta of [{P6_PHASE5B_RUNTIME_EXECUTABLE_SHA:""},{P6_PHASE5B_RUNTIME_EXECUTABLE_SHA:"8".repeat(40)},{GITHUB_RUN_ATTEMPT:"2"},{AERODATABOX_API_KEY:"forbidden"}])
    expect(()=>projectP7LocalRoleEnvironment({...env,...successor,...delta},role,role==="publisher"?endpoint.toString():undefined)).toThrow("PROTECTED_NO_PROVIDER_SCOPE");
  }
 });
 it("T034 exact protected conditional role policy survives successor projection and authenticates the pinned day plan",()=>{
  const stable="9c9cddb1aaeb04934d94af2937ee158e6d991f6c",head="7".repeat(40);
  const dk=generateKeyPairSync("ed25519").publicKey,qk=generateKeyPairSync("ed25519").publicKey;
  const fingerprint=(k:typeof dk)=>createHash("sha256").update(k.export({format:"der",type:"spki"})).digest("hex");
  const plan=Buffer.from(JSON.stringify({schema:"v39.phase6.reviewed-future-day-source-plan.v1",runDayIndex:scope.runDayIndex,reviewedRefreshTiming:{maxPopulationStalenessSeconds:3600}}));
  const planHash=createHash("sha256").update(plan).digest("hex"),calendar=h("calendar"),protocol=h("protocol"),review=h("conditional review");
  const trust={independentStudyTrustPinsApproved:true,expectedReaderSessionLogin:"phase6_private_reader_login_ci_fixture",reviewedCodeSha:stable,manifestSha256:scope.manifestSha256,calendarSha256:calendar,releaseSha256:scope.releaseSha256,rightsSha256:scope.rightsSha256,dayReviewerFingerprintSha256:fingerprint(dk),dayReviewerPublicKeyPem:dk.export({format:"pem",type:"spki"}).toString(),queryReviewerFingerprintSha256:fingerprint(qk),queryReviewerPublicKeyPem:qk.export({format:"pem",type:"spki"}).toString()};
  const daily={schema:"v39.phase6.delegated-daily-source-review-policy.v1",delegatedDailyPacketProductionApproved:true,approvedCodeSha:stable,manifestSha256:scope.manifestSha256,calendarSha256:calendar,releaseSha256:scope.releaseSha256,rightsSha256:scope.rightsSha256,providerContractSha256:scope.providerContractSha256,dayPlanSha256s:Array.from({length:31},(_,i)=>({runDayIndex:i+1,sha256:i+1===scope.runDayIndex?planHash:h("day "+(i+1))})),conditionalPreFeatureReview:{schema:"v39.phase5.conditional-pre-feature-review-policy.v1",approved:true,rightsSha256:scope.rightsSha256,protocolSha256:protocol,externalContentUseReviewSha256:review}};
  const bytes=Buffer.from(JSON.stringify(daily)),pins={GITHUB_SHA:head,V39_P5_APPROVED_CODE_SHA:stable,P6_PHASE5B_RUNTIME_EXECUTABLE_SHA:head,P6_NONPAID_DAILY_POLICY_BASE64:bytes.toString("base64"),P6_NONPAID_DAILY_POLICY_SHA256:createHash("sha256").update(bytes).digest("hex"),P6_PRIVATE_SOURCE_STORED_REVIEW_APPROVED:"1",P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64:Buffer.from(JSON.stringify(trust)).toString("base64"),P6_PRIVATE_DAY_INDEX_REVISION:"3",P6_PRIVATE_DAY_INDEX_SHA256:h("index"),P6_CONDITIONAL_SERVICE_PROTOCOL_SHA256:protocol};
  const read=((path:unknown)=>{expect(path).toBe("data-collection/phase5/planning/phase6-source-day-02.json");return plan;}) as typeof import("node:fs").readFileSync;
  for(const [role,env] of [["lane",lane],["proof",proof]] as const){
   const projected=projectP7LocalRoleEnvironment({...env,...pins},role);
   const got=readP7ConditionalInstructionRolePolicy(projected,read);
   expect(got).toMatchObject({expectedSourceRunId:scope.runId,selector:{runDayIndex:2,indexRevision:3,indexSha256:h("index"),queryDigestSha256:scope.queryDigestSha256},policy:{maximumPopulationStalenessSeconds:3600,conditionalPreFeatureReview:daily.conditionalPreFeatureReview}});
   expect(got.trust.reviewedCodeSha).toBe(stable);
   for(const bad of [{P6_PRIVATE_DAY_INDEX_REVISION:"0"},{P6_CONDITIONAL_SERVICE_PROTOCOL_SHA256:h("different protocol")},{P6_NONPAID_DAILY_POLICY_SHA256:h("wrong daily")}]){
    expect(()=>readP7ConditionalInstructionRolePolicy({...projected,...bad},read)).toThrow("CONDITIONAL_INSTRUCTION_POLICY");
   }
   expect(()=>readP7ConditionalInstructionRolePolicy(projected,(()=>Buffer.from("{}")) as typeof import("node:fs").readFileSync)).toThrow("CONDITIONAL_INSTRUCTION_DAY_PLAN");
  }
  const pub=projectP7LocalRoleEnvironment({...publisher,...pins},"publisher",endpoint.toString());
  expect(pub.P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64).toBeUndefined();expect(pub.P6_CONDITIONAL_SERVICE_PROTOCOL_SHA256).toBeUndefined();
 });
 it("does not forward other keys, tokens, or the source password to publisher",()=>{
  const l=projectP7LocalRoleEnvironment(lane,"lane"),p=projectP7LocalRoleEnvironment(proof,"proof"),w=projectP7LocalRoleEnvironment(publisher,"publisher",endpoint.toString());
  expect(l.P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_PRIVATE_KEY_BASE64).toBe("synthetic-lane-key");expect(l.P6_PRIVATE_READER_DATABASE_URL).toBeUndefined();
  expect(p.P6_PHASE7_PRE_PROOF_REVIEWER_PRIVATE_KEY_BASE64).toBe("synthetic-proof-key");expect(p.P6_PRIVATE_PUBLISHER_DATABASE_URL).toBeUndefined();
  expect(new URL(w.V39_P5_SOURCE_DATABASE_URL!).password).toBe("");
  for(const x of [l,p,w]){expect(x.GITHUB_TOKEN).toBeUndefined();expect(x.ACTIONS_RUNTIME_TOKEN).toBeUndefined();}
  expect(Object.keys(w).filter(k=>k.includes("PRIVATE_KEY"))).toEqual([]);
  expect(()=>projectP7LocalRoleEnvironment({...lane,P6_PHASE7_PRE_PROOF_REVIEWER_PRIVATE_KEY_BASE64:"not allowed"},"lane")).toThrow("CROSS_ROLE_LAUNCH_CREDENTIALS");
  expect(()=>projectP7LocalRoleEnvironment({...publisher,V39_P5_SOURCE_DATABASE_URL:source},"publisher",endpoint.toString())).toThrow("PUBLISHER_SOURCE_CREDENTIAL");
  expect(()=>projectP7LocalRoleEnvironment({...proof,AERODATABOX_API_KEY:"not allowed"},"proof")).toThrow("PROTECTED_NO_PROVIDER_SCOPE");
 });
});

describe("T034 conditional instructions private role transport",()=>{
 const p={...permit(1),identityEvidenceTier:"CONDITIONAL_QUERY_FILTERED_SERVICE"} as P5Stage14SingleFlightPrePermit;
 const proof={schema:"fixture-only transport",opaque:"signed instruction bytes"};
 it("requires proof only on separate conditional issue operations; refuses mixed pages and publisher/control proof",()=>{
  expect(()=>makeP7LocalPreRequest(scope,"issue_lane",[p])).toThrow("CONDITIONAL_INSTRUCTION_SCOPE");
  expect(()=>makeP7LocalPreRequest(scope,"issue_lane",[p,permit(2)],[],proof)).toThrow("MIXED_IDENTITY_TIERS");
  expect(()=>makeP7LocalPreRequest(scope,"issue_lane",[permit(2)],[],proof)).toThrow("CONDITIONAL_INSTRUCTION_SCOPE");
  expect(()=>makeP7LocalPreRequest(scope,"publish_lane",[p],wires([p],"lane"),proof)).toThrow("CONDITIONAL_INSTRUCTION_SCOPE");
  expect(()=>makeP7LocalPreRequest(scope,"ready",[],[],proof)).toThrow("CONTROL_SCOPE");
  const q=makeP7LocalPreRequest(scope,"issue_lane",[p],[],proof);
  expect(()=>validateP7LocalPreRequest({...q,conditionalSourceProof:{...proof,opaque:"changed"}},scope,"lane")).toThrow("REQUEST_DIGEST");
 });
 it("same exact instructions are passed to both independent signers, never the publisher",async()=>{
  const steps:string[]=[],seen:unknown[]=[];let fetched=0;
  const port=openP7LocalPrivatePreHandoff({scope,paths:{lane:"l",proof:"p",publisher:"w"},
   readConditionalInstructionProof:async()=>{fetched++;return proof},
   call:async(_path,q)=>{steps.push(q.op);seen.push(q.conditionalSourceProof);
    return {schema:"v39.phase7.local-pre-handoff-response.v1" as const,requestSha256:q.requestSha256,ok:true as const,wires:q.op.startsWith("issue")?wires(q.permits,q.op==="issue_lane"?"lane":"proof"):[],committedCount:q.op.startsWith("publish")?q.permits.length:0};},
   readStored:async ps=>new Map(wires([...ps],"proof").map(x=>[x.permitSha256,x.wire]))});
  expect((await port.readExactPermitProofs([p])).size).toBe(1);expect(fetched).toBe(1);
  expect(steps).toEqual(["issue_lane","publish_lane","issue_proof","publish_proof"]);
  expect(seen).toEqual([proof,undefined,proof,undefined]);
 });
 it("refuses changed conditional proof replay for the same permit on an actual Unix socket",async()=>{
  const dir=mkdtempSync(join(tmpdir(),"p7-cond-")),path=join(dir,"lane.sock");let calls=0;
  const server=await listenP7LocalPreRole({path,role:"lane",scope,maxLifetimeMs:30000,handler:async q=>{calls++;return {wires:wires(q.permits,"lane"),committedCount:0}}});
  try{await callP7LocalPreRole(path,makeP7LocalPreRequest(scope,"issue_lane",[p],[],proof));
   await expect(callP7LocalPreRole(path,makeP7LocalPreRequest(scope,"issue_lane",[p],[],{...proof,opaque:"different"}))).rejects.toThrow("REMOTE_HOLD_NO_REPLAY");expect(calls).toBe(1);
  }finally{await server.close();rmSync(dir,{recursive:true,force:true});}
 });
});

it("T049 real local conditional T24 review transport accepts exact anchor and member list only on lane; replay cannot issue again",async()=>{
 const dir=mkdtempSync(join(tmpdir(),"p7r-")),paths={lane:join(dir,"l.sock"),proof:join(dir,"p.sock"),publisher:join(dir,"w.sock")};
 const id="leg:g5a:"+h("service"),request={anchor:{sourceGithubRunId:scope.runId,populationQueryId:"a23e4567-e89b-42d3-a456-426614174000",responseSha256:h("response")},flightInstanceIds:[id]};
 const proof={schema:"synthetic instruction"},review={page:{schema:"v39.phase5.conditional-pre-external-review-page.v1" as const,reviewedCodeSha:scope.codeSha,
 manifestSha256:scope.manifestSha256,rightsSha256:scope.rightsSha256,protocolSha256:h("protocol"),externalContentUseReviewSha256:h("contents"),
 queryDigestSha256:scope.queryDigestSha256,populationQueryId:request.anchor.populationQueryId,responseSha256:request.anchor.responseSha256,
 runDayIndex:scope.runDayIndex,horizon:"T-24h",sourceGithubRunId:scope.runId,reviews:[{flightInstanceId:id,reviewArtifactBase64:"fixture",reviewArtifactSha256:h("artifact")}]},
 signatureBase64:Buffer.alloc(64,1).toString("base64")};
 let called=0;
 const server=await listenP7LocalPreRole({path:paths.lane,role:"lane",scope,maxLifetimeMs:30000,handler:async q=>{
  called++;expect(q.op).toBe("issue_conditional_t24_review");expect(q.conditionalT24Review).toEqual(request);expect(q.conditionalSourceProof).toEqual(proof);
  return {wires:[],committedCount:0,conditionalReviewWire:review};
 }});
 try{
  const port=openP7LocalPrivatePreHandoff({scope,paths,readStored:async()=>new Map(),readConditionalT24ReviewInstructionProof:async()=>proof});
  const q=makeP7LocalPreRequest(scope,"issue_conditional_t24_review",[],[],proof,request);
  expect(()=>validateP7LocalPreRequest(q,scope,"proof")).toThrow("ROLE_OPERATION");
  expect(()=>makeP7LocalPreRequest(scope,"issue_conditional_t24_review",[],[],proof,{...request,flightInstanceIds:[id,id]})).toThrow("CONDITIONAL_REVIEW_REQUEST_SCOPE");
  expect(()=>makeP7LocalPreRequest(scope,"issue_conditional_t24_review",[],[],proof,{...request,anchor:{...request.anchor,sourceGithubRunId:"999999"}})).toThrow("CONDITIONAL_REVIEW_REQUEST_SCOPE");
  expect(await port.readConditionalT24Review(request)).toEqual(review);
  await expect(port.readConditionalT24Review(request)).rejects.toThrow("REMOTE_HOLD_NO_REPLAY");
  await expect(callP7LocalPreRole(paths.lane,makeP7LocalPreRequest(scope,"issue_conditional_t24_review",[],[],{...proof,extra:true},request))).rejects.toThrow("REMOTE_HOLD_NO_REPLAY");
  expect(called).toBe(1);
 }finally{await server.close();rmSync(dir,{recursive:true,force:true});}
});

it("T064 separate later review socket accepts exact subset or explicit no-review, rejects replay and wrong horizon",async()=>{
 const dir=mkdtempSync(join(tmpdir(),"p7lr-")),paths={lane:join(dir,"l.sock"),proof:join(dir,"p.sock"),publisher:join(dir,"w.sock")};
 const ids=["leg:g5a:"+h("a"),"leg:g5a:"+h("b"),"leg:g5a:"+h("c"),"leg:g5a:"+h("d"),"leg:g5a:"+h("e")];
 const request={anchor:{sourceGithubRunId:scope.runId,populationQueryId:"a23e4567-e89b-42d3-a456-426614174000",responseSha256:h("response")},flightInstanceIds:ids.slice(0,2),horizon:"T-6h" as const};
 const proof={schema:"synthetic later instruction"},review={page:{schema:"v39.phase5.conditional-pre-external-review-page.v1" as const,reviewedCodeSha:scope.codeSha,
  manifestSha256:scope.manifestSha256,rightsSha256:scope.rightsSha256,protocolSha256:h("protocol"),externalContentUseReviewSha256:h("contents"),
  queryDigestSha256:scope.queryDigestSha256,populationQueryId:request.anchor.populationQueryId,responseSha256:request.anchor.responseSha256,
  runDayIndex:scope.runDayIndex,horizon:"T-6h",sourceGithubRunId:scope.runId,reviews:[{flightInstanceId:ids[0],reviewArtifactBase64:"fixture",reviewArtifactSha256:h("artifact")}]},signatureBase64:Buffer.alloc(64,1).toString("base64")};
 let called=0;
 const server=await listenP7LocalPreRole({path:paths.lane,role:"lane",scope,maxLifetimeMs:30000,handler:async q=>{
  called++;expect(q.op).toBe("issue_conditional_later_review");expect(q.conditionalSourceProof).toEqual(proof);
  return {wires:[],committedCount:0,conditionalLaterReviewWire:called===1?review:called===2?null:called===4?undefined:{...review,page:{...review.page,horizon:"T-90m",reviews:[{...review.page.reviews[0],flightInstanceId:ids[3]}]}}};
 }});
 try{
  const port=openP7LocalPrivatePreHandoff({scope,paths,readStored:async()=>new Map(),readConditionalLaterReviewInstructionProof:async()=>proof});
  const q=makeP7LocalPreRequest(scope,"issue_conditional_later_review",[],[],proof,undefined,request);
  expect(()=>validateP7LocalPreRequest(q,scope,"proof")).toThrow("ROLE_OPERATION");
  expect(()=>makeP7LocalPreRequest(scope,"issue_conditional_later_review",[],[],proof,undefined,{...request,horizon:"T-24h" as any})).toThrow("CONDITIONAL_REVIEW_REQUEST_SCOPE");
  expect(await port.readConditionalLaterReview(request)).toEqual(review);
  await expect(port.readConditionalLaterReview(request)).rejects.toThrow("REMOTE_HOLD_NO_REPLAY");
  expect(await port.readConditionalLaterReview({...request,flightInstanceIds:[ids[2]]})).toBeNull();
  await expect(port.readConditionalLaterReview({...request,flightInstanceIds:[ids[3]]})).rejects.toThrow("REMOTE_HOLD_NO_REPLAY");
  await expect(port.readConditionalLaterReview({...request,flightInstanceIds:[ids[4]]})).rejects.toThrow("REMOTE_HOLD_NO_REPLAY");
  expect(called).toBe(4);
 }finally{await server.close();rmSync(dir,{recursive:true,force:true});}
});
