import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const child=readFileSync(".github/workflows/phase5-primary-fids-expiry-no-provider.yml","utf8");
const root=readFileSync(".github/workflows/phase5-autonomous-clock-canary-no-provider.yml","utf8").split("  bounded-primary-retention-backstop:")[1];
const confirm="APPLY_REVIEWED_PRIMARY_FIDS_BACKSTOP_NO_PRIVATE_MUTATION";
const key="P6_PRIVATE_EPOCH_EXPIRY_";
test("explicit primary-only request forces commission-only mode and removes private manifest and approval",()=>{
 assert.ok(child.includes("github.event_name == 'workflow_dispatch' && inputs.confirm == '"+confirm+"' && 'COMMISSION_VERIFY_ONLY' || vars."+key+"MODE"));
 for(const suffix of ["MANIFEST_SHA256","APPROVAL"])assert.ok(child.includes("(github.event_name != 'workflow_dispatch' || inputs.confirm != '"+confirm+"') && vars."+key+suffix+" || ''"));
});
test("global private APPLY requires separate configured approval and manifest before primary-only backstop gate admits",()=>{
 for(const wf of [child,root]){
  assert.ok(wf.includes("vars."+key+"MODE == 'COMMISSION_VERIFY_ONLY' ||"));
  assert.ok(wf.includes("vars."+key+"MODE == 'APPLY_DUE_ONLY' &&"));
  assert.ok(wf.includes("vars."+key+"MANIFEST_SHA256 != '' &&"));
  assert.ok(wf.includes("vars."+key+"APPROVAL == 'APPLY_REVIEWED_PRIVATE_EPOCH_EXPIRY_ONLY_NO_PROVIDER'"));
 }
 assert.ok(root.includes(key+"MODE: 'COMMISSION_VERIFY_ONLY'"));
 assert.equal(root.includes(key+"MANIFEST_SHA256:"),false);
 assert.equal(root.includes(key+"APPROVAL:"),false);
});
test("native ordinary APPLY passes through private authority; manual VERIFY and provider isolation remain",()=>{
 assert.ok(child.includes("inputs.confirm == 'VERIFY_PRIMARY_FIDS_ONLY_NO_WRITES' && 'VERIFY_ONLY' || 'APPLY_DUE_ONLY'"));
 for(const k of ["ADB_AUTO_COLLECT","V39_PHASE6_PROCESS_ARMED","V39_PHASE6_OWNER_APPROVED"])assert.ok(child.includes(k+": '0'"));
 for(const k of ["AERODATABOX_API_KEY","RAPIDAPI_KEY","AERODATABOX_WEBHOOK_SECRET"])assert.ok(child.includes(k+": ''"));
});

test("full retention wake is distinct, explicitly approved, and never changes primary-only command",()=>{
 const full="APPLY_REVIEWED_FULL_RETENTION_BACKSTOP_NO_PROVIDER";
 assert.ok(child.includes("P5 FULL RETENTION BACKSTOP CHILD"));
 assert.ok(child.includes("vars.P6_FULL_RETENTION_BACKSTOP_ENABLED == 'true'"));
 assert.ok(child.includes("vars.P7_EXPIRY_APPROVAL == 'APPLY_P7_DUE_ONLY_NO_PROVIDER'"));
 assert.ok(child.includes("inputs.confirm == '"+full+"'"));
 assert.ok(child.includes("P6_FULL_RETENTION_BACKSTOP_REQUEST:"));
 assert.ok(child.includes("inputs.confirm == '"+confirm+"' && 'COMMISSION_VERIFY_ONLY'"));
});
