/**
 * Safety refusal for the pre-V3.9 curated sampling-frame builder.
 *
 * Phase 2D requires the binding final-frame owner, a permitted frozen traffic
 * reference, fresh Gate-1 coverage and the reviewed region mapping. Curated
 * human tiers must never become the active research frame.
 */
console.error(
  [
    "BLOCKED: legacy curated-tier frame builder is not an admissible V3.9 Phase-2 operator.",
    "Use `npm run v39:frame:build` only after prerequisite P, fresh Gate 1, and the permitted frozen 12-month traffic reference are ready.",
  ].join("\n"),
);
process.exitCode = 2;
