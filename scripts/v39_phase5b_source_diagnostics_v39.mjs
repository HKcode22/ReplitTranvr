// Fixed operational metadata only. Never return provider contents, URLs, SQL,
// arbitrary error strings, credentials, or raw subprocess output.
const LABELS=new Set(["INNER_ADMITTED","DUE_QUEUE_BOUND","PREARM_COMMITTED","SIGNED_SLOT_REACHED","RESERVATION_STARTED","RESERVATION_CONFIRMED","HTTP_STARTED","HTTP_OK","HTTP_AUTH_REJECTED","HTTP_RATE_LIMIT","HTTP_OTHER_CLIENT_ERROR","HTTP_SERVER_ERROR","HTTP_OTHER_STATUS","HTTP_TRANSPORT_FAILED","ORIGINAL_PERSIST_STARTED","ORIGINAL_PERSIST_CONFIRMED","OUTCOME_TIMELY","OUTCOME_LATE","OUTCOME_UNOBSERVED","INNER_FAILED"]);
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
 if(ok===true)return "HTTP_OK";
 if(status===401||status===403)return "HTTP_AUTH_REJECTED";
 if(status===429)return "HTTP_RATE_LIMIT";
 if(Number.isInteger(status)&&status>=400&&status<500)return "HTTP_OTHER_CLIENT_ERROR";
 if(Number.isInteger(status)&&status>=500&&status<600)return "HTTP_SERVER_ERROR";
 return "HTTP_OTHER_STATUS";
}
