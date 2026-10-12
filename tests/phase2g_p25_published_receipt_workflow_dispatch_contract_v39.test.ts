import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
const w=readFileSync(".github/workflows/phase2g-paid-stage1.yml","utf8");
describe("P25 paid owner admits SHA-verified postpublish signed callback proof without circular commit",()=>{
 it("permits receipt input for the real published callback, SHA verified",()=>{
   expect(w).toContain('CALLBACK_VERIFICATION_B64: ${{ inputs.callback_verification_b64 }}');
   expect(w).toContain('if [[ -n "${CALLBACK_VERIFICATION_B64:-}" ]]; then');
   expect(w).toContain('base64 -d > "$CALLBACK_FILE"');
   expect(w).toContain('printf \'%s\' "$CALLBACK_VERIFICATION_B64"');
   expect(w).toContain('Callback verification base64 SHA mismatch');
   expect(w).toContain('Committed callback-verification SHA mismatch');
   expect(w).toContain('Supply exactly one callback-verification source');
 });
 it("does not relax paid source, public deployment, actual POST, time or database gates",()=>{
   expect(w).toContain('inputs.expected_head');
   expect(w).toContain('inputs.callback_verification_sha');
   expect(w).toContain('if [[ "${{ inputs.expected_head }}" != "${GITHUB_SHA}" ]]');
   expect(w).toContain('health?.git_head ?? ""');
   expect(w).toContain('PUBLISHED_RUNTIME_BINDING=PASS');
   expect(w).toContain('__v39/phase2g/runtime-db-binding');
   expect(w).toContain('CALLBACK_VERIFICATION_B64');
   expect(w).toContain('npx tsx scripts/v39_phase2g_stage1_paid_preflight_v39.ts');
   expect(w).toContain('--callback-verification "$CALLBACK_FILE"');
   expect(w).toContain('--callback-verification-sha "${{ inputs.callback_verification_sha }}"');
   expect(w).toContain('environment: phase2g-paid');
   expect(w).toContain('confirm == \'RUN_PAID_STAGE1_ONCE\'');
 });
});
