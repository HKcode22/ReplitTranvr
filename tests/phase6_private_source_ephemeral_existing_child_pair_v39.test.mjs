import test from "node:test";
import assert from "node:assert/strict";
import {tmpdir} from "node:os";
import {mkdtempSync,mkdirSync,rmSync,existsSync,writeFileSync,
 readFileSync,statSync} from "node:fs";
import {join} from "node:path";
import {createHash} from "node:crypto";
import {P6_SOURCE_QUERY_PAIR_SCHEMA}
 from "../server/lib/disruption/phase6PrivateSourceQueryBindingInMemory_v39.mjs";
import {
 withP6VerifiedPrivateSourcePairForExistingChild,
 P6_PRIVATE_SOURCE_EPHEMERAL_PAIR_SCHEMA
} from "../server/lib/disruption/phase6PrivateSourceChildEphemeralPair_v39.mjs";

const hash=x=>createHash("sha256").update(x).digest("hex");
const registryPath="data-collection/phase5/frozen/source_day001_test_packet.json";
const queryPath="data-collection/phase5/frozen/sourceq_day001_test_packet.json";
const scope={
 ephemeralSourceRegistryAndQueryPairApproved:true,
 existingSourceChildIndependentlyAdmitted:true,
 privateReaderOnlySourcePairApproved:true,
 existingChildMustRecheckAllReleaseAndSpendGates:true
};
function setup(){
 const root=mkdtempSync(join(tmpdir(),"p6-private-pair-offline-"));
 mkdirSync(join(root,"data-collection","phase5"),{recursive:true});
 writeFileSync(join(root,".gitignore"),"/data-collection/phase5/frozen/\n");
 const reg=Buffer.from(JSON.stringify({
  type:"synthetic signed SOURCE day registry",
  neverLogPrivate:"PRIVATE_SIGNED_REGISTRY_SYNTHETIC_TEST_PAYLOAD",
  padding:"R".repeat(130)
 }));
 const query=Buffer.from(JSON.stringify({
  type:"synthetic SOURCE query",
  neverLogPrivate:"PRIVATE_PROVIDER_QUERY_SYNTHETIC_TEST_PAYLOAD",
  padding:"Q".repeat(130)
 }));
 const pair={redactedSummary:{
  schema:P6_SOURCE_QUERY_PAIR_SCHEMA,
  status:"ONE_PRIVATE_SOURCE_QUERY_BOUND_TO_SIGNED_REGISTRY_NO_DISPATCH",
  requiresExistingP5SignedDaySourceChildAdmission:true,
  independentLegalRetentionAndPaidGoStillRequired:true,
  phase6PaidGo:false,providerCalls:0,databaseWrites:0,githubChildDispatches:0,
  runDayIndex:1,routingIntentSha256:"c".repeat(64),
  queryDigestSha256:"a".repeat(64),
  registrySha256:hash(reg),queryPacketSha256:hash(query)
 }};
 for(const [k,v] of Object.entries({
  privateRegistryBytes:reg,privateQueryBytes:query,
  privateRegistryPath:registryPath,privateQueryPath:queryPath
 }))Object.defineProperty(pair,k,{enumerable:false,writable:false,
  configurable:true,value:v});
 return{root,pair,reg,query,regFile:join(root,registryPath),
  queryFile:join(root,queryPath)};
}
test("verified in-memory pair reaches same-process existing-child boundary then both private files disappear",async()=>{
 const f=setup();
 try{
  let called=0;
  const out=await withP6VerifiedPrivateSourcePairForExistingChild(
   f.pair,f.root,scope,async(paths,receipt)=>{
    called++;
    assert.equal(paths.registryFilePath,registryPath);
    assert.equal(paths.queryPacketFilePath,queryPath);
    assert.deepEqual(readFileSync(f.regFile),f.reg);
    assert.deepEqual(readFileSync(f.queryFile),f.query);
    assert.equal(statSync(f.regFile).mode&0o777,0o600);
    assert.equal(statSync(f.queryFile).mode&0o777,0o600);
    assert.equal(receipt.phase6PaidGo,false);
   }
  );
  assert.equal(called,1);
  assert.equal(out.schema,P6_PRIVATE_SOURCE_EPHEMERAL_PAIR_SCHEMA);
  assert.equal(out.privateQueryAndRegistryFilesDeleted,true);
  assert.equal(out.existingChildOwnPaidAdmissionStillMandatory,true);
  assert.equal(out.phase6PaidGoCertifiedHere,false);
  assert.equal(existsSync(f.regFile),false);
  assert.equal(existsSync(f.queryFile),false);
  assert.ok(!JSON.stringify(out).includes("PRIVATE_PROVIDER_QUERY_"));
 }finally{rmSync(f.root,{recursive:true,force:true});}
});
test("if child callback fails both private files still disappear and error is redacted",async()=>{
 const f=setup();
 try{
  await assert.rejects(
   withP6VerifiedPrivateSourcePairForExistingChild(
    f.pair,f.root,scope,async()=>{
     assert.equal(existsSync(f.queryFile),true);
     throw Error("SECRET_PAYLOAD_IN_A_CHILD_STACK_TRACE");
    }),
   /HOLD_P6_PRIVATE_SOURCE_EPHEMERAL_PAIR_CHILD_REFUSED_OR_PRIVATE_FILE/
  );
  assert.equal(existsSync(f.regFile),false);
  assert.equal(existsSync(f.queryFile),false);
 }finally{rmSync(f.root,{recursive:true,force:true});}
});
test("preexisting private query file is never overwritten or deleted",async()=>{
 const f=setup();
 try{
  mkdirSync(join(f.root,"data-collection/phase5/frozen"),{recursive:true});
  writeFileSync(f.queryFile,"someone-else-owned-this-file");
  await assert.rejects(
   withP6VerifiedPrivateSourcePairForExistingChild(
    f.pair,f.root,scope,async()=>{throw Error("should not call");}),
   /HOLD_P6_PRIVATE_SOURCE_EPHEMERAL_PAIR_CHILD_REFUSED_OR_PRIVATE_FILE/
  );
  assert.equal(readFileSync(f.queryFile,"utf8"),"someone-else-owned-this-file");
  assert.equal(existsSync(f.regFile),false);
 }finally{rmSync(f.root,{recursive:true,force:true});}
});
test("scope omissions and altered approved bytes fail before creating anything",async()=>{
 const f=setup();
 try{
  await assert.rejects(withP6VerifiedPrivateSourcePairForExistingChild(
   f.pair,f.root,{...scope,existingSourceChildIndependentlyAdmitted:false},
   async()=>{throw Error("unexpected");}
  ),/HOLD_P6_PRIVATE_SOURCE_EPHEMERAL_PAIR_NO_EXACT_PRIVATE_SOURCE/);
  f.pair.redactedSummary.queryPacketSha256="0".repeat(64);
  await assert.rejects(withP6VerifiedPrivateSourcePairForExistingChild(
   f.pair,f.root,scope,async()=>{throw Error("unexpected");}
  ),/HOLD_P6_PRIVATE_SOURCE_EPHEMERAL_PAIR_NO_EXACT_PRIVATE_SOURCE/);
  assert.equal(existsSync(f.regFile),false);
  assert.equal(existsSync(f.queryFile),false);
 }finally{rmSync(f.root,{recursive:true,force:true});}
});
test("missing exact ignored directory policy fails closed",async()=>{
 const f=setup();
 try{
  writeFileSync(join(f.root,".gitignore"),"node_modules/\n");
  await assert.rejects(withP6VerifiedPrivateSourcePairForExistingChild(
   f.pair,f.root,scope,async()=>{throw Error("unexpected");}
  ),/HOLD_P6_PRIVATE_SOURCE_EPHEMERAL_PAIR_PUBLIC_FROZEN_GITIGNORE_RULE_MISSING/);
 }finally{rmSync(f.root,{recursive:true,force:true});}
});
