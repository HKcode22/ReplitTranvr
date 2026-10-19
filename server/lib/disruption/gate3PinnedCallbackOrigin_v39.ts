/**
 * Single reviewed callback identity for Phase3 Gate3 *provider CREATE* and
 * the independent GitHub Actions watchdog. Do not derive the paid callback
 * from REPLIT_DOMAINS, the editor dev URL, travnr.com or unverified ENV.
 *
 * Pinned to the published receiver already validated by Gate3 host/custody
 * checks. No :443 port is emitted, avoiding avoidable raw provider-ID skew.
 * Other Phase2 owner kinds retain the historical defaultWebhookUrl() path.
 */
import {prepaidProbeWebhookUrlV39} from "./prepaidProbeRuntime_v39";

export const GATE3_PINNED_RECEIVER_ORIGIN_V39 =
  "https://replit-tranvr--hk84164.replit.app" as const;

/** Fail BEFORE PREPARED or provider IO for an explicitly conflicting config. */
export function assertGate3PinnedCallbackConfigV39(
  secret:unknown,configuredBase:unknown,
):asserts secret is string {
  if(typeof secret!=="string"||secret.length===0)
    throw Error("GATE3_PINNED_WEBHOOK_SECRET_MISSING_HOLD");
  if(configuredBase!==undefined&&configuredBase!==null&&
     configuredBase!==""&&configuredBase!==GATE3_PINNED_RECEIVER_ORIGIN_V39)
    throw Error("GATE3_CONFIGURED_WEBHOOK_ORIGIN_DIFFERS_FROM_PUBLISHED_HOLD");
}

/** Pure; identical bytes in the real paid owner and independent watchdog. */
export function gate3PinnedPrepaidCallbackUrlV39(
  sessionId:string,secret:unknown,configuredBase?:unknown,
):string{
  assertGate3PinnedCallbackConfigV39(secret,configuredBase);
  return prepaidProbeWebhookUrlV39(
    GATE3_PINNED_RECEIVER_ORIGIN_V39+
      "/api/v1/webhooks/aerodatabox/"+encodeURIComponent(secret),
    sessionId,
  );
}
