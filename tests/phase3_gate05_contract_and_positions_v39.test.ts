import {describe,it,expect,vi} from "vitest";
import {fetchFidsAirport} from "../server/lib/disruption/aerodataboxLimiter_v3";
import {fetchFidsPopulation} from "../server/lib/disruption/fidsCensus_v3";
import {inspectGate05OpenApiBytesV39} from "../server/lib/disruption/gate05OpenApiInspector_v39";

const sampleSpec=()=>({
  openapi:"3.0.4",info:{version:"1.15.4.0"},
  paths:{"/flights/airports/{codeType}/{code}/{fromLocal}/{toLocal}":{
    get:{summary:"FIDS by local time range / TIER 2",
      parameters:[{name:"withLeg",in:"query",schema:{type:"boolean",default:true}},
        {name:"withLocation",in:"query",schema:{type:"boolean",default:false}},
        {name:"direction",in:"query",schema:{type:"string"}}]
    }}},
  components:{schemas:{FlightAirportMovementContract:{properties:{
    scheduledTime:{description:"Scheduled time of arrival or departure"},
    revisedTime:{description:"Actual / estimated time, at gate if runwayTime present; otherwise may be gate or runway"},
    runwayTime:{description:"Actual / estimated time on the runway"}
  }}}}
});
describe("OpenAPI inspect is local, strict and not source-authenticity approval",()=>{
  it("records raw bytes digest and semantic ambiguity without authorizing spend",()=>{
    const bytes=Buffer.from(JSON.stringify(sampleSpec()));
    const review=inspectGate05OpenApiBytesV39(bytes);
    expect(review.version).toBe("1.15.4.0");
    expect(review.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(review.movementFields.revisedMayBeEstimate).toBe(true);
    expect(review.canAuthorizePaidPilot).toBe(false);
    expect(review.observedMovementActualityVerified).toBe(false);
    expect(review.sourceAuthenticityVerified).toBe(false);
  });
  it("fail-closes on semantic drift and missing FIDS position parameter",()=>{
    const old=sampleSpec();
    old.components.schemas.FlightAirportMovementContract.properties.revisedTime.description="confirmed actual gate out";
    expect(()=>inspectGate05OpenApiBytesV39(JSON.stringify(old))).toThrow("GATE05_OPENAPI_MOVEMENT_SEMANTICS_DRIFT_HOLD");
    const p=sampleSpec();
    p.paths["/flights/airports/{codeType}/{code}/{fromLocal}/{toLocal}"].get.parameters.splice(1,1);
    expect(()=>inspectGate05OpenApiBytesV39(JSON.stringify(p))).toThrow("GATE05_OPENAPI_FIDS_CONTRACT_DRIFT_HOLD");
  });
  it("rejects malformed and missing document/version",()=>{
    expect(()=>inspectGate05OpenApiBytesV39("not JSON")).toThrow("GATE05_OPENAPI_JSON_INVALID");
    expect(()=>inspectGate05OpenApiBytesV39("{}")).toThrow("GATE05_OPENAPI_VERSION_MISSING");
  });
});
describe("Gate0.5 explicit FIDS position opt-in is budgeted and recorded",()=>{
  const reply=()=>new Response(JSON.stringify({departures:[],arrivals:[]}),{status:200});
  it("defaults to withLocation=false, can opt in true, records separate reservations",async()=>{
    const calls:string[]=[];
    const reserve=vi.fn(async(c:string,u:number,a:number)=>{calls.push("r:"+c+":"+u+":"+a);return "x";});
    const fetchImpl=vi.fn(async(url:string|URL|Request)=>{calls.push(String(url));return reply()});
    const defaults=await fetchFidsAirport("WSSS","2026-10-19T04:00","2026-10-19T06:00",{
      direction:"Departure",budgetOwner:{reserve},fetchImpl:fetchImpl as any
    });
    const location=await fetchFidsAirport("WSSS","2026-10-19T04:00","2026-10-19T06:00",{
      direction:"Departure",withLocation:true,budgetOwner:{reserve},fetchImpl:fetchImpl as any
    });
    expect(defaults).toEqual({departures:[],arrivals:[]});
    expect(location).toEqual(defaults);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(calls.filter(x=>x.startsWith("r:"))).toEqual(["r:fids_base:2:1","r:fids_base:2:1"]);
    expect(new URL(String(fetchImpl.mock.calls[0][0])).searchParams.get("withLocation")).toBe("false");
    expect(new URL(String(fetchImpl.mock.calls[1][0])).searchParams.get("withLocation")).toBe("true");
    expect(new URL(String(fetchImpl.mock.calls[1][0])).searchParams.get("direction")).toBe("Departure");
  });
  it("rejects nonboolean location option before any API call or reserve",async()=>{
    const reserve=vi.fn(),fetchImpl=vi.fn();
    await expect(fetchFidsAirport("WSSS","a","b",{withLocation:"true" as any,
      budgetOwner:{reserve},fetchImpl:fetchImpl as any}))
      .rejects.toThrow("FIDS_WITH_LOCATION_BOOLEAN_REQUIRED");
    expect(reserve).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("FIDS persistent evidence records the location option and role",async()=>{
    let captured:any,observed:any;
    await fetchFidsPopulation({
      airportIcao:"WSSS",fromLocal:"2026-10-19T04:00",toLocal:"2026-10-19T06:00",
      ianaTimezone:"Asia/Singapore",direction:"Departure",withCancelled:true,
      withCodeshared:true,withLocation:true,
      serviceWindowStartUtc:new Date("2026-10-18T20:00:00Z"),
      serviceWindowEndUtc:new Date("2026-10-18T22:00:00Z"),
      cutoffUtc:new Date("2026-10-18T19:00:00Z"),
      providerApiVersion:"1.15.4.0",fidsProtocolVersion:"test",
      openapiSha256:"a".repeat(64)
    },{
      fetchAirport:async(_a,_f,_t,options)=>{
        observed=options;return {departures:[],arrivals:[]};
      },
      persist:async(q,r)=>{captured=q;return r.length;},
      now:()=>new Date("2026-10-18T19:00:00Z")
    });
    expect(observed.withLocation).toBe(true);
    expect(captured.rawPayload.queryOptions).toEqual({
      direction:"Departure",withLeg:true,withLocation:true});
  });
});
