import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { createServer } from "node:http";
import {subscribePrepaidStageTimingV39} from "./lib/disruption/phase2gPrepaidStageTelemetry_v39";
import {observePrepaidHttpTransportV39} from "./lib/disruption/phase2gPrepaidHttpTransportTelemetry_v39";
import { registerV3Routes } from "./routes_v3";
import {
  registerWorkspaceRuntimeHealthV39,
} from "./lib/disruption/workspaceRuntimeHealth_v39";

if (process.env.V39_CALLBACK_ONLY_RUNTIME !== "1") {
  throw new Error("CALLBACK_ONLY_RUNTIME_FLAG_REQUIRED");
}

if (process.env.ADB_AUTO_COLLECT !== "false") {
  throw new Error("AUTO_COLLECTION_MUST_BE_DISABLED");
}

if (!process.env.V39_DATABASE_RUNTIME_URL) {
  throw new Error("SCIENTIFIC_DATABASE_URL_REQUIRED");
}

if (
  String(process.env.AERODATABOX_WEBHOOK_SECRET ?? "")
    .length < 32
) {
  throw new Error("WEBHOOK_SECRET_REQUIRED");
}

if (
  process.env.V39_PROVIDER_BLOB_MODE !== "required" ||
  !String(
    process.env.V39_PROVIDER_BLOB_BUCKET_ID ?? ""
  ).startsWith("replit-objstore-")
) {
  throw new Error("DEDICATED_BLOB_STORAGE_REQUIRED");
}

const ownerMode =
  process.env.V39_WORKSPACE_RUNTIME_OWNER_MODE;

if (
  ownerMode !== "replit-managed-project" &&
  ownerMode !== "replit-published-deployment"
) {
  throw new Error("CALLBACK_OWNER_MODE_INVALID");
}

// Opt-in only: a single published-compatible host can emit sanitized
// per-stage timing in its logs during an approved zero-provider rehearsal.
// No raw payload, session, subscription, blob identity, URI or SQL text.
if(process.env.V39_PREPAID_STAGE_TELEMETRY==="1"){
  subscribePrepaidStageTimingV39((event)=>{
    const e=event as Record<string,unknown>;
    const allowed=new Set([
      "db_pool_acquire","db_session_lock","original_blob_upload_readback",
      "duplicate_original_blob_readback","physical_item_sql","final_sql_commit"
    ]);
    if(!allowed.has(String(e?.stage??""))||
       !Number.isFinite(e?.elapsed_ms)||
       !["completed","failed"].includes(String(e?.outcome??"")))
      return;
    console.log("V39_PREPAID_STAGE_V1",JSON.stringify({
      stage:e.stage,elapsed_ms:e.elapsed_ms,outcome:e.outcome
    }));
  });
}
const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);

const prepaidPath =
  /^\/api\/v1\/webhooks\/aerodatabox\/[^/]+\/prepaid\/[^/]+\/?$/;

const controlRoutes = new Set([
  "/__v39/phase2g/webhook-secret-match",
  "/__v39/phase2g/runtime-db-binding",
  "/__v39/phase2g/db-live-preflight",
  "/__v39/phase2g/cleanup-control-match",
  "/__v39/phase2g/runtime-cleanup",
]);

/*
 * Platform startup/readiness check. Replit's deployment health probe requests
 * GET /. Keep this endpoint public, small and independent of Neon/provider
 * availability. All provider-content and control routes remain allowlisted.
 */
app.get("/", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "phase2g-callback-only",
    provider_call: false,
    provider_mutation: false,
  });
});

app.use((req, res, next) => {
  const allowed =
    (
      req.method === "GET" &&
      req.path === "/__v39/workspace-runtime"
    ) ||
    (
      req.method === "POST" &&
      controlRoutes.has(req.path)
    ) ||
    (
      req.method === "POST" &&
      prepaidPath.test(req.path)
    );

  if (!allowed) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  next();
});

// Passive diagnostics: surface slow/aborted actual prepaid POST responses,
// without exposing the URL-path secret, flight payload or subscription ID.
// This neither changes subscription/ACK behavior nor makes provider calls.
app.use((req,res,next)=>{
  if(req.method==="POST"&&prepaidPath.test(req.path)){
    observePrepaidHttpTransportV39(res);
  }
  next();
});

const ordinaryJson = express.json({
  limit: "2mb",
});

app.use((req, res, next) => {
  if (prepaidPath.test(req.path)) {
    next();
    return;
  }

  ordinaryJson(req, res, next);
});

// Reuse the existing, tested V3.9 callback handlers.
// All non-allowlisted routes remain inaccessible.
registerV3Routes(app);

registerWorkspaceRuntimeHealthV39(app, {
  routeOwner:
    "server/phase2gCallbackOnly.ts+server/routes_v3.ts",
});

app.use((
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  console.error(
    "CALLBACK_ONLY_REQUEST_FAILURE",
    error.name,
  );
  res.status(500).json({
    error: "Callback request failed",
  });
});

const port = Number(process.env.PORT ?? "5000");

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("INVALID_SERVER_PORT");
}

createServer(app).listen(
  { port, host: "0.0.0.0" },
  () => {
    console.log(
      "V39_CALLBACK_ONLY_SERVER_LISTENING",
    );
    console.log("AUTO_COLLECTION=false");
    console.log("BOOT_MIGRATIONS=DISABLED");
    console.log("STRIPE_STARTUP=DISABLED");
  },
);
