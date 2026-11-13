/**
 * Phase5/6: READ ONLY actual private PG16 bytea transport -> EXISTING
 * later-PRE registry verifier and native-time cutoff selector.
 *
 * No direct provider calls, SQL writes, GitHub checkout artifact, secret
 * handling or new Stage14 PRE path. The dedicated NOLOGIN group created by
 * staged V0094 will require separately reviewed future LOGIN commissioning.
 * This module cannot certify legal source rights or independent signer
 * authority: immutable expected registry/source/reviewer SHA pins must come
 * from the separately approved release, not from this query response.
 *
 * Returned verified object holds actual private packet bytes. NEVER log or
 * stringify it; only the redactedSummary is safe for GitHub stdout.
 */
import {createHash} from "node:crypto";
import {
 verifyP5SignedLaterPreDayRegistry,
 selectP5LaterPreDueRegistryEntries,
 type P5SignedLaterPreDayRegistryPins,
 type P5SignedLaterPreDayRegistry
} from "./phase5SignedLaterPreDayRegistry_v39";
import type {P5SignedSourceBatchRegistry}
 from "./phase5SignedPerDaySourceBatchReadonly_v39";

const SHA=/^[a-f0-9]{64}$/;
const CODE=/^[a-f0-9]{40}$/;
const PATH=/^data-collection\/phase5\/frozen\/[A-Za-z0-9_.-]{8,125}\.json$/;
const NOLOGIN="phase6_private_frozen_reader_v39";
const TABLE="phase6_private.frozen_native_packet_v39";
const MAX_FLIGHTS=96;
const fail=(s:string):never=>{
 throw Error("REFUSED_P5_PHASE6_PRIVATE_PG_HYDRATION_"+s);
};
const hash=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
export interface P5PrivateReadonlyQueryResult{
 rowCount:number|null;
 rows:Record<string,unknown>[];
}
export interface P5PrivateReadonlyQuery{
 query(sql:string,params?:unknown[]):Promise<P5PrivateReadonlyQueryResult>;
}
export interface P5PrivateFrozenHydrationPins
 extends P5SignedLaterPreDayRegistryPins{
 expectedSourceRegistryPath:string;
 expectedPrivateSessionLogin:string;
 expectedSourceReviewEvidenceSha256:string;
 expectedLaterReviewEvidenceSha256:string;
 /** Explicit STOP-default approval for PRIVATE read only, not Phase6 GO. */
 privateReadOnlyApproved:true;
 paidProviderCallsAllowed:false;
 /** Provider Contents and native T permission is still separately reviewed. */
}
export interface P5PrivateFrozenHydrationOutput{
 schema:"v39.phase5.phase6-pg16-private-later-hydration.v1";
 /** Contains private flight bytes; DO NOT log. */
 verified:ReturnType<typeof verifyP5SignedLaterPreDayRegistry>;
 /** Existing native cutoff selector; not authorization to dispatch. */
 due:ReturnType<typeof selectP5LaterPreDueRegistryEntries>;
 observedDbClockUtc:string;
 redactedSummary:{
  runDayIndex:number;
  shardIndex:number;
  signedNativeFlightHorizons:number;
  dueForRealReadback:number;
  genuinelyMissedOrTooClose:number;
  deferredWithinWindow:number;
  actualPrivatePayloadsRead:number;
  sourceRegistrySha256:string;
  laterRegistrySha256:string;
  producerRoleVerified:true;
  publicCheckoutContentsEmitted:false;
  providerCalls:0;
  databaseWrites:0;
  githubDispatches:0;
  phase5ScientificFreezeGranted:false;
  phase6PaidGoGranted:false;
 };
}
export async function hydrateP5PrivateLaterPreFromPg16ReadOnly(
 client:P5PrivateReadonlyQuery,
 pins:P5PrivateFrozenHydrationPins
):Promise<P5PrivateFrozenHydrationOutput>{
 if(!client||typeof client.query!=="function"||!pins||
    pins.privateReadOnlyApproved!==true||
    pins.paidProviderCallsAllowed!==false||
    !PATH.test(pins.registryFilePath??"")||
    !PATH.test(pins.expectedSourceRegistryPath??"")||
    pins.registryFilePath===pins.expectedSourceRegistryPath||
    ![pins.expectedRegistrySha256,
      pins.expectedSourceDayRegistrySha256,
      pins.expectedManifestSha256,
      pins.expectedReleaseSha256,
      pins.expectedRightsSha256,
      pins.expectedSourceReviewEvidenceSha256,
      pins.expectedLaterReviewEvidenceSha256].every(x=>
        typeof x==="string"&&SHA.test(x))||
    !CODE.test(pins.expectedApprovedMainSha??"")||
    typeof pins.expectedPrivateSessionLogin!=="string"||
    !/^phase6_private_reader_login_[a-z0-9_]{6,50}$/
      .test(pins.expectedPrivateSessionLogin)||
    !Number.isSafeInteger(pins.expectedRunDayIndex)||
    pins.expectedRunDayIndex<1||pins.expectedRunDayIndex>31)
  fail("NO_EXTERNAL_SHA_ROLE_OR_PRIVATE_ONLY_ADMISSION");
 let started=false;
 try{
  await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  started=true;
  // Authenticating the login and pg16 effective role in the SAME
  // read-only transaction prevents a generic app/owner connection being
  // used to bypass the exact dedicated private reader privileges.
  const rb=await client.query(
   "SELECT current_database() AS db, "+
   "current_setting('server_version_num')::integer AS server_version, "+
   "current_setting('transaction_read_only') AS ro, "+
   "current_user AS actor,session_user AS session_login, "+
   "clock_timestamp() AS db_now, "+
   "has_table_privilege(current_user,'"+TABLE+"','SELECT') AS can_read, "+
   "has_table_privilege(current_user,'"+TABLE+"','INSERT') AS can_insert, "+
   "has_table_privilege(current_user,'"+TABLE+"','UPDATE') AS can_update, "+
   "has_table_privilege(current_user,'"+TABLE+"','DELETE') AS can_delete, "+
   "login.rolcanlogin AS login_enabled, "+
   "login.rolsuper AS login_superuser, "+
   "login.rolcreaterole AS login_createrole, "+
   "effective.rolcanlogin AS group_can_login, "+
   "effective.rolbypassrls AS group_bypass_rls "+
   "FROM pg_catalog.pg_roles login,pg_catalog.pg_roles effective "+
   "WHERE login.rolname=session_user AND effective.rolname=current_user"
  );
  const actor=rb.rows[0];
  if(rb.rowCount!==1||!actor||
     actor.db!=="neondb"||Number(actor.server_version)<160000||
     actor.ro!=="on"||actor.actor!==NOLOGIN||
     actor.session_login!==pins.expectedPrivateSessionLogin||
     actor.login_enabled!==true||
     actor.login_superuser!==false||actor.login_createrole!==false||
     actor.group_can_login!==false||actor.group_bypass_rls!==false||
     actor.can_read!==true||
     actor.can_insert!==false||actor.can_update!==false||
     actor.can_delete!==false)
   fail("PG16_ROLE_IDENTITY_READONLY_PRIVILEGE_MATRIX_INVALID");
  const d=actor.db_now instanceof Date?
    actor.db_now:new Date(String(actor.db_now));
  if(!Number.isFinite(d.getTime()))fail("INVALID_AUTHENTIC_DB_CLOCK");
  const now=d.toISOString();
  // Registry loaded first by exactly pinned path. It cannot supply a
  // second unreviewed path to query unless it is in the signed registry.
  const registryResult=await client.query(
   "SELECT logical_path,run_day_index,shard_index,kind,"+
    "content_sha256,reviewed_code_sha,manifest_sha256,rights_sha256,"+
    "external_review_sha256,retention_not_after_utc,payload_bytes "+
    "FROM "+TABLE+" WHERE logical_path=$1",
   [pins.registryFilePath]
  );
  if(registryResult.rowCount!==1)
   fail("FROZEN_REGISTRY_NOT_COMMITTED_IN_PRIVATE_STORE");
  const registryRow=registryResult.rows[0];
  const registryRaw=registryRow?.payload_bytes;
  if(!Buffer.isBuffer(registryRaw)||
     registryRaw.length<100||registryRaw.length>250000||
     hash(registryRaw)!==pins.expectedRegistrySha256)
   fail("PRIVATE_REGISTRY_BYTES_NOT_EXTERNALLY_PINNED");
  let registry:P5SignedLaterPreDayRegistry;
  try{registry=JSON.parse(registryRaw.toString("utf8"))
    as P5SignedLaterPreDayRegistry;}
  catch{return fail("PRIVATE_REGISTRY_NONJSON");}
  if(registry.sourceDayRegistryFilePath!==
      pins.expectedSourceRegistryPath||
     registry.sourceDayRegistrySha256!==
      pins.expectedSourceDayRegistrySha256||
     registry.runDayIndex!==pins.expectedRunDayIndex||
     !Array.isArray(registry.entries)||
     registry.entries.length<1||
     registry.entries.length>MAX_FLIGHTS)
   fail("PRIVATE_REGISTRY_CHANGED_SOURCE_OR_DAY");
  // Fetch ALL exact bounded registry packets + exact SOURCE registry in a
  // SINGLE read-only snapshot query. No N round-trip per-flight lookup,
  // no arbitrary SQL, no public GitHub file read.
  const paths=[pins.expectedSourceRegistryPath,
   ...registry.entries.map(e=>e?.filePath)];
  if(paths.some(p=>!PATH.test(p??""))||
     new Set(paths).size!==paths.length||
     paths.includes(pins.registryFilePath))
   fail("UNTRUSTED_DUPLICATE_OR_UNBOUNDED_PRIVATE_PACKET_PATHS");
  const all=await client.query(
   "SELECT logical_path,run_day_index,shard_index,kind,"+
    "content_sha256,reviewed_code_sha,manifest_sha256,rights_sha256,"+
    "external_review_sha256,retention_not_after_utc,payload_bytes "+
    "FROM "+TABLE+" WHERE logical_path=ANY($1::text[])",
   [paths]
  );
  if(all.rowCount!==paths.length||all.rows.length!==paths.length)
   fail("PRIVATE_SOURCE_OR_PACKET_MISSING_NO_IMPLICIT_BACKFILL");
  const index=new Map<string,Buffer>();
  const expiry=(value:unknown)=>{
   const t=value instanceof Date?value:new Date(String(value));
   if(!Number.isFinite(t.getTime())||t.getTime()<=d.getTime())
    fail("LAWFUL_PROVIDER_RETENTION_EXPIRED_HOLD");
  };
  const inspect=(e:Record<string,unknown>,expectKind:string,
   expectedSha:string,expectedReviewerSha:string,
   shard:number|null,expectedPath:string,max:number)=>{
    if(e.logical_path!==expectedPath||e.kind!==expectKind||
       e.run_day_index!==pins.expectedRunDayIndex||
       (shard!==null&&e.shard_index!==shard)||
       e.manifest_sha256!==pins.expectedManifestSha256||
       e.rights_sha256!==pins.expectedRightsSha256||
       e.reviewed_code_sha!==pins.expectedApprovedMainSha||
       e.external_review_sha256!==expectedReviewerSha||
       e.content_sha256!==expectedSha||
       !Buffer.isBuffer(e.payload_bytes)||
       e.payload_bytes.length<100||e.payload_bytes.length>max||
       hash(e.payload_bytes)!==expectedSha)
     fail("PRIVATE_FLIGHT_SOURCE_OR_REVIEW_METADATA_DRIFT");
    expiry(e.retention_not_after_utc);
    return e.payload_bytes as Buffer;
  };
  inspect(registryRow,"LATER_PRE_DAY_REGISTRY",
   pins.expectedRegistrySha256,
   pins.expectedLaterReviewEvidenceSha256,
   registry.shardIndex,pins.registryFilePath,250000);
  for(const row of all.rows){
   if(typeof row.logical_path!=="string"||
      !paths.includes(row.logical_path)||
      index.has(row.logical_path))
    fail("UNREVIEWED_OR_DUPLICATE_PRIVATE_PG_ROW");
   const isSource=row.logical_path===pins.expectedSourceRegistryPath;
   const e=isSource?undefined:
     registry.entries.find(x=>x.filePath===row.logical_path);
   if(!isSource&&!e)
    fail("PRIVATE_FLIGHT_NOT_IN_EXTERNALLY_PINNED_DAY_REGISTRY");
   const bytes=inspect(
    row,isSource?"SOURCE_DAY_REGISTRY":"LATER_PRE_PACKET",
    isSource?pins.expectedSourceDayRegistrySha256:e!.expectedPacketSha256,
    isSource?pins.expectedSourceReviewEvidenceSha256:
      pins.expectedLaterReviewEvidenceSha256,
    isSource?null:registry.shardIndex,row.logical_path,
    isSource?100000:200000
   );
   index.set(row.logical_path,bytes);
  }
  const sourceRaw=index.get(pins.expectedSourceRegistryPath);
  if(!sourceRaw)fail("REVIEWED_SOURCE_REGISTRY_ABSENT");
  let source:P5SignedSourceBatchRegistry;
  try{source=JSON.parse(sourceRaw.toString("utf8")) as P5SignedSourceBatchRegistry;}
  catch{return fail("PRIVATE_SOURCE_DAY_NONJSON");}
  const verified=verifyP5SignedLaterPreDayRegistry(
   registryRaw,registry,sourceRaw,source,pins,(path)=>{
    const bytes=index.get(path);
    if(!bytes)fail("PRIVATE_PACKET_NOT_IN_ONE_READONLY_SNAPSHOT");
    return bytes!;
   }
  );
  const due=selectP5LaterPreDueRegistryEntries(verified,now);
  await client.query("ROLLBACK");started=false;
  return{
   schema:"v39.phase5.phase6-pg16-private-later-hydration.v1",
   verified,due,observedDbClockUtc:now,
   redactedSummary:{
    runDayIndex:verified.runDayIndex,
    shardIndex:verified.shardIndex,
    signedNativeFlightHorizons:verified.entries.length,
    dueForRealReadback:due.dueForActualPgReadback,
    genuinelyMissedOrTooClose:
     due.statuses.filter(x=>x.state==="MISSED_OR_TOO_CLOSE_CENSOR").length,
    deferredWithinWindow:due.deferredWithinWindowCount,
    actualPrivatePayloadsRead:paths.length+1,
    sourceRegistrySha256:pins.expectedSourceDayRegistrySha256,
    laterRegistrySha256:pins.expectedRegistrySha256,
    producerRoleVerified:true,
    publicCheckoutContentsEmitted:false,
    providerCalls:0,databaseWrites:0,githubDispatches:0,
    phase5ScientificFreezeGranted:false,phase6PaidGoGranted:false
   }
  };
 }catch(e){
  // May not send another transaction after an unknown network failure; any
  // query/readback error MUST HOLD and never dispatch based on partial bytes.
  if(e instanceof Error&&
     e.message.startsWith("REFUSED_P5_PHASE6_PRIVATE_PG_HYDRATION_"))
   throw e;
  fail("PRIVATE_SQL_READ_UNKNOWN_OR_WITHOUT_COMMIT_PROOF");
 }finally{
  if(started)await client.query("ROLLBACK").catch(()=>{});
 }
}
