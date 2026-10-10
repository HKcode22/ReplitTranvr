/**
 * P2G24 preventive observability: record slow or interrupted HTTP responses
 * without logging URL-path webhook secrets, session identifiers, raw payload,
 * database credentials, or provider notification IDs.
 *
 * Emits only warnings. Does NOT claim that a server-side 'finish' means the
 * remote AeroDataBox sender received 2xx (edge/network may still drop it).
 */
export type PrepaidResponseEventsV39={
  statusCode:number;
  once(name:"finish"|"close",listener:()=>void):unknown;
};
export type PrepaidTransportWarningV39={
  schema:"v39.phase2g-prepaid-transport-warning.v1";
  warning:"response_slow"|"response_server_error"|"connection_closed_before_response_finished";
  elapsed_ms:number;http_status:number;server_response_finished:boolean;
  provider_calls:0;database_queries:0;
};
export function observePrepaidHttpTransportV39(
  res:PrepaidResponseEventsV39,
  args?:{now?:()=>number;warn?:(record:PrepaidTransportWarningV39)=>void;warningThresholdMs?:number}
):void {
  const now=args?.now??Date.now;
  const warn=args?.warn??((record)=>console.warn(JSON.stringify(record)));
  const threshold=args?.warningThresholdMs??7_000;
  const start=now();
  let finished=false,reported=false;
  const emit=(warning:PrepaidTransportWarningV39["warning"])=>{
    if(reported)return;
    reported=true;
    warn({
      schema:"v39.phase2g-prepaid-transport-warning.v1",
      warning,elapsed_ms:Math.max(0,now()-start),
      http_status:res.statusCode,server_response_finished:finished,
      provider_calls:0,database_queries:0
    });
  };
  res.once("finish",()=>{
    finished=true;
    const duration=now()-start;
    if(res.statusCode>=500)emit("response_server_error");
    else if(duration>=threshold)emit("response_slow");
  });
  res.once("close",()=>{
    if(!finished)emit("connection_closed_before_response_finished");
  });
}
