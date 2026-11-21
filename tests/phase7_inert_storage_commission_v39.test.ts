import {validateP7OwnerReferencePolicy} from "../review-tools/p7_commission_pre_policy_owner_v39";
import {inspectPhase7PreFragmentReader} from "../server/lib/disruption/phase7PreFragmentTransaction_v39";
import {createHash,randomUUID} from "node:crypto";
import {readPhase7RetainedPreCoverage} from "../server/lib/disruption/phase7RetainedPreCoverage_v39";
import {createPhase7DerivedReleasePacket,serializePhase7DerivedReleasePacket} from "../server/lib/disruption/phase6DerivedTrainingReleasePacket_v39";
import {assemblePhase7FinalGroupCandidate} from "../server/lib/disruption/phase7FinalGroupAssembly_v39";
import {compilePhase7PrePolicyCommission,installPhase7PrePolicyOnce,inspectPhase7PrePolicyCommission,inspectPhase7PreWriterRole,checkPhase7PrePolicyStructure,checkPhase7NativePrePolicySupport} from "../server/lib/disruption/phase7PrePolicyCommission_v39";
import {P5_STAGE28_GROUPS} from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39";
import {P5_E_ALLOWED_PRE_FEATURES} from "../server/lib/disruption/phase5AmendmentEAsOfFeatureSelectionOffline_v39";
import {hashPhase7DurableCandidate} from "../server/lib/disruption/phase7DurableDerivedBundleCandidate_v39";
import {describe,it,expect} from "vitest";
import {Pool} from "pg";
import {readFileSync} from "node:fs";
import {P7_PRESERVATION_ACTORS,inspectP7PreservationActors,commissionP7PreservationActors,verifyP7PreservationLogin} from "../scripts/v39_phase7_preservation_logins_owner_v39.mjs";
import {runP7ExpiryOnce} from "../server/lib/disruption/phase7ExpiryRunner_v39";
import {compileP7InertStorageSql,installP7InertStorage,inspectP7InertStorage,P7_INERT_ROLES} from "../server/lib/disruption/phase7InertStorageCommission_v39";
describe("exact inert schema compiler",()=>{
 it("rejects modified SQL even with same object names",()=>{
  expect(compileP7InertStorageSql()).toHaveLength(3);
  expect(()=>compileP7InertStorageSql(p=>Buffer.concat([readFileSync(p),Buffer.from("\n")]))).toThrow("EXACT_SQL_BLOB");
 });
});

function policyFixture(now=Date.now()){
 const sha=(s:string|Buffer)=>createHash("sha256").update(s).digest("hex"),iso=(t:number)=>new Date(t).toISOString();
 const shared={version:"v01",featureDictionarySha256:sha("synthetic dictionary"),termsReviewSha256:sha("synthetic terms"),derivedWorkReviewSha256:sha("synthetic derived")};
 const contract={schema:"v39.phase6.phase7-derived-release-contract.v2",...shared,sourceToReleaseMappingExpiryHours:24,researchExpiryUtc:iso(now+90*86400000),cohortBucketCount:31,features:[{name:"context_bin",bucketCount:3,fieldClass:"approved_derived",transformEvidenceSha256:sha("feature"),nonReconstructable:true}],labels:[{name:"delay_bin",bucketCount:4,fieldClass:"approved_derived",transformEvidenceSha256:sha("label"),nonReconstructable:true}],allowedHorizons:["T-24h","T-6h","T-90m"]};
 const profile={schema:"v39.phase7.reviewed-source-transformation.v1",...shared,mappingExpiryHours:24,approvedForUse:true,fields:[{sourceField:"airport_congestion_1h",outputField:"context_bin",role:"feature",kind:"numeric_threshold_bucket",bucketCount:3,boundaries:[1,4],categories:null,transformEvidenceSha256:sha("feature"),nonReconstructable:true},{sourceField:"gate_out_delay_minutes",outputField:"delay_bin",role:"label",kind:"numeric_threshold_bucket",bucketCount:4,boundaries:[0,15,60],categories:null,transformEvidenceSha256:sha("label"),nonReconstructable:true}]};
 const dispositions=P5_E_ALLOWED_PRE_FEATURES.map(field=>({field,disposition:field==="airport_congestion_1h"?"REVIEWED_DERIVED_BUCKET":["origin_icao","destination_icao","operating_carrier"].includes(field)?"PURPOSE_BOUND_REFERENCE_LANE":"INDEPENDENT_SOURCE_EXACT_LANE",outputField:field==="airport_congestion_1h"?"context_bin":null,reviewSha256:field==="airport_congestion_1h"?sha("feature"):sha("synthetic "+field)}));
 const manifestSha256=sha("synthetic manifest"),rightsSha256=sha("synthetic rights");
 const review={schema:"v39.phase7.prospective-pre-preservation-review.v1",manifestSha256,rightsSha256,contractSha256:hashPhase7DurableCandidate(contract),profileSha256:hashPhase7DurableCandidate(profile),dispositionsSha256:hashPhase7DurableCandidate(dispositions),mappingHours:24,researchExpiryUtc:contract.researchExpiryUtc,approvedForPreDurableStorage:true,boundedSameLegLinkApproved:true};
 const policyReviewSha256=hashPhase7DurableCandidate(review),raw=Buffer.from(JSON.stringify({contract,profile,dispositions,review,reviewSha256:policyReviewSha256}));
 return {raw,scope:{manifestSha256,rightsSha256,policyReviewSha256,policyBytesSha256:sha(raw),validFromUtc:iso(now),firstSourceUtc:iso(now+3600000),outcomeTailUtc:iso(now+35*86400000),validUntilUtc:iso(now+36*86400000)}};
}
it("compiles exact existing PRE policy bytes only; refuses wrong hashes or a short study window",()=>{
 const {raw,scope}=policyFixture();
 expect(compilePhase7PrePolicyCommission(raw,scope)).toMatchObject({policyReviewSha256:scope.policyReviewSha256,phase6PaidGo:false});
 expect(()=>compilePhase7PrePolicyCommission(Buffer.concat([raw,Buffer.from(" ")]),scope)).toThrow("EXACT_REVIEWED_BYTES");
 expect(()=>compilePhase7PrePolicyCommission(raw,{...scope,validUntilUtc:scope.outcomeTailUtc})).toThrow("WINDOW_NOT_FULL_STUDY");
});

it("requires native routes and binds the existing purpose-link review before owner commissioning",()=>{
 const {raw,scope}=policyFixture(),p=JSON.parse(raw.toString("utf8"));
 const h=(s:string|Buffer)=>createHash("sha256").update(s).digest("hex");
 // Empty probe is valid in the existing fixture but it cannot produce
 // present native schedule/status evidence. It must not arm SOURCE.
 expect(()=>checkPhase7NativePrePolicySupport(p)).toThrow("NATIVE_TRANSFORM_ROUTE");
 // Synthetic supported shapes only; these bucket boundaries and category
 // mappings are NOT a production reconstruction or rights decision.
 for(const [field,output,kind,boundaries,categories] of [
  ["scheduled_arrival_utc","duration_bin","frozen_native_t_delta_bucket",[60,180],null],
  ["provider_revised_departure_utc","revision_bin","frozen_native_t_delta_bucket",[0,15],null],
  ["reported_pre_departure_status","state_bin","categorical_group_dictionary",null,[["SyntheticA","SyntheticB"],["SyntheticC","SyntheticD"]]]
 ] as const){
  const evidence=h("synthetic transform "+field),count=categories?categories.length:boundaries!.length+1;
  p.contract.features.push({name:output,bucketCount:count,fieldClass:"approved_derived",transformEvidenceSha256:evidence,nonReconstructable:true});
  p.profile.fields.push({sourceField:field,outputField:output,role:"feature",kind,bucketCount:count,boundaries,categories,transformEvidenceSha256:evidence,nonReconstructable:true});
  Object.assign(p.dispositions.find((x:any)=>x.field===field),{disposition:"REVIEWED_DERIVED_BUCKET",outputField:output,reviewSha256:evidence});
 }
 p.review.contractSha256=hashPhase7DurableCandidate(p.contract);p.review.profileSha256=hashPhase7DurableCandidate(p.profile);p.review.dispositionsSha256=hashPhase7DurableCandidate(p.dispositions);p.reviewSha256=hashPhase7DurableCandidate(p.review);
 const reviewed=Buffer.from(JSON.stringify(p));
 const link={schema:"v39.phase7.pre-reference-link-purpose-policy.v1",manifestSha256:scope.manifestSha256,rightsSha256:scope.rightsSha256,prePolicySha256:p.reviewSha256,
  termsReviewSha256:p.profile.termsReviewSha256,independentPurposeReviewSha256:h("synthetic purpose"),validFromUtc:scope.validFromUtc,validUntilUtc:scope.validUntilUtc,scope:"SINGLE_ORIGINAL_MEMBER_LINK_ONLY",allowSubstituteCompilation:false,allowPerFlightTrainingLink:false,
  fields:p.dispositions.filter((x:any)=>x.disposition==="PURPOSE_BOUND_REFERENCE_LANE").map((x:any)=>({field:x.field,kind:x.field==="operating_carrier"?"airline_icao":"airport_icao",purpose:"link",fieldReviewSha256:x.reviewSha256}))};
 const reference=Buffer.from(JSON.stringify(link)),s={...scope,policyBytesSha256:h(reviewed),policyReviewSha256:p.reviewSha256,referencePolicyBytesSha256:h(reference)};
 expect(validateP7OwnerReferencePolicy(reviewed,reference,s)).toMatchObject({referenceFieldCount:3,providerCalls:0,databaseWrites:0,phase6PaidGo:false});
 expect(()=>validateP7OwnerReferencePolicy(reviewed,Buffer.concat([reference,Buffer.from(" ")]),s)).toThrow("EXACT_REFERENCE_POLICY_BYTES");
 const bad=Buffer.from(JSON.stringify({...link,allowPerFlightTrainingLink:true}));
 expect(()=>validateP7OwnerReferencePolicy(reviewed,bad,{...s,referencePolicyBytesSha256:h(bad)})).toThrow("REFERENCE_PURPOSE_SCOPE");
 const short=Buffer.from(JSON.stringify({...link,validUntilUtc:s.outcomeTailUtc}));
 expect(()=>validateP7OwnerReferencePolicy(reviewed,short,{...s,referencePolicyBytesSha256:h(short)})).toThrow("REFERENCE_STUDY_WINDOW");
});
const url=process.env.P7_INERT_DISPOSABLE_URL;
describe.skipIf(url!=="postgresql://postgres:postgres@127.0.0.1:5432/neondb?sslmode=disable"||process.env.GITHUB_ACTIONS!=="true")("atomic inert PostgreSQL16 install",()=>{
 it("installs exact tables and only narrow NOLOGIN actors; rejects duplicate install",async()=>{
  const pool=new Pool({connectionString:url,max:2});
  try{
   const disposableGuard=async(c:import("pg").PoolClient)=>{
    const q=(await c.query("SELECT current_database() db,current_user actor,current_setting('server_version_num')::int ver")).rows[0];
    expect(q.db).toBe("neondb");expect(q.actor).toBe("postgres");expect(q.ver).toBeGreaterThanOrEqual(160000);expect(q.ver).toBeLessThan(170000);
   };
   // Prove rollback (including schema/roles) if the final safety read fails.
   let count=0;
   await expect(installP7InertStorage(pool,async c=>{await disposableGuard(c);if(++count===2)throw Error("fixture rollback")})).rejects.toThrow("fixture rollback");
   expect((await pool.query("SELECT to_regnamespace('phase7_private') IS NULL ok")).rows[0].ok).toBe(true);
   const r=await installP7InertStorage(pool,disposableGuard);
   expect(r).toMatchObject({tables:4,functions:7,loginRoles:0,schemaRoleCount:6,empty:true});
   expect(await inspectP7InertStorage(pool)).toMatchObject({status:"P7_INERT_SCHEMA_INDEPENDENT_READBACK_NO_GO",empty:true,publicGrants:0});
   await expect(installP7InertStorage(pool,disposableGuard)).rejects.toThrow("EXISTING_SCHEMA_OR_ROLE_NO_REPLAY");
   await pool.query("GRANT SELECT ON phase7_private.pre_source_link_v39 TO "+P7_INERT_ROLES.bundleReader);
   await expect(inspectP7InertStorage(pool)).rejects.toThrow("TABLE_PRIVILEGE_DRIFT");
   await pool.query("REVOKE SELECT ON phase7_private.pre_source_link_v39 FROM "+P7_INERT_ROLES.bundleReader);
   await pool.query("ALTER ROLE "+P7_INERT_ROLES.expiryReader+" LOGIN PASSWORD 'disposable-only'; ALTER ROLE "+P7_INERT_ROLES.expiryWriter+" LOGIN PASSWORD 'disposable-only'");
   // Commission the other FOUR existing actors, no new schema or data policy.
   const owner=await pool.connect(),passwords=Object.fromEntries(P7_PRESERVATION_ACTORS.map((a,i)=>[a.role,String(i+1).repeat(48)]));
   try{
    expect(await inspectP7PreservationActors(owner,{newLogins:false})).toMatchObject({preservationLogins:0,expiryLogins:2});
    await owner.query("CREATE ROLE p7_ci_unexpected_member NOLOGIN; GRANT "+P7_INERT_ROLES.bundleReader+" TO p7_ci_unexpected_member");
    try{await expect(inspectP7PreservationActors(owner,{newLogins:false})).rejects.toThrow("ROLE_BOUNDARY");}
    finally{await owner.query("REVOKE "+P7_INERT_ROLES.bundleReader+" FROM p7_ci_unexpected_member; DROP ROLE p7_ci_unexpected_member");}
    let called=0;
    await expect(commissionP7PreservationActors(owner,passwords,async c=>{await disposableGuard(c);if(++called===2)throw Error("rollback fixture");})).rejects.toThrow("rollback fixture");
    expect(await inspectP7PreservationActors(owner,{newLogins:false})).toMatchObject({preservationLogins:0});
    await expect(commissionP7PreservationActors(owner,passwords,disposableGuard)).resolves.toMatchObject({newLogins:4});
    expect(await inspectP7PreservationActors(owner,{newLogins:true})).toMatchObject({preservationLogins:4,expiryLogins:2});
    await expect(commissionP7PreservationActors(owner,passwords,disposableGuard)).rejects.toThrow("ROLE_BOUNDARY");
   }finally{owner.release();}
   for(const a of P7_PRESERVATION_ACTORS){
    const actor=new Pool({connectionString:url!.replace("postgres:postgres@",a.role+":"+passwords[a.role]+"@"),max:1});
    const c=await actor.connect();
    try{await verifyP7PreservationLogin(c,a);await expect(c.query("SELECT * FROM phase7_private.pre_source_link_v39")).rejects.toThrow();}
    finally{c.release();await actor.end();}
   }
   // Existing PRE role is distinct from all six newly commissioned actors.
   // Synthetic DB policy and grants are tested only in the disposable fixture.
   await pool.query("CREATE ROLE "+P5_STAGE28_GROUPS.pre+" NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS");
   const fx=policyFixture();
   let guardCalls=0;
   await expect(installPhase7PrePolicyOnce(pool,fx.raw,fx.scope,async c=>{await disposableGuard(c);if(++guardCalls===2)throw Error("policy rollback fixture")})).rejects.toThrow("policy rollback fixture");
   expect((await pool.query("SELECT count(*)::int n FROM phase7_private.pre_preservation_policy_v39")).rows[0].n).toBe(0);
   expect((await pool.query("SELECT has_schema_privilege($1,'phase7_private','USAGE') ok",[P5_STAGE28_GROUPS.pre])).rows[0].ok).toBe(false);
   await expect(installPhase7PrePolicyOnce(pool,fx.raw,fx.scope,disposableGuard)).resolves.toMatchObject({policyRows:1,phase6PaidGo:false});
   const compiled=compilePhase7PrePolicyCommission(fx.raw,fx.scope);
   expect(await inspectPhase7PrePolicyCommission(pool,compiled)).toMatchObject({policyRows:1,databaseWrites:0,phase6PaidGo:false});
   await expect(installPhase7PrePolicyOnce(pool,fx.raw,fx.scope,disposableGuard)).rejects.toThrow("PRE_ROLE_SCOPE");
   await pool.query("CREATE ROLE phase5_p30_pre_login_20261107 LOGIN NOINHERIT PASSWORD 'ci-pre-only'; GRANT "+P5_STAGE28_GROUPS.pre+" TO phase5_p30_pre_login_20261107 WITH ADMIN FALSE, INHERIT FALSE, SET TRUE");
   const preLogin=new Pool({connectionString:url!.replace("postgres:postgres@","phase5_p30_pre_login_20261107:ci-pre-only@"),max:1});
   const scopedPre={connect:async()=>{const c=await preLogin.connect();try{await c.query("SET ROLE "+P5_STAGE28_GROUPS.pre);return c;}catch(e){c.release(true);throw e}}};
   try{expect(await inspectPhase7PreWriterRole(scopedPre)).toMatchObject({providerCalls:0,databaseWrites:0});
    await expect(inspectPhase7PreWriterRole(pool)).rejects.toThrow("RESTRICTED_ACTUAL_WRITER");}
   finally{await preLogin.end();}
   checkPhase7PrePolicyStructure(JSON.parse(fx.raw.toString("utf8")),fx.scope.firstSourceUtc);
   await pool.query("GRANT SELECT ON phase7_private.pre_fragment_v39 TO "+P5_STAGE28_GROUPS.pre);
   await expect(inspectPhase7PrePolicyCommission(pool,compiled)).rejects.toThrow("NO_DIRECT_TABLE_OR_OTHER_FUNCTION_GRANTS");
   await pool.query("REVOKE SELECT ON phase7_private.pre_fragment_v39 FROM "+P5_STAGE28_GROUPS.pre);
   const reader=new Pool({connectionString:url!.replace("postgres:postgres@",P7_INERT_ROLES.expiryReader+":disposable-only@"),max:1});
   const writer=new Pool({connectionString:url!.replace("postgres:postgres@",P7_INERT_ROLES.expiryWriter+":disposable-only@"),max:1});
   try{
    expect(await runP7ExpiryOnce(reader,undefined,"VERIFY_ONLY")).toMatchObject({status:"P7_EXPIRY_VERIFY_ONLY_NO_GO",deletedLinks:0});
    expect(await runP7ExpiryOnce(reader,writer,"APPLY_DUE_ONLY")).toMatchObject({status:"P7_EXPIRY_DUE_ONLY_INDEPENDENT_READBACK",deletedFragments:0});
    await expect(reader.query("SELECT phase7_private.sweep_due_pre_links_v39(1)")).rejects.toThrow();
    await expect(writer.query("SELECT * FROM phase7_private.pre_source_link_v39")).rejects.toThrow();
    await expect(runP7ExpiryOnce(writer,reader,"APPLY_DUE_ONLY")).rejects.toThrow("DISTINCT_RESTRICTED_ACTOR");
    // Real nonempty late-wake backlog, larger than the former total
    // 2000-link limit. All rows are synthetic in this disposable DB.
    await pool.query(`WITH seed AS MATERIALIZED(
      SELECT i,gen_random_uuid() row_id,gen_random_uuid() group_id
      FROM generate_series(1,2506) i
    ), payload AS MATERIALIZED(
      SELECT *,convert_to(jsonb_build_object(
        'schema','v39.phase6.phase7-derived-release-packet.v1','packetId',row_id::text,
        'contractVersion','synthetic_fixture','featureDictionarySha256',repeat('b',64),
        'rows',jsonb_build_array(jsonb_build_object('releaseRowId',row_id::text,
          'horizon','T-6h','cohortBucket',0,'split','train','featureBuckets','{}'::jsonb,
          'labelBuckets','{}'::jsonb,'missingness','{}'::jsonb,'qualityFlags',0,
          'censoring','not_due')))::text,'UTF8') bytes
      FROM seed
    ), inserted AS (
      INSERT INTO phase7_private.pre_fragment_v39(row_id,group_id,horizon,cohort_bucket,split,
        contract_sha256,profile_sha256,research_expiry_utc,packet_sha256,packet_bytes)
      SELECT row_id,group_id,'T-6h',0,'train',repeat('a',64),repeat('b',64),
        clock_timestamp()+CASE WHEN i BETWEEN 2502 AND 2505 THEN interval '-1 day' ELSE interval '1 day' END,
        encode(sha256(bytes),'hex'),bytes FROM payload RETURNING row_id
    )
    INSERT INTO phase7_private.pre_source_link_v39(snapshot_id,row_id,expires_at_utc)
    SELECT i,payload.row_id,clock_timestamp()+CASE WHEN i=2506 THEN interval '1 hour' ELSE interval '-1 hour' END
      FROM payload JOIN inserted USING(row_id)`);
    const before=await runP7ExpiryOnce(reader,undefined,"VERIFY_ONLY");
    expect(before.before).toMatchObject({dueLinks:2505,dueFragments:4,liveLinksOnDueFragments:0});
    const drained=await runP7ExpiryOnce(reader,writer,"APPLY_DUE_ONLY");
    expect(drained).toMatchObject({status:"P7_EXPIRY_DUE_ONLY_INDEPENDENT_READBACK",deletedLinks:2505,deletedFragments:4,deletedBundles:0,after:{dueLinks:0,dueFragments:0,liveLinks:1}});
    expect((await pool.query("SELECT count(*)::int n FROM phase7_private.pre_fragment_v39")).rows[0].n).toBe(2502);
    expect((await pool.query("SELECT snapshot_id::int n FROM phase7_private.pre_source_link_v39")).rows).toEqual([{n:2506}]);
    // Census of actual durable PRE retention after an operational link
    // has expired: keep the T24-only group, finalize a separate paired
    // group without claiming that missing gate-out evidence is observed.
    const {contract,profile}=JSON.parse(fx.raw.toString("utf8"));
    const g1=randomUUID(),g2=randomUUID(),scope={cohortBucket:1,split:"train" as const};
    const sha=(b:string|Buffer)=>createHash("sha256").update(b).digest("hex");
    const fragment=async(groupId:string,horizon:"T-24h"|"T-6h",snapshotId:number)=>{
     const rowId=randomUUID(),packet=createPhase7DerivedReleasePacket(contract,[{releaseRowId:rowId,horizon,...scope,featureBuckets:{context_bin:1},labelBuckets:{delay_bin:null},missingness:{context_bin:false,delay_bin:true},qualityFlags:0,censoring:"not_due"}]);
     const bytes=Buffer.from(serializePhase7DerivedReleasePacket(contract,packet)),packetSha256=sha(bytes),contractSha256=hashPhase7DurableCandidate(contract),profileSha256=hashPhase7DurableCandidate(profile);
     await pool.query("INSERT INTO phase7_private.pre_fragment_v39(row_id,group_id,horizon,cohort_bucket,split,contract_sha256,profile_sha256,research_expiry_utc,packet_sha256,packet_bytes) VALUES($1,$2,$3,1,'train',$4,$5,$6,$7,$8)",[rowId,groupId,horizon,contractSha256,profileSha256,contract.researchExpiryUtc,packetSha256,bytes]);
     await pool.query("INSERT INTO phase7_private.pre_source_link_v39(snapshot_id,row_id,expires_at_utc) VALUES($1,$2,clock_timestamp()-interval '1 second')",[snapshotId,rowId]);
     return {groupId,contractSha256,profileSha256,packetSha256,packet};
    };
    await fragment(g1,"T-24h",3001);
    const f24=await fragment(g2,"T-24h",3002),f6=await fragment(g2,"T-6h",3003);
    const final=assemblePhase7FinalGroupCandidate(contract,profile,[f24,f6],{groupId:g2,associationReviewSha256:sha("fixture association"),outcomeReviewSha256:sha("fixture censored outcome"),groupSettlementDue:true,evidence:{}},new Date().toISOString());
    const bundle={schema:"v39.phase7.durable-derived-bundle.v1",packet:final.packet,paired:{...final.association,schema:"v39.phase7.paired-derived-association-reviewed.v1",approvedForUse:true},continuous:final.continuous};
    const canonical=(x:any):string=>x===null||typeof x!=="object"?JSON.stringify(x):Array.isArray(x)?"["+x.map(canonical).join(",")+"]":"{"+Object.keys(x).sort().map(k=>JSON.stringify(k)+":"+canonical(x[k])).join(",")+"}";
    const payload=Buffer.from(canonical(bundle));
    await pool.query("INSERT INTO phase7_private.derived_release_bundle_v39(packet_id,bundle_sha256,approval_sha256,row_count,research_expiry_utc,payload_bytes) VALUES($1,$2,$3,3,$4,$5)",[g2,sha(payload),sha("fixture approval"),contract.researchExpiryUtc,payload]);
    expect(await runP7ExpiryOnce(reader,writer,"APPLY_DUE_ONLY")).toMatchObject({deletedLinks:3,deletedFragments:0,deletedBundles:0});
    const pre=new Pool({connectionString:url!.replace("postgres:postgres@",P7_INERT_ROLES.preReader+":"+passwords[P7_INERT_ROLES.preReader]+"@"),max:1});
    const bundleRead=new Pool({connectionString:url!.replace("postgres:postgres@",P7_INERT_ROLES.bundleReader+":"+passwords[P7_INERT_ROLES.bundleReader]+"@"),max:1});
    try{
     expect(await inspectPhase7PreFragmentReader(pre,P7_INERT_ROLES.preReader)).toEqual({ready:true,providerCalls:0,databaseWrites:0});
     await expect(inspectPhase7PreFragmentReader(bundleRead,P7_INERT_ROLES.preReader)).rejects.toThrow("independent-reader-privileges");
     const result=await readPhase7RetainedPreCoverage(pre,bundleRead,contract,profile,scope);
     expect(result).toMatchObject({samePrimarySnapshot:true,retainedPreFragments:3,retainedGroups:2,settledGroups:1,unsettledGroups:1,unsettledT24OnlyGroups:1,primaryObserved:0,retainedByHorizon:{"T-24h":2,"T-6h":1,"T-90m":0},finalizedByHorizon:{"T-24h":1,"T-6h":1,"T-90m":0},unsettledByHorizon:{"T-24h":1,"T-6h":0,"T-90m":0},expiredSourceLinksRead:false,providerCalls:0,databaseWrites:0});
     expect(JSON.stringify(result)).not.toContain(g1);expect(JSON.stringify(result)).not.toContain(g2);
     await expect(readPhase7RetainedPreCoverage(bundleRead,pre,contract,profile,scope)).rejects.toThrow("INDEPENDENT_LOGIN_READBACK");
     // Independently read a corrupted final value with a valid new byte
     // digest: storage shape alone cannot certify source-to-final parity.
     const changed=structuredClone(bundle);changed.packet.rows.find(x=>x.horizon==="T-6h")!.featureBuckets.context_bin=2;
     changed.paired.packetSha256=sha(serializePhase7DerivedReleasePacket(contract,changed.packet));changed.continuous.derivedPacketSha256=changed.paired.packetSha256;
     const bad=Buffer.from(canonical(changed));
     await pool.query("UPDATE phase7_private.derived_release_bundle_v39 SET payload_bytes=$1,bundle_sha256=$2 WHERE packet_id=$3",[bad,sha(bad),g2]);
     await expect(readPhase7RetainedPreCoverage(pre,bundleRead,contract,profile,scope)).rejects.toThrow("PRESERVED_FEATURE_OR_ID_CHANGED");
    }finally{await Promise.all([pre.end(),bundleRead.end()]);}

   }finally{await Promise.all([reader.end(),writer.end()])}
  }finally{await pool.end()}
 },60000);
});
