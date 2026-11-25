import test from "node:test";
import assert from "node:assert/strict";
import {sourceDiagnosticLine,readSafeSourceDiagnosticLines,sourceHttpDiagnosticLabel} from "../scripts/v39_phase5b_source_diagnostics_v39.mjs";
test("only fixed complete diagnostic lines are returned, never arbitrary captured data",()=>{
 const ok=sourceDiagnosticLine("RESERVATION_CONFIRMED");
 const no=sourceDiagnosticLine("HTTP_AUTH_REJECTED");
 const out=readSafeSourceDiagnosticLines(Buffer.from("postgres://private-secret\n"+ok+"\n"+ok+"\nP6_SOURCE_DIAG HTTP_OK extra-secret\n"),"prefix "+no+"\n"+no+"\nP6_SOURCE_DIAG ARBITRARY_PRIVATE_CONTENT");
 assert.deepEqual(out,[ok,no]);
 assert.throws(()=>sourceDiagnosticLine("some-secret"),/UNKNOWN_SOURCE_DIAGNOSTIC_LABEL/);
 assert.deepEqual(readSafeSourceDiagnosticLines(null,{}),[]);
});
test("HTTP diagnostic labels distinguish auth, rate, client, server, OK and other without body or URL",()=>{
 for(const [code,ok,label] of [[200,true,"HTTP_OK"],[204,true,"HTTP_OK"],[401,false,"HTTP_AUTH_REJECTED"],[403,false,"HTTP_AUTH_REJECTED"],[429,false,"HTTP_RATE_LIMIT"],[404,false,"HTTP_OTHER_CLIENT_ERROR"],[503,false,"HTTP_SERVER_ERROR"],[302,false,"HTTP_OTHER_STATUS"]])
  assert.equal(sourceHttpDiagnosticLabel(code,ok),label);
});
