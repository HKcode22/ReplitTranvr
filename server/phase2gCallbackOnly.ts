import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { createServer } from "node:http";
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

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);

const prepaidPath =
  /^\/api\/v1\/webhooks\/aerodatabox\/[^/]+\/prepaid\/[^/]+\/?$/;

const controlRoutes = new Set([
  "/__v39/phase2g/webhook-secret-match",
  "/__v39/phase2g/runtime-db-binding",
  "/__v39/phase2g/cleanup-control-match",
  "/__v39/phase2g/runtime-cleanup",
]);

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
