import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(process.cwd(), "server", "lib", "disruption", "prepaidProbeRuntime_v39.ts"),
  "utf8",
);

describe("Phase-2G prepaid item SQL placeholders", () => {
  it("parameterizes every prepaid item column instead of emitting integer literals", () => {
    const parameterized = 'tuples.push(`($${offset + 1},$${offset + 2},$${offset + 3},$${offset + 4},$${offset + 5},$${offset + 6},$${offset + 7},$${offset + 8},$${offset + 9})`);';
    const integerLiterals = 'tuples.push(`(${offset + 1},${offset + 2},${offset + 3},${offset + 4},${offset + 5},${offset + 6},${offset + 7},${offset + 8},${offset + 9})`);';

    expect(source).toContain(parameterized);
    expect(source).not.toContain(integerLiterals);
  });
});
