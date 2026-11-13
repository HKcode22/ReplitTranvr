/**
 * Phase5/6: NONPAID LOCAL PRIVATE write-once staging of authentic externally
 * Ed25519-reviewed native later-PRE packet and registry bytes.
 *
 * NEVER writes into the PUBLIC GitHub repository, GH Actions artifacts, or
 * its working checkout. No SaaS/object-store transport or production signer.
 * The caller provides an already owned 0700 private *external* directory;
 * SOURCE day registry must already be independently committed there.
 *
 * This publishes prospective private bytes ONLY, not to GitHub workers.
 * Failure mid-write is a HOLD, never blindly replay or roll back an unknown
 * durable commit. A separate authenticated private transport and full
 * original Stage14/phase6 GO remain mandatory.
 */
import {
 closeSync,openSync,readFileSync,writeSync,fsyncSync,linkSync,unlinkSync,
 lstatSync,realpathSync
} from "node:fs";
import {randomBytes,createHash} from "node:crypto";
import {basename,resolve,join,sep,isAbsolute} from "node:path";
import {
 verifyP5ExternalEd25519ReviewOfLaterShard,
 digestP5LaterShardPrivatePacketFileManifest,
 type P5Ed25519ReviewWireEnvelope,
 type P5ExternalLaterReviewSignerPins
} from "./phase5ExternalEd25519LaterShardReviewerVerify_v39";
import type {P5UnsignedLaterRegistryReviewPlan}
 from "./phase5ReviewedLaterPacketToUnsignedDayRegistryProposal_v39";
const FILE=/^data-collection\/phase5\/frozen\/[A-Za-z0-9_-]{8,100}\.json$/;
const SOURCE=/^data-collection\/phase5\/frozen\/[A-Za-z0-9_.-]{8,125}\.json$/;
const SHA=/^[a-f0-9]{64}$/;
const hash=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const fail=(s:string):never=>{throw Error("HOLD_P5_PRIVATE_WRITE_ONCE_"+s);};
function strictRoot(root:string,publicCheckout:string){
 if(typeof root!=="string"||!isAbsolute(root)||
    root.includes("\u0000")||typeof publicCheckout!=="string"||
    !isAbsolute(publicCheckout))
  fail("ABSOLUTE_PRIVATE_ROOT_AND_PUBLIC_CHECKOUT_REQUIRED");
 const dir=resolve(root);
 const checkout=resolve(publicCheckout);
 let st:ReturnType<typeof lstatSync>,real:string;
 try{st=lstatSync(dir);real=realpathSync(dir);}
 catch{return fail("PRIVATE_ROOT_ABSENT_NOT_AUTO_CREATED");}
 if(!st.isDirectory()||st.isSymbolicLink()||real!==dir||
    (st.mode&0o777)!==0o700||
    (typeof process.getuid==="function"&&st.uid!==process.getuid())||
    real===checkout||real.startsWith(checkout+sep)||
    checkout.startsWith(real+sep)||
    real==="/"||real.startsWith("/proc/")||real.startsWith("/sys/"))
  fail("PRIVATE_ROOT_NOT_OWNED_0700_OUTSIDE_PUBLIC_CHECKOUT");
 return dir;
}
function privateFile(dir:string,logicalPath:string,source=false){
 if(!(source?SOURCE:FILE).test(logicalPath??""))
  fail("UNREVIEWED_LOGICAL_FROZEN_FILE_PATH");
 return join(dir,basename(logicalPath));
}
function readExistingPrivate(
 full:string,max:number
):Buffer{
 let st:ReturnType<typeof lstatSync>;
 try{st=lstatSync(full);}
 catch{return fail("PREEXISTING_SOURCE_OR_COMMITTED_FILE_MISSING");}
 if(!st.isFile()||st.isSymbolicLink()||
    (st.mode&0o777)!==0o600||
    (typeof process.getuid==="function"&&st.uid!==process.getuid())||
    st.size<100||st.size>max)
  fail("PREEXISTING_FILE_NOT_PRIVATE_0600_REGULAR");
 let b:Buffer;
 try{b=readFileSync(full);}
 catch{return fail("PRIVATE_FILE_READBACK_FAILED");}
 if(b.length!==st.size)
  fail("PRIVATE_FILE_SIZE_CHANGED_DURING_READBACK");
 return b;
}
function fsyncRoot(dir:string){
 let fd=-1;
 try{
  fd=openSync(dir,"r");
  fsyncSync(fd);
 }catch{return fail("PRIVATE_DIRECTORY_FSYNC_UNCERTAIN_COMMIT");}
 finally{if(fd>=0)closeSync(fd);}
}
/**
 * Atomic single-blob no-clobber publication via same-directory temp +
 * hard-link. A published destination is never rewritten or removed.
 * Unknown result from LINK/FSYNC is a hard HOLD requiring separate readback.
 */
function publishOne(dir:string,logical:string,bytes:Buffer){
 const target=privateFile(dir,logical);
 try{lstatSync(target);fail("TARGET_ALREADY_EXISTS_INDEPENDENT_READBACK_REQUIRED");}
 catch(e){
  if(e instanceof Error&&
     e.message.startsWith("HOLD_P5_PRIVATE_WRITE_ONCE_"))throw e;
  if((e as NodeJS.ErrnoException)?.code!=="ENOENT")
   fail("TARGET_PRECHECK_IO_ERROR");
 }
 const temp=join(dir,".p5tmp_"+randomBytes(18).toString("hex"));
 let fd=-1;
 let linked=false;
 try{
  fd=openSync(temp,"wx",0o600);
  let pos=0;
  while(pos<bytes.length){
   const n=writeSync(fd,bytes,pos,bytes.length-pos,pos);
   if(n<=0)fail("TEMP_WRITE_NOT_PROGRESSING");
   pos+=n;
  }
  fsyncSync(fd);closeSync(fd);fd=-1;
  // A distinct target can be linked only ONCE. No overwrites even under
  // concurrent publishers and no unsafe rename-over-existing behavior.
  linkSync(temp,target);
  linked=true;
  fsyncRoot(dir);
  const reloaded=readExistingPrivate(target,250_000);
  if(hash(reloaded)!==hash(bytes))
   fail("POST_PUBLICATION_INDEPENDENT_HASH_READBACK_DRIFT");
  fsyncRoot(dir);
 }catch(e){
  if(e instanceof Error&&e.message.startsWith("HOLD_P5_PRIVATE_WRITE_ONCE_"))
   throw e;
  fail(linked?
   "AFTER_LINK_UNKNOWN_DURABILITY_OR_READBACK_HOLD":
   "BEFORE_LINK_IO_FAILURE_NO_BLIND_RETRY");
 }finally{
  if(fd>=0)try{closeSync(fd);}catch{}
  // Removing the TEMP hard link must never remove a committed TARGET.
  try{unlinkSync(temp);}catch{}
 }
}
export interface P5PrivateShardPublishScope{
 /** Existing independently prepared 0700 local private root, outside repo. */
 privateRootAbsolute:string;
 /** Explicit real public Git checkout path (not inferred from a token). */
 publicCheckoutAbsolute:string;
 /** Physical owner permission for *private* storage only, not Phase6 GO. */
 exactOwnerPrivateStorageApproved:true;
 /** Must remain STOP; this operation is not a paid dispatcher. */
 adbAutoCollect:"0";
 phase6ProcessArmed:"0";
}
export interface P5PrivateShardPublisherReceipt{
 schema:"v39.phase5.private-write-once-later-shard-receipt.v1";
 status:"EXTERNAL_REVIEW_VERIFIED_AND_LOCAL_PRIVATE_SHARD_WRITE_ONCE_NO_GH_HANDOFF";
 sourceDayRegistrySha256:string;
 reviewedRegistrySha256:string;
 reviewedPacketManifestSha256:string;
 reviewerKeyFingerprintSha256:string;
 sourceRegistryPreexistedPrivate:true;
 privatePacketCount:number;
 newPrivateFiles:number;
 privateRegistryCommittedLast:true;
 privateRootOutsidePublicRepo:true;
 exportedPrivateFlightContentsInPublicRepo:false;
 immutableRemoteBackupProvenHere:false;
 githubConsumerCanReadPrivateRootHere:false;
 independentOrganizationalReviewerProvenHere:false;
 providerMLRightsProvenHere:false;
 existingStage14OrV0091Called:false;
 githubDispatches:0;databaseReads:0;databaseWrites:0;
 providerCalls:0;phase5ScientificFreezeGranted:false;
 phase6PaidGoGranted:false;
}
/** No public logging of the packet buffers or private root absolute path. */
export function stageP5ExternallyReviewedLaterShardPrivatelyOnce(
 plan:P5UnsignedLaterRegistryReviewPlan,
 wire:P5Ed25519ReviewWireEnvelope,
 reviewerPublicKeyPem:string,
 pins:P5ExternalLaterReviewSignerPins,
 observedDbClockUtc:string,
 scope:P5PrivateShardPublishScope
):P5PrivateShardPublisherReceipt{
 if(!scope||scope.exactOwnerPrivateStorageApproved!==true||
    scope.adbAutoCollect!=="0"||scope.phase6ProcessArmed!=="0")
  fail("LOCAL_PRIVATE_ONLY_APPROVAL_NOT_GIVEN_OR_PAID_GATE_ARMED");
 // Verify actual signature and in-packet SOURCE/rights before any filesystem
 // write. This pure check still does not attest organizational independence.
 const verified=verifyP5ExternalEd25519ReviewOfLaterShard(
  plan,wire,reviewerPublicKeyPem,pins,observedDbClockUtc);
 const dir=strictRoot(scope.privateRootAbsolute,scope.publicCheckoutAbsolute);
 const src=privateFile(dir,plan.registryProposal.sourceDayRegistryFilePath,true);
 const srcBytes=readExistingPrivate(src,100_000);
 if(hash(srcBytes)!==verified.reviewedSourceDayRegistrySha256)
  fail("SOURCE_DAY_PRIVATE_BYTES_NOT_PREEXISTING_EXTERNALLY_PINNED");
 let parsed:unknown;
 try{parsed=JSON.parse(srcBytes.toString("utf8"));}
 catch{return fail("SOURCE_DAY_PRIVATE_JSON_MALFORMED");}
 const source=parsed as {schema?:string;manifestSha256?:string;runDayIndex?:number;entries?:unknown[]};
 if(source.schema!=="v39.phase5.signed-per-day-source-batch-readonly.v1"||
    source.runDayIndex!==plan.registryProposal.runDayIndex||
    source.manifestSha256!==plan.registryProposal.manifestSha256||
    !Array.isArray(source.entries)||source.entries.length<1||
    source.entries.length>96)
  fail("PREEXISTING_PRIVATE_SOURCE_DAY_NOT_SCOPE_MATCHED");
 // All private destination names must be unique, non-source and absent
 // BEFORE writing anything; refuse partially committed shards.
 const targets=plan.proposedPacketFiles.map(x=>x.filePath).concat([
  plan.proposedRegistryFilePath
 ]);
 if(new Set(targets.map(x=>basename(x))).size!==targets.length||
    targets.some(x=>basename(x)===basename(
     plan.registryProposal.sourceDayRegistryFilePath)))
  fail("COLLIDING_PRIVATE_LOGICAL_BASENAME");
 for(const logical of targets){
  const target=privateFile(dir,logical);
  try{lstatSync(target);fail("PARTIAL_OR_EXISTING_SHARD_HOLD_FOR_READBACK");}
  catch(e){
   if(e instanceof Error&&
      e.message.startsWith("HOLD_P5_PRIVATE_WRITE_ONCE_"))throw e;
   if((e as NodeJS.ErrnoException)?.code!=="ENOENT")
    fail("UNKNOWN_PRIVATE_PREWRITE_TARGET_STATE");
  }
 }
 // The real PG16 DB clock must be authenticated by the caller. A signed
 // review is not permission to retroactively publish an expired PRE.
 const now=Date.parse(verified.observedDbClockUtc);
 for(const e of plan.registryProposal.entries){
  const cutoff=Date.parse(e.expectedSelectedTNativeUtc)-
   (e.expectedHorizon==="T-6h"?6*3600_000:90*60_000);
  if(!Number.isFinite(cutoff)||cutoff-now<=15*60_000)
   fail("LATE_OR_TOO_CLOSE_NATIVE_CUTOFF_NO_BACKFILL");
 }
 // Each exact packet is linked atomically, then registry is committed LAST.
 // On any partial write the function HOLDS; it must NOT restart blindly.
 for(const f of plan.proposedPacketFiles)
  publishOne(dir,f.filePath,f.bytes);
 publishOne(dir,plan.proposedRegistryFilePath,plan.registryProposalBytes);
 return{
  schema:"v39.phase5.private-write-once-later-shard-receipt.v1",
  status:"EXTERNAL_REVIEW_VERIFIED_AND_LOCAL_PRIVATE_SHARD_WRITE_ONCE_NO_GH_HANDOFF",
  sourceDayRegistrySha256:verified.reviewedSourceDayRegistrySha256,
  reviewedRegistrySha256:verified.reviewedRegistrySha256,
  reviewedPacketManifestSha256:
   digestP5LaterShardPrivatePacketFileManifest(plan),
  reviewerKeyFingerprintSha256:verified.reviewerKeyFingerprintSha256,
  sourceRegistryPreexistedPrivate:true,
  privatePacketCount:plan.proposedPacketFiles.length,
  newPrivateFiles:plan.proposedPacketFiles.length+1,
  privateRegistryCommittedLast:true,
  privateRootOutsidePublicRepo:true,
  exportedPrivateFlightContentsInPublicRepo:false,
  immutableRemoteBackupProvenHere:false,
  githubConsumerCanReadPrivateRootHere:false,
  independentOrganizationalReviewerProvenHere:false,
  providerMLRightsProvenHere:false,
  existingStage14OrV0091Called:false,
  githubDispatches:0,databaseReads:0,databaseWrites:0,
  providerCalls:0,phase5ScientificFreezeGranted:false,
  phase6PaidGoGranted:false
 };
}
/** Read-only inspection after ambiguous write: no automatic replay. */
export function inspectP5PrivateLaterShardReadback(
 plan:P5UnsignedLaterRegistryReviewPlan,
 scope:Pick<P5PrivateShardPublishScope,
   "privateRootAbsolute"|"publicCheckoutAbsolute">
){
 const dir=strictRoot(scope.privateRootAbsolute,scope.publicCheckoutAbsolute);
 if(!plan?.registryProposalBytes||!Buffer.isBuffer(plan.registryProposalBytes)||
    plan.proposedRegistrySha256!==hash(plan.registryProposalBytes))
  fail("READBACK_UNPINNED_REGISTRY");
 const files=plan.proposedPacketFiles.map(x=>({
  path:x.filePath,sha:x.sha256,max:200_000
 })).concat([{
  path:plan.proposedRegistryFilePath,sha:plan.proposedRegistrySha256,
  max:250_000
 }]);
 if(files.length<2||files.length>97)
  fail("UNBOUNDED_READBACK_FILE_COUNT");
 const states=files.map(f=>{
  const full=privateFile(dir,f.path);
  try{
   const b=readExistingPrivate(full,f.max);
   return hash(b)===f.sha?"EXACT_PRIVATE_BYTES":"MISMATCH_HOLD";
  }catch{return "MISSING_OR_UNVERIFIED_HOLD";}
 });
 return{
  schema:"v39.phase5.private-later-shard-readback-no-retry.v1" as const,
  exactFileCount:states.filter(x=>x==="EXACT_PRIVATE_BYTES").length,
  missingOrMismatchCount:
   states.filter(x=>x!=="EXACT_PRIVATE_BYTES").length,
  registryExact:states.at(-1)==="EXACT_PRIVATE_BYTES",
  safeToBlindlyReplay:false as const,
  paidPhase6Go:false as const,
  flightContentsLogged:false as const
 };
}
