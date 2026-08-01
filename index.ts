import { type Server } from "bun";
import { Hono } from "hono";
import { structuredLogger } from "@hono/structured-logger";
import pino from "pino";
import { secureHeaders } from "hono/secure-headers";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import { requestId } from "hono/request-id";
import { connectionOK, closeConnection } from "./src/v1/db/connect";
import { v1Routes } from "./src/v1/api";

const rootLogger = pino({
  transport: {
    target: "pino-pretty",
  },
});

// check env variables
if (!process.env.PORT) {
  console.warn(`PORT is not defined`);
}

let server: Server<undefined>;
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

async function startApp() {
  try {
    const connectionIsOK = await connectionOK();
    if (!connectionIsOK) {
      process.exit(1);
    }
    const port = process.env.PORT || "8080";
    server = Bun.serve({
      fetch: (req, server) => {
        if (server.upgrade(req)) {
          return;
        }
        return app.fetch(req, server);
      },
      port,
      websocket: {
        message(ws, message) {
          console.log(`WebSocket message: ${message}`);
          ws.send(message);
          // a message is received
        },
        open(ws) {
          console.log(`WebSocket opened`);
          // a socket is opened
        },
        close(ws, code, message) {
          console.log(`WebSocket closed`);
          // a socket is closed
        },
        drain(ws) {
          // the socket is ready to receive more data
        },
      },
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
