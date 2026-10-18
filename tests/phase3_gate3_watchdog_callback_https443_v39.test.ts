import {describe,it,expect} from "vitest";
import {isGate3PinnedOwnedCallbackUrlV39}
  from "../scripts/v39_gate3_independent_watchdog_v39";
import {prepaidProbeWebhookUrlV39}
  from "../server/lib/disruption/prepaidProbeRuntime_v39";

const base="https://replit-tranvr--hk84164.replit.app";
const sid="7985f9d2-b20f-49fa-b7ae-0ec62348d291";
const secret="fake-test-secret+encoded/#";
const path="/api/v1/webhooks/aerodatabox/"+
  encodeURIComponent(secret)+"/prepaid/"+sid;

describe("Gate3 pinned HTTPS callback validation (no provider or DB)",()=>{
  it("accepts identical pinned origin with implicit or explicit standard HTTPS :443",()=>{
    expect(isGate3PinnedOwnedCallbackUrlV39(
      prepaidProbeWebhookUrlV39(base+path.replace("/prepaid/"+sid,""),sid),
      sid,secret)).toBe(true);
    expect(isGate3PinnedOwnedCallbackUrlV39(
      prepaidProbeWebhookUrlV39(base+":443"+path.replace("/prepaid/"+sid,""),sid),
      sid,secret)).toBe(true);
    // Match actual defaultWebhookUrl() construction while preserving URL bytes.
    expect(new URL(base+":443"+path).origin).toBe(base);
  });
  it.each([
    ["HTTP", "http://replit-tranvr--hk84164.replit.app"+path],
    ["different port",base+":444"+path],
    ["different host","https://travnr.com"+path],
    ["lookalike host",base+".evil.example"+path],
    ["missing secret",base+"/api/v1/webhooks/aerodatabox/prepaid/"+sid],
    ["wrong secret",base+"/api/v1/webhooks/aerodatabox/other/prepaid/"+sid],
    ["wrong session",base+path.replace(sid,"aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaaa")],
    ["extra path",base+path+"/extra"],
    ["query",base+path+"?bypass=1"],
    ["fragment",base+path+"#fragment"],
    ["userinfo","https://user@replit-tranvr--hk84164.replit.app"+path],
    ["unrelated path",base+"/api/v1/webhooks/aerodatabox/anything"],
  ])("rejects %s",(_,url)=>{
    expect(isGate3PinnedOwnedCallbackUrlV39(url,sid,secret)).toBe(false);
  });
  it("rejects invalid session, missing secret and invalid URLs",()=>{
    expect(isGate3PinnedOwnedCallbackUrlV39(base+path,"not-a-uuid",secret))
      .toBe(false);
    expect(isGate3PinnedOwnedCallbackUrlV39(base+path,sid,""))
      .toBe(false);
    expect(isGate3PinnedOwnedCallbackUrlV39("not-a-url",sid,secret))
      .toBe(false);
  });
});
