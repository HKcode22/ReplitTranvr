import {describe,it,expect} from "vitest";
import {createHash,generateKeyPairSync,sign} from "node:crypto";
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {execFileSync} from "node:child_process";
import {mergeP7VerifiedNoaaIntoBoundPreBundle,verifyP7IndependentPublicNoaaArtifact} from "../server/lib/disruption/phase7IndependentNoaaReceipt_v39";
import {openP7NoaaGithubArchiveReader,readP7LatestReviewedPublicNoaaSnapshot,readP7NoaaZipMembers} from "../server/lib/disruption/phase7NoaaGithubArchiveReader_v39";
import {P7_NOAA_PRODUCTION_WORKFLOW,P7_NOAA_PRODUCTION_RAW,P7_NOAA_PRODUCTION_REVIEW} from "../server/lib/disruption/phase7NoaaProductionArchivePlan_v39";
import type {P5Stage14SingleFlightPrePermit} from "../server/lib/disruption/phase5V0079SingleBoundFlightPreWriter_v39";
import type {P5EReviewedSupplementalBundle} from "../server/lib/disruption/phase5AmendmentESignedSupplementalFeatures_v39";
import {verifyP7NoaaArchive,issueP7NoaaArchiveWires} from "../server/lib/disruption/phase7NoaaPublicArchive_v39";
import {signP7PublicNoaaSnapshot,verifyP7PublicNoaaSnapshot,makeP7PublicWeatherSnapshotPort} from "../server/lib/disruption/phase7NoaaProductionReviewedSnapshot_v39";
const h=(x:Buffer|string)=>createHash("sha256").update(x).digest("hex");
function fixture(withWeather=false){
 const key=generateKeyPairSync("ed25519"),code="c".repeat(40),run="1234567890",art="9876543210",at="2026-11-23T23:11:00.000Z",reviewed="2026-11-23T23:12:02.000Z",zip=Buffer.alloc(512,6),stations=["KDEC","OMAA"],metar=withWeather?JSON.stringify([{icaoId:"OMAA",obsTime:Date.parse("2026-11-23T23:00:00.000Z")/1000,reportTime:"2026-11-23 23:05:00.000Z",visib:"10+",wspd:12}]):"[]",taf="[]";
 const env={GITHUB_SHA:code,V39_P5_APPROVED_CODE_SHA:code,ADB_AUTO_COLLECT:"0",V39_PHASE6_PROCESS_ARMED:"0",P6_PHASE7_NOAA_ARCHIVE_ISSUER_APPROVED:"1",P6_PHASE7_NOAA_SOURCE_PURPOSE_SHA256:h("purpose"),P6_PHASE7_PRE_PRESERVATION_POLICY_SHA256:h("policy"),V39_P5_MANIFEST_SHA256:h("manifest"),V39_P5_RIGHTS_SHA256:h("rights"),P6_PHASE7_PRE_PROOF_REVIEWER_FINGERPRINT_SHA256:h(key.publicKey.export({type:"spki",format:"der"})),P6_PHASE7_PRE_PROOF_REVIEWER_PUBLIC_KEY_BASE64:Buffer.from(key.publicKey.export({type:"spki",format:"pem"})).toString("base64")};
 const capture={schema:"v39.phase7.noaa-public-source-production.v1",githubRunId:run,codeSha:code,sources:["METAR","TAF"].map(kind=>({kind,requestedAirports:stations,fetchedAtUtc:at,sourceBodySha256:h(kind==="METAR"?metar:taf),httpStatus:kind==="METAR"&&withWeather?200:204}))};
 const verified=verifyP7NoaaArchive({capture,metar,taf,githubRunId:run,codeSha:code,githubArtifactId:art,artifactDigest:h(zip),archiveBytes:zip,artifactCreatedAtUtc:"2026-11-23T23:12:00.000Z",durableReadAtUtc:"2026-11-23T23:12:01.000Z",reviewedAtUtc:reviewed,expectedProductionStations:stations});
 const wires=issueP7NoaaArchiveWires({env,signer:key.privateKey,verified,metar,taf});
 const snapshot=signP7PublicNoaaSnapshot(env,key.privateKey,{githubRunId:run,rawArtifactId:art,rawArchiveSha256:h(zip),scopeAtUtc:at,reviewedAtUtc:reviewed,groups:[stations],wires});
 return {env,snapshot,key,run,art,at,reviewed,wires};
}
describe("complete signed public weather reviewed snapshot",()=>{
 it("binds all raw archive identifiers and exact station groups",()=>{
  const f=fixture(),v=verifyP7PublicNoaaSnapshot(f.env,f.snapshot);
  expect(v.stationCount).toBe(2);expect(v.githubRunId).toBe(f.run);
  expect(()=>verifyP7PublicNoaaSnapshot(f.env,{...f.snapshot,wires:[f.wires[0]]})).toThrow("SNAPSHOT_SHAPE");
  expect(()=>verifyP7PublicNoaaSnapshot(f.env,{...f.snapshot,wires:[f.wires[1],f.wires[0]]})).toThrow("WIRE_BYTES");
  expect(()=>verifyP7PublicNoaaSnapshot({...f.env,GITHUB_SHA:"d".repeat(40),V39_P5_APPROVED_CODE_SHA:"d".repeat(40)},f.snapshot)).toThrow("SNAPSHOT_SCOPE");
  const p=JSON.parse(Buffer.from(f.snapshot.payloadBase64,"base64").toString("utf8"));p.groups=[["KDEC","OMAA","SPJC"]];
  const b=Buffer.from(JSON.stringify(p));
  expect(()=>verifyP7PublicNoaaSnapshot(f.env,{...f.snapshot,payloadBase64:b.toString("base64"),signatureBase64:sign(null,b,f.key.privateKey).toString("base64")})).toThrow("EXACT_WIRE_SCOPE");
 });
 it("uses only as-of reviewed, relevant public station data and explicit absent/stale snapshots",async()=>{
  const f=fixture(),p=makeP7PublicWeatherSnapshotPort(f.env,f.snapshot);
  expect(await p.readReviewedWeatherArtifacts({airports:["OMAA"],observedDbClockUtc:"2026-11-23T23:13:00.000Z"})).toHaveLength(2);
  expect(await p.readReviewedWeatherArtifacts({airports:["SPJC"],observedDbClockUtc:"2026-11-23T23:13:00.000Z"})).toEqual([]);
  expect(await p.readReviewedWeatherArtifacts({airports:["OMAA"],observedDbClockUtc:"2026-11-23T23:11:30.000Z"})).toEqual([]);
  expect(await p.readReviewedWeatherArtifacts({airports:["OMAA"],observedDbClockUtc:"2026-11-24T02:12:00.000Z"})).toEqual([]);
  expect(await makeP7PublicWeatherSnapshotPort(f.env,null).readReviewedWeatherArtifacts({airports:["OMAA"],observedDbClockUtc:f.reviewed})).toEqual([]);
 });
});

it("both independent roles can reject omission, alteration and mismatched frozen weather clock, including explicit absent archive",async()=>{
 const f=fixture(true),port=makeP7PublicWeatherSnapshotPort(f.env,f.snapshot),asOf="2026-11-23T23:13:00.000Z",target="2026-11-24T05:30:00.000Z",id="leg:synthetic-weather-1";
 const s={flightInstanceId:id,originIcao:"OMAA",destinationIcao:"KDEC",memberAvailableAtUtc:"2026-11-23T23:10:00.000Z",observedDbClockUtc:"2026-11-23T23:14:00.000Z"};
 const b:P5EReviewedSupplementalBundle={schema:"v39.phase5.e-signed-source-supplement.v1",flightInstanceId:id,populationQueryId:"synthetic-query",originalResponseSha256:h("original"),externalSourceAndContentsReviewReceiptSha256:h("content review"),fields:["operating_carrier"],observations:[],observationsSha256:h("[]")};
 const wires=await port.readReviewedWeatherArtifacts({airports:["OMAA","KDEC"],observedDbClockUtc:asOf}),compiled=mergeP7VerifiedNoaaIntoBoundPreBundle(b,{flightInstanceId:id,originIcao:"OMAA",destinationIcao:"KDEC",selectedNativeTUtc:target,ownCutoffUtc:"2026-11-23T23:30:00.000Z",observedDbClockUtc:asOf},wires.map(w=>verifyP7IndependentPublicNoaaArtifact(f.env,w,asOf))).privateBundle;
 expect(compiled.observations.map(x=>[x.field,x.value])).toEqual([["origin_metar_wind_kt",12]]);
 const bound:P5EReviewedSupplementalBundle={...compiled,phase7WeatherArchive:{schema:"v39.phase7.public-weather-selection-binding.v1",snapshotSha256:port.snapshotSha256,selectedAsOfUtc:asOf}};
 const permit={flightInstanceId:id,airportIcao:"OMAA",horizon:"T-6h",selectedTNativeUtc:target,reviewedSupplementalFeatureBundle:bound} as P5Stage14SingleFlightPrePermit;
 expect(await port.verifyExactWeatherSelection(permit,s)).toEqual(wires);
 const omitted={...bound,observations:[],observationsSha256:h("[]")};
 await expect(port.verifyExactWeatherSelection({...permit,reviewedSupplementalFeatureBundle:omitted},s)).rejects.toThrow("EXACT_PRESENT_AND_MISSING");
 await expect(port.verifyExactWeatherSelection({...permit,reviewedSupplementalFeatureBundle:{...bound,phase7WeatherArchive:{...bound.phase7WeatherArchive!,selectedAsOfUtc:"2026-11-23T23:15:00.000Z"}}},s)).rejects.toThrow("FROZEN_WEATHER_SCOPE");
 await expect(port.verifyExactWeatherSelection({...permit,reviewedSupplementalFeatureBundle:{...bound,phase7WeatherArchive:{...bound.phase7WeatherArchive!,snapshotSha256:null}}},s)).rejects.toThrow("FROZEN_WEATHER_SCOPE");
 const missing=makeP7PublicWeatherSnapshotPort(f.env,null),empty={...omitted,phase7WeatherArchive:{...bound.phase7WeatherArchive!,snapshotSha256:null}};
 expect(await missing.verifyExactWeatherSelection({...permit,reviewedSupplementalFeatureBundle:empty},s)).toEqual([]);
});
describe("actual ZIP byte reader and bounded GitHub metadata path",()=>{
 function zipFile(name:string,content:string){
  const dir=mkdtempSync(join(tmpdir(),"p7-test-zip-"));
  try{writeFileSync(join(dir,name),content);execFileSync("zip",["-q","archive.zip",name],{cwd:dir,timeout:5000,stdio:"ignore"});return readFileSync(join(dir,"archive.zip"))}
  finally{rmSync(dir,{recursive:true,force:true})}
 }
 function readerFixture(){
  const f=fixture(),zip=zipFile("reviewed.json",JSON.stringify(f.snapshot)),rawId=Number(f.art),reviewId=9876543211,runId=Number(f.run),clock="2026-11-23T23:20:00.000Z";
  const run={id:runId,head_sha:f.env.GITHUB_SHA,head_branch:"main",head_repository:{full_name:"HKcode22/ReplitTranvr"},path:P7_NOAA_PRODUCTION_WORKFLOW,event:"schedule",run_attempt:1,created_at:"2026-11-23T23:10:00Z",run_started_at:"2026-11-23T23:10:00Z",updated_at:"2026-11-23T23:14:00Z",status:"completed",conclusion:"success"};
  const common={expired:false,expires_at:"2027-02-21T23:15:00Z",workflow_run:{id:runId,head_sha:run.head_sha,head_branch:"main"}};
  const raw={...common,id:rawId,name:P7_NOAA_PRODUCTION_RAW,digest:"sha256:"+h(Buffer.alloc(512,6)),size_in_bytes:512,created_at:"2026-11-23T23:12:00Z"};
  const review={...common,id:reviewId,name:P7_NOAA_PRODUCTION_REVIEW,digest:"sha256:"+h(zip),size_in_bytes:zip.length,created_at:"2026-11-23T23:13:00Z"};
  const plans=Array.from({length:31},(_,i)=>({runDayIndex:i+1,pairedIcaos:{HUB:"OMAA",MID_A:"KSFO",MID_B:"KSEA",REGIONAL:"KDEC"},templates:["HUB","REGIONAL"].map(slot=>({slot,scheduledRequestUtc:new Date(Date.parse("2026-11-23T23:45:00.000Z")+86400000*i).toISOString()}))}));
  const calls:string[]=[],token="synthetic-read-token";
  let wire=zip,artifactList=[raw,review],runList=[run];
  const http=async(input:URL|RequestInfo,init?:RequestInit)=>{
   const u=new URL(String(input));calls.push(u.hostname+u.pathname);const headers=new Headers(init?.headers);
   if(u.hostname==="example.invalid"){
    expect(headers.has("Authorization")).toBe(false);
    return new Response(new Uint8Array(wire),{status:200});
   }
   expect(u.hostname).toBe("api.github.com");expect(headers.get("Authorization")).toBe("Bearer "+token);
   expect(init?.redirect).toBe("manual");
   if(u.pathname.endsWith("/runs")&&u.pathname.includes("/workflows/"))return Response.json({total_count:runList.length,workflow_runs:runList});
   if(u.pathname.endsWith("/runs/"+runId+"/artifacts"))return Response.json({total_count:artifactList.length,artifacts:artifactList});
   if(u.pathname.endsWith("/artifacts/"+rawId))return Response.json(raw);
   if(u.pathname.endsWith("/artifacts/"+reviewId))return Response.json(review);
   if(u.pathname.endsWith("/artifacts/"+reviewId+"/zip"))return new Response(null,{status:302,headers:{location:"https://example.invalid/public-weather-zip"}});
   throw Error("UNEXPECTED_HTTP");
  };
  const reader=openP7NoaaGithubArchiveReader(token,http as typeof fetch);
  return {f,zip,clock,plans,reader,calls,run,raw,review,read:()=>readP7LatestReviewedPublicNoaaSnapshot({env:f.env,clockUtc:clock,plans,reader}),alterBytes:()=>{wire=Buffer.from(zip);wire[0]^=1;},partial:()=>{artifactList=[raw]},empty:()=>{runList=[]}};
 }
 it("reads actual bounded ZIP bytes and authenticates complete exact prior snapshot; no forwarded token",async()=>{
  const x=readerFixture();
  expect(Object.keys(readP7NoaaZipMembers(x.zip,{"reviewed.json":1000000}))).toEqual(["reviewed.json"]);
  expect(()=>readP7NoaaZipMembers(x.zip,{"not-reviewed.json":1000})).toThrow("EXACT_ZIP_MEMBERS");
  expect(await x.read()).toMatchObject({status:"EXACT_REVIEWED_PUBLIC_NOAA_SNAPSHOT_READY",stationCount:2,receiptCount:2,providerCalls:0,databaseWrites:0});
  expect(x.calls.filter(c=>c.startsWith("example.invalid"))).toHaveLength(1);
  expect(x.calls.some(c=>c.includes(String(x.raw.id)+"/zip"))).toBe(false);
 });
 it("does not downgrade malformed or partially published evidence to missing",async()=>{
  const x=readerFixture();x.alterBytes();await expect(x.read()).rejects.toThrow("ARCHIVE_BYTES");
  const y=readerFixture();y.partial();await expect(y.read()).rejects.toThrow("COMPLETE_ARCHIVE_PAIR_REQUIRED");
  const z=readerFixture();z.empty();expect(await z.read()).toMatchObject({status:"NO_ELIGIBLE_COMPLETED_PUBLIC_NOAA_ARCHIVE",snapshot:null,stationCount:0});
 });
});
