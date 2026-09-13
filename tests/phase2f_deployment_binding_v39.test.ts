import { mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { describe, expect, it } from "vitest";
import {
  buildPhase2FDeploymentBindingV39,
  loadPhase2FDeploymentBindingV39,
} from "../server/lib/disruption/phase2DeploymentBinding_v39";

describe("Phase 2F deployment binding evidence", () => {
  it("loads a fresh self-consistent PASS receipt", () => {
    const now = new Date("2026-09-13T15:20:00.000Z");
    const artifact = buildPhase2FDeploymentBindingV39({
      checkedAtUtc: now.toISOString(),
      deploymentOrigin: "https://travnr.com",
      openIncidents: 0,
    });
    const dir = mkdtempSync(join(tmpdir(), "v39-deploy-"));
    const file = join(dir, "binding.json");
    writeFileSync(file, JSON.stringify(artifact, null, 2) + "\n", "utf8");
    const loaded = loadPhase2FDeploymentBindingV39(file, new Date(now.getTime() + 60_000));
    expect(loaded.artifact.status).toBe("PASS");
    expect(loaded.artifact.wrong_secret_rejected_403).toBe(true);
    expect(loaded.artifact.exact_secret_accepted_200).toBe(true);
    expect(loaded.artifact.deployed_v39_runtime_db_read).toBe(true);
    expect(loaded.artifact.open_incidents).toBe(0);
    expect(loaded.evidenceId).toMatch(/^RUN-20260913-[A-F0-9]{64}$/);
  });

  it("rejects stale receipts", () => {
    const checked = new Date("2026-09-13T15:20:00.000Z");
    const artifact = buildPhase2FDeploymentBindingV39({
      checkedAtUtc: checked.toISOString(),
      deploymentOrigin: "https://travnr.com",
      openIncidents: 0,
    });
    const dir = mkdtempSync(join(tmpdir(), "v39-deploy-"));
    const file = join(dir, "binding.json");
    writeFileSync(file, JSON.stringify(artifact, null, 2) + "\n", "utf8");
    expect(() => loadPhase2FDeploymentBindingV39(file, new Date(checked.getTime() + 31 * 60_000)))
      .toThrow(/PHASE2F_DEPLOYMENT_BINDING_STALE/);
  });

  it("rejects an open-incident receipt at build time", () => {
    expect(() => buildPhase2FDeploymentBindingV39({
      checkedAtUtc: "2026-09-13T15:20:00.000Z",
      deploymentOrigin: "https://travnr.com",
      openIncidents: 1,
    })).toThrow(/PHASE2F_DEPLOYMENT_OPEN_INCIDENTS/);
  });
});
