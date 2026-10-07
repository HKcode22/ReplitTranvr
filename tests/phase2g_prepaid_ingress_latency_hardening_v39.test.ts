import {
  readFileSync,
} from "node:fs";

import {
  join,
} from "node:path";

import {
  describe,
  expect,
  it,
} from "vitest";

const root = process.cwd();

const read = (path: string) =>
  readFileSync(
    join(root, path),
    "utf8",
  );

const indexSource =
  read("server/index.ts");

const routes =
  read("server/routes_v3.ts");

const runtime =
  read(
    "server/lib/disruption/prepaidProbeRuntime_v39.ts",
  );

const verifier =
  read(
    "scripts/v39_phase2g_verify_live_callback_v39.ts",
  );

const workspaceVerifier =
  read(
    "scripts/v39_verify_workspace_callback_v39.ts",
  );

describe(
  "Phase2G prepaid ingress + callback latency",
  () => {
    it(
      "gives prepaid callbacks exclusive body-parser ownership",
      () => {
        expect(indexSource).toContain(
          "PHASE2G_PREPAID_WEBHOOK_PATH_V39",
        );

        expect(indexSource).toContain(
          "isPhase2gPrepaidWebhookPathV39",
        );

        expect(indexSource).toContain(
          "const globalJsonParser = express.json",
        );

        expect(indexSource).toContain(
          "const globalUrlencodedParser =",
        );

        expect(routes).toContain(
          "const prepaidJsonParser = json",
        );

        expect(routes).toContain(
          "prepaidJsonParser,",
        );
      },
    );

    it(
      "counts parser/media-type failures before normal persistence",
      () => {
        expect(runtime).toContain(
          "export async function recordPrepaidProbeIngressFailureV39",
        );

        expect(runtime).toContain(
          "callback_requests_seen=callback_requests_seen+1",
        );

        expect(runtime).toContain(
          "callback_failures=callback_failures+1",
        );

        expect(routes).toContain(
          "prepaid-ingress-content-type",
        );

        expect(routes).toContain(
          "prepaid-ingress-json-parser",
        );

        expect(routes).toContain(
          'req.is("application/json")',
        );
      },
    );

    it(
      "authenticates parser failures before touching callback counters",
      () => {
        const parserBoundary =
          routes.indexOf(
            "Dedicated parser-error boundary",
          );

        const safeCompare =
          routes.indexOf(
            "!timingSafeEqual(",
            parserBoundary,
          );

        const countFailure =
          routes.indexOf(
            "recordPrepaidProbeIngressFailureV39",
            safeCompare,
          );

        expect(parserBoundary).toBeGreaterThan(-1);
        expect(safeCompare).toBeGreaterThan(
          parserBoundary,
        );
        expect(countFailure).toBeGreaterThan(
          safeCompare,
        );
      },
    );

    it(
      "uses an admission budget below the provider ten-second contract",
      () => {
        expect(verifier).toContain(
          "ADB_WEBHOOK_RESPONSE_LIMIT_MS = 10_000",
        );

        expect(verifier).toContain(
          "PHASE2G_CALLBACK_ADMISSION_BUDGET_MS = 8_000",
        );

        expect(verifier).not.toContain(
          "AbortSignal.timeout(20_000)",
        );

        expect(verifier).toContain(
          "LIVE_PREPAID_CALLBACK_LATENCY_BUDGET_EXCEEDED",
        );
      },
    );

    it(
      "records observed callback latency in prospective evidence",
      () => {
        expect(verifier).toContain(
          "callback_end_to_end_latency_ms",
        );

        expect(verifier).toContain(
          "callback_admission_budget_ms",
        );

        expect(verifier).toContain(
          "callback_safety_margin_ms",
        );
      },
    );

    it(
      "keeps the workspace verifier on the identical prepaid latency contract",
      () => {
        expect(workspaceVerifier).toContain(
          "ADB_WEBHOOK_RESPONSE_LIMIT_MS = 10_000",
        );

        expect(workspaceVerifier).toContain(
          "PHASE2G_CALLBACK_ADMISSION_BUDGET_MS = 8_000",
        );

        expect(workspaceVerifier).not.toContain(
          "AbortSignal.timeout(20_000)",
        );

        expect(workspaceVerifier).toContain(
          "WORKSPACE_PREPAID_CALLBACK_LATENCY_BUDGET_EXCEEDED",
        );

        expect(workspaceVerifier).toContain(
          "callbackEndToEndLatencyMs",
        );

        expect(workspaceVerifier).toContain(
          "callbackSafetyMarginMs",
        );
      },
    );
  },
);
