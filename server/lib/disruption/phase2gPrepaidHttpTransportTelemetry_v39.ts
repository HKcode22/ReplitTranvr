/**
 * P08: Sanitized POST transport diagnostics. Never log webhook URL secrets,
 * session identity, flight/source payload, provider ids or database secrets.
 *
 * "finish" means Node completed writing a response, NOT proof that an
 * upstream provider received a timely 2xx. In-flight warnings do not imply
 * successful HTTP acknowledgment or durable scientific source custody.
 */
export type PrepaidResponseEventsV39={
  statusCode:number;
  once(name:"finish"|"close",listener:()=>void):unknown;
};
export type PrepaidTransportWarningV39={
  schema:"v39.phase2g-prepaid-transport-warning.v1";
  warning:"response_slow"|"response_server_error"|
          "connection_closed_before_response_finished"|"response_stalled_in_flight";
  elapsed_ms:number;
  /** Null for an in-flight request: the current status is not final. */
  http_status:number|null;
  server_response_finished:boolean;
  provider_calls:0;database_queries:0;
};
export function observePrepaidHttpTransportV39(
  res:PrepaidResponseEventsV39,
  args?:{now?:()=>number;warn?:(record:PrepaidTransportWarningV39)=>void;warningThresholdMs?:number}
):void {
  const now=args?.now??Date.now;
  const warn=args?.warn??((record)=>console.warn(JSON.stringify(record)));
  const threshold=args?.warningThresholdMs??7_000;
  if(!Number.isFinite(threshold)||threshold<=0)
    throw Error("P08_INVALID_TRANSPORT_WARNING_THRESHOLD");
  const start=now();
  let finished=false,closed=false,terminalReported=false,stallReported=false;
  const emit=(warning:PrepaidTransportWarningV39["warning"],terminal=true)=>{
    if(terminal ? terminalReported : (stallReported||terminalReported||finished||closed))return;
    if(terminal)terminalReported=true;
    else stallReported=true;
    warn({
      schema:"v39.phase2g-prepaid-transport-warning.v1",
      warning,elapsed_ms:Math.max(0,now()-start),
      // Before finish/close, res.statusCode can still be the default 200:
      // reporting it as a sender-observed HTTP outcome would be false.
      http_status:terminal?res.statusCode:null,
      server_response_finished:finished,
      provider_calls:0,database_queries:0
    });
  };
  const deadline=setTimeout(()=>{
    if(!finished&&!closed)emit("response_stalled_in_flight",false);
  },threshold);
  deadline.unref();
  res.once("finish",()=>{
    if(closed)return;
    finished=true;
    clearTimeout(deadline);
    const duration=now()-start;
    if(res.statusCode>=500)emit("response_server_error");
    else if(duration>=threshold)emit("response_slow");
  });
  res.once("close",()=>{
    closed=true;
    clearTimeout(deadline);
    if(!finished)emit("connection_closed_before_response_finished");
  });
}
