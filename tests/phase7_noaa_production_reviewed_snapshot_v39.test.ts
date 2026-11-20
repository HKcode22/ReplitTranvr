import {describe,it,expect} from "vitest";
import {createHash,generateKeyPairSync,sign} from "node:crypto";
import {verifyP7NoaaArchive,issueP7NoaaArchiveWires} from "../server/lib/disruption/phase7NoaaPublicArchive_v39";
import {signP7PublicNoaaSnapshot,verifyP7PublicNoaaSnapshot,makeP7PublicWeatherSnapshotPort} from "../server/lib/disruption/phase7NoaaProductionReviewedSnapshot_v39";
const h=(x:Buffer|string)=>createHash("sha256").update(x).digest("hex");
function fixture(){
 const key=generateKeyPairSync("ed25519"),code="c".repeat(40),run="1234567890",art="9876543210",at="2026-11-23T23:11:00.000Z",reviewed="2026-11-23T23:12:02.000Z",zip=Buffer.alloc(512,6),stations=["KDEC","OMAA"],metar="[]",taf="[]";
 const env={GITHUB_SHA:code,V39_P5_APPROVED_CODE_SHA:code,ADB_AUTO_COLLECT:"0",V39_PHASE6_PROCESS_ARMED:"0",P6_PHASE7_NOAA_ARCHIVE_ISSUER_APPROVED:"1",P6_PHASE7_NOAA_SOURCE_PURPOSE_SHA256:h("purpose"),P6_PHASE7_PRE_PRESERVATION_POLICY_SHA256:h("policy"),V39_P5_MANIFEST_SHA256:h("manifest"),V39_P5_RIGHTS_SHA256:h("rights"),P6_PHASE7_PRE_PROOF_REVIEWER_FINGERPRINT_SHA256:h(key.publicKey.export({type:"spki",format:"der"})),P6_PHASE7_PRE_PROOF_REVIEWER_PUBLIC_KEY_BASE64:Buffer.from(key.publicKey.export({type:"spki",format:"pem"})).toString("base64")};
 const capture={schema:"v39.phase7.noaa-public-source-production.v1",githubRunId:run,codeSha:code,sources:["METAR","TAF"].map(kind=>({kind,requestedAirports:stations,fetchedAtUtc:at,sourceBodySha256:h("[]"),httpStatus:204}))};
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
