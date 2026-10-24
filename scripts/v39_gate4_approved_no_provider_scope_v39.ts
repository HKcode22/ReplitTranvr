/**
 * Gate4 exact one-time production *NO PROVIDER* setup approval.
 * Private manifest generated in the owner's Replit Shell from the reviewed
 * source; NEVER put its nonce, AUTH digest or credentials into GitHub.
 *
 * This permits only the already owner-approved UUID/roles, exact immutable
 * intended *receiver runtime* source, with the existing prepaid callback
 * preserved. This is not a provider GET/CREATE/DELETE permit or deploy tool.
 * Call this check BEFORE production DB connections or credential writes.
 */
import {createHash,timingSafeEqual} from "node:crypto";
import {homedir} from "node:os";
import {join} from "node:path";
import {lstatSync,readFileSync} from "node:fs";

export const GATE4_SETUP_APPROVED_UUID_V39 =
 "d6c0fcac-798e-4913-bfd1-a561adb3dd82";
export const GATE4_SETUP_APPROVED_RECEIVER_SOURCE_V39 =
 "97ed05bfcc8b34bd607a80dbcfec6945ffd0d11a";
export const GATE4_SETUP_APPROVED_RECEIVER_ROLE_V39 =
 "gate4_receiver_2026_next1";
export const GATE4_SETUP_APPROVED_WRITER_ROLE_V39 =
 "gate4_owner_writer_2026_next1";
export const GATE4_SETUP_PRIVATE_FILE_V39=join(
 homedir(),".config","replittranvr","gate4-owner-20261022",
 "next-wsss-setup-20261024.json"
);
const SHA64=/^[0-9a-f]{64}$/;
const FIELDS=[
 "schema","scopeId","airportIcao","reviewedMainSha",
 "proposedPublishedSourceSha","receiverRole","writerRole",
 "permission","paidSubscriptionAuthorized","providerRequestsAuthorized",
 "nonce","authorizationSha256"
].sort();
export type Gate4ApprovedManifestV39=Readonly<{
 schema:"v39.gate4.next-scope-setup.v1";
 scopeId:string;
 airportIcao:"WSSS";
 reviewedMainSha:string;
 proposedPublishedSourceSha:string;
 receiverRole:string;
 writerRole:string;
 permission:"ONE_TIME_PRODUCTION_SETUP_NO_PROVIDER";
 paidSubscriptionAuthorized:false;
 providerRequestsAuthorized:false;
 nonce:string;
 authorizationSha256:string;
}>;
/** Strict pure check; caller never prints the private manifest. */
export function reviewGate4ApprovedManifestV39(
 raw:unknown
):Gate4ApprovedManifestV39|null{
 if(!raw||typeof raw!=="object"||Array.isArray(raw))
  return null;
 const m=raw as Record<string,unknown>;
 if(JSON.stringify(Object.keys(m).sort())!==JSON.stringify(FIELDS))
  return null;
 if(m.schema!=="v39.gate4.next-scope-setup.v1"||
    m.scopeId!==GATE4_SETUP_APPROVED_UUID_V39||
    m.airportIcao!=="WSSS"||
    m.reviewedMainSha!==GATE4_SETUP_APPROVED_RECEIVER_SOURCE_V39||
    m.proposedPublishedSourceSha!==GATE4_SETUP_APPROVED_RECEIVER_SOURCE_V39||
    m.receiverRole!==GATE4_SETUP_APPROVED_RECEIVER_ROLE_V39||
    m.writerRole!==GATE4_SETUP_APPROVED_WRITER_ROLE_V39||
    m.permission!=="ONE_TIME_PRODUCTION_SETUP_NO_PROVIDER"||
    m.paidSubscriptionAuthorized!==false||
    m.providerRequestsAuthorized!==false||
    typeof m.nonce!=="string"||!SHA64.test(m.nonce)||
    typeof m.authorizationSha256!=="string"||
    !SHA64.test(m.authorizationSha256))
  return null;
 const {authorizationSha256,...proposal}=m;
 // The supplied owner manifest hashes its ordered proposal (before adding
 // authorizationSha256). This checks alteration/copy mistakes, NOT a signature.
 const recomputed=createHash("sha256")
  .update(JSON.stringify(proposal)).digest("hex");
 if(!timingSafeEqual(
  Buffer.from(recomputed,"hex"),
  Buffer.from(authorizationSha256 as string,"hex")
 ))return null;
 return m as Gate4ApprovedManifestV39;
}
/** Local private READ ONLY. No DB/provider/GitHub IO. Fail closed. */
export function readGate4ApprovedManifestV39(
 nowMs=Date.now()
):Gate4ApprovedManifestV39{
 try{
  const dir=join(homedir(),".config","replittranvr","gate4-owner-20261022");
  const d=lstatSync(dir),f=lstatSync(GATE4_SETUP_PRIVATE_FILE_V39);
  if(!d.isDirectory()||(d.mode&0o077)!==0||
     !f.isFile()||(f.mode&0o077)!==0||
     !Number.isFinite(nowMs)||nowMs<f.mtimeMs||
     nowMs-f.mtimeMs>48*3600_000)throw Error("PRIVATE_SCOPE_UNSAFE");
  const m=reviewGate4ApprovedManifestV39(
   JSON.parse(readFileSync(GATE4_SETUP_PRIVATE_FILE_V39,"utf8"))
  );
  if(!m)throw Error("SCOPE_REJECTED");
  return m;
 }catch{
  throw Error("GATE4_SETUP_APPROVED_PRIVATE_MANIFEST_HOLD");
 }
}
