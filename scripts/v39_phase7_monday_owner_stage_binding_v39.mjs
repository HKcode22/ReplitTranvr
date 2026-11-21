/** Exact Monday owner-only Phase7 inert-schema and preservation-login stage.
 * Taken from the genuine 2026-11-21 disabled stage revision and independent
 * readback. This is NOT a SOURCE approval and must never accept arbitrary
 * caller-selected code, manifest, calendar, or config pins.
 *
 * Stage is already bound to 781140c. A merge changing main SHA requires an
 * independently reviewed prospective transition before either owner APPLY.
 */
export const P7_MONDAY_OWNER_STAGE=Object.freeze({
 codeSha:"781140cde71af3b72376c2db9f0fdb84204a2b7c",
 manifestSha256:"b2a691cb411af61c2bfdc42c55506e0ee86e45bfa3e22b420bbd738dc98ee4e4",
 calendarSha256:"55ea0dd4b50d43af11af65a1e2910928e98a731ffa5efdeda7eee98ac451077b",
 configSha256:"ee4ec9f6ca3e0f123512c8aa463cadd07a8892a3fedc4c316fe0c1b64731457c"
});
export function assertP7MondayDisabledAuthorization(row){
 const b=P7_MONDAY_OWNER_STAGE;
 if(!row||typeof row!=="object"||Array.isArray(row)||
    row.code_sha!==b.codeSha||row.manifest_sha256!==b.manifestSha256||
    row.calendar_hash!==b.calendarSha256||row.config_hash!==b.configSha256||
    row.enabled!==false||row.revoked_at_utc!==null)
   throw Error("HOLD_P7_MONDAY_DISABLED_STAGE_BOUNDARY");
 return true;
}
