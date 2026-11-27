import test from "node:test";
import assert from "node:assert/strict";
import {sourceDiagnosticLine,readSafeSourceDiagnosticLines,sourceHttpDiagnosticLabel,sourceTransportDiagnosticLabel,postDiagnostic,sourceDbDiagnosticLabel,sourceChildFailureDiagnostic,readSafeTimestampedSourceDiagnostics,classifyP6PaidChildReceipt} from "../scripts/v39_phase5b_source_diagnostics_v39.mjs";
test("only fixed complete diagnostic lines are returned, never arbitrary captured data",()=>{
 const ok=sourceDiagnosticLine("RESERVATION_CONFIRMED");
 const no=sourceDiagnosticLine("HTTP_AUTH_REJECTED");
 const out=readSafeSourceDiagnosticLines(Buffer.from("postgres://private-secret\n"+ok+"\n"+ok+"\nP6_SOURCE_DIAG HTTP_OK extra-secret\n"),"prefix "+no+"\n"+no+"\nP6_SOURCE_DIAG ARBITRARY_PRIVATE_CONTENT");
 assert.deepEqual(out,[ok,no]);
 assert.throws(()=>sourceDiagnosticLine("some-secret"),/UNKNOWN_SOURCE_DIAGNOSTIC_LABEL/);
 assert.deepEqual(readSafeSourceDiagnosticLines(null,{}),[]);
});
test("HTTP diagnostic labels distinguish auth, rate, client, server, OK and other without body or URL",()=>{
 for(const [code,ok,label] of [[200,true,"HTTP_OK"],[204,true,"HTTP_NO_CONTENT"],[205,true,"HTTP_RESET_CONTENT"],[401,false,"HTTP_AUTH_REJECTED"],[403,false,"HTTP_AUTH_REJECTED"],[429,false,"HTTP_RATE_LIMIT"],[404,false,"HTTP_OTHER_CLIENT_ERROR"],[503,false,"HTTP_SERVER_ERROR"],[301,false,"HTTP_REDIRECT_BLOCKED"],[302,false,"HTTP_REDIRECT_BLOCKED"],[303,false,"HTTP_REDIRECT_BLOCKED"],[307,false,"HTTP_REDIRECT_BLOCKED"],[308,false,"HTTP_REDIRECT_BLOCKED"],[304,false,"HTTP_OTHER_STATUS"]])
  assert.equal(sourceHttpDiagnosticLabel(code,ok),label);
});

test("native POST error reporting reveals only fixed stages and SQL categories",()=>{
 for(const [code,category] of [["42501","DB_PERMISSION"],["42883","DB_OPERATOR_OR_FUNCTION_MISSING"],["42703","DB_COLUMN_MISSING"],["08006","DB_CONNECTION"],["57014","DB_QUERY_CANCELED"],["23505","OTHER_SQLSTATE"],["private-secret","UNCLASSIFIED"]]){
  const out=postDiagnostic("SOURCE_HINT_SCAN",{code,message:"secret DSN raw payload"});
  assert.deepEqual(out,{status:"P6_POST_DIAG_NO_PROVIDER_CONTENT",stage:"SOURCE_HINT_SCAN",category});
  assert(!JSON.stringify(out).includes("secret"));
 }
 assert.throws(()=>postDiagnostic("private-secret",{}),/UNKNOWN_POST_DIAGNOSTIC_STAGE/);
});

test("SOURCE post-reservation and custody diagnostics retain exact fixed causes, never raw errors",()=>{
 assert.equal(sourceDbDiagnosticLabel({message:"REFUSED_PHASE5_V0079_SCOPED_DB_PHYSICAL_POSTCOMMIT_READBACK_FAILED_NO_DISPATCH"}),"SOURCE_RESERVATION_READBACK_FAILED");
 assert.equal(sourceDbDiagnosticLabel({code:"42501",message:"secret DB username"}),"DB_PERMISSION");
 assert.equal(sourceDbDiagnosticLabel({message:"FIDS_BOUND_NORMALIZATION_INCOMPLETE_ROLLBACK"}),"SOURCE_NORMALIZATION_INCOMPLETE");
 assert.equal(sourceDbDiagnosticLabel({message:"untrusted raw SQL / provider body"}),"UNCLASSIFIED");
 const line=sourceDiagnosticLine("DB_PERMISSION");
 assert.deepEqual(readSafeSourceDiagnosticLines(Buffer.from(line+"\n"),"secret"),[line]);
});

test("fixed body diagnostics survive subprocess filtering without raw provider content",()=>{
 const labels=["HTTP_NO_CONTENT","HTTP_RESET_CONTENT","FIDS_BODY_UNAVAILABLE","FIDS_BODY_EMPTY","FIDS_BODY_TOO_LARGE","FIDS_BODY_READ_FAILED","FIDS_BODY_INVALID_JSON","FIDS_BODY_INVALID_OBJECT","FIDS_DEPARTURES_MISSING","FIDS_ARRIVALS_MISSING","FIDS_BODY_VALID"];
 const lines=labels.map(sourceDiagnosticLine);
 assert.deepEqual(readSafeSourceDiagnosticLines(lines.join("\n")+"\nP6_SOURCE_DIAG FIDS_BODY_INVALID_JSON private",null),lines);
});

test("T024 fixed outer SOURCE stages preserve SQL category without leaking any error content",()=>{
 for(const stage of ["ADMISSION","READER_CONNECT","READER_ROLE","SIGNED_DAY_READ","SIGNED_DAY_VERIFY","SIGNED_ROUTE_BIND","SIGNED_QUERY_READ","SIGNED_QUERY_VERIFY","READER_CLOSE","ROUTE_BINDING","ORIGINAL_ADMISSION","ORIGINAL_SUBPROCESS","EPHEMERAL_CLEANUP"]){
  const d=sourceChildFailureDiagnostic(stage,{code:"42501",message:"private SQL / credentials"});
  assert.deepEqual(d,{status:"P6_SOURCE_CHILD_FAILURE_DIAG_NO_PROVIDER_CONTENT",stage,category:"DB_PERMISSION"});
  assert(!JSON.stringify(d).includes("private SQL"));
 }
 assert.equal(sourceChildFailureDiagnostic("ORIGINAL_SUBPROCESS",{message:"private raw exception"}).category,"UNCLASSIFIED");
 assert.throws(()=>sourceChildFailureDiagnostic("private secret",{}),/UNKNOWN_SOURCE_CHILD_DIAGNOSTIC_STAGE/);
});

import {projectP6SignedCalendarCoverage} from "../scripts/v39_phase5b_signed_calendar_coverage_owner.mjs";
test("T054 frozen 31-day split distinguishes unprepared denominator, source missingness and cross-partition collision",()=>{
 const calendar=Array.from({length:31},(_,i)=>({run_day_index:i+1,evaluation_partition:i<20?"train":i<25?"validation":"test",start_utc:new Date(Date.UTC(2035,10,25+i)).toISOString()}));
 const r={run_day_index:1,horizon:"T-6h",prepared:64,reservations:4,bindings:2,timely_bindings:1,elapsed_unreserved:40,open_unreserved:2,future_unreserved:17,stopped_unreserved:1,
  pre_rows:2,cutoff_safe_pre_rows:1,next_planned_utc:"2035-11-25T05:00:00.000Z",next_hard_latest_utc:"2035-11-25T05:10:00.000Z"};
 const dup={cross_day_ids:2,cross_partition_ids:1,duplicate_day_horizon_ids:0},at="2035-11-25T05:05:00.000Z";
 const out=projectP6SignedCalendarCoverage(calendar,[r],dup,at);
 assert.equal(out.cells.length,93);assert.deepEqual(out.bySplit.map(x=>x.calendarDays),[20,5,6]);
 assert.equal(out.cells[0].prepared,null);assert.equal(out.cells[1].bindings,2);assert.equal(out.leakageDiagnostics.requiresIndependentReview,true);
 assert.equal(out.trainingEligibilityCertified,false);
 assert.equal(out.leakageDiagnostics.status,"IDENTITY_COLLISION_REVIEW_REQUIRED");
 const none=projectP6SignedCalendarCoverage(calendar,[],{cross_day_ids:0,cross_partition_ids:0,duplicate_day_horizon_ids:0},at);
 assert.equal(none.leakageDiagnostics.status,"NO_LINKED_PRE_ROWS_LEAKAGE_NOT_ASSESSABLE");
 assert.equal(none.leakageDiagnostics.fullLeakageAuditComplete,false);
 assert.throws(()=>projectP6SignedCalendarCoverage(calendar,[{...r,elapsed_unreserved:41}],dup,at),/COUNT_OR_CLOCK_CONTRADICTION/);
 assert.throws(()=>projectP6SignedCalendarCoverage(calendar,[r,r],dup,at),/COUNT_OR_CLOCK_CONTRADICTION/);
 assert.throws(()=>projectP6SignedCalendarCoverage(calendar.map(d=>d.run_day_index===21?{...d,evaluation_partition:"train"}:d),[r],dup,at),/FROZEN_CALENDAR_OR_SPLIT_DRIFT/);
});

test("T080 paid child evidence requires exact job/step and complete actual diagnostic, not HTTP/ACK/CI color",()=>{
 const run={id:123,head_sha:"a".repeat(40),event:"workflow_dispatch",head_branch:"main",run_attempt:1,status:"completed",conclusion:"failure"};
 const paid="Authenticate real private PG16 signed index and query, then ORIGINAL one-physical-GET child",actor="Admission for real actor preflight ONLY (no paid capability)";
 const job={name:"exact-private-source-existing-one-get-child",run_id:123,head_sha:run.head_sha,run_attempt:1,status:"completed",conclusion:"failure",
  steps:[{name:actor,conclusion:"skipped"},{name:paid,conclusion:"success",started_at:"2026-11-25T06:39:58Z",completed_at:"2026-11-25T07:00:02Z"}]};
 const log=(...d)=>d.map(x=>"2026-11-25T07:00:02.9278707Z P6_SOURCE_DIAG "+x).join("\n");
 const complete=log("PREARM_COMMITTED","RESERVATION_CONFIRMED","HTTP_OK","ORIGINAL_PERSIST_CONFIRMED","OUTCOME_TIMELY");
 const result=classifyP6PaidChildReceipt(run,[job],complete);
 assert.equal(result.status,"TIMELY_ORIGINAL_REPORTED_BY_CHILD");assert.equal(result.providerBillingVerified,false);assert.equal(result.actualPreCommitVerified,false);
 assert.equal(classifyP6PaidChildReceipt(run,[job],log("PREARM_COMMITTED","RESERVATION_CONFIRMED","HTTP_OK","OUTCOME_UNOBSERVED")).status,"HTTP_OK_NO_ORIGINAL_PROOF");
 assert.equal(classifyP6PaidChildReceipt(run,[job],log("PREARM_COMMITTED","RESERVATION_CONFIRMED","HTTP_RATE_LIMIT","OUTCOME_UNOBSERVED")).status,"RATE_LIMIT_NO_ORIGINAL_PROOF");
 assert.equal(classifyP6PaidChildReceipt(run,[job],log("PREARM_COMMITTED","RESERVATION_CONFIRMED","HTTP_REDIRECT_BLOCKED","OUTCOME_UNOBSERVED")).status,"HTTP_REDIRECT_BLOCKED_NO_ORIGINAL_PROOF");
 assert.equal(classifyP6PaidChildReceipt(run,[job],complete+"\n"+log("OUTCOME_LATE")).status,"CONTRADICTORY_DIAGNOSTICS_REVIEW");
 assert.equal(classifyP6PaidChildReceipt(run,[job],complete.replace("OUTCOME_TIMELY","OUTCOME_LATE")).status,"LATE_ORIGINAL_REPORTED_BY_CHILD");
 assert.equal(classifyP6PaidChildReceipt(run,[job],null).status,"PAID_STEP_LOG_UNAVAILABLE_OR_NO_DIAGNOSTIC");
 assert.equal(classifyP6PaidChildReceipt(run,[{...job,steps:[{name:actor,conclusion:"success"},{name:paid,conclusion:"skipped"}]}],complete).status,"NONPAID_ACTOR_PREFLIGHT_NO_COLLECTION");
 assert.equal(classifyP6PaidChildReceipt({...run,run_attempt:2},[job],complete).status,"RUN_IDENTITY_UNVERIFIED");
 assert.equal(classifyP6PaidChildReceipt(run,[{...job,head_sha:"b".repeat(40)}],complete).status,"JOB_IDENTITY_UNVERIFIED");
 assert.deepEqual(readSafeTimestampedSourceDiagnostics('2026-11-25T07:00:02Z echo "P6_SOURCE_DIAG HTTP_OK"\n'+log("HTTP_OK extra-private")+'\n'+log("HTTP_OK")),["HTTP_OK"]);
 assert.doesNotMatch(JSON.stringify(result),/private|postgres:\/\//);
});

test("T081 real GitHub masked step name and second-precision interval retain timely SOURCE while independently labeling failed PRE",()=>{
 const run={id:45562205543,head_sha:"b4c6c283e506747c3d662aa61c969f57b26cd4d4",event:"workflow_dispatch",head_branch:"main",run_attempt:1,status:"completed",conclusion:"failure"};
 const paid={name:"Authenticate real private PG***6 signed index and query, then ORIGINAL one-physical-GET child",conclusion:"success",number:11,started_at:"2026-11-25T06:39:58Z",completed_at:"2026-11-25T07:00:02Z"};
 const actor={name:"Admission for real actor preflight ONLY (no paid capability)",conclusion:"skipped",number:4};
 const pre={name:"Review and publish later PRE using existing private registry (NONPAID, separately approved)",conclusion:"failure",number:12};
 const job={name:"exact-private-source-existing-one-get-child",run_id:run.id,head_sha:run.head_sha,run_attempt:1,status:"completed",conclusion:"failure",steps:[actor,paid,pre]};
 // Actual historical SOURCE markers and timestamps; follow-on failure is a
 // synthetic combination, not an assertion that this historical PRE failed.
 const log=[
 "2026-11-25T06:39:57.999Z P6_SOURCE_DIAG HTTP_RATE_LIMIT",
 "2026-11-25T07:00:02.9278707Z P6_SOURCE_DIAG PREARM_COMMITTED",
 "2026-11-25T07:00:02.9283201Z P6_SOURCE_DIAG RESERVATION_CONFIRMED",
 "2026-11-25T07:00:02.9284739Z P6_SOURCE_DIAG HTTP_OK",
 "2026-11-25T07:00:02.9286870Z P6_SOURCE_DIAG ORIGINAL_PERSIST_CONFIRMED",
 "2026-11-25T07:00:02.9287789Z P6_SOURCE_DIAG OUTCOME_TIMELY",
 "2026-11-25T07:00:03.000Z P6_SOURCE_DIAG OUTCOME_LATE"
 ].join("\n");
 const result=classifyP6PaidChildReceipt(run,[job],log);
 assert.equal(result.status,"TIMELY_ORIGINAL_REPORTED_BY_CHILD");
 assert.equal(result.followOnPre,"STEP_FAILED_OR_INTERRUPTED");
 assert.equal(result.actualPreCommitVerified,false);
 assert.ok(!result.diagnostics.includes("HTTP_RATE_LIMIT")&&!result.diagnostics.includes("OUTCOME_LATE"));
 assert.equal(classifyP6PaidChildReceipt(run,[{...job,steps:[actor,{...paid,name:paid.name.replace("PG***6","PG***")},pre]}],log).status,"STEP_SCOPE_UNVERIFIED");
 assert.equal(classifyP6PaidChildReceipt(run,[{...job,steps:[actor,{...paid,started_at:null},pre]}],log).status,"PAID_STEP_CLOCK_UNVERIFIED");
 assert.equal(classifyP6PaidChildReceipt(run,[{...job,steps:[actor,paid,{...pre,conclusion:"success"}]}],log).followOnPre,"STEP_SUCCEEDED_NOT_COMMIT_PROOF");
 assert.equal(classifyP6PaidChildReceipt(run,[{...job,steps:[actor,paid,pre,pre]}],log).status,"STEP_SCOPE_UNVERIFIED");
});


import {selectP6PaidChildAuditRuns,sourceOriginalChildFailureCode} from "../scripts/v39_phase5b_source_diagnostics_v39.mjs";
import {projectP6SourceSlotCoverage} from "../scripts/v39_phase5b_signed_calendar_coverage_owner.mjs";
test("T091 full prearm cannot hide terminal SOURCE failures from the bounded audit",()=>{
 const rows=Array.from({length:100},(_,i)=>({id:2000-i,status:i<24?"in_progress":"completed",created_at:new Date(Date.UTC(2026,10,27,4,20)-i*10000).toISOString()}));
 const x=selectP6PaidChildAuditRuns({total_count:120,workflow_runs:rows});
 assert.equal(x.activeMetadataRows,24);assert.equal(x.terminalMetadataRows,76);assert.equal(x.terminalSelected,64);assert.equal(x.terminalOmitted,12);
 assert.equal(x.selected.length,88);assert.equal(x.selected[24].id,1976);assert.equal(x.allMatchingMetadataInspected,false);
 assert.throws(()=>selectP6PaidChildAuditRuns({total_count:120,workflow_runs:rows.slice(1)}),/AUDIT_METADATA_UNVERIFIED/);
 assert.throws(()=>selectP6PaidChildAuditRuns({total_count:100,workflow_runs:[rows[0],...rows.slice(0,99)]}),/AUDIT_METADATA_UNVERIFIED/);
});
test("T091 exact observed no-content remains unobserved and no replay; generic and contradictory results are not relabeled",()=>{
 const labels=["PREARM_COMMITTED","RESERVATION_CONFIRMED","HTTP_STARTED","HTTP_NO_CONTENT","FIDS_BODY_UNAVAILABLE","OUTCOME_UNOBSERVED"];
 const raw=labels.map(sourceDiagnosticLine).join("\n");
 const child={status:1,stdout:Buffer.from(raw),stderr:Buffer.from("private suppressed")};
 assert.equal(sourceOriginalChildFailureCode(child),"ORIGINAL_HTTP_NO_CONTENT_UNOBSERVED_NO_REPLAY");
 assert.equal(sourceChildFailureDiagnostic("ORIGINAL_SUBPROCESS",{message:"HOLD_P6_REAL_PRIVATE_SOURCE_CHILD_"+sourceOriginalChildFailureCode(child)}).category,"SOURCE_HTTP_NO_CONTENT_UNOBSERVED");
 assert.equal(sourceOriginalChildFailureCode({...child,stdout:raw.replace("HTTP_NO_CONTENT","HTTP_RESET_CONTENT")}),"ORIGINAL_HTTP_RESET_CONTENT_UNOBSERVED_NO_REPLAY");
 for(const x of [{...child,signal:"SIGTERM"},{...child,status:null},{...child,status:0},{...child,stdout:raw.replace("HTTP_STARTED","INNER_ADMITTED")},{...child,stdout:raw+"\nP6_SOURCE_DIAG ORIGINAL_PERSIST_STARTED"},{...child,stdout:raw+"\nP6_SOURCE_DIAG HTTP_OK"}])
  assert.equal(sourceOriginalChildFailureCode(x),"ORIGINAL_ONE_GET_CHILD_FAILED_AMBIGUOUS_NO_REPLAY");
 const run={id:45916017872,head_sha:"c2bb8e18dfcf64ea815745da59ede62f53e448bb",event:"workflow_dispatch",head_branch:"main",run_attempt:1,status:"completed",conclusion:"failure"};
 const job={name:"exact-private-source-existing-one-get-child",run_id:run.id,head_sha:run.head_sha,run_attempt:1,status:"completed",conclusion:"failure",steps:[
  {name:"Admission for real actor preflight ONLY (no paid capability)",conclusion:"skipped"},
  {name:"Authenticate real private PG***6 signed index and query, then ORIGINAL one-physical-GET child",conclusion:"failure",started_at:"2026-11-27T00:19:40Z",completed_at:"2026-11-27T01:45:39Z"}]};
 const log=labels.map(x=>"2026-11-27T01:45:39.4611591Z P6_SOURCE_DIAG "+x).join("\n");
 const result=classifyP6PaidChildReceipt(run,[job],log);
 assert.equal(result.status,"HTTP_NO_CONTENT_UNOBSERVED_NO_ORIGINAL_PROOF");assert.equal(result.actualPreCommitVerified,false);assert.equal(result.providerBillingVerified,false);
 assert.equal(classifyP6PaidChildReceipt(run,[job],log.replace("HTTP_NO_CONTENT","HTTP_RESET_CONTENT")).status,"HTTP_RESET_CONTENT_UNOBSERVED_NO_ORIGINAL_PROOF");
 assert.equal(classifyP6PaidChildReceipt(run,[job],log.replace("OUTCOME_UNOBSERVED","OUTCOME_TIMELY")).status,"CONTRADICTORY_DIAGNOSTICS_REVIEW");
});
test("T092 slot denominator retains missing reservations and reconciles all 93 horizon cells",()=>{
 const cells=Array.from({length:31},(_,i)=>["T-24h","T-6h","T-90m"].map(horizon=>({day:i+1,horizon,prepared:null}))).flat();
 const base={prepared:8,reservations:4,bindings:2,timely_bindings:2,elapsed_unreserved:1,open_unreserved:0,future_unreserved:3,stopped_unreserved:0};
 cells[7]={day:3,horizon:"T-6h",...base};
 const row={run_day_index:3,horizon:"T-6h",slot_id:"HUB",airport_icao:"WSSS",...base,reserved_units:8,normalized_member_observations:100};
 assert.equal(projectP6SourceSlotCoverage([row],cells)[0].reserved_without_binding,2);
 for(const rows of [[{...row,reserved_units:7}],[{...row,bindings:1}],[{...row,slot_id:"UNKNOWN"}],[row,row],[{...row,normalized_member_observations:20001}],[]])
  assert.throws(()=>projectP6SourceSlotCoverage(rows,cells),/SLOT_/);
});

import {selectP6RunReceiptScope,projectP6RunReceiptRows} from "../scripts/v39_phase5b_signed_calendar_coverage_owner.mjs";
test("T093 exact run-level custody corroboration detects missing, duplicate and contradictory ledger evidence",()=>{
 const positive="TIMELY_ORIGINAL_REPORTED_BY_CHILD",negative="HTTP_NO_CONTENT_UNOBSERVED_NO_ORIGINAL_PROOF";
 const scope=selectP6RunReceiptScope([{runId:1,status:positive},{runId:2,status:negative},{runId:3,status:"RUN_NOT_TERMINAL"}]);
 const base={run_day_index:3,horizon:"T-6h",reserved:true};
 const a={...base,run_id:"1",slot_id:"HUB",airport_icao:"YSSY",bound:true,timely:true};
 const b={...base,run_id:"2",slot_id:"MID_A",airport_icao:"KBUF",bound:false,timely:false};
 const out=projectP6RunReceiptRows(scope,[a,b]);
 assert.equal(out.selectedRuns,2);assert.equal(out.excludedReceiptCount,1);
 assert.deepEqual(out.rows.map(x=>[x.airport_icao,x.bound,x.timely_bindings]),[["YSSY",1,1],["KBUF",0,0]]);
 assert.equal(out.httpStatusIndependentlyVerified,false);assert.equal(out.actualPreCommitVerified,false);
 for(const rows of [[a],[a,a],[a,{...b,reserved:false}],[a,{...b,bound:true}],[{...a,timely:false},b],[a,{...b,run_id:"3"}]])assert.throws(()=>projectP6RunReceiptRows(scope,rows),/RUN_RECEIPT_/);
 assert.throws(()=>selectP6RunReceiptScope([{runId:1,status:positive},{runId:1,status:negative}]),/RUN_RECEIPT_IDENTITY/);
 assert.throws(()=>selectP6RunReceiptScope([{runId:3,status:"RUN_NOT_TERMINAL"}]),/RUN_RECEIPT_SCOPE/);
});

test("T111 exact response status diagnostics cannot conflate 206 or unexpected 2xx with 200",()=>{
 assert.equal(sourceHttpDiagnosticLabel(206,true),"HTTP_PARTIAL_CONTENT");
 for(const status of [201,202,203,207,208,226])assert.equal(sourceHttpDiagnosticLabel(status,true),"HTTP_UNEXPECTED_SUCCESS");
 assert.equal(sourceHttpDiagnosticLabel(200,true),"HTTP_OK");
 assert.equal(sourceHttpDiagnosticLabel(204,true),"HTTP_NO_CONTENT");
 assert.equal(sourceHttpDiagnosticLabel(205,true),"HTTP_RESET_CONTENT");
});
test("T112 fixed transport failure categories never echo arbitrary error details",()=>{
 for(const [error,label] of [
  [{name:"TimeoutError"},"HTTP_TRANSPORT_TIMEOUT"],[{cause:{code:"UND_ERR_CONNECT_TIMEOUT"}},"HTTP_TRANSPORT_TIMEOUT"],
  [{cause:{code:"ENOTFOUND"}},"HTTP_TRANSPORT_DNS"],[{cause:{code:"EAI_AGAIN"}},"HTTP_TRANSPORT_DNS"],
  [{cause:{code:"ERR_TLS_CERT_ALTNAME_INVALID"}},"HTTP_TRANSPORT_TLS"],[{code:"ECONNRESET"},"HTTP_TRANSPORT_SOCKET"],
  [{cause:{code:"SECRET_URL_OR_ARBITRARY_PROVIDER_TEXT"},message:"private"},"HTTP_TRANSPORT_FAILED"]
 ]){
  assert.equal(sourceTransportDiagnosticLabel(error),label);
  assert.deepEqual(readSafeSourceDiagnosticLines(sourceDiagnosticLine(label),null),["P6_SOURCE_DIAG "+label]);
 }
 const run={id:45916017872,head_sha:"c2bb8e18dfcf64ea815745da59ede62f53e448bb",event:"workflow_dispatch",head_branch:"main",run_attempt:1,status:"completed",conclusion:"failure"};
 const job={name:"exact-private-source-existing-one-get-child",run_id:run.id,head_sha:run.head_sha,run_attempt:1,status:"completed",conclusion:"failure",steps:[
  {name:"Admission for real actor preflight ONLY (no paid capability)",conclusion:"skipped"},
  {name:"Authenticate real private PG16 signed index and query, then ORIGINAL one-physical-GET child",conclusion:"failure",started_at:"2026-11-27T00:19:40Z",completed_at:"2026-11-27T01:45:39Z"}]};
 for(const label of ["HTTP_PARTIAL_CONTENT","HTTP_UNEXPECTED_SUCCESS","HTTP_TRANSPORT_TIMEOUT","HTTP_TRANSPORT_DNS","HTTP_TRANSPORT_TLS","HTTP_TRANSPORT_SOCKET","HTTP_TRANSPORT_FAILED"]){
  const log=["RESERVATION_CONFIRMED","HTTP_STARTED",label,"OUTCOME_UNOBSERVED"].map(x=>"2026-11-27T01:45:39.4611591Z P6_SOURCE_DIAG "+x).join("\n");
  const out=classifyP6PaidChildReceipt(run,[job],log);assert.equal(out.status,label+"_NO_ORIGINAL_PROOF");assert.equal(out.providerBillingVerified,false);assert.equal(out.actualPreCommitVerified,false);
 }
});
