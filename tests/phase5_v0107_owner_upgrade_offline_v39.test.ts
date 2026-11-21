import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {expectedV0107Bodies} from '../scripts/v39_phase5_v0107_owner_upgrade_v39.mjs';

describe('V0107 owner readback contract',()=>{
 const sql=readFileSync('migrations/staged/V0107__phase5_verified_future_post_primary_expiry_margin_v39.sql','utf8');
 it('extracts the two exact replacement function bodies and rejects ambiguous DDL',()=>{
  const bodies=expectedV0107Bodies(sql);
  expect(bodies.status).toContain("interval '23 hours'");
  expect(bodies.sweep).toContain("interval '23 hours'");
  expect(()=>expectedV0107Bodies(sql+sql)).toThrow('HOLD_V0107_OWNER_SQL_BODY_SHAPE');
  expect(()=>expectedV0107Bodies(sql.replace('$sweep$;', '$wrong$;'))).toThrow('HOLD_V0107_OWNER_SQL_BODY_SHAPE');
 });
});
