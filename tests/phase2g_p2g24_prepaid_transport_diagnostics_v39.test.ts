import {EventEmitter} from "node:events";
import {describe,it,expect,vi} from "vitest";
import {
  observePrepaidHttpTransportV39,
  type PrepaidTransportWarningV39,
} from "../server/lib/disruption/phase2gPrepaidHttpTransportTelemetry_v39";

function harness(statusCode=200,warningThresholdMs=7000){
  const emitter=new EventEmitter() as EventEmitter & {statusCode:number};
  emitter.statusCode=statusCode;
  let clock=0;
  const records:PrepaidTransportWarningV39[]=[];
  observePrepaidHttpTransportV39(emitter,{
    now:()=>clock,warningThresholdMs,warn:v=>records.push(v)
  });
  return {emitter,records,advance:(ms:number)=>{clock+=ms}};
}

describe("P2G24 primary callback response transport warning only, zero provider traffic",()=>{
  it("does not report ordinary 200 completed quickly",()=>{
    const h=harness();h.advance(120);h.emitter.emit("finish");h.emitter.emit("close");
    expect(h.records).toHaveLength(0);
  });
  it("flags a server-side slow HTTP success at 7000ms, not a proven provider 2xx",()=>{
    const h=harness();h.advance(7000);h.emitter.emit("finish");h.emitter.emit("close");
    expect(h.records).toHaveLength(1);
    expect(h.records[0]).toMatchObject({
      warning:"response_slow",elapsed_ms:7000,http_status:200,server_response_finished:true
    });
  });
  it("flags HTTP 500 even if responded quickly",()=>{
    const h=harness(500);h.advance(400);h.emitter.emit("finish");
    expect(h.records[0]).toMatchObject({warning:"response_server_error",http_status:500,elapsed_ms:400});
  });
  it("flags connection closed before successful server acknowledgment",()=>{
    const h=harness();h.advance(2000);h.emitter.emit("close");
    expect(h.records).toHaveLength(1);
    expect(h.records[0]).toMatchObject({
      warning:"connection_closed_before_response_finished",
      http_status:200,server_response_finished:false
    });
  });
  it("never repeats warning on duplicate or later lifecycle events",()=>{
    const h=harness();h.advance(7001);h.emitter.emit("close");h.emitter.emit("finish");h.emitter.emit("close");
    expect(h.records).toHaveLength(1);
  });
  it("all diagnostics are sanitized with no endpoint, secret, identity or payload",()=>{
    const h=harness(503);h.advance(18);h.emitter.emit("finish");
    const content=JSON.stringify(h.records[0]);
    expect(content).toContain("database_queries");
    for(const bad of ["secret","session_id","body","webhook_url","flight_id","provider_notification_id"]){
      expect(content).not.toContain(bad);
    }
  });
  it("emits an in-flight warning without claiming a 200 ACK when POST is stuck",async()=>{
    vi.useFakeTimers();
    try {
      const h=harness();h.advance(7000);
      await vi.advanceTimersByTimeAsync(7000);
      expect(h.records).toHaveLength(1);
      expect(h.records[0]).toMatchObject({
        warning:"response_stalled_in_flight",elapsed_ms:7000,
        http_status:null,server_response_finished:false
      });
      expect(JSON.stringify(h.records[0])).not.toContain("webhook_url");
      h.advance(3000);h.emitter.statusCode=200;h.emitter.emit("finish");
      expect(h.records).toHaveLength(2);
      expect(h.records[1]).toMatchObject({
        warning:"response_slow",http_status:200,
        server_response_finished:true,elapsed_ms:10000
      });
    } finally { vi.useRealTimers(); }
  });
  it("a stalled request then HTTP 503 records BOTH missing in-flight ACK and terminal server failure",async()=>{
    vi.useFakeTimers();
    try {
      const h=harness();h.advance(7100);
      await vi.advanceTimersByTimeAsync(7000);
      h.emitter.statusCode=503;h.emitter.emit("finish");
      expect(h.records.map(x=>x.warning)).toEqual([
        "response_stalled_in_flight","response_server_error"
      ]);
      expect(h.records[0].http_status).toBeNull();
      expect(h.records[1].http_status).toBe(503);
      h.emitter.emit("close");
      expect(h.records).toHaveLength(2);
    } finally {vi.useRealTimers();}
  });
  it("timer cleanup prevents phantom slow alarms after a fast finish or early close",async()=>{
    vi.useFakeTimers();
    try {
      const ok=harness(),cut=harness();
      ok.advance(100);ok.emitter.emit("finish");
      cut.advance(80);cut.emitter.emit("close");
      await vi.advanceTimersByTimeAsync(10000);
      expect(ok.records).toHaveLength(0);
      expect(cut.records).toHaveLength(1);
      expect(cut.records[0].warning).toBe("connection_closed_before_response_finished");
    }finally{vi.useRealTimers();}
  });
  it("invalid deadline config cannot silently disable transport stall warnings",()=>{
    expect(()=>observePrepaidHttpTransportV39(
      Object.assign(new EventEmitter(),{statusCode:200}),{warningThresholdMs:NaN}
    )).toThrow("P08_INVALID_TRANSPORT_WARNING_THRESHOLD");
  });
});
