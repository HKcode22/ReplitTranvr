import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(process.cwd(), "server", "lib", "disruption", "prepaidProbeRuntime_v39.ts"),
  "utf8",
);

describe("Phase-2G prepaid item SQL placeholders", () => {
  it("parameterizes every sequential prepaid item column", () => {
    const insertStart = source.indexOf(
      "`INSERT INTO clean.prepaid_probe_item_runtime",
    );
    expect(insertStart).toBeGreaterThanOrEqual(0);

    const insertEnd = source.indexOf("`,", insertStart);
    expect(insertEnd).toBeGreaterThan(insertStart);

    const insertSql = source.slice(insertStart, insertEnd);

    const placeholders = [...insertSql.matchAll(/\$(\d+)/g)].map(
      (match) => Number(match[1]),
    );

    expect(placeholders).toEqual(
      Array.from({ length: 23 }, (_, index) => index + 1),
    );

    expect(insertSql).not.toMatch(/\$\{[^}]+\}/);
    expect(source).not.toContain("tuples.push(");
  });
});
