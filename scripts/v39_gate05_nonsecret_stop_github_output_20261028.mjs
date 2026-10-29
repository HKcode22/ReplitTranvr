/**
 * Encode exactly the eight nonsecret, immutable post-COMMIT STOP handoff
 * fields using GitHub Actions' actual key=value NEWLINE file protocol.
 * Pure and offline; no DB, network, provider, process env or deployment.
 */
const keys=[
  "scope_id","runner_sha","receiver_sha","authorization_sha256",
  "stop_ticket_sha256","start_utc","stop_utc","starting_credits"
];
const formats={
  scope_id:/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  runner_sha:/^[0-9a-f]{40}$/,
  receiver_sha:/^[0-9a-f]{40}$/,
  authorization_sha256:/^[0-9a-f]{64}$/,
  stop_ticket_sha256:/^[0-9a-f]{64}$/,
  start_utc:/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/,
  stop_utc:/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/,
  starting_credits:/^[1-9][0-9]{2,7}$/
};
export function gate05NonsecretStopOutputV39(handoff){
  if(!handoff||typeof handoff!=="object"||
    Array.isArray(handoff)||Object.keys(handoff).length!==keys.length)
    throw Error("GATE05_STOP_OUTPUT_SHAPE_HOLD");
  const lines=[];
  for(const key of keys){
    const v=handoff[key];
    if(typeof v!=="string"||!formats[key].test(v))
      throw Error("GATE05_STOP_OUTPUT_INVALID_FIELD_"+key);
    lines.push(key+"="+v);
  }
  if(new Date(handoff.start_utc).toISOString()!==handoff.start_utc||
    new Date(handoff.stop_utc).toISOString()!==handoff.stop_utc||
    Date.parse(handoff.stop_utc)-Date.parse(handoff.start_utc)!==3600000)
    throw Error("GATE05_STOP_OUTPUT_INTERVAL_HOLD");
  return lines.join("\n")+"\n";
}
