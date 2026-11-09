/**
 * One shared UTC lead-time contract across Phase5 early DB draw,
 * Stage6 committed-day FIDS preparation, and rolling first-day planning.
 *
 * The >= 24h45m boundary is strict in the live owners. Do not turn this
 * constant into permission to dispatch or claim the source is available.
 */
export const P5_EARLY_DRAW_MIN_STRICT_LEAD_MS =
 24*3_600_000 + 45*60_000;
export const P5_EARLY_DRAW_MAX_INCLUSIVE_LEAD_MS =
 72*3_600_000;

/**
 * Both boundary comparisons are intentional:
 * lead == 24h45m is TOO LATE; lead == 72h remains permitted.
 */
export function p5EarlyDrawLeadTimeEligible(
 fromUtcMs:number,serviceWindowStartUtcMs:number
):boolean{
 if(!Number.isFinite(fromUtcMs)||!Number.isFinite(serviceWindowStartUtcMs))
  return false;
 const lead=serviceWindowStartUtcMs-fromUtcMs;
 return lead>P5_EARLY_DRAW_MIN_STRICT_LEAD_MS&&
  lead<=P5_EARLY_DRAW_MAX_INCLUSIVE_LEAD_MS;
}
