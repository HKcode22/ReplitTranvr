import test from "node:test";
import assert from "node:assert/strict";
import {sourceDiagnosticLine,readSafeSourceDiagnosticLines,sourceHttpDiagnosticLabel,postDiagnostic,sourceDbDiagnosticLabel,sourceChildFailureDiagnostic} from "../scripts/v39_phase5b_source_diagnostics_v39.mjs";
test("only fixed complete diagnostic lines are returned, never arbitrary captured data",()=>{
 const ok=sourceDiagnosticLine("RESERVATION_CONFIRMED");
 const no=sourceDiagnosticLine("HTTP_AUTH_REJECTED");
 const out=readSafeSourceDiagnosticLines(Buffer.from("postgres://private-secret\n"+ok+"\n"+ok+"\nP6_SOURCE_DIAG HTTP_OK extra-secret\n"),"prefix "+no+"\n"+no+"\nP6_SOURCE_DIAG ARBITRARY_PRIVATE_CONTENT");
 assert.deepEqual(out,[ok,no]);
 assert.throws(()=>sourceDiagnosticLine("some-secret"),/UNKNOWN_SOURCE_DIAGNOSTIC_LABEL/);
 assert.deepEqual(readSafeSourceDiagnosticLines(null,{}),[]);
});
test("HTTP diagnostic labels distinguish auth, rate, client, server, OK and other without body or URL",()=>{
 for(const [code,ok,label] of [[200,true,"HTTP_OK"],[204,true,"HTTP_NO_CONTENT"],[205,true,"HTTP_RESET_CONTENT"],[401,false,"HTTP_AUTH_REJECTED"],[403,false,"HTTP_AUTH_REJECTED"],[429,false,"HTTP_RATE_LIMIT"],[404,false,"HTTP_OTHER_CLIENT_ERROR"],[503,false,"HTTP_SERVER_ERROR"],[302,false,"HTTP_OTHER_STATUS"]])
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
 assert.throws(()=>projectP6SignedCalendarCoverage(calendar,[{...r,elapsed_unreserved:41}],dup,at),/COUNT_OR_CLOCK_CONTRADICTION/);
 assert.throws(()=>projectP6SignedCalendarCoverage(calendar,[r,r],dup,at),/COUNT_OR_CLOCK_CONTRADICTION/);
 assert.throws(()=>projectP6SignedCalendarCoverage(calendar.map(d=>d.run_day_index===21?{...d,evaluation_partition:"train"}:d),[r],dup,at),/FROZEN_CALENDAR_OR_SPLIT_DRIFT/);
});
