/**
 * Gate4 planned callback-health tolerance: carry forward the agreed,
 * independently reviewed Phase2G 6 primary + 6 conditional contingency
 * health checks (15 sec each, max 180 sec cumulative outage envelope).
 *
 * This module is a PURE observer. It makes NO AeroDataBox calls and grants
 * NO provider CREATE, callback receipt, scientific PASS or subscription
 * billing grace. The independent 5-sec STOP worker MUST continue to respond
 * immediately to exact owned-ID spending/deadline/identity risks. Integrate
 * observation into a reviewed paid-run controller only after explicit
 * scope-specific owner approval. Not active in a paid Gate4 deployment.
 *
 * AeroDataBox maxDeliveryRetries is an unrelated CREATE body parameter,
 * documented to be 0..2 (billed extra SEND attempts). The 6+6 health
 * watchdog NEVER sets that parameter.
 */
import {
 advanceStage1WatchdogV39,initialStage1WatchdogStateV39,
 STAGE1_SIX_PLUS_SIX_PRIMARY_V39,
 STAGE1_SIX_PLUS_SIX_CONTINGENT_V39,
 STAGE1_SIX_PLUS_SIX_MAX_CONSECUTIVE_V39,
 STAGE1_SIX_PLUS_SIX_WALL_MS_V39,
 STAGE1_WATCHDOG_POLL_MS_V39,
 type Stage1WatchdogStateV39,
 type Stage1SanitizedCallbackHealthV39,
} from "../../../scripts/v39_phase2g_stage1_watchdog_6plus6_policy_v39";

export const GATE4_CALLBACK_PRIMARY_CHECKS_V39=STAGE1_SIX_PLUS_SIX_PRIMARY_V39;
export const GATE4_CALLBACK_BACKUP_CHECKS_V39=STAGE1_SIX_PLUS_SIX_CONTINGENT_V39;
export const GATE4_CALLBACK_MAX_CHECKS_V39=STAGE1_SIX_PLUS_SIX_MAX_CONSECUTIVE_V39;
export const GATE4_CALLBACK_POLL_MS_V39=STAGE1_WATCHDOG_POLL_MS_V39;
export const GATE4_CALLBACK_MAX_WALL_MS_V39=STAGE1_SIX_PLUS_SIX_WALL_MS_V39;
export const GATE4_CALLBACK_POLICY_V39="six-plus-six" as const;
export const GATE4_PROVIDER_PAID_REDELIVERY_RETRIES_V39=0 as const;

export type Gate4CallbackObservationStateV39=Stage1WatchdogStateV39;
export const initialGate4CallbackObservationStateV39=initialStage1WatchdogStateV39;

/**
 * STOP_OWNER here is a callback-health observation recommendation ONLY.
 * The independent paid STOP worker remains the authority for ownership,
 * balance, deadline, exact-ID DELETE and provider-account reconciliation.
 * Healthy GETs are never evidence that original sender events arrived.
 */
export function advanceGate4CallbackObservationV39(
 previous:Gate4CallbackObservationStateV39,
 health:Stage1SanitizedCallbackHealthV39,
 nowMonotonicMs:number
){
 return advanceStage1WatchdogV39({
  mode:GATE4_CALLBACK_POLICY_V39,
  previous,
  health,
  nowMonotonicMs,
  evidence:undefined
 });
}
