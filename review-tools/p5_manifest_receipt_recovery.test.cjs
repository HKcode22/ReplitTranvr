"use strict";
// Pure regression checks for the existing manifest receipt recovery; no real DB.
const test=require("node:test"),assert=require("node:assert/strict");
const {manifestReceiptAfterReadback,validateManifestStorageReceipt}=require("./p5_export_exact_approved_bundle.cjs");
const ctx={input:{manifestSha256:"a".repeat(64)}},auth={artifactHash:"b".repeat(64)};
const original={status:"EXACT_APPROVED_MANIFEST_STORED_AND_FRESH_READBACK_NO_GO",manifestSha256:ctx.input.manifestSha256,authSha256:auth.artifactHash,manifestRowsWritten:1,independentReadOnlyBytesMatch:true,providerCalls:0,databaseWrites:1,authorizationEnabled:false,phase6PaidGo:false};
const reuse={...original,manifestRowsWritten:0,databaseWrites:0};
test("first acknowledged insertion retains receipt",()=>assert.equal(manifestReceiptAfterReadback(null,original,ctx,auth),original));
test("fresh zero-write reuse preserves historical receipt",()=>assert.equal(manifestReceiptAfterReadback(original,reuse,ctx,auth),original));
test("initial already-matching row remains reusable",()=>assert.equal(manifestReceiptAfterReadback(reuse,reuse,ctx,auth),reuse));
test("existing acknowledgement cannot permit reinsertion",()=>assert.throws(()=>manifestReceiptAfterReadback(original,original,ctx,auth),/ACKNOWLEDGED_MANIFEST_NO_REINSERT/));
test("different authorization, wrong manifest, unsafe receipt or writes mismatch refuse",()=>{
 for(const prior of [{...original,authSha256:"c".repeat(64)},{...original,manifestSha256:"d".repeat(64)},{...original,authorizationEnabled:true},{...original,databaseWrites:0}])assert.throws(()=>validateManifestStorageReceipt(prior,ctx,auth),/EXACT_EXISTING_MANIFEST_STORAGE_RECEIPT/);
});
test("fresh evidence must be exact with no provider calls",()=>{
 for(const fresh of [{...reuse,independentReadOnlyBytesMatch:false},{...reuse,providerCalls:1}])assert.throws(()=>manifestReceiptAfterReadback(original,fresh,ctx,auth),/EXACT_EXISTING_MANIFEST_STORAGE_RECEIPT/);
});