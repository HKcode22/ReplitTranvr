// Lightweight assertions for the Bland voice pool helpers. Run with:
//   tsx scripts/test-voice-pool.ts
import { DEFAULT_VOICE_POOL, getVoicePool, pickVoice } from "../server/lib/bland";

let failed = 0;
function expect(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) console.log(`  ok  ${label}`);
  else {
    failed++;
    console.error(`  FAIL ${label}\n       expected: ${JSON.stringify(expected)}\n       actual:   ${JSON.stringify(actual)}`);
  }
}

function withEnv(value: string | undefined, fn: () => void) {
  const prev = process.env.BLAND_VOICE_POOL;
  if (value === undefined) delete process.env.BLAND_VOICE_POOL;
  else process.env.BLAND_VOICE_POOL = value;
  try { fn(); } finally {
    if (prev === undefined) delete process.env.BLAND_VOICE_POOL;
    else process.env.BLAND_VOICE_POOL = prev;
  }
}

console.log("DEFAULT_VOICE_POOL:");
expect("contains the curated names", [...DEFAULT_VOICE_POOL].sort(), ["Alley", "Allan", "Carl", "Sophie", "Trixie", "Violette"].sort());
expect("does NOT contain the old robotic 'mason'", DEFAULT_VOICE_POOL.includes("mason"), false);

console.log("\ngetVoicePool — env var override:");
withEnv(undefined, () => expect("unset env -> defaults", getVoicePool(), [...DEFAULT_VOICE_POOL]));
withEnv("", () => expect("empty env -> defaults", getVoicePool(), [...DEFAULT_VOICE_POOL]));
withEnv("   ,  , ", () => expect("only commas/spaces -> defaults", getVoicePool(), [...DEFAULT_VOICE_POOL]));
withEnv("Allan, Sophie ,Carl", () => expect("trims and parses csv", getVoicePool(), ["Allan", "Sophie", "Carl"]));
withEnv("Solo", () => expect("single name", getVoicePool(), ["Solo"]));

console.log("\npickVoice — deterministic with injected rng:");
withEnv(undefined, () => {
  expect("rng=0 -> first voice", pickVoice(() => 0), "Allan");
  expect("rng=0.999 -> last voice", pickVoice(() => 0.999), "Sophie");
  // 6-item pool, floor(0.5 * 6) = 3 -> index 3 = "Trixie"
  expect("rng=0.5 -> index 3 voice", pickVoice(() => 0.5), "Trixie");
  // rng=1.0 must not produce out-of-bounds (Math.floor(1*6)=6 -> clamped to 5)
  expect("rng=1.0 (edge) clamps to last", pickVoice(() => 1.0), "Sophie");
});
withEnv("Allan,Sophie", () => {
  expect("env override + rng=0", pickVoice(() => 0), "Allan");
  expect("env override + rng=0.99", pickVoice(() => 0.99), "Sophie");
});

console.log("\npickVoice — distribution sanity (no name returned twice in a row guaranteed? no, but pool >1):");
withEnv(undefined, () => {
  const seen = new Set<string>();
  for (let i = 0; i < 200; i++) seen.add(pickVoice());
  expect("samples cover at least 4 of 6 voices", seen.size >= 4, true);
  for (const v of seen) {
    if (!DEFAULT_VOICE_POOL.includes(v)) {
      failed++;
      console.error(`  FAIL pickVoice returned non-pool voice: ${v}`);
    }
  }
});

console.log(`\n${failed === 0 ? "PASS" : "FAIL"} — ${failed} failure(s)`);
process.exit(failed === 0 ? 0 : 1);
