// Fixed operational metadata only. Never return provider contents, URLs, SQL,
// arbitrary error strings, credentials, or raw subprocess output.
const LABELS=new Set(["PACING_BASE_SLOT","PACING_ROTATED_SLOT","FIDS_BODY_UNAVAILABLE","FIDS_BODY_EMPTY","FIDS_BODY_TOO_LARGE","FIDS_BODY_READ_FAILED","FIDS_BODY_INVALID_JSON","FIDS_BODY_INVALID_OBJECT","FIDS_DEPARTURES_MISSING","FIDS_ARRIVALS_MISSING","FIDS_BODY_VALID","INNER_ADMITTED","DUE_QUEUE_BOUND","PREARM_COMMITTED","SIGNED_SLOT_REACHED","RESERVATION_STARTED","RESERVATION_CONFIRMED","HTTP_STARTED","HTTP_OK","HTTP_NO_CONTENT","HTTP_RESET_CONTENT","HTTP_AUTH_REJECTED","HTTP_RATE_LIMIT","HTTP_OTHER_CLIENT_ERROR","HTTP_SERVER_ERROR","HTTP_OTHER_STATUS","HTTP_TRANSPORT_FAILED","ORIGINAL_PERSIST_STARTED","ORIGINAL_PERSIST_CONFIRMED","OUTCOME_TIMELY","OUTCOME_LATE","OUTCOME_UNOBSERVED","INNER_FAILED","DB_PERMISSION","DB_OPERATOR_OR_FUNCTION_MISSING","DB_COLUMN_MISSING","DB_RELATION_MISSING","DB_OBJECT_MISSING","SOURCE_PERSISTENCE_NOT_READY","DB_INVALID_REPRESENTATION","DB_QUERY_CANCELED","DB_LOCK_UNAVAILABLE","DB_SERIALIZATION","DB_DEADLOCK","DB_AUTHENTICATION","DB_CONNECTION","OTHER_SQLSTATE","UNCLASSIFIED","SOURCE_RESERVATION_READBACK_FAILED","SOURCE_ORIGINAL_BINDING_READBACK_FAILED","SOURCE_FROZEN_QUERY_CHANGED","SOURCE_NORMALIZATION_INCOMPLETE"]);
const PREFIX="P6_SOURCE_DIAG ";
export function sourceDiagnosticLine(label){
 if(!LABELS.has(label))throw Error("UNKNOWN_SOURCE_DIAGNOSTIC_LABEL");
 return PREFIX+label;
}
export function readSafeSourceDiagnosticLines(stdout,stderr){
 const found=new Set();
 for(const raw of [stdout,stderr]){
  if(!Buffer.isBuffer(raw)&&typeof raw!=="string")continue;
  if(raw.length>10*1024*1024)continue;
  for(const line of raw.toString().split(/\r?\n/)){
   if(line.startsWith(PREFIX)&&LABELS.has(line.slice(PREFIX.length)))found.add(line);
  }
 }
 return [...found];
}
export function sourceHttpDiagnosticLabel(status,ok){
 if(status===204&&ok===true)return "HTTP_NO_CONTENT";
 if(status===205&&ok===true)return "HTTP_RESET_CONTENT";
 if(ok===true)return "HTTP_OK";
 if(status===401||status===403)return "HTTP_AUTH_REJECTED";
 if(status===429)return "HTTP_RATE_LIMIT";
 if(Number.isInteger(status)&&status>=400&&status<500)return "HTTP_OTHER_CLIENT_ERROR";
 if(Number.isInteger(status)&&status>=500&&status<600)return "HTTP_SERVER_ERROR";
 return "HTTP_OTHER_STATUS";
}

const POST_STAGES=new Set(["ADMISSION","READER_CONNECT","CLOCK_AND_DAY_SELECTION","SOURCE_HINT_SCAN","PUBLISHER_CONNECT","PUBLICATION","COMPLETE"]);
const SQLSTATE_CLASS=Object.freeze({"42501":"DB_PERMISSION","42883":"DB_OPERATOR_OR_FUNCTION_MISSING","42703":"DB_COLUMN_MISSING","42704":"DB_OBJECT_MISSING","42P01":"DB_RELATION_MISSING","22P02":"DB_INVALID_REPRESENTATION","57014":"DB_QUERY_CANCELED","55P03":"DB_LOCK_UNAVAILABLE","40001":"DB_SERIALIZATION","40P01":"DB_DEADLOCK","28P01":"DB_AUTHENTICATION"});
export function postDiagnostic(stage,error){
 if(!POST_STAGES.has(stage))throw Error("UNKNOWN_POST_DIAGNOSTIC_STAGE");
 const code=typeof error?.code==="string"?error.code:"";
 const category=Object.hasOwn(SQLSTATE_CLASS,code)?SQLSTATE_CLASS[code]:
  /^08[0-9A-Z]{3}$/.test(code)?"DB_CONNECTION":
  /^[0-9A-Z]{5}$/.test(code)?"OTHER_SQLSTATE":"UNCLASSIFIED";
 return Object.freeze({status:"P6_POST_DIAG_NO_PROVIDER_CONTENT",stage,category});
}

export function sourceDbDiagnosticLabel(error){
 const m=String(error?.message??"");
 const known={
 REFUSED_PHASE5_V0079_SCOPED_DB_SOURCE_PERSISTENCE_PRIVILEGES_NOT_READY_NO_RESERVATION:"SOURCE_PERSISTENCE_NOT_READY",
 REFUSED_PHASE5_V0079_SCOPED_DB_PHYSICAL_POSTCOMMIT_READBACK_FAILED_NO_DISPATCH:"SOURCE_RESERVATION_READBACK_FAILED",
 REFUSED_PHASE5_V0079_SCOPED_DB_POSTCOMMIT_SOURCE_BINDING_UNAVAILABLE:"SOURCE_ORIGINAL_BINDING_READBACK_FAILED",
 REFUSED_PHASE5_V0079_SCOPED_DB_POSTCOMMIT_ORIGINAL_DIGEST_MISMATCH:"SOURCE_ORIGINAL_BINDING_READBACK_FAILED",
 REFUSED_PHASE5_V0079_SCOPED_DB_FROZEN_QUERY_OR_SELECTION_CHANGED:"SOURCE_FROZEN_QUERY_CHANGED",
 FIDS_BOUND_NORMALIZATION_INCOMPLETE_ROLLBACK:"SOURCE_NORMALIZATION_INCOMPLETE",
 FIDS_BOUND_LEGACY_CONFLICT_FALLBACK_INCOMPLETE_ROLLBACK:"SOURCE_NORMALIZATION_INCOMPLETE"
 };
 return Object.hasOwn(known,m)?known[m]:postDiagnostic("SOURCE_HINT_SCAN",error).category;
}

// Outer transport diagnostics: fixed stage and SQL category only. Never echo
// arbitrary exceptions, private packet paths, digests, or response bodies.
const SOURCE_CHILD_STAGES=new Set(["ADMISSION","READER_CONNECT","READER_ROLE","SIGNED_DAY_READ","SIGNED_DAY_VERIFY","SIGNED_ROUTE_BIND","SIGNED_QUERY_READ","SIGNED_QUERY_VERIFY","READER_CLOSE","ROUTE_BINDING","ORIGINAL_ADMISSION","ORIGINAL_SUBPROCESS","EPHEMERAL_CLEANUP"]);
export function sourceChildFailureDiagnostic(stage,error){
 if(!SOURCE_CHILD_STAGES.has(stage))throw Error("UNKNOWN_SOURCE_CHILD_DIAGNOSTIC_STAGE");
 return Object.freeze({status:"P6_SOURCE_CHILD_FAILURE_DIAG_NO_PROVIDER_CONTENT",stage,category:sourceDbDiagnosticLabel(error)});
}

/** GitHub job logs add timestamps. Only complete allowlisted lines,
 * never echoed shell commands, raw output, or arbitrary strings. */
export function readSafeTimestampedSourceDiagnostics(log){
 if(typeof log!=="string"||log.length>10*1024*1024)return [];
 const lines=[];
 for(const line of log.split(/\r?\n/)){
  const m=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z P6_SOURCE_DIAG ([A-Z0-9_]+)$/.exec(line);
  if(m&&LABELS.has(m[1]))lines.push(PREFIX+m[1]);
 }
 return readSafeSourceDiagnosticLines(lines.join("\n"),null).map(x=>x.slice(PREFIX.length));
}
const EXACT_PAID_STEP="Authenticate real private PG16 signed index and query, then ORIGINAL one-physical-GET child";
const ACTOR_ONLY_STEP="Admission for real actor preflight ONLY (no paid capability)";
const JOB_NAME="exact-private-source-existing-one-get-child";
const HTTP_LABELS=new Set([...LABELS].filter(x=>x.startsWith("HTTP_")&&x!=="HTTP_STARTED"));
/** One exact private child, not parent ACK, billing or PRE. An overall red
 * job may still have committed a timely original before follow-on failure. */
export function classifyP6PaidChildReceipt(run,jobs,log){
 const out=(status,diagnostics=[])=>Object.freeze({runId:Number.isSafeInteger(run?.id)&&run.id>0?run.id:null,status,
  diagnostics,providerBillingVerified:false,independentDbReadbackVerified:false,actualPreCommitVerified:false,trainingEligibilityCertified:false});
 if(!Number.isSafeInteger(run?.id)||run.id<=0||!/^[a-f0-9]{40}$/.test(run.head_sha??"")||run.event!=="workflow_dispatch"||run.head_branch!=="main"||
  run.run_attempt!==1||!Array.isArray(jobs))return out("RUN_IDENTITY_UNVERIFIED");
 if(run.status!=="completed")return out("RUN_NOT_TERMINAL");
 const found=jobs.filter(j=>j.name===JOB_NAME);
 if(found.length!==1||jobs.some(j=>j.name!==JOB_NAME&&j.conclusion!=="skipped"))return out("JOB_SCOPE_UNVERIFIED");
 const j=found[0];
 if(j.run_id!==run.id||j.head_sha!==run.head_sha||j.run_attempt!==1||j.status!=="completed"||!Array.isArray(j.steps))return out("JOB_IDENTITY_UNVERIFIED");
 const paid=j.steps.filter(x=>x.name===EXACT_PAID_STEP),actor=j.steps.filter(x=>x.name===ACTOR_ONLY_STEP);
 if(paid.length!==1||actor.length!==1)return out("STEP_SCOPE_UNVERIFIED");
 if(paid[0].conclusion==="skipped"&&actor[0].conclusion==="success")return out("NONPAID_ACTOR_PREFLIGHT_NO_COLLECTION");
 if(paid[0].conclusion==="skipped")return out("PAID_STEP_SKIPPED_NO_COLLECTION_PROOF");
 if(!["success","failure","cancelled","timed_out"].includes(paid[0].conclusion)||actor[0].conclusion!=="skipped")return out("STEP_SCOPE_UNVERIFIED");
 const d=readSafeTimestampedSourceDiagnostics(log),has=x=>d.includes(x),http=d.filter(x=>HTTP_LABELS.has(x)),outcomes=d.filter(x=>["OUTCOME_TIMELY","OUTCOME_LATE","OUTCOME_UNOBSERVED"].includes(x));
 if(!d.length)return out("PAID_STEP_LOG_UNAVAILABLE_OR_NO_DIAGNOSTIC");
 if(http.length>1||outcomes.length>1||
  has("ORIGINAL_PERSIST_CONFIRMED")&&(!has("HTTP_OK")||!has("RESERVATION_CONFIRMED")||has("OUTCOME_UNOBSERVED"))||
  (has("OUTCOME_TIMELY")||has("OUTCOME_LATE"))&&!has("ORIGINAL_PERSIST_CONFIRMED"))return out("CONTRADICTORY_DIAGNOSTICS_REVIEW",d);
 if(has("PREARM_COMMITTED")&&has("RESERVATION_CONFIRMED")&&has("HTTP_OK")&&has("ORIGINAL_PERSIST_CONFIRMED")){
  if(has("OUTCOME_TIMELY"))return out("TIMELY_ORIGINAL_REPORTED_BY_CHILD",d);
  if(has("OUTCOME_LATE"))return out("LATE_ORIGINAL_REPORTED_BY_CHILD",d);
  return out("ORIGINAL_PERSIST_REPORTED_TIMING_UNVERIFIED",d);
 }
 if(has("HTTP_RATE_LIMIT"))return out("RATE_LIMIT_NO_ORIGINAL_PROOF",d);
 if(has("HTTP_OK"))return out("HTTP_OK_NO_ORIGINAL_PROOF",d);
 if(http.length===1)return out("HTTP_NON_SUCCESS_NO_ORIGINAL_PROOF",d);
 if(has("RESERVATION_CONFIRMED"))return out("RESERVATION_NO_ORIGINAL_PROOF",d);
 return out("ADMISSION_OR_TRANSPORT_UNVERIFIED_NO_ORIGINAL_PROOF",d);
}
