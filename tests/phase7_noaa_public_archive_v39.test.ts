import {describe,it,expect,vi} from "vitest";
import {createHash,generateKeyPairSync} from "node:crypto";
import {captureP7NoaaPublicSource,verifyP7NoaaArchive,issueP7NoaaArchiveWires,P7_NOAA_CANARY_STATIONS} from "../server/lib/disruption/phase7NoaaPublicArchive_v39";
const h=(s:Buffer|string)=>createHash("sha256").update(s).digest("hex");
describe("public NOAA source archive, no paid provider",()=>{
 it("uses the exact bounded NOAA URL and records 204 as explicit empty data",async()=>{
  const f=vi.fn(async(_url:URL)=>new Response(null,{status:204}));
  const x=await captureP7NoaaPublicSource("TAF",P7_NOAA_CANARY_STATIONS,f as any);
  expect(x).toMatchObject({body:"[]",rowCount:0,receipt:{kind:"TAF",httpStatus:204,sourceBodySha256:h("[]")}});
  expect(String(f.mock.calls[0]?.[0])).toContain("https://aviationweather.gov/api/data/taf?");
  expect(f).toHaveBeenCalledOnce();
  await expect(captureP7NoaaPublicSource("METAR",["KDEC","KDEC"],f as any)).rejects.toThrow("STATIONS");
  await expect(captureP7NoaaPublicSource("TAF",["KDEC"],(async()=>new Response('[{"icaoId":"KJFK"}]')) as any)).rejects.toThrow("STATION_SCOPE");
  await expect(captureP7NoaaPublicSource("TAF",["KDEC"],(async()=>new Response("x".repeat(1000001))) as any)).rejects.toThrow("RESPONSE_BOUND");
 });
 function fixture(){
  const run="1234567890",code="c".repeat(40),metar="[]",taf='[{"icaoId":"KDEC"}]',archive=Buffer.alloc(512,7),fetchedAtUtc="2026-11-20T13:00:00.000Z";
  const capture={schema:"v39.phase7.noaa-public-source-canary.v1",githubRunId:run,codeSha:code,sources:[{kind:"METAR",requestedAirports:[...P7_NOAA_CANARY_STATIONS],fetchedAtUtc,sourceBodySha256:h(metar),httpStatus:204},{kind:"TAF",requestedAirports:[...P7_NOAA_CANARY_STATIONS],fetchedAtUtc,sourceBodySha256:h(taf),httpStatus:200}]};
  const args={capture,metar,taf,githubRunId:run,codeSha:code,githubArtifactId:"9876543210",artifactDigest:h(archive),archiveBytes:archive,artifactCreatedAtUtc:"2026-11-20T13:01:00.000Z",durableReadAtUtc:"2026-11-20T13:02:00.000Z",reviewedAtUtc:"2026-11-20T13:02:01.000Z"};
  return args;
 }
 it("requires exact ZIP bytes, body hashes, station denominator and ordered durable clock",()=>{
  const a=fixture(),v=verifyP7NoaaArchive(a);
  expect(v.sources.map(s=>s.rowCount)).toEqual([0,1]);
  expect(()=>verifyP7NoaaArchive({...a,archiveBytes:Buffer.alloc(512,8)})).toThrow("ARCHIVE_IDENTITY");
  expect(()=>verifyP7NoaaArchive({...a,taf:"[]"})).toThrow("SOURCE_DIGEST");
  expect(()=>verifyP7NoaaArchive({...a,durableReadAtUtc:"2026-11-20T12:59:00.000Z"})).toThrow("ARCHIVE_CLOCK");
  expect(()=>verifyP7NoaaArchive({...a,capture:{...a.capture,flightIdentifier:"not public weather"}})).toThrow("ARCHIVE_IDENTITY");
 });
 it("independently signs only preapproved reviewed source bytes with the pinned key",()=>{
  const a=fixture(),verified=verifyP7NoaaArchive(a),k=generateKeyPairSync("ed25519"),env={P6_PHASE7_NOAA_ARCHIVE_ISSUER_APPROVED:"1",ADB_AUTO_COLLECT:"0",P6_PHASE7_NOAA_SOURCE_PURPOSE_SHA256:h("public purpose"),
   P6_PHASE7_PRE_PROOF_REVIEWER_FINGERPRINT_SHA256:h(k.publicKey.export({format:"der",type:"spki"})),P6_PHASE7_PRE_PROOF_REVIEWER_PUBLIC_KEY_BASE64:Buffer.from(k.publicKey.export({format:"pem",type:"spki"})).toString("base64"),
   V39_P5_MANIFEST_SHA256:h("manifest"),V39_P5_RIGHTS_SHA256:h("rights"),P6_PHASE7_PRE_PRESERVATION_POLICY_SHA256:h("policy")};
  const args={env,verified,metar:a.metar,taf:a.taf,signer:k.privateKey};
  expect(issueP7NoaaArchiveWires(args)).toHaveLength(2);
  expect(()=>issueP7NoaaArchiveWires({...args,verified:JSON.parse(JSON.stringify(verified))})).toThrow("ISSUER_REHYDRATED_OR_UNVERIFIED_REPORT");
  expect(()=>issueP7NoaaArchiveWires({...args,taf:"[]"})).toThrow("ISSUER_BYTES");
  expect(()=>issueP7NoaaArchiveWires({...args,env:{...env,DATABASE_URL:"wrong"}})).toThrow("ISSUER_APPROVAL");
 });
});

import {publicP7WeatherStationGroups} from "../server/lib/disruption/phase7NoaaProductionArchivePlan_v39";
it("production archive cannot substitute arbitrary station scope for the canary",()=>{
 const run="1234567890",code="d".repeat(40),raw=Buffer.alloc(512,5),metar="[]",taf="[]",at="2026-11-23T23:00:00.000Z";
 const capture={schema:"v39.phase7.noaa-public-source-production.v1",githubRunId:run,codeSha:code,sources:["METAR","TAF"].map(kind=>({kind,requestedAirports:["KJFK"],fetchedAtUtc:at,sourceBodySha256:h("[]"),httpStatus:204}))};
 const args={capture,metar,taf,githubRunId:run,codeSha:code,githubArtifactId:"9876543210",artifactDigest:h(raw),archiveBytes:raw,artifactCreatedAtUtc:"2026-11-23T23:01:00.000Z",durableReadAtUtc:"2026-11-23T23:02:00.000Z",reviewedAtUtc:"2026-11-23T23:02:01.000Z"};
 expect(verifyP7NoaaArchive({...args,expectedProductionStations:["KJFK"]}).sources).toHaveLength(2);
 expect(()=>verifyP7NoaaArchive(args)).toThrow("ARCHIVE_IDENTITY");
 expect(()=>verifyP7NoaaArchive({...args,expectedProductionStations:["KDEC"]})).toThrow("SOURCE_SCOPE");
});
it("uses only sampled public calendar slots near the clock, no dynamic route input",()=>{
 const plans=Array.from({length:31},(_,i)=>({runDayIndex:i+1,pairedIcaos:{HUB:"KJFK",MID_A:"KSFO",MID_B:"KSEA",REGIONAL:"KDEC"},templates:[{slot:"HUB",scheduledRequestUtc:new Date(Date.parse("2026-11-23T23:45:00.000Z")+86400000*i).toISOString()}]}));
 expect(publicP7WeatherStationGroups(plans,"2026-11-23T23:00:00.000Z")).toEqual({runDayIndexes:[1],groups:[["KJFK"]]});
 expect(publicP7WeatherStationGroups(plans,"2026-11-22T23:00:00.000Z")).toEqual({runDayIndexes:[],groups:[]});
 expect(()=>publicP7WeatherStationGroups(plans.slice(1),"2026-11-23T23:00:00.000Z")).toThrow("PLAN_DENOMINATOR");
});
