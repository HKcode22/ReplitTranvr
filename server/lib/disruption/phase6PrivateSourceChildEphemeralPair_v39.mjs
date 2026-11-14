/**
 * Phase 6 single-job ephemeral adapter AFTER both private SOURCE receipts
 * are independently verified and bound by the V0096 index admission.
 * Only makes the two existing Phase5 frozen relative paths available in
 * an untracked GitHub runner and always attempts to erase both on exit.
 *
 * It does NOT run a provider GET, dispatch Actions, sign a packet, grant
 * legal rights or bypass the existing paid child's OWN signed admission.
 */
import {
 lstatSync,mkdirSync,readFileSync,writeFileSync,openSync,closeSync,chmodSync,unlinkSync
} from "node:fs";
import {resolve,join,dirname} from "node:path";
import {createHash} from "node:crypto";
import {P6_SOURCE_QUERY_PAIR_SCHEMA}
 from "./phase6PrivateSourceQueryBindingInMemory_v39.mjs";

export const P6_PRIVATE_SOURCE_EPHEMERAL_PAIR_SCHEMA=
 "v39.phase6.private-source-ephemeral-existing-child-pair-no-go.v1";
const REG=/^data-collection\/phase5\/frozen\/source_[A-Za-z0-9_.-]{8,125}\.json$/;
const PACK=/^data-collection\/phase5\/frozen\/sourceq_[A-Za-z0-9_.-]{8,110}\.json$/;
const SHA=/^[0-9a-f]{64}$/;
const fail=c=>{throw Error("HOLD_P6_PRIVATE_SOURCE_EPHEMERAL_PAIR_"+c);};
const hash=b=>createHash("sha256").update(b).digest("hex");
function assertOrdinaryDir(p){
 let s;
 try{s=lstatSync(p);}catch{fail("MISSING_SAFE_REPOSITORY_PARENT");}
 if(!s.isDirectory()||s.isSymbolicLink())
  fail("SYMLINK_OR_NON_DIRECTORY_PARENT");
}
function sealed(o,k){
 const d=Object.getOwnPropertyDescriptor(o??{},k);
 return Boolean(d&&d.enumerable===false&&d.writable===false);
}
export async function withP6VerifiedPrivateSourcePairForExistingChild(
 pair,repoRoot,scope,runExistingSourceChild
){
 const q=pair?.redactedSummary;
 if(!scope||
    scope.ephemeralSourceRegistryAndQueryPairApproved!==true||
    scope.existingSourceChildIndependentlyAdmitted!==true||
    scope.privateReaderOnlySourcePairApproved!==true||
    scope.existingChildMustRecheckAllReleaseAndSpendGates!==true||
    typeof runExistingSourceChild!=="function"||
    !q||q.schema!==P6_SOURCE_QUERY_PAIR_SCHEMA||
    q.status!=="ONE_PRIVATE_SOURCE_QUERY_BOUND_TO_SIGNED_REGISTRY_NO_DISPATCH"||
    q.requiresExistingP5SignedDaySourceChildAdmission!==true||
    q.independentLegalRetentionAndPaidGoStillRequired!==true||
    q.phase6PaidGo!==false||
    q.providerCalls!==0||q.databaseWrites!==0||
    q.githubChildDispatches!==0||
    !sealed(pair,"privateRegistryBytes")||
    !sealed(pair,"privateQueryBytes")||
    !sealed(pair,"privateRegistryPath")||
    !sealed(pair,"privateQueryPath")||
    !REG.test(pair.privateRegistryPath??"")||
    !PACK.test(pair.privateQueryPath??"")||
    pair.privateRegistryPath===pair.privateQueryPath||
    !Buffer.isBuffer(pair.privateRegistryBytes)||
    !Buffer.isBuffer(pair.privateQueryBytes)||
    pair.privateRegistryBytes.length<100||
    pair.privateRegistryBytes.length>100000||
    pair.privateQueryBytes.length<100||
    pair.privateQueryBytes.length>200000||
    !SHA.test(q.registrySha256??"")||
    !SHA.test(q.queryPacketSha256??"")||
    hash(pair.privateRegistryBytes)!==q.registrySha256||
    hash(pair.privateQueryBytes)!==q.queryPacketSha256)
  fail("NO_EXACT_PRIVATE_SOURCE_PAIR_AND_INDEPENDENT_CHILD_SCOPE");
 const root=resolve(repoRoot);
 const mid=join(root,"data-collection");
 const p5=join(mid,"phase5");
 const frozen=join(p5,"frozen");
 assertOrdinaryDir(root);
 assertOrdinaryDir(mid);
 assertOrdinaryDir(p5);
 let ignore;
 try{ignore=readFileSync(join(root,".gitignore"),"utf8");}
 catch{fail("EXACT_FROZEN_GITIGNORE_MISSING");}
 if(!ignore.split(/\r?\n/).includes("/data-collection/phase5/frozen/"))
  fail("PUBLIC_FROZEN_GITIGNORE_RULE_MISSING");
 try{mkdirSync(frozen,{mode:0o700,recursive:true});}
 catch{fail("PRIVATE_FROZEN_DIRECTORY_CREATION_FAILED");}
 assertOrdinaryDir(frozen);
 try{chmodSync(frozen,0o700);}
 catch{fail("PRIVATE_FROZEN_DIRECTORY_PERMISSIONS_FAILED");}
 const registerFile=resolve(root,pair.privateRegistryPath);
 const queryFile=resolve(root,pair.privateQueryPath);
 if(dirname(registerFile)!==frozen||dirname(queryFile)!==frozen)
  fail("PRIVATE_PACKET_FILE_OUTSIDE_EXACT_FROZEN_DIRECTORY");
 const created=[];
 let cleanupFailed=false,childFinished=false;
 try{
  for(const [f,bytes] of [
   [registerFile,pair.privateRegistryBytes],
   [queryFile,pair.privateQueryBytes]
  ]){
   // A collision is an incident, not permission to overwrite, even when
   // a parallel job coincidentally selected identical signed bytes.
   const fd=openSync(f,"wx",0o600);
   created.push(f);
   try{writeFileSync(fd,bytes);}
   finally{closeSync(fd);}
  }
  await runExistingSourceChild(
   Object.freeze({registryFilePath:pair.privateRegistryPath,
     queryPacketFilePath:pair.privateQueryPath}),
   Object.freeze({...q})
  );
  childFinished=true;
 }catch{
  // Suppress arbitrary callback errors (may contain paid or private bytes).
  fail("CHILD_REFUSED_OR_PRIVATE_FILE_MATERIALIZATION_FAILED_REDACTED");
 }finally{
  // Always attempt ALL cleanup, including partial materialization.
  for(const f of created.reverse()){
   try{unlinkSync(f);}
   catch{cleanupFailed=true;}
  }
  if(cleanupFailed)fail("PRIVATE_FILE_CLEANUP_FAILED_STOP_AND_INCIDENT");
 }
 if(!childFinished)fail("CHILD_DID_NOT_COMPLETE");
 return Object.freeze({
  schema:P6_PRIVATE_SOURCE_EPHEMERAL_PAIR_SCHEMA,
  status:"PRIVATE_SOURCE_PAIR_EPHEMERAL_CHILD_CLEANUP_COMPLETED",
  runDayIndex:q.runDayIndex,
  routingIntentSha256:q.routingIntentSha256,
  queryDigestSha256:q.queryDigestSha256,
  privateQueryAndRegistryFilesDeleted:true,
  existingChildOwnPaidAdmissionStillMandatory:true,
  sourcePaidGetExecutionNotAttestedHere:true,
  providerCallsByAdapter:0,
  databaseWritesByAdapter:0,
  githubDispatchesByAdapter:0,
  phase6PaidGoCertifiedHere:false
 });
}
