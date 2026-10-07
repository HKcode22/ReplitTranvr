/**
 * V3.9 Preflight Consistency Scan (A31 §95)
 *
 * This script checks the canonical registry against current docs/config
 * and lexical-scans normative sections for stale terms.
 *
 * Usage: npx tsx scripts/v39_preflight_consistency.ts
 *
 * This script is a lexical diagnostic scanner.
 *
 * It does not by itself prove complete document closure.
 *
 * Classification for every lexical match:
 *   VALID_FINAL | MEASURE→FREEZE | DEFERRED |
 *   HISTORICAL/SUPERSEDED | NEEDS_REVIEW
 */

import { readFileSync } from 'fs';
import { join } from 'path';

/*
 * Current authority follows the active execution documents:
 *
 *   1. Plan §§0–21 = normative executable contract.
 *   2. Active Implementation Log §§0–35 = derived runbook.
 *
 * An older archived registry reference is not treated as a
 * third current authority and is not recreated here.
 */
const NORMATIVE_FILES = [
  'V3.9_DataCollectPlan_f.8.md',
  'V3.9_IMPLEMENTATION_LOG.md',
];

const STALE_TERMS = [
  { term: 'TBD', description: 'unresolved placeholder' },
  { term: 'TODO', description: 'unresolved task' },
  { term: 'proposal', description: 'not yet frozen' },
  { term: 'candidate', description: 'not yet frozen' },
  { term: 'preferred', description: 'not yet frozen' },
  { term: '~', description: 'approximate value' },
  { term: 'or', description: 'ambiguous choice' },
  { term: 'may', description: 'not mandatory' },
  { term: 'scheduled_gate_out', description: 'hard-coded T milestone' },
  { term: 'wheels_off', description: 'hard-coded primary target' },
  { term: '60m', description: 'hard-coded grace' },
  { term: '919', description: 'old worst-case' },
  { term: '899', description: 'old worst-case' },
  { term: '4053', description: 'old REGIONAL count' },
  { term: 'r_i', description: 'removed variable' },
  { term: 'f.7', description: 'old version' },
  { term: 'f.8', description: 'old version (check context)' },
  { term: 'f.9', description: 'old version (check context)' },
  { term: 'all implemented', description: 'overclaim' },
  { term: 'all verified', description: 'overclaim' },
  { term: 'materialize test rows', description: 'old chronology' },
  { term: 'true census', description: 'overclaim' },
  { term: 'same calendar date', description: 'ambiguous' },
  { term: 'conformal interval', description: 'check if deferred' },
  { term: 'P\\(delay', description: 'check context' },
  { term: '/flights/schedule', description: 'stale endpoint' },
  { term: 'withLeg.*false', description: 'stale semantics' },
  { term: 'result truncated', description: 'stale assumption' },
];

interface MatchResult {
  file: string;
  line: number;
  term: string;
  context: string;
  classification: string;
}

function classifyMatch(term: string, line: string, file: string): string {
  // Historical/superseded — in change log, audit record, or citation
  if (
    line.includes('LOG-') ||
    line.includes('§11 prose') ||
    line.includes('historical') ||
    line.includes('superseded') ||
    line.includes('old wording') ||
    line.includes('was:') ||
    line.includes('before:') ||
    file.includes('A30_77_ADJUDICATION')
  ) {
    return 'HISTORICAL/SUPERSEDED';
  }

  // Measure→freeze — in manifest or frozen-at context
  if (
    line.includes('MEASURE→FREEZE') ||
    line.includes('TBD') ||
    line.includes('freeze') ||
    line.includes('Gate 0.5')
  ) {
    return 'MEASURE→FREEZE';
  }

  // Deferred — in deferred analysis context
  if (line.includes('DEFERRED') || line.includes('Month 2') || line.includes('Model 7')) {
    return 'DEFERRED';
  }

  // Valid final — explicitly corrected or frozen
  if (
    line.includes('NOT') ||
    line.includes('corrected') ||
    line.includes('A31') ||
    line.includes('FROZEN')
  ) {
    return 'VALID_FINAL';
  }

  // Default: needs review
  return 'NEEDS_REVIEW';
}

function scan(): MatchResult[] {
  const results: MatchResult[] = [];
  /*
   * Current authoritative scanner inputs both live in SEPmd/.
   * Missing declared authority is fatal rather than silently
   * skipped.
   */
  const basePaths: Record<string, string> = {
    'V3.9_DataCollectPlan_f.8.md':
      join(process.cwd(), 'SEPmd'),
    'V3.9_IMPLEMENTATION_LOG.md':
      join(process.cwd(), 'SEPmd'),
  };

  for (const fileName of NORMATIVE_FILES) {
    const filePath = join(basePaths[fileName], fileName);
    let content: string;
    try {
      content = readFileSync(filePath, 'utf-8');
    } catch {
      throw new Error(
        `SCANNER_REFUSED:MISSING_NORMATIVE_FILE:${filePath}`,
      );
    }

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const { term } of STALE_TERMS) {
        const regex = new RegExp(term, 'i');
        if (regex.test(line)) {
          const classification = classifyMatch(term, line, fileName);
          results.push({
            file: fileName,
            line: i + 1,
            term,
            context: line.substring(0, 100),
            classification,
          });
        }
      }
    }
  }

  return results;
}

function main() {
  console.log('=== V3.9 Preflight Consistency Scan ===\n');

  const results = scan();

  // Group by classification
  const groups: Record<string, MatchResult[]> = {};
  for (const r of results) {
    if (!groups[r.classification]) groups[r.classification] = [];
    groups[r.classification].push(r);
  }

  for (const [classification, items] of Object.entries(groups)) {
    console.log(`\n--- ${classification} (${items.length}) ---`);
    for (const item of items.slice(0, 10)) {
      console.log(`  ${item.file}:${item.line} [${item.term}] ${item.context.substring(0, 80)}`);
    }
    if (items.length > 10) {
      console.log(`  ... and ${items.length - 10} more`);
    }
  }

  const needsReview =
    results.filter(
      (result) =>
        result.classification ===
        'NEEDS_REVIEW',
    );

  console.log(`\n=== SUMMARY ===`);
  console.log(`Total matches: ${results.length}`);
  console.log(
    `VALID_FINAL: ${groups['VALID_FINAL']?.length || 0}`,
  );
  console.log(
    `MEASURE→FREEZE: ${groups['MEASURE→FREEZE']?.length || 0}`,
  );
  console.log(
    `DEFERRED: ${groups['DEFERRED']?.length || 0}`,
  );
  console.log(
    `HISTORICAL/SUPERSEDED: ` +
    `${groups['HISTORICAL/SUPERSEDED']?.length || 0}`,
  );
  console.log(
    `NEEDS_REVIEW: ${needsReview.length}`,
  );

  if (needsReview.length > 0) {
    console.log(
      '\n⚠️  NEEDS_REVIEW lexical items — diagnostic only',
    );

    for (const item of needsReview) {
      console.log(
        `  ${item.file}:${item.line} ` +
        `[${item.term}] ` +
        `${item.context.substring(0, 80)}`,
      );
    }
  }

  console.log(
    '\nSCANNER_MODE=LEXICAL_DIAGNOSTIC_ONLY',
  );

  console.log(
    `SCANNER_NEEDS_REVIEW=${needsReview.length}`,
  );

  console.log(
    needsReview.length > 0
      ? 'SCANNER_CLOSURE=NOT_PROVEN_BY_THIS_TOOL'
      : 'SCANNER_CLOSURE=NO_LEXICAL_REVIEW_ITEMS',
  );
}

main();
