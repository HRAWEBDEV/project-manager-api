import { type Server } from "bun";
import { Hono } from "hono";
import { structuredLogger } from "@hono/structured-logger";
import pino from "pino";
import { secureHeaders } from "hono/secure-headers";
import { cors } from "hono/cors";
import {
  type BunWebSocketData,
  serveStatic,
  upgradeWebSocket,
  websocket,
} from "hono/bun";
import { requestId } from "hono/request-id";
import { connectionOK, closeConnection } from "./src/v1/db/connect";
import { v1Routes } from "./src/v1/api";
import { WebSocketManager } from "./src/v1/services/webSocketManager";
import { WsConnectionsManager } from "./src/v1/services/wsConnectionsManager";
import { registerAppEvents } from "./src/v1/api/utils/registerAppEvents";

const rootLogger = pino({
  transport: {
    target: "pino-pretty",
  },
});

// check env variables
if (!process.env.PORT) {
  console.warn(`PORT is not defined`);
}

let server: Server<BunWebSocketData>;
const app = new Hono();
const api = new Hono().basePath("/api");

// request id
app.use(requestId());
// logger setup
app.use(
  structuredLogger({
    createLogger: (c) => rootLogger.child({ requestId: c.var.requestId }),
  }),
);
// cors
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);
// secure headers
app.use(secureHeaders());
// attach api routes
api.route("/", v1Routes);
app.route("/", api);
// serve static files
app.use("static/*", serveStatic({ root: "./" }));

// test app
app.get("/healthy", (c) => {
  return c.json({ message: "hi :)" });
});

async function stopApp(exitCode: number = 1) {
  console.log(`Stopping app...`);
  try {
    server.stop();
    await closeConnection();
    process.exit(exitCode);
  } catch (err) {
    console.log(`Failed to stop app:${err}`);
    process.exit(exitCode);
  }
}

// TODO
// app websocket setup
const connectionsManager = new WsConnectionsManager();
const webSocketManager = new WebSocketManager(connectionsManager);

app.get(
  "/ws/*",
  upgradeWebSocket((c) => webSocketManager.createConnection(c)),
);

async function startApp() {
  try {
    const connectionIsOK = await connectionOK();
    if (!connectionIsOK) {
      process.exit(1);
    }
    const port = process.env.PORT || "8080";
    registerAppEvents(connectionsManager);
    server = Bun.serve({
      fetch: app.fetch,
      port,
      websocket: websocket,
    });
    console.log(`App started on port: ${port}`);
  } catch (err) {
    console.log(`Failed to start app:${err}`);
    stopApp(1);
  }
}

process.on("SIGINT", stopApp);
process.on("SIGTERM", stopApp);

startApp();
