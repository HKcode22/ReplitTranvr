import {describe,it,expect} from "vitest";
import {assertReadOnlyPgObservationArgsV39,summarizeReadOnlyPgObservationsV39}
  from "../scripts/v39_phase2g_independent_pg_delivery_readonly_observer";
const SESSION="e277f4ea-5d5a-4158-86cd-8175a65985ee";
const base=()=>({
  sessionRows:1,postmasterStartUtc:"2026-10-11T02:00:00.000Z",
  callbackRequestsSeen:5,callbackSuccess2xx:4,callbackFailures:1,
  deliveryRows:4,deliveryItemCount:11,deliveryAttemptCostClaims:11,
  perBinNotificationItems:[0,1,0,0,4,6,0,0],
  perBinDeliveryRows:[0,1,0,0,1,2,0,0]
});
describe("P06/P15 pure PostgreSQL observer contract (never HTTP ingress)",()=>{
  it("requires exact frozen two-hour UTC window and v4 session",()=>{
    expect(()=>assertReadOnlyPgObservationArgsV39({
      sessionId:SESSION,startUtc:"2026-10-12T03:00:00Z",
      endUtc:"2026-10-12T05:00:00Z"
    })).not.toThrow();
    expect(()=>assertReadOnlyPgObservationArgsV39({
      sessionId:SESSION,startUtc:"2026-10-12T03:00:00Z",
      endUtc:"2026-10-12T04:59:59Z"
    })).toThrow("READONLY_OBSERVER_FROZEN_120MIN_WINDOW_INVALID");
  });
  it("rejects invalid identity; never accepts URL as session UUID",()=>{
    expect(()=>assertReadOnlyPgObservationArgsV39({
      sessionId:"postgresql://secret@host/database",
      startUtc:"2026-10-12T03:00:00Z",endUtc:"2026-10-12T05:00:00Z"
    })).toThrow("READONLY_OBSERVER_SESSION_UUID_INVALID");
  });
  it("preserves eight elapsed observation bins including valid zero-traffic intervals",()=>{
    const r=summarizeReadOnlyPgObservationsV39(base());
    expect(r.perBinNotificationItems).toEqual([0,1,0,0,4,6,0,0]);
    expect(r.deliveryItemCount).toBe(11);
    expect(r.observationSource).toBe("POSTGRESQL_ONLY_NOT_PROVIDER_SENDER");
  });
  it("a PostgreSQL success count cannot be treated as original provider sender success or absence of missed bills",()=>{
    const r=summarizeReadOnlyPgObservationsV39(base());
    expect(r.independentProviderAttemptLedgerPresent).toBe(false);
    expect(r.missedProviderFlightItems).toBeNull();
    expect(r.missingRate).toBeNull();
    expect(r.scientificCompletenessVerified).toBe(false);
    expect(r.prospectivePaidSixPlusSixEnabled).toBe(false);
    expect(r.noHttpIngressProvisioned).toBe(true);
  });
  it("a reboot-cleared UNLOGGED session must remain explicit missing DB observation, not zero source loss",()=>{
    const r=summarizeReadOnlyPgObservationsV39({
      ...base(),sessionRows:0,deliveryRows:0,deliveryItemCount:0,
      deliveryAttemptCostClaims:0,callbackRequestsSeen:0,
      callbackSuccess2xx:0,callbackFailures:0,
      perBinNotificationItems:Array(8).fill(0),
      perBinDeliveryRows:Array(8).fill(0)
    });
    expect(r.sessionRows).toBe(0);
    expect(r.scientificCompletenessVerified).toBe(false);
    expect(r.missedProviderFlightItems).toBeNull();
  });
  it("rejects malformed bins or negative DB counts rather than claiming a verified snapshot",()=>{
    expect(()=>summarizeReadOnlyPgObservationsV39({
      ...base(),perBinNotificationItems:[0,1]
    })).toThrow("READONLY_OBSERVER_INVALID_DB_COUNTERS");
    expect(()=>summarizeReadOnlyPgObservationsV39({
      ...base(),callbackFailures:-1
    })).toThrow("READONLY_OBSERVER_INVALID_DB_COUNTERS");
  });
});
