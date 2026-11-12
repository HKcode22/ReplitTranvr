/**
 * Type-only interface for the existing inert staging calendar validator.
 * Implemented by the adjacent .mjs; no runtime code, DB or privilege change.
 */
export interface P5B0062InertCalendarOnlyReview {
 knownPairedAirportDays:10;
 unknownOrdinaryAirportDays:21;
}
export function inspectP5B0062InertCalendarOnlyRows(
 calendarDays:readonly unknown[]
):P5B0062InertCalendarOnlyReview;
