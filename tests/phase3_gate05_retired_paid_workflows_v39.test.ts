import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {join} from "node:path";

describe("Historical Gate05 one-use paid dispatches are retired",()=>{
  const names=[
    "phase3-gate05-github-automated-onepilot.yml",
    "phase3-gate05-github-automated-retry2.yml",
    "phase3-gate05-github-automated-retry3.yml",
    "phase3-gate05-github-automated-retry4.yml",
    "phase3-gate05-github-automated-retry5.yml"
  ];
  it.each(names)("%s cannot start a new paid job",name=>{
    const contents=readFileSync(join(process.cwd(),".github/workflows",name),"utf8");
    // Historical workflow_dispatch and paid steps remain inspectable, but
    // GitHub never schedules its owner job after the one-use budget was spent.
    expect(contents).toMatch(/^\s{4}if: \$\{\{ false \}\}$/m);
    expect(contents).toContain("workflow_dispatch:");
    expect(contents).toContain("    environment: phase2g-paid");
  });
});
