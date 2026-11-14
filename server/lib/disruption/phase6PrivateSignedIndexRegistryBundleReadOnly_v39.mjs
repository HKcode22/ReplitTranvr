/**
 * Phase6 private current+prior INDEX -> exact V0094/V0095 SOURCE/LATER/POST
 * frozen REGISTRY bytes, entirely in memory using same restricted PG16 reader.
 *
 * No file IO/public GitHub flight contents, no SOURCE/PRE/POST dispatch, no
 * provider REST, no writes, no signer, no legal rights certification.
 * Must be followed by the existing full signed-index scientific validator,
 * true native cutoff/flight source admission, real budget and paid GO.
 *
 * Status/report has NO private logical paths. Buffers and synchronous
 * getFrozen() callback are intentionally non-enumerable and only usable by
 * a separately reviewed same-process shard validator, never logged.
 */
import {createHash} from "node:crypto";
import {
 readP6PrivateSignedIndexCurrentAndPriorOnce
} from "./phase6PrivateSignedIndexReadOnce_v39.mjs";

export const P6_PRIVATE_REGISTRY_BUNDLE_SCHEMA=
 "v39.phase6.pg16-private-index-frozen-registry-bundle-readonly.v1";
const TABLE="phase6_private.frozen_native_packet_v39";
const INDEX_TABLE="phase6_private.signed_day_shard_index_revision_v39";
const ROLE="phase6_private_frozen_reader_v39";
const LOGIN=/^phase6_private_reader_login_[a-z0-9_]{6,50}$/;
const PATH=/^data-collection\/phase5\/frozen\/[A-Za-z0-9_.-]{8,125}\.json$/;
const SHA=/^[0-9a-f]{64}$/;
const CODE=/^[0-9a-f]{40}$/;
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const MAX_ENTRIES=1024,MAX_CHUNK=48;
const MAX_READ_BYTES=256*1024*1024;
const MAX_SINGLE=250000,MAX7=7*86400000;
const kinds={SOURCE:"SOURCE_DAY_REGISTRY",LATER_PRE:"LATER_PRE_DAY_REGISTRY",POST:"POST_PACKET"};
const fail=s=>{throw Error("HOLD_P6_PRIVATE_INDEX_REGISTRY_BUNDLE_"+s);};
const sha=b=>createHash("sha256").update(b).digest("hex");
function dbUtc(x){
 const d=x instanceof Date?x:new Date(String(x));
 if(!Number.isFinite(d.getTime()))fail("INVALID_REAL_PG_CLOCK");
 return d.getTime();
}
function strictUtc(x){
 if(typeof x!=="string"||!ISO.test(x)||
    !Number.isFinite(Date.parse(x))||
    new Date(x).toISOString()!==x)
  fail("INVALID_PRIVATE_INDEX_UTC");
 return Date.parse(x);
}
const exactKeys=(o,keys)=>o&&typeof o==="object"&&!Array.isArray(o)&&
 Object.keys(o).sort().join("|")===keys.slice().sort().join("|");
function validateIndexRegistryReferences(index){
 if(!index||!Array.isArray(index.entries)||
    index.entries.length<1||index.entries.length>MAX_ENTRIES)
  fail("UNBOUNDED_SIGNED_INDEX_ENTRIES");
 const seen=new Set(),byPath=new Map(),sources=new Map();
 for(const e of index.entries){
  if(!exactKeys(e,[
   "lane","runDayIndex","shardIndex","filePath","fileSha256",
   "publishedAtUtc","notBeforeUtc","hardLatestUtc",
   "reviewEvidenceSha256","sourceRegistryFilePath","sourceRegistrySha256"
  ])||!Object.hasOwn(kinds,e.lane)||
     !Number.isSafeInteger(e.runDayIndex)||e.runDayIndex<1||
     e.runDayIndex>31||
     !Number.isSafeInteger(e.shardIndex)||e.shardIndex<1||
     e.shardIndex>100000||
     !PATH.test(e.filePath??"")||
     !SHA.test(e.fileSha256??"")||
     !SHA.test(e.reviewEvidenceSha256??"")||
     seen.has(e.filePath)||
     strictUtc(e.notBeforeUtc)>=strictUtc(e.hardLatestUtc)||
     strictUtc(e.publishedAtUtc)>strictUtc(e.notBeforeUtc))
   fail("UNTRUSTED_PRIVATE_INDEX_ENTRY_OR_DUPLICATE_PATH");
  seen.add(e.filePath);byPath.set(e.filePath,e);
  if(e.lane==="SOURCE"){
   if(e.sourceRegistryFilePath!==null||
      e.sourceRegistrySha256!==null)
    fail("SOURCE_MUST_NOT_LINK_ANOTHER_SOURCE_REGISTRY");
   sources.set(e.filePath,e);
  }else if(!PATH.test(e.sourceRegistryFilePath??"")||
            !SHA.test(e.sourceRegistrySha256??""))
    fail("POST_OR_LATER_UNBOUND_SOURCE");
 }
 for(const e of index.entries){
  if(e.lane==="SOURCE")continue;
  const src=sources.get(e.sourceRegistryFilePath);
  if(!src||src.fileSha256!==e.sourceRegistrySha256||
     src.runDayIndex!==e.runDayIndex||
     strictUtc(src.publishedAtUtc)>strictUtc(e.publishedAtUtc))
   fail("NOT_A_REAL_SAME_DAY_SIGNED_SOURCE_REGISTRY_PROVENANCE");
 }
 return {seen,byPath};
}
export async function hydrateP6PrivateIndexAndRegistryBytesOnce({
 client,indexPins,indexReviewWire,indexReviewerPublicKeyPem
}){
 if(!client||typeof client.query!=="function"||
    !indexPins||indexPins.privateIndexReadOnlyApproved!==true||
    indexPins.privateFrozenRegistryReadOnlyApproved!==true||
    !LOGIN.test(indexPins.expectedReaderSessionLogin??""))
  fail("NO_SEPARATE_PRIVATE_REGISTRY_READ_ADMISSION");
 // External Ed25519 and actual restricted DB role/bytes/revision verification
 // happen in the existing reader before ANY frozen-registry SQL.
 const index=await readP6PrivateSignedIndexCurrentAndPriorOnce({
  client,pins:indexPins,reviewWire:indexReviewWire,
  reviewerPublicKeyPem:indexReviewerPublicKeyPem
 });
 const current=index.currentParsedIndex;
 const refs=validateIndexRegistryReferences(current);
 let started=false;
 try{
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  started=true;
  await client.query("SET LOCAL statement_timeout='20000ms'");
  await client.query("SET LOCAL lock_timeout='1500ms'");
  const idResult=await client.query(
   "SELECT current_database() AS db,"+
   "current_setting('server_version_num')::integer AS version,"+
   "current_setting('transaction_read_only') AS ro,"+
   "pg_catalog.pg_is_in_recovery() AS replica,"+
   "current_user AS actor,session_user AS login,"+
   "clock_timestamp() AS db_now,"+
   "has_table_privilege(current_user,'"+TABLE+"','SELECT') AS can_read,"+
   "has_table_privilege(current_user,'"+TABLE+"','INSERT') AS can_insert,"+
   "has_table_privilege(current_user,'"+TABLE+"','UPDATE') AS can_update,"+
   "has_table_privilege(current_user,'"+TABLE+"','DELETE') AS can_delete,"+
   "has_table_privilege(current_user,'"+INDEX_TABLE+"','SELECT') AS index_read,"+
   "login_role.rolcanlogin AS login_enabled,"+
   "login_role.rolsuper AS login_superuser,"+
   "login_role.rolcreaterole AS login_createrole,"+
   "grp.rolcanlogin AS group_login,"+
   "grp.rolbypassrls AS group_bypassrls"+
   " FROM pg_catalog.pg_roles login_role,pg_catalog.pg_roles grp"+
   " WHERE login_role.rolname=session_user AND grp.rolname=current_user"
  );
  const id=idResult?.rows?.[0];
  if(idResult?.rowCount!==1||!id||id.db!=="neondb"||
     Number(id.version)<160000||Number(id.version)>=170000||
     id.ro!=="on"||id.replica!==false||id.actor!==ROLE||
     id.login!==indexPins.expectedReaderSessionLogin||
     id.can_read!==true||id.can_insert!==false||
     id.can_update!==false||id.can_delete!==false||
     id.index_read!==true||id.login_enabled!==true||
     id.login_superuser!==false||id.login_createrole!==false||
     id.group_login!==false||id.group_bypassrls!==false)
   fail("NOT_RESTRICTED_PRIVATE_PG16_FROZEN_REGISTRY_READER");
  const now=dbUtc(id.db_now);
  const oldClock=strictUtc(index.redactedSummary.observedRestrictedPgClockUtc);
  if(now<oldClock||now-oldClock>30*1000||
     now>=strictUtc(indexReviewWire.review.validUntilUtc)||
     now>=strictUtc(indexReviewWire.review.retentionNotAfterUtc)||
     current.entries.some(e=>
       strictUtc(e.publishedAtUtc)>now||
       strictUtc(e.publishedAtUtc)>
         strictUtc(indexReviewWire.review.reviewedAtUtc)))
   fail("SOURCE_INDEX_READ_EXPIRED_OR_CHRONOLOGICALLY_IMPOSSIBLE");
  let readBytes=0,readRows=0;
  const stored=new Map();
  const entries=current.entries;
  for(let base=0;base<entries.length;base+=MAX_CHUNK){
   const window=entries.slice(base,base+MAX_CHUNK);
   const paths=window.map(e=>e.filePath);
   const q=await client.query(
    "SELECT logical_path,run_day_index,shard_index,kind,"+
    "content_sha256,reviewed_code_sha,manifest_sha256,"+
    "rights_sha256,external_review_sha256,externally_reviewed_at_utc,"+
    "retention_not_after_utc,committed_at_utc,payload_bytes"+
    " FROM "+TABLE+" WHERE logical_path=ANY($1::text[])",
    [paths]
   );
   if(q?.rowCount!==paths.length||q?.rows?.length!==paths.length)
    fail("NOT_ALL_PROSPECTIVE_SIGNED_SOURCE_LATER_POST_REGISTRIES_PRESENT");
   const selected=new Map(window.map(e=>[e.filePath,e]));
   for(const row of q.rows){
    const entry=selected.get(row.logical_path);
    if(!entry||stored.has(row.logical_path)||
       row.run_day_index!==entry.runDayIndex||
       row.shard_index!==entry.shardIndex||
       row.kind!==kinds[entry.lane]||
       row.content_sha256!==entry.fileSha256||
       row.reviewed_code_sha!==current.reviewedCodeSha||
       row.manifest_sha256!==current.manifestSha256||
       row.rights_sha256!==current.reviewedRightsSha256||
       row.external_review_sha256!==entry.reviewEvidenceSha256||
       !Buffer.isBuffer(row.payload_bytes)||
       row.payload_bytes.length<80||
       row.payload_bytes.length>MAX_SINGLE||
       sha(row.payload_bytes)!==entry.fileSha256||
       dbUtc(row.committed_at_utc)>strictUtc(entry.publishedAtUtc)||
       dbUtc(row.committed_at_utc)>now||
       dbUtc(row.externally_reviewed_at_utc)>now||
       dbUtc(row.retention_not_after_utc)<=now||
       dbUtc(row.retention_not_after_utc)-
        dbUtc(row.externally_reviewed_at_utc)>MAX7)
     fail("PRIVATE_REGISTRY_KIND_SHA_ROLE_REVIEW_OR_EXPIRY_DRIFT");
    readBytes+=row.payload_bytes.length;readRows++;
    if(readBytes>MAX_READ_BYTES)
     fail("UNBOUNDED_PRIVATE_GH_MEMORY_BUDGET");
    stored.set(row.logical_path,Buffer.from(row.payload_bytes));
   }
  }
  if(readRows!==entries.length||stored.size!==refs.seen.size)
   fail("NOT_EXACT_SIGNED_PRIVATE_REGISTRY_POPULATION");
  await client.query("ROLLBACK");started=false;
  // No private keys, row Contents or signed source paths in operator JSON.
  const result={redactedSummary:{
   schema:P6_PRIVATE_REGISTRY_BUNDLE_SCHEMA,
   status:"EXACT_PRIVATE_INDEX_REGISTRIES_HYDRATED_IN_MEMORY_NO_DISPATCH",
   signedIndexSha256:index.redactedSummary.currentIndexSha256,
   revision:index.redactedSummary.currentRevision,
   prospectiveSourceRegistryCount:entries.filter(e=>e.lane==="SOURCE").length,
   laterPreRegistryCount:entries.filter(e=>e.lane==="LATER_PRE").length,
   postPacketCount:entries.filter(e=>e.lane==="POST").length,
   totalVerifiedRegistryCount:readRows,
   totalPrivateBytesRead:readBytes,
   observedRealPgClockUtc:new Date(now).toISOString(),
   privateFilenameOrContentsPrinted:false,
   signedCurrentAndPriorIndexVerified:true,
   exactRegistryShaAndDbRetentionVerified:true,
   fullExistingSignedShardScientificAuditStillRequired:true,
   legalProviderContents31DayRightsCertified:false,
   existingPaidChildAdmissionStillRequired:true,
   providerCalls:0,databaseWrites:0,githubChildDispatches:0,
   phase5ScientificFreeze:false,phase6PaidGo:false
  }};
  Object.defineProperties(result,{
   currentIndexBytes:{value:index.currentIndexBytes,enumerable:false},
   previousIndexBytes:{value:index.previousIndexBytes,enumerable:false},
   currentParsedIndex:{value:current,enumerable:false},
   previousParsedIndex:{value:index.previousParsedIndex,enumerable:false},
   getFrozen:{value:path=>{
    if(typeof path!=="string"||!stored.has(path))
     fail("UNREGISTERED_SIGNED_PRIVATE_FROZEN_REGISTRY_PATH");
    return Buffer.from(stored.get(path));
   },enumerable:false}
  });
  return Object.freeze(result);
 }catch(e){
  if(started)await client.query("ROLLBACK").catch(()=>{});
  if(String(e?.message??"").startsWith("HOLD_P6_PRIVATE_INDEX_REGISTRY_BUNDLE_"))
   throw e;
  fail("PRIVATE_READ_OR_REGISTRY_INTEGRITY_HOLD_REDACTED");
 }
}
