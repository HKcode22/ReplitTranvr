/** Narrow, owner-only commissioning of the existing PRE policy table and
 * existing PRE writer group. No schema/role creation, provider call, new
 * retention decision, login rotation, SOURCE enable or paid activation.
 * The exact reviewed policy bytes/window and owner-disabled-stage guard
 * are external inputs; this module does not issue independent approval. */
import {createHash} from "node:crypto";
import type {Pool,PoolClient} from "pg";
import {parsePhase7ProtectedPrePolicy} from "./phase7ProtectedPreResolver_v39";
import {preparePhase7BoundPrePreservation} from "./phase7BoundPrePreservation_v39";
import {validatePhase7DerivedReleaseContract} from "./phase6DerivedTrainingReleaseContract_v39";
import {validatePhase7ReviewedTransformationProfile} from "./phase7ReviewedSourceTransformation_v39";
import {hashPhase7DurableCandidate} from "./phase7DurableDerivedBundleCandidate_v39";
import {P5_STAGE28_GROUPS} from "./phase5Stage28DedicatedRolePool_v39";
const HOLD=(s:string):never=>{throw Error("HOLD_P7_PRE_POLICY_COMMISSION_"+s)};
const need=(b:unknown,s:string)=>{if(!b)HOLD(s)};
const H=/^[a-f0-9]{64}$/;
const sha=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const clock=(s:string)=>{const n=Date.parse(s);need(Number.isFinite(n)&&new Date(n).toISOString()===s,"CLOCK");return n};
const SCHEMA="phase7_private",TABLE=SCHEMA+".pre_preservation_policy_v39",ROLE=P5_STAGE28_GROUPS.pre;
const FN=SCHEMA+".persist_bound_pre_fragment_v39(text,text,bigint,uuid,uuid,text,text,text,text,bytea,text,timestamptz,timestamptz,integer,timestamptz)";
export interface Phase7PrePolicyCommissionScope{
 manifestSha256:string;rightsSha256:string;policyBytesSha256:string;policyReviewSha256:string;
 validFromUtc:string;validUntilUtc:string;firstSourceUtc:string;outcomeTailUtc:string;
}
/** Same full field/transform validation in owner commissioning and runtime
 * read-only readiness. The synthetic empty probe is not source evidence. */
export function checkPhase7PrePolicyStructure(p:ReturnType<typeof parsePhase7ProtectedPrePolicy>,issuedAtUtc:string){
 const {contract,profile,dispositions}=p;
 need(validatePhase7DerivedReleaseContract(contract).pass&&validatePhase7ReviewedTransformationProfile(profile).pass&&
  contract.cohortBucketCount>=31&&contract.allowedHorizons.length===3&&
  ["T-24h","T-6h","T-90m"].every(h=>contract.allowedHorizons.includes(h as typeof contract.allowedHorizons[number])),"CONTRACT_PROFILE");
 const issued=clock(issuedAtUtc);need(issued<clock(contract.researchExpiryUtc),"RESEARCH_EXPIRY");
 const sourceExpiresAtUtc=new Date(issued+3600000).toISOString();
 for(const horizon of ["T-24h","T-6h","T-90m"] as const){
  const selectedNativeTUtc=new Date(issued+({"T-24h":1440,"T-6h":360,"T-90m":90}[horizon])*60000).toISOString();
  const probe=preparePhase7BoundPrePreservation(contract,profile,{horizon,selectedNativeTUtc,cutoffUtc:issuedAtUtc,issuedAtUtc,transformedAtUtc:issuedAtUtc,sourceExpiresAtUtc,split:"train",cohortBucket:0,features:[],dispositions,separatelyVerifiedFields:[]});
  need(Object.values(probe.audit.counts).every(v=>v.present===0&&v.preserved===0&&v.lost===0&&v.falsePresence===0),"EMPTY_STRUCTURAL_PROBE");
 }
 need(dispositions.every(x=>H.test(x.reviewSha256)&&!/^([a-f0-9])\1{63}$/.test(x.reviewSha256))&&
  profile.fields.filter(f=>f.role==="label").some(f=>f.sourceField==="gate_out_delay_minutes"),"EXACT_FIELD_AND_TARGET_REVIEW");
}
/** Validate the six native FIDS dispositions against the existing real
 * producer's actual supported routes, not an all-missing structural probe.
 * This is capability compatibility, NOT approval of a derived transform,
 * source rights or prediction parity. Optional external lanes are unchanged. */
export function checkPhase7NativePrePolicySupport(p:ReturnType<typeof parsePhase7ProtectedPrePolicy>){
 const byField=new Map(p.dispositions.map(x=>[x.field,x]));
 for(const field of ["origin_icao","destination_icao","operating_carrier"] as const){
  const d=byField.get(field);
  need(d?.disposition==="PURPOSE_BOUND_REFERENCE_LANE"&&d.outputField===null,"NATIVE_REFERENCE_ROUTE");
 }
 for(const field of ["scheduled_arrival_utc","provider_revised_departure_utc","reported_pre_departure_status"] as const){
  const d=byField.get(field),f=p.profile.fields.find(x=>x.role==="feature"&&x.sourceField===field);
  // The actual lane authority has no independent separate port for these
  // native FIDS values. The reviewer must approve a supported transform;
  // present native source values may not be dropped to pass commissioning.
  need(d?.disposition==="REVIEWED_DERIVED_BUCKET"&&f&&f.outputField===d.outputField&&
   (field==="reported_pre_departure_status"?f.kind==="categorical_group_dictionary":f.kind==="frozen_native_t_delta_bucket"),"NATIVE_TRANSFORM_ROUTE");
 }
}
export function compilePhase7PrePolicyCommission(raw:Buffer,scope:Phase7PrePolicyCommissionScope){
 need(Buffer.isBuffer(raw)&&raw.length>0&&raw.length<=36000&&sha(raw)===scope.policyBytesSha256&&
  [scope.manifestSha256,scope.rightsSha256,scope.policyBytesSha256,scope.policyReviewSha256].every(x=>H.test(x)&&!/^([a-f0-9])\1{63}$/.test(x)),"EXACT_REVIEWED_BYTES");
 const p=parsePhase7ProtectedPrePolicy({P6_PHASE7_PRE_POLICY_BASE64:raw.toString("base64"),P6_PHASE7_PRE_PRESERVATION_POLICY_SHA256:scope.policyReviewSha256,V39_P5_MANIFEST_SHA256:scope.manifestSha256,V39_P5_RIGHTS_SHA256:scope.rightsSha256});
 const {contract,review}=p;
 const from=clock(scope.validFromUtc),first=clock(scope.firstSourceUtc),tail=clock(scope.outcomeTailUtc),until=clock(scope.validUntilUtc);
 need(from<=first&&first<tail&&tail<until&&until<=clock(contract.researchExpiryUtc),"WINDOW_NOT_FULL_STUDY");
 checkPhase7PrePolicyStructure(p,scope.firstSourceUtc);
 const limits=(fs:typeof contract.features)=>Object.fromEntries(fs.map(f=>[f.name,f.bucketCount]));
 const values=[scope.manifestSha256,review.contractSha256,review.profileSha256,scope.rightsSha256,scope.policyReviewSha256,scope.validFromUtc,scope.validUntilUtc,contract.featureDictionarySha256,contract.version,JSON.stringify(limits(contract.features)),JSON.stringify(limits(contract.labels)),review.mappingHours,contract.researchExpiryUtc] as const;
 return {scope:{...scope},rowValues:values,policyReviewSha256:p.reviewSha256,rowSha256:hashPhase7DurableCandidate(values),phase6PaidGo:false as const};
}
type Compiled=ReturnType<typeof compilePhase7PrePolicyCommission>;
const columns="manifest_sha256,contract_sha256,profile_sha256,rights_sha256,policy_review_sha256,valid_from_utc,valid_until_utc,feature_dictionary_sha256,contract_version,feature_bucket_limits,label_bucket_limits,mapping_hours,research_expiry_utc";
const exactRow="manifest_sha256=$1 AND contract_sha256=$2 AND profile_sha256=$3 AND rights_sha256=$4 AND policy_review_sha256=$5 AND valid_from_utc=$6::timestamptz AND valid_until_utc=$7::timestamptz AND feature_dictionary_sha256=$8 AND contract_version=$9 AND feature_bucket_limits=$10::jsonb AND label_bucket_limits=$11::jsonb AND mapping_hours=$12 AND research_expiry_utc=$13::timestamptz";
async function roleBoundary(c:PoolClient,installed:boolean){
 const q=(await c.query("SELECT rolcanlogin,rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls,rolinherit,has_schema_privilege(r.oid,$2,'USAGE') u,has_schema_privilege(r.oid,$2,'CREATE') cr FROM pg_roles r WHERE rolname=$1",[ROLE,SCHEMA])).rows;
 need(q.length===1&&q[0].u===installed&&Object.entries(q[0]).every(([k,v])=>k==="u"||v===false),"PRE_ROLE_SCOPE");
 const direct=(await c.query("SELECT count(*)::int n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$2 AND c.relkind IN ('r','p','v','m','f') AND (has_any_column_privilege($1,c.oid,'SELECT,INSERT,UPDATE,REFERENCES') OR has_table_privilege($1,c.oid,'DELETE,TRUNCATE,TRIGGER'))",[ROLE,SCHEMA])).rows[0];
 const funcs=(await c.query("SELECT p.oid=to_regprocedure($3)::oid target,has_function_privilege($1,p.oid,'EXECUTE') ok,has_function_privilege($1,p.oid,'EXECUTE WITH GRANT OPTION') can_grant FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname=$2",[ROLE,SCHEMA,FN])).rows;
 need(direct.n===0&&funcs.length===7&&funcs.filter(x=>x.target).length===1&&funcs.every(x=>x.ok===(installed&&x.target)&&x.can_grant===false),"NO_DIRECT_TABLE_OR_OTHER_FUNCTION_GRANTS");
}
/** Real PRE writer-role check, without executing the writer on fake data
 * or granting direct policy table access. Caller uses existing Stage28. */
export async function inspectPhase7PreWriterRole(pool:Pick<Pool,"connect">){
 const c=await pool.connect();
 try{
  await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  await c.query("SET LOCAL statement_timeout='12000ms'");
  const z=(await c.query("SELECT current_database() db,current_user actor,session_user login,current_setting('transaction_read_only') ro,current_setting('server_version_num')::int ver,pg_is_in_recovery() replica,clock_timestamp() at")).rows;
  const a=z[0];need(z.length===1&&a.db==="neondb"&&a.actor===ROLE&&a.login==="phase5_p30_pre_login_20261107"&&a.ro==="on"&&a.ver>=160000&&a.ver<170000&&a.replica===false&&a.at instanceof Date&&Number.isFinite(a.at.getTime()),"RESTRICTED_ACTUAL_WRITER");
  await roleBoundary(c,true);
  await c.query("ROLLBACK");
  return {observedDbClockUtc:a.at.toISOString() as string,providerCalls:0 as const,databaseWrites:0 as const};
 }finally{await c.query("ROLLBACK").catch(()=>{});c.release()}
}
async function checked(c:PoolClient,p:Compiled,installed:boolean){
 await roleBoundary(c,installed);
 const q=(await c.query("SELECT count(*)::int total,count(*) FILTER(WHERE "+exactRow+")::int exact FROM "+TABLE,[...p.rowValues])).rows[0];
 need(q.total===(installed?1:0)&&q.exact===(installed?1:0),"POLICY_ROW_DRIFT_OR_REPLAY");
}
export async function inspectPhase7PrePolicyCommission(pool:Pool,p:Compiled){
 const c=await pool.connect();
 try{await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");await checked(c,p,true);await c.query("ROLLBACK");return {status:"P7_EXACT_PRE_POLICY_AND_NARROW_GRANT_READBACK_NO_GO",policyReviewSha256:p.policyReviewSha256,rowSha256:p.rowSha256,policyRows:1,providerCalls:0,databaseWrites:0,phase6PaidGo:false};}
 finally{await c.query("ROLLBACK").catch(()=>{});c.release()}
}
export async function installPhase7PrePolicyOnce(pool:Pool,raw:Buffer,scope:Phase7PrePolicyCommissionScope,assertDisabledOwner:(c:PoolClient)=>Promise<void>){
 const p=compilePhase7PrePolicyCommission(raw,scope),c=await pool.connect();let commit=false,ack=false;
 try{
  await c.query("BEGIN ISOLATION LEVEL SERIALIZABLE");await c.query("SET LOCAL statement_timeout='30000ms'; SET LOCAL lock_timeout='2000ms'");
  await assertDisabledOwner(c);
  const at=(await c.query("SELECT clock_timestamp() at")).rows[0]?.at;
  need(at instanceof Date&&at.getTime()<Date.parse(scope.firstSourceUtc),"PRELAUNCH_CLOCK_ELAPSED");
  await c.query("LOCK TABLE "+TABLE+" IN SHARE ROW EXCLUSIVE MODE");
  await checked(c,p,false);
  await c.query("INSERT INTO "+TABLE+"("+columns+") VALUES($1,$2,$3,$4,$5,$6::timestamptz,$7::timestamptz,$8,$9,$10::jsonb,$11::jsonb,$12,$13::timestamptz)",[...p.rowValues]);
  await c.query("GRANT USAGE ON SCHEMA "+SCHEMA+" TO "+ROLE);
  await c.query("GRANT EXECUTE ON FUNCTION "+FN+" TO "+ROLE);
  await checked(c,p,true);await assertDisabledOwner(c);
  const end=(await c.query("SELECT clock_timestamp() at")).rows[0]?.at;
  need(end instanceof Date&&end.getTime()<Date.parse(scope.firstSourceUtc),"PRELAUNCH_CLOCK_ELAPSED");
  commit=true;await c.query("COMMIT");ack=true;
  return {status:"P7_PRE_POLICY_COMMITTED_AWAIT_FRESH_READBACK_NO_GO",policyReviewSha256:p.policyReviewSha256,rowSha256:p.rowSha256,policyRows:1,providerCalls:0,phase6PaidGo:false};
 }finally{if(!commit)await c.query("ROLLBACK").catch(()=>{});c.release(commit&&!ack?Error("P7_UNKNOWN_POLICY_COMMIT_INSPECT_NO_REPLAY"):undefined)}
}
